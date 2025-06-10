#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_authors.py – нормализация и разбор авторов
=============================================

Модуль предоставляет утилиты для работы с именами авторов из
MARC-полей #700 / #701 и произвольных списков авторов.

Функции
-------
parse_author_700_701(field_text: str) -> str
    Извлекает фамилию и инициалы из текста MARC-поля #700 / #701
    (подполя A – фамилия, B – инициалы) и возвращает строку
    &laquo;Фамилия И.О.&raquo;.

normalize_author(full: str) -> str
    Приводит строку &laquo;Фамилия И.О.&raquo; к каноническому виду:
        • убирает лишние пробелы;
        • гарантирует ровно один пробел между фамилией и инициалами;
        • прибавляет &laquo;.&raquo; к инициалам, если их нет;
        • возвращает пустую строку, если на входе пусто.

split_authors(raw: str) -> list[str]
    Разбивает строку вида &laquo;Иванов И.И.; Петров П.П.&raquo;
    на список индивидуально нормализованных авторов
    без точных дубликатов.
"""

from __future__ import annotations
import re
from typing import Dict, List

# ─────────────────────────── helpers ────────────────────────────
_SUBFIELD_SEP = "\x1f"          # разделитель подполя в ИРБИС-экспорте
_INITIAL_RE   = re.compile(r"^[A-ZА-ЯЁ]$", re.IGNORECASE)   # однобуквенная инициала


def _parse_subfields(field_text: str) -> Dict[str, str]:
    """
    Преобразует строку MARC-поля вида
        '$AИванов$BИ.О.'  (где  = \x1f)
    в словарь {'A': 'Иванов', 'B': 'И.О.'}.

    В экспортах ИРБИС иногда вместо \x1f используют '^'.
    """
    text = field_text.replace("^", _SUBFIELD_SEP)
    parts = text.split(_SUBFIELD_SEP)
    subf: Dict[str, str] = {}
    for chunk in parts:
        chunk = chunk.strip()
        if chunk:
            subf[chunk[0]] = chunk[1:].strip()
    return subf


# ─────────────────────────── public API ─────────────────────────
def parse_author_700_701(field_text: str) -> str:
    """
    &laquo;\x1fAИванов\x1fBИ.О.&raquo;      &rarr; &laquo;Иванов И.О.&raquo;
    &laquo;^AПетров^BП.П.&raquo;            &rarr; &laquo;Петров П.П.&raquo;
    Если фамилия или инициалы отсутствуют, возвращается то, что найдено.
    """
    subf = _parse_subfields(field_text)
    last_name = subf.get("A", "").strip()
    initials  = subf.get("B", "").strip()
    if initials and not initials.endswith("."):
        # &laquo;И.О&raquo; &rarr; &laquo;И.О.&raquo;
        initials = ".".join(i.strip(".") for i in initials.split(".")) + "."
    return f"{last_name} {initials}".strip()


def normalize_author(full: str) -> str:
    """
    &laquo;Евтеев  Ю.И.&raquo;     &rarr; &laquo;Евтеев Ю.И.&raquo;
    &laquo;Чернышев А .А&raquo;    &rarr; &laquo;Чернышев А.А.&raquo;

    Правила:
      • множественные пробелы сводятся к одному;
      • между фамилией и инициалами ровно один пробел;
      • инициалы приводятся к &laquo;И.О.&raquo; (с точками);
      • регистр букв фамилии сохраняется как есть;
      • пустая или пробельная строка &rarr; ''.
    """
    full = full.replace("\u202f", " ")          # узкие неразрывные &rarr; обычные
    full = re.sub(r"\s+", " ", full).strip()    # множественные пробелы

    if not full:
        return ""

    parts = full.split(" ", maxsplit=1)
    if len(parts) == 1:                         # только фамилия
        return parts[0]

    last_name, rest = parts
    rest = rest.replace(" ", "")                # &laquo;И.И.&raquo; без пробелов
    buf = []

    for ch in rest:
        if ch == ".":
            continue
        if _INITIAL_RE.match(ch):
            buf.append(ch.upper())
        else:                                   # неожиданный символ – возвращаем как есть
            return f"{last_name} {rest}"

    initials = ".".join(buf) + "."
    return f"{last_name} {initials}"


def split_authors(raw: str) -> List[str]:
    """
    &laquo;Иванов И.И.;  Петров П.П.&raquo; &rarr; ['Иванов И.И.', 'Петров П.П.']

    • Точка с запятой &laquo;;&raquo; – разделитель авторов.
    • Каждый автор нормализуется normalize_author().
    • Полные дубликаты удаляются, порядок сохра-няется.
    """
    if not raw:
        return []

    out: List[str] = []
    for token in raw.split(";"):
        token = normalize_author(token)
        if token and token not in out:
            out.append(token)
    return out