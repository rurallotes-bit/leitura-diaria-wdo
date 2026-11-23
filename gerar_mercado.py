"""Gera mercado.json: cotações do dia (Brasil, mundo, moedas, commodities e cripto) para a aba Mercado.

Os preços vêm do Yahoo Finance, como no gerar_ewz.py. Execute com:  py gerar_mercado.py
Grava mercado.json na mesma pasta deste arquivo. A aba Mercado lê esse arquivo.
"""
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime

ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mercado.json")

# (grupo, símbolo no Yahoo, nome, código de exibição, subtítulo)
ATIVOS = [
    ("Brasil", "^BVSP", "Ibovespa", "IBOV", "B3"),
    ("Brasil", "PETR4.SA", "Petrobras", "PETR4", "Ação"),
    ("Brasil", "VALE3.SA", "Vale", "VALE3", "Ação"),
    ("Brasil", "ITUB4.SA", "Itaú Unibanco", "ITUB4", "Ação"),
    ("Brasil", "BBAS3.SA", "Banco do Brasil", "BBAS3", "Ação"),
    ("Mundo", "^GSPC", "S&P 500", "EUA", "Índice"),
    ("Mundo", "^IXIC", "Nasdaq", "EUA", "Índice"),
    ("Mundo", "^DJI", "Dow Jones", "EUA", "Índice"),
    ("Mundo", "^STOXX50E", "Euro Stoxx 50", "Europa", "Índice"),
    ("Mundo", "^N225", "Nikkei 225", "Japão", "Índice"),
    ("Mundo", "^VIX", "VIX", "Medo nos EUA", "Volatilidade"),
    ("Moedas, commodities e cripto", "BRL=X", "Dólar", "USD/BRL", "Moeda"),
    ("Moedas, commodities e cripto", "EURBRL=X", "Euro", "EUR/BRL", "Moeda"),
    ("Moedas, commodities e cripto", "DX-Y.NYB", "DXY", "Dólar no mundo", "Índice"),
    ("Moedas, commodities e cripto", "BZ=F", "Petróleo Brent", "US$/barril", "Commodity"),
    ("Moedas, commodities e cripto", "GC=F", "Ouro", "US$/onça", "Commodity"),
    ("Moedas, commodities e cripto", "BTC-USD", "Bitcoin", "BTC", "Cripto"),
    ("Moedas, commodities e cripto", "ETH-USD", "Ethereum", "ETH", "Cripto"),
]


def baixar(simbolo):
    """Preço atual, variação sobre o fechamento anterior e os preços do dia (15 em 15 min)."""
    url = ("https://query1.finance.yahoo.com/v8/finance/chart/"
           + urllib.parse.quote(simbolo) + "?interval=15m&range=1d")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resposta:
        dados = json.load(resposta)
    r = dados["chart"]["result"][0]
    meta = r["meta"]
    preco = meta.get("regularMarketPrice")
    anterior = meta.get("chartPreviousClose") or meta.get("previousClose")
    fechamentos = r["indicators"]["quote"][0].get("close") or []
    serie = [round(c, 4) for c in fechamentos if c is not None]
    variacao = (preco / anterior - 1) * 100 if preco and anterior else None
    return {"preco": preco, "variacao_pct": variacao, "serie": serie}


def main():
    grupos = {}
    falhas = []
    for grupo, simbolo, nome, codigo, sub in ATIVOS:
        try:
            cot = baixar(simbolo)
        except Exception as erro:
            falhas.append(f"{nome} ({simbolo}): {erro}")
            continue
        if cot["preco"] is None:
            falhas.append(f"{nome} ({simbolo}): sem preço")
            continue
        item = {"nome": nome, "codigo": codigo, "sub": sub, "simbolo": simbolo, **cot}
        grupos.setdefault(grupo, []).append(item)

    saida = {
        "atualizado_em": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "grupos": [{"nome": g, "itens": itens} for g, itens in grupos.items()],
    }
    with open(ARQUIVO, "w", encoding="utf-8") as arquivo:
        json.dump(saida, arquivo, ensure_ascii=False)
    total = sum(len(i) for i in grupos.values())
    print(f"mercado.json: {total} ativos")
    for f in falhas:
        print(f"Não consegui: {f}", file=sys.stderr)
    print(f"Gravado: {ARQUIVO}")
    return 0 if total else 1


if __name__ == "__main__":
    sys.exit(main())
