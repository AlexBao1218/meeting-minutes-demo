/**
 * 會議記錄生成工作台 shared 契約
 * 注意：MinutesJson 相關類型反映飛書 Agent 輸出的外部 JSON 格式，
 * 其欄位（meeting_no / uncertain_note 等）為外部資料原始命名，非本應用 API 屬性。
 */

export interface MinutesRecord {
  id: string;
  filename: string;
  generatedAt: string;
}

export interface GenerateMinutesRequest {
  jsonText: string;
}

export interface GenerateMinutesResponse {
  record: MinutesRecord;
}

export interface ListMinutesRecordsResponse {
  records: MinutesRecord[];
}

export interface ClearMinutesRecordsResponse {
  cleared: number;
}

export interface MinutesFixedSection {
  no: string;
  title: string;
}

export interface ListMinutesSectionsResponse {
  sections: MinutesFixedSection[];
}

export interface MinutesJsonMeta {
  meeting_no?: string;
}

export interface MinutesSafetyTableRow {
  dept?: string;
  accidents?: string;
  rate?: string;
  target?: string;
  meet?: string;
}

export interface MinutesSafetyTable {
  rows?: MinutesSafetyTableRow[];
  note?: string;
}

export interface MinutesSectionItem {
  subtitle?: string;
  content?: string;
  action?: string;
  uncertain?: boolean;
  uncertain_note?: string;
  safety_table?: MinutesSafetyTable;
}

export interface MinutesSection {
  no?: string;
  title?: string;
  items?: MinutesSectionItem[];
}

export interface MinutesJson {
  meta?: MinutesJsonMeta;
  sections?: MinutesSection[];
}

export interface MinutesSectionPreviewRow {
  no: string;
  title: string;
  /** JSON 中找不到對應章節時為 true，條目數顯示「缺失」 */
  missing: boolean;
  itemCount: number;
  hasUncertain: boolean;
  /** 該節各 item 的 safety_table 資料列總數；0 表示未帶入統計表 */
  statsRowCount: number;
}

export interface MinutesSectionPreview {
  rows: MinutesSectionPreviewRow[];
  unexpectedTitles: string[];
}

export const MAX_MINUTES_FILE_BYTES = 10 * 1024 * 1024;

/**
 * 與後端 build-minutes.js suggestFilename 一致：
 * 會議次數來自粵語語音轉寫不可靠，檔名固定留白，由秘書下載後自行改寫 X。
 */
export const MINUTES_PREVIEW_FILENAME = "安全委員會_2026_第X次_會議記錄.docx";

/**
 * Endpoint paths of the original NestJS backend, kept for documentation.
 * The public demo implements the same operations client-side in
 * client/src/api/minutes.
 */
export const MINUTES_API_PATHS = {
  generate: "/api/minutes/generate",
  records: "/api/minutes/records",
  sections: "/api/minutes/sections",
  recordDownload: (recordId: string): string =>
    `/api/minutes/records/${recordId}/download`,
} as const;

/**
 * 與 build-minutes.js generate() 的輸入清洗規則一致：
 * 去掉 ``` 包裹，截取最外層大括號，供前端校驗與預覽使用。
 */
export function cleanJsonText(raw: string): string {
  let text: string = raw.trim();
  text = text.replace(/^```(?:json)?\s*/u, "");
  text = text.replace(/\s*```$/u, "").trim();
  const start: number = text.indexOf("{");
  const end: number = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  return text;
}

/**
 * 預覽結構以 build-minutes.js 匯出的 SECTIONS（固定七節）為準，
 * 與 generate() 的匹配規則一致：標題優先，節次（去括號後）兕底。
 * JSON 中不在固定七節內的章節不回傳為列，改列於 unexpectedTitles。
 */
const stripSectionNo = (no: string): string =>
  no.replace(/[（）]/gu, "").trim();

export function buildSectionPreview(
  fixedSections: MinutesFixedSection[],
  data: MinutesJson,
): MinutesSectionPreview {
  const jsonSections: MinutesSection[] = Array.isArray(data.sections)
    ? data.sections
    : [];

  const byTitle: Map<string, MinutesSection> = new Map();
  const byNo: Map<string, MinutesSection> = new Map();
  for (const section of jsonSections) {
    const title: string = (section.title ?? "").trim();
    const no: string = (section.no ?? "").trim();
    if (title.length > 0) {
      byTitle.set(title, section);
    }
    if (no.length > 0) {
      byNo.set(no, section);
    }
  }

  const fixedTitles: Set<string> = new Set(
    fixedSections.map((fixed: MinutesFixedSection): string => fixed.title),
  );
  const fixedNoKeys: Set<string> = new Set(
    fixedSections.map((fixed: MinutesFixedSection): string =>
      stripSectionNo(fixed.no),
    ),
  );

  const rows: MinutesSectionPreviewRow[] = fixedSections.map(
    (fixed: MinutesFixedSection): MinutesSectionPreviewRow => {
      const matched: MinutesSection | null =
        byTitle.get(fixed.title) ?? byNo.get(stripSectionNo(fixed.no)) ?? null;
      const items: MinutesSectionItem[] =
        matched && Array.isArray(matched.items) ? matched.items : [];
      return {
        no: fixed.no,
        title: fixed.title,
        missing: matched === null,
        itemCount: items.length,
        hasUncertain: items.some(
          (item: MinutesSectionItem): boolean => item.uncertain === true,
        ),
        statsRowCount: items.reduce(
          (sum: number, item: MinutesSectionItem): number =>
            sum + (item.safety_table?.rows?.length ?? 0),
          0,
        ),
      };
    },
  );

  const unexpectedTitles: string[] = jsonSections
    .filter((section: MinutesSection): boolean => {
      const title: string = (section.title ?? "").trim();
      const no: string = (section.no ?? "").trim();
      const titleMatched: boolean =
        title.length > 0 && fixedTitles.has(title);
      const noMatched: boolean = no.length > 0 && fixedNoKeys.has(no);
      return !titleMatched && !noMatched;
    })
    .map(
      (section: MinutesSection): string =>
        (section.title ?? "").trim() || "（未命名）",
    );

  return { rows, unexpectedTitles };
}
