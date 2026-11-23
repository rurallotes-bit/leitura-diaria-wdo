// Dash do WIN: preço, níveis do dia e gráfico (M15 e M60), com os dados do win.json (gerado por gerar_win.py).
(() => {
  'use strict';
  const TEMPOS = [['15', 'M15'], ['60', 'M60']];
  const DESLOC = 3 * 3600; // Brasília (UTC-3): o eixo mostra a hora de Brasília
  let tempo = '60';
  let dados = null;
  let grafico = null;

  const painel = () => document.getElementById('painel-win');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => (n == null ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 }));
  const pct = n => (n == null ? '—' : (n > 0 ? '+' : '') + n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%');
  const cls = n => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');
  const cartao = (rotulo, valor, classe = '') =>
    `<div class="win-card"><span>${rotulo}</span><b class="${classe}">${valor}</b></div>`;

  function desenhar() {
    const p = painel();
    if (!p) return;
    if (!dados) {
      p.innerHTML = '<p class="win-aviso">Não achei o win.json. Com o MetaTrader 5 aberto, rode py -3.13 gerar_win.py na pasta do projeto.</p>';
      return;
    }
    const ontem = dados.ontem || {};
    const variacao = ontem.fechamento ? (dados.preco / ontem.fechamento - 1) * 100 : null;
    p.innerHTML = `
      <div class="win-cab">
        <h3>WIN · ${esc(dados.simbolo)} <small>dados de ${esc(dados.atualizado_em)} · horário de Brasília</small></h3>
      </div>
      <div class="win-cards">
        ${cartao('Preço', fmt(dados.preco), cls(variacao))}
        ${cartao('Variação vs ontem', pct(variacao), cls(variacao))}
        ${cartao('Abertura de hoje', fmt(dados.abertura))}
        ${cartao('Máxima de hoje', fmt(dados.maxima))}
        ${cartao('Mínima de hoje', fmt(dados.minima))}
        ${cartao('Fechamento de ontem', fmt(ontem.fechamento))}
      </div>
      <div class="win-tempos">${TEMPOS.map(([v, n]) => `<button type="button" data-tempo="${v}">${n}</button>`).join('')}</div>
      <div id="win-grafico" class="win-grafico"></div>`;
    p.querySelectorAll('[data-tempo]').forEach(b => {
      b.onclick = () => { tempo = b.dataset.tempo; desenharGrafico(); };
    });
    desenharGrafico();
  }

  function desenharGrafico() {
    const p = painel();
    const caixa = document.getElementById('win-grafico');
    if (!p || !caixa) return;
    p.querySelectorAll('[data-tempo]').forEach(b => b.classList.toggle('ativo', b.dataset.tempo === tempo));
    if (grafico) { grafico.remove(); grafico = null; }
    const velas = dados && dados.tempos && dados.tempos[tempo];
    if (!window.LightweightCharts || !velas) {
      caixa.innerHTML = '<p class="win-aviso">Sem gráfico para este tempo.</p>';
      return;
    }
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
    serie.setData(velas.map(v => ({ time: v.t - DESLOC, open: v.o, high: v.h, low: v.l, close: v.c })));
    // BoS e CHoCH (calculados pelo gerar_win.py, mesma regra da aba EWZ)
    const evs = (dados.eventos && dados.eventos[tempo]) || [];
    serie.setMarkers(evs.map(e => ({
      time: e.t - DESLOC,
      position: e.direcao === 'alta' ? 'belowBar' : 'aboveBar',
      color: e.direcao === 'alta' ? '#3fb97a' : '#ef5b5b',
      shape: e.direcao === 'alta' ? 'arrowUp' : 'arrowDown',
      text: e.tipo,
    })));
    grafico.timeScale().fitContent();
  }

  function carregar() {
    fetch('win.json?v=' + Date.now(), { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { dados = j; desenhar(); })
      .catch(() => { dados = null; desenhar(); });
  }

  window.addEventListener('resize', () => {
    const c = document.getElementById('win-grafico');
    if (grafico && c) grafico.applyOptions({ width: c.clientWidth, height: c.clientHeight });
  });

  window.qpWin = carregar;
})();
