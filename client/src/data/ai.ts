// Static copy for the assistant panel replica. In production this page mounted
// a Feishu Aily agent via `initAilyChat`; the public demo only reproduces its
// form. There is deliberately NO answer generation here.

/** Welcome line rendered at the top of the panel */
export const WELCOME_MESSAGE =
  "你好，我是會議記錄助手。把會議錄音的轉寫文字貼給我，我會整理成固定七節的 JSON，再到工作台生成 Word。";

/** Suggestion chips shown under "試試這樣問" */
export const SUGGESTED_QUESTIONS = [
  "JSON 需要包含哪些欄位？",
  "「待確認」條目會怎樣呈現？",
  "安全表現統計表的格式是什麼？",
] as const;

/** Body of the notice card that replaces a live answer in the public demo */
export const NOTICE_TEXT =
  "In production this panel was a Feishu Aily agent that turned Cantonese meeting transcripts into the structured JSON the workbench consumes. See the project write-up for what it could do.";
