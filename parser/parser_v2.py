#!/usr/bin/env python3
# -*- coding: utf-8 -*-

def sql_escape(s: str) -> str:
    """
    Простейшее экранирование одинарных кавычек для SQL.
    Заменяет ' на ''.
    """
    return s.replace("'", "''")


def parse_subfields(field_text: str) -> dict:
    """
    Универсальный парсер подполя в стиле "A...B...C..."
    Возвращает словарь: {'A': '...', 'B': '...', ... }.
    """
    text = field_text.replace('\x1f', '')  # иногда в ИРБИС встречается \x1f
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
    Пример:
      #700: AИвановBИ.И.  => "Иванов И.И."
      #701: AПетровBП.П.  => "Петров П.П."
    """
    subf = parse_subfields(field_text)
    last_name = subf.get('A', '').strip()
    initials = subf.get('B', '').strip()
    if last_name and initials:
        return f"{last_name} {initials}"
    return last_name or initials


def parse_irbis_file(infile: str = 'irbis_data.txt', outfile: str = 'inserts.sql') -> None:
    """
    Парсит 'irbis_data.txt' (в стиле ИРБИС) и создает SQL-файл `inserts.sql`
    с INSERT’ами только для таблиц book и book_copy.

    Логика:
      - Игнорируем записи, в которых #920 != 'IBIS'.
      - Поля book:
          #200 -> title (A), type (E), edit (F)
          #205 -> edition_statement (A)
          #210 -> pub_info (C, A, D)
          #215 -> phys_desc (A + подполе '1')
          #225 -> series (V + A)
          #675 -> udc
          #964 -> bbk
          #903 -> local_index
          #700/#701 -> authors (собираем несколько авторов)
      - Поле #910 -> copy_info (таблица book_copy).
      - Поле #907 (service_info) не нужно.
      - Каждый блок записей заканчивается строкой "*****".
    """

    with open(infile, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    with open(outfile, 'w', encoding='utf-8') as sql_out:
        # При желании можно оставить комментарий с CREATE TABLE,
        # но само создание здесь не выполняем:
        sql_out.write("-- Пример (создать таблицы вручную):\n")
        sql_out.write("-- CREATE TABLE book (\n")
        sql_out.write("--     id SERIAL PRIMARY KEY,\n")
        sql_out.write("--     title TEXT,\n")
        sql_out.write("--     type TEXT,\n")
        sql_out.write("--     edit TEXT,\n")
        sql_out.write("--     edition_statement TEXT,\n")
        sql_out.write("--     pub_info TEXT,\n")
        sql_out.write("--     phys_desc TEXT,\n")
        sql_out.write("--     series TEXT,\n")
        sql_out.write("--     udc TEXT,\n")
        sql_out.write("--     bbk TEXT,\n")
        sql_out.write("--     local_index TEXT,\n")
        sql_out.write("--     authors TEXT\n")
        sql_out.write("-- );\n")
        sql_out.write("-- CREATE TABLE book_copy (\n")
        sql_out.write("--     id SERIAL PRIMARY KEY,\n")
        sql_out.write("--     book_id INT REFERENCES book(id) ON DELETE CASCADE,\n")
        sql_out.write("--     copy_info TEXT\n")
        sql_out.write("-- );\n\n")

        sql_out.write("-- Ниже генерируем только INSERT для book / book_copy\n\n")

        record_lines = []
        record_count = 0

        def process_record(rec_lines):
            nonlocal record_count

            # Сначала проверим #920 == 'IBIS'
            ibis_found = False
            for ln in rec_lines:
                if ln.strip().startswith('#920:'):
                    parts_ = ln.split(':', 1)
                    if len(parts_) == 2 and parts_[1].strip() == 'IBIS':
                        ibis_found = True
                        break
            if not ibis_found:
                return  # не IBIS — пропускаем

            record_count += 1

            # Инициируем поля для будущего INSERT INTO book
            title = ""
            type_ = ""
            edit = ""
            edition_statement = ""
            pub_info = ""
            phys_desc = ""
            series_ = ""
            udc = ""
            bbk = ""
            local_index = ""
            authors_set = set()

            # Список экземпляров (каждый #910 => одна запись в book_copy)
            copy_list = []

            for line in rec_lines:
                line = line.rstrip('\n')
                if not line:
                    continue
                if line.startswith('#'):
                    parts = line.split(':', 1)
                    if len(parts) < 2:
                        continue
                    tag = parts[0].strip()   # "#200", "#910" и т.д.
                    content = parts[1].strip()
                    tag_number = tag[1:]    # "200", "910"

                    if tag_number == '200':
                        # #200: A... E... F...
                        subf = parse_subfields(content)
                        title = subf.get('A', '').strip()
                        type_ = subf.get('E', '').strip()
                        edit = subf.get('F', '').strip()

                    elif tag_number == '205':
                        # #205: A2-е изд. ...
                        subf = parse_subfields(content)
                        edition_statement = subf.get('A', '').strip()

                    elif tag_number == '210':
                        # #210: CМоскваAИзд-во ПетровыхD2020
                        subf = parse_subfields(content)
                        c_val = subf.get('C', '').strip()
                        a_val = subf.get('A', '').strip()
                        d_val = subf.get('D', '').strip()
                        parts_210 = [x for x in [c_val, a_val, d_val] if x]
                        pub_info = ", ".join(parts_210)

                    elif tag_number == '215':
                        # #215: A128 с.11 илл.
                        subf = parse_subfields(content)
                        a_val = subf.get('A', '').strip()
                        one_val = subf.get('1', '').strip()
                        if a_val or one_val:
                            phys_desc = (a_val + " " + one_val).strip()

                    elif tag_number == '225':
                        # #225: VТ.1AСерия "Наука"
                        subf = parse_subfields(content)
                        v_val = subf.get('V', '').strip()
                        a_val = subf.get('A', '').strip()
                        series_ = (v_val + " " + a_val).strip()

                    elif tag_number == '675':
                        # #675: 123.456
                        udc = content.strip()

                    elif tag_number == '964':
                        # #964: ББК
                        bbk = content.strip()

                    elif tag_number == '903':
                        # #903: Локальный индекс
                        local_index = content.strip()

                    elif tag_number in ['700', '701']:
                        # Считаем автора
                        author_str = parse_author_700_701(content)
                        if author_str:
                            authors_set.add(author_str)

                    elif tag_number == '910':
                        # Экземпляр
                        copy_list.append(content)

                    # #907 (service_info) или другое — игнорируем

            # Собираем authors
            authors_str = "; ".join(sorted(authors_set))

            # 1) INSERT в book
            insert_book = f"""\
INSERT INTO book(
    id,
    title, "type", edit,
    edition_statement, pub_info, phys_desc, series,
    udc, bbk, local_index, authors
) VALUES (
    {record_count},
    '{sql_escape(title)}',
    '{sql_escape(type_)}',
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
            sql_out.write(insert_book + "\n")

            # 2) INSERT в book_copy (для каждого #910)
            for copy_val in copy_list:
                insert_copy = f"""\
INSERT INTO book_copy(book_id, copy_info)
VALUES ({record_count}, '{sql_escape(copy_val)}');
"""
                sql_out.write(insert_copy + "\n")

        # Читаем входной файл, разбиваем на записи по "*****"
        for line in lines:
            if line.strip() == "*****":
                if record_lines:
                    process_record(record_lines)
                    record_lines = []
            else:
                record_lines.append(line)

        # Если в самом конце файла запись без "*****"
        if record_lines:
            process_record(record_lines)

        print(f"Файл '{outfile}' успешно создан. Найдено записей IBIS: {record_count}.")


if __name__ == "__main__":
    parse_irbis_file("irbis_data.txt", "inserts.sql")