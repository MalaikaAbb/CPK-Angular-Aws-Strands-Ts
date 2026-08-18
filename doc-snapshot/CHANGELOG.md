# Doc drift changelog

What the CopilotKit docs changed under this repo, written by the sync on
`/doc-sync`. Only pages that actually moved are recorded — a sync that finds
everything unchanged writes nothing here at all.

Holds the 3 most recent dated entries. When a change lands on a fourth
date, the oldest entry is dropped. Entries are counted, not aged, so a gap of
weeks between changes does not expire anything.

## 2026-08-18

### 06:34 UTC — 2 pages, highest severity high

**High — Shared state and agent context** · _local snapshot edit, not an upstream change_

`/angular/strands-typescript/guides/shared-state` · route `/shared-state` · under “Read agent state” · in a `ts` block

4 code lines changed.

````diff
+ type WorkspaceState = {
+ notes: string[];
+ priority: "low" | "normal" | "high";
+ };
````

**Low — Voice and multimodal input** · _local snapshot edit, not an upstream change_

`/angular/strands-typescript/guides/voice-multimodal` · route `/voice-multimodal` · under “What is voice and multimodal input?”

3 prose lines changed.

````diff
- Multimodal input attaches
+ Multimodal input attaches typed image or document content parts to that
+ message, so a compatible model can reason about more than text.
````
