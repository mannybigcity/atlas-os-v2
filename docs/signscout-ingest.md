# SignScout ingest contract

This is the contract for `POST /api/signscout/ingest` on the Atlas For Entrepreneurs site. SignScout can implement against this document without reading the route source.

Production URL: `https://atlasforentrepreneurs.com/api/signscout/ingest`

The same path exists on any deploy of this app, including local `http://localhost:3000/api/signscout/ingest`.

The migration `supabase/migrations/20260925183000_signscout_hunter_ingest.sql` is **not applied** by this repository, by CI, or by the app. The founder applies it in the Supabase SQL editor before the endpoint can store rows. Until then the route responds `503` with `{ "ok": false, "error": "not_ready" }`.

A successful ingest inserts one row in `organization_hunter_review_items` with `status: "pending"` and `source: "signscout"` on the Atlas For Entrepreneurs organization only. Accept on the HUNTER review pile is still required before that row becomes a Prospect. The route does not send email, SMS, or any outreach, and it does not call the SIS capture-card RPCs.

## Request

`POST`

Headers:

| Header | Required | Value |
| --- | --- | --- |
| `Authorization` | yes | `Bearer <device token>` issued once in AFE desk settings. The server stores only the SHA-256 hex hash. |
| `Content-Type` | yes | `application/json` |
| `Idempotency-Key` | yes | The SignScout lead id. Must equal `lead.id`. 8 to 80 characters, matching `^[A-Za-z0-9][A-Za-z0-9_-]{7,79}$` (a UUID works). |
| `Origin` | no | Sent by the Capacitor webview. CORS echoes it only when it is allowed. There is no `*` origin. |

Allowed browser origins:

- `capacitor://localhost`
- `https://localhost` and `http://localhost` (any port)
- `http://127.0.0.1` and `https://127.0.0.1` (any port)
- each exact `https` origin in the server env `SIGNSCOUT_WEB_ORIGINS` (comma-separated, no wildcards)
- the origin of `NEXT_PUBLIC_SIGNSCOUT_URL` when that value is `https`

`OPTIONS` returns `204` with `Access-Control-Allow-Methods: POST, OPTIONS` and `Access-Control-Allow-Headers: Authorization, Content-Type, Idempotency-Key`.

JSON body. Unknown fields are ignored. `lead.status` is ignored for the review-row status (the row is always `pending`). `sentAt` is required but is not part of the idempotency fingerprint, so a retry with a new timestamp still matches.

```json
{
  "source": "signscout",
  "sentAt": "2026-09-25T18:00:00.000Z",
  "lead": {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "companyName": "Houston Pipe Co",
    "trade": "plumbing",
    "phone": "(713) 555-0101",
    "website": "https://houstonpipe.example",
    "email": "office@houstonpipe.example",
    "license": "TACL12345",
    "city": "Houston",
    "notes": "White van on I-10",
    "callNote": "",
    "rawText": "HOUSTON PIPE CO\n713-555-0101",
    "status": "new",
    "capturedAt": 1758823200000,
    "lat": 29.7604,
    "lng": -95.3698,
    "photo": null
  }
}
```

Field limits:

| Field | Rule |
| --- | --- |
| `source` | Exactly `signscout`. |
| `sentAt` | ISO-8601 string, at most 40 characters, parseable, not before 2024-01-01 UTC, not more than 24 hours in the future. |
| `lead.id` | Required. Same pattern as `Idempotency-Key`, and the same value. |
| `lead.companyName` | Required after trim. 1 to 250 characters. |
| `lead.phone` | Omit, `null`, or `""` when unknown. Otherwise 7 to 80 characters and at least 7 digits. |
| `lead.website` | Omit, `null`, or `""` when unknown. Otherwise an `http` or `https` URL, 8 to 2000 characters. |
| `lead.email` | Omit, `null`, or `""` when unknown. Otherwise a single email address, 3 to 254 characters. Stored lowercased. |
| `lead.trade` | Omit, `null`, or `""`, or 1 to 120 characters. |
| `lead.license` | Omit, `null`, or `""`, or 1 to 80 characters. |
| `lead.city` | Omit, `null`, or `""`, or 1 to 120 characters. |
| `lead.notes` | String, 0 to 2000 characters. Omitted is treated as `""`. |
| `lead.callNote` | String, 0 to 1000 characters. Omitted is treated as `""`. |
| `lead.rawText` | String, 0 to 4000 characters. Omitted is treated as `""`. |
| `lead.lat` / `lead.lng` | Both omitted/`null`, or both finite numbers. Latitude -90 to 90. Longitude -180 to 180. |
| `lead.capturedAt` | Optional finite number. Not stored as its own column. |
| `lead.status` | Optional string up to 40 characters. Does not set the HUNTER status. |
| `lead.photo` | Omit or `null` when there is no photo. |

