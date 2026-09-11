import { useMemo } from "react";
import { cleanJsonText } from "@shared/minutes";
import type { MinutesJson } from "@shared/minutes";
import { locateJsonError } from "./json-error-locate";
import type { JsonErrorLocation } from "./json-error-locate";

export type JsonValidationStatus = "empty" | "valid" | "invalid";

export interface JsonValidationResult {
  status: JsonValidationStatus;
  data: MinutesJson | null;
  errorMessage: string;
}

function locateErrorPosition(
  text: string,
  message: string,
): { line: number; column: number } | null {
  const lineColumn: RegExpMatchArray | null = message.match(
    /line (\d+) column (\d+)/iu,
  );
  if (lineColumn) {
    return {
      line: Number(lineColumn[1]),
      column: Number(lineColumn[2]),
    };
  }
  const positionMatch: RegExpMatchArray | null = message.match(
    /position (\d+)/iu,
  );
  if (!positionMatch) {
    return null;
  }
  const position: number = Number(positionMatch[1]);
  const before: string = text.slice(0, position);
  const line: number = (before.match(/\n/gu)?.length ?? 0) + 1;
  const lastNewline: number = before.lastIndexOf("\n");
  return { line, column: position - lastNewline };
}

export function useJsonValidation(jsonText: string): JsonValidationResult {
  return useMemo((): JsonValidationResult => {
    if (jsonText.trim().length === 0) {
      return { status: "empty", data: null, errorMessage: "" };
    }
    const cleaned: string = cleanJsonText(jsonText);
    try {
      const data: unknown = JSON.parse(cleaned);
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        return {
          status: "invalid",
          data: null,
          errorMessage: "JSON 最外層必須是物件（{ ... }）",
        };
      }
      return {
        status: "valid",
        data: data as MinutesJson,
        errorMessage: "",
      };
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : String(error);
      const native: { line: number; column: number } | null =
        locateErrorPosition(cleaned, message);
      if (native) {
        return {
          status: "invalid",
          data: null,
          errorMessage: `JSON 格式錯誤：第 ${native.line} 行第 ${native.column} 列 — ${message}`,
        };
      }
      const scanned: JsonErrorLocation | null = locateJsonError(cleaned);
      if (scanned) {
        return {
          status: "invalid",
          data: null,
          errorMessage: `JSON 格式錯誤：第 ${scanned.line} 行第 ${scanned.column} 列 — ${scanned.reason}`,
        };
      }
      return {
        status: "invalid",
        data: null,
        errorMessage: `JSON 格式錯誤：${message}`,
      };
    }
  }, [jsonText]);
}
