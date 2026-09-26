# Mobile and accessibility audit

The implementation targets [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/), with 44px mobile navigation targets and a 3px keyboard focus indicator. Desktop retains the existing grid, content, colors, and overall design; text contrast, wrapping, semantics, and motion controls improve across screen sizes.

## Issues addressed

| Finding | Change |
| --- | --- |
| The home page overflowed by 74px at a 320px viewport; the profile email escaped the card. | Stacked phone profile, wrapping email/contact links, shrinkable grid children, and wrapping long text. |
| Mobile hid the home/contact links and clipped section links inside a tray with no visible scrollbar. | Disclosure menu with all destinations, visible home link, 44px controls, announced expanded state, Escape dismissal, and focus restoration. All links remain available without JavaScript. |
| Small body text, dim metadata, and low-contrast code comments were difficult to read. | Larger mobile prose and labels, brighter secondary text, underlined contact links, and relative font units for browser text enlargement. |
| No page had a main landmark or skip link; the writing index lacked an H1; the profile definition list lacked terms. | Main/footer landmarks, skip links, an H1 on every page, and named profile details. Decorative binary text stays out of the accessibility tree. |
| Keyboard outlines were thin, and article code/ASCII diagrams could not be scrolled with the keyboard. | Strong focus outlines, named focusable scroll containers, and readable text captions explaining the memory diagrams. |
| Instrument labels shrank to a few pixels on phones. | Responsive hero plot labels; detailed instrument figures scroll within their own containers, with an explicit hint and keyboard access. Surrounding prose reflows normally. |
| Touch definitions opened on focus and closed on the same tap; Escape blurred the trigger; tooltips could not be hovered. | First-tap opening, second/outside-tap dismissal, hoverable tooltip content, keyboard activation, Escape without lost focus, blur cleanup, and viewport-aware placement. |
| Animations ran indefinitely without a pause control; reduced motion was checked only at load; some timers ran offscreen. | One persistent pause setting, live OS reduced-motion support, and suspended timers for hidden tabs/offscreen figures. The availability dot is static. |
| Fixed sizes and nowrap text broke enlarged text and custom spacing. | Wrapping desktop navigation, relative font sizes, flexible labels, and long-word reflow. Short landscape viewports use non-sticky navigation. |
| High-contrast preferences had no dedicated support. | Increased-contrast palette and system colors for forced-colors mode, preserving outlines and control boundaries. |

## Results

36 checks passed in Chromium and 36 in WebKit. Axe reported no violations in the tested views. Local assets, links, fragment targets, unique IDs, JavaScript syntax, and diff whitespace checks also passed.

## Reproduce the checks

Development tools only; the site still ships plain HTML, CSS, and JavaScript with no build step.

```sh
npm ci
npx playwright install chromium webkit
npm test
BROWSER=webkit npm test
```

The suite starts and stops its own loopback server. External fonts are blocked during automated checks so a third-party outage cannot stall a run. Screenshots were also inspected with the existing font fallbacks.

Coverage includes all four pages at 320, 390, 768, 1024, and 1440 CSS pixels; axe scans; 200% text plus WCAG text spacing at 320 and 1280px; menu/skip-link focus; touch and keyboard definitions; keyboard scrolling; pause persistence; live reduced-motion changes; no-JavaScript navigation; and short landscape/forced-colors presentation. On macOS WebKit, the test uses Option-Tab to include links, matching the browser's keyboard convention. The 320px case covers the reflow width required for 400% zoom of a 1280px viewport; it is not a physical-device pinch-zoom test.

## Verification limits

Automated checks and browser inspection are not a conformance certification. VoiceOver/TalkBack speech output, physical iOS/Android devices, user font replacements, and Windows High Contrast should still receive hands-on acceptance testing. SVG illustrations have text alternatives; automated contrast tools do not fully judge every part of a visualization.
