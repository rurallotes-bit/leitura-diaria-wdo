// Aba EUA: Nasdaq e S&P 500 com gráficos M15 e M60 e as marcações de BoS e CHoCH.
// Os preços e os eventos vêm do eua.json, gerado no seu PC pelo gerar_eua.py.
(() => {
  'use strict';
  const TEMPOS = [['15', 'M15'], ['60', 'M60']];
  const ORDEM = ['nasdaq', 'sp500'];
  const DESLOC = 3 * 3600; // Brasília (UTC-3): o eixo mostra a hora de Brasília
  let dados = null;
  const tempo = { nasdaq: '60', sp500: '60' };
  const graficos = {};

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const raiz = () => document.getElementById('view-eua');

  function bloco(chave) {
    const a = dados.ativos[chave];
    const botoes = TEMPOS.map(([v, n]) =>
      `<button type="button" data-eua="${chave}" data-tempo="${v}" class="${tempo[chave] === v ? 'ativo' : ''}">${n}</button>`).join('');
    return `<section class="eua-bloco">
      <h3>${esc(a.nome)} <small>${esc(a.simbolo)}</small></h3>
      <div class="eua-tempos">${botoes}</div>
      <div id="eua-g-${chave}" class="eua-grafico"></div>
    </section>`;
  }

  function desenhar() {
    const r = raiz();
    if (!r) return;
    if (!dados || !dados.ativos) {
      r.innerHTML = '<div class="eua"><p class="eua-aviso">Não achei o eua.json. Rode py gerar_eua.py na pasta do projeto.</p></div>';
      return;
    }
    const chaves = ORDEM.filter(k => dados.ativos[k]);
    r.innerHTML = `<div class="eua">
      <div class="eua-cab">
        <h2>Nasdaq e S&amp;P 500</h2>
        <p>Dados de ${esc(dados.atualizado_em)} · horário de Brasília · BoS e CHoCH calculados no seu PC</p>
      </div>
      ${chaves.map(bloco).join('')}
    </div>`;
    r.querySelectorAll('[data-eua][data-tempo]').forEach(b => {
      b.onclick = () => { tempo[b.dataset.eua] = b.dataset.tempo; desenhar(); };
    });
    chaves.forEach(k => desenharGrafico(k, 0));
  }

  // Os gráficos esperam a biblioteca carregar (ela entra de forma assíncrona); tenta de novo por até ~6 s.
  function desenharGrafico(chave, tentativa) {
    const caixa = document.getElementById('eua-g-' + chave);
    if (!caixa) return;
    const velas = dados && dados.ativos[chave] && dados.ativos[chave].tempos[tempo[chave]];
    if (!velas) { caixa.innerHTML = '<p class="eua-aviso">Sem dados para este tempo.</p>'; return; }
    if (!window.LightweightCharts) {
      if (tentativa < 20) setTimeout(() => desenharGrafico(chave, tentativa + 1), 300);
      else caixa.innerHTML = '<p class="eua-aviso">Não carregou a biblioteca do gráfico. Confira a conexão.</p>';
      return;
    }
    if (graficos[chave]) { graficos[chave].remove(); graficos[chave] = null; }
    caixa.innerHTML = '';
    const g = window.LightweightCharts.createChart(caixa, {
      width: caixa.clientWidth,
      height: caixa.clientHeight,
      layout: { background: { color: '#0b0f14' }, textColor: '#8b9bab' },
      grid: { vertLines: { color: '#1b2430' }, horzLines: { color: '#1b2430' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#2b3744' },
      rightPriceScale: { borderColor: '#2b3744' },
    });
    graficos[chave] = g;
    const serie = g.addCandlestickSeries({
      upColor: '#3fb97a', downColor: '#ef5b5b', borderVisible: false,
      wickUpColor: '#3fb97a', wickDownColor: '#ef5b5b',
    });
    serie.setData(velas.velas.map(v => ({ time: v.t - DESLOC, open: v.o, high: v.h, low: v.l, close: v.c })));
    serie.setMarkers(velas.eventos.map(e => ({
      time: e.t - DESLOC,
      position: e.direcao === 'alta' ? 'belowBar' : 'aboveBar',
      color: e.direcao === 'alta' ? '#3fb97a' : '#ef5b5b',
      shape: e.direcao === 'alta' ? 'arrowUp' : 'arrowDown',
      text: e.tipo,
    })));
    g.timeScale().fitContent();
  }

  function carregar() {
    fetch('eua.json?v=' + Date.now(), { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { dados = j; desenhar(); })
      .catch(() => { dados = null; desenhar(); });
  }

  window.addEventListener('resize', () => {
    ORDEM.forEach(k => {
      const c = document.getElementById('eua-g-' + k);
      if (graficos[k] && c) graficos[k].applyOptions({ width: c.clientWidth, height: c.clientHeight });
    });
  });

  window.qpEua = carregar;
})();
