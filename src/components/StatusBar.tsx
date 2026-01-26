"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Database, TrendingUp, Layers } from "lucide-react";

interface SyncStatus {
  lastSync?: {
    id: string;
    startedAt: string;
    endedAt?: string;
    status: string;
    marketsProcessed: number;
    opportunitiesFound: number;
    error?: string;
  };
  stats: {
    markets: number;
    groups: number;
    activeOpportunities: number;
  };
}

export default function StatusBar() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/status");
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    }
  };

  const triggerRefresh = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/cron", { method: "POST" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Refresh failed");
      } else {
        // Refresh status after successful sync
        await fetchStatus();
        // Reload page to show new data
        window.location.reload();
      }
    } catch (err) {
      setError("Failed to trigger refresh");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Poll status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!status) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 animate-pulse">
        <div className="h-4 bg-[var(--muted)] rounded w-32"></div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Stats */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[var(--muted-foreground)]" />
            <span className="text-sm">
              <span className="font-semibold">{status.stats.markets}</span>{" "}
              <span className="text-[var(--muted-foreground)]">markets</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[var(--muted-foreground)]" />
            <span className="text-sm">
              <span className="font-semibold">{status.stats.groups}</span>{" "}
              <span className="text-[var(--muted-foreground)]">groups</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--muted-foreground)]" />
            <span className="text-sm">
              <span className="font-semibold">{status.stats.activeOpportunities}</span>{" "}
              <span className="text-[var(--muted-foreground)]">opportunities</span>
            </span>
          </div>
        </div>

        {/* Last sync and refresh button */}
        <div className="flex items-center gap-4">
          {status.lastSync && (
            <span className="text-sm text-[var(--muted-foreground)]">
              Last sync:{" "}
              {formatDistanceToNow(new Date(status.lastSync.startedAt), {
                addSuffix: true,
              })}
              {status.lastSync.status === "failed" && (
                <span className="text-red-500 ml-1">(failed)</span>
              )}
            </span>
          )}

          <button
            onClick={triggerRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--primary)] text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Syncing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-500 bg-red-50 dark:bg-red-950 px-3 py-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
