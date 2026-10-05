# Doc drift changelog

What the CopilotKit docs changed under this repo, written by the sync on
`/doc-sync`. Only pages that actually moved are recorded — a sync that finds
everything unchanged writes nothing here at all.

Holds the 3 most recent dated entries. When a change lands on a fourth
date, the oldest entry is dropped. Entries are counted, not aged, so a gap of
weeks between changes does not expire anything.

## 2026-10-05

### 07:35 UTC — 3 pages, highest severity none

**Info — AG-UI**

`/angular/strands-typescript/ag-ui` · route `/ag-ui`

Now tracked for the first time.

**Info — Copilot Runtime**

`/angular/strands-typescript/copilot-runtime` · route `/copilot-runtime`

Now tracked for the first time.

**Info — Sub-agents**

`/angular/strands-typescript/multi-agent/subagents` · route `/subagents`

Now tracked for the first time.

---

## 2026-09-30

### 11:25 UTC — 3 pages, highest severity high

**High — A2UI schemas, styling, and recovery**

`/angular/strands-typescript/guides/a2ui` · route `/a2ui` · under “Choose a schema strategy” · in a `typescript` block

24 code lines, 1 heading, 17 prose lines changed. The number of fenced code blocks changed.

````diff
- // features/a2ui/a2ui-catalogs.ts
- const fixedDefinitions = {
+ // features/a2ui/a2ui-definitions.ts
+ export const fixedDefinitions = {
- };
+ } satisfies A2UICatalogDefinitions;
+ A catalog is required: without one, A2UI stays off even when the runtime
+ enables it, and CopilotKit logs a warning.
````

**High — Voice and multimodal input**

`/angular/strands-typescript/guides/voice-multimodal` · route `/voice-multimodal` · under “Accept voice input”

5 code lines, 1 heading, 15 prose lines changed. The number of fenced code blocks changed.

````diff
- access. Your Runtime must also have transcription configured; a visible
- microphone does not make an unavailable transcription service succeed.
+ access.
+ 
+ ### Configure Runtime transcription
+ 
+ Follow the [Voice backend setup](/angular/strands-typescript/guides/voice-multimodal#backend) to add a dedicated Runtime
+ route and transcription service. Keep speech-provider credentials separate
````

**Low — Frontend tools and generative UI**

`/angular/strands-typescript/guides/frontend-tools-generative-ui` · route `/frontend-tools-generative-ui` · under “Choose a generative UI path”

2 prose lines changed.

````diff
- | A2UI | A server emits A2UI operations or snapshots | Runtime capability turns on the built-in renderer; an optional `a2ui` config supplies a catalog or theme |
+ | A2UI | A server emits A2UI operations or snapshots | Set `a2ui.catalog` in `provideCopilotKit` to turn on the built-in renderer; without a catalog A2UI stays off |
````

---

---

## 2026-09-23

### 13:20 UTC — 2 pages, highest severity low

**Low — Introduction**

`/angular/strands-typescript` · routes `/`, `/doc-sync` · under “Angular”

4 prose lines changed.

````diff
- body="Add durable threads, inspection, and managed or self-hosted CopilotKit Intelligence without changing the Angular frontend APIs in this guide."
+ body="Add threads, inspection, and cloud-hosted or self-hosted CopilotKit Intelligence without changing the Angular frontend APIs in this guide."
- - [CopilotKit Intelligence](intelligence/overview): add durable threads, inspection, and cloud-hosted or self-hosted operations.
+ - [CopilotKit Intelligence](intelligence/overview): add threads, inspection, and cloud-hosted or self-hosted operations.
````

**Low — Quickstart**

`/angular/strands-typescript/quickstart` · route `/quickstart` · under “Angular”

4 prose lines changed.

````diff
- body="Add durable threads, inspection, and managed or self-hosted CopilotKit Intelligence without changing the Angular frontend APIs in this guide."
+ body="Add threads, inspection, and cloud-hosted or self-hosted CopilotKit Intelligence without changing the Angular frontend APIs in this guide."
- - [CopilotKit Intelligence](intelligence/overview): add durable threads, inspection, and cloud-hosted or self-hosted operations.
+ - [CopilotKit Intelligence](intelligence/overview): add threads, inspection, and cloud-hosted or self-hosted operations.
````

---

---
