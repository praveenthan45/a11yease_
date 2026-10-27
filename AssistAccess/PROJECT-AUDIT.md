# AssistAccess project audit

**Audit date:** 10 October 2026

**Scope:** the `AssistAccess/` source folder added to the `Navin` branch. The existing A11yease website at the repository root remains a separate project.
**Environment:** Windows, Node.js 24.11.1, npm 11.6.2, local Chrome; dependency advisories queried from the npm registry on the audit date.

## Project inventory and architecture

| Area | Contents and role |
| --- | --- |
| `src/accessibility/` | React widget, 14 feature groups, settings, DOM audits, visual/motion controls, integration API, and host patterns. |
| `demo/` | Vite demo with deliberate accessibility faults for exercising the widget. These fixtures are intentional. |
| `src/accessibility/integration/devHarness/` | Hostile CSS and DOM fixtures for embedding and responsive behavior. |
| `server/` | Optional Node HTTP API for reviewed image alt suggestions and SQLite corrections. The OpenAI key stays server-side. |
| `test-host/` | Real-browser alt-text integration fixtures and scripts. |
| `tools/` | Chrome layout and axe-core audit script. Generated images and JSON are ignored. |
| `docs/` and `*.md` | Architecture, integration, testing, alt-text, and prior layout review notes. |

The Vite build produces a two-page demo/harness and a standalone IIFE in `dist/embed/assistaccess.js`. Build output and dependencies are ignored; consumers must build the bundle before serving it. The optional API is a separate process and needs a site registry, signing secret, and an authenticated token issuer in the integrating application.

## Verification performed

| Check | Result |
| --- | --- |
| `npm run check` | Passed: 125 module files checked, 121 integration files reviewed with 0 errors/warnings, 31/31 settings checks passed. |
| `npm run build` | Passed: demo, host harness, and IIFE bundle built with Vite 5.4.21. |
| `npm run test:alt` | Passed: 11 tests; one optional live-provider test skipped because `OPENAI_API_KEY` was absent. |
| `npm run test:browser:alt` | Passed in Chrome: edit/apply/undo, persistence, responsive bounds, and keyboard behavior; no console errors. |
| `npm run test:browser:alt:edges` | Passed in Chrome: deferred/dynamic images, unsupported and cross-origin sources, error/retry states, and no-provider/manual behavior. |
| `npm run audit:layout` | Measured the mounted widget at 1440, 1024, 768, and 390 px: 0 layout findings; 25 keyboard stops with visible outlines; axe-core found 0 violations in light and dark modes, with 21 checks passed in each. |
| `npm audit --json` | 2 development-tool advisories: 1 high (`vite`) and 1 moderate (`esbuild`). |
| `npm audit --omit=dev --json` | 0 production dependency advisories. |
| Credential pattern scan | No matching common API key/private-key patterns in project source and documentation. This is a pattern scan, not a secret-management certification. |

The first layout invocation reached a page without the widget yet returned success. The audit script now waits for the host and treats missing measurements, missing focus coverage, or unavailable axe results as failures. The successful measurements above came from a second run against a verified local Vite URL.

## Findings and actions

| Priority | Finding | Evidence and recommended action |
| --- | --- | --- |
| High | Development tooling has known advisories. | `npm audit` reports the Vite path-traversal advisory [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) and other Vite/esbuild advisories. Production dependencies have no reported advisories. Upgrade Vite and its compatible React plugin, regenerate the lockfile, then rerun builds, browser suites, and the layout gate before exposing a dev server to other machines. |
| Medium, fixed in this upload | The layout gate could falsely pass when the widget or axe-core check was absent. | `tools/layout-audit.mjs` now waits for the widget and counts missing viewport, focus, and axe results as failures. A real mounted run passed after the fix. |
| Medium | The authored React component tests are not wired into the package. | `src/accessibility/integration/tests/` documents Vitest, jsdom, Testing Library, and vitest-axe as recommended but uninstalled. Add them as development dependencies, configure Vitest, run the suites, and put all gates in CI. Until then, the component tests are unexecuted and the repository has no automated CI gate. |
| Medium | The alt-text API rate limit is in process and shared by site. | `server/altTextApi.mjs` counts requests by `siteId` and minute in a local `Map`. Legitimate users at one site can consume the shared quota, while multiple server instances each get a separate quota. For deployment at scale, use a shared limiter with a documented per-user/site policy. |
| Low | Node runtime requirement is documented but not enforced by package metadata. | `server/altTextStore.mjs` imports experimental `node:sqlite`; Node 24.11.1 printed an experimental warning during tests. Add an `engines.node` constraint and verify the chosen runtime before deployment. |

## Security and accessibility boundaries

- The API validates signed bearer scopes, site IDs and registered origins, image byte size/type/hash, and correction identity. The server sends image bytes to the configured provider only after the browser's explicit consent action; no image bytes are written to SQLite. The API key and signing secret belong only in server environment variables.
- `ASSISTACCESS_TEST_MODE=1` exposes a test-token endpoint for registered local test sites and must remain off outside the local test harness. The real token issuer is supplied by the integrating application, as described in `ALT-TEXT-INTEGRATION.md`.
- The image scanner cannot inspect cross-origin iframes, closed shadow roots, CSS backgrounds, canvas, or inaccessible cross-origin images. An alt suggestion is an editable proposal; it is not proof of correct alternative text.
- Automated axe and layout results cover the tested widget states, not full WCAG conformance. Screen-reader output, 400% zoom, browser combinations, production host CSS, and a real image-provider response still require manual or environment-specific checks. The live-provider test was deliberately skipped without an API key.

## Repository integration

The `Navin` branch already contained a separate A11yease static site and Docker setup. This upload adds AssistAccess under its own folder so the existing root site and its container behavior continue to work. The existing root tests were also run before upload: 8 sticky-key and 17 voice-command checks passed. The root Docker image serves only root `dist/`; it does not deploy AssistAccess. Build and deploy AssistAccess explicitly if it is intended to replace or accompany that site.
