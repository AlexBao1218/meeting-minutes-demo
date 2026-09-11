// Static copy for the assistant panel replica. In production this page mounted
// a Feishu Aily agent via `initAilyChat`; the public demo only reproduces its
// form. There is deliberately NO answer generation here: the example exchange
// is rendered from the hand-written sample JSON, and live input gets a notice.

/** Panel title as it appeared in the production Aily agent */
export const PANEL_TITLE = "匯報生成助手";

/** Label above the pre-rendered example exchange */
export const EXAMPLE_LABEL = "示範對話 · 靜態示例，非即時生成";

/** Generic name for the uploaded transcript in the example exchange */
export const EXAMPLE_UPLOAD_NAME = "會議轉寫.docx";

/** Progress steps the production agent displayed while working */
export const AGENT_STEPS = [
  "技能選擇",
  "思考中",
  "正在解析文件",
  "正在提取信息",
  "正在生成內容",
  "正在執行代碼輸出json結果",
  "已生成結果",
] as const;

export const RESULT_HEADING = "會議記錄資料已生成，請核對各節內容：";
export const RESULT_FOOTER = "複製下方 JSON，貼入「會議記錄工作台」即可下載 Word 檔案：";

/** Body of the notice card that replaces a live answer in the public demo */
export const NOTICE_TEXT =
  "In production this panel was a Feishu Aily agent: upload the meeting transcript and it returned the seven-section JSON shown above, flagging unclear lines as uncertain. The public demo reproduces the exchange but does not run the agent.";
