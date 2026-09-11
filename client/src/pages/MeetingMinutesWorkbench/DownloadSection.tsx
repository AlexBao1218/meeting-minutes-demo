import dayjs from "dayjs";
import { Download, FileText, Loader2, Trash2 } from "lucide-react";
import { Button } from "@client/src/components/ui/button";
import type { MinutesRecord } from "@shared/minutes";

interface DownloadSectionProps {
  latestRecord: MinutesRecord | null;
  records: MinutesRecord[];
  actionError: string;
  downloadingId: string;
  onDownload: (recordId: string) => void;
  clearing: boolean;
  onClear: () => void;
}

const formatGeneratedAt = (generatedAt: string): string =>
  dayjs(generatedAt).format("YYYY-MM-DD HH:mm:ss");

const DownloadSection = ({
  latestRecord,
  records,
  actionError,
  downloadingId,
  onDownload,
  clearing,
  onClear,
}: DownloadSectionProps) => {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground">
        3 · 下載與記錄
      </h2>

      {actionError.length > 0 && (
        <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p className="break-words">{actionError}</p>
        </div>
      )}

      {latestRecord && (
        <div className="flex flex-col gap-3 rounded-sm border border-success/30 bg-success/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-success">生成成功</p>
            <p className="truncate font-mono text-sm">
              {latestRecord.filename}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatGeneratedAt(latestRecord.generatedAt)}
            </p>
          </div>
          <Button
            onClick={(): void => onDownload(latestRecord.id)}
            disabled={downloadingId === latestRecord.id}
          >
            {downloadingId === latestRecord.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            下載本次檔案
          </Button>
        </div>
      )}

      <div className="rounded-sm border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <span className="text-sm font-medium">最近生成記錄</span>
          <Button
            variant="outline"
            size="sm"
            onClick={(): void => onClear()}
            disabled={clearing || (records.length === 0 && !latestRecord)}
          >
            {clearing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            清空記錄
          </Button>
        </div>
        {records.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            尚無生成記錄
          </p>
        ) : (
          <ul>
            {records.map((record: MinutesRecord) => (
              <li
                key={record.id}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm">
                    {record.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatGeneratedAt(record.generatedAt)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(): void => onDownload(record.id)}
                  disabled={downloadingId === record.id}
                >
                  {downloadingId === record.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  下載
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default DownloadSection;