Photo object, when present:

```json
{
  "contentType": "image/jpeg",
  "dataBase64": "<raw base64, no data: prefix>"
}
```

- `contentType` is `image/jpeg` (`image/jpg` is accepted as JPEG), `image/png`, or `image/webp`. The decoded bytes must match that type.
- `dataBase64` is standard base64, not a data URL. Decoded size must be from 1 byte through **3,500,000 bytes**. A 5 MB image does not fit: base64 of 5 MB plus the JSON envelope exceeds the host request limit (about 6 MB). Compress before sending.
- The file is stored in the private Storage bucket `signscout-photos` at `{organizationId}/{reviewItemId}.jpg|png|webp`. The review pile shows a short-lived signed thumbnail to desk members.

The whole request body must be at most 6,000,000 bytes.

Stored notes are one text field of at most 4,000 characters, built from trade, license, city, email, notes, call note, and sign text, and truncated if the combination is longer. Send the important sign text first in `rawText` if you are near the limit, and keep each field inside its own limit or the request is rejected.

Idempotency fingerprint is SHA-256 of the canonical lead fields above, including a hash of the photo bytes. `sentAt` is not part of it.

Rate limit, counted on `created` and `replay` outcomes in the last hour: **60 per device token** and **120 per client IP**. `Retry-After` is `3600`.

## Responses

Every JSON response uses `Cache-Control: no-store`. Errors do not include a stack trace, organization id, or token.

| Status | Body |
| --- | --- |
| `201` | `{ "ok": true, "status": "pending", "reviewItemId": "<uuid>", "idempotencyKey": "<lead id>", "replay": false, "photoStored": false }` A new pending review row. `photoStored` is `true` when a photo was stored. |
| `200` | Same shape with `"replay": true`. The idempotency key was already stored for this organization and the body fingerprint matched. `status` is the current row status (`pending`, `accepted`, or `dismissed`). A replay does not create a Prospect and does not change Accept. If the first attempt saved the row but the photo upload failed, retrying the same key and body attaches the photo when it can. |
| `400` | `{ "ok": false, "error": "invalid_request", "issues": ["companyName"] }` `issues` uses these names: `body`, `source`, `sentAt`, `lead`, `idempotencyKey`, `companyName`, `phone`, `website`, `email`, `trade`, `license`, `city`, `notes`, `callNote`, `rawText`, `lat`, `lng`, `capturedAt`, `status`, `photo`, `photo.contentType`, `photo.dataBase64`, `photo.size`. |
| `401` | `{ "ok": false, "error": "unauthorized" }` Missing, malformed, unknown, or revoked token. |
| `403` | `{ "ok": false, "error": "forbidden" }` The token's organization is not the Atlas For Entrepreneurs operator desk. A SIS organization is refused even if a token row exists. |
| `409` | `{ "ok": false, "error": "idempotency_conflict", "idempotencyKey": "<lead id>" }` The key was already used with a different body fingerprint. |
| `413` | `{ "ok": false, "error": "payload_too_large" }` |
| `415` | `{ "ok": false, "error": "unsupported_media_type" }` |
| `429` | `{ "ok": false, "error": "rate_limited" }` plus `Retry-After: 3600`. |
| `500` | `{ "ok": false, "error": "ingest_failed" }` The lead may already be stored. Retry the same idempotency key and body. |
| `503` | `{ "ok": false, "error": "not_ready" }` The migration has not been applied, or the server is missing its service role key. |

## Desk behavior

- Review pile rows show a SignScout badge, the phone, the notes, and a photo thumbnail when one was stored.
- Accept and Skip work the same way as Google Places rows. Accept creates the Prospect. Skip sets `dismissed`.
- Device tokens are created and revoked by an AFE owner, admin, or super admin on `/client/settings`. The plaintext token is shown once. Revoked tokens receive `401`.

## Privacy page

Public, not behind login: `https://atlasforentrepreneurs.com/signscout/privacy`
