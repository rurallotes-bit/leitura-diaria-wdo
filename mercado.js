// Aba Mercado: cotações do dia em três cartões (Brasil, mundo, moedas/commodities/cripto).
// Os dados vêm do mercado.json, gerado no seu PC pelo gerar_mercado.py.
(() => {
  'use strict';
  const COR_ALTA = '#3fb97a';
  const COR_BAIXA = '#ef5b5b';
  const COR_NEUTRA = '#8b9bab';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const numero = n => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = n => (n == null ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%');
  const corDe = n => (n == null || n === 0 ? COR_NEUTRA : n > 0 ? COR_ALTA : COR_BAIXA);

  // moeda do preço: R$ para o que é negociado em reais, US$ para commodities e cripto em dólar
  function prefixo(item) {
    if (item.simbolo.endsWith('.SA') || item.simbolo === 'BRL=X' || item.simbolo === 'EURBRL=X') return 'R$ ';
    if (item.codigo.startsWith('US$') || item.sub === 'Cripto') return 'US$ ';
    return '';
  }

  // mini-gráfico do dia: linha e área preenchida, na cor da variação
  function sparkline(serie, cor) {
    if (!serie || serie.length < 2) return '<svg class="mer-spark" viewBox="0 0 110 34" aria-hidden="true"></svg>';
    const W = 110, H = 34;
    const min = Math.min(...serie), max = Math.max(...serie), amp = max - min || 1;
    const pontos = serie.map((v, i) => [(i / (serie.length - 1)) * W, H - ((v - min) / amp) * (H - 4) - 2]);
    const linha = pontos.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    const area = `${linha} L${W} ${H} L0 ${H} Z`;
    return `<svg class="mer-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${area}" fill="${cor}" opacity=".15"/>
      <path d="${linha}" fill="none" stroke="${cor}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }

  function linha(item) {
    const cor = corDe(item.variacao_pct);
    return `<div class="mer-linha">
      <div class="mer-nome"><b>${esc(item.nome)}</b><small>${esc(item.codigo)}</small></div>
      ${sparkline(item.serie, cor)}
      <div class="mer-valor">
        <b>${prefixo(item)}${item.preco == null ? '—' : numero(item.preco)}</b>
        <span style="color:${cor}">${pct(item.variacao_pct)}</span>
      </div>
    </div>`;
  }

  function cartao(grupo) {
    return `<section class="mer-cartao">
      <h3>${esc(grupo.nome.toUpperCase())}</h3>
      ${grupo.itens.map(linha).join('')}
    </section>`;
  }

  function desenhar(dados) {
    const raiz = document.getElementById('view-mercado');
    if (!raiz) return;
    if (!dados) {
      raiz.innerHTML = '<div class="mer"><p class="mer-aviso">Não achei o mercado.json. Rode py gerar_mercado.py na pasta do projeto.</p></div>';
      return;
    }
    raiz.innerHTML = `<div class="mer">
      <div class="mer-cab">
        <h2>Mercado</h2>
        <p>Dados de ${esc(dados.atualizado_em)} · Yahoo Finance · cotações podem ter atraso</p>
      </div>
      <div class="mer-grade">${(dados.grupos || []).map(cartao).join('')}</div>
    </div>`;
  }

  function carregar() {
    fetch('mercado.json?v=' + Date.now(), { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(desenhar)
      .catch(() => desenhar(null));
  }

  window.qpMercado = carregar;
})();
