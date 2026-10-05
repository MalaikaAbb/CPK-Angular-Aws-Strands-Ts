# Sub-Agents

> Decompose work across multiple specialized agents with a visible delegation log.


<!-- interactive demo: subagents -->

```typescript
// src/agent/state.ts
/** Marker returned by a sub-agent tool body when its LLM call failed. */
export const SUBAGENT_FAILURE_MARKER = "__SUBAGENT_FAILED__:";

interface Delegation {
  id: string;
  sub_agent: string;
  task: string;
  status: "completed" | "failed";
  result: string;
}

// Per-thread scratchpad of delegations, seeded from inbound state so a
// multi-turn conversation appends rather than overwrites.
const delegationsByThread = new Map<string, Delegation[]>();

function seedDelegations(threadId: string, state: unknown): Delegation[] {
  const existing = delegationsByThread.get(threadId);
  if (existing) return existing;
  let seeded: Delegation[] = [];
  if (state && typeof state === "object") {
    const d = (state as Record<string, unknown>).delegations;
    if (Array.isArray(d)) {
      seeded = d.filter((x): x is Delegation => !!x && typeof x === "object");
    }
  }
  delegationsByThread.set(threadId, seeded);
  return seeded;
}

function readSubagentTask(raw: unknown): string {
  let input = raw;
  if (typeof raw === "string") {
    try {
      input = JSON.parse(raw);
    } catch {
      return "";
    }
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) return "";
  return String((input as Record<string, unknown>).task ?? "");
}

function flattenResult(resultData: unknown): string {
  if (resultData == null) return "";
  if (typeof resultData === "string") return resultData;
  if (Array.isArray(resultData)) {
    const parts: string[] = [];
    for (const item of resultData) {
      if (item && typeof item === "object" && "text" in item) {
        const t = (item as { text?: unknown }).text;
        if (typeof t === "string") parts.push(t);
      } else if (typeof item === "string") {
        parts.push(item);
      }
    }
    if (parts.length) return parts.join("\n");
  }
  if (typeof resultData === "object" && "text" in resultData) {
    const t = (resultData as { text?: unknown }).text;
    if (typeof t === "string") return t;
  }
  return JSON.stringify(resultData);
}

/**
 * Factory for a `stateFromResult` hook bound to a sub-agent name. On each
 * delegation it appends a Delegation entry to the per-thread scratchpad and
 * returns the full updated list so the adapter emits a `StateSnapshotEvent`.
 */
export function makeSubagentStateFromResult(subAgentName: string) {
  return async (ctx: ToolResultContext): Promise<StatePayload | null> => {
    const threadId = ctx.inputData.threadId || "default";
    const existing = seedDelegations(threadId, ctx.inputData.state);

    const task = readSubagentTask(ctx.toolInput);

    const resultText = flattenResult(ctx.resultData);
    let status: Delegation["status"];
    let displayResult: string;
    if (resultText.startsWith(SUBAGENT_FAILURE_MARKER)) {
      status = "failed";
      const failureClass =
        resultText.slice(SUBAGENT_FAILURE_MARKER.length).trim() || "Error";
      displayResult = `Sub-agent call failed (${failureClass}).`;
    } else {
      status = "completed";
      displayResult = resultText;
    }

    const entry: Delegation = {
      id: crypto.randomUUID(),
      sub_agent: subAgentName,
      task,
      status,
      result: displayResult,
    };
    const updated = [...existing, entry];
    delegationsByThread.set(threadId, updated);
    return { delegations: updated.map((d) => ({ ...d })) };
  };
}
```


## What is this?

Sub-agents are the canonical multi-agent pattern: a top-level
**supervisor** LLM orchestrates one or more specialized **sub-agents**
by exposing each of them as a tool. The supervisor decides what to
delegate, the sub-agents do their narrow job, and their results flow
back up to the supervisor's next step.

This is fundamentally the same shape as tool-calling, but each "tool"
is itself a full-blown agent with its own system prompt and (often) its
own tools, memory, and model.

## When should I use this?

Reach for sub-agents when a task has distinct specialized sub-tasks
that each benefit from their own focus:

- **Research → Write → Critique** pipelines, where each stage needs a
  different system prompt and temperature.
- **Router + specialists**, where one agent classifies the request and
  dispatches to the right expert.
- **Divide-and-conquer** — any problem that fits cleanly into parallel
  or sequential sub-problems.

The example below uses the Research → Write → Critique shape as the
canonical example.

## Setting up sub-agents

<!-- setup skipped: subagents-setup is not bundled for strands-typescript -->

Each sub-agent is an isolated agent call with its own model, system
prompt, and optional tools. They don't share memory or tools with the
supervisor; the supervisor only ever sees what the sub-agent returns.

