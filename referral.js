/* =====================================================
   MELOTUTOR — INVITE LINKS (optional)
   File: js/referral.js
   Load after config.js on signup, login, certification and dashboard.
   1. If the page was opened with ?ref=CODE, remember the code on this device.
   2. Once the person is signed in, tell the database who invited them (one time).
   Nobody has to use an invite: with no code, this file does nothing.
===================================================== */
(function () {
  'use strict';
  var KEY = 'mt_ref';
  var sb = window.sb;

  try {
    var fromUrl = new URLSearchParams(window.location.search).get('ref');
    if (fromUrl && /^[a-z0-9]{4,32}$/i.test(fromUrl)) localStorage.setItem(KEY, fromUrl.toLowerCase());
  } catch (e) { /* storage blocked: invites just will not be recorded */ }

  if (!sb) return;

  var code = null;
  try { code = localStorage.getItem(KEY); } catch (e) { return; }
  if (!code) return;

  sb.auth.getSession().then(function (r) {
    if (!r.data || !r.data.session) return;            /* not signed in yet: try again on the next page */
    return sb.rpc('claim_referral', { p_code: code }).then(function () {
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    });
  }).catch(function () { /* ignore: never block the page */ });
})();
