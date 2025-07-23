"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Activity, Clock, TrendingUp, Server } from "lucide-react";

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
  recentActivity: Array<{
    endpoint: string;
    method: string;
    timestamp: string;
    status: number;
    responseTime: number;
  }>;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/analytics");
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch analytics",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "bg-green-500";
    if (status >= 400 && status < 500) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading && !stats) {
    return (
      <main className="flex flex-col items-center justify-center bg-[#f8fbff] px-4 py-8 min-h-screen">
        <div className="flex items-center gap-2 text-[#222]">
          <RefreshCw className="animate-spin" size={24} />
          <span className="text-lg">Loading analytics...</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-col items-center justify-center bg-[#f8fbff] px-4 py-8 min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              onClick={fetchAnalytics}
              className="bg-[#8DC7FF] hover:bg-[#5bb0f7]"
            >
              <RefreshCw size={16} className="mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="bg-[#f8fbff] px-4 py-8 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#222] mb-2">
              API Analytics
            </h1>
            <p className="text-gray-600">
              Monitor API usage and performance metrics
            </p>
          </div>
          <Button
            onClick={fetchAnalytics}
            disabled={loading}
            className="bg-[#8DC7FF] hover:bg-[#5bb0f7] self-start sm:self-auto"
          >
            <RefreshCw
              size={16}
              className={`mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity size={16} />
                Total Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#222]">
                {stats?.totalRequests?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {stats?.requestsToday || 0} today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock size={16} />
                Avg Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#222]">
                {stats?.averageResponseTime
                  ? formatResponseTime(stats.averageResponseTime)
                  : "N/A"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp size={16} />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#222]">
                {stats
                  ? `${(((stats.totalRequests - stats.totalErrors) / stats.totalRequests) * 100).toFixed(1)}%`
                  : "N/A"}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {stats?.totalErrors || 0} errors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Server size={16} />
                Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#222]">
                {stats?.uniqueEndpoints || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle>Top API Endpoints</CardTitle>
              <CardDescription>Most frequently used endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.topEndpoints?.length ? (
                  stats.topEndpoints.map((endpoint, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {endpoint.method}
                          </Badge>
                          <span className="font-medium text-sm truncate">
                            {endpoint.endpoint}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>{endpoint.count} calls</span>
                          <span>
                            {formatResponseTime(endpoint.averageResponseTime)}
                          </span>
                          <span
                            className={
                              endpoint.successRate >= 95
                                ? "text-green-600"
                                : endpoint.successRate >= 90
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }
                          >
                            {endpoint.successRate.toFixed(1)}% success
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No API usage data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest API requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.recentActivity?.length ? (
                  stats.recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className={`w-2 h-2 rounded-full ${getStatusColor(activity.status)}`}
                          />
                          <Badge variant="outline" className="text-xs">
                            {activity.method}
                          </Badge>
                          <span className="font-medium text-sm truncate">
                            {activity.endpoint}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>Status {activity.status}</span>
                          <span>
                            {formatResponseTime(activity.responseTime)}
                          </span>
                          <span>{formatTimestamp(activity.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No recent activity
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
