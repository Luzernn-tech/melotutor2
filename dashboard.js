/* =====================================================
   MELOTUTOR — TUTOR DASHBOARD
   File: js/dashboard.js
   Requires js/config.js (window.sb)
   Only tutors with an issued certificate get in. The real lock is Supabase RLS
   (see supabase-setup.sql); this page just reflects it.
===================================================== */

(function () {
  'use strict';

  /* ---- YOUR POLICIES: edit these to match supabase-setup.sql ---- */
  const CONFIG = {
    certIssuedStatus: 'issued',         // the certificates.status value that means "issued"
    minWithdrawal: 500,                 // must equal v_min in request_withdrawal()
    processingText: '[set your processing time]',
    feesText: '[set your fees, or write “none”]'
  };

  const sb = window.sb;
  const $ = (id) => document.getElementById(id);
  const VIEWS = ['overview', 'requests', 'sessions', 'earnings', 'activity', 'certificate', 'profile'];
  const TITLES = {
    overview: 'Overview', requests: 'Learner requests', sessions: 'Sessions',
    earnings: 'Earnings & withdrawals', activity: 'Activity', certificate: 'Certificate', profile: 'Profile'
  };

  let user = null;
  let name = '';
  let D = { earnings: [], sessions: [], withdrawals: [], requests: [], certs: [], app: null };
  let balance = 0;
  let method = 'mpesa';
  let sessFilter = 'all';
  let wdFilter = 'all';

  /* ---------- helpers ---------- */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function kes(n) { return 'KSh ' + Math.round(Number(n) || 0).toLocaleString('en-US'); }
  function dateStr(v, withTime) {
    const d = new Date(v);
    if (isNaN(d)) return '';
    const o = { day: 'numeric', month: 'short', year: 'numeric' };
    if (withTime) { o.hour = '2-digit'; o.minute = '2-digit'; }
    return d.toLocaleString(undefined, o);
  }
  function pretty(s) {
    s = String(s || '').replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function chip(status) {
    const cls = { paid: 'ok', completed: 'ok', approved: 'ok', processing: 'warn', upcoming: 'warn', pending: 'warn', failed: 'bad', cancelled: 'bad' }[status] || 'warn';
    return '<span class="chip ' + cls + '">' + esc(pretty(status)) + '</span>';
  }
  function msg(text, kind) {
    const el = $('wdMsg');
    el.textContent = text || '';
    el.className = 'dmsg' + (kind ? ' ' + kind : '');
  }
  function gate(text, btn) {
    $('gate').hidden = false;
    $('app').hidden = true;
    const card = document.querySelector('.gate-card');
    card.querySelectorAll('.btn').forEach(function (b) { b.remove(); });
    $('gateText').textContent = text;
    (btn || []).forEach(function (b) {
      const a = document.createElement(b.href ? 'a' : 'button');
      a.className = 'btn ' + (b.gold ? 'btn-gold' : '');
      a.textContent = b.label;
      if (b.href) a.href = b.href; else a.addEventListener('click', b.onClick);
      card.appendChild(a);
    });
  }
  async function signOut() {
    try { await sb.auth.signOut(); } catch (e) { /* ignore */ }
    window.location.replace('login.html');
  }

  if (!sb) {
    gate('Connection error. Please refresh the page.');
    return;
  }

  /* ---------- gate + load ---------- */
  async function init() {
    const s = await sb.auth.getSession();
    if (!s.data || !s.data.session) {
      window.location.replace('login.html?next=dashboard.html');
      return;
    }
    user = s.data.session.user;
    sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') window.location.replace('login.html'); });

    const certRes = await sb.from('certificates')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', CONFIG.certIssuedStatus)
      .limit(1);

    if (certRes.error) {
      gate('We could not check your account. Please try again.', [
        { label: 'Try again', gold: true, onClick: function () { window.location.reload(); } },
        { label: 'Sign out', onClick: signOut }
      ]);
      return;
    }

    if (!certRes.data || !certRes.data.length) {
      gate('Your dashboard opens once your certificate has been issued.', [
        { label: 'Go to certification', gold: true, href: 'certification.html' },
        { label: 'Sign out', onClick: signOut }
      ]);
      return;
    }

    const appRes = await sb.from('tutor_applications')
      .select('status,specialty').eq('user_id', user.id).maybeSingle();
    D.app = appRes.data || null;

    $('gate').hidden = true;
    $('app').hidden = false;
    await loadAll();
    render();
    route();
  }

  async function loadAll() {
    const uid = user.id;
    const meta = user.user_metadata || {};
    const q = function (p) { return p.then(function (r) { if (r.error) { console.warn('MeloTutor:', r.error.message); $('dataBanner').textContent = 'Some data could not be loaded. Pull down to refresh and try again.'; $('dataBanner').hidden = false; } return r; }, function (e) { console.warn(e); return { data: null }; }); };

    const r = await Promise.all([
      q(sb.from('profiles').select('full_name,username,email').eq('id', uid).maybeSingle()),
      q(sb.from('tutor_earnings').select('id,amount_kes,status,note,created_at').eq('tutor_id', uid).order('created_at', { ascending: false })),
      q(sb.from('tutor_sessions').select('id,learner_name,topic,starts_at,duration_min,amount_kes,status').eq('tutor_id', uid).order('starts_at', { ascending: false })),
      q(sb.from('withdrawals').select('id,amount_kes,method,status,reference,created_at').eq('tutor_id', uid).order('created_at', { ascending: false })),
      q(sb.from('learner_requests').select('id,learner_display_name,country,level,goal,schedule_text,duration_minutes,payout_kes,slots_available').eq('status', 'open').order('posted_at', { ascending: false }).limit(12)),
      q(sb.from('certificates').select('status,certificate_title,created_at').eq('user_id', uid).order('created_at', { ascending: false }))
    ]);

    const profile = r[0].data || {};
    name = profile.full_name || meta.full_name || meta.name || user.email || 'Tutor';
    D.profile = profile;
    D.earnings = r[1].data || [];
    D.sessions = r[2].data || [];
    D.withdrawals = r[3].data || [];
    D.requests = r[4].data || [];
    D.certs = r[5].data || [];

    computeBalance();
  }

  function sum(list, fn) { return list.reduce(function (t, x) { return t + (fn(x) ? Number(x.amount_kes) || 0 : 0); }, 0); }

  function computeBalance() {
    const cleared = sum(D.earnings, function (e) { return e.status === 'available'; });
    const out = sum(D.withdrawals, function (w) { return w.status === 'processing' || w.status === 'paid'; });
    balance = Math.max(0, cleared - out);
  }

  /* ---------- render ---------- */
  function render() {
    const first = String(name).trim().split(/\s+/)[0];
    $('avatar').textContent = (first[0] || 'T').toUpperCase();

    const now = new Date();
    const monthEarn = sum(D.earnings, function (e) { const d = new Date(e.created_at); return e.status === 'available' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const pending = sum(D.earnings, function (e) { return e.status === 'pending'; });
    const done = D.sessions.filter(function (s) { return s.status === 'completed'; }).length;
    const lifetime = sum(D.earnings, function (e) { return e.status === 'available'; });
    const withdrawn = sum(D.withdrawals, function (w) { return w.status === 'paid'; });
    const processing = sum(D.withdrawals, function (w) { return w.status === 'processing'; });

    $('sAvail').textContent = kes(balance);
    $('sMonth').textContent = kes(monthEarn);
    $('sDone').textContent = done;
    $('sPending').textContent = kes(pending);
    $('ctaAmount').textContent = kes(balance);
    $('ctaNote').textContent = balance > 0 ? 'Processing time: ' + CONFIG.processingText + '.' : 'Cleared earnings will appear here.';

    renderBars();
    renderUpcoming();
    renderActivity();
    renderRequests();
    renderSessions();
    renderEarnings(lifetime, withdrawn, processing, pending);
    renderCert();
    renderProfile();
  }

  function renderBars() {
    const weeks = [];
    const end = new Date(); end.setHours(23, 59, 59, 999);
    for (let i = 7; i >= 0; i--) {
      const to = new Date(end.getTime() - i * 7 * 864e5);
      const from = new Date(to.getTime() - 7 * 864e5);
      weeks.push({ from: from, to: to, total: 0, label: to.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) });
    }
    D.earnings.forEach(function (e) {
      if (e.status !== 'available') return;
      const t = new Date(e.created_at).getTime();
      weeks.forEach(function (w) { if (t > w.from.getTime() && t <= w.to.getTime()) w.total += Number(e.amount_kes) || 0; });
    });
    const max = Math.max.apply(null, weeks.map(function (w) { return w.total; }).concat([1]));
    $('bars').innerHTML = weeks.map(function (w) {
      return '<div title="' + esc(kes(w.total)) + '" style="height:' + Math.max(3, Math.round(w.total / max * 100)) + '%"></div>';
    }).join('');
    $('barAxis').innerHTML = weeks.map(function (w, i) { return '<span>' + (i % 2 === 1 || i === 7 ? esc(w.label) : '') + '</span>'; }).join('');
  }

  function renderUpcoming() {
    const up = D.sessions.filter(function (s) { return s.status === 'upcoming'; })
      .sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); });
    $('ovUpcoming').innerHTML = up.length ? up.slice(0, 3).map(function (s) {
      const d = new Date(s.starts_at);
      return '<div class="row"><div class="date-box"><small>' + esc(d.toLocaleDateString(undefined, { month: 'short' })) + '</small><strong>' + d.getDate() + '</strong></div>' +
        '<div class="grow"><b>' + esc(s.learner_name) + '</b><span class="m">' + esc(s.topic || '') + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + ' · ' + esc(s.duration_min) + ' min</span></div></div>';
    }).join('') : '<div class="empty">No upcoming sessions yet.</div>';
  }

  function activityItems() {
    const items = [];
    D.sessions.forEach(function (s) { items.push({ t: s.starts_at, title: 'Session ' + s.status + ': ' + (s.topic || s.learner_name), text: s.learner_name }); });
    D.withdrawals.forEach(function (w) { items.push({ t: w.created_at, title: 'Withdrawal ' + w.status, text: kes(w.amount_kes) + ' via ' + (w.method === 'mpesa' ? 'M-Pesa' : 'bank transfer') }); });
    D.earnings.forEach(function (e) { items.push({ t: e.created_at, title: 'Earning ' + (e.status === 'available' ? 'cleared' : 'recorded'), text: kes(e.amount_kes) + (e.note ? ' · ' + e.note : '') }); });
    return items.sort(function (a, b) { return new Date(b.t) - new Date(a.t); });
  }
  function renderActivity() {
    const items = activityItems();
    $('ovActivity').innerHTML = items.length ? items.slice(0, 4).map(function (a) {
      return '<div class="row"><div class="grow"><b>' + esc(a.title) + '</b><span class="m">' + esc(a.text) + ' · ' + esc(dateStr(a.t)) + '</span></div></div>';
    }).join('') : '<div class="empty">Nothing yet.</div>';
    $('actFeed').innerHTML = items.length ? items.slice(0, 40).map(function (a) {
      return '<div class="feed"><div class="item"><div class="dot">●</div><div><b>' + esc(a.title) + '</b><span>' + esc(a.text) + '</span><br><span>' + esc(dateStr(a.t, true)) + '</span></div></div></div>';
    }).join('') : '<div class="empty">Your activity will show up here.</div>';
  }

  function renderRequests() {
    $('reqList').innerHTML = D.requests.length ? D.requests.map(function (x) {
      return '<div class="req"><div><span class="chip">' + esc(x.level || 'Level') + '</span></div>' +
        '<b>' + esc(x.learner_display_name || 'Learner') + (x.country ? ' · ' + esc(x.country) : '') + '</b>' +
        '<p>' + esc(x.goal || '') + '</p>' +
        '<span class="m" style="color:var(--muted);font-size:12.5px">' + esc(x.schedule_text || '') + (x.duration_minutes ? ' · ' + esc(x.duration_minutes) + ' min' : '') + '</span>' +
        '<b style="color:var(--gold-light)">' + (x.payout_kes ? kes(x.payout_kes) : '') + '</b></div>';
    }).join('') : '<div class="empty">No open requests right now.</div>';
  }

  function renderSessions() {
    const count = function (s) { return D.sessions.filter(function (x) { return x.status === s; }).length; };
    const hours = D.sessions.filter(function (s) { return s.status === 'completed'; }).reduce(function (t, s) { return t + (Number(s.duration_min) || 0); }, 0) / 60;
    $('sessStats').innerHTML = [['Total', D.sessions.length], ['Completed', count('completed')], ['Upcoming', count('upcoming')], ['Hours taught', (Math.round(hours * 10) / 10) + ' h']]
      .map(function (p) { return '<div class="stat"><div class="label">' + p[0] + '</div><strong>' + p[1] + '</strong></div>'; }).join('');

    const list = D.sessions.filter(function (s) { return sessFilter === 'all' || s.status === sessFilter; });
    $('sessTable').innerHTML = '<div class="t-row head"><div>Date</div><div>Learner &amp; topic</div><div>Length</div><div class="r">Earned</div><div class="r">Status</div></div>' +
      (list.length ? list.map(function (s) {
        return '<div class="t-row"><div>' + esc(dateStr(s.starts_at, true)) + '</div><div><b>' + esc(s.learner_name) + '</b><br><span style="color:var(--muted);font-size:12.5px">' + esc(s.topic || '') + '</span></div>' +
          '<div>' + esc(s.duration_min) + ' min</div><div class="r"><b>' + kes(s.status === 'cancelled' ? 0 : s.amount_kes) + '</b></div><div class="r">' + chip(s.status) + '</div></div>';
      }).join('') : '<div class="empty">No sessions to show.</div>');
  }

  function renderEarnings(lifetime, withdrawn, processing, pending) {
    $('earnStats').innerHTML = [
      ['Available balance', kes(balance), 'Ready to withdraw', 'gold'],
      ['Pending clearance', kes(pending), 'Awaiting verification', ''],
      ['Total withdrawn', kes(withdrawn), processing ? kes(processing) + ' processing' : 'Paid out', ''],
      ['Lifetime earned', kes(lifetime), 'Cleared earnings', '']
    ].map(function (p) { return '<div class="stat ' + p[3] + '"><div class="label">' + p[0] + '</div><strong>' + p[1] + '</strong><small>' + p[2] + '</small></div>'; }).join('');

    $('wdAvail').textContent = 'You can withdraw up to your available balance of ' + kes(balance) + '.';
    $('wdPolicy').textContent = 'Minimum withdrawal: ' + kes(CONFIG.minWithdrawal) + '. Processing time: ' + CONFIG.processingText + '. Fees: ' + CONFIG.feesText + '. You will see the status of every request below.';

    const list = D.withdrawals.filter(function (w) { return wdFilter === 'all' || w.status === wdFilter; });
    $('wdTable').innerHTML = '<div class="t-row wd head"><div>Date</div><div>Reference</div><div>Method</div><div class="r">Amount</div><div class="r">Status</div></div>' +
      (list.length ? list.map(function (w) {
        return '<div class="t-row wd"><div>' + esc(dateStr(w.created_at)) + '</div><div class="mono">' + esc(w.reference || String(w.id).slice(0, 8)) + '</div>' +
          '<div>' + (w.method === 'mpesa' ? 'M-Pesa' : 'Bank transfer') + '</div><div class="r"><b>' + kes(w.amount_kes) + '</b></div><div class="r">' + chip(w.status) + '</div></div>';
      }).join('') : '<div class="empty">No withdrawals yet.</div>');
  }

  function renderCert() {
    $('certBox').innerHTML = D.certs.length ? D.certs.map(function (c) {
      return '<div class="row"><div class="grow"><b>' + esc(c.certificate_title || 'Certificate') + '</b><span class="m">' + esc(dateStr(c.created_at)) + '</span></div>' + chip(c.status) + '</div>';
    }).join('') : '<div class="empty">No certificate details to show.</div>';
  }

  function renderProfile() {
    const p = D.profile || {};
    const rows = [['Name', name], ['Username', p.username ? '@' + p.username : '—'], ['Email', user.email || '—'], ['Specialty', (D.app && D.app.specialty) || '—'], ['Certificate', 'Issued']];
    $('profBox').innerHTML = rows.map(function (r) { return '<div><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('');
  }

  /* ---------- routing ---------- */
  function route() {
    let v = (location.hash || '#overview').slice(1);
    if (VIEWS.indexOf(v) === -1) v = 'overview';
    VIEWS.forEach(function (n) { $('v-' + n).hidden = n !== v; });
    document.querySelectorAll('#nav a').forEach(function (a) { a.classList.toggle('active', a.dataset.view === v); });
    $('pageTitle').textContent = v === 'overview' ? 'Welcome back, ' + String(name).trim().split(/\s+/)[0] : TITLES[v];
    $('pageSub').textContent = v === 'overview' ? user.email || '' : '';
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', function () { if (!$('app').hidden) route(); });

  /* ---------- events ---------- */
  function seg(id, set) {
    $(id).addEventListener('click', function (e) {
      const b = e.target.closest('button[data-f]');
      if (!b) return;
      this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      set(b.dataset.f);
      render();
    });
  }
  seg('sessFilter', function (f) { sessFilter = f; });
  seg('wdFilter', function (f) { wdFilter = f; });
  $('signOutBtn').addEventListener('click', signOut);

  $('wdMethod').addEventListener('click', function (e) {
    const b = e.target.closest('button[data-m]');
    if (!b) return;
    method = b.dataset.m;
    this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
    $('wdMpesa').hidden = method !== 'mpesa';
    $('wdBank').hidden = method !== 'bank';
  });

  document.querySelector('.quick').addEventListener('click', function (e) {
    const b = e.target.closest('button[data-q]');
    if (!b) return;
    const v = b.dataset.q === 'all' ? balance : Math.min(Number(b.dataset.q), balance);
    $('wdAmount').value = v ? v.toLocaleString('en-US') : '';
  });

  $('wdForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    msg('');
    const amount = parseInt($('wdAmount').value.replace(/[^\d]/g, ''), 10);
    let dest = '';

    if (!amount || amount < CONFIG.minWithdrawal) return msg('Minimum withdrawal is ' + kes(CONFIG.minWithdrawal) + '.', 'err');
    if (amount > balance) return msg('That is more than your available balance of ' + kes(balance) + '.', 'err');

    if (method === 'mpesa') {
      dest = $('wdPhone').value.replace(/[\s-]/g, '');
      if (!/^(\+?254|0)?[17]\d{8}$/.test(dest)) return msg('Enter a valid Kenyan M-Pesa number.', 'err');
    } else {
      const b = $('wdBankName').value.trim(), a = $('wdAcct').value.replace(/\s/g, ''), n = $('wdAcName').value.trim();
      if (!b || !/^\d{6,20}$/.test(a) || !n) return msg('Enter the bank name, account number and account holder name.', 'err');
      dest = b + ' | ' + a + ' | ' + n;
    }

    const btn = $('wdBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    const res = await sb.rpc('request_withdrawal', { p_amount: amount, p_method: method, p_destination: dest });
    btn.disabled = false;
    btn.textContent = 'Request withdrawal';

    if (res.error) {
      msg(res.error.message || 'Could not submit the request. Please try again.', 'err');
      return;
    }
    msg('Withdrawal requested. You can follow it in the history below.', 'ok');
    $('wdForm').reset();
    await loadAll();
    render();
  });

  init();
})();
