import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, 'data', 'site.json');
const publicDir = path.join(__dirname, 'public');
const port = Number(process.env.PORT || 3000);
const adminToken = process.env.ADMIN_TOKEN || '';
const baseUrl = (process.env.BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');

function slugify(input) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function loadSite() {
  return JSON.parse(await readFile(dataPath, 'utf8'));
}

function send(res, status, body, type = 'text/html; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function layout({ title, description, body }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <style>
    :root { --bg:#08101d; --panel:#111a31; --panel2:#18254a; --text:#eef3ff; --muted:#94a4cf; --border:#2b3c71; --link:#d3b071; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: system-ui, sans-serif; background: radial-gradient(circle at top, #102042, #08101d 55%); color: var(--text); }
    header { padding: 22px 18px 16px; border-bottom: 1px solid var(--border); background: rgba(8,16,29,.88); position: sticky; top: 0; backdrop-filter: blur(10px); }
    main { max-width: 1260px; margin: 0 auto; padding: 20px 18px 40px; }
    h1, h2 { margin: 0 0 8px; }
    p { margin: 0; color: var(--muted); }
    a { color: var(--text); text-decoration: none; }
    .nav { margin-top: 14px; display:flex; flex-wrap:wrap; gap:10px; }
    .pill { padding: 8px 10px; border-radius: 999px; border: 1px solid var(--border); background: rgba(255,255,255,.03); }
    .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
    .card { display:block; padding: 16px; border: 1px solid var(--border); border-radius: 16px; background: linear-gradient(180deg, var(--panel), var(--panel2)); }
    .meta { margin-top: 8px; font-size: 13px; color: var(--muted); }
    .stack { display:grid; gap: 16px; }
    .chart-card { border: 1px solid var(--border); border-radius: 16px; overflow:hidden; background: linear-gradient(180deg, var(--panel), var(--panel2)); }
    .chart-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; padding:12px 14px; border-bottom:1px solid var(--border); }
    .badge { font-size:12px; color:#bed2ff; padding:4px 8px; border:1px solid rgba(115,168,255,.35); border-radius:999px; }
    .tags { display:flex; flex-wrap:wrap; gap:8px; padding: 10px 14px 0; }
    .tag { font-size:12px; color:#cbd7f5; padding:3px 8px; border-radius:999px; background: rgba(255,255,255,.05); border:1px solid var(--border); }
    .desc { padding: 0 14px 12px; color: var(--muted); font-size: 14px; }
    .chart { height: 380px; padding: 10px 14px 14px; }
    .chart.fred { height: 530px; }
    iframe { width:100%; height:100%; border:0; border-radius:12px; background:#fff; }
    .link { color: var(--link); font-size: 13px; }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}

function buildSitemap(site) {
  const urls = [`${baseUrl}/`];
  for (const group of site.groups) {
    urls.push(`${baseUrl}/group/${encodeURIComponent(group.slug)}`);
    for (const asset of group.assets) urls.push(`${baseUrl}/asset/${encodeURIComponent(asset.slug)}`);
  }
  const items = urls.map(url => `<url><loc>${escapeHtml(url)}</loc></url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}

function renderTradingView(symbol) {
  return `<div class="chart">
    <div class="tradingview-widget-container" style="height:100%;width:100%">
      <script src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
        ${JSON.stringify({
          autosize: true,
          symbol,
          interval: 'D',
          timezone: 'America/Los_Angeles',
          theme: 'dark',
          style: '1',
          locale: 'zh_CN',
          enable_publishing: false,
          allow_symbol_change: false,
          withdateranges: true,
          hide_side_toolbar: false,
          save_image: false,
          calendar: false,
          studies: ['Volume@tv-basicstudies']
        })}
      </script>
    </div>
  </div>`;
}

function renderFred(embedUrl) {
  return `<div class="chart fred"><iframe src="${escapeHtml(embedUrl)}" scrolling="no" loading="lazy" allowTransparency="true"></iframe></div>`;
}

function renderAssetCard(asset) {
  const tags = (asset.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  const chart = asset.sourceType === 'fred' ? renderFred(asset.embedUrl) : renderTradingView(asset.symbol);
  return `<article class="chart-card">
    <div class="chart-head">
      <div>
        <h2>${escapeHtml(asset.name)}</h2>
        <p>${escapeHtml(asset.symbol)}</p>
      </div>
      <div style="text-align:right">
        <div class="badge">${asset.sourceType === 'fred' ? 'FRED' : 'TradingView'}</div>
        <div style="margin-top:8px"><a class="link" href="${escapeHtml(asset.externalUrl)}" target="_blank" rel="noopener noreferrer">打开原页 ↗</a></div>
      </div>
    </div>
    ${tags ? `<div class="tags">${tags}</div>` : ''}
    ${asset.description ? `<div class="desc">${escapeHtml(asset.description)}</div>` : ''}
    ${chart}
  </article>`;
}

function renderAssetIndexCard(group, asset) {
  return `<a class="card" href="/asset/${encodeURIComponent(asset.slug)}">
    <h2>${escapeHtml(asset.name)}</h2>
    <p class="meta">${escapeHtml(group.name)} · ${escapeHtml(asset.symbol)}</p>
    <p class="meta">${escapeHtml(asset.description || '')}</p>
  </a>`;
}

function renderHome(site) {
  const cards = site.groups.map(group => `
    <a class="card" href="/group/${encodeURIComponent(group.slug)}">
      <h2>${escapeHtml(group.name)}</h2>
      <p class="meta">${escapeHtml(group.description || '')}</p>
      <p class="meta">${group.assets.length} 张图</p>
    </a>
  `).join('');
  return layout({
    title: `${site.site.title} | Public`,
    description: site.site.description,
    body: `
      <header>
        <h1>${escapeHtml(site.site.title)}</h1>
        <p>${escapeHtml(site.site.description)}</p>
        <div class="nav"><a class="pill" href="/admin">Admin</a></div>
      </header>
      <main class="stack">
        <section class="stack">
          <h2>Asset Classes</h2>
          <div class="grid">${cards}</div>
        </section>
      </main>
    `
  });
}

function renderGroup(site, group) {
  const nav = site.groups.map(item => `<a class="pill" href="/group/${encodeURIComponent(item.slug)}">${escapeHtml(item.name)}</a>`).join('');
  const indexCards = group.assets.map(asset => renderAssetIndexCard(group, asset)).join('');
  const cards = group.assets.map(renderAssetCard).join('');
  return layout({
    title: `${group.name} | ${site.site.title}`,
    description: group.description || site.site.description,
    body: `
      <header>
        <h1>${escapeHtml(group.name)}</h1>
        <p>${escapeHtml(group.description || '')}</p>
        <div class="nav">
          <a class="pill" href="/">← All Classes</a>
          ${nav}
        </div>
      </header>
      <main class="stack">
        <section class="stack">
          <h2>Assets</h2>
          <div class="grid">${indexCards}</div>
        </section>
        ${cards}
      </main>
    `
  });
}

function renderAsset(site, group, asset) {
  return layout({
    title: `${asset.name} | ${group.name} | ${site.site.title}`,
    description: asset.description || site.site.description,
    body: `
      <header>
        <h1>${escapeHtml(asset.name)}</h1>
        <p>${escapeHtml(group.name)} · ${escapeHtml(asset.symbol)}</p>
        <div class="nav">
          <a class="pill" href="/">All Classes</a>
          <a class="pill" href="/group/${encodeURIComponent(group.slug)}">← ${escapeHtml(group.name)}</a>
          <a class="pill" href="${escapeHtml(asset.externalUrl)}" target="_blank" rel="noopener noreferrer">原页 ↗</a>
        </div>
      </header>
      <main class="stack">${renderAssetCard(asset)}</main>
    `
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/api/site' && req.method === 'GET') {
    return send(res, 200, JSON.stringify(await loadSite(), null, 2), 'application/json; charset=utf-8');
  }

  if (pathname === '/healthz') {
    return send(res, 200, JSON.stringify({ ok: true }), 'application/json; charset=utf-8');
  }

  if (pathname === '/api/site' && req.method === 'PUT') {
    if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
      return send(res, 401, 'Unauthorized', 'text/plain; charset=utf-8');
    }
    try {
      const body = JSON.parse(await readBody(req));
      body.site.updatedAt = new Date().toISOString();
      await writeFile(dataPath, JSON.stringify(body, null, 2));
      return send(res, 200, JSON.stringify({ ok: true }), 'application/json; charset=utf-8');
    } catch (error) {
      return send(res, 400, error.message, 'text/plain; charset=utf-8');
    }
  }

  if (pathname === '/admin') {
    const html = await readFile(path.join(publicDir, 'admin.html'), 'utf8');
    return send(res, 200, html);
  }

  if (pathname.startsWith('/public/')) {
    const target = path.join(publicDir, pathname.replace('/public/', ''));
    if (existsSync(target)) {
      return send(res, 200, await readFile(target, 'utf8'));
    }
  }

  const site = await loadSite();

  if (pathname === '/robots.txt') {
    return send(
      res,
      200,
      `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`,
      'text/plain; charset=utf-8'
    );
  }

  if (pathname === '/sitemap.xml') {
    return send(res, 200, buildSitemap(site), 'application/xml; charset=utf-8');
  }

  if (pathname === '/') {
    return send(res, 200, renderHome(site));
  }

  if (pathname.startsWith('/group/')) {
    const slug = pathname.split('/').pop();
    const group = site.groups.find(item => item.slug === slug);
    if (!group) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    return send(res, 200, renderGroup(site, group));
  }

  if (pathname.startsWith('/asset/')) {
    const slug = pathname.split('/').pop();
    for (const group of site.groups) {
      const asset = group.assets.find(item => item.slug === slug);
      if (asset) return send(res, 200, renderAsset(site, group, asset));
    }
    return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  }

  return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
});

server.listen(port, () => {
  console.log(`Cross Asset Site running at http://localhost:${port}`);
});
