#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Физическое описание (#215) + перенос текста из скобок в series.
"""

from __future__ import annotations
import re
from typing import Tuple

_RE_PAGES = re.compile(r'(\d+)\s*[сc]\.?', re.IGNORECASE)  # 127 с. / 260 c
_RE_FIRST_NUMBER = re.compile(r'^\s*(\d+)\b')              # 448 (без «с.»)
_RE_PARENS = re.compile(r'\(([^)]*?)\)')                   # текст в (скобках)

def _normalize(s: str) -> str:
    """Убираем двойные пробелы и пробелы после кавычек."""
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'"\s+', '"', s)
    return s.strip()

def clean_phys_desc(raw: str, current_series: str = "") -> Tuple[str, str]:
    """Возвращает (phys_desc_clean, series_merged)."""
    if not raw:
        return "", current_series

    txt = raw.strip()

    # 1. Всё, что в круглых скобках → series
    for m in re.finditer(_RE_PARENS, txt):
        inside = _normalize(m.group(1))
        if inside:
            current_series = f"{current_series}; {inside}".strip("; ")

    # Удаляем скобки и их содержимое
    txt = re.sub(_RE_PARENS, '', txt)

    # 2. Количество страниц
    pages = [pg.lstrip("0") or "0" for pg in _RE_PAGES.findall(txt)]
    if not pages:
        m = _RE_FIRST_NUMBER.match(txt)
        if m:
            pages.append(m.group(1).lstrip("0") or "0")

    return "; ".join(pages), current_series