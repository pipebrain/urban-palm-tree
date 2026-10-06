# M0 technical choices and verification protocol

Research checked 6 October 2026. This note records the rationale and test protocol; it is not a claim that a particular device, performance target, or offline scenario has passed. The M0 verification report records actual observations. The lockfile is the authority for installed dependency versions.

## Technology responsibilities

| Component | M0 choice and reason | Evidence |
| --- | --- | --- |
| Application | React + TypeScript, with a client-only Vite build. The application is a local interactive workspace and does not currently need server rendering or server data loaders. | React documents a Vite `react-ts` starting point and the tradeoffs of a client-only app in [Build a React app from scratch](https://react.dev/learn/build-a-react-app-from-scratch). |
| Static build | Vite supports a repository subpath through `base`; dynamically constructed asset URLs must use `import.meta.env.BASE_URL`. Avoid root-relative paths for the dataset, fonts, service worker, and future WASM. | [Vite production build and public base path](https://vite.dev/guide/build.html). |
| Desktop panels | `dockview-react` manages panels and groups. Domain state and graph rendering remain separate from its layout state. The ordinary open-source package is sufficient for M0. | [Core concepts](https://dockview.dev/docs/core/overview/) and [MIT/community versus enterprise features](https://dockview.dev/docs/overview/licence/). |
| Graph layout | `d3-force` supplies positions and forces independently of the renderer. Keep its mutable simulation objects outside immutable domain records. Use a worker for full-graph layout so controls can remain responsive. | [d3-force](https://d3js.org/d3-force) and [simulation, worker recommendation, and pinning](https://d3js.org/d3-force/simulation). |
| Graph rendering | A Canvas graph with a bounded HTML KaTeX label overlay. Canvas draws every eligible node/link; the overlay makes mathematical labels legible without requiring thousands of complex DOM labels at overview scale. This is an application design inference to validate with the actual dataset. | D3 permits Canvas rendering; KaTeX produces HTML/MathML. Neither library promises the application's resulting frame rate. |
| Mathematics | KaTeX with local CSS/fonts, `trust: false`, finite expansion/size limits, visible parse failures, and semantic variable bindings stored separately from LaTeX. Internal unit navigation belongs to application links rather than trusted arbitrary LaTeX URLs. | [KaTeX options](https://katex.org/docs/options), [font assets](https://katex.org/docs/font). |
| Thermophysical properties | A future asynchronous CoolProp WASM service with explicit SI inputs/output metadata and errors. M0 preserves the interface; it does not implement an equation solver or substitute another property engine. | [CoolProp high-level interface](https://coolprop.org/coolprop/HighLevelAPI.html). |

The hybrid renderer has one graph, one camera, and one source of layout positions. The HTML layer adds mathematics and accessibility; it is not a second graph model. Semantic zoom may limit visible labels, never the full starting node universe. Search and the inspector must make every node reachable even where its label is hidden. Record the label policy and maximum simultaneous label count with measured results.

The proposed force model uses distinct neighbours for bounded graph weight and visual growth. A link's scientific provenance is independent of its layout weight. d3-force's physics terminology describes a layout algorithm, not a simulation of the HVACR system.

## Dependency version evidence

The implementation pins the following versions in `package.json` and `pnpm-lock.yaml`. These are the selected reproducible versions, not a claim that every package is the newest registry patch. Toolchain and runtime validation are recorded in the M0 verification report.

| Package/tool | Selected version |
| --- | --- |
| Node.js | 24.19.0, using the available bundled runtime |
| pnpm | 11.25.0 |
| React / React DOM | 19.3.0 |
| TypeScript | 7.0.2 |
| Vite / React plugin | 8.3.2 / 6.1.1 |
| dockview-react | 8.4.0 |
| KaTeX | 0.19.0 |
| d3-force | 3.0.0 |
| N3, RDF preparation only | 2.13.5 |
| Playwright, browser checks only | 1.63.0 |
| Prettier, development formatting only | 3.9.9 |

The package manager's default release-age policy selected Dockview 8.4.0 while a registry query exposed 8.4.1; the policy was retained and 8.4.0 was pinned. No enterprise package is required. CoolProp 8.0.0 is the researched future binary route, not an installed runtime dependency.

[Vite's current getting-started guide](https://vite.dev/guide/) requires Node 20.19+ or 22.12+ and cautions that a template may require more. Record the actual installed runtime/package manager after inspection. An existing compatible supported runtime is preferable to an unrelated machine-wide toolchain change. The production build does not supply arbitrary browser API polyfills; browser acceptance remains an observed result.

## Small app-authored HVACR equation

Use a clearly labelled app-authored relation for sensible heat transfer to a flowing fluid:

```latex
\dot{Q}=\dot{m}c_p\Delta T
```

The [DOE Fundamentals Handbook, Thermodynamics, Heat Transfer, and Fluid Flow, Volume 2](https://www.energy.gov/documents/doe-hdbk-1012-92vol2), equation (2-15), printed HT-02 page 45 (PDF page 67), provides this heat-rate relation with Btu/hr, lbm/hr, Btu/(lbm·°F), and a Fahrenheit temperature difference. The handbook's example is reactor coolant; the HVACR adaptation, explanatory wording, and application bindings are authored here, not imported from QUDT.

| Binding | Meaning | App unit convention |
| --- | --- | --- |
| `\dot{Q}` | Sensible heat-transfer rate into the fluid | International Table Btu per hour |
| `\dot{m}` | Mass flow rate | Avoirdupois pound mass per hour |
| `c_p` | Specific heat capacity at constant pressure, taken as constant or an appropriate mean | International Table Btu per pound mass per Fahrenheit interval |
| `\Delta T` | Outlet minus inlet temperature, signed consistently with heat into the fluid | Fahrenheit temperature difference; no absolute-temperature offset |

The exact Btu variant is an explicit app convention; the cited handbook notation alone does not establish that variant. Bind units only to verified records in the pinned import. Preserve interval semantics alongside a unit whose reference vocabulary may also describe an absolute scale. Do not interpret pound mass as pound force.

Assumptions for this authoring example: steady flow, no phase change, no latent moisture exchange, approximately constant pressure, negligible shaft work and changes in kinetic/potential energy, and a suitable constant/mean `c_p`. Store the four variable-to-quantity references explicitly. `c_p` remains a quantity unless a sourced, contextual fixed value is deliberately adopted. This example supplies no numerical property value and no numerical calculation.

ASHRAE's [Testing, Adjusting, and Balancing chapter](https://handbook.ashrae.org/handbooks/A19/IP/A19_Ch39/a19_ch39_ip.aspx) provides useful later coefficient provenance: 1.08 combines a minute-to-hour factor with adopted air density and heat capacity; 500 similarly combines time conversion with adopted water density and heat capacity. These are not universal constants and should not be imported as unexplained bare numbers. M0's coefficient-free relation avoids making those unreviewed assumptions.

## CoolProp WASM route

The [official JavaScript wrapper documentation](https://coolprop.org/coolprop/wrappers/Javascript/index.html) points to [CoolProp 8.0.0 JavaScript files](https://sourceforge.net/projects/coolprop/files/CoolProp/8.0.0/Javascript/): both `coolprop.js` and `coolprop.wasm` are required. The listing reported approximately 167 kB and 9.2 MB respectively when inspected; these are upstream listing sizes, not downloaded or measured build assets in this project. Prefer that versioned official binary route for the future browser smoke check, recording checksums and attribution when downloaded. The official alternative is its [Emscripten Docker build workflow](https://github.com/CoolProp/CoolProp/blob/master/.github/workflows/javascript_builder.yml), pinned to a release/commit and toolchain when adopted.

The wrapper requires correct `application/wasm` serving. Future verification must cover loading beneath the repository subpath, initialization failure, a documented reference property evaluation, non-finite/errors, mobile memory cost, and prepared-offline startup. Do not fetch a nightly build automatically. No browser WASM load or numerical accuracy claim is established by merely defining the service boundary.

## Offline startup feasibility

A static application can prepare its whole released baseline with a service worker and Cache Storage. [Mozilla's service-worker guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) documents secure-origin requirements, install-time caching, failure of incomplete installs, and worker control. This supports a feasible approach, not proof that this app works offline on a phone.

Preparation must include a versioned manifest covering the app entry document, JavaScript and CSS chunks, worker files, complete selected graph and unit/reference data, KaTeX font assets including fonts not used on the first screen, and any local images. Validate the manifest and all required responses before indicating readiness. A controlled page plus verified cache completion is necessary. Keep released-baseline cache separate from future authored-workspace storage. Do not silently combine assets from two releases or replace edits during an app update.

For later M3, online **Reload from source** must explicitly retrieve and validate the published manifest/defaults, bypassing stale cached baseline responses. Offline restoration must identify its cached baseline version. Replacement must protect edits and preserve the old workspace if download, validation, or storage fails. Cache ownership and cleanup must be scoped to this application/subpath, not every cache under a shared hosting origin. [Chrome's service-worker lifecycle guidance](https://developer.chrome.com/docs/workbox/service-worker-lifecycle) explains update waiting and the risk of immediate activation against old clients.

[WebKit's storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/) covers Cache API, IndexedDB and service-worker data. Storage can be evicted; estimates are not reserved capacity. `persist()` is a request evaluated by browser heuristics, not a guarantee. Test quota failure and retain explicit portable workspace export at M3. Record browser-tab and installed Home Screen behaviour separately. A Mac browser reduced to phone dimensions does not exercise iPhone process eviction, actual memory pressure, Safari download/share behaviour, or Android file-provider behaviour.

Service workers require HTTPS except for trusted local origins such as `localhost`. A phone visiting the Mac's plain HTTP LAN address is not the phone's `localhost`; that setup can check touch layout but cannot establish the intended service-worker offline path. Use a properly trusted private local HTTPS test setup or a later separately authorized release environment for device offline tests. This milestone does not authorize website publication.

## Measurable checks before expansion

These are proposed checks, not fabricated pass/fail results. Numerical budgets should be set from full-import measurements on named target devices. Keep raw samples and the conditions with the report.

| Check | Record | Interpretation |
| --- | --- | --- |
| Full-universe integrity | Source version/hash, total raw records, eligibility rules, visible node/link counts, excluded type counts, unresolved links | Initial view includes every eligible imported node plus separately counted app additions. |
| Startup | Cold and warm start separately; fetch/parse/layout/first graph timings; transfer versus decoded size | Browser cache and current-tab state must be explicit. |
| Rendering | Viewport, device pixel ratio, visible label count, graph/layout counts, simulation state, frame-time distribution during a repeatable pan/zoom | Compare median and slow-tail frame times; do not infer mobile performance from desktop. |
| Search/selection | Query-to-results and tap-to-inspector timings, including an upstream node outside the initial viewport | Search must cover all eligible nodes. |
| Touch | Tap, one-finger pan/drag, pinch where supported, visible zoom controls, pin/unpin, inspector return | Primary actions must work without hover, right-click, or a hardware keyboard. |
| Memory | Browser process/heap metrics where supported; repeated open/close and graph interactions | If memory instrumentation is unavailable, mark it unavailable; no crashes in a short test is weaker evidence. |
| Subpath | Production assets/fonts/data/workers resolve under a non-root base and refresh succeeds | A dev-server success alone does not prove the packaged path. |
| Offline cold reopening | Complete preparation online; close all app tabs; disable network; open the URL afresh; inspect previously unviewed nodes and math | An already-open tab running offline is not this test. |
| Offline failure | Interrupted preparation, missing cache asset, storage/quota failure, clear-site-data, and version update | Status must distinguish unprepared, complete, and unavailable states. |

Repeat the functional checks in desktop Mac browsers, an actual Android browser, and actual iPhone Safari. Record hardware model, OS/browser version, viewport, installed/tab mode, network/cache state, and dataset hash. Until these devices are exercised, mobile compatibility and durable offline reopening remain unverified. Authoring, autosave, workspace transfer, and safe source replacement remain later-milestone acceptance work even if an M0 browsing cache experiment succeeds.
