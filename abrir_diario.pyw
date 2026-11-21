# Abre o Diário WDO com os dados AO VIVO.
# Usa o "Painel ao vivo" (C:\mt5-dados\painel_ao_vivo.py): ele liga o MT5, busca o WDO
# a cada 30 s no pregão e grava o dados.json nesta pasta. O app fica em
# http://127.0.0.1:5500 (mesmo endereço de antes, para manter as anotações do diário).
import os, socket, subprocess, sys

PASTA_APP = os.path.dirname(os.path.abspath(__file__))
PASTA_MT5 = r"C:\mt5-dados"
HOST, PORTA = "127.0.0.1", 5500
URL = f"http://{HOST}:{PORTA}/index.html"
CHROMES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
]


def abrir_janela(*_args, **_kw):
    for c in CHROMES:
        if os.path.exists(c):
            subprocess.Popen([c, f"--app={URL}"])
            return True
    import webbrowser
    webbrowser.open(URL)
    return True


def porta_ocupada():
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex((HOST, PORTA)) == 0


if porta_ocupada():
    # O painel já está rodando: só abre a janela.
    abrir_janela()
    sys.exit()

# Sem janela preta: mensagens vão para um arquivo de log.
log = open(os.path.join(PASTA_MT5, "painel_log.txt"), "w", encoding="utf-8", buffering=1)
sys.stdout = sys.stderr = log

os.chdir(PASTA_MT5)
sys.path.insert(0, PASTA_MT5)
import painel_ao_vivo as pav  # noqa: E402

pav.PASTA_APP_LOCAL = PASTA_APP   # serve e atualiza esta pasta
pav.PORTA = PORTA
pav.webbrowser.open = abrir_janela  # abre como janela de app, não como aba
pav.main()
