#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер экспорта ИРБИС &rarr; SQL-дамп (v4.6, inline copies, dedup).

Изменения v4.6
──────────────
• Поле #910 разбирается здесь же (подполя B-C-D-E).
• Для INSERT-ов в public.book_copy добавлен
      ON CONFLICT (book_id, inventory_no) DO NOTHING
  + собственная фильтрация duplicates &rarr; skipped_dupes.
• Итоговая статистика теперь различает:
      skipped_copies – битые строки (без B),
      skipped_dupes  – повторные B для одной книги.
• Обновлена документация.
"""

from __future__ import annotations
import sys, os, re, psycopg2
from typing import List, Set, Dict, Tuple, Iterable, Optional
from datetime import datetime

from fix_bbk  import load_bbk_map, filter_links as filter_bbk_links
from fix_udc  import load_udc_map, filter_links as filter_udc_links
from fix_pub_info import parse_pub_info
from fix_authors  import normalize_author

# ─────────────────────────── utils ────────────────────────────────────
def sql_escape(s: str) -> str: return s.replace("'", "''")

_split_codes_re = re.compile(r'[;,]\s*|\s{2,}')
def split_codes(raw: str) -> List[str]:
    return [x.strip() for x in _split_codes_re.split(raw) if x.strip()]

def parse_subfields(field_text: str) -> Dict[str, str]:
    text  = field_text.replace('\x1f', '')
    parts = text.split('')
    subf: Dict[str, str] = {}
    for chunk in parts:
        chunk = chunk.strip()
        if chunk:
            subf[chunk[0]] = chunk[1:].strip()
    return subf

def parse_author_700_701(field_text: str) -> str:
    subf = parse_subfields(field_text)
    last_name = subf.get('A', '').strip()
    initials  = subf.get('B', '').strip()
    return f"{last_name} {initials}" if last_name and initials else last_name or initials

# ───────────────── helpers: разбор #910 (экземпляры) ─────────────────
_SUBFIELD_SEP = '\x1f'
_PRICE_RE     = re.compile(r'[\d\.,]+')
_DATE_FORMATS: list[tuple[str, re.Pattern[str]]] = [
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
    if not raw: return None
    for fmt, rx in _DATE_FORMATS:
        if rx.match(raw):
            try: return datetime.strptime(raw, fmt).strftime('%Y-%m-%d')
            except ValueError: break
    try: return datetime.fromisoformat(raw[:10]).strftime('%Y-%m-%d')
    except Exception: return None

def _normalize_price(raw: str) -> Optional[str]:
    if not raw: return None
    m = _PRICE_RE.search(raw.replace(' ', ''))
    if not m: return None
    val = m.group(0).replace(',', '.')
    return val[:-1] if val.endswith('.') else val

def parse_copies(
    pairs: List[Tuple[int,str]]
) -> Tuple[List[Tuple[int,str|None,str|None,str|None,str|None]], int]:
    cleaned: List[Tuple[int,str|None,str|None,str|None,str|None]] = []
    skipped = 0
    for book_id, raw in pairs:
        subs  = list(_iter_subfields(raw))
        if not subs:
            skipped += 1
            continue
        cur: Dict[str,Optional[str]] = {"B":None,"C":None,"D":None,"E":None}
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
            for k in cur: cur[k]=None
        for code,val in subs:
            if code == 'B':
                if any(cur.values()): _flush()
                cur['B']=val
            elif code in cur:
                cur[code]=val
        if any(cur.values()): _flush()
    return cleaned, skipped

# ─────────────────────────── main ─────────────────────────────────────
def parse_irbis_file(dsn:str, infile:str, outfile:str)->None:
    print(f"Начало обработки файла: {infile}")
    with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
        bbk_map = load_bbk_map(cur)
        udc_map = load_udc_map(cur)

        try:
            with open(infile,'r',encoding='utf-8') as f: lines=f.readlines()
        except FileNotFoundError:
            sys.exit(f"Ошибка: файл &laquo;{infile}&raquo; не найден.")

        with open(outfile,'w',encoding='utf-8') as sql_out:

            sql_out.write(f"""\
-- ======================================================
-- SQL-дамп, создан parse_irbis_file v4.6
-- Дата создания : {datetime.now():%Y-%m-%d %H:%M:%S}
-- Входной файл  : {infile}
-- ======================================================

