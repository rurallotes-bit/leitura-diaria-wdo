"""Gera ewz.json: preços do EWZ (Yahoo Finance) com as marcações de BoS e CHoCH.

Execute com:  py gerar_ewz.py
Grava ewz.json na mesma pasta deste arquivo. A aba EWZ lê esse arquivo.

BoS (break of structure): rompimento de topo/fundo a favor da tendência atual.
CHoCH (change of character): rompimento contra a tendência atual (vira a tendência).
"""
import json
import os
import sys
import urllib.request
from datetime import datetime

SIMBOLO = "EWZ"
# tempo do gráfico: (intervalo do Yahoo, período buscado)
TEMPOS = {"15": ("15m", "60d"), "60": ("60m", "730d")}
PIVO = 2  # velas de cada lado para confirmar um topo ou fundo
ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ewz.json")


def baixar(intervalo, periodo):
    """Velas (t, o, h, l, c) do EWZ. t é o horário em segundos Unix (UTC)."""
    url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{SIMBOLO}"
           f"?interval={intervalo}&range={periodo}")
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


def pivos(velas):
    """Índices dos topos e fundos: a máxima (ou mínima) é a maior (ou menor) em PIVO velas de cada lado."""
    topos, fundos = [], []
    for i in range(PIVO, len(velas) - PIVO):
        janela = velas[i - PIVO:i + PIVO + 1]
        if velas[i]["h"] == max(v["h"] for v in janela):
            topos.append(i)
        if velas[i]["l"] == min(v["l"] for v in janela):
            fundos.append(i)
    return topos, fundos


def eventos(velas):
    """Lista de BoS e CHoCH, na ordem em que aconteceram."""
    topos, fundos = pivos(velas)
    ev = []
    tendencia = None
    topo = fundo = None           # último topo e fundo confirmados (preço)
    rompido_topo = rompido_fundo = True
    i_topo = i_fundo = 0
    for j, vela in enumerate(velas):
        # um topo/fundo só conta depois de PIVO velas, para não usar informação do futuro
        while i_topo < len(topos) and topos[i_topo] + PIVO <= j:
            topo = velas[topos[i_topo]]["h"]
            rompido_topo = False
            i_topo += 1
        while i_fundo < len(fundos) and fundos[i_fundo] + PIVO <= j:
            fundo = velas[fundos[i_fundo]]["l"]
            rompido_fundo = False
            i_fundo += 1

        if topo is not None and not rompido_topo and vela["c"] > topo:
            tipo = "CHoCH" if tendencia == "baixa" else "BoS"
            tendencia = "alta"
            rompido_topo = True
            ev.append({"tipo": tipo, "direcao": "alta", "t": vela["t"], "preco": topo})

        if fundo is not None and not rompido_fundo and vela["c"] < fundo:
            tipo = "CHoCH" if tendencia == "alta" else "BoS"
            tendencia = "baixa"
            rompido_fundo = True
            ev.append({"tipo": tipo, "direcao": "baixa", "t": vela["t"], "preco": fundo})
    return ev


def main():
    saida = {
        "atualizado_em": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "simbolo": SIMBOLO,
        "tempos": {},
    }
    try:
        for nome, (intervalo, periodo) in TEMPOS.items():
            velas = baixar(intervalo, periodo)
            evs = eventos(velas)
            saida["tempos"][nome] = {"velas": velas, "eventos": evs}
            print(f"M{nome}: {len(velas)} velas, {len(evs)} eventos (BoS/CHoCH)")
    except Exception as erro:
        print(f"Não consegui baixar os preços do {SIMBOLO}: {erro}", file=sys.stderr)
        return 1
    with open(ARQUIVO, "w", encoding="utf-8") as arquivo:
        json.dump(saida, arquivo, ensure_ascii=False)
    print(f"Gravado: {ARQUIVO}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
