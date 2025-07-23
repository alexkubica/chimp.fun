import { promises as fs } from "fs";
import path from "path";

interface LogEntry {
  endpoint: string;
  method: string;
  timestamp: string;
  status: number;
  responseTime: number;
  ip?: string;
  userAgent?: string;
}

const LOG_FILE_PATH = path.join(process.cwd(), "tmp", "api-usage.log");

async function ensureLogFileExists(): Promise<void> {
  try {
    await fs.access(LOG_FILE_PATH);
  } catch {
    // Create tmp directory if it doesn't exist
    const tmpDir = path.dirname(LOG_FILE_PATH);
    try {
      await fs.access(tmpDir);
    } catch {
      await fs.mkdir(tmpDir, { recursive: true });
    }
    // Create empty log file
    await fs.writeFile(LOG_FILE_PATH, "");
  }
}

export async function logAPIUsage(
  endpoint: string,
  method: string,
  status: number,
  responseTime: number,
  ip?: string,
  userAgent?: string,
): Promise<void> {
  try {
    await ensureLogFileExists();

    const logEntry: LogEntry = {
      endpoint,
      method,
      timestamp: new Date().toISOString(),
      status,
      responseTime,
      ip,
      userAgent,
    };

    const logLine = JSON.stringify(logEntry) + "\n";
    await fs.appendFile(LOG_FILE_PATH, logLine);
  } catch (error) {
    console.warn("Failed to log API usage:", error);
    // Don't throw - logging should not break the API
  }
}

export function createAPILogger() {
  return {
    log: logAPIUsage,

    // Helper to wrap a function with logging
    wrap: <T extends any[], R>(
      endpoint: string,
      method: string,
      fn: (...args: T) => Promise<R>,
    ) => {
      return async (...args: T): Promise<R> => {
        const startTime = Date.now();
        let status = 200;

        try {
          const result = await fn(...args);
          return result;
        } catch (error) {
          status = 500;
          throw error;
        } finally {
          const responseTime = Date.now() - startTime;
          await logAPIUsage(endpoint, method, status, responseTime);
        }
      };
    },
  };
}
