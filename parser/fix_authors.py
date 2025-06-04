#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Нормализация Ф. И. О. авторов.

Функции
--------
normalize_author(full: str) -> str
    Приводит строку «Фамилия И.О.» к каноническому виду:
        • убирает лишние пробелы;
        • гарантирует ровно один пробел между фамилией и инициалами;
        • прибавляет «.» к инициалам, если их нет;
        • возвращает пустую строку, если на входе пусто.

split_authors(raw: str) -> list[str]
    Разбивает строку вида «Иванов И.И.; Петров П.П.»
    на список индивидуально нормализованных авторов.
"""

from __future__ import annotations
import re
from typing import List

# простая проверка «И.» / «И» / «И. » etc.
_INITIAL_RE = re.compile(r'^[A-ZА-ЯЁ]$', re.IGNORECASE)


def _canon_initials(piece: str) -> str:
    """
    «И.» → «И.»
    «И»  → «И.»
    """
    piece = piece.strip('. ')
    return f'{piece}.' if piece else ''


def normalize_author(full: str) -> str:
    """
    «Евтеев  Ю.И.»     → «Евтеев Ю.И.»
    «Чернышев А .А»    → «Чернышев А.А.»
    """
    full = full.replace('\u202f', ' ')          # узкие неразрывные пробелы → обычные
    full = re.sub(r'\s+', ' ', full).strip()    # множественные пробелы

    if not full:
        return ''

    parts = full.split(' ', maxsplit=1)
    if len(parts) == 1:                         # только фамилия → как есть
        return parts[0]

    last_name, rest = parts
    rest = rest.replace(' ', '')                # «И.И.» без пробелов
    buf = []

    for ch in rest:
        if ch == '.':
            continue
        if _INITIAL_RE.match(ch):
            buf.append(ch.upper())
        else:                   # неожиданное - оставляем как есть и выходим
            return f'{last_name} {rest}'

    initials = '.'.join(buf) + '.'
    return f'{last_name} {initials}'


def split_authors(raw: str) -> List[str]:
    """
    «Иванов И.И.;  Петров П.П.» → ['Иванов И.И.', 'Петров П.П.']
    Удаляет полностью повторяющихся авторов.
    """
    if not raw:
        return []

    out: list[str] = []
    for token in raw.split(';'):
        token = normalize_author(token)
        if token and token not in out:
            out.append(token)
    return out