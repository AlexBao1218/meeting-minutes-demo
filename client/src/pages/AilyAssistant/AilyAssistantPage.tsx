import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Bot, Info, MessageCircleQuestion, SendHorizontal, SquarePen } from "lucide-react";
import { ASSISTANT_TITLE, NOT_AVAILABLE_LABEL, WRITEUP_URL } from "@/lib/brand";
import { NOTICE_TEXT, SUGGESTED_QUESTIONS, WELCOME_MESSAGE } from "@/data/ai";

/**
 * Visual replica of the Feishu Aily chat panel that the production page
 * mounted with `initAilyChat(container, { appKey })`. No answers are
 * generated: every user message is followed by an explicit
 * "not available in public demo" notice.
 */

/** Pause before the notice card appears, so the exchange reads as a reply */
const NOTICE_DELAY_MS = 500;

type ChatEntry =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "notice" };

let entrySeq = 0;
const nextId = (): number => ++entrySeq;

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

const AilyAssistantPage = () => {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState<string>("");
  const timerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const reset = useCallback((): void => {
    clearTimer();
    setEntries([]);
    setInput("");
  }, [clearTimer]);

  const send = useCallback(
    (raw: string): void => {
      const text: string = raw.trim();
      if (!text) return;
      clearTimer();
      setEntries((prev) => [...prev, { id: nextId(), kind: "user", text }]);
      setInput("");
      timerRef.current = window.setTimeout((): void => {
        timerRef.current = null;
        setEntries((prev) => [...prev, { id: nextId(), kind: "notice" }]);
      }, NOTICE_DELAY_MS);
    },
    [clearTimer],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(input);
    }
  };

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
        <div className="flex h-[600px] flex-col overflow-hidden rounded-sm border border-border bg-card">
          {/* Connection strip */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-b border-border px-4 py-2">
            <span className="size-2 rounded-full bg-muted-foreground/40" aria-hidden="true" />
            <span
              className="text-xs text-muted-foreground"
              title={`${NOT_AVAILABLE_LABEL} · the production panel connected to a Feishu Aily agent`}
            >
              Demo mode · AI disconnected
            </span>
          </div>

          {/* Agent header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Bot className="size-5" aria-hidden="true" />
            </div>
            <p className="min-w-0 flex-1 truncate text-base font-medium text-foreground">
              會議記錄助手
            </p>
            <button
              type="button"
              onClick={reset}
              aria-label="新對話"
              className="inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <SquarePen className="size-[18px]" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-6">
              <p className="max-w-2xl text-sm leading-6 text-foreground">{WELCOME_MESSAGE}</p>

              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageCircleQuestion className="size-3.5" aria-hidden="true" />
                  <span>試試這樣問</span>
                </div>
                <div className="flex flex-col items-start gap-2">
                  {SUGGESTED_QUESTIONS.map((question: string) => (
                    <button
                      key={question}
                      type="button"
                      onClick={(): void => send(question)}
                      className="w-fit max-w-full rounded-sm bg-muted px-3.5 py-2 text-left text-sm leading-snug text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>

              {entries.map((entry: ChatEntry) =>
                entry.kind === "user" ? (
                  <div key={entry.id} className="flex justify-end">
                    <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-sm bg-primary px-3.5 py-2.5 text-sm leading-6 text-primary-foreground sm:max-w-[75%]">
                      {entry.text}
                    </p>
                  </div>
                ) : (
                  <div key={entry.id} className="flex justify-start">
                    <NoticeCard />
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-border px-4 py-3">
            <div className="flex items-end gap-2 rounded-sm border border-input bg-background px-3 py-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
              <textarea
                value={input}
                onChange={(event): void => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="輸入問題，Enter 發送"
                className="max-h-32 min-h-6 flex-1 resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-muted-foreground"
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
