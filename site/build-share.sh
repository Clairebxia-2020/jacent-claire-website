#!/bin/sh
# Rebuilds line-review-share.html — a single self-contained file (inlined CSS/JS,
# compressed base64 product images) suitable for publishing as a Claude Artifact
# or emailing/sharing directly. Re-run this after editing products.js/app.js/style.css,
# or after re-running build-share-assets.ps1 (needed only when images change).
set -e
cd "$(dirname "$0")"

if [ ! -f assets/js/data-uris.generated.js ]; then
  echo "Missing assets/js/data-uris.generated.js — run build-share-assets.ps1 first." >&2
  exit 1
fi

sed \
  -e 's#function imgSrc(collectionSlug, filename) {#function imgSrc(collectionSlug, filename) {\n    return DATA_URIS[collectionSlug + "/" + filename] || "";\n  }\n  function _unused_imgSrc(collectionSlug, filename) {#' \
  -e 's#<img src="assets/img/hero/hero-aisle.jpg" alt="" class="hero__img" id="heroImg" />#<img src="${DATA_URIS.__hero__}" alt="" class="hero__img" id="heroImg" />#' \
  assets/js/app.js > /tmp.app.bundle.js

{
  cat <<'HEAD'
<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Line Review — Internal Product Review</title>
<style>
HEAD
  cat assets/css/style.css
  cat <<'MID'
</style>
</head>
<body>

<header class="site-header">
  <div class="site-header__inner">
    <a href="#/" class="wordmark">Line<span>Review</span></a>

    <nav class="main-nav" id="mainNav">
      <a href="#/" data-nav="home">Home</a>
      <a href="#/collection/handoff-2026" data-nav="handoff-2026">2026 Handoff</a>
      <a href="#/collection/candle" data-nav="candle">Candles &amp; Party</a>
      <a href="#/collection/proseries" data-nav="proseries">Pro Series</a>
    </nav>

    <div class="header-search">
      <input type="search" id="globalSearch" placeholder="Search SKU or product name…" autocomplete="off" />
      <div class="search-results" id="searchResults" hidden></div>
    </div>
  </div>
</header>

<main id="app"></main>

<footer class="site-footer">
  <p>Line Review — internal packaging &amp; product photography reference. Not for external distribution. Images are compressed for sharing.</p>
</footer>

<div class="lightbox" id="lightbox" hidden>
  <button class="lightbox__close" id="lightboxClose" aria-label="Close">&times;</button>
  <button class="lightbox__nav lightbox__nav--prev" id="lightboxPrev" aria-label="Previous image">&#8249;</button>
  <img class="lightbox__img" id="lightboxImg" src="" alt="" />
  <button class="lightbox__nav lightbox__nav--next" id="lightboxNext" aria-label="Next image">&#8250;</button>
  <div class="lightbox__caption" id="lightboxCaption"></div>
</div>

<script>
MID
  cat assets/js/data-uris.generated.js
  cat assets/js/products.js
  cat /tmp.app.bundle.js
  cat <<'TAIL'
</script>
</body>
</html>
TAIL
} > line-review-share.html

rm -f /tmp.app.bundle.js
echo "Wrote line-review-share.html ($(du -sh line-review-share.html | cut -f1))"
