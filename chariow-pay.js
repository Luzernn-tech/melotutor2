(function () {
  'use strict';

  const PAY_URL = 'https://miivclnv.mychariow.online/prd_sph7nc9s';
  const sb = window.sb;
  if (!sb) return;

  let user = null;
  let checking = false;
  let pollTimer = null;

  function getBox() {
    let el = document.getElementById('payBox');
    if (el) return el;
    const form = document.getElementById('readyForm');
    if (!form || !form.parentNode) return null;
    el = document.createElement('div');
    el.id = 'payBox';
    el.hidden = true;
    el.style.cssText = 'margin-top:14px;padding:14px 16px;border-radius:12px;' +
      'border:1px solid rgba(212,175,55,.45);background:rgba(212,175,55,.08);font-size:13.5px;line-height:1.55';
    form.parentNode.insertBefore(el, form.nextSibling);
    return el;
  }

  function showPay(el) {
    el.textContent = '';
    const title = document.createElement('strong');
    title.textContent = 'Next step: pay your certificate fee';
    el.appendChild(title);

    const note = document.createElement('p');
    note.style.cssText = 'margin:6px 0 12px;opacity:.85';
    note.textContent = 'Use this same email when paying so we can match it to your account: ';
    const mail = document.createElement('b');
    mail.textContent = user.email || '';
    note.appendChild(mail);
    el.appendChild(note);

    const a = document.createElement('a');
    a.className = 'btn btn-gold';
    a.href = PAY_URL;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'inline-block';
    a.textContent = 'Pay now →';
    a.addEventListener('click', startPolling);
    el.appendChild(a);
    el.hidden = false;
  }

  function showConfirming(el) {
    el.textContent = '';
    const s = document.createElement('strong');
    s.textContent = 'Payment received.';
    el.appendChild(s);
    const p = document.createElement('p');
    p.style.cssText = 'margin:6px 0 0;opacity:.85';
    p.textContent = 'We are confirming your certificate. This page updates automatically.';
    el.appendChild(p);
    el.hidden = false;
  }

  async function check() {
    if (checking || !user) return;
    checking = true;
    try {
      const issued = await sb.from('certificates')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'issued')
        .limit(1);
      if (issued.data && issued.data.length) {
        window.location.replace('dashboard.html');
        return;
      }

      const res = await sb.from('certificate_orders')
        .select('status,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const latest = res.data && res.data[0];
      const el = getBox();
      if (!el) return;

      if (latest && latest.status === 'awaiting_payment') {
        showPay(el);
      } else if (latest && latest.status === 'paid') {
        showConfirming(el);
        startPolling();
      } else {
        el.hidden = true;
      }
    } catch (err) {
      console.warn('MeloTutor pay check failed:', err);
    } finally {
      checking = false;
    }
  }

  function startPolling() {
    if (pollTimer) return;
    const stopAt = Date.now() + 10 * 60 * 1000;
    pollTimer = setInterval(function () {
      if (Date.now() > stopAt) {
        clearInterval(pollTimer);
        pollTimer = null;
        return;
      }
      check();
    }, 6000);
  }

  async function init() {
    const s = await sb.auth.getSession();
    if (!s.data || !s.data.session) return;
    user = s.data.session.user;

    await check();

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) check();
    });

    const msg = document.getElementById('readyMsg');
    if (msg && 'MutationObserver' in window) {
      new MutationObserver(function () { check(); })
        .observe(msg, { childList: true, characterData: true, subtree: true });
    }
  }

  init();
})();