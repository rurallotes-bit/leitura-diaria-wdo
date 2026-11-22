"""Gera win.json: velas M15 e M60 do WIN vigente e os níveis de hoje e de ontem, lidos do MetaTrader 5 aberto.

Só leitura: não envia ordens e não altera o terminal.

Execute com o Python 3.13 (o pacote MetaTrader5 não tem versão para o 3.14):
    py -3.13 gerar_win.py
"""
import json
import os
import sys
import time
from datetime import datetime

import MetaTrader5 as mt5

SIMBOLO = "WINZ26"  # contrato vigente; troque quando o vencimento virar
ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "win.json")
TEMPOS = {"15": (mt5.TIMEFRAME_M15, 2000), "60": (mt5.TIMEFRAME_H1, 1000)}


def velas(rates, deslocamento):
    """Converte as barras do MT5 em velas (t, o, h, l, c). t sai em UTC: tira o fuso do servidor do MT5."""
    return [
        {"t": int(r["time"]) - deslocamento, "o": float(r["open"]), "h": float(r["high"]),
         "l": float(r["low"]), "c": float(r["close"])}
        for r in rates
    ]


def main():
    if not mt5.initialize():
        print("Não consegui conectar ao MetaTrader 5. Ele precisa estar aberto.", file=sys.stderr)
        return 1
    try:
        if not mt5.symbol_select(SIMBOLO, True):
            print(f"O símbolo {SIMBOLO} não foi encontrado no MT5.", file=sys.stderr)
            return 1
        tick = mt5.symbol_info_tick(SIMBOLO)
        # fuso do servidor do MT5 em relação ao UTC, em horas inteiras
        deslocamento = round((tick.time - time.time()) / 3600) * 3600

        saida = {
            "atualizado_em": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            "simbolo": SIMBOLO,
            "preco": float(tick.last),
            "tempos": {},
        }
        for nome, (tf, quantidade) in TEMPOS.items():
            barras = mt5.copy_rates_from_pos(SIMBOLO, tf, 0, quantidade)
            if barras is None:
                raise RuntimeError(f"sem dados M{nome}: {mt5.last_error()}")
            saida["tempos"][nome] = velas(barras, deslocamento)
            print(f"M{nome}: {len(saida['tempos'][nome])} velas")

        diario = velas(mt5.copy_rates_from_pos(SIMBOLO, mt5.TIMEFRAME_D1, 0, 3), deslocamento)
        hoje, ontem = diario[-1], diario[-2]  # a última barra diária é a do pregão de hoje
        saida["abertura"] = hoje["o"]
        saida["maxima"] = hoje["h"]
        saida["minima"] = hoje["l"]
        saida["ontem"] = {"fechamento": ontem["c"], "maxima": ontem["h"], "minima": ontem["l"]}
    except Exception as erro:
        print(f"Falha ao ler o MT5: {erro}", file=sys.stderr)
        return 1
    finally:
        mt5.shutdown()

    with open(ARQUIVO, "w", encoding="utf-8") as arquivo:
        json.dump(saida, arquivo, ensure_ascii=False)
    print(f"Gravado: {ARQUIVO}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
