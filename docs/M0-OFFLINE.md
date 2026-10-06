# M0 offline preview and future property service

Implemented 6 October 2026. This milestone prepares the read-only feasibility preview. Workspace authoring, autosave, file transfer, and the protected **Reload from source** operation remain M2/M3 work. Preparation is distinct from proving a fresh offline startup on a particular device.

## Build and cache contract

The production build must finish with `node scripts/prepare-offline.mjs`. The script recursively inventories the built `dist` directory, including the full baseline and retained sources under `data/`, the graph layout worker, JavaScript/CSS, and every emitted KaTeX font. It writes a deterministic `offline-inventory.json` and a generated `sw.js`. The service worker itself is persisted by the browser's service-worker lifecycle; the inventory and all other local build files are cached. Development mode does not register it.

Asset paths resolve relative to `sw.js`, so the same approach works below a repository subpath. The worker only handles listed assets within its own origin and path. The cache name includes the app identity, full scope URL, and content-derived build ID. External reference websites are not cached.

Installation fetches the complete inventory with four concurrent requests, verifies every response's size and SHA-256 against the build, and marks the cache ready only after every asset is retained. A missing, redirected, changed, or failed response rejects installation. Incomplete caches for this build are discarded on download failure; other scopes and versions are preserved. Normal reads use the installed release's cache, so they cannot silently combine an old app with a new baseline. A missing retained file produces an explicit failure instead of fetching a different release.

The UI's prepared status requires an activated worker and a complete inventory check. It is rechecked when the page returns to the foreground. The first open page may still be uncontrolled: close/reopen is required to test startup. A successful status confirms that this browser currently retains the release; it is not a promise that the operating system will retain it forever.

New workers use the browser's waiting lifecycle. There is no `skipWaiting`, forced reload, or automatic takeover of open pages. The UI reports a waiting update; closing every tab using the old worker lets the browser activate the prepared new release. Prior build caches are deliberately retained in M0. A bounded cleanup/update interface is later work and will be needed before repeated production releases. This preview contains no authored workspace to replace.

## Browser constraints

Service workers require a secure context, normally HTTPS. Browsers treat `localhost` as secure for development. Opening `dist/index.html` as a file or visiting a phone's plain-HTTP LAN address does not establish this condition. Test a phone over a trusted HTTPS connection when device verification becomes available. See [MDN's service-worker lifecycle and secure-context guidance](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

Browser cache storage is normally best effort: user clearing, private browsing, storage pressure, and browser-specific inactivity rules can remove it. Storage limits vary by device, browser, and origin, and different apps on one origin share the quota. M0 does not request persistent storage or promise permanent backups. Later workspace export must remain available even if a persistence request is granted. See [MDN's storage retention and eviction guidance](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

## Verification and device procedure

`node --test scripts/offline.test.mjs` passes four behavior tests: complete recursive preparation with fresh navigation below a project subpath; unseen baseline/font/worker reads without network; rejection of changed-release bytes with unrelated caches preserved; cache loss detected without network mixing; deterministic generation and no forced activation. These run the generated worker in a Node harness. They do not emulate a browser's installation, quota, or storage retention.

`node scripts/offline-browser-check.mjs` exercises the production preview at `http://127.0.0.1:4173/hvacr-m0/` (override `PREVIEW_URL` for another local URL). It uses installed Google Chrome, isolated browser contexts, and writes `test-results/offline-report.json`. On Chrome 154.0.8037.98 on the Mac, both a 1440 × 960 desktop viewport and a 390 × 844 touch-emulated viewport passed: every built asset was present; after all app tabs closed and the context went offline, a fresh navigation loaded all 1,555 imported nodes plus the authored equation, restarted the layout worker, and opened the previously unviewed atomic mass constant and Kilogram unit with loaded KaTeX fonts. This proves a new offline document in these browser contexts; it does not prove physical-phone or browser-process-restart persistence. The final measured build is `f6b7851872aeb7293077`: 65 prepared assets totaling 6,621,776 bytes, including 59 KaTeX font files and the layout worker. Fresh offline navigation reached the full node count and a running layout in 280 ms on desktop and 267 ms in phone viewport emulation, with zero page errors. These are single observed runs, not performance guarantees or real-phone measurements. The report retains the complete evidence.

For each actual browser/device:

1. Build and serve the production app at its intended subpath on localhost (Mac) or trusted HTTPS (phones). Record device, OS, browser version, build ID, asset count/bytes, and full node count.
2. In a normal browser profile, open the app online and wait for **Offline preview prepared**. Inspect the full graph and a KaTeX equation, but leave some nodes and units unopened.
3. Close **all** app tabs. Disable networking or stop the local preview server. Open the same URL in a **new** tab; do not use only an already-open page or a back-forward snapshot as evidence.
4. Verify the full imported graph, search for previously unviewed nodes, open their inspector/unit references, inspect math glyphs, and test pan/zoom and touch selection. Record startup time, failures, and memory where the browser exposes it.
5. Restore networking. Repeat on Android and iPhone, including reopening after the browser process has been closed. Confirm expected behavior after an update has waited for old tabs to close.

Actual Android/iPhone models and browsers have not yet been provided or tested. Desktop narrow-viewport or touch emulation does not prove their offline persistence or memory behavior. Record any desktop browser evidence in the milestone report rather than treating these harness tests as device acceptance. M3 must repeat the procedure with authoring, local images, autosave, and workspace import/export after those features exist.

## CoolProp boundary

`src/domain/property-service.ts` reserves a thermophysical property-service interface with an explicit fluid identifier, requested property key, two SI state inputs, and a tagged success/failure result. The M0 implementation always returns `not-installed`; it does not approximate physics or evaluate equations. Display-unit conversion, semantic input validation, fluids/backends, pressure reference, and permissible domains must be handled deliberately when the adapter is implemented.

The intended route is an official prebuilt, version-pinned `coolprop.js` plus `coolprop.wasm`, checked into the future asset preparation process with origin, license, checksums, and browser verification. The [official JavaScript wrapper documentation](https://coolprop.org/coolprop/wrappers/Javascript/index.html), inspected 6 October 2026, links an 8.0.0 prebuilt pair and its reproducible Docker/CI build route. No binary was downloaded or executed during M0, and a self-compiled engine is not a prerequisite for the graph. Verify the actual pair, WASM MIME type, project-subpath loading, and offline preparation before claiming property support. The adapter will follow the [CoolProp high-level property API](https://coolprop.org/coolprop/HighLevelAPI.html); it remains separate from any future general equation solver.
