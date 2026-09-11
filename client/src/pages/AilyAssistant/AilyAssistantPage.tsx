import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Info,
  Plus,
  RefreshCw,
  SendHorizontal,
} from "lucide-react";
import * as api from "@client/src/api";
import { buildSectionPreview } from "@shared/minutes";
import type {
  MinutesFixedSection,
  MinutesJson,
  MinutesSectionPreviewRow,
} from "@shared/minutes";
import { ASSISTANT_TITLE, NOT_AVAILABLE_LABEL, WRITEUP_URL } from "@/lib/brand";
import { SAMPLE_MINUTES_JSON } from "@/data/sample-minutes";
import {
  AGENT_STEPS,
  EXAMPLE_LABEL,
  EXAMPLE_UPLOAD_NAME,
  NOTICE_TEXT,
  PANEL_TITLE,
  RESULT_FOOTER,
  RESULT_HEADING,
} from "@/data/ai";

/**
 * Visual replica of the Feishu Aily agent panel that the production page
 * mounted with `initAilyChat(container, { appKey })`.
 *
 * The panel shows one pre-rendered exchange — transcript upload → agent
 * progress steps → per-section summary → JSON — built entirely from the
 * demo's hand-written sample JSON (counts come from `buildSectionPreview`,
 * the same function the workbench uses). Nothing is generated: any live
 * message or upload gets an explicit "not available in public demo" notice.
 */

/** Pause before the notice card appears, so the exchange reads as a reply */
const NOTICE_DELAY_MS = 500;
const COPIED_RESET_MS = 1500;

type ChatEntry =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "upload" }
  | { id: number; kind: "notice" };

let entrySeq = 0;
const nextId = (): number => ++entrySeq;

const SAMPLE_DATA: MinutesJson = JSON.parse(SAMPLE_MINUTES_JSON) as MinutesJson;
const SAMPLE_LINES: string[] = SAMPLE_MINUTES_JSON.split("\n");

function summaryLine(row: MinutesSectionPreviewRow): string {
  const notes: string[] = [];
  if (row.statsRowCount > 0) notes.push(`含統計表 ${row.statsRowCount} 列`);
  if (row.hasUncertain) notes.push("含待確認");
  const suffix: string = notes.length > 0 ? `（${notes.join("，")}）` : "";
  return `${row.title}：${row.itemCount} 項${suffix}`;
}

function UploadBubble({ name }: { name: string }) {
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[85%] items-center gap-3 rounded-sm border border-border bg-muted px-3 py-2.5">
        <FileText className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">{name}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">docx</p>
        </div>
      </div>
    </div>
  );
}

