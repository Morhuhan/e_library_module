#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер экспорта ИРБИС &rarr; SQL-дамп (v4.7, inline copies, dedup, авторы).

Изменения v4.7
──────────────
• Таблица **public.author** имеет колонки `last_name`, `first_name`,
  `patronymic`, `birth_year`.  Соответственно:
    – автор теперь сохраняется по этим полям, а не в &laquo;name&raquo;;
    – поддержан уникальный ключ (last_name, first_name, patronymic, birth_year).
• Функция split_author_fields() извлекает Ф + инициалы из нормализованной
  строки &laquo;Иванов И.О.&raquo; в отдельные колонки.
• Добавлена утилита sql_val() для корректного NULL/quote.
• Версия повышена до 4.7.
"""

from __future__ import annotations
import sys, os, re, psycopg2
from datetime import datetime
from typing import Dict, List, Set, Tuple, Iterable, Optional

from fix_bbk      import load_bbk_map, filter_links as filter_bbk_links
from fix_udc      import load_udc_map, filter_links as filter_udc_links
from fix_pub_info import parse_pub_info
from fix_authors  import normalize_author, parse_author_700_701

# ───────────────────────── utils ─────────────────────────
def sql_escape(s: str) -> str:
    return s.replace("'", "''")

def sql_val(s: str | None) -> str:
    """Строка &rarr; SQL-литерал или NULL."""
    return f"'{sql_escape(s)}'" if s else "NULL"

_split_codes_re = re.compile(r'[;,]\s*|\s{2,}')
def split_codes(raw: str) -> List[str]:
    return [x.strip() for x in _split_codes_re.split(raw) if x.strip()]

# ───── авторы: разбор &laquo;Фамилия И.О.&raquo; &rarr; колонки ─────
def split_author_fields(author: str) -> Tuple[str, str, str]:
    """
    &laquo;Иванов И.О.&raquo; &rarr; ('Иванов', 'И', 'О')
    &laquo;Петров П.&raquo;   &rarr; ('Петров', 'П', '')
    &laquo;Сидоров&raquo;     &rarr; ('Сидоров', '', '')
    """
    author = author.strip()
    if ' ' not in author:
        return author, '', ''
    last, initials = author.split(' ', 1)
    initials = initials.strip('.')
    parts = [p for p in initials.split('.') if p]
    first = parts[0] if parts else ''
    patr  = parts[1] if len(parts) > 1 else ''
    return last, first, patr

# ───── helpers: 910 (экземпляры) ─────
_SUBFIELD_SEP = '\x1f'
_PRICE_RE     = re.compile(r'[\d\.,]+')
_DATE_FORMATS = [
    ("%d.%m.%Y", re.compile(r"^\d{2}\.\d{2}\.\d{4}$")),
    ("%d.%m.%y", re.compile(r"^\d{2}\.\d{2}\.\d{2}$")),
    ("%Y-%m-%d", re.compile(r"^\d{4}-\d{2}-\d{2}$")),
]
def _iter_subfields(text: str) -> Iterable[tuple[str,str]]:
    if _SUBFIELD_SEP not in text and '^' in text:
        text = text.replace('^', _SUBFIELD_SEP)
    for chunk in text.split(_SUBFIELD_SEP):
        chunk = chunk.strip()
        if chunk:
            yield chunk[0].upper(), chunk[1:].strip()

def _normalize_date(raw: str) -> Optional[str]:
    raw = raw.strip()
    if not raw:
        return None
    for fmt, rx in _DATE_FORMATS:
        if rx.match(raw):
            try:
                return datetime.strptime(raw, fmt).strftime('%Y-%m-%d')
            except ValueError:
                break
    try:
        return datetime.fromisoformat(raw[:10]).strftime('%Y-%m-%d')
    except Exception:
        return None

def _normalize_price(raw: str) -> Optional[str]:
    if not raw:
        return None
    m = _PRICE_RE.search(raw.replace(' ', ''))
    if not m:
        return None
    val = m.group(0).replace(',', '.')
    return val[:-1] if val.endswith('.') else val

def parse_copies(
    pairs: List[Tuple[int,str]]
) -> Tuple[List[Tuple[int,str|None,str|None,str|None,str|None]], int]:
    cleaned: List[Tuple[int,str|None,str|None,str|None,str|None]] = []
    skipped = 0
    for book_id, raw in pairs:
        subs = list(_iter_subfields(raw))
        if not subs:
            skipped += 1
            continue
        cur = {"B": None, "C": None, "D": None, "E": None}
        def _flush():
            nonlocal skipped
            if cur["B"]:
                cleaned.append((
                    book_id,
                    cur["B"],
                    _normalize_date(cur["C"] or ''),
                    cur["D"] or '',
                    _normalize_price(cur["E"] or '')
                ))
            else:
                skipped += 1
            for k in cur:
                cur[k] = None

        for code, val in subs:
            if code == 'B':
                if any(cur.values()):
                    _flush()
                cur['B'] = val
            elif code in cur:
                cur[code] = val
        if any(cur.values()):
            _flush()
    return cleaned, skipped

# ────────────────────── main ───────────────────────────
def parse_irbis_file(dsn: str, infile: str, outfile: str) -> None:
    print(f"Начало обработки файла: {infile}")

    # маппинг авторов: (last, first, patr, birth) &rarr; id
    author_ids: Dict[Tuple[str,str,str,None], int] = {}
    next_author_id = 1
    total_book_author_links = 0

    with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
        bbk_map = load_bbk_map(cur)
        udc_map = load_udc_map(cur)

        try:
            with open(infile, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except FileNotFoundError:
            sys.exit(f"Ошибка: файл &laquo;{infile}&raquo; не найден.")

        with open(outfile, 'w', encoding='utf-8') as sql_out:
            sql_out.write(f"""\
