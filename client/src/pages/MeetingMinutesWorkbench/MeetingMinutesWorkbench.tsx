import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import * as api from "@client/src/api";
import { buildSectionPreview, MINUTES_PREVIEW_FILENAME } from "@shared/minutes";
import type {
  GenerateMinutesResponse,
  ListMinutesRecordsResponse,
  MinutesFixedSection,
  MinutesRecord,
  MinutesSectionPreview,
  MinutesSectionPreviewRow,
} from "@shared/minutes";
import DownloadSection from "./DownloadSection";
import { extractErrorMessage } from "./error-message";
import JsonInputSection from "./JsonInputSection";
import PreviewSection from "./PreviewSection";
import { useJsonValidation } from "./useJsonValidation";
import type { JsonValidationResult } from "./useJsonValidation";

/** The assistant page's 「帶到工作台」 hands its JSON over via router state */
interface WorkbenchLocationState {
  jsonText?: string;
}

const MeetingMinutesWorkbench = () => {
  const location = useLocation();
  const [jsonText, setJsonText] = useState<string>((): string => {
    const state: WorkbenchLocationState | null =
      location.state as WorkbenchLocationState | null;
    return typeof state?.jsonText === "string" ? state.jsonText : "";
  });
  const [generating, setGenerating] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>("");
  const [latestRecord, setLatestRecord] = useState<MinutesRecord | null>(null);
  const [records, setRecords] = useState<MinutesRecord[]>([]);
  const [downloadingId, setDownloadingId] = useState<string>("");
  const [clearing, setClearing] = useState<boolean>(false);
  const [fixedSections, setFixedSections] = useState<MinutesFixedSection[]>([]);

  const validation: JsonValidationResult = useJsonValidation(jsonText);

  const refreshRecords = useCallback(async (): Promise<void> => {
    try {
      const response: ListMinutesRecordsResponse =
        await api.minutes.listMinutesRecords();
      setRecords(response.records);
    } catch {
      setRecords([]);
    }
  }, []);

  useEffect(() => {
    void refreshRecords();
    api.minutes
      .listMinutesSections()
      .then((response): void => {
        setFixedSections(response.sections);
      })
      .catch((): void => {
        setFixedSections([]);
      });
  }, [refreshRecords]);

  const handleDownload = useCallback(
    async (recordId: string): Promise<void> => {
      setDownloadingId(recordId);
      try {
        const file: { blob: Blob; filename: string } =
          await api.minutes.downloadMinutesRecord(recordId);
        api.minutes.saveBlobAsFile(file.blob, file.filename);
      } catch (error) {
        setActionError(extractErrorMessage(error));
      } finally {
        setDownloadingId("");
      }
    },
    [],
  );

  const handleGenerate = async (): Promise<void> => {
    if (validation.status !== "valid" || generating) {
      return;
    }
    setGenerating(true);
    setActionError("");
    try {
      const response: GenerateMinutesResponse =
        await api.minutes.generateMinutes(jsonText);
      setLatestRecord(response.record);
      await refreshRecords();
      await handleDownload(response.record.id);
    } catch (error) {
      setActionError(extractErrorMessage(error));
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = async (): Promise<void> => {
    if (clearing) {
      return;
    }
    setClearing(true);
    setActionError("");
    try {
      await api.minutes.clearMinutesRecords();
      setRecords([]);
      setLatestRecord(null);
    } catch (error) {
      setActionError(extractErrorMessage(error));
    } finally {
      setClearing(false);
    }
  };

  const preview: MinutesSectionPreview | null = validation.data
    ? buildSectionPreview(fixedSections, validation.data)
    : null;
  const previewRows: MinutesSectionPreviewRow[] = preview?.rows ?? [];

  return (
    <div className="space-y-8 md:space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          會議記錄生成工作台
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          貼上飛書 Agent 產生的 JSON，一鍵生成與部門格式母版一致的
          Word 會議記錄
        </p>
      </header>

      {/* Two columns from lg: input stays put on the left, results flow on the right */}
      <div className="space-y-10 xl:grid xl:grid-cols-[5fr_6fr] xl:items-stretch xl:gap-x-12 xl:space-y-0">
        <div className="xl:flex xl:min-h-0 xl:flex-col">
          <JsonInputSection
            value={jsonText}
            onChange={setJsonText}
            validation={validation}
            generating={generating}
            onGenerate={(): void => void handleGenerate()}
          />
        </div>

        <div className="flex flex-col gap-10">
          {validation.status === "valid" && validation.data ? (
            <PreviewSection
              rows={previewRows}
              unexpectedTitles={preview?.unexpectedTitles ?? []}
              filename={MINUTES_PREVIEW_FILENAME}
            />
          ) : (
            <section className="flex flex-1 flex-col gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground">
                2 · 預覽結構
              </h2>
              <p className="flex flex-1 items-center justify-center rounded-sm border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                貼上有效的 JSON 後，七節結構會在此預覽
              </p>
            </section>
          )}

          <DownloadSection
            latestRecord={latestRecord}
            records={records}
            actionError={actionError}
            downloadingId={downloadingId}
            onDownload={(recordId: string): void => void handleDownload(recordId)}
            clearing={clearing}
            onClear={(): void => void handleClear()}
          />
        </div>
      </div>
    </div>
  );
};

export default MeetingMinutesWorkbench;
