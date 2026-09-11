/**
 * Client-side implementation of the minutes API.
 *
 * In production these were NestJS endpoints (`server/modules/minutes`): the
 * service loaded `template.docx` from disk, ran the builder, kept the last 5
 * files in process memory and streamed them back with `@Res()`. The public
 * demo runs the same builder in the browser and keeps the same 5-record
 * in-memory history, so the workbench page code is unchanged.
 */
import { logger } from "@lark-apaas/client-toolkit/logger";
import type { BuildMinutesResult } from "@/lib/build-minutes";
import { MAX_MINUTES_FILE_BYTES } from "@shared/minutes";
import type {
  ClearMinutesRecordsResponse,
  GenerateMinutesResponse,
  ListMinutesRecordsResponse,
  ListMinutesSectionsResponse,
  MinutesFixedSection,
  MinutesRecord,
} from "@shared/minutes";

interface StoredMinutesRecord {
  record: MinutesRecord;
  content: Blob;
}

const MAX_HISTORY = 5;
const TEMPLATE_URL = "/template.docx";

const history: StoredMinutesRecord[] = [];
let templatePromise: Promise<ArrayBuffer> | null = null;

// jszip + xmldom are only needed on the workbench; load them on first use.
const loadBuilder = () => import("@/lib/build-minutes");

function loadTemplate(): Promise<ArrayBuffer> {
  if (!templatePromise) {
    templatePromise = fetch(TEMPLATE_URL).then(
      async (response: Response): Promise<ArrayBuffer> => {
        if (!response.ok) {
          throw new Error(`找不到格式母版：${TEMPLATE_URL}`);
        }
        return response.arrayBuffer();
      },
    );
    templatePromise.catch((): void => {
      templatePromise = null;
    });
  }
  return templatePromise;
}

const newId = (): string =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export async function generateMinutes(
  jsonText: string,
): Promise<GenerateMinutesResponse> {
  if (!jsonText || jsonText.trim().length === 0) {
    throw new Error("請貼上 Agent 產生的 JSON");
  }
  const [{ generate }, template] = await Promise.all([loadBuilder(), loadTemplate()]);
  let result: BuildMinutesResult;
  try {
    result = await generate(jsonText, template);
  } catch (error) {
    logger.error("生成會議記錄失敗", error);
    throw error;
  }
  if (result.content.size > MAX_MINUTES_FILE_BYTES) {
    throw new Error("生成的檔案超過 10 MB，視為異常，請重試");
  }
  const record: MinutesRecord = {
    id: newId(),
    filename: result.filename,
    generatedAt: new Date().toISOString(),
  };
  history.unshift({ record, content: result.content });
  while (history.length > MAX_HISTORY) {
    history.pop();
  }
  return { record };
}

export async function listMinutesRecords(): Promise<ListMinutesRecordsResponse> {
  return {
    records: history.map(
      (stored: StoredMinutesRecord): MinutesRecord => stored.record,
    ),
  };
}

export async function listMinutesSections(): Promise<ListMinutesSectionsResponse> {
  const { SECTIONS } = await loadBuilder();
  return {
    sections: SECTIONS.map(
      ([no, title]: [string, string]): MinutesFixedSection => ({ no, title }),
    ),
  };
}

export async function clearMinutesRecords(): Promise<ClearMinutesRecordsResponse> {
  const cleared: number = history.length;
  history.length = 0;
  return { cleared };
}

export async function downloadMinutesRecord(
  recordId: string,
): Promise<{ blob: Blob; filename: string }> {
  const stored: StoredMinutesRecord | undefined = history.find(
    (item: StoredMinutesRecord): boolean => item.record.id === recordId,
  );
  if (!stored) {
    throw new Error("生成記錄不存在或已過期");
  }
  return { blob: stored.content, filename: stored.record.filename };
}

export function saveBlobAsFile(blob: Blob, filename: string): void {
  const url: string = URL.createObjectURL(blob);
  const anchor: HTMLAnchorElement = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke after the click has been dispatched; some browsers abort the
  // download if the object URL disappears synchronously.
  window.setTimeout((): void => URL.revokeObjectURL(url), 1000);
}
