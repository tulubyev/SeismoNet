import axios from "axios";

/**
 * Compact one-line description of an error for logs.
 *
 * Axios errors carry the whole request/response/socket graph; printing one with
 * console.error dumps hundreds of lines per failure. External feeds (JMA, USGS)
 * return 404 routinely, so those logs drowned out everything else.
 */
export function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase() ?? "GET";
    const url = error.config?.url ?? "";
    return status ? `HTTP ${status} ${method} ${url}` : `${error.code ?? "network error"} ${method} ${url}`;
  }
  // pg wraps connection failures in an AggregateError with an empty message
  if (error instanceof AggregateError && error.errors.length > 0) {
    return `${(error as any).code ?? error.name}: ${describeError(error.errors[0])}`;
  }
  if (error instanceof Error) return error.message || (error as any).code || error.name;
  return String(error);
}