""")

            record_lines: List[str]=[]
            record_count=0
            publisher_ids:Dict[str,int]={}; next_publisher_id=1
            bbk_pairs_raw:List[Tuple[int,str]]=[]; udc_pairs_raw:List[Tuple[int,str]]=[]
            copies_pairs_raw:List[Tuple[int,str]]=[]

            def process_record(rec:List[str])->None:
                nonlocal record_count,next_publisher_id
                if not any(l.startswith('#920:') and l.split(':',1)[1].strip()=='IBIS' for l in rec):
                    return
                record_count+=1
                title=type_=edit=edition_statement=''
                pub_info_raw=''; phys_desc=series_=''
                udc_raw=bbk_raw=''
                authors:Set[str]=set()
                copies:List[str]=[]

                for line in rec:
                    line=line.rstrip('\n')
                    if not line or not line.startswith('#'): continue
                    tag,_,content=line.partition(':'); tag=tag[1:]

                    if tag=='200':
                        s=parse_subfields(content); title=s.get('A','').strip()
                        type_=s.get('E','').strip(); edit=s.get('F','').strip()
                    elif tag=='205':
                        edition_statement=parse_subfields(content).get('A','').strip()
                    elif tag=='210':
                        s=parse_subfields(content)
                        pub_info_raw=', '.join(x for x in (s.get('A','').strip(),
                                                           s.get('C','').strip(),
                                                           s.get('D','').strip()) if x)
                    elif tag=='215':
                        s=parse_subfields(content)
                        phys_desc=' '.join(x for x in (s.get('A','').strip(),
                                                       s.get('1','').strip()) if x)
                    elif tag=='225':
                        s=parse_subfields(content)
                        series_=' '.join(x for x in (s.get('V','').strip(),
                                                     s.get('A','').strip()) if x)
                    elif tag=='675': udc_raw=content.strip()
                    elif tag=='964': bbk_raw=content.strip()
                    elif tag in ('700','701'):
                        a=parse_author_700_701(content)
                        if a: authors.add(normalize_author(a))
                    elif tag=='910': copies.append(content.strip())

                publisher_name,pub_city,pub_year=parse_pub_info(pub_info_raw)

                sql_out.write("-- --- Издатели ---\n")
                pub_id_sql='NULL'
                if publisher_name:
                    if publisher_name not in publisher_ids:
                        publisher_ids[publisher_name]=next_publisher_id
                        sql_out.write(
                            f"INSERT INTO public.publisher(id,name)"
                            f" VALUES ({next_publisher_id},'{sql_escape(publisher_name)}');\n")
                        next_publisher_id+=1
                    pub_id_sql=str(publisher_ids[publisher_name])

                sql_out.write(f"\n-- --- Книга #{record_count} ---\n")
                sql_out.write(f"""\
INSERT INTO public.book(
    id,title,"type",edit,edition_statement,phys_desc,series)
