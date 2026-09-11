export interface JsonErrorLocation {
  line: number;
  column: number;
  reason: string;
}

class JsonScanError extends Error {
  readonly pos: number;
  readonly reason: string;

  constructor(pos: number, reason: string) {
    super(reason);
    this.pos = pos;
    this.reason = reason;
  }
}

interface Cursor {
  pos: number;
}

function toLocation(text: string, pos: number, reason: string): JsonErrorLocation {
  const before: string = text.slice(0, pos);
  const line: number = (before.match(/\n/gu)?.length ?? 0) + 1;
  const lastNewline: number = before.lastIndexOf("\n");
  return { line, column: pos - lastNewline, reason };
}

function skipWhitespace(text: string, cursor: Cursor): void {
  while (cursor.pos < text.length && /[ \t\n\r]/u.test(text.charAt(cursor.pos))) {
    cursor.pos += 1;
  }
}

function parseString(text: string, cursor: Cursor): void {
  if (text.charAt(cursor.pos) !== "\"") {
    throw new JsonScanError(cursor.pos, "預期為字串（\"...\"）");
  }
  cursor.pos += 1;
  while (cursor.pos < text.length) {
    const ch: string = text.charAt(cursor.pos);
    if (ch === "\\") {
      cursor.pos += 2;
      continue;
    }
    if (ch === "\"") {
      cursor.pos += 1;
      return;
    }
    cursor.pos += 1;
  }
  throw new JsonScanError(cursor.pos, "字串未正確閉合");
}

function parseNumber(text: string, cursor: Cursor): void {
  const start: number = cursor.pos;
  while (cursor.pos < text.length && /[-+0-9.eE]/u.test(text.charAt(cursor.pos))) {
    cursor.pos += 1;
  }
  if (cursor.pos === start) {
    throw new JsonScanError(cursor.pos, "預期為數字");
  }
}

function parseLiteral(text: string, cursor: Cursor, literal: string): void {
  if (text.slice(cursor.pos, cursor.pos + literal.length) === literal) {
    cursor.pos += literal.length;
    return;
  }
  throw new JsonScanError(cursor.pos, `預期為 ${literal}`);
}

function parseObject(text: string, cursor: Cursor): void {
  cursor.pos += 1;
  skipWhitespace(text, cursor);
  if (text.charAt(cursor.pos) === "}") {
    cursor.pos += 1;
    return;
  }
  for (;;) {
    skipWhitespace(text, cursor);
    parseString(text, cursor);
    skipWhitespace(text, cursor);
    if (text.charAt(cursor.pos) !== ":") {
      throw new JsonScanError(cursor.pos, "預期為冒號 :");
    }
    cursor.pos += 1;
    parseValue(text, cursor);
    skipWhitespace(text, cursor);
    const ch: string = text.charAt(cursor.pos);
    if (ch === ",") {
      cursor.pos += 1;
      continue;
    }
    if (ch === "}") {
      cursor.pos += 1;
      return;
    }
    throw new JsonScanError(cursor.pos, "預期為逗號 , 或 }");
  }
}

function parseArray(text: string, cursor: Cursor): void {
  cursor.pos += 1;
  skipWhitespace(text, cursor);
  if (text.charAt(cursor.pos) === "]") {
    cursor.pos += 1;
    return;
  }
  for (;;) {
    parseValue(text, cursor);
    skipWhitespace(text, cursor);
    const ch: string = text.charAt(cursor.pos);
    if (ch === ",") {
      cursor.pos += 1;
      continue;
    }
    if (ch === "]") {
      cursor.pos += 1;
      return;
    }
    throw new JsonScanError(cursor.pos, "預期為逗號 , 或 ]");
  }
}

function parseValue(text: string, cursor: Cursor): void {
  skipWhitespace(text, cursor);
  if (cursor.pos >= text.length) {
    throw new JsonScanError(cursor.pos, "輸入在此中斷，預期更多內容");
  }
  const ch: string = text.charAt(cursor.pos);
  if (ch === "{") {
    parseObject(text, cursor);
    return;
  }
  if (ch === "[") {
    parseArray(text, cursor);
    return;
  }
  if (ch === "\"") {
    parseString(text, cursor);
    return;
  }
  if (ch === "-" || (ch >= "0" && ch <= "9")) {
    parseNumber(text, cursor);
    return;
  }
  if (ch === "t") {
    parseLiteral(text, cursor, "true");
    return;
  }
  if (ch === "f") {
    parseLiteral(text, cursor, "false");
    return;
  }
  if (ch === "n") {
    parseLiteral(text, cursor, "null");
    return;
  }
  throw new JsonScanError(cursor.pos, "無法識別的字元");
}

/**
 * 瀏覽器原生 JSON.parse 錯誤訊息可能不含行列號，
 * 此掃描器用於確定性地定位第一個出錯位置。
 */
export function locateJsonError(text: string): JsonErrorLocation | null {
  const cursor: Cursor = { pos: 0 };
  try {
    parseValue(text, cursor);
    skipWhitespace(text, cursor);
    if (cursor.pos < text.length) {
      return toLocation(text, cursor.pos, "JSON 結束後存在多餘內容");
    }
    return null;
  } catch (error) {
    if (error instanceof JsonScanError) {
      return toLocation(text, error.pos, error.reason);
    }
    return null;
  }
}
