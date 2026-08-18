import type { Request } from "express";
import { resolveRateLimitScale } from "@shared/rateLimitConfig";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function getClientIp(req: Request): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = Array.isArray(xForwardedFor) 
      ? xForwardedFor[0] 
      : xForwardedFor.split(',')[0];
    const cleanIp = ips?.trim();
    if (cleanIp && cleanIp !== 'unknown') {
      return cleanIp;
    }
  }
  
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Scales every cap below together.
 *
 * 1 in production and by default. Raised only for a test run, where every
 * request arrives from one IP and a cap meant to describe one person's
 * behaviour describes the whole suite instead. Read once at startup: these
 * limits should not change under a running process.
 */
const SCALE = resolveRateLimitScale(process.env.RATE_LIMIT_SCALE);

export function rateLimit(key: string, maxAttempts: number, windowMs: number): { allowed: boolean; remaining: number; resetIn: number } {
  maxAttempts = maxAttempts * SCALE;
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetIn: windowMs };
  }
  
  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }
  
  entry.count++;
  return { allowed: true, remaining: maxAttempts - entry.count, resetIn: entry.resetTime - now };
}

setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (let i = 0; i < entries.length; i++) {
    const [key, entry] = entries[i];
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);
