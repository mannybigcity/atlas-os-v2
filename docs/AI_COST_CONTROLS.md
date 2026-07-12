# AI Cost Controls

Atlas must not spend AI money casually.

This document defines the guardrails required before Atlas makes OpenAI, model-provider, retrieval, or agent calls in production.

## Operating principle

Massive Action does not mean uncontrolled spend.

Every AI call must clearly help generate revenue, reduce costs, save time, improve security, or create a better customer experience.

## Current status

Atlas does not currently call any AI provider.

No OpenAI API key, model SDK, agent runtime, vector database, background AI job, or AI feature is implemented yet.

## Approved AI spending rules

### 1. One server-side AI gateway

AI calls must go through one server-side module.

Do not call model providers directly from:

- React components
- route pages
- client-side code
- random utilities
- browser-exposed code

### 2. No browser AI keys

Provider keys must never be exposed to the browser.

AI provider credentials belong only in server-side environment variables.

### 3. Every call must be attributable

Every AI call should eventually record:

- organization ID
- user ID
- feature or purpose
- model/provider
- input size estimate
- output size estimate
- success/failure
- timestamp

### 4. Default to cheap models

Use the cheapest model that can reliably complete the job.

Expensive models require a specific reason, not vibes.

### 5. No autonomous loops

Atlas must not run recursive or open-ended agent loops without an explicit budget, stop condition, and audit trail.

### 6. No hidden background AI

Background AI jobs are prohibited until we have:

- usage tracking
- retry limits
- cost limits
- clear user value

### 7. No duplicate model stacks

Do not run the same task through multiple wrappers, providers, agents, or tools unless we are deliberately comparing them with a defined budget.

### 8. Retrieval is not free

Document parsing, embeddings, chunking, and vector search all have cost and complexity.

Do not add AI retrieval until Atlas has enough approved business context to retrieve from.

## Required before first AI feature

Before shipping the first AI-powered feature, implement:

- server-only AI gateway
- environment variable for provider key
- request logging table or durable log plan
- per-request cost estimate
- organization-level usage tracking plan
- safe error handling
- no service keys in browser code

## First acceptable AI feature

The first AI feature should be narrow and user-triggered:

```text
Generate a daily briefing draft from approved organization context.
```

It should be:

- one button
- one request
- one response
- no autonomous loop
- no background execution
- no hidden retries

## Explicitly not approved yet

- autonomous agents
- multi-agent workflows
- always-on monitoring
- automatic document ingestion
- automatic embedding jobs
- vector database outside Supabase
- AI-generated outbound communication
- AI actions that modify business data without approval

## Budget posture

Default posture:

```text
No AI spend unless the feature is scoped, logged, limited, and useful.
```

The goal is not to avoid AI. The goal is to make AI profitable.
