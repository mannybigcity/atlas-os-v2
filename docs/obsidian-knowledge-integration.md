# Obsidian knowledge integration

ATLAS OS reads Obsidian metadata on the authenticated Super Admin Brain surface. The vault remains the source of truth for personal notes; Supabase remains the source of truth for organization-scoped CRM and pilot work.

## Setup

Configure the server-only environment variable:

```text
ATLAS_OBSIDIAN_VAULT_PATH=<absolute-path-to-vault>
```

Restart the application after changing the variable. The path is never required in the browser configuration and no vault credentials are used.

## Read-only discovery contract

The Brain page currently reads Markdown file metadata only: relative path, title, folder, modified time, and size. It does not upload, edit, delete, or index note content.

The application derives relationships only from deterministic conventions:

- `CLIENTS/<organization name>/...` links to an Atlas organization when the folder name exactly matches the persisted organization name or slug after case, punctuation, and `&` normalization.
- A note whose title or path segment exactly matches a persisted CRM prospect business name is shown as a candidate. It is not treated as a confirmed CRM relationship.
- `RAMFAM_KINGDOM_BRAIN/06_MISSIONS/...` is counted as a mission-note trail. It is not linked to an application mission because Atlas currently exposes pilot plans/actions rather than a generic mission registry.
- Unmatched client folders remain visible for review. Loose text, similar names, and inferred contacts are not linked.

The page labels empty, setup-required, linked, and candidate states explicitly. Existing organization and Sales CRM RLS/auth boundaries continue to apply because discovery uses the existing authenticated server queries.

## Current boundary

This is discovery, not synchronization. Linking note content to CRM fields, indexing note bodies, writing backlinks, creating a generic project/mission ledger, and triggering agent workflows are separate phases requiring design review and approval. Customer contact, payments, publishing, destructive actions, credentials, schema changes, and deployment remain approval-gated.
