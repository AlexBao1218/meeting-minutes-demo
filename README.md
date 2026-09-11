# Meeting Minutes Workbench Demo

A portfolio demo of an internal tool that turns a safety committee's meeting transcript into a formatted Word document, originally built for a departmental safety committee on **Feishu Spark (妙搭)**, Feishu's low-code full-stack platform. In production an Aily agent listened to the Cantonese recording and produced a fixed seven-section JSON; the workbench validated that JSON with line/column error recovery, previewed the section structure, and generated the `.docx` by cloning formatted rows from the department's template — no styles redefined, so the output was indistinguishable from a hand-typed one.

This public version is a standalone static SPA: **no company, department or person is named**, **the Word template keeps its structure but every value is withheld**, **the docx builder runs in the browser** so the demo really generates a file, and **the AI panel is a visual replica with an explicit "Not available in public demo" state** rather than a fake substitute. See [PROJECT.md](PROJECT.md) for the owner handbook and the rules AI agents must follow when editing this repo, and [`docs/case-study.md`](docs/case-study.md) for how it was built.

## Screenshots

<!-- TODO: add screenshots
![AI assistant](docs/screenshots/assistant.png)
![Workbench preview](docs/screenshots/workbench.png)
![Generated](docs/screenshots/generated.png)
-->

## What's real vs simulated

| Feature | Status | Notes |
|---|---|---|
| JSON validation with line/column location | **Real** | `JSON.parse` first; a hand-written scanner locates the error when the engine omits the position |
| Section-structure preview, unexpected-section detection | **Real** | Title-first, number-fallback matching against the seven fixed sections, same rule as the builder |
| Word generation | **Real, in-browser** | The original Node builder (jszip + xmldom) ported verbatim to ESM; the template is fetched from `/template.docx` |
| Template content | Withheld | Table skeleton and form labels kept; names, department, dates, venue, body text, statistics rows, logo and document metadata removed |
| Download + 5-record history | **Real** | Kept in page memory, like the production in-process store |
| AI assistant | Visual replica | Reproduces the embedded Aily panel with one static example exchange (upload → steps → summary → JSON, computed from the sample); any live message or upload gets a "Not available in public demo" notice |

## Tech stack

- React 19 + TypeScript, Vite
- Tailwind CSS v4, shadcn/ui (Radix), lucide-react
- react-router-dom v7
- jszip + @xmldom/xmldom for docx generation
- Deployed on Vercel as a static SPA (`vercel.json` rewrites all routes to `index.html`)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173, switch to 會議記錄工作台, click 載入示例 JSON, then 生成會議記錄.

## Original production setup

Feishu Spark full-stack template: Vite + React client, NestJS server on the platform's Node FaaS. `POST /api/minutes/generate` loaded the template from disk, ran `build-minutes.js`, kept the last five files in process memory and streamed them back with `@Res()` (returning a `Buffer` would have been JSON-serialised by the platform interceptor). The Aily agent was mounted on the first page with `initAilyChat`. None of that runtime is present here; the client-side `api/minutes` module implements the same five operations.
