#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер экспорта ИРБИС → готовый SQL-дамп (v4.3).

Изменения v4.3
──────────────
• Adapted to new database structure: author table now has last_name, first_name, middle_name, and birth_year.
• For old data, normalized author names are stored in first_name, with last_name as empty string, middle_name and birth_year as NULL.
• Коды BBK и UDC теперь всегда сохраняются в book_bbk_raw / book_udc_raw.
• После заполнения *_raw выполняется прежняя фильтрация и наполнение
  book_bbk / book_udc (можно закомментировать при необходимости).

Запуск:
    python parse_irbis_file.py "<DSN>" [irbis_data.txt] [inserts.sql]
"""

from __future__ import annotations
import sys, os, re, psycopg2
from typing import List, Set, Dict, Tuple
from datetime import datetime

from fix_bbk import load_bbk_map, filter_links as filter_bbk_links
from fix_udc import load_udc_map, filter_links as filter_udc_links
from fix_pub_info import parse_pub_info
from fix_authors import normalize_author


# ──────────────────────────── utils ────────────────────────────────────
def sql_escape(s: str) -> str:
    """Экранирует одиночные кавычки для SQL."""
    return s.replace("'", "''")


_split_codes_re = re.compile(r'[;,]\s*|\s{2,}')


def split_codes(raw: str) -> List[str]:
    """Разбивает строку с кодами BBK/UDC на список отдельных кодов."""
    return [x.strip() for x in _split_codes_re.split(raw) if x.strip()]


def parse_subfields(field_text: str) -> Dict[str, str]:
    """Преобразует текст поля ИРБИС (#x##) в словарь подполей."""
    text = field_text.replace('\x1f', '')
    parts = text.split('')
    subf: Dict[str, str] = {}
    for chunk in parts:
        chunk = chunk.strip()
        if not chunk:
            continue
        subf[chunk[0]] = chunk[1:].strip()
    return subf


def parse_author_700_701(field_text: str) -> str:
    """Формирует строку автора из полей 700/701."""
    subf = parse_subfields(field_text)
    last_name = subf.get('A', '').strip()
    initials = subf.get('B', '').strip()
    return f"{last_name} {initials}" if last_name and initials else last_name or initials


# ──────────────────────────── main ─────────────────────────────────────
def parse_irbis_file(dsn: str, infile: str, outfile: str) -> None:
    print(f"Начало обработки файла: {infile}")

    # ---------- подключаемся к БД и загружаем справочники --------------
    with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
        bbk_map = load_bbk_map(cur)
        udc_map = load_udc_map(cur)

        # ---------- читаем исходный файл --------------------------------
        try:
            with open(infile, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except FileNotFoundError:
            sys.exit(f"Ошибка: файл «{infile}» не найден.")

        with open(outfile, 'w', encoding='utf-8') as sql_out:
            # Заголовок SQL-файла
            sql_out.write(f"""\
-- ======================================================
-- SQL-дамп, создан parse_irbis_file v4.3
-- Дата создания : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
-- Входной файл  : {infile}
-- ======================================================

""")

            record_lines: List[str] = []
            record_count = 0

            publisher_ids: Dict[str, int] = {}
            next_publisher_id = 1

            author_ids: Dict[str, int] = {}
            next_author_id = 1

            # списки для последующего вызова fix_* -----------------------
            bbk_pairs_raw: List[Tuple[int, str]] = []
            udc_pairs_raw: List[Tuple[int, str]] = []

            # ------------------------------------------------------------
            def process_record(rec_lines: List[str]) -> None:
                nonlocal record_count, next_publisher_id, next_author_id

                # интересуют только записи #920:IBIS
                if not any(
                    ln.startswith('#920:') and ln.split(':', 1)[1].strip() == 'IBIS'
                    for ln in rec_lines
                ):
                    return

                record_count += 1

                # ----------- инициализация полей ------------------------
                title = type_ = edit = edition_statement = ''
                pub_info_raw = ''
                phys_desc = series_ = ''
                udc_raw = bbk_raw = ''
                local_index = ''
                authors_set: Set[str] = set()
                copies: List[str] = []

                # ----------- разбор полей --------------------------------
                for line in rec_lines:
                    line = line.rstrip('\n')
                    if not line or not line.startswith('#'):
                        continue

                    tag, _, content = line.partition(':')
                    tag_number = tag[1:]

                    if tag_number == '200':
                        subf = parse_subfields(content)
                        title = subf.get('A', '').strip()
                        type_ = subf.get('E', '').strip()
                        edit = subf.get('F', '').strip()

                    elif tag_number == '205':
                        edition_statement = parse_subfields(content).get('A', '').strip()

                    elif tag_number == '210':
                        subf = parse_subfields(content)
                        pub_info_raw = ', '.join(
                            x for x in (subf.get('A', '').strip(),
                                        subf.get('C', '').strip(),
                                        subf.get('D', '').strip()) if x)

                    elif tag_number == '215':
                        subf = parse_subfields(content)
                        phys_desc = ' '.join(
                            x for x in (subf.get('A', '').strip(),
                                        subf.get('1', '').strip()) if x)

                    elif tag_number == '225':
                        subf = parse_subfields(content)
                        series_ = ' '.join(
                            x for x in (subf.get('V', '').strip(),
                                        subf.get('A', '').strip()) if x)

                    elif tag_number == '675':
                        udc_raw = content.strip()

                    elif tag_number == '964':
                        bbk_raw = content.strip()

                    elif tag_number == '903':
                        local_index = content.strip()

                    elif tag_number in ('700', '701'):
                        raw = parse_author_700_701(content)
                        if raw:
                            authors_set.add(normalize_author(raw))

                    elif tag_number == '910':
                        copies.append(content.strip())

                # ----------- «хвосты»: издательство ---------------------
                publisher_name, pub_city, pub_year = parse_pub_info(pub_info_raw)

                # ----------- publisher ----------------------------------
                sql_out.write("-- --- Издатели ---\n")
                publisher_id_sql = 'NULL'
                if publisher_name:
                    if publisher_name not in publisher_ids:
                        publisher_ids[publisher_name] = next_publisher_id
                        sql_out.write(
                            f"INSERT INTO public.publisher(id, name) "
                            f"VALUES ({next_publisher_id}, '{sql_escape(publisher_name)}');\n")
                        next_publisher_id += 1
                    publisher_id_sql = str(publisher_ids[publisher_name])

                # ----------- book ---------------------------------------
                sql_out.write(f"\n-- --- Книга #{record_count} ---\n")
                sql_out.write(f"""\
INSERT INTO public.book(
    id, title, "type", edit, edition_statement,
    phys_desc, series, local_index
) VALUES (
    {record_count},
    '{sql_escape(title)}',
    '{sql_escape(type_)}',
    '{sql_escape(edit)}',
    '{sql_escape(edition_statement)}',
    '{sql_escape(phys_desc)}',
    '{sql_escape(series_)}',
    '{sql_escape(local_index)}'
);
""")

                # ----------- book_pub_place ----------------------------
                sql_out.write("\n-- --- Место публикации ---\n")
                city_esc = sql_escape(pub_city) if pub_city else ''
                year_sql = str(pub_year) if pub_year else 'NULL'
                sql_out.write(
                    f"INSERT INTO public.book_pub_place(book_id, publisher_id, city, pub_year) "
                    f"VALUES ({record_count}, {publisher_id_sql}, '{city_esc}', {year_sql});\n")

                # ----------- BBK / UDC RAW -----------------------------
                sql_out.write("\n-- --- Коды BBK / UDC (RAW) ---\n")
                for code in split_codes(bbk_raw):
                    bbk_pairs_raw.append((record_count, code))
                    sql_out.write(
                        f"INSERT INTO public.book_bbk_raw(book_id, bbk_code) "
                        f"VALUES ({record_count}, '{sql_escape(code)}') "
                        f"ON CONFLICT DO NOTHING;\n")

                for code in split_codes(udc_raw):
                    udc_pairs_raw.append((record_count, code))
                    sql_out.write(
                        f"INSERT INTO public.book_udc_raw(book_id, udc_code) "
                        f"VALUES ({record_count}, '{sql_escape(code)}') "
                        f"ON CONFLICT DO NOTHING;\n")

                # ----------- author + book_author ----------------------
                sql_out.write("\n-- --- Авторы ---\n")
                for author in sorted(authors_set):
                    if author not in author_ids:
                        author_ids[author] = next_author_id
                        sql_out.write(
                            f"INSERT INTO public.author(id, last_name, first_name, middle_name, birth_year) "
                            f"VALUES ({next_author_id}, '', '{sql_escape(author)}', NULL, NULL);\n")
                        next_author_id += 1

                    sql_out.write(
                        f"INSERT INTO public.book_author(book_id, author_id) "
                        f"VALUES ({record_count}, {author_ids[author]});\n")

                # ----------- экземпляры (#910) -------------------------
                sql_out.write("\n-- --- Экземпляры ---\n")
                for copy_info in copies:
                    sql_out.write(
                        f"INSERT INTO public.book_copy(book_id, copy_info) "
                        f"VALUES ({record_count}, '{sql_escape(copy_info)}');\n")

                sql_out.write('\n')  # визуальный разделитель
            # ================= конец process_record =====================

            # ---------- сканируем файл --------------------------------
            for line in lines:
                if line.strip() == '*****':
                    if record_lines:
                        process_record(record_lines)
                        record_lines.clear()
                else:
                    record_lines.append(line)
            if record_lines:
                process_record(record_lines)

            # ---------- вызов fix_bbk / fix_udc ------------------------
            bbk_links, bbk_skipped = filter_bbk_links(bbk_pairs_raw, bbk_map)
            udc_links, udc_skipped = filter_udc_links(udc_pairs_raw, udc_map)

            sql_out.write("\n-- ======================================\n")
            sql_out.write("-- Связующие таблицы BBK (очищенные)\n")
            sql_out.write("-- ======================================\n")
            for book_id, bbk_id in bbk_links:
                sql_out.write(
                    f"INSERT INTO public.book_bbk (book_id, bbk_id) "
                    f"VALUES ({book_id}, {bbk_id}) ON CONFLICT DO NOTHING;\n")

            sql_out.write(f"-- BBK: вставлено {len(bbk_links)}, пропущено {bbk_skipped}\n\n")

            sql_out.write("\n-- ======================================\n")
            sql_out.write("-- Связующие таблицы UDC (очищенные)\n")
            sql_out.write("-- ======================================\n")
            for book_id, udc_id in udc_links:
                sql_out.write(
                    f"INSERT INTO public.book_udc (book_id, udc_id) "
                    f"VALUES ({book_id}, {udc_id}) ON CONFLICT DO NOTHING;\n")

            sql_out.write(f"-- UDC: вставлено {len(udc_links)}, пропущено {udc_skipped}\n")

        print(f"""\
Обработка завершена.
- Обработано записей IBIS : {record_count}
- Входной файл            : {infile}
- SQL-файл создан         : {outfile}
- BBK RAW  : {len(bbk_pairs_raw)} код(ов)
- UDC RAW  : {len(udc_pairs_raw)} код(ов)
- BBK очищ.: вставлено {len(bbk_links)}, пропущено {bbk_skipped}
- UDC очищ.: вставлено {len(udc_links)}, пропущено {udc_skipped}
""")


# ─────────────────────────── CLI ───────────────────────────────────────
if __name__ == '__main__':
    DEFAULT_INFILE = "irbis_data.txt"
    DEFAULT_OUTFILE = "inserts.sql"

    if len(sys.argv) < 2:
        sys.exit("""\
Использование:
  python parse_irbis_file.py "dbname=library user=admin password=*** host=localhost port=5432"
       [input_file] [output_file]

По умолчанию:
  input_file  = irbis_data.txt
  output_file = inserts.sql
""")

    dsn = sys.argv[1]
    infile = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_INFILE
    outfile = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_OUTFILE

    if not os.path.exists(infile):
        sys.exit(f"Ошибка: файл {infile} не найден.")

    parse_irbis_file(dsn, infile, outfile)