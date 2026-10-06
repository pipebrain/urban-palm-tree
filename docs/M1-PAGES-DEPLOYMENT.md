# GitHub Pages — original M1 0.1.0 release

Historical record: the current public version is **0.1.1**, which corrects iOS interface fonts, icons, and select sizing. See the [patch deployment and verification record](M1-IOS-RENDERING-FIX.md). The measurements below describe the original 0.1.0 release.

Published and verified **6 October 2026**, following Andrew's explicit request to publish M1 for iPhone and Android testing. This replaces the [M0 preview](PAGES-DEPLOYMENT.md); it does not complete the later classroom-alpha criteria.

- Public site: [HVACR Knowledge Atlas](https://pipebrain.github.io/urban-palm-tree/).
- Deployed source: [`7fb7d5396a30a1dafeb57e156c6aa334a206c7e8`](https://github.com/pipebrain/urban-palm-tree/commit/7fb7d5396a30a1dafeb57e156c6aa334a206c7e8).
- App **0.1.0**, QUDT **3.5.2**, offline build **`40ca6a39ad76d82a123f`**.
- Successful [workflow run 37448915597](https://github.com/pipebrain/urban-palm-tree/actions/runs/37448915597): build **28 seconds**, deployment **8 seconds**; completed **10:19:16 UTC**.
- GitHub Actions publishing with HTTPS enforced; HTML, service worker, and offline inventory returned HTTP 200 and matched the verified local build byte for byte. [Asset comparison](verification/m1-pages-assets.json).

## Verification

The pinned Linux workflow installed the frozen lockfile, verified the deterministic source import, passed **37 tests** and formatting checks, and built the production repository path. TypeScript checks ran as part of the build. Only `dist` was published. No publication trigger or dependency was changed for this release.

Three live browser harnesses passed against the public HTTPS URL using **Chrome 154.0.8037.98** on the Mac: desktop **1440×960** and touch-emulated phone **390×844**. All **1,556** learning nodes were visible after Fit all. Checks cover search/selection, direct canvas tap, pan/pinch/zoom/drag, pin/pause, filtering and restoration, neighbourhood focus, display overrides, exact unit references, classification, same-symbol identities, source gaps, and back/forward reference navigation. No page errors or horizontal document overflow were observed. The phone screenshot was inspected. These are automated Mac browser checks, not physical Android/iPhone or Safari tests.

Online navigation to a running full graph measured **1,330 ms** on desktop and **1,423 ms** in phone emulation. These single public-network observations are not device guarantees. [Interaction report](verification/m1-pages-browser-report.json) and [semantic checks](verification/m1-pages-semantic-browser-report.json).

The complete offline preparation contains **65 assets / 6,671,900 bytes**, including the full graph/unit dataset, layout worker, and **59 font files**. The live offline harness verified every required asset was cached, closed every app tab, disabled networking, and opened a fresh page. Full graph startup, unseen constant/unit/math, and reviewed unit preferences passed in both profiles. Preference changes preserved source-use counts and the equation's unit conventions. [Offline report](verification/m1-pages-offline-report.json). This proves new-document startup within the tested contexts, not browser-process restart, reboot, storage retention, or phone-specific offline behavior.

An attempted live M0-to-M1 upgrade test missed the old-release window; no successful old-cache migration test is claimed. The update guidance below follows the implemented waiting-worker lifecycle, which intentionally avoids taking over open tabs.

## Phone check

Open the public link online. M1 has four tabs: **Map, Search, Inspector, Units**, plus **Map filters** above the graph. The desktop header also identifies **M1 · BROWSE & CONNECT**.

If an existing tab still shows M0, leave it online to download the update. When the footer reports **Preview update waiting**, close every atlas tab (and any open installed copy), then reopen the same URL. The new worker waits for all older clients to close; an ordinary refresh may keep the old worker active.

Useful smoke checks:

1. Search for Temperature, inspect its state-property classification, change its preferred unit, and open the unit's reference.
2. Open Sensible heat transfer, follow a participant, then focus its neighbourhood. Reset the map to restore the full universe.
3. Pan, pinch, select, drag, and pin a node; try a filter and restore it.
4. For offline testing, first wait for **Offline preview prepared**, close all atlas tabs, disconnect, and reopen. Record the device, browser version, and what happened.

M1's name/LaTeX overrides and unit preferences are temporary. Refresh/reopening loses session changes. Full authoring/undo remains M2; persistence and portable files remain M3. Andrew subsequently reported that M1 passes his physical Android/iOS checks except for iOS interface rendering. KaTeX renders correctly; body fonts, the logo arrow, and hop-selector sizing were the reported exceptions. See [feedback and patch verification](M1-IOS-RENDERING-FIX.md).

## Future releases and rollback

The Pages workflow remains manual; ordinary code or documentation pushes do not publish. Future releases require Andrew's release instruction. For rollback, dispatch the same workflow with the known-good M0 SHA `85c174f0a1655db666e299afea436677fd0c0067`, or another explicitly selected tested revision, then verify the resulting site. Documentation commits following this report do not change the deployed artifact.
