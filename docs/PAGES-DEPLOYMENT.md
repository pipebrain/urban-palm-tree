# GitHub Pages — M0 preview

Published and verified 6 October 2026 (America/Toronto), after Andrew made the repository public and explicitly requested Pages enablement. This publishes the feasibility preview, not a completed classroom alpha.

Later status, 6 October 2026: Andrew reported acceptable performance during rough physical Android/iOS testing of M0. Models, browser versions, and comprehensive/offline verification were not supplied. M1 source is now version 0.1.0 with separate local verification, but **no M1 deployment has occurred**; the deployed M0 revision and measurements below remain unchanged.

- Site: [https://pipebrain.github.io/urban-palm-tree/](https://pipebrain.github.io/urban-palm-tree/)
- Repository: [pipebrain/urban-palm-tree](https://github.com/pipebrain/urban-palm-tree), verified public.
- Deployed source: [`85c174f0a1655db666e299afea436677fd0c0067`](https://github.com/pipebrain/urban-palm-tree/commit/85c174f0a1655db666e299afea436677fd0c0067).
- Successful [workflow run 37444090763](https://github.com/pipebrain/urban-palm-tree/actions/runs/37444090763): build 1m5s, deployment 9s.
- Pages source: GitHub Actions (`workflow`); HTTPS enforced; public URL returned HTTP 200.
- App version 0.0.1; QUDT source version 3.5.2; offline build `e337ce973824e4878e2a`.

## Publishing behavior

[The workflow](../.github/workflows/pages.yml) accepts **workflow_dispatch only**. Ordinary code pushes do not publish. Run it from workflow branch `main` and set **Commit SHA, tag, or branch to publish** to the desired stable revision; the default is `main`. Rollback means manually publishing a previously verified revision through the same workflow. Workflow action revisions, Node 24.19.0, pnpm 11.25.0, and project dependencies are pinned. Build and deploy are separate jobs; only deployment receives Pages/OIDC write permissions.

The hosted Linux build installed the frozen lockfile, verified the full deterministic QUDT import, passed all 11 integrity tests and formatting checks, then built the repository subpath with the complete offline manifest. TypeScript checking is included in the build. Only `dist` is uploaded. No private-repository credential is embedded in the browser bundle.

The workflow follows [GitHub's custom Pages workflow requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Vite's project-site base-path guidance](https://vite.dev/guide/static-deploy.html#github-pages). The configured base path is `/urban-palm-tree/`.

## Live verification

Checks ran against the public HTTPS site in Chrome **154.0.8037.98** on the Mac, in isolated desktop and touch-emulated phone contexts. All **1,555 imported nodes + 1 authored equation** were visible after Fit all. Search/selection, direct canvas tap, pan, pinch, zoom, pin/pause, temporary example edits, internal unit identities, KaTeX, and inspector layout passed. No horizontal document overflow or page errors was observed.

| Profile | Viewport | Online navigation to graph and running layout | Visible node shapes | Page errors |
| --- | --- | ---: | ---: | ---: |
| desktop | 1440 × 960 | 1260 ms | 1556 | 0 |
| phone | 390 × 844 | 2032 ms | 1556 | 0 |

Online timings include public-network loading and are single observed runs, not performance guarantees or physical-phone measurements. [Live interaction report](verification/pages-browser-report.json).

Offline preparation verified **65 assets / 6,622,224 bytes**, including all **59 KaTeX font files**, the complete graph/unit dataset, and layout worker. After closing every app tab, disabling network, and opening a fresh page at the deployed URL, the graph and previously unseen constant/unit/math loaded successfully: desktop **303 ms**, phone viewport emulation **269 ms**, zero page errors. [Live offline report](verification/pages-offline-report.json). This verifies new-document startup, not browser-process restart or permanent storage retention.

To reproduce these historical checks, use the deployed M0 source revision and its matching scripts, then build for the production path. Current M1 browser scripts expect M1 features and should not be run against this older public release as if it were M1:

```sh
APP_BASE=/urban-palm-tree/ sh scripts/pnpm.sh build
PREVIEW_URL=https://pipebrain.github.io/urban-palm-tree/ sh scripts/pnpm.sh test:browser
PREVIEW_URL=https://pipebrain.github.io/urban-palm-tree/ sh scripts/pnpm.sh test:offline-browser
```

## Scope and limitations

Physical Android/iOS M0 smoke testing is user-reported; Safari-specific behavior, detailed device performance, and physical offline reopening remain unverified. The deployed preview has a temporary name/LaTeX editing probe, but no full authoring, undo/redo, autosave, portable workspace files, source export, or Reload from source. Refreshing discards the draft. Public availability does not complete later milestone acceptance; [M1 results](M1-RESULTS.md) cover the newer source separately. Source constants remain imported/unreviewed, and no conversions, equations, or CoolProp calculations are evaluated.

Later documentation and implementation commits do not change the deployed artifact unless the workflow is explicitly run again.
