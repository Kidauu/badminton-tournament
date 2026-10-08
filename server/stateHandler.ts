// Penyimpanan turnamen bersama: satu dokumen JSON di Redis (Upstash REST).
// Siapa pun boleh membaca; hanya admin (username + password) yang boleh menulis.

const STATE_KEY = "badminton-tournament:shared";
const FAIL_KEY_PREFIX = "badminton-tournament:login-fail:";
const MAX_FAILED_LOGINS = 10;
const FAIL_WINDOW_SECONDS = 15 * 60;

export interface StateHandlerConfig {
  redisUrl: string | undefined;
  redisToken: string | undefined;
  adminUsername: string | undefined;
  adminPassword: string | undefined;
}

interface StoredDocument {
  data: unknown;
  updatedAt: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Membaca header `Authorization: Basic base64(username:password)`. */
function readCredentials(request: Request): { username: string; password: string } | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), (char) => char.charCodeAt(0)));
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function createStateHandler(config: StateHandlerConfig) {
  async function redis(command: (string | number)[]): Promise<unknown> {
    const response = await fetch(config.redisUrl as string, {
      method: "POST",
      headers: { authorization: `Bearer ${config.redisToken}`, "content-type": "application/json" },
      body: JSON.stringify(command),
    });
    if (!response.ok) throw new Error(`Redis ${response.status}`);
    return ((await response.json()) as { result: unknown }).result;
  }

  async function readDocument(): Promise<StoredDocument | null> {
    const raw = await redis(["GET", STATE_KEY]);
    return typeof raw === "string" ? (JSON.parse(raw) as StoredDocument) : null;
  }

  function credentialsMatch(request: Request): boolean {
    const credentials = readCredentials(request);
    if (!credentials || !config.adminUsername || !config.adminPassword) return false;
    // Username tidak peka huruf besar/kecil (keyboard HP sering auto-kapital); password peka.
    const usernameOk = safeEqual(credentials.username.trim().toLowerCase(), config.adminUsername.toLowerCase());
    const passwordOk = safeEqual(credentials.password, config.adminPassword);
    return usernameOk && passwordOk;
  }

  /** Cek kredensial dengan pembatasan percobaan gagal per IP. */
  async function authenticate(request: Request): Promise<"none" | "ok" | "bad" | "blocked"> {
    if (!request.headers.get("authorization")) return "none";
    const failKey = FAIL_KEY_PREFIX + clientKey(request);
    const failures = Number(await redis(["GET", failKey])) || 0;
    if (failures >= MAX_FAILED_LOGINS) return "blocked";
    if (credentialsMatch(request)) return "ok";
    const count = Number(await redis(["INCR", failKey]));
    if (count === 1) await redis(["EXPIRE", failKey, FAIL_WINDOW_SECONDS]);
    return "bad";
  }

  return async function handle(request: Request): Promise<Response> {
    if (!config.redisUrl || !config.redisToken || !config.adminUsername || !config.adminPassword) {
      return json({ error: "Server belum dikonfigurasi (Redis / ADMIN_USERNAME / ADMIN_PASSWORD)." }, 500);
    }

    try {
      const auth = await authenticate(request);
      if (auth === "blocked") return json({ error: "Terlalu banyak percobaan gagal. Coba lagi nanti." }, 429);

      if (request.method === "GET") {
        const document = await readDocument();
        return json({ data: document?.data ?? null, updatedAt: document?.updatedAt ?? null, isAdmin: auth === "ok" });
      }

      if (request.method === "PUT") {
        if (auth !== "ok") return json({ error: "Username atau password salah." }, 401);
        const body = (await request.json()) as { data?: unknown; baseUpdatedAt?: string | null };
        if (typeof body.data !== "object" || body.data === null) return json({ error: "Data tidak valid." }, 400);

        const current = await readDocument();
        if (current && current.updatedAt !== (body.baseUpdatedAt ?? null)) {
          return json({ error: "Data di server lebih baru.", data: current.data, updatedAt: current.updatedAt }, 409);
        }

        const next: StoredDocument = { data: body.data, updatedAt: new Date().toISOString() };
        await redis(["SET", STATE_KEY, JSON.stringify(next)]);
        return json({ updatedAt: next.updatedAt });
      }

      return json({ error: "Method tidak didukung." }, 405);
    } catch {
      return json({ error: "Penyimpanan tidak dapat dihubungi." }, 502);
    }
  };
}
