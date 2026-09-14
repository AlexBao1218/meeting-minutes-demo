# Meeting Minutes Workbench Demo — 项目手册

两部分。第一部分给 Alex 看，讲这个东西在哪、怎么预览、怎么放进个人网站。
第二部分给 AI 看，讲架构、规则和不能碰的东西。改代码前两部分都读。

---

## Part 1 · 给 Alex

### 这是什么

在公司用飞书妙搭（Spark）做的"安全委员会会议记录生成工作台"的公开作品集版本。原版是双页应用：第一页嵌 Aily 智能体（把粤语会议转写整理成固定七节的 JSON），第二页粘贴 JSON → 实时校验 → 结构预览 → 后端用母版生成 Word → 下载。

公开版把 NestJS 后端去掉，**同一份 docx 生成逻辑搬到浏览器里跑**，母版保留表格骨架但所有值清空，AI 页只保留形态不保留能力。demo 真的能生成并下载一份 Word。

### 在哪

| 位置 | 地址 |
|---|---|
| 本地 | `~/Desktop/meeting-minutes-demo` |
| GitHub | https://github.com/AlexBao1218/meeting-minutes-demo（目前 **private**，确认没问题后再改 public） |
| 线上 | 还没部署 |
| 原始导出包 | `~/Downloads/meeting minutes.zip`（含真实母版、姓名、Aily appKey，**不要上传到任何地方**） |
| 泄露扫描词表 | `~/Desktop/.leakscan/meeting-minutes.txt`（在仓库外，不要复制进来） |

### 你要做的两件事

1. **轮换 Aily appKey**：原导出包 `client/src/pages/AilyAssistant/AilyAssistantPage.tsx` 里硬编码的 appKey 按"已泄露"处理，去飞书开发者后台重新生成。demo 里已经删掉。
2. **确认母版脱敏后的样子**：打开 `client/public/template.docx` 看一眼。姓名、部门、日期、正文、统计数字全部换成留白线，logo 和文档属性里的作者/公司已删。

### 本地预览

```bash
cd ~/Desktop/meeting-minutes-demo && npm run dev
```

打开 http://localhost:5173。两个页面：`/`（AI 助手复刻）、`/workbench`（工作台）。工作台点"載入示例 JSON"→"生成會議記錄"会真的下载一份 Word。

生产构建检查：

```bash
cd ~/Desktop/meeting-minutes-demo && npm run typecheck && npm run lint && npm run build
```

### 发布

仓库已推到 private。自己看一遍后切 public：

```bash
gh repo edit AlexBao1218/meeting-minutes-demo --visibility public --accept-visibility-change-consequences
```

部署到 Vercel（这台机器上 Vercel CLI 没登录）：

```bash
cd ~/Desktop/meeting-minutes-demo && vercel login
```

```bash
cd ~/Desktop/meeting-minutes-demo && vercel --prod
```

项目名用 `meeting-minutes-demo`。`vercel.json` 已配 SPA 重写，`vite build` 输出 `dist/`。部署后在 Vercel Domains 加 `minutes-demo.zijun.cloud`，DNSPod 给 `zijun.cloud` 加 CNAME：`minutes-demo` → `cname.vercel-dns.com`。

### 放进 zijun.cloud

zijun.cloud 的项目页由 JSON 驱动。要做的事：

1. `content/projects/_index/en.json` 和 `zh.json` 的 `projects` 数组加一条，slug 用 `meeting-minutes`（demo 里 "How it was built" 链接已指向 `https://zijun.cloud/en/projects/meeting-minutes`，slug 不要改）。
2. 新建 `content/projects/meeting-minutes/en.json` 和 `zh.json`。素材直接取：
   - 卡片文案、标签、亮点：本仓库 `docs/portfolio-summary.md`
   - 正文各节：`docs/case-study.md`（英文）和 `docs/zh/case-study.md`（中文）
3. `meta.url` 填 demo 线上地址，`urlLabel` 写 "Open demo"。
4. 截图：README 里有占位段落，部署后截 AI 页、工作台（预览表）、生成成功各一张。

case study 里有几处 `[TO FILL]`（每次会议节省的时间、使用频率），发布前填掉或删掉。

### 还没做的事

- 轮换 Aily appKey（你）
- GitHub 仓库检查后切 public
- Vercel 部署和子域名
- zijun.cloud 项目页
- README 截图

---

## Part 2 · For AI agents

Read this before touching any file. The rules in "Disclosure policy" are not negotiable and were set by the owner.

### Purpose

Public portfolio demo of an internal meeting-minutes generator the owner built on Feishu Spark (妙搭) for a safety committee. The goal is to show the system's design and interaction, not the employer's documents. Anything that would identify the employer, its people, locations or figures is withheld.

