# LLM discovery and readable content

The site provides a compact [llms.txt](https://mgrazianoc.github.io/llms.txt)
directory and complete Markdown versions of every canonical page. These are
static files: reading them does not require JavaScript, authentication, analytics,
an API, or a rendering service.

## Public documents

| Document | Purpose |
| --- | --- |
| `/llms.txt` | Short introduction and described links to the published content. |
| `/index.md` | Profile, services, experience, upstream contributions, and contact. |
| `/writing/index.md` | Published writing index. |
| `/writing/01/index.md` | Complete first article. |
| `/writing/02/index.md` | Complete second article. |
| `/llms-full.txt` | Optional single-file bundle of all the above pages. |

The directory follows the [llms.txt proposal](https://llmstxt.org/): one H1,
a blockquote summary, brief context, and H2 sections containing described links.
The optional bundle and external profiles are in the final `Optional` section.
There is no need to download the full bundle to find one article.

Each HTML page advertises its Markdown counterpart with
`rel="alternate" type="text/markdown"`, and the directory with
`rel="describedby" type="text/plain"`. Markdown pages identify their author and
canonical HTML source, and use absolute URLs so links work outside the website.

`robots.txt` permits crawling. The SEO sitemap continues to list only canonical
HTML pages; the alternate representations are discoverable through the HTML
links and `llms.txt`. The existing `.nojekyll` file makes GitHub Pages publish
Markdown as static files rather than processing it as Jekyll content.

## Update and verify

HTML is the source of truth. Do not manually edit the six generated documents.
After editing page content or metadata:

```sh
npm ci
npm run build:llms
npm test
```

Commit the generated files alongside the HTML. When adding a page, follow
[the SEO checklist](SEO.md), include its canonical URL in `sitemap.xml`, and add
the two discovery links to its HTML head. The generator discovers pages from
the sitemap and produces the Markdown counterparts and complete bundle.
New articles using `article.note` also appear in the `Writing` list automatically.
For a new kind of page, update the directory grouping in `renderIndex` and the
tests so every generated page remains reachable from `llms.txt`.

The generator removes navigation controls and visual decoration while keeping
the public content, citations, code filenames, exact code and ASCII-diagram
whitespace, image descriptions, figure captions, and tooltip definitions.
Accessible descriptions stand in for SVG paths. Modeled charts remain explicitly
identified as models, not client measurements. Unpublished comments and drafts
are not included. No private correspondence or inferred claims are added.

Useful commands:

```sh
npm run build:llms # Generate deterministic files from current HTML.
npm run check:llms # Fail if any generated file is missing or stale.
npm run test:llms  # Validate discovery, structure, links, and content fidelity.
```

Tests compare the generated content with the original article paragraphs,
citations, code, and diagrams, and check portfolio context and model caveats.
They also exercise source changes, missing documents, and nested code fences
in a temporary fixture. `npm test` includes these checks alongside the existing
analytics, SEO, and accessibility checks.

The `LLM documents` GitHub Actions workflow runs on pushes to `main` and pull
requests with Node 24 and read-only repository permissions. It checks the
committed artifacts; it does not rewrite files or commit on your behalf.
The workflow reports drift but does not gate the separate GitHub Pages deployment.

After deployment, fetch the actual public URLs. They should return HTTP 200,
readable UTF-8 Markdown/plain text, and the same contents as the committed files.
Also confirm that the canonical HTML URLs still serve the portfolio and articles.

## What this establishes

These files make the site easier for agents to find, read selectively, and cite
without extracting the visual interface. `llms.txt` is an emerging convention,
not a universal crawler requirement or a substitute for SEO. Its presence does
not establish indexing, ranking, training inclusion, or citations in answers.
Provider crawler policies and actual discovery must be evaluated separately.

See also the [Lighthouse llms.txt audit](https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt).
