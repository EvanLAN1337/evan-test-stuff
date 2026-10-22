// Renders the hub from window.SITE_CATALOG (see catalog.js).
(() => {
  const catalog = window.SITE_CATALOG;
  const root = document.getElementById('catalog');
  const nav = document.getElementById('nav');
  const header = document.querySelector('.site-header');
  document.getElementById('year').textContent = new Date().getFullYear();

  // Hairline under the sticky header once the page scrolls.
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 4);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (!catalog || !root) return;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const BADGES = { new: 'New', live: 'Live', beta: 'Beta', soon: 'Coming soon' };
  const ARROW = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const initials = (t) => String(t).split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  function card(it, sec) {
    const soon = it.status === 'soon' || !it.href;
    const tag = soon ? 'div' : 'a';
    const href = soon ? '' : ` href="${esc(it.href)}"`;
    const accent = it.accent ? ` style="--accent-card:${esc(it.accent)}"` : '';
    const thumb = it.thumb
      ? `<img src="${esc(it.thumb)}" alt="" loading="lazy" decoding="async" width="320" height="180">`
      : `<span class="mono">${soon ? '&middot;&middot;&middot;' : esc(initials(it.title))}</span>`;
    const tags = (it.tags ?? []).map((t) => `<li>${esc(t)}</li>`).join('');
    const badge = it.status ? `<span class="badge badge-${esc(it.status)}">${esc(BADGES[it.status] ?? it.status)}</span>` : '';
    const go = soon ? '' : `<span class="go">${esc(sec.cta ?? 'Open')} ${ARROW}</span>`;
    return `<${tag} class="card${soon ? ' soon' : ''}"${href}${accent}>
      <div class="thumb">${thumb}</div>
      <div class="card-body">
        <div class="card-top"><h3>${esc(it.title)}</h3>${badge}</div>
        <p>${esc(it.blurb)}</p>
        ${tags || go ? `<div class="card-foot"><ul class="tags">${tags}</ul>${go}</div>` : ''}
      </div>
    </${tag}>`;
  }

  const shelves = [];
  const links = [];
  for (const sec of catalog.sections) {
    const items = catalog.items.filter((it) => it.section === sec.id);
    if (!items.length) continue;
    const ready = items.filter((it) => it.status !== 'soon' && it.href).length;
    links.push(`<a href="#${esc(sec.id)}">${esc(sec.title)}</a>`);
    shelves.push(`<section class="shelf" id="${esc(sec.id)}">
      <header class="shelf-head">
        <div><h2>${esc(sec.title)}</h2><p>${esc(sec.blurb)}</p></div>
        <span class="count">${ready ? `${ready} available` : 'In progress'}</span>
      </header>
      <div class="cards">${items.map((it) => card(it, sec)).join('')}</div>
    </section>`);
  }
  root.innerHTML = shelves.join('');
  nav.insertAdjacentHTML('afterbegin', links.join(''));
})();
