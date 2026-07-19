# Nothing More privacy and data-flow evidence

This document describes the implemented boundary. It does not claim that API processing leaves no
trace, and it does not replace an organization's own privacy, security, or legal review.

## Public sample path

```text
browser input
  -> checked-in sample analysis in the browser
  -> deterministic TypeScript planning in the browser
  -> automatic plaintext LocalStorage save attempt in the same browser
```

- The page creates the sample analysis directly and does not call `/api/analyze`.
- No task text is sent to the site server, OpenAI, Anthropic, or Google on this path.
- After a successful plan, the app automatically attempts to save one recent source scenario as
  plaintext in browser LocalStorage. When browser storage is available, it remains until the user
  deletes it or another successful scenario replaces it.

## Live path when deliberately enabled

```text
browser
  -> same-origin POST /api/analyze
  -> Next.js backend validates the bounded request
  -> OpenAI Responses API receives task ID, name, and description
  -> validated structured analysis returns with Cache-Control: no-store
  -> deterministic planning and an automatic LocalStorage save attempt happen in the browser
```

The browser sends the backend one to eight bounded task records. Before calling OpenAI, the backend
projects them to this exact analysis allowlist:

- task ID
- task name
- task description

Priority, deadline, failure impact, budget, subscription observations, quota observations, catalog
overrides, and the API key are excluded from the OpenAI classification input. Anthropic and Google
APIs are not called; their plan comparisons use versioned local catalog data.

## Secret boundary

- The app never asks an end user to paste an API key into the browser.
- The backend reads `OPENAI_API_KEY` from its execution environment and uses it only to authenticate
  the OpenAI request.
- The key is not included in browser JavaScript, LocalStorage, result exports, or API responses.
- Release policy requires public production to keep `ENABLE_LIVE_ANALYSIS=false` and omit an OpenAI
  API key. The final deployment checklist must verify both conditions on the exact release commit.
- A private operator can validate Live locally with a gitignored `.env.local` file. That local file
  is plaintext and must be protected like any other developer secret.

## Storage and retention boundaries

| Layer | Content | Implemented behavior |
| --- | --- | --- |
| Browser memory | Form input and calculated results | Exists while the page is open. |
| Browser LocalStorage | One recent source scenario, including task text | Plaintext until the user deletes it or another successful scenario replaces it. |
| Nothing More backend | Live request and response during execution | No application database, file write, request-body logger, or raw upstream-error response path. |
| Hosting platform | Invocation metadata | May record operational metadata such as method, path, status, region, and outgoing request. |
| OpenAI | Live task ID, name, description, and structured output | `store:false` disables response application-state storage, but it is not Zero Data Retention. Abuse-monitoring records and prompt caching have separate rules. |
| JSON/Markdown export | Allowlisted plan source and result fields | Leaves the app through a local file or clipboard and can contain task text. |

OpenAI states that API data is not used to train models unless the customer explicitly opts in to
data sharing. Its default abuse-monitoring logs may contain customer content for up to 30 days, with
limited longer-retention exceptions. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

## Enforced evidence

- `tests/analyze-tasks-privacy.test.ts` replaces the OpenAI SDK with a fake and asserts the exact
  outbound allowlist, server-only key placement, and `store:false`.
- `tests/live-analyze-route.test.ts` proves the fail-closed gate, missing-key response, successful
  server-key use, `Cache-Control: no-store`, and raw upstream error containment.
- `tests/analyze-route.test.ts` proves the 96 KiB body limit and contains stream-read errors.
- `tests/scenarios.test.ts` validates the LocalStorage source allowlist, overwrite behavior, derived
  result exclusion, deletion, and storage-failure containment.
- `tests/i18n.test.ts` keeps the plaintext storage and Live transmission disclosures present in
  Korean, English, and Japanese.
- Production CSP includes `connect-src 'self'`, limiting script-initiated connection channels covered
  by that directive—such as fetch, XMLHttpRequest, WebSocket, EventSource, and beacon—to the same
  origin. It is one boundary, not a claim that every possible browser request or data leak is blocked.
  The backend remains the only intended Live analysis network boundary exposed to the UI.
- The runtime dependency list contains the OpenAI SDK but no Anthropic, Google generative-AI, or
  analytics SDK.

## Claims this project deliberately does not make

- It does not claim that Live input is anonymous.
- It does not claim that a local Live run avoids OpenAI processing.
- It does not claim that `store:false` is Zero Data Retention.
- It does not claim that hosting and network providers retain no operational metadata.
- It does not automatically detect or remove personal, customer, company-confidential, credential,
  health, or financial information.
- It is not currently safe to expose unauthenticated Live analysis publicly. Public enablement would
  first require authentication, per-user limits, rate limiting, cost controls, and a new privacy
  review.

For confidential company work, use only an organization-approved API project and policy, or remove
identifying and confidential details before Live analysis. When approval is uncertain, use the
public sample path instead.
