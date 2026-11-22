// Aba EWZ: gráfico do EWZ com as marcações de BoS e CHoCH.
// Os preços e os eventos vêm do ewz.json, gerado no seu PC pelo gerar_ewz.py.
(() => {
  'use strict';
  const TEMPOS = [['15', 'M15'], ['60', 'M60']];
  const DESLOC = 3 * 3600; // Brasília (UTC-3): o eixo mostra a hora de Brasília
  let tempo = '60';
  let dados = null;
  let grafico = null;

  const view = () => document.getElementById('view-ewz');

  function montar() {
    const root = view();
    if (!root || root.firstChild) return;
    root.innerHTML = `<div class="ewz">
      <div class="ewz-cab">
        <h2>EWZ · iShares MSCI Brazil ETF</h2>
        <p id="ewz-info">Ativo brasileiro negociado na bolsa americana (NYSE Arca) · horário de Brasília</p>
        <div class="ewz-tempos">${TEMPOS.map(([v, n]) => `<button type="button" data-tempo="${v}">${n}</button>`).join('')}</div>
      </div>
      <div id="fx-ewz-grafico" class="ewz-grafico"></div>
    </div>`;
    root.querySelectorAll('[data-tempo]').forEach(b => {
      b.onclick = () => { tempo = b.dataset.tempo; desenhar(); };
    });
  }

  function aviso(caixa, texto) {
    caixa.innerHTML = `<p class="ewz-aviso">${texto}</p>`;
  }

  function desenhar() {
    montar();
    const root = view();
    if (!root) return;
    root.querySelectorAll('[data-tempo]').forEach(b => b.classList.toggle('ativo', b.dataset.tempo === tempo));
    const caixa = document.getElementById('fx-ewz-grafico');
    if (!caixa) return;
    grafico = null;
    if (!window.LightweightCharts) return aviso(caixa, 'A biblioteca do gráfico não carregou. Confira a conexão.');
    if (!dados) return aviso(caixa, 'Não achei o ewz.json. Rode gerar_ewz.py no seu PC.');
    const bloco = dados.tempos && dados.tempos[tempo];
    if (!bloco) return aviso(caixa, 'Sem dados para este tempo.');

    caixa.innerHTML = '';
    grafico = window.LightweightCharts.createChart(caixa, {
      width: caixa.clientWidth,
      height: caixa.clientHeight,
      layout: { background: { color: '#0b0f14' }, textColor: '#8b9bab' },
      grid: { vertLines: { color: '#1b2430' }, horzLines: { color: '#1b2430' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#2b3744' },
      rightPriceScale: { borderColor: '#2b3744' },
    });
    const serie = grafico.addCandlestickSeries({
      upColor: '#3fb97a', downColor: '#ef5b5b', borderVisible: false,
      wickUpColor: '#3fb97a', wickDownColor: '#ef5b5b',
    });
    serie.setData(bloco.velas.map(v => ({
      time: v.t - DESLOC, open: v.o, high: v.h, low: v.l, close: v.c,
    })));
    serie.setMarkers(bloco.eventos.map(e => ({
      time: e.t - DESLOC,
      position: e.direcao === 'alta' ? 'belowBar' : 'aboveBar',
      color: e.direcao === 'alta' ? '#3fb97a' : '#ef5b5b',
      shape: e.direcao === 'alta' ? 'arrowUp' : 'arrowDown',
      text: e.tipo,
    })));
    grafico.timeScale().fitContent();
  }

  function atualizarInfo() {
    const info = document.getElementById('ewz-info');
    if (info && dados) info.textContent = `Dados de ${dados.atualizado_em} · horário de Brasília · BoS e CHoCH calculados no seu PC`;
  }

  function carregar() {
    fetch('ewz.json?v=' + Date.now(), { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('sem arquivo'); return r.json(); })
      .then(j => { dados = j; atualizarInfo(); desenhar(); })
      .catch(() => { dados = null; desenhar(); });
  }

  window.addEventListener('resize', () => {
    const caixa = document.getElementById('fx-ewz-grafico');
    if (grafico && caixa) grafico.applyOptions({ width: caixa.clientWidth, height: caixa.clientHeight });
  });

  window.qpEwz = carregar;
})();