VALUES(
    {record_count},
    '{sql_escape(title)}','{sql_escape(type_)}','{sql_escape(edit)}',
    '{sql_escape(edition_statement)}','{sql_escape(phys_desc)}',
    '{sql_escape(series_)}'
);
""")

                sql_out.write("\n-- --- Место публикации ---\n")
                city_esc=sql_escape(pub_city) if pub_city else ''
                year_sql=str(pub_year) if pub_year else 'NULL'
                sql_out.write(
                    f"INSERT INTO public.book_pub_place(book_id,publisher_id,city,pub_year)"
                    f" VALUES ({record_count},{pub_id_sql},'{city_esc}',{year_sql});\n")

                sql_out.write("\n-- --- Коды BBK / UDC (RAW) ---\n")
                for code in split_codes(bbk_raw):
                    bbk_pairs_raw.append((record_count,code))
                    sql_out.write(
                        f"INSERT INTO public.book_bbk_raw(book_id,bbk_code)"
                        f" VALUES ({record_count},'{sql_escape(code)}') ON CONFLICT DO NOTHING;\n")
                for code in split_codes(udc_raw):
                    udc_pairs_raw.append((record_count,code))
                    sql_out.write(
                        f"INSERT INTO public.book_udc_raw(book_id,udc_code)"
                        f" VALUES ({record_count},'{sql_escape(code)}') ON CONFLICT DO NOTHING;\n")

                for cp in copies: copies_pairs_raw.append((record_count,cp))
            # ───────── конец process_record ──────────

            for ln in lines:
                if ln.strip()=='*****':
                    if record_lines: process_record(record_lines); record_lines.clear()
                else: record_lines.append(ln)
            if record_lines: process_record(record_lines)

            bbk_links,bbk_skipped=filter_bbk_links(bbk_pairs_raw,bbk_map)
            udc_links,udc_skipped=filter_udc_links(udc_pairs_raw,udc_map)

            sql_out.write("\n-- ======================================\n-- BBK (очищенные)\n-- ======================================\n")
            for bid,bid_ in bbk_links:
                sql_out.write(f"INSERT INTO public.book_bbk(book_id,bbk_id)"
                              f" VALUES ({bid},{bid_}) ON CONFLICT DO NOTHING;\n")
            sql_out.write(f"-- BBK: вставлено {len(bbk_links)}, пропущено {bbk_skipped}\n\n")

            sql_out.write("\n-- ======================================\n-- UDC (очищенные)\n-- ======================================\n")
            for bid,uid in udc_links:
                sql_out.write(f"INSERT INTO public.book_udc(book_id,udc_id)"
                              f" VALUES ({bid},{uid}) ON CONFLICT DO NOTHING;\n")
            sql_out.write(f"-- UDC: вставлено {len(udc_links)}, пропущено {udc_skipped}\n")

            # ───── экземпляры ─────
            cleaned_copies,skipped_copies=parse_copies(copies_pairs_raw)

            seen_pairs:set[tuple[int,str]] = set()
            skipped_dupes = 0

            sql_out.write("\n-- ======================================\n-- Экземпляры\n-- ======================================\n")
            for book_id,inv_no,date_in,storage,price in cleaned_copies:
                if (book_id,inv_no) in seen_pairs:
                    skipped_dupes += 1
                    continue
                seen_pairs.add((book_id,inv_no))

                inv_sql     = f"'{sql_escape(inv_no)}'" if inv_no else 'NULL'
                date_sql    = f"'{date_in}'" if date_in else 'NULL'
                storage_sql = f"'{sql_escape(storage)}'" if storage else 'NULL'
                price_sql   = price if price else 'NULL'

                sql_out.write(
                    "INSERT INTO public.book_copy"
                    " (book_id,inventory_no,receipt_date,storage_place,price) "
                    f"VALUES ({book_id},{inv_sql},{date_sql},{storage_sql},{price_sql}) "
                    "ON CONFLICT (book_id,inventory_no) DO NOTHING;\n")

            sql_out.write(f"-- Экземпляры: вставлено {len(seen_pairs)}, "
                          f"дубликатов пропущено {skipped_dupes}, "
                          f"битых строк {skipped_copies}\n")

        # ───── финальная статистика в консоль ─────
        print(f"""\
Обработка завершена.
- Записей IBIS          : {record_count}
- BBK RAW               : {len(bbk_pairs_raw)}  (очищено {len(bbk_links)}, пропущено {bbk_skipped})
- UDC RAW               : {len(udc_pairs_raw)}  (очищено {len(udc_links)}, пропущено {udc_skipped})
- Экземпляры вставлено  : {len(seen_pairs)}
  ▸ дубликаты пропущено  : {skipped_dupes}
  ▸ битые строки         : {skipped_copies}
- SQL-файл создан       : {outfile}
""")

# ─────────────────────────── CLI ──────────────────────────────────────
if __name__ == '__main__':
    DEF_IN,DEF_OUT="irbis_data.txt","inserts.sql"
    if len(sys.argv)<2:
        sys.exit("""\
Использование:
  python parse_irbis_file.py "dbname=library user=admin password=*** host=localhost port=5432"
       [input_file] [output_file]

По умолчанию:
  input_file  = irbis_data.txt
  output_file = inserts.sql
""")
    dsn=sys.argv[1]
    infile =sys.argv[2] if len(sys.argv)>2 else DEF_IN
    outfile=sys.argv[3] if len(sys.argv)>3 else DEF_OUT
    if not os.path.exists(infile):
        sys.exit(f"Ошибка: файл {infile} не найден.")
    parse_irbis_file(dsn,infile,outfile)