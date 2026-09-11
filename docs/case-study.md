# Case study: Meeting Minutes Workbench

> Public write-up of an internal tool built on Feishu Spark for a safety committee's secretary. The employer, department, attendees and documents are withheld; the demo shows the system, not the data.

## The problem

A departmental safety committee meets several times a year. The secretary records the meeting, then types up minutes in a fixed Word format that has been in use for years: a first page with date, time, venue, attendee list and distribution list; then seven numbered sections with a two-column body (content | action). Section three carries a small statistics table with an accident-rate formula note. The layout is a nested table, and every previous set of minutes was produced by copying the last one and retyping.

Two things made this slow. The meetings are in Cantonese, so transcription tools produced text that still needed structuring. And the Word format is unforgiving: a paragraph pasted with the wrong style breaks the look, and the secretary had to fix it by hand.

Time per set of minutes before the tool: `[TO FILL]`. Meetings per year: `[TO FILL]`.

## What was built

Two pages inside one Feishu Spark app.

**Page 1 — AI assistant.** An Aily agent embedded in the page. The secretary pastes the transcript; the agent returns a JSON with `sections[] { no, title, items[] { subtitle, content, action, uncertain, uncertain_note, safety_table } }`. The agent marks anything it could not hear clearly as `uncertain` with a note, rather than guessing. The public demo reproduces the panel's form only; every message returns "Not available in public demo".

**Page 2 — Workbench.** Three steps on one scrolling page, no navigation:

1. **Paste JSON.** Validated on every keystroke. The agent's output sometimes arrives wrapped in ```` ```json ```` fences or with leading prose, so the input is cleaned first: strip fences, take the outermost `{ … }`.
2. **Preview structure.** A seven-row table — one per fixed section — showing item count, whether a statistics table is attached, and whether any item is marked uncertain. Sections missing from the JSON show 缺失; sections in the JSON that are not among the seven are listed as "unexpected, will be ignored". The row highlight is amber, not red: an uncertain item is a review prompt, not an error.
3. **Generate and download.** One button. The file name deliberately leaves the meeting number as `X` — the number comes from Cantonese speech and is the most frequently mis-transcribed field, so it is left for the secretary to fill in after download rather than trusted from the JSON. The last five files stay available in a history list.

## Engineering decisions

### Line and column for JSON errors

The secretary needed to know *where* a paste went wrong. Modern V8 no longer guarantees a position in `JSON.parse` error messages. The workbench tries the native message first (`line N column M` or `position N`), and when neither is present falls back to a small hand-written JSON scanner (`json-error-locate.ts`) that walks the text and reports the first offending character with a Chinese reason ("預期為逗號 , 或 }"). Roughly 150 lines, no dependency, deterministic.

### Clone formatted rows instead of redefining styles

The first version used `python-docx` and rebuilt the document from styles. It never matched the original exactly, and the production runtime was Node FaaS with no Python anyway. The rewrite (`build-minutes.js`) opens the template with jszip, parses `word/document.xml` with xmldom, and treats specific rows of the template as *donors*: a heading row, a spacer row, a content row, and a row whose paragraphs carry the bold-underlined subtitle style and the bullet style. Generation is: blank the first-page fields, delete every body row from row 7 down, then for each of the seven sections append a cloned heading, a spacer, and one cloned content row per item, swapping only the text nodes. Nothing about fonts, borders, indents or numbering is written by code, so the output cannot drift from the template.

The statistics table follows the same idea: the template's block (an outer 1×1 table holding a 3×5 table and a formula note) is cloned, the header row is kept, data rows are cloned from the first data row, and a trailing empty paragraph is added because Word refuses a cell that ends with a table.

### Matching sections by title first, number second

The agent sometimes writes `（一）` and sometimes `一`. The builder and the preview use the same rule: match on section title, fall back to the number with brackets stripped. Both live on the same fixed `SECTIONS` list exported by the builder, so the preview cannot disagree with what will be generated.

### Serving binary from NestJS behind a platform interceptor

Returning a `Buffer` from a controller produced a corrupt download: the platform's global interceptor JSON-serialised it into `{"type":"Buffer","data":[…]}`. The download endpoint uses `@Res()` and writes the bytes with `Content-Disposition` itself.

### Static imports survive dependency pruning

The first deploy returned 500 with `Cannot find module 'jszip'`. The platform's build prunes `node_modules` with `@vercel/nft`, which follows static `require` calls from the entry file. The builder had been loaded with `createRequire` and a dynamic path, so jszip was never traced. Switching to a static `import` (with a `.d.ts` beside the JS file for types) fixed it. Verification became part of the routine: run the prune script locally and `require` the module from inside the pruned output.

### What was kept out

No database, no user system, no persistence of generated files. Five records in process memory, cleared on restart. The secretary downloads immediately; there is nothing to store.

## The public demo

Same page code, three substitutions:

- The NestJS service is replaced by a client-side module that fetches the template, runs the same builder in the browser and keeps the same five-record history.
- The template keeps its XML structure — the builder depends on row positions — but every value is a full-width underscore bar. Logo images, custom XML and document authorship metadata are removed.
- The Aily panel is a visual replica. There is no responder.

Nothing is invented: no stand-in department, no fictional attendees, no sample statistics copied from a real page. The sample JSON is generic safety wording written for the demo.

## Outcome

Time per set of minutes after the tool: `[TO FILL]`. The secretary's review shifted from formatting to content: the amber "uncertain" rows tell them exactly which lines to check against the recording.
