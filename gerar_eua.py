"""Gera eua.json: Nasdaq e S&P 500 (M15 e M60) com as marcações de BoS e CHoCH.

Execute com:  py gerar_eua.py
Grava eua.json na mesma pasta deste arquivo. A aba EUA lê esse arquivo.
Usa a mesma regra de BoS e CHoCH do gerar_ewz.py (função eventos).
"""
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime

from gerar_ewz import eventos

# (chave, símbolo no Yahoo, nome)
ATIVOS = [("nasdaq", "^IXIC", "Nasdaq"), ("sp500", "^GSPC", "S&P 500")]
# tempo do gráfico: (intervalo do Yahoo, período buscado)
TEMPOS = {"15": ("15m", "60d"), "60": ("60m", "730d")}
ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "eua.json")


def baixar(simbolo, intervalo, periodo):
    """Velas (t, o, h, l, c) do ativo. t é o horário em segundos Unix (UTC)."""
    url = ("https://query1.finance.yahoo.com/v8/finance/chart/" + urllib.parse.quote(simbolo)
           + f"?interval={intervalo}&range={periodo}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resposta:
        dados = json.load(resposta)
    resultado = dados["chart"]["result"][0]
    cotacao = resultado["indicators"]["quote"][0]
    velas = []
    for t, o, h, l, c in zip(resultado["timestamp"], cotacao["open"],
                             cotacao["high"], cotacao["low"], cotacao["close"]):
        if None in (o, h, l, c):
            continue
        velas.append({"t": t, "o": o, "h": h, "l": l, "c": c})
    return velas


def main():
    saida = {
        "atualizado_em": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "ativos": {},
    }
    erros = []
    for chave, simbolo, nome in ATIVOS:
        tempos = {}
        for tempo, (intervalo, periodo) in TEMPOS.items():
            try:
                velas = baixar(simbolo, intervalo, periodo)
            except Exception as erro:
                erros.append(f"{nome} M{tempo}: {erro}")
                continue
            evs = eventos(velas)
            tempos[tempo] = {"velas": velas, "eventos": evs}
            print(f"{nome} M{tempo}: {len(velas)} velas, {len(evs)} eventos (BoS/CHoCH)")
        if tempos:
            saida["ativos"][chave] = {"nome": nome, "simbolo": simbolo, "tempos": tempos}
    if not saida["ativos"]:
        for e in erros:
            print(f"Não consegui baixar: {e}", file=sys.stderr)
        return 1
    for e in erros:
        print(f"Aviso, não consegui baixar: {e}", file=sys.stderr)
    with open(ARQUIVO, "w", encoding="utf-8") as arquivo:
        json.dump(saida, arquivo, ensure_ascii=False)
    print(f"Gravado: {ARQUIVO}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
