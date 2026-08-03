# SIS Capture Card Intake

Public SIS pages should POST JSON to:

`POST /api/sis/capture-card`

## Request

Required:

- `requestId` or `Idempotency-Key` header
- `businessName`
- `consentToContact: true`

Supported optional fields:

- `contactName`
- `contactEmail`
- `contactPhone`
- `website`
- `socialMedia`
- `sourceUrl`

At least one of `contactEmail`, `contactPhone`, `website`, or `socialMedia` must be present.

## Success

`202 Accepted`

```json
{
  "ok": true,
  "status": "accepted",
  "requestId": "..."
}
```

## Public errors

- `400 invalid_request`
- `415 invalid_request`
- `429 rate_limited`
- `503 service_unavailable`

Responses never expose Atlas credentials or direct CRM privileges.

## Wiring note

This worktree does not include a Shopify theme change. If SIS capture lives in a public storefront or page shell, that separate wiring still needs to POST to this endpoint.
