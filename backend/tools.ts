/**
 * Sub-agent setup and delegation tools, verbatim from
 * https://docs.copilotkit.ai/angular/strands-typescript/multi-agent/subagents
 *
 * The page's snippet omits its imports; they come from the showcase source it
 * is cut from (showcase/integrations/strands-typescript/src/agent/tools.ts).
 * The snippet's `defaultHeaders: { "x-aimock-context": AIMOCK_CONTEXT }` and
 * `fetch: forwardingFetch` options are dropped: both exist only to route the
 * showcase's test traffic through its aimock fixture server.
 */
import { tool } from "@strands-agents/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { SUBAGENT_FAILURE_MARKER } from "./state.js";

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
