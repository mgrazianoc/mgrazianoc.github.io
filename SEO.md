# Search and sharing

The site is static HTML hosted at https://mgrazianoc.github.io/. Search and social
metadata are in each page's original HTML, so crawlers do not need JavaScript.

## What is configured

- Unique titles and descriptions for the portfolio, writing index, and both notes.
- Absolute HTTPS canonical URLs matching internal links and `sitemap.xml`.
- Open Graph and Twitter cards with page-specific 1200 × 630 PNG images, dimensions,
  content type, and alternative text. Images use the existing portrait and artwork.
- JSON-LD for the person, website, profile page, writing collection, articles, and
  breadcrumbs. Article authors link to the portfolio and are visible in the byline.
- `robots.txt` allows crawling and advertises the sitemap. `max-image-preview:large`
  permits larger image previews in search results.
- SVG and 48px PNG favicons, plus an Apple touch icon.
- Self-hosted IBM Plex WOFF2 fonts with their SIL licenses, a preload for the
  primary font, and responsive WebP portrait variants. The original photo remains
  available; the displayed size and crop stay controlled by the existing CSS.
- Navigation initializes before the main content is parsed, preventing the mobile
  menu from collapsing after the first paint. Its no-JavaScript fallback remains
  usable, and below-the-fold article artwork loads lazily.

Publication dates are deliberately omitted: the repository's import date is not
reliable evidence of when a piece was first published. Sitemap `lastmod` is also
omitted rather than automatically changing it on every deployment.

## Updating content

When adding a note, update its title, description, canonical URL, Open Graph,
Twitter, and JSON-LD metadata together. Keep the headline, author, and editorial
image consistent with visible content. Add the canonical URL to `sitemap.xml`,
link it from the writing index, and include it in the index's `ItemList`.

Add a card to `scripts/generate-social-images.cjs`, then run:

```sh
npm run build:social
npm run build:portrait # only when the original photograph changes
npm test
```

Inspect the resulting PNGs in `assets/social/` before committing. The generator
uses Playwright's Chromium and requires that browser to be installed. Generated
images are committed, so deployment does not need a build step. When replacing
an existing card, use a new image filename and update its metadata to avoid stale
image caches.

`npm run test:seo` crawls every page with JavaScript disabled. It checks sitemap
coverage, unique metadata, canonical consistency, structured data relationships,
social-image dimensions, authorship, local assets, internal links and fragments,
mobile overflow, and 404 behavior. `npm run test:a11y` runs the browser accessibility
suite; `BROWSER=webkit npm run test:a11y` uses WebKit.

## After deployment

1. In [Google Search Console](https://search.google.com/search-console/), verify the
   `https://mgrazianoc.github.io/` URL-prefix property and submit
   `https://mgrazianoc.github.io/sitemap.xml`. Verification requires the owner's
   account; add only the verification token issued for this property.
2. Use Google's [Rich Results Test](https://search.google.com/test/rich-results) on
   the homepage and article URLs, then Search Console's URL Inspection for actual
   crawl and indexing status.
3. Inspect the portfolio in [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
   after publishing metadata changes. Existing message previews may retain an older
   cached card; publishing metadata alone does not verify a LinkedIn cache refresh.

Automated checks establish technical correctness. They do not establish search
ranking, indexing, rich-result display, or real-user Core Web Vitals. Measure those
with Search Console and field data as they become available.

References: [Google SEO guidance](https://developers.google.com/search/docs/fundamentals/seo-starter-guide),
[article structured data](https://developers.google.com/search/docs/appearance/structured-data/article),
[profile pages](https://developers.google.com/search/docs/appearance/structured-data/profile-page),
[site names](https://developers.google.com/search/docs/appearance/site-names),
[sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
and [LinkedIn sharing requirements](https://www.linkedin.com/help/linkedin/answer/a521928).
