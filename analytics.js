/* GA4 for the public portfolio only; local previews never load Google tags. */
(function () {
  if (window.location.hostname !== 'mgrazianoc.github.io') return;
  if (document.getElementById('google-analytics-tag')) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  // The config command sends the initial page_view. Do not send a second one.
  window.gtag('config', 'G-PDC24SPYPE');

  var tag = document.createElement('script');
  tag.id = 'google-analytics-tag';
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=G-PDC24SPYPE';
  document.head.appendChild(tag);
})();
