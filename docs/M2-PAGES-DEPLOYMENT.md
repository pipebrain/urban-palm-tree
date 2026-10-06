# GitHub Pages — M2 0.2.0 release

**Published and verified 6 October 2026.** On 6 October 2026, Andrew reported that he had unpublished GitHub Pages and requested redeployment. This released the verified M2 authoring implementation for phone review. Andrew subsequently confirmed: “Confirming M2 is complete as per "done when".” The milestone is accepted; no detailed device/version or offline/storage protocol accompanied the confirmation.

- Public site: [HVACR Knowledge Atlas](https://pipebrain.github.io/urban-palm-tree/).
- Deployed source: [`95684ad4376cc32221962b34f8acc3699d55ea1a`](https://github.com/pipebrain/urban-palm-tree/commit/95684ad4376cc32221962b34f8acc3699d55ea1a), containing tested implementation `313984e3` and its verification documentation.
- App **0.2.0**, QUDT **3.5.2**, offline build **`a3ccb9ca6434f09fef63`**.
- Successful manual [workflow run 37479683546](https://github.com/pipebrain/urban-palm-tree/actions/runs/37479683546), dispatched **14:31:29 UTC**, completed **14:33:09 UTC** on 6 October 2026. Build **31 seconds**; deployment **61 seconds**. [Retained workflow status](verification/m2-pages-workflow.json).
- Pages publishing was found configured as legacy branch publishing from `main` at the repository root. It was restored to **GitHub Actions** (`build_type: workflow`) with HTTPS enforced, matching this app's existing manual build/deploy workflow. Only compiled `dist` output is published; the source repository root is not the application build. [Verified Pages configuration](verification/m2-pages-config.json).

## Verification

The selected source passed frozen-lockfile installation, deterministic QUDT checks, **57 tests**, formatting, TypeScript, and the repository-subpath production build before release. Production Chrome/WebKit authoring, graph, semantic, baseline offline, and fresh offline authoring checks passed locally. See [M2 results](M2-RESULTS.md) and its retained evidence for the exact conditions. The baseline includes **1,556 learning nodes**, **1,738 relationships**, and **2,933 internal unit references**; imported source and authored additions remain distinguished.

The inventory contains **67 prepared assets / 7,206,112 bytes**, including the inventory itself. All **68 release files** (the prepared assets plus `sw.js`) returned HTTP 200 and matched the verified local build byte for byte. See the [live asset comparison](verification/m2-pages-assets.json). The successful Linux workflow repeated dependency installation, source-integrity checks, all 57 tests, formatting, and the production build with TypeScript verification.

Live authoring workflows passed against the public HTTPS URL in installed **Chrome 154.0.8037.98** and Playwright **WebKit 26.6** on the Mac, each at desktop **1440×960** and touch-emulated phone **390×844**. Each engine passed **18 desktop checks / 19 phone checks**, including concept creation, contextual constants, explicit equation bindings, stable references, unit-edit propagation, Markdown/math and embedded images, exclusion/restoration, deletion guards, and undo/redo. The phone checks include canvas selection without click-through. No page errors or horizontal document overflow were reported. These are Mac browser checks, not physical Android/iPhone or iPhone Safari acceptance. [Chrome report](verification/m2-pages-authoring-chromium-report.json), [WebKit report](verification/m2-pages-authoring-webkit-report.json).

The fresh offline Chrome phone workflow closed the prepared app document, disabled networking, and opened a new document before completing **20 checks**, including the same authoring workflow and embedded image rendering. The separate baseline offline harness verified every required asset, then reopened the full graph, unseen records, unit preferences, and local interface/math fonts on both layouts. Both reported build `a3ccb9ca6434f09fef63` ready with 67 assets / 7,206,112 bytes. Single fresh offline startup observations were **301 ms desktop / 287 ms phone emulation**. These timings are developer-machine observations, not phone guarantees, browser-process/reboot tests, or storage-retention certification. [Offline authoring report](verification/m2-pages-authoring-chromium-offline-report.json), [baseline offline report](verification/m2-pages-offline-report.json).

An upgrade from an already cached M1 installation was not exercised during these fresh-context checks. The update instructions below follow the implemented waiting-worker lifecycle.

## Find editing controls

There is no global edit-mode toggle:

1. Open the public URL online. On a phone, choose **Search** and select a concept, then open **Inspector → Edit concept**. On desktop, use **Library** to select it.
2. To create an entry, choose Quantity, Equation, or Constant in Search/Library and use **Create concept**.
3. Open a unit reference and use **Edit unit presentation**. Relationships in Inspector offer **Edit relationship**.
4. Use **Save/Cancel** in the editor and the workspace **Undo/Redo** controls.
5. Create groups in Search/Library and manage membership in Inspector. Exclude a concept, locate it with **Excluded concepts only**, and restore it.

M2's desktop header says **M2 · SHAPE YOUR ATLAS**. Phone views retain **Map, Search, Inspector, Units** and add visible **Undo/Redo** and **Create concept** controls. If an existing browser still shows M1, leave the site online while its update prepares, then close every atlas tab and any installed copy before reopening the same URL. A waiting service worker does not replace an active release; an ordinary refresh may retain the old worker.

For the phone smoke check, try creating a quantity, contextual constant, and equation; edit notes with math and an embedded image; bind explicit participants; exercise overlapping groups, exclusion/restoration, drag/pinch, and undo/redo. To test fresh offline authoring, first wait for **Offline preview prepared**, close all atlas tabs, disconnect, reopen, then create temporary test content. Record the device, browser version, and observed behavior.

**Save applies an edit to this session only.** Refreshing or closing loses authored content, embedded images, groups, and history. Autosave, portable workspace files, source export, and Reload from source remain M3. Linked images and external websites may require connectivity. This release does not provide numerical conversions or equation solving.

## Future releases and rollback

The Pages workflow remains manual; ordinary code and documentation pushes do not publish. A requested rollback can dispatch the same workflow with the known-good M1 0.1.1 SHA `9ada447447811f51000db92f9287fc45045e2e18`, followed by live verification. Documentation commits following this record do not change the deployed artifact. Historical [M1](M1-PAGES-DEPLOYMENT.md) and [M0](PAGES-DEPLOYMENT.md) records retain their original verification evidence.
