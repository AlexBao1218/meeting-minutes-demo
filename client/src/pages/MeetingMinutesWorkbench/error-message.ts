interface ApiErrorShape {
  response?: {
    data?: {
      error?: { message?: unknown };
      message?: unknown;
    };
  };
}

function readMessage(value: unknown): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && value.length > 0) {
    return (value as string[]).join("；");
  }
  return "";
}

export function extractErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const data: NonNullable<ApiErrorShape["response"]>["data"] =
      (error as ApiErrorShape).response?.data;
    const wrapped: string = readMessage(data?.error?.message);
    if (wrapped.length > 0) {
      return wrapped;
    }
    const plain: string = readMessage(data?.message);
    if (plain.length > 0) {
      return plain;
    }
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return "操作失敗，請重試";
}
