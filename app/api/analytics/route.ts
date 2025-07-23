import { NextResponse } from "next/server";
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

interface APIUsageData {
  endpoint: string;
  method: string;
  count: number;
  averageResponseTime: number;
  lastCalled: string;
  errorCount: number;
  successRate: number;
}

interface UsageStats {
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  uniqueEndpoints: number;
  requestsToday: number;
  topEndpoints: APIUsageData[];
  recentActivity: LogEntry[];
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

async function readLogEntries(): Promise<LogEntry[]> {
  await ensureLogFileExists();

  try {
    const content = await fs.readFile(LOG_FILE_PATH, "utf-8");
    if (!content.trim()) return [];

    return content
      .trim()
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is LogEntry => entry !== null);
  } catch {
    return [];
  }
}

function analyzeLogEntries(entries: LogEntry[]): UsageStats {
  if (entries.length === 0) {
    return {
      totalRequests: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      uniqueEndpoints: 0,
      requestsToday: 0,
      topEndpoints: [],
      recentActivity: [],
    };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Calculate basic stats
  const totalRequests = entries.length;
  const totalErrors = entries.filter((e) => e.status >= 400).length;
  const averageResponseTime =
    entries.reduce((sum, e) => sum + e.responseTime, 0) / totalRequests;
  const requestsToday = entries.filter(
    (e) => new Date(e.timestamp) >= todayStart,
  ).length;

  // Group by endpoint and method
  const endpointStats = new Map<
    string,
    {
      count: number;
      responseTimes: number[];
      errors: number;
      lastCalled: string;
    }
  >();

  entries.forEach((entry) => {
    const key = `${entry.method} ${entry.endpoint}`;
    const existing = endpointStats.get(key) || {
      count: 0,
      responseTimes: [],
      errors: 0,
      lastCalled: entry.timestamp,
    };

    existing.count++;
    existing.responseTimes.push(entry.responseTime);
    if (entry.status >= 400) existing.errors++;
    if (new Date(entry.timestamp) > new Date(existing.lastCalled)) {
      existing.lastCalled = entry.timestamp;
    }

    endpointStats.set(key, existing);
  });

  // Convert to APIUsageData and sort by count
  const topEndpoints: APIUsageData[] = Array.from(endpointStats.entries())
    .map(([key, stats]) => {
      const [method, endpoint] = key.split(" ", 2);
      return {
        endpoint,
        method,
        count: stats.count,
        averageResponseTime:
          stats.responseTimes.reduce((a, b) => a + b, 0) /
          stats.responseTimes.length,
        lastCalled: stats.lastCalled,
        errorCount: stats.errors,
        successRate: ((stats.count - stats.errors) / stats.count) * 100,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Get recent activity (last 20 entries)
  const recentActivity = entries
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 20);

  return {
    totalRequests,
    totalErrors,
    averageResponseTime,
    uniqueEndpoints: endpointStats.size,
    requestsToday,
    topEndpoints,
    recentActivity,
  };
}

export async function GET() {
  try {
    const entries = await readLogEntries();
    const stats = analyzeLogEntries(entries);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 },
    );
  }
}
