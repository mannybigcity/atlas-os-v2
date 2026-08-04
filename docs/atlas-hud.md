# Focused Atlas HUD

The Lion's Den supports a concise, keyboard-first focused HUD for existing
surfaces. A target can be opened directly with a URL such as:

- `/lions-den?hud=crm-followups`
- `/lions-den?hud=sis-custom-creations`
- `/lions-den?hud=qtime-productions`
- `/lions-den?hud=obsidian-graph`
- `/lions-den?hud=missions`
- `/lions-den?hud=agent-status`
- `/lions-den/brain?hud=obsidian&node=owned-sis-custom-creations`

The same `FocusedHud` shell is used for graph-node details and command-center
surface targets. Escape, the close button, backdrop click, and returning focus
to the invoking control all close the HUD. The graph uses native buttons so
Tab, Enter, and Space provide the same interaction as pointer selection.

These URLs are explicit UI targets, not a voice-control implementation. A
future voice request would need a trusted client-side bridge that maps a
recognized, authorized request to one of these allowlisted target IDs and then
navigates the existing browser tab. That bridge must preserve authentication,
tenant scope, approval gates, and the refusal path for unsupported or
ambiguous requests; no realtime voice-to-browser control is claimed today.
