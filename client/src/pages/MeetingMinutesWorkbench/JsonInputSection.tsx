import { FileJson, Loader2 } from "lucide-react";
import { Button } from "@client/src/components/ui/button";
import { Textarea } from "@client/src/components/ui/textarea";
import { SAMPLE_MINUTES_JSON } from "@/data/sample-minutes";
import type { JsonValidationResult } from "./useJsonValidation";

interface JsonInputSectionProps {
  value: string;
  onChange: (value: string) => void;
  validation: JsonValidationResult;
  generating: boolean;
  onGenerate: () => void;
}

const JsonInputSection = ({
  value,
  onChange,
  validation,
  generating,
  onGenerate,
}: JsonInputSectionProps) => {
  const canGenerate: boolean =
    validation.status === "valid" && !generating;

  return (
    <section className="flex flex-col gap-3 xl:h-full">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground">
          1 · 貼上 JSON
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={(): void => onChange(SAMPLE_MINUTES_JSON)}
          disabled={generating}
        >
          <FileJson className="size-4" />
          載入示例 JSON
        </Button>
      </div>
      <Textarea
        value={value}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
          onChange(event.target.value)
        }
        placeholder="請貼上 Agent 產生的 JSON"
        rows={14}
        className="h-[320px] max-h-[70vh] min-h-[200px] resize-y overflow-y-auto font-mono text-sm leading-6 [field-sizing:fixed]! xl:h-auto xl:max-h-none xl:min-h-[420px] xl:flex-1 xl:resize-none"
      />
      <div className="min-h-6 text-sm">
        {validation.status === "valid" && (
          <p className="font-medium text-success">格式正確</p>
        )}
        {validation.status === "invalid" && (
          <p className="break-words text-destructive">
            {validation.errorMessage}
          </p>
        )}
        {validation.status === "empty" && (
          <p className="text-muted-foreground">
            貼上內容後將即時校驗 JSON 格式
          </p>
        )}
      </div>
      <Button
        size="lg"
        className="self-start"
        disabled={!canGenerate}
        onClick={onGenerate}
      >
        {generating && <Loader2 className="size-4 animate-spin" />}
        {generating ? "生成中…" : "生成會議記錄"}
      </Button>
    </section>
  );
};

export default JsonInputSection;
