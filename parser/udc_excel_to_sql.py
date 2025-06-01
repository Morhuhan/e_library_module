#!/usr/bin/env python3
# udc_excel_to_sql.py — Excel (2 колонки) &rarr; INSERT-ы PostgreSQL
# pip install pandas openpyxl

import sys, re, pandas as pd

COL_CODE, COL_DESC = "udc_abb", "description"
space_re = re.compile(r'\s+')

def pg_escape(text: str) -> str:
    return text.replace("'", "''")

def normalize(text: str) -> str:
    return space_re.sub(' ', text).strip()

def rows_to_records(df):
    code, parts = None, []
    for raw_code, raw_desc in df.itertuples(index=False, name=None):
        c = normalize(str(raw_code))
        d = normalize(str(raw_desc))

        if c:
            if code and parts:
                yield code, ' '.join(parts)
            code, parts = c, [d] if d else []
        elif d and code:
            parts.append(d)

    if code and parts:
        yield code, ' '.join(parts)

def main(src_xlsx: str, dst_sql: str):
    df = pd.read_excel(src_xlsx, header=None, dtype=str).fillna('')

    with open(dst_sql, 'w', encoding='utf-8') as f:
        f.write(f"-- INSERT-ы УДК, сгенерировано из {src_xlsx}\n")
        for code, desc in rows_to_records(df):
            f.write(
                "INSERT INTO public.udc (udc_abb, description) "
                f"VALUES ('{pg_escape(code)}', '{pg_escape(desc)}') "
                "ON CONFLICT (udc_abb) DO NOTHING;\n"
            )

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Использование: python udc_excel_to_sql.py <вход.xlsx> <выход.sql>")
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])