"""Garante que todo arquivo Python do projeto compila.

Existe porque um erro de sintaxe em app/build_site.py chegou à main sem que nenhum teste percebesse: o arquivo não é
importado pelos outros testes. Compilar tudo pega esse tipo de erro na hora, em qualquer arquivo.
"""

from __future__ import annotations

import py_compile
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent
PASTAS = ["app", "apps/api/app", "enrichment", "ingestion", "storage", "trilhas", "tests"]
ARQUIVOS = sorted(p for pasta in PASTAS for p in (RAIZ / pasta).rglob("*.py") if ".venv" not in p.parts) + [RAIZ / "main.py"]


@pytest.mark.parametrize("arquivo", ARQUIVOS, ids=lambda p: str(p.relative_to(RAIZ)))
def test_arquivo_compila(arquivo: Path) -> None:
    py_compile.compile(str(arquivo), doraise=True)
