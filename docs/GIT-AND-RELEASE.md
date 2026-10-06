# Git, GitHub, and classroom alpha

## Intended workflow

The MacBook Air holds the local development checkout. Git records changes locally. The public `pipebrain/urban-palm-tree` GitHub repository stores pushed commits and supports review/backups. GitHub Pages serves a built static version after an explicitly requested release. On 6 October 2026 Andrew authorized publication of the M0 feasibility preview before the full classroom alpha is ready.

These are separate operations. A code push should not publish an unfinished alpha automatically.

Current status, 6 October 2026: the working source is M1 version 0.1.0. The public Pages artifact remains the M0 release at `85c174f0a1655db666e299afea436677fd0c0067`. M1 implementation and verification do not authorize or trigger a new deployment.

## Local Mac setup

Codex should first inspect the chosen folder and any existing repository. Check installed Git, Apple developer command-line tooling if needed, the JavaScript runtime, package manager, and Codex setup before installing anything.

Use a supported runtime compatible with the selected dependencies, record the version, and commit a lockfile. Choose one package manager and document it. Application source, documentation, reproducible data preparation, and attribution belong in Git. Generated dependency directories, build output, temporary files, credentials, and personal workspace backups generally do not.

Begin with a documentation commit, then small implementation commits for each useful milestone. Keep a readable default branch; use short-lived branches for larger changes. Commit messages should describe the behaviour changed. No complex branching scheme is required for one primary developer.

M0 initialized local Git and recorded the original handoff before implementation. It uses the existing Codex-bundled Node/pnpm runtime without changing system tooling. Exact dependencies and source data are pinned and checked in. The repository was initially created private and the M0 commits pushed on 6 October 2026; Andrew subsequently made it public and requested enabling Pages. Local `origin` is `https://github.com/pipebrain/urban-palm-tree.git`; `main` tracks `origin/main`. GitHub CLI 2.102.0 was installed through Homebrew and authenticated as `pipebrain` using its browser sign-in flow. See [README](../README.md) for commands.

## Connecting the remote

Andrew selected owner `pipebrain` and repository name `urban-palm-tree` on 6 October 2026, then made the repository public and requested Pages publication. Inspect existing GitHub authentication on the Mac and use the supported sign-in flow if needed. Never embed an access token in the application or commit credentials. Future visibility changes require Andrew's instruction.

Push local commits to the chosen repository. Do not create a duplicate repository when one already exists. Normal pushes preserve history; avoid force pushes to shared branches.

The current source repository and Pages preview are intended to be public. Confirm the Pages deployment succeeds and verify its URL; changing repository visibility alone does not deploy the app.

## Why GitHub Pages fits

Stage 1 can be a static client application: its graph, editor, unit reference logic, file handling, and future WASM property calculation can run in the browser. No server endpoint is required for this authoring model.

Pages does not provide an application database or shared editing service. Each tester starts from the released content and creates a separate local workspace. Changes to the shared default content happen when Andrew imports/reviews an export and includes it in a later code/content release.

Ordinary GitHub Pages sites are publicly reachable, even when a qualifying plan permits a private source repository. Do not describe an ordinary alpha URL as class-only access. If access restriction becomes required, verify the account's actual capability or revisit the hosting design.

## Build/deployment considerations

Use a static build and a Pages-compatible asset base path. Project sites commonly live below a repository-name path, so fonts, QUDT data, images, worker files, and any WASM must resolve there.

Choose routing that survives refresh on Pages. Verify deployed behaviour; a local development server can hide path errors.

Keep a future CoolProp build reproducible. Ensure WASM can be loaded under the actual host conditions, and avoid relying on server features unavailable on the chosen host. Validate downloads and browser support when adding the engine.

Offline use is a confirmed target after a successful initial online preparation. Verify reopening with required app assets, the full baseline, and fonts available. Define cache updates so a new app/content version does not overwrite an author's existing workspace. Keep app assets, the released source baseline, and user-authored content conceptually separate.

Reload from source retrieves the released app content/defaults from the deployment when online; it may restore the identified cached baseline while offline. It must protect current edits and validate compatibility before replacement. It never requires browser access to private repository credentials. Workspace saves and autosave omit undo/redo history.

## Release process

1. Develop and commit locally; push work to GitHub.
2. Run the stage-specific checks and build verification without deploying.
3. For the classroom alpha, complete the documented alpha acceptance checklist. The currently authorized M0 feasibility preview may be published earlier with its limitations clearly stated.
4. Select a stable commit and identify the release version.
5. When Andrew requests publication, run a separate GitHub Actions Pages deployment for that commit.
6. Verify the resulting URL, record the commit, and provide tester instructions.
7. For a regression, redeploy a known-good build; preserve user file compatibility.

GitHub Actions is the build/deploy mechanism. `.github/workflows/pages.yml` is manually triggered with `workflow_dispatch`; it has no push trigger. Use **Actions → Deploy GitHub Pages → Run workflow** from workflow branch `main`. Enter the stable commit SHA in **Commit SHA, tag, or branch to publish** (`ref`, default `main`) to publish an authorized revision or roll back to a known-good one. The build uses `APP_BASE=/urban-palm-tree/`; the public URL is [https://pipebrain.github.io/urban-palm-tree/](https://pipebrain.github.io/urban-palm-tree/). The first deployment succeeded on 6 October 2026 and live browser checks passed; [the deployment record](PAGES-DEPLOYMENT.md) identifies its exact commit and verification. Repeat deployment and live-asset verification for future releases.

Before release, confirm the chosen public content and attribution. Reference links and original explanatory notes are suitable foundations; possession of classroom or handbook materials does not by itself make them public release content.

## Tester expectations

The public **M0** preview supports exploration and a temporary example-editing probe. The current **M1** source adds typed relationships, reviewed classifications and exact unit preferences, filters/neighbourhoods, reference navigation, and temporary display overrides; run it using the [local preview instructions](../README.md). Neither version provides full authoring, undo/redo, autosave, workspace files, source export, or Reload from source. Refreshing discards session changes.

Andrew reported acceptable performance during rough physical Android/iOS testing of M0 on 6 October 2026, without model/browser details or offline certification. M1's passing phone browser checks use touch emulation on the Mac; physical M1 testing remains outstanding. See [M0 results](M0-RESULTS.md) and [M1 results](M1-RESULTS.md). The following expectations apply to the later classroom alpha after its acceptance checks pass.

The alpha supports individual exploration and authoring. Edits are local until exported. Reopening the site should recover local work where storage remains available, and explicit workspace files provide a portable backup. Transferring a file is manual synchronization.

Give testers a concise guide covering graph navigation, the shape legend, editing, unit references, save/export, import, known limitations, and the release version. A feedback channel can be selected later; this plan does not authorize sending classmates invitations or messages.
