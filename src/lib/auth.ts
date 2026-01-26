// Authentication utilities for API routes

import { NextRequest, NextResponse } from "next/server";

export type AuthResult =
  | { authorized: true }
  | { authorized: false; response: NextResponse };

/**
 * Verify admin API key authentication
 * Requires ADMIN_API_KEY environment variable to be set
 */
export function verifyAdminAuth(request: NextRequest): AuthResult {
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    console.error("ADMIN_API_KEY environment variable is not set");
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      ),
    };
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      ),
    };
  }

  // Support both "Bearer <token>" and raw token
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  // Use timing-safe comparison to prevent timing attacks
  if (!timingSafeEqual(token, adminKey)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Invalid API key" }, { status: 401 }),
    };
  }

  return { authorized: true };
}

/**
 * Verify cron secret authentication
 * Always requires CRON_SECRET to be set (fixes the bypass bug)
 */
export function verifyCronAuth(request: NextRequest): AuthResult {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not set");
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Server configuration error - CRON_SECRET not configured" },
        { status: 500 }
      ),
    };
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!timingSafeEqual(token, cronSecret)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { authorized: true };
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do comparison to maintain constant time
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
