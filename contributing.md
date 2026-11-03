# Contributing

## Run locally

```bash
npm install
npm run dev       # http://localhost:5173/docs/
npm run build     # static site in .vitepress/dist
```

`npm run dev` and `npm run build` first copy the standards and skills from the [harness](https://github.com/sweg9/harness) repo into `standards/`. That folder is generated and ignored by git.

## Rules

- **English only.** All pages and text are in English. Code comments may be in Korean.
- **Standards are edited in harness.** Pages under Standards are copies. Change them in harness, and the next build picks them up.
- **Stable ids.** FR, NFR, E and R ids are never renumbered. New ones are appended, old ones are marked deprecated.
- **Targets are hypotheses.** Write numeric targets as targets, not as facts.
- **No tilde ranges.** Write `S1 to S3`, not `S1~S3`. Two tildes on a line turn into strikethrough on GitHub.

## Add a page

1. Create a Markdown file in the matching folder, for example `api/live-demo.md`.
2. Add it to the sidebar in `.vitepress/config.mts`.
3. Link to other pages with absolute paths such as `/sim-demo/PRD`.

## Components

| Component | Use |
|---|---|
| `<PdfViewer src="/papers/x.pdf" title="..." />` | A PDF with page navigation, zoom and download. Put the file in `public/` |
| `<ApiSpec src="/api/x.yaml" />` | Renders an OpenAPI file as an API reference. Put the file in `public/api/` |
| `<Badge type="warning" text="draft" />` | A status badge. Types: `info`, `tip`, `warning`, `danger` |

Callouts use `::: tip`, `::: info`, `::: warning` and `::: danger` blocks.

## Deploy

Every push to `main` builds the site and publishes it to GitHub Pages through `.github/workflows/deploy.yml`.
