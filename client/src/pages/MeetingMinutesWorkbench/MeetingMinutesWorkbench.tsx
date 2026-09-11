import { useCallback, useEffect, useState } from "react";
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

const MeetingMinutesWorkbench = () => {
  const [jsonText, setJsonText] = useState<string>("");
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
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          會議記錄生成工作台
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          貼上飛書 Agent 產生的 JSON，一鍵生成與部門格式母版一致的
          Word 會議記錄
        </p>
      </header>

      <JsonInputSection
        value={jsonText}
        onChange={setJsonText}
        validation={validation}
        generating={generating}
        onGenerate={(): void => void handleGenerate()}
      />

      {validation.status === "valid" && validation.data && (
        <PreviewSection
          rows={previewRows}
          unexpectedTitles={preview?.unexpectedTitles ?? []}
          filename={MINUTES_PREVIEW_FILENAME}
        />
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
  );
};

export default MeetingMinutesWorkbench;
