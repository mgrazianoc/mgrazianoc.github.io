# Google Analytics

GA4 web stream: **portfolio** at https://mgrazianoc.github.io/  
Measurement ID: **G-PDC24SPYPE**

All four pages load the shared `analytics.js` entry point with `defer`. It loads
Google's tag asynchronously on the production hostname only. Localhost, file
previews, and other hosts never initialize analytics.

The Google tag's `config` command sends the initial page view automatically.
Enhanced measurement (including scrolling and outbound clicks) is managed in the
GA4 stream settings. There are no additional manual page-view events or custom
events, so those automatic events are not counted twice.

Run `npm run test:analytics` to check the stream ID, production-host restriction,
duplicate initialization, and page coverage. The test does not contact Google.

To verify production, visit the site and check the stream's Realtime report or
[Google Tag Assistant](https://tagassistant.google.com/). The stream setup warning
and standard reports can lag behind actual collection.

Implementation reference: [Google tag setup](https://developers.google.com/tag-platform/gtagjs).
