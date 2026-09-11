# Portfolio card: Meeting Minutes Workbench

Material for the project card on the personal website (slug `meeting-minutes`). Two blocks, English and Chinese, each with a blurb, tech tags and three highlights. The company is not named; the public demo withholds every template value and marks the AI panel as simulated.

---

## English

### Blurb (about 130 words)

A two-page internal tool built on Feishu Spark for a safety committee secretary who typed up Cantonese meetings into a strict, years-old Word format. An Aily agent turns the transcript into a fixed seven-section JSON, marking anything it could not hear as "uncertain" instead of guessing. The workbench validates the JSON on every keystroke with line-and-column error recovery, previews the section structure with amber review prompts, and generates the .docx by cloning formatted donor rows from the department template — no styles redefined, so the output is indistinguishable from a hand-typed one. Built with React, TypeScript and NestJS on the platform's Node FaaS; the public demo drops the backend and runs the same docx builder in the browser against a template whose structure is kept and whose every value is withheld.

### Tech tags

React 19 · TypeScript · Vite · Tailwind CSS · shadcn/ui · NestJS · jszip · xmldom · Feishu Spark · Feishu Aily · docx

### Highlights

- Word generation by donor-row cloning: heading, spacer, content and style rows are copied from the template and only text nodes are swapped, so fonts, borders and numbering can never drift from the original.
- A 150-line hand-written JSON scanner that reports the first offending character with line, column and a plain-language reason when the engine's `JSON.parse` message omits the position.
- Honest uncertainty: the agent flags unclear lines, the preview highlights them in amber, the generated document wraps them in 【待確認】, and the meeting number is deliberately left as X for the secretary to confirm.

---

## 中文

### 简介（约 150 字）

在飞书妙搭上为安全委员会秘书做的双页内部工具。此前秘书要把粤语会议手工整理进一套沿用多年、格式严苛的 Word 母版。Aily 智能体把转写文本整理成固定七节的 JSON，听不清的地方标"待确认"而不猜；工作台逐字校验 JSON 并给出行列号，用琥珀色预览提示需要复核的章节，再通过克隆母版里带格式的供体行生成 .docx——不重定义任何样式，输出和人手排版无异。React、TypeScript、NestJS，跑在平台 Node FaaS 上；公开 demo 去掉后端，把同一个生成器搬进浏览器，母版保留结构、所有值留白。

### 技术标签

React 19 · TypeScript · Vite · Tailwind CSS · shadcn/ui · NestJS · jszip · xmldom · 飞书妙搭 · 飞书 Aily · docx

### 亮点

- 供体行克隆生成 Word：标题行、间隔行、内容行、样式行都从母版复制，只换文本节点，字体、边框、编号永远不会偏离原件。
- 150 行手写 JSON 扫描器：当引擎的 `JSON.parse` 报错不带位置时，定位第一个出错字符并给出行、列和中文原因。
- 诚实的不确定性：智能体标出听不清的句子，预览用琥珀色高亮，生成文件里包上【待確認】，会议次数刻意留成 X 交秘书确认。
