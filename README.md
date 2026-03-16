# Cross Asset Site

Minimal public + admin skeleton for the cross-asset dashboard.

## Features

- Public homepage with group cards
- Public group pages with crawlable HTML
- Public asset detail pages with chart embeds
- Simple admin page for editing JSON-backed content
- Token-protected save API

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
