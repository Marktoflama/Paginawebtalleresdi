import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { siteUrl } from "@/config/site";
import type { SupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret, hasEncryptionKey } from "./crypto";
import { formatRow, SHEETS, type CellValue, type SheetKey } from "./rows";

/**
 * Microsoft Graph Excel sync (delegated).
 *
 * The Excel workbook endpoints (tables/rows/ranges) do NOT support application
 * permissions (learn.microsoft.com › tablerowcollection-add: "Application: Not
 * supported"), so an admin connects once with "Conectar con Microsoft"
 * (authorization code + PKCE). The refresh token is stored AES-256-GCM
 * encrypted in private.integrations and rotated on every refresh.
 */

export const PROVIDER = "microsoft";
const GRAPH = "https://graph.microsoft.com/v1.0";
const DEFAULT_SCOPES = "offline_access User.Read Files.ReadWrite.All";

export interface GraphConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  driveId: string;
  fileId: string;
  scopes: string;
}

export function graphConfig(): GraphConfig | null {
  const tenantId = process.env.MS_TENANT_ID?.trim();
  const clientId = process.env.MS_CLIENT_ID?.trim();
  const clientSecret = process.env.MS_CLIENT_SECRET?.trim();
  const driveId = process.env.MS_DRIVE_ID?.trim();
  const fileId = process.env.MS_FILE_ID?.trim();
  if (!tenantId || !clientId || !clientSecret || !driveId || !fileId || !hasEncryptionKey()) return null;
  return { tenantId, clientId, clientSecret, driveId, fileId, scopes: process.env.MS_GRAPH_SCOPES?.trim() || DEFAULT_SCOPES };
}

export function redirectUri(): string {
  return `${siteUrl()}/api/integraciones/microsoft/callback`;
}

/* ───────────────────────── OAuth (authorization code + PKCE) ───────────────────────── */

export function createPkcePair(): { verifier: string; challenge: string; state: string } {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge, state: randomBytes(24).toString("base64url") };
}

