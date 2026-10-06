# Git, GitHub, and classroom alpha

## Intended workflow

The MacBook Air holds the local development checkout. Git records changes locally. The public `pipebrain/urban-palm-tree` GitHub repository stores pushed commits and supports review/backups. GitHub Pages serves a built static version after an explicitly requested release. On 6 October 2026 Andrew authorized publication of the M0 feasibility preview, then requested M1 publication for iPhone and Android checks before the full classroom alpha is ready.

These are separate operations. A code push should not publish an unfinished alpha automatically.

Current status, 6 October 2026: the working source is **M2 version 0.2.0**, with 57 passing tests and successful local production browser verification; physical-phone M2 review remains outstanding. Andrew authorized M2 after reporting that M1 0.1.1 passes on Android and iOS phones. The prior public release was **M1 version 0.1.1**, source `9ada447447811f51000db92f9287fc45045e2e18`, published successfully in [Actions run 37454092024](https://github.com/pipebrain/urban-palm-tree/actions/runs/37454092024). Andrew subsequently unpublished Pages and explicitly requested redeployment. **M2 0.2.0 is published and verified** from `95684ad4376cc32221962b34f8acc3699d55ea1a` in [Actions run 37479683546](https://github.com/pipebrain/urban-palm-tree/actions/runs/37479683546). All release files match the tested build, and live Chrome/WebKit authoring and fresh offline checks pass; see the [M2 deployment record](M2-PAGES-DEPLOYMENT.md). See [M2 results](M2-RESULTS.md), [M1 deployment record](M1-PAGES-DEPLOYMENT.md), and [rendering correction](M1-IOS-RENDERING-FIX.md). Implementation and code pushes alone do not authorize or trigger a deployment.

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
3. For the classroom alpha, complete the documented alpha acceptance checklist. Earlier milestone previews may be published under a specific release instruction with their limitations clearly stated, as M0 and M1 were.
4. Select a stable commit and identify the release version.
5. When Andrew requests publication, run a separate GitHub Actions Pages deployment for that commit.
6. Verify the resulting URL, record the commit, and provide tester instructions.
7. For a regression, redeploy a known-good build; preserve user file compatibility.

GitHub Actions is the build/deploy mechanism. `.github/workflows/pages.yml` is manually triggered with `workflow_dispatch`; it has no push trigger. Use **Actions → Deploy GitHub Pages → Run workflow** from workflow branch `main`. Enter the stable commit SHA in **Commit SHA, tag, or branch to publish** (`ref`, default `main`) to publish an authorized revision or roll back to a known-good one. The build uses `APP_BASE=/urban-palm-tree/`; the public URL is [https://pipebrain.github.io/urban-palm-tree/](https://pipebrain.github.io/urban-palm-tree/). See the [M2 deployment record](M2-PAGES-DEPLOYMENT.md), [historical M1 deployment record](M1-PAGES-DEPLOYMENT.md) and [historical M0 deployment record](PAGES-DEPLOYMENT.md) for exact revisions and verification. Repeat deployment and live-asset verification for future releases.

Before release, confirm the chosen public content and attribution. Reference links and original explanatory notes are suitable foundations; possession of classroom or handbook materials does not by itself make them public release content.

## Tester expectations

The requested **M2 0.2.0** release adds node, unit, and relationship editors, Markdown/math notes, groups, reversible curation, and undo/redo to M1 browsing. There is no global edit-mode toggle: select a concept and use **Inspector → Edit concept**, or use **Create concept** in Search/Library. Save applies an edit only to the active session; refreshing or closing discards session changes. Autosave, workspace files, source export, and Reload from source remain M3.

For an older cached release, open the public URL online and let its update prepare, close all app tabs, then reopen. A waiting service worker does not replace an active release. M2 exposes four phone tabs (**Map, Search, Inspector, Units**) and the desktop header **M2 · SHAPE YOUR ATLAS**. The visible **Undo/Redo** controls and **Create concept** button identify the authoring release. The [deployment record](M2-PAGES-DEPLOYMENT.md) provides a focused phone-check guide.

Andrew reported acceptable performance during rough physical Android/iOS testing of M0 on 6 October 2026. Following M1 publication that day, he reported that M1 passes on physical iOS and Android phones except for UI rendering issues in iOS Safari and Chrome. KaTeX renders as expected; other fonts appear missing, the logo arrow appears as an emoji, and the hop selector is shorter than its adjacent control. Device models, OS/browser versions, the Android browser, and a detailed protocol were not supplied. This is physical smoke acceptance with rendering exceptions, not comprehensive offline/storage certification.

The M1 0.1.1 correction includes bundled Inter 4.1, SVG UI icons, and explicit WebKit select appearance with a matching 44 px mobile height. The manual deployment succeeded and live release assets match the verified build; local Chrome/WebKit and offline font checks pass. Andrew subsequently reported that the corrected release passes on Android and iOS phones, then authorized M2 implementation. This closes the reported rendering follow-up without certifying offline/storage behavior or the later classroom alpha. See [M0 results](M0-RESULTS.md), [M1 results](M1-RESULTS.md), and [rendering correction](M1-IOS-RENDERING-FIX.md).

M2 adds session authoring, groups, reversible exclusion, and undo/redo. Local production verification, the requested deployment, and live asset/authoring/offline checks pass. Save applies an editor action to the current session; autosave, workspace files, source export, and Reload from source remain M3. The following expectations apply to the later classroom alpha after its acceptance checks pass.

The alpha supports individual exploration and authoring. Edits are local until exported. Reopening the site should recover local work where storage remains available, and explicit workspace files provide a portable backup. Transferring a file is manual synchronization.

Give testers a concise guide covering graph navigation, the shape legend, editing, unit references, save/export, import, known limitations, and the release version. A feedback channel can be selected later; this plan does not authorize sending classmates invitations or messages.
