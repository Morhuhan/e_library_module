#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

def create_tables_sql() -> str:
    """
    Возвращает SQL-команды для создания необходимых таблиц в PostgreSQL
    (без service_info).
    """
    return """\
-- Таблица с основной библиографической информацией
CREATE TABLE IF NOT EXISTS bibliographic_records (
    id SERIAL PRIMARY KEY,

    -- #200:
    title TEXT,        -- подполе A
    type TEXT,   -- подполе E
    edit TEXT,   -- подполе F

    -- #205 (edition_statement): берем подполе A
    edition_statement TEXT,

    -- #210 (pub_info): собираем подполя C, A, D в одну строку
    pub_info TEXT,

    -- #215 (phys_desc): собираем подполе A + подполе 1
    phys_desc TEXT,

    -- #225 (series): собираем подполе V + подполе A
    series TEXT,

    udc TEXT,          -- #675
    bbk TEXT,          -- #964
    local_index TEXT,  -- #903

    -- Авторы — только из #700/#701:
    authors TEXT
    -- УБРАНО service_info
);

-- Таблица для экземпляров (#910)
CREATE TABLE IF NOT EXISTS exemplars (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES bibliographic_records(id) ON DELETE CASCADE,
    exemplar_info TEXT -- Содержимое #910
);
"""

def sql_escape(s: str) -> str:
    """Простая функция экранирования одинарных кавычек для SQL."""
    return s.replace("'", "''")


def parse_subfields(field_text: str) -> dict:
    """
    Универсальный парсер подполя в стиле "A...B...C..."
    Возвращает словарь: {'A': '...', 'B': '...', ... }.
    """
    text = field_text.replace('\x1f', '')
    parts = text.split('')
    subf = {}
    for chunk in parts:
        chunk = chunk.strip()
        if not chunk:
            continue
        code = chunk[0]
        value = chunk[1:].strip()
        subf[code] = value
    return subf


def parse_author_700_701(field_text: str) -> str:
    """
    Пример: "#700: AАбазаBС.А." -> "Абаза С.А."
    """
    subf = parse_subfields(field_text)
    last_name = subf.get('A', '').strip()
    initials = subf.get('B', '').strip()
    if last_name and initials:
        return f"{last_name} {initials}"
    return last_name or initials


def parse_irbis_file(infile: str = 'irbis_data.txt', outfile: str = 'inserts.sql') -> None:
    """
    Парсит 'irbis_data.txt' и формирует SQL-скрипт inserts.sql
    для PostgreSQL. Игнорируем записи, где #920 != IBIS.
    Без обработки #907 (service_info).
    """
    with open(infile, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    with open(outfile, 'w', encoding='utf-8') as sql_out:
        # Пишем команды создания таблиц
        sql_out.write(create_tables_sql())
        sql_out.write("\n\n")

        record_count = 0
        record_lines = []

        def process_record(rec_lines):
            nonlocal record_count, sql_out
            # Определяем IBIS или нет
            is_ibis = False
            for ln_ in rec_lines:
                line_check = ln_.strip()
                if line_check.startswith('#920:'):
                    parts_ = line_check.split(':', 1)
                    if len(parts_) == 2:
                        content_ = parts_[1].strip()
                        if content_ == 'IBIS':
                            is_ibis = True
                            break
            if not is_ibis:
                return

            record_count += 1

            # Инициализация полей
            title = ""
            type = ""
            edit = ""
            edition_statement = ""
            pub_info = ""
            phys_desc = ""
            series_ = ""
            udc = ""
            bbk = ""
            local_index = ""

            authors_set = set()
            exemplar_list = []

            for line in rec_lines:
                line = line.rstrip('\n')
                if not line:
                    continue
                if line.startswith('#'):
                    parts = line.split(':', 1)
                    if len(parts) == 2:
                        tag = parts[0].strip()     
                        content = parts[1].strip()
                        content = content.replace('\x1f', '')
                        tag_number = tag[1:]

                        if tag_number == '200':
                            subf_200 = parse_subfields(content)
                            title      = subf_200.get('A', '').strip()
                            type = subf_200.get('E', '').strip()
                            edit = subf_200.get('F', '').strip()

                        elif tag_number == '205':
                            subf_205 = parse_subfields(content)
                            edition_statement = subf_205.get('A', '').strip()

                        elif tag_number == '210':
                            subf_210 = parse_subfields(content)
                            c_val = subf_210.get('C', '').strip()
                            a_val = subf_210.get('A', '').strip()
                            d_val = subf_210.get('D', '').strip()
                            parts_list = [x for x in [c_val, a_val, d_val] if x]
                            pub_info = ", ".join(parts_list)

                        elif tag_number == '215':
                            subf_215 = parse_subfields(content)
                            a_val = subf_215.get('A', '').strip()
                            one_val = subf_215.get('1', '').strip()
                            if a_val or one_val:
                                phys_desc = f"{a_val} {one_val}".strip()

                        elif tag_number == '225':
                            subf_225 = parse_subfields(content)
                            v_val = subf_225.get('V', '').strip()
                            a_val = subf_225.get('A', '').strip()
                            series_ = (v_val + ' ' + a_val).strip() if (v_val or a_val) else ""

                        elif tag_number == '675':
                            udc = content
                        elif tag_number == '964':
                            bbk = content
                        elif tag_number == '903':
                            local_index = content

                        elif tag_number in ('700','701'):
                            a_ = parse_author_700_701(content)
                            if a_:
                                authors_set.add(a_)

                        elif tag_number == '910':
                            exemplar_list.append(content)

                        # Всё, что #907 (service_info), игнорируем

            authors_str = "; ".join(sorted(authors_set))

            # Формируем INSERT в bibliographic_records (без service_info)
            insert_main = f"""\
INSERT INTO bibliographic_records(
    id,
    title, type, edit,
    edition_statement, pub_info, phys_desc, series,
    udc, bbk, local_index,
    authors
) VALUES (
    {record_count},
    '{sql_escape(title)}',
    '{sql_escape(type)}',
    '{sql_escape(edit)}',
    '{sql_escape(edition_statement)}',
    '{sql_escape(pub_info)}',
    '{sql_escape(phys_desc)}',
    '{sql_escape(series_)}',
    '{sql_escape(udc)}',
    '{sql_escape(bbk)}',
    '{sql_escape(local_index)}',
    '{sql_escape(authors_str)}'
);
"""
            sql_out.write(insert_main)

            # Экземпляры (#910)
            for ex_value in exemplar_list:
                ex_insert = f"""\
INSERT INTO exemplars (record_id, exemplar_info)
VALUES ({record_count}, '{sql_escape(ex_value)}');
"""
                sql_out.write(ex_insert)

        # Считываем блоки до "*****"
        for line in lines:
            if line.strip() == "*****":
                if record_lines:
                    process_record(record_lines)
                    record_lines = []
            else:
                record_lines.append(line)

        # Если в конце файла не было "*****"
        if record_lines:
            process_record(record_lines)
            record_lines = []

        print(f"Создан файл {outfile} (записей IBIS: {record_count}). "
              f"Игнорированы все остальные (#920 != IBIS).")

if __name__ == "__main__":
    parse_irbis_file("irbis_data.txt", "inserts.sql")