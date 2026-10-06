# HVACR knowledge graph — Codex handoff

Prepared for Andrew Gal • 6 October 2026 • Planning baseline v0.2

This package captures the accepted concept for a learning web app supporting 313A Advanced Level III study at UA Local 787 JTAC. The institution is context, not an asserted sponsor or endorser.

**M0 has now been implemented locally.** Start with [README.md](README.md) to run the app and [M0 results](docs/M0-RESULTS.md) for evidence and limitations. The original planning handoff below remains the historical baseline. No remote repository or deployment has been created.

## What to do on your M2 MacBook Air

1. Extract this package into a new project folder.
2. Open that folder in Codex. Keep AGENTS.md at the project root.
3. Give Codex the first-task prompt below.
4. Use Git locally from the first milestone. Connect the project to a private GitHub repository when its name, owner, and credentials are established. Keep the repository private unless Andrew later changes that decision.
5. Enable GitHub Pages publishing only after the first-stage alpha criteria are met and you choose to release.

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

None prevents M0. Offline use is now a confirmed development target; prove its feasibility on target devices. Undo/redo is session-only, and the GitHub repository is private. Account/repository naming and the eventual alpha website audience remain to be established. The exact graph library is a technical choice to resolve in M0 using observed results.

Reload from source means restoring the app's released content/defaults, using the latest published version when online or an explicitly labelled cached source version when offline. Protect the current workspace before replacement. It does not mean fetching authenticated files directly from the private GitHub repository.

Do not assume file export provides live device synchronization. Do not assume a private source repository makes the published app private.