-- ======================================================
-- SQL-дамп, создан parse_irbis_file v4.7
-- Дата создания : {datetime.now():%Y-%m-%d %H:%M:%S}
-- Входной файл  : {infile}
-- ======================================================

""")

            record_lines: List[str] = []
            record_count = 0
            publisher_ids: Dict[str,int] = {}
            next_publisher_id = 1
            bbk_pairs_raw: List[Tuple[int,str]] = []
            udc_pairs_raw: List[Tuple[int,str]] = []
            copies_pairs_raw: List[Tuple[int,str]] = []

            # ───── process_record ─────
            def process_record(rec: List[str]) -> None:
                nonlocal record_count, next_publisher_id, next_author_id, total_book_author_links
                if not any(l.startswith('#920:') and l.split(':',1)[1].strip() == 'IBIS' for l in rec):
                    return

                record_count += 1
                # --- поля
                title = type_ = edit = edition_statement = ''
                pub_info_raw = phys_desc = series_ = ''
                bbk_raw = udc_raw = ''
                authors: Set[str] = set()
                copies: List[str] = []

                for line in rec:
                    line = line.rstrip('\n')
                    if not line.startswith('#'):
                        continue
                    tag, _, content = line.partition(':')
                    tag = tag[1:]

                    if tag == '200':
                        subs = _iter_subfields(content)
                        sd = {k:v for k,v in subs}
                        title = sd.get('A','').strip()
                        type_ = sd.get('E','').strip()
                        edit  = sd.get('F','').strip()
                    elif tag == '205':
                        edition_statement = next((v for k,v in _iter_subfields(content) if k=='A'), '').strip()
                    elif tag == '210':
                        sd = {k:v for k,v in _iter_subfields(content)}
                        pub_info_raw = ', '.join(x for x in (
                            sd.get('A','').strip(), sd.get('C','').strip(), sd.get('D','').strip()) if x)
                    elif tag == '215':
                        sd = {k:v for k,v in _iter_subfields(content)}
                        phys_desc = ' '.join(x for x in (sd.get('A','').strip(), sd.get('1','').strip()) if x)
                    elif tag == '225':
                        sd = {k:v for k,v in _iter_subfields(content)}
                        series_ = ' '.join(x for x in (sd.get('V','').strip(), sd.get('A','').strip()) if x)
                    elif tag == '675':
                        udc_raw = content.strip()
                    elif tag == '964':
                        bbk_raw = content.strip()
                    elif tag in ('700','701'):
                        a = parse_author_700_701(content)
                        if a:
                            authors.add(normalize_author(a))
                    elif tag == '910':
                        copies.append(content.strip())

                publisher_name, pub_city, pub_year = parse_pub_info(pub_info_raw)

                # --- Издатели ---
                sql_out.write("-- --- Издатели ---\n")
                pub_id_sql = 'NULL'
                if publisher_name:
                    if publisher_name not in publisher_ids:
                        publisher_ids[publisher_name] = next_publisher_id
                        sql_out.write(
                            f"INSERT INTO public.publisher(id,name) "
                            f"VALUES ({next_publisher_id},'{sql_escape(publisher_name)}');\n")
                        next_publisher_id += 1
                    pub_id_sql = str(publisher_ids[publisher_name])

                # --- Книга ---
                sql_out.write(f"\n-- --- Книга #{record_count} ---\n")
                sql_out.write(
                    "INSERT INTO public.book("
                    "id,title,\"type\",edit,edition_statement,phys_desc,series) VALUES("
                    f"{record_count}, {sql_val(title)}, {sql_val(type_)}, {sql_val(edit)}, "
                    f"{sql_val(edition_statement)}, {sql_val(phys_desc)}, {sql_val(series_)});\n"
                )

                # --- Место публикации ---
                sql_out.write("\n-- --- Место публикации ---\n")
                city_sql = sql_val(pub_city)
                year_sql = str(pub_year) if pub_year else 'NULL'
                sql_out.write(
                    f"INSERT INTO public.book_pub_place(book_id,publisher_id,city,pub_year) "
                    f"VALUES ({record_count},{pub_id_sql},{city_sql},{year_sql});\n")

                # --- Авторы ---
                if authors:
                    sql_out.write("\n-- --- Авторы ---\n")
                for author in sorted(authors):
                    last, first, patr = split_author_fields(author)
                    key = (last, first, patr, None)
                    if key not in author_ids:
                        author_ids[key] = next_author_id
                        sql_out.write(
                            "INSERT INTO public.author(id,last_name,first_name,patronymic,birth_year) "
                            f"VALUES ({next_author_id}, {sql_val(last)}, {sql_val(first)}, "
                            f"{sql_val(patr)}, NULL);\n"
                        )
                        next_author_id += 1
                    aid = author_ids[key]
                    sql_out.write(
                        f"INSERT INTO public.book_author(book_id,author_id) "
                        f"VALUES ({record_count},{aid}) ON CONFLICT DO NOTHING;\n"
                    )
                    total_book_author_links += 1

                # --- BBK / UDC RAW ---
                sql_out.write("\n-- --- Коды BBK / UDC (RAW) ---\n")
                for code in split_codes(bbk_raw):
                    bbk_pairs_raw.append((record_count, code))
                    sql_out.write(
                        f"INSERT INTO public.book_bbk_raw(book_id,bbk_code) "
                        f"VALUES ({record_count},{sql_val(code)}) ON CONFLICT DO NOTHING;\n")
                for code in split_codes(udc_raw):
                    udc_pairs_raw.append((record_count, code))
                    sql_out.write(
                        f"INSERT INTO public.book_udc_raw(book_id,udc_code) "
                        f"VALUES ({record_count},{sql_val(code)}) ON CONFLICT DO NOTHING;\n")

                # экземлпяры
                for cp in copies:
                    copies_pairs_raw.append((record_count, cp))

            # ───── чтение входного файла ─────
            for ln in lines:
                if ln.strip() == '*****':
                    if record_lines:
                        process_record(record_lines)
                        record_lines.clear()
                else:
                    record_lines.append(ln)
            if record_lines:
                process_record(record_lines)

            # ───── BBK / UDC clean ─────
            bbk_links, bbk_skipped = filter_bbk_links(bbk_pairs_raw, bbk_map)
            udc_links, udc_skipped = filter_udc_links(udc_pairs_raw, udc_map)

            sql_out.write("\n-- ======================================\n-- BBK (очищенные)\n-- ======================================\n")
            for bid, bbkid in bbk_links:
                sql_out.write(f"INSERT INTO public.book_bbk(book_id,bbk_id) "
                              f"VALUES ({bid},{bbkid}) ON CONFLICT DO NOTHING;\n")
            sql_out.write(f"-- BBK: вставлено {len(bbk_links)}, пропущено {bbk_skipped}\n")

            sql_out.write("\n-- ======================================\n-- UDC (очищенные)\n-- ======================================\n")
            for bid, udcid in udc_links:
                sql_out.write(f"INSERT INTO public.book_udc(book_id,udc_id) "
                              f"VALUES ({bid},{udcid}) ON CONFLICT DO NOTHING;\n")
            sql_out.write(f"-- UDC: вставлено {len(udc_links)}, пропущено {udc_skipped}\n")

            # ───── Экземпляры ─────
            cleaned_copies, skipped_copies = parse_copies(copies_pairs_raw)
            seen_pairs: set[tuple[int,str]] = set()
            skipped_dupes = 0
            sql_out.write("\n-- ======================================\n-- Экземпляры\n-- ======================================\n")
            for bid, inv_no, date_in, storage, price in cleaned_copies:
                if (bid, inv_no) in seen_pairs:
                    skipped_dupes += 1
                    continue
                seen_pairs.add((bid, inv_no))
                sql_out.write(
                    "INSERT INTO public.book_copy(book_id,inventory_no,receipt_date,storage_place,price) "
                    f"VALUES ({bid},{sql_val(inv_no)},{sql_val(date_in)},{sql_val(storage)},{price or 'NULL'}) "
                    "ON CONFLICT (book_id,inventory_no) DO NOTHING;\n")

            sql_out.write(
                f"-- Экземпляры: вставлено {len(seen_pairs)}, "
                f"дубликатов пропущено {skipped_dupes}, битых строк {skipped_copies}\n")

        # ───── финальная статистика ─────
        print(f"""\