function NoticeCard() {
  return (
    <div className="max-w-[92%] rounded-sm border border-border bg-background px-4 py-3 sm:max-w-[80%]">
      <div className="flex items-center gap-2">
        <Info className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">{NOT_AVAILABLE_LABEL}</p>
      </div>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{NOTICE_TEXT}</p>
      <a
        href={WRITEUP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        How it worked →
      </a>
    </div>
  );
}

function ExampleReply({
  rows,
  onOpenWorkbench,
}: {
  rows: MinutesSectionPreviewRow[];
  onOpenWorkbench: () => void;
}) {
  const [stepsOpen, setStepsOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const copiedTimer = useRef<number | null>(null);

  useEffect(
    () => (): void => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    },
    [],
  );

  const copyJson = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(SAMPLE_MINUTES_JSON);
      setCopied(true);
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout((): void => setCopied(false), COPIED_RESET_MS);
    } catch {
      // clipboard blocked — the user can still select the text
    }
  };

  return (
    <div className="flex gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Bot className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {/* Progress steps, collapsed like the production panel */}
        <div>
          <button
            type="button"
            onClick={(): void => setStepsOpen((open) => !open)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            aria-expanded={stepsOpen}
          >
            <span aria-hidden="true">✧</span>
            已生成結果
            {stepsOpen ? (
              <ChevronUp className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden="true" />
            )}
          </button>
          {stepsOpen && (
            <ul className="mt-2 space-y-1.5 pl-1">
              {AGENT_STEPS.map((step: string) => (
                <li key={step} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-muted-foreground/50" aria-hidden="true" />
                  {step}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-sm leading-6 text-foreground">{RESULT_HEADING}</p>
        <ol className="space-y-1 text-sm leading-6 text-foreground">
          {rows.map((row: MinutesSectionPreviewRow, index: number) => (
            <li key={row.no} className="flex gap-2">
              <span className="w-4 shrink-0 text-primary">{index + 1}.</span>
              <span>{summaryLine(row)}</span>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="text-muted-foreground">正在載入章節結構…</li>
          )}
        </ol>
        <p className="text-sm leading-6 text-foreground">{RESULT_FOOTER}</p>

        {/* JSON block with line numbers, as the production panel rendered it */}
        <div className="overflow-hidden rounded-sm border border-border bg-muted/40">
          <div className="max-h-72 overflow-auto">
            <pre className="min-w-max px-3 py-2.5 font-mono text-xs leading-5">
              {SAMPLE_LINES.map((line: string, index: number) => (
                <div key={index} className="flex gap-4">
                  <span className="w-6 shrink-0 select-none text-right text-muted-foreground/60">
                    {index + 1}
                  </span>
                  <span className="text-foreground">{line}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={(): void => void copyJson()}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
          >
            {copied ? (
              <Check className="size-3.5 text-success" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
            {copied ? "已複製" : "複製 JSON"}
          </button>
          <button
            type="button"
            onClick={onOpenWorkbench}
            className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-2.5 py-1.5 text-xs text-primary-foreground transition-colors hover:bg-primary/90"
          >
            帶到工作台
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

const AilyAssistantPage = () => {
  const navigate = useNavigate();
  const [fixedSections, setFixedSections] = useState<MinutesFixedSection[]>([]);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState<string>("");
  const timerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.minutes
      .listMinutesSections()
      .then((response): void => setFixedSections(response.sections))
      .catch((): void => setFixedSections([]));
  }, []);

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  // Keep the newest entry in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el && entries.length > 0) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const reset = useCallback((): void => {
    clearTimer();
    setEntries([]);
    setInput("");
  }, [clearTimer]);

  const pushWithNotice = useCallback(
    (entry: ChatEntry): void => {
      clearTimer();
      setEntries((prev) => [...prev, entry]);
      timerRef.current = window.setTimeout((): void => {
        timerRef.current = null;
        setEntries((prev) => [...prev, { id: nextId(), kind: "notice" }]);
      }, NOTICE_DELAY_MS);
    },
    [clearTimer],
  );

  const send = useCallback(
    (raw: string): void => {
      const text: string = raw.trim();
      if (!text) return;
      setInput("");
      pushWithNotice({ id: nextId(), kind: "user", text });
    },
    [pushWithNotice],
  );

  const attach = useCallback((): void => {
    pushWithNotice({ id: nextId(), kind: "upload" });
  }, [pushWithNotice]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(input);
    }
  };

  const openWorkbench = (): void => {
    navigate("/workbench", { state: { jsonText: SAMPLE_MINUTES_JSON } });
  };

  const rows: MinutesSectionPreviewRow[] = buildSectionPreview(fixedSections, SAMPLE_DATA).rows;
  const canSend: boolean = input.trim().length > 0;

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{ASSISTANT_TITLE}</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          透過 Aily 智能助手協助處理會議記錄相關問題
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex h-[640px] flex-col overflow-hidden rounded-sm border border-border bg-card">
          {/* Panel header */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">{PANEL_TITLE}</p>
            <div className="flex items-center gap-3">
              <span
                className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"
                title={`${NOT_AVAILABLE_LABEL} · the production panel connected to a Feishu Aily agent`}
              >
                <span className="size-2 rounded-full bg-muted-foreground/40" aria-hidden="true" />
                Demo mode · AI disconnected
              </span>
              <button
                type="button"
                onClick={reset}
                aria-label="重新開始"
                className="inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <RefreshCw className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-5">
              <p className="text-center text-[11px] tracking-wide text-muted-foreground">
                {EXAMPLE_LABEL}
              </p>
              <UploadBubble name={EXAMPLE_UPLOAD_NAME} />
              <ExampleReply rows={rows} onOpenWorkbench={openWorkbench} />

              {entries.map((entry: ChatEntry) => {
                if (entry.kind === "user") {
                  return (
                    <div key={entry.id} className="flex justify-end">
                      <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-sm bg-primary px-3.5 py-2.5 text-sm leading-6 text-primary-foreground sm:max-w-[75%]">
                        {entry.text}
                      </p>
                    </div>
                  );
                }
                if (entry.kind === "upload") {
                  return <UploadBubble key={entry.id} name="（上傳檔案）" />;
                }
                return (
                  <div key={entry.id} className="flex justify-start">
                    <NoticeCard />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-border px-4 py-3">
            <div className="flex items-end gap-2 rounded-sm border border-input bg-background px-2 py-1.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
              <button
                type="button"
                onClick={attach}
                aria-label="上傳檔案"
                title={NOT_AVAILABLE_LABEL}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Plus className="size-4" />
              </button>
              <textarea
                value={input}
                onChange={(event): void => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="發送消息"
                className="max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1 text-sm leading-6 outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={(): void => send(input)}
                disabled={!canSend}
                aria-label="發送"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-primary transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <SendHorizontal className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AilyAssistantPage;
