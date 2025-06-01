#!/usr/bin/env python3
"""
fix_udc.py — полная функциональная копия fix_bbk.py, но для УДК.
"""

from typing import Dict, List, Tuple
import sys, psycopg2


def load_udc_map(cur) -> Dict[str, int]:
    cur.execute("SELECT id, udc_abb FROM public.udc;")
    return {code: _id for _id, code in cur.fetchall()}


def filter_links(
    pairs: List[Tuple[int, str]], udc_map: Dict[str, int]
) -> Tuple[List[Tuple[int, int]], int]:
    links, skipped = [], 0
    for book_id, code in pairs:
        udc_id = udc_map.get(code)
        if udc_id:
            links.append((book_id, udc_id))
        else:
            skipped += 1
    return links, skipped


def _cli(dsn: str) -> None:
    with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
        udc_map = load_udc_map(cur)
        cur.execute("SELECT book_id, udc_code FROM public.book_udc_raw;")
        raw_pairs = cur.fetchall()

        links, skipped = filter_links(raw_pairs, udc_map)
        print(f"Всего пар RAW: {len(raw_pairs)}")
        print(f"Совпали: {len(links)}   |   Пропущены: {skipped}")

        print("\nПример INSERT-ов:")
        for book_id, udc_id in links[:10]:
            print(f"INSERT INTO public.book_udc (book_id, udc_id) "
                  f"VALUES ({book_id}, {udc_id});")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Использование: python fix_udc.py \"<строка-DSN>\"")
    _cli(sys.argv[1])