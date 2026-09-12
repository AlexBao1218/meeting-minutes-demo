import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Info,
  Plus,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import * as api from "@client/src/api";
import { FileWikiWordColorfulIcon } from "@client/src/components/ui/icons/file-wiki-word-colorful-icon";
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
 * message, upload, regenerate or feedback click gets an explicit
 * "not available in public demo" notice.
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

/** Copy text; falls back to a hidden textarea where the async clipboard API is unavailable */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area: HTMLTextAreaElement = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok: boolean = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

// ---- JSON syntax colouring (keys / strings / numbers / literals) ----
type Token = { kind: "key" | "string" | "number" | "literal" | "plain"; text: string };
const TOKEN_RE = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b/gu;

function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of line.matchAll(TOKEN_RE)) {
    const index: number = match.index ?? 0;
    if (index > last) tokens.push({ kind: "plain", text: line.slice(last, index) });
    if (match[1] !== undefined) {
      tokens.push({ kind: match[2] ? "key" : "string", text: match[1] });
      if (match[2]) tokens.push({ kind: "plain", text: match[2] });
    } else if (match[3] !== undefined) {
      tokens.push({ kind: "number", text: match[3] });
    } else if (match[4] !== undefined) {
      tokens.push({ kind: "literal", text: match[4] });
    }
    last = index + match[0].length;
  }
  if (last < line.length) tokens.push({ kind: "plain", text: line.slice(last) });
  return tokens;
}

const TOKEN_CLASS: Record<Token["kind"], string> = {
  key: "text-[hsl(280_45%_40%)]",
  string: "text-[hsl(152_45%_32%)]",
  number: "text-[hsl(215_60%_40%)]",
  literal: "text-[hsl(215_60%_40%)]",
  plain: "text-foreground",
};

const SAMPLE_TOKENS: Token[][] = SAMPLE_LINES.map(tokenize);

function JsonBlock() {
  return (
    <div className="overflow-hidden rounded-sm border border-border bg-muted/40">
      <div className="max-h-72 overflow-auto lg:max-h-[300px]">
        <pre className="min-w-max px-3 py-2.5 font-mono text-xs leading-5">
          {SAMPLE_TOKENS.map((tokens: Token[], index: number) => (
            <span key={index} className="flex gap-4">
              <span className="w-6 shrink-0 select-none text-right text-muted-foreground/60">
                {index + 1}
              </span>
              <span>
                {tokens.map((token: Token, tokenIndex: number) => (
                  <span key={tokenIndex} className={TOKEN_CLASS[token.kind]}>
                    {token.text}
                  </span>
                ))}
              </span>
            </span>
          ))}
        </pre>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      {children}
    </button>
  );
}

function AgentAvatar() {
  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-warning text-warning-foreground">
      <Sparkles className="size-3.5" aria-hidden="true" />
    </div>
  );
}

function UploadBubble({ name }: { name: string }) {
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[85%] items-center gap-2.5 rounded-sm bg-muted px-3 py-2.5">
        <FileWikiWordColorfulIcon className="size-6 shrink-0" aria-hidden="true" />
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
    <div className="flex gap-3">
      <AgentAvatar />
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
    </div>
  );
}

function ExampleReply({
  rows,
  onOpenWorkbench,
  onUnavailable,
}: {
  rows: MinutesSectionPreviewRow[];
  onOpenWorkbench: () => void;
  onUnavailable: () => void;
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
    if (!(await copyText(SAMPLE_MINUTES_JSON))) return;
    setCopied(true);
    if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout((): void => setCopied(false), COPIED_RESET_MS);
  };

  return (
    <div className="flex gap-3">
      <AgentAvatar />
      <div className="min-w-0 flex-1 space-y-3">
        {/* Progress steps, collapsed like the production panel */}
        <div>
          <button
            type="button"
            onClick={(): void => setStepsOpen((open) => !open)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            aria-expanded={stepsOpen}
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
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

        {/* Summary and JSON side by side from lg so the whole reply fits without scrolling */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-6">
          <div className="space-y-3">
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
          </div>
          <JsonBlock />
        </div>

        {/* Action row: regenerate / copy / feedback, as in the production panel */}
        <div className="flex flex-wrap items-center gap-1">
          <IconButton label="重新生成" onClick={onUnavailable}>
            <RefreshCw className="size-4" />
          </IconButton>
          <IconButton label={copied ? "已複製" : "複製"} onClick={(): void => void copyJson()}>
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
          </IconButton>
          <IconButton label="有幫助" onClick={onUnavailable}>
            <ThumbsUp className="size-4" />
          </IconButton>
          <IconButton label="沒有幫助" onClick={onUnavailable}>
            <ThumbsDown className="size-4" />
          </IconButton>
          <button
            type="button"
            onClick={onOpenWorkbench}
            className="ml-auto inline-flex items-center gap-1.5 rounded-sm bg-primary px-2.5 py-1.5 text-xs text-primary-foreground transition-colors hover:bg-primary/90"
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
    (entry: ChatEntry | null): void => {
      clearTimer();
      if (entry) setEntries((prev) => [...prev, entry]);
      timerRef.current = window.setTimeout((): void => {
        timerRef.current = null;
        setEntries((prev) => [...prev, { id: nextId(), kind: "notice" }]);
      }, entry ? NOTICE_DELAY_MS : 0);
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

  const unavailable = useCallback((): void => {
    pushWithNotice(null);
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
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{ASSISTANT_TITLE}</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          透過 Aily 智能助手協助處理會議記錄相關問題
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex h-[calc(100vh-15rem)] min-h-[560px] flex-col overflow-hidden rounded-sm border border-border bg-card">
          {/* Panel header */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">{PANEL_TITLE}</p>
            <IconButton label="重新開始" onClick={reset}>
              <RefreshCw className="size-3.5" />
            </IconButton>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-5">
              <p className="text-center text-[11px] tracking-wide text-muted-foreground">
                {EXAMPLE_LABEL}
              </p>
              <UploadBubble name={EXAMPLE_UPLOAD_NAME} />
              <ExampleReply
                rows={rows}
                onOpenWorkbench={openWorkbench}
                onUnavailable={unavailable}
              />

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
                return <NoticeCard key={entry.id} />;
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
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
              >
                <ArrowUp className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AilyAssistantPage;
