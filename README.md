# Cross Asset Site

Minimal public + admin skeleton for the cross-asset dashboard.

## Features

- Public homepage with group cards
- Public group pages with crawlable HTML
- Public asset detail pages with chart embeds
- Simple admin page for editing JSON-backed content
- Token-protected save API

## GitHub Pages

This project now also supports a pure static export for GitHub Pages.

```bash
cd /Users/employee/.openclaw/workspace/cross-asset-site
npm run build
```

Generated output:

- `docs/index.html`
- `docs/group/:slug/index.html`
- `docs/asset/:slug/index.html`
- `docs/admin/index.html`
- `docs/site.json`

How to publish on GitHub Pages:

1. Push this project to GitHub.
2. In repository settings, open `Pages`.
3. Set the source to `GitHub Actions`.
4. Commit or edit `data/site.json` on `main`.
5. The workflow in `.github/workflows/pages.yml` will build and publish automatically.

Notes for the static Pages version:

- Public pages remain crawlable and searchable.
- `/admin` becomes a management guide page instead of a live save form.
- Content updates happen by editing `data/site.json`; GitHub Actions rebuilds and republishes the static site.

## Run

```bash
cd /Users/employee/.openclaw/workspace/cross-asset-site
ADMIN_TOKEN=change-me node server.mjs
```

Then open:

- `http://localhost:3000/`
- `http://localhost:3000/admin`

## Production Deploy

This project is ready for formal deployment.

Included:

- `Dockerfile`
- `render.yaml`
- `/.env.example`
- `robots.txt`
- `sitemap.xml`
- `/healthz`

### Render

1. Push this folder to a Git repository.
2. Create a new Render Web Service from that repo.
3. Render will detect `render.yaml`.
4. Set `BASE_URL` to your final public domain.
5. Keep `ADMIN_TOKEN` secret.

### Generic Docker Host

```bash
docker build -t cross-asset-site .
docker run -p 3000:3000 \
  -e BASE_URL=https://your-domain.example.com \
  -e ADMIN_TOKEN=change-me \
  cross-asset-site
```

### Public URLs

- `/`
- `/group/:slug`
- `/asset/:slug`
- `/admin`
- `/robots.txt`
- `/sitemap.xml`
- `/healthz`
