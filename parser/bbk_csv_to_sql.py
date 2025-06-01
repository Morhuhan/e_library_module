#!/usr/bin/env python3
# bbk_csv_to_sql.py — CSV (ББК) &rarr; INSERT-ы PostgreSQL
# Читает CSV в cp1251 (по умолчанию) с разделителем ‘;’.

import csv
import sys
from pathlib import Path

OUT_COLS     = ("bbk_abb", "description")
DELIM        = ';'
HEADER_TAG   = ("bbk_full", "ББК.", "Рабочие таблицы")
DEFAULT_ENC  = "cp1251"

def escape_pg(text: str) -> str:
    return text.replace("'", "''")

def is_header(row) -> bool:
    return (not any(c.strip() for c in row) or
            row[0].strip().startswith(HEADER_TAG))

def strip_lead_comma(txt: str) -> str:
    return txt.lstrip().lstrip(',').lstrip()

def collect_records(reader):
    """
    Склеивает строки и возвращает список [bbk_abb, description]
    (только те, у кого описание не пустое).
    """
    records, cur = [], None
    for raw in reader:
        if is_header(raw):
            continue

        row = [(raw[i] if i < len(raw) else "").strip() for i in range(4)]

        has_codes = any(row[:2])           # bbk_full или bbk_abb
        if has_codes:
            if cur and cur[1]:
                records.append(cur)
            abb  = row[1] or row[0]
            desc = row[2]
            cur  = [abb, desc]
        else:
            if cur is None:
                continue
            if row[2]:
                cur[1] = f"{cur[1]} {strip_lead_comma(row[2])}".strip()

    if cur and cur[1]:
        records.append(cur)

    return records

def write_sql(recs, dst_sql: Path, src_name: str):
    with dst_sql.open("w", encoding="utf-8", newline='\n') as out:
        out.write(f"-- INSERT-ы ББК, сгенерировано из {src_name}\n")
        for abb, desc in recs:
            out.write(
                "INSERT INTO public.bbk (bbk_abb, description) "
                f"VALUES ('{escape_pg(abb)}', '{escape_pg(desc)}') "
                "ON CONFLICT (bbk_abb) DO NOTHING;\n"
            )

def main(src_csv: Path, dst_sql: Path, enc_in: str = DEFAULT_ENC):
    if not src_csv.exists():
        sys.exit(f"Файл {src_csv} не найден")

    with src_csv.open(encoding=enc_in, newline='') as f:
        reader = csv.reader(f, delimiter=DELIM)
        records = collect_records(reader)

    if not records:
        sys.exit("После очистки не осталось ни одной записи")

    write_sql(records, dst_sql, src_csv.name)
    print(f"Сохранено {len(records)} BBK-записей в {dst_sql}")

if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        sys.exit("usage: python bbk_csv_to_sql.py <src.csv> <out.sql> [encoding]")
    enc = sys.argv[3] if len(sys.argv) == 4 else DEFAULT_ENC
    main(Path(sys.argv[1]), Path(sys.argv[2]), enc)