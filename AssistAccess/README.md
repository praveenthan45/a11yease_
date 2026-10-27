# AssistAccess accessibility toolbar

React 18 accessibility toolbar with a demo site, host integration harness, and optional server-backed image alt-text workflow. The widget offers 14 feature groups. This project is independent of the A11yease demo at the repository root.

## Run locally

Use Node.js 24 or later (the optional correction store uses `node:sqlite`).

```powershell
cd AssistAccess
npm ci
npm run dev
```

Open the URL printed for `/demo/`. The host integration harness is at `/src/accessibility/integration/devHarness/`.

```powershell
npm run check
npm run build
npm run test:alt
```

The alt-text browser suites require the test API server and Chrome; setup is in [ALT-TEXT-INTEGRATION.md](ALT-TEXT-INTEGRATION.md). The rendered layout gate requires a running Vite server and Chrome; see [docs/layout-audit.md](docs/layout-audit.md).

Read [PROJECT-AUDIT.md](PROJECT-AUDIT.md) for the audit findings and verification status. Integration guidance starts at [src/accessibility/INTEGRATION.md](src/accessibility/INTEGRATION.md).
