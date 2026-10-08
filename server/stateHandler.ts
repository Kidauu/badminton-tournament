// Penyimpanan turnamen bersama: satu dokumen JSON di Redis (Upstash REST).
// Siapa pun boleh membaca; hanya pemegang PIN admin yang boleh menulis.

const STATE_KEY = "badminton-tournament:shared";

export interface StateHandlerConfig {
  redisUrl: string | undefined;
  redisToken: string | undefined;
  adminPin: string | undefined;
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

export function createStateHandler(config: StateHandlerConfig) {
  async function redis(command: string[]): Promise<unknown> {
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

  function isAdmin(request: Request): boolean {
    const pin = request.headers.get("x-admin-pin");
    return Boolean(config.adminPin && pin && safeEqual(pin, config.adminPin));
  }

  return async function handle(request: Request): Promise<Response> {
    if (!config.redisUrl || !config.redisToken || !config.adminPin) {
      return json({ error: "Server belum dikonfigurasi (Redis / ADMIN_PIN)." }, 500);
    }

    try {
      if (request.method === "GET") {
        const document = await readDocument();
        return json({ data: document?.data ?? null, updatedAt: document?.updatedAt ?? null, isAdmin: isAdmin(request) });
      }

      if (request.method === "PUT") {
        if (!isAdmin(request)) return json({ error: "PIN admin salah." }, 401);
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