### Disclosure policy (hard rules)

1. **No company, department or person name, real or fictional.** The app is `APP_TITLE` = "會議記錄工作台". Never invent a stand-in company, department, attendee or location.
2. **Withhold, don't substitute.** The template keeps its XML structure (the builder depends on donor-row indexes) but every value — department name, attendee names, date/time/venue, distribution list, body text, statistics rows, chairman signature — is a full-width underscore bar (`＿＿＿`). Do not "improve" the template by filling anything in.
3. **What may show:** the seven fixed section titles, form labels (日期/時間/地點/出席/行動/記錄), the statistics-table header row and its formula note, the marker legend (#管方代表 *員方代表 ^網上參會), the year label `2026`, the default empty-section sentences.
4. **The sample JSON is written from scratch** (`client/src/data/sample-minutes.ts`): generic safety-committee wording, no real incident, place or number. Do not paste content from the original template into it.
5. **AI page is a replica.** `AilyAssistantPage` reproduces the production panel's one exchange — transcript upload → progress steps → per-section summary → JSON — rendered from the sample JSON (counts via `buildSectionPreview`, never hand-typed) and labelled "靜態示例，非即時生成". Any live message or upload gets `NOT_AVAILABLE_LABEL`. No responder, no canned answers to input.
6. **Filename constant** is `安全委員會_2026_第X次_會議記錄.docx` in both `shared/minutes.ts` and `client/src/lib/build-minutes.js`; keep them in sync and never reintroduce the original department abbreviation.
7. **Never reintroduce** the employer's short name, department names, the Aily appKey, or the original `template.docx`. Run the leak scan below before every commit. The wordlist lives outside the repo on purpose.

### Architecture

Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui (button, textarea only). Static SPA, no backend. jszip + @xmldom/xmldom run in the browser.

```
client/src/
  platform/index.tsx      shim replacing @lark-apaas/client-toolkit (logger, AppContainer,
                          ErrorRender, NotFoundRender, axiosForBackend that always rejects)
  lib/brand.ts            naming + disclosure constants (APP_TITLE, NOT_AVAILABLE_LABEL, WRITEUP_URL)
  lib/build-minutes.js    the original docx builder, CJS → ESM, Buffer → Blob; logic untouched.
                          Clones donor rows from the template and only swaps text. Lint-ignored.
  lib/build-minutes.d.ts  types for the builder
  api/minutes/index.ts    client-side replacement for the NestJS service: fetches /template.docx
                          once, dynamic-imports the builder, keeps 5 records in memory
  data/sample-minutes.ts  the "載入示例 JSON" payload (generic, hand-written)
  data/ai.ts              assistant copy (panel title, agent steps, result headings, notice)
  components/Layout.tsx   two-tab nav + persistent disclosure footer (no top banner:
                          the app is embedded in an iframe on zijun.cloud)
  pages/AilyAssistant     replica of the embedded Aily panel; 「帶到工作台」 passes the sample
                          JSON to /workbench via router state
  pages/MeetingMinutesWorkbench
    MeetingMinutesWorkbench.tsx  page state; unchanged from production apart from imports
    JsonInputSection.tsx         textarea + live validation + sample button
    PreviewSection.tsx           seven-row structure table + unexpected-section notice
    DownloadSection.tsx          latest file + 5-record history
    useJsonValidation.ts         JSON.parse with line/column recovery
    json-error-locate.ts         hand-written JSON scanner used when V8 omits the position
shared/minutes.ts         contract types, cleanJsonText, buildSectionPreview, filename constant
client/public/template.docx  scrubbed template (structure only)
docs/                     case study EN/ZH, portfolio blurb
.agent-memory/MEMORY.md   engineering notes from the original build (scrubbed)
```

Vite aliases `@lark-apaas/client-toolkit*` to the shim so page code keeps its original imports.

### Template invariants (do not break)

`build-minutes.js` indexes the main table by row: heading donor = row 15, spacer = 16, content = 23, style (subtitle/bullet paragraphs) = 28, action header = row 7 cell 2, statistics block = row 18 cell 1. Rows 0–6 are the first page (label in cell 1 must stay `日期` / `時間` / `地點/方式` for the blanking loop). The title paragraph must still contain `次會議記錄`. If the template is ever regenerated, keep those positions or update the constants together.

### Commands

```bash
npm run dev        # http://localhost:5173
npm run typecheck  # tsc, must be clean
npm run lint       # eslint, 0 errors
npm run build      # vite build → dist/
```

Leak scan (must print nothing; wordlist is outside the repo):

```bash
grep -rniEf ~/Desktop/.leakscan/meeting-minutes.txt client shared docs README.md dist
```

Also unzip `client/public/template.docx` and grep the XML the same way whenever the template changes.
