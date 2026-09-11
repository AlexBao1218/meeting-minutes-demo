# 项目记忆（原生产版工程笔记，已脱敏）

## JSON.parse 报错无行列号 → 自定义扫描器兜底

- 现象：前端用 `JSON.parse` 校验非法 JSON 时拿不到错误行列号，无法展示「第 X 行第 Y 列」
- 根因：新版 Chromium/V8 的 JSON.parse 错误消息不再内置 position 字段，"Unexpected token ... in JSON at position N" 也不保证存在
- 修复：`client/src/pages/MeetingMinutesWorkbench/json-error-locate.ts` 实现轻量 JSON 扫描器，先尝试从错误消息提取 position，失败则扫描定位；行内错误信息统一格式「JSON 格式錯誤：第 X 行第 Y 列 — 原因」

## 下载接口必须 @Res() 手动发二进制（原 NestJS 版）

- 现象：NestJS 接口直接 return Buffer 时，浏览器下载到的 docx 损坏
- 根因：平台全局拦截器会把返回值 JSON 序列化，Buffer 变成 `{"type":"Buffer",...}`
- 修复：下载接口用 `@Res()` 手动 `res.set(Content-Disposition).send(buffer)`
- demo 中不适用：`api/minutes` 在浏览器内直接返回 Blob

## 线上 500：Cannot find module → 依赖裁剪只认静态引用（原 NestJS 版）

- 现象：发布后线上调用接口 500，报 `Cannot find module 'jszip'`；本地/预览一切正常
- 根因：线上构建用 @vercel/nft 从 `dist/server/main.js` 静态追踪依赖，只把追踪到的包拷进产物 node_modules；用 `createRequire(__filename)(动态路径)` 加载的脚本在追踪图之外
- 修复：加载方改为静态 `import ... from "../../scripts/minutes/build-minutes"`（配同名 .d.ts 提供类型）
- demo 中的对应物：`api/minutes` 用 `import("@/lib/build-minutes")` 做代码分割，Vite 静态分析可追踪

## 会议记录生成：直改 docx XML，禁重写

- 背景：线上是 Node.js FaaS，无 Python 环境，原 python-docx 链路不可用；改为 `build-minutes.js`（jszip + @xmldom/xmldom 直接改母版 XML，样式零重定义）
- 约束：`build-minutes.js` 逻辑不改；档名固定 `..._第X次_會議記錄.docx`（会议次数来自粤语语音转写不可靠，不带入）；前端预览用 `shared/minutes.ts` 的 `MINUTES_PREVIEW_FILENAME` 保持同步
- demo 差异：CJS → ESM、`nodebuffer` → `blob`、文件名常量去掉部门缩写；母版位置从 `server/scripts/minutes/template.docx` 改为 `client/public/template.docx`，行索引不变

## 母版脱敏（demo 专属）

- 母版保留全部 XML 结构（生成器按行索引取供体），每个值换成全角下划线；logo、customXml、docProps 作者/公司删除
- 脱敏脚本和泄露扫描词表都在仓库外；若母版需要重生成，先跑词表扫描解压后的 XML
