# M1 iOS rendering fix — 0.1.1

Andrew reported on 6 October 2026 that M1 passes his iOS and Android phone checks except for unexpected iOS Safari/Chrome typography. He confirmed that KaTeX renders correctly while other fonts appear missing. Two screenshots show a blue emoji replacing the logo arrow and a hop selector shorter than the adjacent buttons. Device models, OS/browser versions, and detailed offline/storage checks were not supplied. Both screenshots remain in the local `bugs` folder outside the public repository.

## Cause and change

The logo and several interface controls used Unicode text as icons. `↗` (U+2197) has both text and emoji presentation variants in the [Unicode variation data](https://www.unicode.org/Public/UCD/latest/ucd/emoji/emoji-variation-sequences.txt), so its appearance depended on platform font fallback. The screenshot shows the emoji form obscuring part of the H.

The logo, navigation/reference arrows, search, welcome-diagram arrows, and pause/resume marks now use small inline SVG paths with `currentColor`. They retain the interface palette and size without requiring an icon font, remote asset, or emoji presentation. Decorative SVGs are hidden from assistive technology and are not focusable; meaningful button labels remain available. Literal source text and math notation are not rewritten.

The CSS named Inter without actually providing the font, so browsers fell back to platform fonts. The patch bundles the normal variable WOFF2 face from [Inter 4.1](https://github.com/rsms/inter/releases/tag/v4.1), with weights 100–900, a same-origin preload, and `font-display: swap`. Its 352,240 bytes and SIL Open Font License are included in complete offline preparation. The upstream commit, download URLs, checksums, and license are recorded in [the source manifest](../src/assets/fonts/inter-source.json) and [bundled license](../public/licenses/inter-OFL.txt). Serif headings retain Georgia; math retains its existing KaTeX faces. No external font service is required.

WebKit's native select appearance rendered the hop selector at 18 px despite its CSS minimum height. An explicit appearance reset, local SVG chevron, and the existing 44 px mobile control minimum make all three neighbourhood controls equal in height. Map filters and unit preferences use the same select treatment. The element remains a native select with its ordinary picker/keyboard semantics; forced-colors mode restores native appearance.

## Verification

All 37 existing tests, formatting, the production build for `/urban-palm-tree/`, and TypeScript check pass. Complete offline build `fd67e8fbe52c3c3a5a13` prepares 67 local assets / 7,030,842 bytes. Fresh-document offline checks pass at 322 ms on desktop and 289 ms in phone emulation, including a loaded Inter font served by the service worker with networking disabled. These are local observations, not device guarantees. [Offline report](verification/m1-ios-fix-offline-report.json). Existing Chromium desktop and touch-emulation interaction/semantic harnesses pass, including accessible control names and internal reference navigation. The semantic harness identifies a backlink by its stable node ID rather than depending on a decorative arrow in its accessible name. [Interaction report](verification/m1-ios-fix-browser-report.json), [semantic report](verification/m1-ios-fix-semantic-browser-report.json).

A focused check used **Playwright WebKit 26.6 on macOS**, build 2359, at **440×736** and **390×844**. Only browser-cache test binaries were installed; no app dependency or Safari setting changed. Both profiles passed:

- The logo arrow is a 14×14 SVG in the intended `rgb(213, 222, 184)` color.
- Forcing Apple Color Emoji onto the icon class leaves the logo pixels unchanged; before/after screenshot hashes match.
- Navigation, search, result/source links, unit-reference back action, pause, and resume work with meaningful accessible names.
- The bundled Inter face loads from the application origin; map filters and unit-preference selects use it.
- The hop selector and both adjacent actions measure 44 px, and the two-hop option can be selected.
- Bundled KaTeX Main and Math font files return HTTP 200, load, and render the equation/unit views.
- No page errors, failed requests, or horizontal overflow were recorded.

Map and inspector screenshots were visually reviewed. [Focused WebKit report](verification/m1-ios-fix-webkit-report.json). These are macOS WebKit phone-viewport checks, not an actual iOS Safari or Chrome retest. The reported defect's physical-phone confirmation remains with Andrew.

The focused WebKit run encountered stale computed `visibility: hidden` on an inspector that screenshots showed as painted and that pointer hit testing found interactive. The same condition reproduced on the unchanged public 0.1.0 release. The harness used observed pointer coordinates and forced native option selection only after hit-test checks; it did not mutate application styles or select values directly. This limits the automation's accessibility/visibility coverage; no product workaround was added. [Comparison evidence](verification/m1-ios-fix-webkit-automation-limitation.json).

## Phone recheck

After the patch is published, open the public site online and allow its update to prepare. If it still shows the old blue emoji, wait for **Preview update waiting**, close every atlas tab and any installed copy, then reopen. The corrected logo should show a small monochrome diagonal arrow beside the H. Regular interface text should use Inter, and the hop selector should match **Show on map** and **Focus neighbourhood** in height. Check selecting two hops, map filters, and unit preferences as well. KaTeX should retain its previous appearance.

M1's broader phone acceptance is recorded as user-reported, with this rendering exception. M2 has not been started. Session changes remain temporary in this patch.
