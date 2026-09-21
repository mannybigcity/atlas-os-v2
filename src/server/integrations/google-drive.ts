import { createSign, randomUUID } from "node:crypto";

export type GoogleDriveCredentials =
  | {
      kind: "refresh_token";
      clientId: string;
      clientSecret: string;
      refreshToken: string;
    }
  | {
      kind: "service_account";
      clientEmail: string;
      privateKey: string;
    };

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}

/**
 * Server-only Drive credentials. Refresh token is preferred because the
 * AtlasBridge folders live in the operator's Drive. A service account works
 * after those folders are shared with the service account email.
 * Never import this module from a client component.
 */
export function readGoogleDriveCredentials(read: (name: string) => string): GoogleDriveCredentials | null {
  const clientId = read("GOOGLE_DRIVE_CLIENT_ID").trim();
  const clientSecret = read("GOOGLE_DRIVE_CLIENT_SECRET").trim();
  const refreshToken = read("GOOGLE_DRIVE_REFRESH_TOKEN").trim();
  if (clientId && clientSecret && refreshToken) {
    return { kind: "refresh_token", clientId, clientSecret, refreshToken };
  }

  const jsonRaw = read("GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON").trim();
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as { client_email?: unknown; private_key?: unknown };
      if (typeof parsed.client_email === "string" && typeof parsed.private_key === "string") {
        return {
          kind: "service_account",
          clientEmail: parsed.client_email.trim(),
          privateKey: normalizePrivateKey(parsed.private_key),
        };
      }
    } catch {
      // Fall through to discrete env vars.
    }
  }

  const clientEmail = read("GOOGLE_DRIVE_CLIENT_EMAIL").trim();
  const privateKey = normalizePrivateKey(read("GOOGLE_DRIVE_PRIVATE_KEY"));
  if (clientEmail && privateKey) {
    return { kind: "service_account", clientEmail, privateKey };
  }

  return null;
}

export function driveNameInFolderQuery(name: string, folderId: string) {
  const safeName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const safeFolder = folderId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `name = '${safeName}' and '${safeFolder}' in parents and trashed = false`;
}

function base64url(value: string) {
  return Buffer.from(value).toString("base64url");
}

export function signGoogleServiceAccountJwt(input: {
  clientEmail: string;
  privateKey: string;
  nowSeconds: number;
}) {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: input.clientEmail,
      scope: DRIVE_SCOPE,
      aud: TOKEN_URL,
      iat: input.nowSeconds,
      exp: input.nowSeconds + 3600,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(input.privateKey, "base64url")}`;
}

type DriveFolders = {
  inbox: string;
  outbox: string;
  status: string;
};

export type AtlasBridgeDrive = {
  readHeartbeat(): Promise<string | null>;
  writeInbox(name: string, markdown: string): Promise<void>;
  readOutbox(name: string): Promise<string | null>;
};

export function createGoogleDriveClient(input: {
  credentials: GoogleDriveCredentials;
  folders: DriveFolders;
  fetchImpl?: typeof fetch;
  now?: () => number;
}): AtlasBridgeDrive {
  const fetchImpl = input.fetchImpl ?? fetch;
  const now = input.now ?? Date.now;
  let cached: { token: string; expiresAt: number } | null = null;

  async function accessToken() {
    if (cached && cached.expiresAt > now() + 30_000) return cached.token;
    const body = new URLSearchParams();
    if (input.credentials.kind === "refresh_token") {
      body.set("grant_type", "refresh_token");
      body.set("client_id", input.credentials.clientId);
      body.set("client_secret", input.credentials.clientSecret);
      body.set("refresh_token", input.credentials.refreshToken);
    } else {
      body.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
      body.set(
        "assertion",
        signGoogleServiceAccountJwt({
          clientEmail: input.credentials.clientEmail,
          privateKey: input.credentials.privateKey,
          nowSeconds: Math.floor(now() / 1000),
        }),
      );
    }

    const response = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) {
      throw new Error(`google_drive_token_${response.status}`);
    }
    const json = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
    if (typeof json.access_token !== "string" || !json.access_token) {
      throw new Error("google_drive_token_missing");
    }
    const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
    cached = { token: json.access_token, expiresAt: now() + expiresIn * 1000 };
    return json.access_token;
  }

  async function findFileId(folderId: string, name: string) {
    const token = await accessToken();
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", driveNameInFolderQuery(name, folderId));
    url.searchParams.set("fields", "files(id,name)");
    url.searchParams.set("pageSize", "1");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    const response = await fetchImpl(url, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`google_drive_list_${response.status}`);
    const json = (await response.json()) as { files?: Array<{ id?: string }> };
    return json.files?.[0]?.id ?? null;
  }

  async function readFileText(fileId: string) {
    const token = await accessToken();
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
    const response = await fetchImpl(url, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`google_drive_read_${response.status}`);
    return response.text();
  }

  async function readNamed(folderId: string, name: string) {
    const fileId = await findFileId(folderId, name);
    if (!fileId) return null;
    return readFileText(fileId);
  }

  return {
    readHeartbeat() {
      return readNamed(input.folders.status, "cos-heartbeat.json");
    },
    readOutbox(name: string) {
      return readNamed(input.folders.outbox, name);
    },
    async writeInbox(name: string, markdown: string) {
      const token = await accessToken();
      const boundary = `atlas_bridge_${randomUUID()}`;
      const metadata = JSON.stringify({
        name,
        parents: [input.folders.inbox],
        mimeType: "text/markdown",
      });
      const body = [
        `--${boundary}`,
        "Content-Type: application/json; charset=UTF-8",
        "",
        metadata,
        `--${boundary}`,
        "Content-Type: text/markdown; charset=UTF-8",
        "",
        markdown,
        `--${boundary}--`,
        "",
      ].join("\r\n");
      const response = await fetchImpl(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": `multipart/related; boundary=${boundary}`,
          },
          body,
        },
      );
      if (!response.ok) throw new Error(`google_drive_write_${response.status}`);
    },
  };
}
