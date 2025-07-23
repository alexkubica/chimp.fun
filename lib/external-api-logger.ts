import { promises as fs } from "fs";
import path from "path";

interface ExternalAPICall {
  service: string;
  endpoint: string;
  method: string;
  timestamp: string;
  responseTime: number;
  status: number;
  success: boolean;
  errorMessage?: string;
  requestSize?: number;
  responseSize?: number;
  rateLimitRemaining?: number;
  cost?: number; // For paid APIs
}

const LOG_FILE_PATH = path.join(process.cwd(), "tmp", "external-api-usage.log");

async function ensureLogFileExists(): Promise<void> {
  try {
    await fs.access(LOG_FILE_PATH);
  } catch {
    const tmpDir = path.dirname(LOG_FILE_PATH);
    try {
      await fs.access(tmpDir);
    } catch {
      await fs.mkdir(tmpDir, { recursive: true });
    }
    await fs.writeFile(LOG_FILE_PATH, "");
  }
}

export async function logExternalAPICall(call: ExternalAPICall): Promise<void> {
  try {
    await ensureLogFileExists();
    const logLine = JSON.stringify(call) + "\n";
    await fs.appendFile(LOG_FILE_PATH, logLine);
  } catch (error) {
    console.warn("Failed to log external API call:", error);
  }
}

// Wrapper function for fetch calls to external APIs
export async function trackedFetch(
  url: string,
  options: RequestInit = {},
  service: string,
): Promise<Response> {
  const startTime = Date.now();
  const parsedUrl = new URL(url);
  const endpoint = parsedUrl.pathname;
  const method = options.method || "GET";

  let response: Response;
  let success = false;
  let errorMessage: string | undefined;

  try {
    response = await fetch(url, options);
    success = response.ok;

    if (!response.ok) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    const responseTime = Date.now() - startTime;

    // Extract rate limit info if available
    const rateLimitRemaining =
      response.headers.get("x-ratelimit-remaining") ||
      response.headers.get("x-rate-limit-remaining");

    await logExternalAPICall({
      service,
      endpoint,
      method,
      timestamp: new Date().toISOString(),
      responseTime,
      status: response.status,
      success,
      errorMessage,
      rateLimitRemaining: rateLimitRemaining
        ? parseInt(rateLimitRemaining)
        : undefined,
    });

    return response;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    errorMessage = error instanceof Error ? error.message : "Unknown error";

    await logExternalAPICall({
      service,
      endpoint,
      method,
      timestamp: new Date().toISOString(),
      responseTime,
      status: 0,
      success: false,
      errorMessage,
    });

    throw error;
  }
}

// Specific wrappers for different services
export const createServiceLogger = (serviceName: string) => ({
  fetch: async (url: string, options?: RequestInit): Promise<Response> => {
    return trackedFetch(url, options, serviceName);
  },
});

// Pre-configured service loggers
export const etherscanLogger = createServiceLogger("Etherscan");
export const alchemyLogger = createServiceLogger("Alchemy");
export const openseaLogger = createServiceLogger("OpenSea");
export const moralisLogger = createServiceLogger("Moralis");
export const apescanLogger = createServiceLogger("ApeScan");