Обработка завершена.
- Записей IBIS          : {record_count}
- BBK RAW               : {len(bbk_pairs_raw)}  (очищено {len(bbk_links)}, пропущено {bbk_skipped})
- UDC RAW               : {len(udc_pairs_raw)}  (очищено {len(udc_links)}, пропущено {udc_skipped})
- Экземпляры вставлено  : {len(seen_pairs)}
  ▸ дубликаты пропущено  : {skipped_dupes}
  ▸ битые строки         : {skipped_copies}
- Авторов вставлено     : {len(author_ids)}
- Связей книга-автор    : {total_book_author_links}
- SQL-файл создан       : {outfile}
""")

# ──────────────── CLI ────────────────
if __name__ == '__main__':
    DEF_IN, DEF_OUT = "irbis_data.txt", "inserts.sql"
    if len(sys.argv) < 2:
        sys.exit("""\
Использование:
  python parse_irbis_file.py "dbname=library user=admin password=*** host=localhost port=5432"
       [input_file] [output_file]

По умолчанию:
  input_file  = irbis_data.txt
  output_file = inserts.sql
""")
    dsn     = sys.argv[1]
    infile  = sys.argv[2] if len(sys.argv) > 2 else DEF_IN
    outfile = sys.argv[3] if len(sys.argv) > 3 else DEF_OUT
    if not os.path.exists(infile):
        sys.exit(f"Ошибка: файл {infile} не найден.")
    parse_irbis_file(dsn, infile, outfile)