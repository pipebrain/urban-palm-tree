# HVACR knowledge graph — Codex handoff

Prepared for Andrew Gal • 6 October 2026 • Planning baseline v0.2

This package captures the accepted concept for a learning web app supporting 313A Advanced Level III study at UA Local 787 JTAC. The institution is context, not an asserted sponsor or endorser.

**M0 has now been implemented.** Start with [README.md](README.md) to run the app and [M0 results](docs/M0-RESULTS.md) for evidence and limitations. The original planning handoff below remains the historical baseline. Andrew made [pipebrain/urban-palm-tree](https://github.com/pipebrain/urban-palm-tree) public and authorized publishing the M0 feasibility preview with GitHub Pages on 6 October 2026. M1–M4 remain future work; publication does not establish classroom alpha readiness.

## What to do on your M2 MacBook Air

1. Extract this package into a new project folder.
2. Open that folder in Codex. Keep AGENTS.md at the project root.
3. Give Codex the first-task prompt below.
4. Use Git locally from the first milestone. The project is now connected to the public `pipebrain/urban-palm-tree` repository, following Andrew's updated visibility decision.
5. Publish through the manually triggered GitHub Pages workflow when Andrew requests a release. The current request authorizes an M0 preview before the full first-stage alpha criteria are met; preserve its stated limitations.

The app must also support editing and file transfer on Android and iPhone. Android is the preferred phone for file handling. Initial development and toolchain setup target the Mac. Target offline reopening and authoring after a successful initial online preparation, with a menu action named Reload from source. Workspace files preserve content and layout, not undo/redo history.

## Read these files in order

| File | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Standing project instructions for Codex |
| [Product brief](docs/PRODUCT-BRIEF.md) | Accepted behaviour, domain meaning, and boundaries |
| [Development plan](docs/DEVELOPMENT-PLAN.md) | Milestones and observable acceptance criteria |
| [Decisions and sources](docs/DECISIONS-AND-SOURCES.md) | Confirmed choices, provisional defaults, unresolved questions, references |
| [Git and release workflow](docs/GIT-AND-RELEASE.md) | Mac-to-GitHub workflow and eventual Pages alpha |

The latest direct instruction from Andrew takes precedence over this planning snapshot. Keep these documents updated when a decision changes.

## First task to give Codex

> Read AGENTS.md and all four documents in docs. Begin milestone M0 only: establish a reproducible local development foundation and validate the graph-rendering approach against the actual full QUDT import. Inspect the existing Mac tooling before changing it. Use React, TypeScript, dockview-react, and KaTeX; preserve a future CoolProp WASM boundary. Record the exact QUDT source and version. Evaluate graph rendering and force layout with full node counts, KaTeX labels, touch interaction, and a phone-sized layout. Include a small, clearly identified HVACR authoring example without presenting it as QUDT-provided content. Keep the full imported eligible universe as the starting view. Choose ordinary reversible implementation details and document them. Report actual verification, limitations, and the next milestone. Do not implement goals 2–5 or publish the app as part of this task.

M0 includes application scaffolding and a feasibility implementation when this prompt is used; this document itself contains neither.

## Decisions that remain open

None prevents M0. Offline use is a confirmed development target; prove its feasibility on target devices. Undo/redo is session-only. The repository is public `pipebrain/urban-palm-tree`, and a public M0 Pages preview is authorized. The classroom alpha still needs the documented acceptance checks. M0 selected Canvas with a bounded KaTeX overlay and d3-force in a Web Worker; see the results for the evidence.

Reload from source means restoring the app's released content/defaults, using the latest published version when online or an explicitly labelled cached source version when offline. Protect the current workspace before replacement. It does not mean fetching unpublished GitHub commits or requiring repository credentials.

Do not assume file export provides live device synchronization. Do not assume a private source repository makes the published app private.
