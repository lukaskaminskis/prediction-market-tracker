"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, Settings, RefreshCw } from "lucide-react";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-[var(--card)] border-b border-[var(--border)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and title */}
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-[var(--primary)] p-2 rounded-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">PredictTracker</h1>
              <p className="text-xs text-[var(--muted-foreground)] hidden sm:block">
                Prediction Market Inconsistency Tracker
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                pathname === "/"
                  ? "bg-[var(--secondary)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              Opportunities
            </Link>
            <Link
              href="/admin"
              className={`px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-1 ${
                pathname === "/admin"
                  ? "bg-[var(--secondary)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <Settings className="h-4 w-4" />
              Admin
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
