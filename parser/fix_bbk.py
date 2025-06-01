#!/usr/bin/env python3
"""
fix_bbk.py
──────────
Функции для фильтрации связок (book_id, bbk_code) по уже существующим
записям справочника BBK.  Можно:
    • импортировать   (использует parse_irbis_file.py),
    • запускать отдельно: python fix_bbk.py "<DSN>"
"""

from typing import Dict, List, Tuple
import sys, psycopg2

# ────────────────────────────────────────────────────────────────────
def load_bbk_map(cur) -> Dict[str, int]:
    """Возвращает {bbk_abb: bbk_id}."""
    cur.execute("SELECT id, bbk_abb FROM public.bbk;")
    return {code: _id for _id, code in cur.fetchall()}


def filter_links(
    pairs: List[Tuple[int, str]], bbk_map: Dict[str, int]
) -> Tuple[List[Tuple[int, int]], int]:
    """
    Принимает [(book_id, bbk_code), …] и сопоставление code&rarr;id.
    Возвращает (валидные_связи, количество_пропущенных).
    """
    links, skipped = [], 0
    for book_id, code in pairs:
        bbk_id = bbk_map.get(code)
        if bbk_id:
            links.append((book_id, bbk_id))
        else:
            skipped += 1
    return links, skipped
# ────────────────────────────────────────────────────────────────────
def _cli(dsn: str) -> None:
    with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
        bbk_map = load_bbk_map(cur)
        cur.execute("SELECT book_id, bbk_code FROM public.book_bbk_raw;")
        raw_pairs = cur.fetchall()

        links, skipped = filter_links(raw_pairs, bbk_map)
        print(f"Всего пар RAW: {len(raw_pairs)}")
        print(f"Совпали: {len(links)}   |   Пропущены: {skipped}")

        # Для демонстрации выведем первые 10 строк INSERT-ов.
        print("\nПример INSERT-ов:")
        for book_id, bbk_id in links[:10]:
            print(f"INSERT INTO public.book_bbk (book_id, bbk_id) "
                  f"VALUES ({book_id}, {bbk_id});")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Использование: python fix_bbk.py \"<строка-DSN>\"")
    _cli(sys.argv[1])