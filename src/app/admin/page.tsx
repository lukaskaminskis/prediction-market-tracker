"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  Link2,
  Unlink,
  Plus,
  Check,
  X,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface Outcome {
  id: string;
  name: string;
  price: number;
}

interface Venue {
  id: string;
  name: string;
}

interface MarketGroup {
  id: string;
  canonicalTitle: string;
  isVerified: boolean;
}

interface Market {
  id: string;
  externalId: string;
  title: string;
  category?: string;
  url?: string;
  volume?: number;
  liquidity?: number;
  updatedAt: string;
  outcomes: Outcome[];
  venue: Venue;
  group?: MarketGroup;
}

interface Group {
  id: string;
  canonicalTitle: string;
  category?: string;
  isVerified: boolean;
  markets: Market[];
}

export default function AdminPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState("");
  const [showUnmatched, setShowUnmatched] = useState(true);
  const [selectedMarkets, setSelectedMarkets] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedVenue) params.set("venue", selectedVenue);
      if (showUnmatched) params.set("unmatched", "true");

      const [marketsRes, groupsRes] = await Promise.all([
        fetch(`/api/admin/markets?${params.toString()}`),
        fetch("/api/groups"),
      ]);

      const marketsData = await marketsRes.json();
      const groupsData = await groupsRes.json();

      setMarkets(marketsData.markets || []);
      setGroups(groupsData.groups || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedVenue, showUnmatched]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleMarketSelection = (marketId: string) => {
    const newSelection = new Set(selectedMarkets);
    if (newSelection.has(marketId)) {
      newSelection.delete(marketId);
    } else {
      newSelection.add(marketId);
    }
    setSelectedMarkets(newSelection);
  };

  const handleLinkToGroup = async () => {
    if (!selectedGroup || selectedMarkets.size === 0) return;

    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "link",
          marketIds: Array.from(selectedMarkets),
          groupId: selectedGroup,
        }),
      });

      if (response.ok) {
        setSelectedMarkets(new Set());
        setSelectedGroup(null);
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to link markets:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlink = async (marketIds: string[]) => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unlink",
          marketIds,
        }),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to unlink markets:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupTitle || selectedMarkets.size === 0) return;

    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createGroup",
          marketIds: Array.from(selectedMarkets),
          newGroupTitle,
        }),
      });

      if (response.ok) {
        setSelectedMarkets(new Set());
        setNewGroupTitle("");
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to create group:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyGroup = async (groupId: string, isVerified: boolean) => {
    try {
      await fetch("/api/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, isVerified }),
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to verify group:", error);
    }
  };

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Admin: Market Matching</h1>
        <p className="text-[var(--muted-foreground)]">
          Review and correct market matches across venues
        </p>
      </div>

      {/* Controls */}
      <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search markets..."
              className="w-full pl-9 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          {/* Venue filter */}
          <select
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
            className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            <option value="">All venues</option>
            <option value="polymarket">Polymarket</option>
            <option value="kalshi">Kalshi</option>
            <option value="manifold">Manifold</option>
          </select>

          {/* Unmatched toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnmatched}
              onChange={(e) => setShowUnmatched(e.target.checked)}
              className="rounded border-[var(--border)]"
            />
            <span className="text-sm">Show only unmatched</span>
          </label>

          {/* Refresh */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-md text-sm hover:opacity-90"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Actions for selected markets */}
        {selectedMarkets.size > 0 && (
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-[var(--border)]">
            <span className="text-sm font-medium">
              {selectedMarkets.size} market(s) selected
            </span>

            {/* Link to existing group */}
            <div className="flex items-center gap-2">
              <select
                value={selectedGroup || ""}
                onChange={(e) => setSelectedGroup(e.target.value || null)}
                className="px-2 py-1 bg-[var(--background)] border border-[var(--border)] rounded text-sm"
              >
                <option value="">Select group...</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.canonicalTitle.substring(0, 50)}...
                  </option>
                ))}
              </select>
              <button
                onClick={handleLinkToGroup}
                disabled={!selectedGroup || actionLoading}
                className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-sm disabled:opacity-50"
              >
                <Link2 className="h-3 w-3" />
                Link
              </button>
            </div>

            {/* Create new group */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newGroupTitle}
                onChange={(e) => setNewGroupTitle(e.target.value)}
                placeholder="New group title..."
                className="px-2 py-1 bg-[var(--background)] border border-[var(--border)] rounded text-sm w-48"
              />
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupTitle || actionLoading}
                className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-sm disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                Create Group
              </button>
            </div>

            {/* Clear selection */}
            <button
              onClick={() => setSelectedMarkets(new Set())}
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unmatched markets */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {showUnmatched ? "Unmatched Markets" : "All Markets"} ({markets.length})
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
            </div>
          ) : markets.length === 0 ? (
            <div className="text-center py-12 bg-[var(--card)] rounded-lg border border-[var(--border)]">
              <p className="text-[var(--muted-foreground)]">No markets found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {markets.map((market) => (
                <div
                  key={market.id}
                  className={`p-3 bg-[var(--card)] rounded-lg border cursor-pointer transition-colors ${
                    selectedMarkets.has(market.id)
                      ? "border-[var(--primary)] bg-blue-50 dark:bg-blue-950"
                      : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                  }`}
                  onClick={() => toggleMarketSelection(market.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedMarkets.has(market.id)}
                      onChange={() => toggleMarketSelection(market.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 bg-[var(--secondary)] rounded">
                          {market.venue.name}
                        </span>
                        {market.category && (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {market.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium line-clamp-2">{market.title}</p>
                      <div className="flex gap-3 mt-1 text-xs text-[var(--muted-foreground)]">
                        {market.outcomes.map((o) => (
                          <span key={o.id}>
                            {o.name}: {(o.price * 100).toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Existing groups */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            Market Groups ({groups.length})
          </h2>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-[var(--card)] rounded-lg border border-[var(--border)]"
              >
                <div
                  className="p-3 cursor-pointer hover:bg-[var(--muted)]"
                  onClick={() => toggleGroupExpansion(group.id)}
                >
                  <div className="flex items-center gap-2">
                    {expandedGroups.has(group.id) ? (
                      <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 bg-[var(--secondary)] rounded">
                          {group.markets.length} markets
                        </span>
                        {group.isVerified ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Verified
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600">Unverified</span>
                        )}
                      </div>
                      <p className="text-sm font-medium line-clamp-2">
                        {group.canonicalTitle}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!group.isVerified && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerifyGroup(group.id, true);
                          }}
                          className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                          title="Verify match"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      {group.isVerified && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerifyGroup(group.id, false);
                          }}
                          className="p-1 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900 rounded"
                          title="Unverify match"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {expandedGroups.has(group.id) && (
                  <div className="border-t border-[var(--border)] p-3 space-y-2">
                    {group.markets.map((market) => (
                      <div
                        key={market.id}
                        className="flex items-center justify-between p-2 bg-[var(--muted)] rounded text-sm"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs px-1.5 py-0.5 bg-[var(--background)] rounded">
                            {market.venue.name}
                          </span>
                          <span className="truncate">{market.title}</span>
                        </div>
                        <button
                          onClick={() => handleUnlink([market.id])}
                          className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                          title="Remove from group"
                        >
                          <Unlink className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
