// Renders the hub from window.SITE_CATALOG (see catalog.js).
(() => {
  const catalog = window.SITE_CATALOG;
  const root = document.getElementById('catalog');
  const nav = document.getElementById('nav');
  document.getElementById('year').textContent = new Date().getFullYear();
  if (!catalog || !root) return;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const BADGES = { new: 'New', live: 'Play', beta: 'Beta', soon: 'Soon' };

  function card(it) {
    const soon = it.status === 'soon' || !it.href;
    const tag = soon ? 'div' : 'a';
    const href = soon ? '' : ` href="${esc(it.href)}"`;
    const accent = it.accent ? ` style="--accent:${esc(it.accent)}"` : '';
    const thumb = it.thumb
      ? `<img src="${esc(it.thumb)}" alt="" loading="lazy" decoding="async" width="320" height="200">`
      : '<span class="thumb-empty">?</span>';
    const tags = (it.tags ?? []).map((t) => `<li>${esc(t)}</li>`).join('');
    const badge = it.status ? `<span class="badge badge-${esc(it.status)}">${esc(BADGES[it.status] ?? it.status)}</span>` : '';
    return `<${tag} class="card${soon ? ' soon' : ''}"${href}${accent}>
      <div class="thumb">${thumb}</div>
      <div class="card-body">
        <div class="card-top"><h3>${esc(it.title)}</h3>${badge}</div>
        <p>${esc(it.blurb)}</p>
        ${tags ? `<ul class="tags">${tags}</ul>` : ''}
      </div>
      ${soon ? '' : '<span class="play">Play &#9656;</span>'}
    </${tag}>`;
  }

  const shelves = [];
  const links = [];
  for (const sec of catalog.sections) {
    const items = catalog.items.filter((it) => it.section === sec.id);
    if (!items.length) continue;
    links.push(`<a href="#${esc(sec.id)}">${esc(sec.title)}</a>`);
    shelves.push(`<section class="shelf" id="${esc(sec.id)}">
      <header class="shelf-head"><h2>${esc(sec.title)}</h2><p>${esc(sec.blurb)}</p></header>
      <div class="cards">${items.map(card).join('')}</div>
    </section>`);
  }
  root.innerHTML = shelves.join('');
  nav.insertAdjacentHTML('afterbegin', links.join(''));
})();
