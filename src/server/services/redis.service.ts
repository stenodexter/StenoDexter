import { Redis } from "@upstash/redis";
import { TRPCError } from "@trpc/server";
import { env } from "~/env";

export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  // ---------------------------------------------------------------------------
  // Rate limiting
  //
  // Fixed-window via atomic Lua script (INCR + EXPIRE on first hit).
  // Keys are namespaced as:  rl:<route>:<ip>
  // ---------------------------------------------------------------------------

  /**
   * Extracts the real client IP from common proxy headers.
   * Priority: Cloudflare → Nginx → forwarded chain → "unknown"
   */
  extractIp(headers: Headers): string {
    return (
      headers.get("cf-connecting-ip") ??
      headers.get("x-real-ip") ??
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown"
    );
  }

  async rateLimit(key: string, limit: number, windowSec: number) {
    const result = await this.client.eval(
      `
      local current = redis.call("INCR", KEYS[1])
      if current == 1 then
        redis.call("EXPIRE", KEYS[1], ARGV[1])
      end
      return current
      `,
      [key],
      [windowSec],
    );

    const count = result as number;
    const ttl = await this.client.ttl(key);

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      /** seconds until the window resets */
      reset: ttl < 0 ? windowSec : ttl,
    };
  }

  /**
   * Rate-limit guard for tRPC procedures, keyed by IP + route.
   * Throws TOO_MANY_REQUESTS when the limit is exceeded.
   *
   * @example
   * export const myProcedure = publicProcedure.use(({ ctx, next, path }) =>
   *   redisService
   *     .rateLimitOrThrow({ headers: ctx.headers, route: path }, 20, 60)
   *     .then(() => next({ ctx }))
   * );
   */
  async rateLimitOrThrow(
    { headers, route }: { headers?: Headers; route: string },
    limit: number,
    windowSec: number,
  ): Promise<void> {
    let ip = "";
    if (headers) ip = this.extractIp(headers);
    const key = `rl:${route}:${ip}`;
    const { allowed, reset } = await this.rateLimit(key, limit, windowSec);

    if (!allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Try again in ${reset}s.`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Cache
  // ---------------------------------------------------------------------------

  /**
   * Read-through cache. Writes are fire-and-forget so they never block the
   * response.
   */
  async cache<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSec: number,
  ): Promise<T> {
    const cached = await this.client.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await fn();

    void this.client.set(key, fresh, { ex: ttlSec });

    return fresh;
  }

  // ---------------------------------------------------------------------------
  // Low-level helpers
  // ---------------------------------------------------------------------------

  async get<T>(key: string): Promise<T | null> {
    return this.client.get<T>(key);
  }

  async set(key: string, value: unknown, ttlSec?: number) {
    return this.client.set(key, value, ttlSec ? { ex: ttlSec } : undefined);
  }

  async del(key: string) {
    return this.client.del(key);
  }

  async incr(key: string, by = 1) {
    return this.client.incrby(key, by);
  }

  async decr(key: string, by = 1) {
    return this.client.incrby(key, -by);
  }
}

export const redisService = new RedisService();
