"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";

interface FiltersProps {
  venues: { id: string; name: string }[];
}

export default function Filters({ venues }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);

  // Get current filter values from URL
  const currentType = searchParams.get("type") || "";
  const currentVenue = searchParams.get("venue") || "";
  const currentMinScore = searchParams.get("minScore") || "";
  const currentMinSpread = searchParams.get("minSpread") || "";

  const updateFilters = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearAllFilters = () => {
    router.push("/");
  };

  const hasFilters = currentType || currentVenue || currentMinScore || currentMinSpread;

  return (
    <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasFilters && (
            <span className="bg-[var(--primary)] text-white text-xs px-1.5 py-0.5 rounded-full">
              Active
            </span>
          )}
        </button>

        {hasFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Type filter */}
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
              Opportunity Type
            </label>
            <select
              value={currentType}
              onChange={(e) => updateFilters("type", e.target.value)}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="">All types</option>
              <option value="cross_venue_divergence">Price Divergence</option>
              <option value="arbitrage">Arbitrage</option>
              <option value="internal_sanity">Sanity Check</option>
            </select>
          </div>

          {/* Venue filter */}
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
              Venue
            </label>
            <select
              value={currentVenue}
              onChange={(e) => updateFilters("venue", e.target.value)}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="">All venues</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>

          {/* Min score filter */}
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
              Min Score
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="5"
              value={currentMinScore}
              onChange={(e) => updateFilters("minScore", e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          {/* Min spread filter */}
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
              Min Spread (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={currentMinSpread ? (parseFloat(currentMinSpread) * 100).toString() : ""}
              onChange={(e) => {
                const value = e.target.value
                  ? (parseFloat(e.target.value) / 100).toString()
                  : "";
                updateFilters("minSpread", value);
              }}
              placeholder="0"
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {hasFilters && !isOpen && (
        <div className="flex flex-wrap gap-2 mt-2">
          {currentType && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--secondary)] rounded-full">
              Type: {currentType.replace(/_/g, " ")}
              <button
                onClick={() => updateFilters("type", "")}
                className="hover:text-[var(--destructive)]"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentVenue && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--secondary)] rounded-full">
              Venue: {venues.find((v) => v.id === currentVenue)?.name || currentVenue}
              <button
                onClick={() => updateFilters("venue", "")}
                className="hover:text-[var(--destructive)]"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentMinScore && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--secondary)] rounded-full">
              Min Score: {currentMinScore}
              <button
                onClick={() => updateFilters("minScore", "")}
                className="hover:text-[var(--destructive)]"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentMinSpread && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--secondary)] rounded-full">
              Min Spread: {(parseFloat(currentMinSpread) * 100).toFixed(1)}%
              <button
                onClick={() => updateFilters("minSpread", "")}
                className="hover:text-[var(--destructive)]"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
