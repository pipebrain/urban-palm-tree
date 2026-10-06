# Git, GitHub, and classroom alpha

## Intended workflow

The MacBook Air holds the local development checkout. Git records changes locally. The chosen GitHub repository stores pushed commits and supports review/backups. GitHub Pages serves a built static version to testers once a release is ready.

These are separate operations. A code push should not publish an unfinished alpha automatically.

## Local Mac setup

Codex should first inspect the chosen folder and any existing repository. Check installed Git, Apple developer command-line tooling if needed, the JavaScript runtime, package manager, and Codex setup before installing anything.

Use a supported runtime compatible with the selected dependencies, record the version, and commit a lockfile. Choose one package manager and document it. Application source, documentation, reproducible data preparation, and attribution belong in Git. Generated dependency directories, build output, temporary files, credentials, and personal workspace backups generally do not.

Begin with a documentation commit, then small implementation commits for each useful milestone. Keep a readable default branch; use short-lived branches for larger changes. Commit messages should describe the behaviour changed. No complex branching scheme is required for one primary developer.

This package has not installed tooling, initialized Git on the Mac, authenticated GitHub, or created a remote repository.

## Connecting the remote

The repository must be private for now. Andrew selects the account/owner and repository name. Inspect existing GitHub authentication on the Mac and use the supported sign-in flow if needed. Never embed an access token in the application or commit credentials. Do not change repository visibility to make deployment easier.

Push local commits to the chosen repository. Do not create a duplicate repository when one already exists. Normal pushes preserve history; avoid force pushes to shared branches.

A private repository is now confirmed. GitHub Free supports Pages from public repositories; Pages from private repositories depends on the account plan. Verify the available hosting route before the later alpha release while preserving repository privacy. Website visibility must be considered separately from source visibility.

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

## Suggested initial release process

1. Develop and commit locally; push work to GitHub.
2. Run the stage-specific checks and build verification without deploying.
3. Complete the documented alpha acceptance checklist.
4. Select a stable commit and identify the release version.
5. When Andrew requests publication, run a separate GitHub Actions Pages deployment for that commit.
6. Verify the resulting URL, record the commit, and provide tester instructions.
7. For a regression, redeploy a known-good build; preserve user file compatibility.

GitHub Actions is the proposed build/deploy mechanism. No workflow has been implemented in this documentation package.

Before release, confirm the chosen public content and attribution. Reference links and original explanatory notes are suitable foundations; possession of classroom or handbook materials does not by itself make them public release content.

## Tester expectations

The alpha supports individual exploration and authoring. Edits are local until exported. Reopening the site should recover local work where storage remains available, and explicit workspace files provide a portable backup. Transferring a file is manual synchronization.

Give testers a concise guide covering graph navigation, the shape legend, editing, unit references, save/export, import, known limitations, and the release version. A feedback channel can be selected later; this plan does not authorize sending classmates invitations or messages.
