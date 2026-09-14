/**
 * A display-only renderer for one row of this harness's own route ledger.
 *
 * Shape is "Let the agent display one of your components" from
 * https://docs.copilotkit.ai/angular/strands-typescript/guides/frontend-tools-generative-ui
 * — an ordinary `ToolRenderer` with a required `toolCall` signal input, read
 * through `toolCall().args`. Two mechanical deviations, matching
 * `features/tools/incident-card.component.ts`: `standalone: true` is dropped
 * (default on Angular v20+, and frontend/AGENTS.md forbids setting it), and
 * the two CopilotKit imports are `type`-only.
 *
 * The domain is this repo's, not the doc's: every field below is one field of
 * `RouteMeta` in `src/app/lib/nav-config.ts`, the same record `/status`
 * renders as a table. `registerComponent` gives this tool no handler, so the
 * tool completes with an empty result and `args` is the whole payload — there
 * is nothing to read from `call.result`.
 *
 * The guide's warning applies directly here: a well-formed card is not a
 * correct one. The model fills these props, so `/status` also publishes the
 * full ledger as agent context (see route-status-chat.component.ts) and every
 * field of the tool schema is required, so an empty or non-matching context
 * cannot be papered over with a plausible-looking half-filled record.
 */
import { Component, input } from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';

/** One `RouteMeta` record, flattened to the tool's argument shape. */
export type RouteStatusArgs = {
  path: string;
  title: string;
  status: string;
  docPath: string;
  summary: string;
  statusNote: string;
};

@Component({
  selector: 'app-route-status-card',
  template: `
    @let call = toolCall();
    @if (call.status === "in-progress") {
      <p class="text-sm text-slate-600">Looking up the route…</p>
    } @else {
      <article
        class="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm"
      >
        <header class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <strong class="text-base font-semibold text-slate-900">{{
            call.args.title
          }}</strong>
          <code class="font-mono text-xs text-slate-500">{{
            call.args.path
          }}</code>
          <span
            class="rounded-full border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-700"
            >{{ call.args.status }}</span
          >
        </header>
        <p class="mt-2 text-slate-700">{{ call.args.summary }}</p>
        <p class="mt-2 text-slate-600">{{ call.args.statusNote }}</p>
        <p class="mt-3 font-mono text-xs break-all text-slate-500">
          {{ call.args.docPath }}
        </p>
      </article>
    }
  `,
})
export class RouteStatusCardComponent implements ToolRenderer<RouteStatusArgs> {
  readonly toolCall = input.required<AngularToolCall<RouteStatusArgs>>();
}
