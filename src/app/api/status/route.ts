// API endpoint for sync status and statistics

import { NextResponse } from "next/server";
import { getSyncStatus } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getSyncStatus();

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
