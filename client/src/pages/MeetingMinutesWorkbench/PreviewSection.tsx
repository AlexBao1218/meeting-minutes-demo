import type { MinutesSectionPreviewRow } from "@shared/minutes";

interface PreviewSectionProps {
  rows: MinutesSectionPreviewRow[];
  unexpectedTitles: string[];
  filename: string;
}

const PreviewSection = ({
  rows,
  unexpectedTitles,
  filename,
}: PreviewSectionProps) => {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground">
        2 · 預覽結構
      </h2>
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">節次</th>
              <th className="px-4 py-2.5 font-medium">標題</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">條目數</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">統計表</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">是否含待確認</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  正在載入章節結構…
                </td>
              </tr>
            ) : (
              rows.map((row: MinutesSectionPreviewRow) => (
                <tr
                  key={row.no}
                  className={
                    row.missing || row.hasUncertain
                      ? "border-b border-border bg-warning/10 last:border-b-0"
                      : "border-b border-border last:border-b-0"
                  }
                >
                  <td className="whitespace-nowrap px-4 py-2.5">{row.no}</td>
                  <td className="px-4 py-2.5">{row.title}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {row.missing ? (
                      <span className="rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                        缺失
                      </span>
                    ) : (
                      row.itemCount
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {row.statsRowCount > 0 ? (
                      <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                        含統計表（{row.statsRowCount} 列）
                      </span>
                    ) : (
                      <span className="text-muted-foreground">無</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.hasUncertain ? (
                      <span className="rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                        含待確認
                      </span>
                    ) : (
                      <span className="text-muted-foreground">否</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {unexpectedTitles.length > 0 && (
        <p className="rounded-sm bg-warning/10 px-4 py-2.5 text-sm">
          JSON 含 {unexpectedTitles.length} 個非預期章節（將被忽略）：
          {unexpectedTitles.join("、")}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        即將產生的檔名：
        <span className="font-mono text-foreground">{filename}</span>
      </p>
    </section>
  );
};

export default PreviewSection;
