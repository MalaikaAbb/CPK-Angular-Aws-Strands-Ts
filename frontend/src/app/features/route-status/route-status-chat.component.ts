/**
 * The agent-facing half of /status.
 *
 * `/status` already renders the harness's route ledger — `ALL_ROUTES` from
 * `src/app/lib/nav-config.ts` — as an HTML table, which gives the agent
 * nothing: DOM is not context. This component publishes that same ledger to
 * the agent through the `CopilotKitAgentContext` directive
 * (https://docs.copilotkit.ai/reference/angular/directives/CopilotKitAgentContext)
 * and registers `show_route_status`, a display-only tool that renders exactly
 * one of those records through RouteStatusCardComponent
 * (https://docs.copilotkit.ai/angular/strands-typescript/guides/frontend-tools-generative-ui).
 *
 * Two details the reference page is explicit about:
 *
 * - The directive's `value` input is typed `any`, but the AG-UI `Context`
 *   contract requires a string, so the ledger is serialized before binding.
 * - A context is registered in `ngOnInit` and only when BOTH `description` and
 *   `value` are already set; an input that arrives later never creates the
 *   first registration. `routesJson` is therefore a plain field computed at
 *   construction, not something filled in asynchronously.
 *
 * `registerComponent` adds no tool to the AWS Strands agent and has no
 * handler — the frontend declares the tool and CopilotKit forwards it over
 * AG-UI, so the turn completes with an empty tool result rather than an
 * invented one. Every parameter is required for the same reason the guide
 * warns about: an optional field is a field the model fills from its own
 * knowledge, which would turn an empty context set into a well-formed card for
 * a route this project does not have.
 */
import { Component } from '@angular/core';
import {
  CopilotChat,
  CopilotKitAgentContext,
  registerComponent,
} from '@copilotkit/angular';
import { z } from 'zod';

import { ALL_ROUTES } from '../../lib/nav-config';
import { RouteStatusCardComponent } from './route-status-card.component';

/**
 * Sent to the agent alongside the ledger. It states the two empty cases
 * separately on purpose: "the page sent no records at all" and "the page sent
 * records, none of which match" are different answers, and an agent that runs
 * them together reads an empty ledger as an invitation to invent one.
 */
const LEDGER_DESCRIPTION = [
  'Harness route ledger: every route in this app, the doc page it tests, and',
  'its implementation status. JSON array of records with the fields path,',
  'title, docPath, summary, status, and optionally statusNote, premium, and',
  'hasDemo.',
  'This ledger is the ONLY source of route facts. Answer about a route, a',
  'status, or a doc page only if a record for it appears here, and use that',
  "record's own field values verbatim — never your own knowledge of",
  'CopilotKit, and never a guess.',
  'If this ledger is empty, say that the page sent no route records at all,',
  'and name that as what is missing.',
  'If this ledger has records but none of them match what was asked, say that',
  'the request names something the page does not hold, name the route or',
  'field that is missing, and list the paths the page did send.',
  'Call show_route_status only for a record that appears here, and fill every',
  'one of its arguments from that record.',
].join(' ');

@Component({
  selector: 'app-route-status-chat',
  imports: [CopilotChat, CopilotKitAgentContext],
  template: `
    <div
      [copilotkitAgentContext]="ledgerContext"
      aria-hidden="true"
      class="hidden"
    ></div>
    <copilot-chat />
  `,
})
export class RouteStatusChatComponent {
  /**
   * Complete at construction, so the directive's ngOnInit registration is the
   * first one and no later input change is needed to create it.
   */
  protected readonly ledgerContext = {
    description: LEDGER_DESCRIPTION,
    value: JSON.stringify(ALL_ROUTES),
  };

  constructor() {
    registerComponent({
      name: 'show_route_status',
      description:
        "Show one route from this harness's route ledger. Only call this for a route that appears in the shared ledger context, and copy every argument from that record.",
      parameters: z.object({
        path: z
          .string()
          .describe("The record's `path`, such as /quickstart"),
        title: z.string().describe("The record's `title`"),
        docPath: z
          .string()
          .describe("The record's `docPath`, copied exactly"),
        summary: z.string().describe("The record's `summary`, copied exactly"),
        status: z
          .string()
          .describe(
            "The record's `status`: working, partial, reference, broken, or not-started",
          ),
        statusNote: z
          .string()
          .describe(
            "The record's `statusNote`. If the record has no statusNote, pass the empty string — never write one.",
          ),
      }),
      component: RouteStatusCardComponent,
    });
  }
}
