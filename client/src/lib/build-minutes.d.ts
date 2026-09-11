export interface BuildMinutesResult {
  content: Blob;
  filename: string;
  watermarksRemoved: number;
}

export function generate(
  input: string,
  templateBuffer: ArrayBuffer,
): Promise<BuildMinutesResult>;

export function parseInput(input: string | object): unknown;
export function suggestFilename(): string;
export const SECTIONS: [string, string][];
