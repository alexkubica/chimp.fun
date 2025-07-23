import { NextResponse } from "next/server";
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
  rateLimitRemaining?: number;
  cost?: number;
}

interface ServiceUsageData {
  service: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  successRate: number;
  lastCalled: string;
  rateLimitStatus?: number;
  totalCost?: number;
}

interface ExternalAPIStats {
  totalCalls: number;
  totalErrors: number;
  averageResponseTime: number;
  uniqueServices: number;
  callsToday: number;
  serviceStats: ServiceUsageData[];
  recentActivity: ExternalAPICall[];
  dailyUsage: Array<{
    date: string;
    calls: number;
    errors: number;
  }>;
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

async function readExternalAPILogs(): Promise<ExternalAPICall[]> {
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
          return JSON.parse(line) as ExternalAPICall;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is ExternalAPICall => entry !== null);
  } catch {
    return [];
  }
}

function analyzeExternalAPIUsage(calls: ExternalAPICall[]): ExternalAPIStats {
  if (calls.length === 0) {
    return {
      totalCalls: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      uniqueServices: 0,
      callsToday: 0,
      serviceStats: [],
      recentActivity: [],
      dailyUsage: [],
    };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Calculate basic stats
  const totalCalls = calls.length;
  const totalErrors = calls.filter((call) => !call.success).length;
  const averageResponseTime =
    calls.reduce((sum, call) => sum + call.responseTime, 0) / totalCalls;
  const callsToday = calls.filter(
    (call) => new Date(call.timestamp) >= todayStart,
  ).length;

  // Group by service
  const serviceGroups = new Map<string, ExternalAPICall[]>();
  calls.forEach((call) => {
    if (!serviceGroups.has(call.service)) {
      serviceGroups.set(call.service, []);
    }
    serviceGroups.get(call.service)!.push(call);
  });

  // Calculate service stats
  const serviceStats: ServiceUsageData[] = Array.from(serviceGroups.entries())
    .map(([service, serviceCalls]) => {
      const totalCalls = serviceCalls.length;
      const successfulCalls = serviceCalls.filter(
        (call) => call.success,
      ).length;
      const failedCalls = totalCalls - successfulCalls;
      const averageResponseTime =
        serviceCalls.reduce((sum, call) => sum + call.responseTime, 0) /
        totalCalls;
      const successRate = (successfulCalls / totalCalls) * 100;
      const lastCalled = serviceCalls.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )[0].timestamp;

      // Get latest rate limit info
      const latestCallWithRateLimit = serviceCalls
        .filter((call) => call.rateLimitRemaining !== undefined)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )[0];

      const totalCost = serviceCalls.reduce(
        (sum, call) => sum + (call.cost || 0),
        0,
      );

      return {
        service,
        totalCalls,
        successfulCalls,
        failedCalls,
        averageResponseTime,
        successRate,
        lastCalled,
        rateLimitStatus: latestCallWithRateLimit?.rateLimitRemaining,
        totalCost: totalCost > 0 ? totalCost : undefined,
      };
    })
    .sort((a, b) => b.totalCalls - a.totalCalls);

  // Calculate daily usage for the last 7 days
  const dailyUsage = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayCalls = calls.filter((call) => {
      const callDate = new Date(call.timestamp);
      return callDate >= dayStart && callDate < dayEnd;
    });

    dailyUsage.push({
      date: dayStart.toISOString().split("T")[0],
      calls: dayCalls.length,
      errors: dayCalls.filter((call) => !call.success).length,
    });
  }

  // Get recent activity (last 20 calls)
  const recentActivity = calls
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 20);

  return {
    totalCalls,
    totalErrors,
    averageResponseTime,
    uniqueServices: serviceGroups.size,
    callsToday,
    serviceStats,
    recentActivity,
    dailyUsage,
  };
}

export async function GET() {
  try {
    const calls = await readExternalAPILogs();
    const stats = analyzeExternalAPIUsage(calls);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching external API analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch external API analytics data" },
      { status: 500 },
    );
  }
}