export function authorizeUrl(cfg: GraphConfig, state: string, challenge: string): string {
  const url = new URL(`https://login.microsoftonline.com/${encodeURIComponent(cfg.tenantId)}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", cfg.scopes);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

async function tokenRequest(cfg: GraphConfig, body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(cfg.tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, ...body }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Partial<TokenResponse> & { error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`Microsoft token error: ${json.error ?? res.status} ${json.error_description?.split("\r\n")[0] ?? ""}`.trim());
  }
  return json as TokenResponse;
}

export async function exchangeCode(cfg: GraphConfig, code: string, verifier: string): Promise<TokenResponse> {
  return tokenRequest(cfg, {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
    scope: cfg.scopes,
  });
}

export async function fetchAccountEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(`${GRAPH}/me?$select=mail,userPrincipalName`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const me = (await res.json()) as { mail?: string | null; userPrincipalName?: string | null };
  return me.mail ?? me.userPrincipalName ?? null;
}

export async function saveConnection(admin: SupabaseAdminClient, cfg: GraphConfig, tokens: TokenResponse, accountEmail: string | null) {
  if (!tokens.refresh_token) throw new Error("Microsoft no devolvió un refresh token (¿falta el permiso offline_access?)");
  const { error } = await admin.rpc("integration_save", {
    p_provider: PROVIDER,
    p_account_email: accountEmail ?? "",
    p_refresh_token_enc: encryptSecret(tokens.refresh_token),
    p_scopes: tokens.scope ?? cfg.scopes,
  });
  if (error) throw new Error(`integration_save: ${error.message}`);
  cachedToken = { value: tokens.access_token, expiresAt: Date.now() + (tokens.expires_in - 120) * 1000 };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export class GraphNotConnectedError extends Error {
  constructor() {
    super("Microsoft Excel no está conectado");
  }
}

/** Access token from the stored (encrypted) refresh token; rotates and re-stores it. */
export async function getAccessToken(admin: SupabaseAdminClient, cfg: GraphConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const { data, error } = await admin.rpc("integration_get", { p_provider: PROVIDER });
  if (error) throw new Error(`integration_get: ${error.message}`);
  const row = data?.[0];
  if (!row?.refresh_token_enc) throw new GraphNotConnectedError();
  let tokens: TokenResponse;
  try {
    tokens = await tokenRequest(cfg, {
      grant_type: "refresh_token",
      refresh_token: decryptSecret(row.refresh_token_enc),
      scope: cfg.scopes,
    });
  } catch (e) {
    await admin.rpc("integration_mark", { p_provider: PROVIDER, p_ok: false, p_error: (e as Error).message });
    throw e;
  }
  if (tokens.refresh_token) {
    await admin.rpc("integration_save", {
      p_provider: PROVIDER,
      p_account_email: row.account_email ?? "",
      p_refresh_token_enc: encryptSecret(tokens.refresh_token),
      p_scopes: tokens.scope ?? row.scopes ?? cfg.scopes,
    });
  }
  cachedToken = { value: tokens.access_token, expiresAt: Date.now() + (tokens.expires_in - 120) * 1000 };
  return tokens.access_token;
}

export function forgetCachedToken() {
  cachedToken = null;
}

/* ───────────────────────── Workbook client ───────────────────────── */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function columnLetter(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** "Reservas!A2:J10" → { sheet, startRow: 2, endRow: 10 } */
function parseAddress(address: string): { sheet: string; startRow: number; endRow: number } {
  const [sheetPart, range] = address.split("!") as [string, string];
  const sheet = sheetPart.replace(/^'|'$/g, "").replace(/''/g, "'");
  const [a, b] = range.split(":") as [string, string | undefined];
  const startRow = Number(a.replace(/^[A-Z]+/, ""));
  const endRow = Number((b ?? a).replace(/^[A-Z]+/, ""));
  return { sheet, startRow, endRow };
}

export class WorkbookClient {
  private sessionId: string | null = null;

  constructor(
    private readonly token: string,
    private readonly cfg: GraphConfig,
  ) {}

  private base(): string {
    return `${GRAPH}/drives/${encodeURIComponent(this.cfg.driveId)}/items/${encodeURIComponent(this.cfg.fileId)}/workbook`;
  }

  private async request<T>(method: string, path: string, body?: unknown, attempt = 0): Promise<T> {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" };
    if (this.sessionId) headers["workbook-session-id"] = this.sessionId;
    const res = await fetch(`${this.base()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    if ((res.status === 429 || res.status === 503 || res.status === 504) && attempt < 4) {
      const retryAfter = Number(res.headers.get("Retry-After"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt);
      return this.request<T>(method, path, body, attempt + 1);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const requestId = res.headers.get("request-id") ?? "";
      throw new Error(`Graph ${method} ${path} → ${res.status} ${text.slice(0, 400)} [request-id ${requestId}]`);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  async open() {
    const s = await this.request<{ id: string }>("POST", "/createSession", { persistChanges: true });
    this.sessionId = s.id;
  }

  async close() {
    if (!this.sessionId) return;
    try {
      await this.request("POST", "/closeSession", {});
    } finally {
      this.sessionId = null;
    }
  }

  private async bodyRange(table: string) {
    return this.request<{ address: string; values: CellValue[][]; rowCount: number }>(
      "GET",
      `/tables/${encodeURIComponent(table)}/dataBodyRange?$select=address,values,rowCount`,
    );
  }

  private async writeRow(sheet: string, row: number, key: SheetKey, values: CellValue[]) {
    const last = columnLetter(values.length - 1);
    await this.request("PATCH", `/worksheets/${encodeURIComponent(sheet)}/range(address='A${row}:${last}${row}')`, {
      values: [values],
      numberFormat: [formatRow(key, values)],
    });
  }

  /** Update the row whose first column equals `keyValue`, or append it. Idempotent. */
  async upsert(key: SheetKey, keyValue: string, values: CellValue[], keyColumn = 0) {
    const table = SHEETS[key].name;
    const body = await this.bodyRange(table);
    const { sheet, startRow } = parseAddress(body.address);
    const index = body.values.findIndex((r) => String(r[keyColumn] ?? "").trim().toLowerCase() === keyValue.trim().toLowerCase());
    if (index >= 0) {
      await this.writeRow(sheet, startRow + index, key, values);
      return "updated" as const;
    }
    const onlyBlank = body.rowCount === 1 && body.values[0]?.every((v) => v === "" || v === null);
    if (onlyBlank) {
      await this.writeRow(sheet, startRow, key, values);
      return "added" as const;
    }
    const added = await this.request<{ index: number }>("POST", `/tables/${encodeURIComponent(table)}/rows/add`, { values: [values] });
    const rowIndex = typeof added?.index === "number" ? added.index : body.rowCount;
    await this.writeRow(sheet, startRow + rowIndex, key, values);
    return "added" as const;
  }

  /** Replace every body row of a table with `rows` (repair tool). */
  async rebuild(key: SheetKey, rows: CellValue[][]) {
    const table = SHEETS[key].name;
    const width = SHEETS[key].headers.length;
    const lastCol = columnLetter(width - 1);
    const body = await this.bodyRange(table);
    const { sheet, startRow, endRow } = parseAddress(body.address);
    if (endRow > startRow) {
      await this.request("POST", `/worksheets/${encodeURIComponent(sheet)}/range(address='A${startRow + 1}:${lastCol}${endRow}')/delete`, {
        shift: "Up",
      });
    }
    if (rows.length === 0) {
      await this.writeRow(sheet, startRow, key, Array.from({ length: width }, () => ""));
      return;
    }
    await this.writeRow(sheet, startRow, key, rows[0]!);
    const rest = rows.slice(1);
    for (let i = 0; i < rest.length; i += 200) {
      const chunk = rest.slice(i, i + 200);
      await this.request("POST", `/tables/${encodeURIComponent(table)}/rows/add`, { values: chunk });
    }
    if (rest.length > 0) {
      const from = startRow + 1;
      const to = startRow + rest.length;
      await this.request("PATCH", `/worksheets/${encodeURIComponent(sheet)}/range(address='A${from}:${lastCol}${to}')`, {
        numberFormat: rest.map((r) => formatRow(key, r)),
      });
    }
  }
}
