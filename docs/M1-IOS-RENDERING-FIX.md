# M1 iOS rendering fix — 0.1.1

Andrew reported on 6 October 2026 that M1 passes his iOS and Android phone checks except for unexpected iOS Safari/Chrome typography, particularly a blue emoji replacing the logo arrow. His screenshot confirms the arrow substitution. Device models, OS/browser versions, and detailed offline/storage checks were not supplied. The screenshot remains in the local `bugs` folder outside the public repository.

## Cause and change

The logo and several interface controls used Unicode text as icons. `↗` (U+2197) has both text and emoji presentation variants in the [Unicode variation data](https://www.unicode.org/Public/UCD/latest/ucd/emoji/emoji-variation-sequences.txt), so its appearance depended on platform font fallback. The screenshot shows the emoji form obscuring part of the H.

The logo, navigation/reference arrows, search, welcome-diagram arrows, and pause/resume marks now use small inline SVG paths with `currentColor`. They retain the interface palette and size without requiring an icon font, remote asset, or emoji presentation. Decorative SVGs are hidden from assistive technology and are not focusable; meaningful button labels remain available. Literal source text and math notation are not rewritten.

Regular interface text remains on the existing system-font stack. Inter is listed as an optional local family but is not bundled; observed Mac rendering uses the Apple system face. The screenshot does not establish a separate body-font or KaTeX loading defect, so the patch does not change text sizes, suppress browser text adjustments, or add a new font download. The user was asked to identify any additional text-rendering discrepancy beyond the icons. See [WebKit's system-font explanation](https://webkit.org/blog/3709/using-the-system-font-in-web-content/).

## Verification

All 37 existing tests, formatting, the production build for `/urban-palm-tree/`, and TypeScript check pass. Complete offline build `4bf6648386caf63b5319` prepares 65 local assets / 6,673,052 bytes. Fresh-document offline checks pass at 297 ms on desktop and 305 ms in phone emulation; these are local observations, not device guarantees. [Offline report](verification/m1-ios-fix-offline-report.json). Existing Chromium desktop and touch-emulation interaction/semantic harnesses pass, including accessible control names and internal reference navigation. The semantic harness now identifies a backlink by its stable node ID rather than depending on a decorative arrow in its accessible name. [Interaction report](verification/m1-ios-fix-browser-report.json), [semantic report](verification/m1-ios-fix-semantic-browser-report.json).

A focused check used **Playwright WebKit 26.6 on macOS**, build 2359, at **440×736** and **390×844**. Only browser-cache test binaries were installed; no app dependency or Safari setting changed. Both profiles passed:

- The logo arrow is a 14×14 SVG in the intended `rgb(213, 222, 184)` color.
- Forcing Apple Color Emoji onto the icon class leaves the logo pixels unchanged; before/after screenshot hashes match.
- Navigation, search, result/source links, unit-reference back action, pause, and resume work with meaningful accessible names.
- Bundled KaTeX Main and Math font files return HTTP 200, load, and render the equation/unit views.
- No page errors, failed requests, or horizontal overflow were recorded.

Map and inspector screenshots were visually reviewed. [Focused WebKit report](verification/m1-ios-fix-webkit-report.json). These are macOS WebKit phone-viewport checks, not an actual iOS Safari or Chrome retest. The reported defect's physical-phone confirmation remains with Andrew.

## Phone recheck

After the patch is published, open the public site online and allow its update to prepare. If it still shows the old blue emoji, wait for **Preview update waiting**, close every atlas tab and any installed copy, then reopen. The corrected logo should show a small monochrome diagonal arrow beside the H. Check arrows in search/reference links and pause/resume too. Report another screenshot if body text, math, or units remain unexpected.

M1's broader phone acceptance is recorded as user-reported, with this rendering exception. M2 has not been started. Session changes remain temporary in this patch.