```typescript
// src/agent/tools.ts
const SUBAGENT_SYSTEM_PROMPTS: Record<string, string> = {
  research_agent:
    "You are a research sub-agent. Given a topic, produce a concise bulleted list of 3-5 key facts. No preamble, no closing.",
  writing_agent:
    "You are a writing sub-agent. Given a brief and optional source facts, produce a polished 1-paragraph draft. Be clear and concrete. No preamble.",
  critique_agent:
    "You are an editorial critique sub-agent. Given a draft, give 2-3 crisp, actionable critiques. No preamble.",
};

const SUBAGENT_EMPTY_RESULT = "(sub-agent returned no content)";

let _openaiClient: OpenAI | null = null;
export function openaiClient(): OpenAI {
  if (!_openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY must be set for sub-agent delegation.");
    }
    _openaiClient = new OpenAI({
      apiKey,
      ...(process.env.OPENAI_BASE_URL
        ? { baseURL: process.env.OPENAI_BASE_URL }
        : {}),
      // Match the shared agent so sub-agent calls hit the right aimock fixtures.
      defaultHeaders: { "x-aimock-context": AIMOCK_CONTEXT },
      // Per-request inbound x-* forwarding (incl. X-AIMock-Strict / x-test-id /
      // x-diag-*), mirroring model-factory.ts. The sub-agent client is built
      // ONCE (memoized), but forwardingFetch reads an AsyncLocalStorage
      // snapshot per outbound call (seeded by the Express cvdiag/forwarding
      // middleware around agent.run()), so per-request headers flow correctly.
      // It never clobbers the static x-aimock-context above, and is
      // byte-identical to a plain fetch when no x-* are in scope (demo traffic
      // unaffected).
      fetch: forwardingFetch,
    });
  }
  return _openaiClient;
}

/**
 * Run a single-shot completion as a sub-agent. Returns the failure marker
 * (caught in `state.ts`) on transport/API errors rather than throwing, so a
 * delegation failure surfaces as a "failed" log row instead of a 500.
 */
async function runSubagent(name: string, task: string): Promise<string> {
  const systemPrompt = SUBAGENT_SYSTEM_PROMPTS[name];
  try {
    const response = await openaiClient().chat.completions.create({
      model: process.env.SUBAGENT_MODEL_ID ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: task },
      ],
    });
    const content = response.choices[0]?.message?.content ?? "";
    const text = content.trim();
    return text || SUBAGENT_EMPTY_RESULT;
  } catch (err) {
    const cls = err instanceof Error ? err.constructor.name : "Error";
    return `${SUBAGENT_FAILURE_MARKER}${cls}`;
  }
}
```

Keep sub-agent system prompts narrow and focused. The point of this pattern
is that each one does one thing well. If a sub-agent needs to know
the whole user context to do its job, that's a signal the boundary is
wrong.

## Exposing sub-agents as tools

The supervisor delegates by calling tools. Each delegation tool is a thin
wrapper around a specialized agent call that:

1. Runs the sub-agent on the supplied `task` string.
2. Records the delegation into a `delegations` slot in shared agent
   state (so the UI can render a live log).
3. Returns the sub-agent's final message as the tool result, which the
   supervisor sees on its next turn.

```typescript
// src/agent/tools.ts
export const researchAgent = tool({
  name: "research_agent",
  description:
    "Delegate a research task to the research sub-agent. Use for gathering facts, background, definitions, statistics. Returns a bulleted list of key facts.",
  inputSchema: z.object({
    task: z.string().describe("The research brief to hand off."),
  }),
  callback: ({ task }) => runSubagent("research_agent", task),
});

export const writingAgent = tool({
  name: "writing_agent",
  description:
    "Delegate a drafting task to the writing sub-agent. Use for producing a polished paragraph, draft, or summary. Pass relevant facts inside `task`.",
  inputSchema: z.object({
    task: z.string().describe("The writing brief to hand off."),
  }),
  callback: ({ task }) => runSubagent("writing_agent", task),
});

export const critiqueAgent = tool({
  name: "critique_agent",
  description:
    "Delegate a critique task to the critique sub-agent. Use for reviewing a draft and suggesting concrete improvements.",
  inputSchema: z.object({
    task: z.string().describe("The draft to critique."),
  }),
  callback: ({ task }) => runSubagent("critique_agent", task),
});
```

This is where CopilotKit's shared-state channel earns its keep: the
supervisor's tool calls mutate `delegations` as they happen, and the
frontend renders every new entry live.

<Callout type="warn">
  Give every delegation a stable `id` and merge new entries by that `id`. The
  client sends its copy of shared state back as run input on every run, so a
  slot that blindly appends whatever it receives — a LangGraph
  `Annotated[list, operator.add]` reducer, for example — concatenates the
  entries the client just echoed onto the ones the agent already has, and the
  log doubles when a thread is continued.
</Callout>

## Rendering a live delegation log

On the frontend, the delegation log is a reactive render of the
`delegations` slot.




Read the selected agent's state through `injectAgentStore`, derive the
delegations with `computed`, and register one typed renderer for each sub-agent
tool. The Angular Showcase uses this source:

```typescript
// features/agent-state/agent-state-feature.component.ts
  private readonly agentStore = injectAgentStore(this.agentId);
  protected readonly delegations = computed(() =>
    readDelegations(this.agentStore().state()),
  );

  constructor() {
    if (this.feature === "subagents") {
      this.registerSubAgent("research_agent");
      this.registerSubAgent("writing_agent");
      this.registerSubAgent("critique_agent");
    }
  }

  private registerSubAgent(name: SubAgentName): void {
    registerRenderToolCall(subAgentRendererConfig(name));
  }
```


The result: as the supervisor fans work out to its sub-agents, the log
grows in real time, giving the user visibility into a process that
would otherwise be a long opaque spinner.

## Related

- **[Shared State](/angular/strands-typescript/guides/shared-state)** — the channel that makes the
  delegation log live.
- **[State streaming](/angular/strands-typescript/guides/shared-state)** — stream
  *individual* sub-agent outputs token-by-token inside each log entry.
