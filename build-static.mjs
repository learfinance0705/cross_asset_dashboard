import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = __dirname;
const dataPath = path.join(rootDir, 'data', 'site.json');
const outputDir = path.join(rootDir, 'docs');
const repoUrl = 'https://github.com/learfinance0705/cross_asset_dashboard';
const repoOwner = 'learfinance0705';
const repoName = 'cross_asset_dashboard';
const repoEditUrl = `${repoUrl}/edit/main/data/site.json`;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function relativeHref(depth, target) {
  const prefix = depth === 0 ? './' : '../'.repeat(depth);
  return `${prefix}${target}`.replace('/index.html', '/');
}

function layout({ title, description, body, depth = 0 }) {
  const homeHref = relativeHref(depth, 'index.html');
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
    h1, h2, h3 { margin: 0 0 8px; }
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
    .note-card { padding: 18px; border: 1px solid var(--border); border-radius: 16px; background: linear-gradient(180deg, var(--panel), var(--panel2)); }
    .actions { display:flex; flex-wrap:wrap; gap:10px; margin-top: 14px; }
    .link { color: var(--link); font-size: 13px; }
    pre { margin: 0; padding: 14px; overflow:auto; border-radius: 12px; background:#0b1327; color:#dce6ff; border:1px solid var(--border); }
    iframe { width:100%; height:100%; border:0; border-radius:12px; background:#fff; }
    .tradingview-widget-container, .tradingview-widget-container__widget { height:100%; width:100%; }
  </style>
  <script async src="https://fred.stlouisfed.org/assets/research/fred-graph-react/embed.min.js"></script>
</head>
<body>
  ${body}
</body>
</html>`;
}

function renderTradingView(symbol) {
  return `<div class="chart">
    <div class="tradingview-widget-container">
      <div class="tradingview-widget-container__widget"></div>
      <script src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
      {
        "autosize": true,
        "symbol": ${JSON.stringify(symbol)},
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "zh_CN",
        "allow_symbol_change": false,
        "hide_top_toolbar": false,
        "save_image": false,
        "calendar": false,
        "support_host": "https://www.tradingview.com"
      }
      </script>
    </div>
  </div>`;
}

function renderFred(asset) {
  return `<div class="chart fred">
    <iframe loading="lazy" src="${escapeHtml(asset.embedUrl)}" title="${escapeHtml(asset.name)}"></iframe>
  </div>`;
}

function renderAssetCard(asset) {
  const tags = (asset.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  const badge = asset.sourceType === 'fred' ? 'FRED' : 'TradingView';
  const chart = asset.sourceType === 'fred' ? renderFred(asset) : renderTradingView(asset.symbol);
  return `<article class="chart-card">
    <div class="chart-head">
      <div>
        <h3>${escapeHtml(asset.name)}</h3>
        <p>${escapeHtml(asset.symbol)}</p>
      </div>
      <a class="badge" href="${escapeHtml(asset.externalUrl)}" target="_blank" rel="noopener noreferrer">${badge} ↗</a>
    </div>
    ${tags ? `<div class="tags">${tags}</div>` : ''}
    <p class="desc">${escapeHtml(asset.description || '')}</p>
    ${chart}
  </article>`;
}

function renderAssetIndexCard(group, asset, depth) {
  return `<a class="card" href="${relativeHref(depth, `asset/${asset.slug}/index.html`)}">
    <h2>${escapeHtml(asset.name)}</h2>
    <p class="meta">${escapeHtml(group.name)} · ${escapeHtml(asset.symbol)}</p>
    <p class="meta">${escapeHtml(asset.description || '')}</p>
  </a>`;
}

function renderHome(site) {
  const cards = site.groups.map(group => `
    <a class="card" href="${relativeHref(0, `group/${group.slug}/index.html`)}">
      <h2>${escapeHtml(group.name)}</h2>
      <p class="meta">${escapeHtml(group.description || '')}</p>
      <p class="meta">${group.assets.length} 张图</p>
    </a>
  `).join('');
  return layout({
    title: `${site.site.title} | Public`,
    description: site.site.description,
    depth: 0,
    body: `
      <header>
        <h1>${escapeHtml(site.site.title)}</h1>
        <p>${escapeHtml(site.site.description)}</p>
        <div class="nav"><a class="pill" href="${relativeHref(0, 'admin/index.html')}">管理入口</a></div>
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
  const nav = site.groups.map(item => `<a class="pill" href="${relativeHref(2, `group/${item.slug}/index.html`)}">${escapeHtml(item.name)}</a>`).join('');
  const indexCards = group.assets.map(asset => renderAssetIndexCard(group, asset, 2)).join('');
  const cards = group.assets.map(renderAssetCard).join('');
  return layout({
    title: `${group.name} | ${site.site.title}`,
    description: group.description || site.site.description,
    depth: 2,
    body: `
      <header>
        <h1>${escapeHtml(group.name)}</h1>
        <p>${escapeHtml(group.description || '')}</p>
        <div class="nav">
          <a class="pill" href="${relativeHref(2, 'index.html')}">← All Classes</a>
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
    depth: 2,
    body: `
      <header>
        <h1>${escapeHtml(asset.name)}</h1>
        <p>${escapeHtml(group.name)} · ${escapeHtml(asset.symbol)}</p>
        <div class="nav">
          <a class="pill" href="${relativeHref(2, 'index.html')}">All Classes</a>
          <a class="pill" href="${relativeHref(2, `group/${group.slug}/index.html`)}">← ${escapeHtml(group.name)}</a>
          <a class="pill" href="${escapeHtml(asset.externalUrl)}" target="_blank" rel="noopener noreferrer">原页 ↗</a>
        </div>
      </header>
      <main class="stack">${renderAssetCard(asset)}</main>
    `
  });
}

function buildSitemap(site, baseUrl) {
  const urls = [`${baseUrl}/`];
  for (const group of site.groups) {
    urls.push(`${baseUrl}/group/${encodeURIComponent(group.slug)}/`);
    for (const asset of group.assets) {
      urls.push(`${baseUrl}/asset/${encodeURIComponent(asset.slug)}/`);
    }
  }
  urls.push(`${baseUrl}/admin/`);
  const items = urls.map(url => `<url><loc>${escapeHtml(url)}</loc></url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}

function renderAdmin(site) {
  return layout({
    title: `${site.site.title} | GitHub Pages Admin`,
    description: 'GitHub Pages 静态管理入口',
    depth: 1,
    body: `
      <header>
        <h1>GitHub Pages 管理入口</h1>
        <p>这个版本是纯静态站点，没有在线保存接口。更新内容时，请直接编辑仓库里的 JSON 数据文件，再重新发布 Pages。</p>
        <div class="nav">
          <a class="pill" href="${relativeHref(1, 'index.html')}">← Public Home</a>
          <a class="pill" href="${repoUrl}" target="_blank" rel="noopener noreferrer">GitHub Repo ↗</a>
          <a class="pill" href="${repoEditUrl}" target="_blank" rel="noopener noreferrer">编辑 site.json ↗</a>
        </div>
      </header>
      <main class="stack">
        <section class="note-card stack">
          <h2>如何更新内容</h2>
          <p>1. 在 GitHub 打开 <code>data/site.json</code>。</p>
          <p>2. 修改资产分组、symbol、说明或排序。</p>
          <p>3. 提交到 <code>main</code> 分支后，GitHub Actions 会自动重新生成静态页并发布 Pages。</p>
        </section>
        <section class="stack">
          <h2>当前数据快照</h2>
          <pre>${escapeHtml(JSON.stringify(site, null, 2))}</pre>
        </section>
      </main>
    `
  });
}

async function ensureDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function writePage(filePath, html) {
  await ensureDir(filePath);
  await writeFile(filePath, html);
}

async function main() {
  const site = JSON.parse(await readFile(dataPath, 'utf8'));
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  await writePage(path.join(outputDir, 'index.html'), renderHome(site));
  await writePage(path.join(outputDir, 'admin', 'index.html'), renderAdmin(site));
  await writeFile(path.join(outputDir, 'site.json'), JSON.stringify(site, null, 2));
  await writeFile(path.join(outputDir, '.nojekyll'), '');

  for (const group of site.groups) {
    await writePage(path.join(outputDir, 'group', group.slug, 'index.html'), renderGroup(site, group));
    for (const asset of group.assets) {
      await writePage(path.join(outputDir, 'asset', asset.slug, 'index.html'), renderAsset(site, group, asset));
    }
  }

  const pagesBaseUrl = `https://${repoOwner}.github.io/${repoName}`;
  await writeFile(
    path.join(outputDir, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${pagesBaseUrl}/sitemap.xml\n`
  );
  await writeFile(path.join(outputDir, 'sitemap.xml'), buildSitemap(site, pagesBaseUrl));
  await writeFile(path.join(outputDir, '404.html'), await readFile(path.join(outputDir, 'index.html')));

  console.log(`Static site generated in ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
