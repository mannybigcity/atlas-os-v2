# Lion's Den: Codex Office adaptation plan

This is the practical bridge between the Atlas vision and a real product surface.

The reference idea is an office where agents are visible while they work. Atlas
does not need to copy another product's exact look. Atlas needs the underlying
pattern:

1. A session or organization context decides which work stream the viewer can see.
2. Work events arrive from a trusted source.
3. Events update agent state.
4. Agent state drives movement, meetings, handoffs, and approval queues.
5. The UI shows proof of work without exposing private client data.

## Current implementation

The public `/atlas-team-live` page now uses a demo adapter with the same shape
we want real events to use later.

Implemented:

- ATLAS, HUNTER, MICAH, and DAVID as first-class visible agents.
- Agent states including thinking, walking, working, waiting for approval,
  handing off, and completed.
- Office zones for command, research, creative, CRM, meeting, approvals, mission,
  and revenue signals.
- A 29-node navigation graph with real shortest-path routing.
- Work events that correspond to movement.
- An activity feed that matches the visual event.
- Tool/MCP-style indicators for each agent.
- Clear public-demo language so private client activity is not misrepresented.

## Why Phaser is not the first step

Phaser is a renderer. The money-making engine is the event/state system.

If we install Phaser before the event contract exists, we risk building another
good-looking toy. The current implementation creates the contract first:

- `WorkEvent`
- `AgentWorkState`
- `NavigationNode`
- `NavigationEdge`
- `OfficeZone`
- shortest-path routing
- demo event adapter

Phaser can be added as a renderer later without changing the event model.

## Next real adapters

### 1. Supabase realtime adapter

Use Supabase tables such as `atlas_agent_runs`, sales prospects, attention
requests, deliverables, and approvals to emit safe work events.

Good first live events:

- new assessment received
- HUNTER prospect research started/completed
- MICAH draft created
- DAVID follow-up queued
- ATLAS approval required

### 2. WebSocket adapter

If Atlas later runs a dedicated server or DigitalOcean worker, a WebSocket event
stream can mirror the Paperclip-style pattern:

- authorize viewer by organization/session
- subscribe to safe organization events
- push event messages to the room
- reconnect safely on disconnect

Netlify functions are not the best place for a long-running WebSocket server.
For the current stack, Supabase Realtime is the cleaner first live path.

### 3. MCP indicators

MCP/tool indicators should not mean "an agent is magical." They should show what
capabilities are available or queued:

- HUNTER: Google Places, web research, lead fit scoring
- MICAH: OpenAI drafts, content calendar, approval queue
- DAVID: CRM records, follow-up clock, pipeline stages
- ATLAS: Supabase ledger, approval gate, planning model

## Sales rule

The public room sells the story. The private Lion's Den proves the work.

Public route:

- demo-safe
- no private data
- no false "live client work" claim
- CTA to assessment

Private route:

- authenticated
- organization scoped
- real client records
- real approvals and handoffs
- visible agent ledger
