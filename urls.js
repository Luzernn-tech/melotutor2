/* =====================================================
   MELOTUTOR — CLEAN WEB ADDRESSES
   File: urls.js
   Shows /dashboard instead of /dashboard.html in the address bar,
   even if someone opens an old .html link. Load it in the <head> of every page.
===================================================== */
(function () {
  try {
    var p = location.pathname;
    var clean = p.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    if (clean !== p) history.replaceState(null, '', clean + location.search + location.hash);
  } catch (e) { /* the page still works with the old address */ }
})();
