"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/skeleton";
import {
  getRecentActivities,
  getSessionActivities,
  getActivityStats,
} from "@/lib/services/activity";
import type { EditorActivity } from "@/types/database";
import {
  AiOutlineDownload,
  AiOutlineCopy,
  AiOutlineEye,
} from "react-icons/ai";
import { FiShare } from "react-icons/fi";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import Link from "next/link";

// Activity type icons
const getActivityIcon = (type: string) => {
  switch (type) {
    case "generation":
      return "🎨";
    case "download":
      return <AiOutlineDownload className="w-4 h-4" />;
    case "copy":
      return <AiOutlineCopy className="w-4 h-4" />;
    case "share":
      return <FiShare className="w-4 h-4" />;
    default:
      return <AiOutlineEye className="w-4 h-4" />;
  }
};

// Format activity type for display
const formatActivityType = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// Format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return date.toLocaleDateString();
};

// Activity card component
function ActivityCard({ activity }: { activity: EditorActivity }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
              {getActivityIcon(activity.activity_type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {formatActivityType(activity.activity_type)}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {activity.output_type.toUpperCase()}
                </Badge>
              </div>
              {activity.nft_collection && (
                <p className="text-sm text-muted-foreground mb-1">
                  Collection: {activity.nft_collection}
                  {activity.nft_token_id && ` #${activity.nft_token_id}`}
                </p>
              )}
              {activity.reaction_type && (
                <p className="text-sm text-muted-foreground mb-1">
                  Reaction: {activity.reaction_type}
                </p>
              )}
              {activity.user_wallet && (
                <p className="text-xs text-muted-foreground font-mono">
                  Wallet: {activity.user_wallet.slice(0, 8)}...
                  {activity.user_wallet.slice(-6)}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {formatDate(activity.created_at)}
            </p>
            {activity.output_url && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => window.open(activity.output_url!, "_blank")}
              >
                <AiOutlineEye className="w-3 h-3 mr-1" />
                View
              </Button>
            )}
          </div>
        </div>
        {activity.nft_image_url && (
          <div className="mt-3 pt-3 border-t">
            <img
              src={activity.nft_image_url}
              alt="NFT"
              className="w-16 h-16 rounded-lg object-cover"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Stats card component
function StatsCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-center">
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          <p className="text-sm font-medium">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<EditorActivity[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "session">("all");
  const { user } = useDynamicContext();

  // Load activities and stats
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [activitiesData, statsData] = await Promise.all([
          filter === "session"
            ? getSessionActivities()
            : getRecentActivities(100),
          getActivityStats(),
        ]);

        setActivities(activitiesData);
        setStats(statsData);
      } catch (error) {
        console.error("Error loading activity data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filter]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Spinner className="w-8 h-8 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading activities...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Editor Activity</h1>
          <p className="text-muted-foreground mt-1">
            Recent generated outputs and user activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/editor">
            <Button variant="outline">Back to Editor</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Activities"
            value={stats.totalActivities}
            subtitle="All time"
          />
          <StatsCard
            title="Last 24 Hours"
            value={stats.last24h}
            subtitle="Recent activity"
          />
          <StatsCard
            title="Generations"
            value={stats.activityTypes.generation || 0}
            subtitle="Content created"
          />
          <StatsCard
            title="Downloads"
            value={stats.activityTypes.download || 0}
            subtitle="Files saved"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All Activities
        </Button>
        <Button
          variant={filter === "session" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("session")}
        >
          My Session
        </Button>
      </div>

      {/* Activities List */}
      <div className="space-y-4">
        {activities.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-lg font-semibold mb-2">No activities yet</h3>
              <p className="text-muted-foreground mb-4">
                {filter === "session"
                  ? "You haven't created anything in this session yet."
                  : "No recent activities found."}
              </p>
              <Link href="/editor">
                <Button>Start Creating</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
            
            {activities.length >= 50 && (
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Showing latest {activities.length} activities
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}