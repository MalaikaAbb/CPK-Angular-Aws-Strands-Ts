import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { StatusBadge } from '../components/ui';
import { RouteStatusChatComponent } from '../features/route-status/route-status-chat.component';
import { ALL_ROUTES, docUrl } from '../lib/nav-config';

@Component({
  selector: 'app-status-page',
  imports: [RouterLink, StatusBadge, RouteStatusChatComponent],
  template: `
    <header class="mb-6 border-b border-slate-200 pb-5">
      <h1 class="text-2xl font-bold text-slate-900">Status overview</h1>
      <p class="mt-2 text-sm text-slate-600">
        Every route and the doc page it tests. The doc-sync date lives on <a routerLink="/doc-sync" class="underline">/doc-sync</a>.
        This table and the sidebar both read from
        <code>src/app/lib/nav-config.ts</code>, so a status is stated once.
      </p>
    </header>

    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-slate-600">
            <th class="py-2 pr-4 font-semibold">Route</th>
            <th class="py-2 pr-4 font-semibold">Doc page</th>
            <th class="py-2 pr-4 font-semibold">Status</th>
            <th class="py-2 font-semibold">Notes</th>
          </tr>
        </thead>
        <tbody>
          @for (route of routes; track route.path) {
            <tr class="border-b border-slate-100 align-top">
              <td class="py-3 pr-4">
                <a
                  [routerLink]="route.path"
                  class="font-medium text-blue-700 underline decoration-dotted"
                  >{{ route.title }}</a
                >
                <div class="font-mono text-xs text-slate-500">
                  {{ route.path }}
                </div>
              </td>
              <td class="py-3 pr-4">
                <a
                  [href]="doc(route.docPath)"
                  target="_blank"
                  rel="noreferrer"
                  class="font-mono text-xs break-all text-slate-600 underline decoration-dotted"
                  >{{ route.docPath }}</a
                >
              </td>
              <td class="py-3 pr-4">
                <ui-status-badge [status]="route.status" />
                @if (route.premium) {
                  <div class="mt-1 text-xs font-semibold text-violet-700">
                    Premium
                  </div>
                }
              </td>
              <td class="py-3 text-slate-600">
                {{ route.statusNote ?? route.summary }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <p class="mt-6 text-xs text-slate-500">
      Legend — Working: exercisable against the local stack. Partial:
      implemented, but a license or a runtime capability outside this repo
      limits it. Reference: intentionally not a live feature.
    </p>

    <section class="mt-10 border-t border-slate-200 pt-6">
      <h2 class="text-lg font-semibold text-slate-900">Ask about the ledger</h2>
      <p class="mt-2 mb-4 text-sm text-slate-600">
        The same <code>ALL_ROUTES</code> array the table above renders is also
        published to the agent as context, so it can answer from this repo's
        records rather than from what it remembers about CopilotKit. Ask it for
        a route — &ldquo;what's the status of /memory?&rdquo; — and it calls
        <code>show_route_status</code> to render that one record as a card.
        Ask for a route this harness does not have and it should say so and
        name what the page did send, rather than produce a plausible card.
      </p>
      <div class="h-[32rem] overflow-hidden rounded-lg border border-slate-200">
        <app-route-status-chat />
      </div>
    </section>
  `,
})
export default class StatusPage {
  protected readonly routes = ALL_ROUTES;

  protected doc(docPath: string): string {
    return docUrl({ docPath } as Parameters<typeof docUrl>[0]);
  }
}
