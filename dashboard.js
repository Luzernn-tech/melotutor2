/* =====================================================
   MELOTUTOR — TUTOR DASHBOARD
   File: dashboard.js
   Requires config.js (window.sb)
   Only tutors with an issued certificate get in. The real lock is Supabase RLS
   (see supabase-setup.sql); this page just reflects it.
===================================================== */

(function () {
  'use strict';

  /* ---- YOUR POLICIES: edit these to match supabase-setup.sql ---- */
  const CONFIG = {
    certIssuedStatus: 'issued',         // the certificates.status value that means "issued"
    minWithdrawal: 1000,                // must equal v_min in request_withdrawal()
    processingText: 'within 24 hours',
    feesText: 'none, you receive the full amount',
    sessionMinutes: 60,                 // every session is one hour
    startWindowMin: 15,                 // tutors can start a session this many minutes early
    adminUrl: ''                        // address of your admin panel, e.g. 'https://admin.example.com'. Leave empty to hide the Admin link.
  };

  const sb = window.sb;
  const $ = (id) => document.getElementById(id);
  const VIEWS = ['overview', 'requests', 'tasks', 'sessions', 'earnings', 'progress', 'invite', 'activity', 'certificate', 'profile'];
  const TITLES = {
    overview: 'Overview', requests: 'Learner requests', tasks: 'Tasks', progress: 'Your progress', invite: 'Invite friends', sessions: 'Sessions',
    earnings: 'Earnings & withdrawals', activity: 'Activity', certificate: 'Certificate', profile: 'Profile'
  };

  let user = null;
  let name = '';
  let D = { myRes: [], earnings: [], sessions: [], withdrawals: [], requests: [], certs: [], app: null, tasks: [], subs: [], invites: [], refCode: '', accts: [], acctsErr: false, prog: null, notifs: [] };
  let isAdmin = false;
  let balance = 0;
  let selAcct = null;      /* the payout account picked for a withdrawal */
  let acctPanel = null;    /* {id, mode:'rm'|'pw'} while a remove / change-password box is open */
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
    const cls = { paid: 'ok', completed: 'ok', approved: 'ok', rewarded: 'ok', live: 'ok', processing: 'warn', upcoming: 'warn', pending: 'warn', awaiting: 'warn', joined: 'warn', in_progress: 'warn', declined: 'bad', failed: 'bad', cancelled: 'bad', rejected: 'bad', forfeited: 'bad' }[status] || 'warn';
    const label = { live: 'In progress', awaiting: 'Awaiting confirmation', pending: 'Under review', joined: 'Joined', rewarded: 'KSh 50 earned' }[status] || pretty(status);
    return '<span class="chip ' + cls + '">' + esc(label) + '</span>';
  }

  /* A session stays "upcoming" in the database until someone changes it, so work out
     what it really is from the clock: not started yet / happening now / ended but not confirmed. */
  function effStatus(s) {
    if (s.status !== 'upcoming') return s.status;
    const start = new Date(s.starts_at).getTime();
    if (isNaN(start)) return s.status;
    const end = start + (Number(s.duration_min) || 60) * 60000;
    const now = Date.now();
    if (now < start) return 'upcoming';
    if (now < end) return 'live';
    return 'awaiting';
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
    window.location.replace('login');
  }

  if (!sb) {
    gate('Connection error. Please refresh the page.');
    return;
  }

  /* ---------- gate + load ---------- */
  async function init() {
    const s = await sb.auth.getSession();
    if (!s.data || !s.data.session) {
      window.location.replace('login?next=dashboard');
      return;
    }
    user = s.data.session.user;
    sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') window.location.replace('login'); });

    /* Admins can open the dashboard without a certificate, to preview it. */
    try {
      const adm = await sb.rpc('is_admin');
      isAdmin = adm && adm.data === true;
    } catch (e) { isAdmin = false; }
    /* Only a real admin (checked by the database) AND only if an admin address is set. */
    if (isAdmin && CONFIG.adminUrl) { $('adminLink').href = CONFIG.adminUrl; $('adminLink').hidden = false; } else { $('adminLink').hidden = true; }

    const certRes = await sb.from('certificates')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', CONFIG.certIssuedStatus)
      .limit(1);

    if (certRes.error && !isAdmin) {
      gate('We could not check your account. Please try again.', [
        { label: 'Try again', gold: true, onClick: function () { window.location.reload(); } },
        { label: 'Sign out', onClick: signOut }
      ]);
      return;
    }

    if (!isAdmin && (!certRes.data || !certRes.data.length)) {
      gate('Your dashboard opens once your certificate has been issued.', [
        { label: 'Go to certification', gold: true, href: 'certification' },
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

  const SESS_BASE = 'id,learner_name,topic,starts_at,duration_min,amount_kes,status';
  const SESS_NEW = SESS_BASE + ',meeting_url,start_mode,transcription,transcript,started_at';

  async function loadSessions(uid) {
    let r = await sb.from('tutor_sessions').select(SESS_NEW).eq('tutor_id', uid).order('starts_at', { ascending: false });
    if (r.error) {
      /* new columns not added yet: fall back so the page still works */
      r = await sb.from('tutor_sessions').select(SESS_BASE).eq('tutor_id', uid).order('starts_at', { ascending: false });
      if (r.error) {
        console.warn('MeloTutor:', r.error.message);
        $('dataBanner').textContent = 'Some data could not be loaded. Pull down to refresh and try again.';
        $('dataBanner').hidden = false;
      }
    }
    return r;
  }

  async function loadAll() {
    const uid = user.id;
    const meta = user.user_metadata || {};
    /* Newer features: if their database tables are not set up yet, stay quiet instead of showing an error. */
    const quiet = function (p) { return p.then(function (r) { if (r.error) console.warn('MeloTutor:', r.error.message); return r; }, function (e) { console.warn(e); return { data: null }; }); };
    const q = function (p) { return p.then(function (r) { if (r.error) { console.warn('MeloTutor:', r.error.message); $('dataBanner').textContent = 'Some data could not be loaded. Pull down to refresh and try again.'; $('dataBanner').hidden = false; } return r; }, function (e) { console.warn(e); return { data: null }; }); };

    const r = await Promise.all([
      q(sb.from('profiles').select('full_name,username,email,phone,country,created_at').eq('id', uid).maybeSingle()),
      q(sb.from('tutor_earnings').select('id,amount_kes,status,note,created_at').eq('tutor_id', uid).order('created_at', { ascending: false })),
      loadSessions(uid),
      q(sb.from('withdrawals').select('id,amount_kes,method,status,reference,created_at').eq('tutor_id', uid).order('created_at', { ascending: false })),
      q(sb.from('learner_requests').select('id,learner_display_name,country,level,goal,schedule_text,duration_minutes,payout_kes,slots_available').eq('status', 'open').order('posted_at', { ascending: false }).limit(12)),
      q(sb.from('certificates').select('status,certificate_title,created_at').eq('user_id', uid).order('created_at', { ascending: false })),
      quiet(sb.from('tasks').select('id,kind,title,instructions,payout_kes,time_limit_min').eq('is_active', true).order('created_at', { ascending: false })),
      quiet(sb.from('submissions').select('id,task_id,status,review_note,payout_kes,submitted_at,tasks(title,kind)').eq('user_id', uid).order('started_at', { ascending: false })),
      quiet(sb.rpc('my_invites')),
      quiet(sb.rpc('my_referral_code')),
      quiet(sb.from('slot_reservations').select('id,learner_code,learner_name,preferred_start,status,created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(30)),
      quiet(sb.rpc('my_payout_accounts')),
      quiet(sb.rpc('my_progress')),
      quiet(sb.rpc('my_notifications'))
    ]);

    const profile = r[0].data || {};
    name = profile.full_name || meta.full_name || meta.name || profile.username || 'Tutor';
    D.profile = profile;
    D.earnings = r[1].data || [];
    D.sessions = r[2].data || [];
    D.withdrawals = r[3].data || [];
    D.requests = r[4].data || [];
    D.certs = r[5].data || [];
    D.tasks = r[6].data || [];
    D.subs = r[7].data || [];
    D.invites = r[8].data || [];
    D.refCode = typeof r[9].data === 'string' ? r[9].data : '';
    D.myRes = r[10].data || [];
    D.accts = Array.isArray(r[11].data) ? r[11].data : [];
    D.acctsErr = !!r[11].error;
    D.prog = r[12].data && r[12].data.level ? r[12].data : null;
    D.notifs = Array.isArray(r[13].data) ? r[13].data : [];

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
    renderSessCards();
    renderTasks();
    renderInvite();
    renderEarnings(lifetime, withdrawn, processing, pending);
    renderCert();
    renderProfile();
    renderMyRes();
    renderProgress();
    renderAccounts();
    renderNotifs();
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
    const up = D.sessions.filter(function (s) { const e = effStatus(s); return e === 'upcoming' || e === 'live' || e === 'awaiting'; })
      .sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); });
    $('ovUpcoming').innerHTML = up.length ? up.slice(0, 3).map(function (s) {
      const d = new Date(s.starts_at);
      return '<div class="row"><div class="date-box"><small>' + esc(d.toLocaleDateString(undefined, { month: 'short' })) + '</small><strong>' + d.getDate() + '</strong></div>' +
        '<div class="grow"><b>' + esc(s.learner_name) + '</b><span class="m">' + esc(s.topic || '') + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + ' · ' + esc(s.duration_min) + ' min</span></div>' + chip(effStatus(s)) + '</div>';
    }).join('') : '<div class="empty">No upcoming sessions yet.</div>';
  }

  function activityItems() {
    const items = [];
    D.sessions.forEach(function (s) { items.push({ t: s.starts_at, title: 'Session ' + s.status + ': ' + (s.topic || s.learner_name), text: s.learner_name }); });
    D.withdrawals.forEach(function (w) { items.push({ t: w.created_at, title: 'Withdrawal ' + w.status, text: kes(w.amount_kes) + ' via ' + methodLabel(w.method) }); });
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

  function transcriptHtml(s) {
    return s.transcript
      ? '<details class="tr"><summary>Transcript</summary><pre>' + esc(s.transcript) + '</pre></details>'
      : '';
  }

  function sessMsg(text, kind) {
    const el = $('sessMsg');
    el.textContent = text || '';
    el.className = 'dmsg' + (kind ? ' ' + kind : '');
  }

  function sessCanStart(s) {
    const t = new Date(s.starts_at).getTime();
    const now = Date.now();
    return now >= t - CONFIG.startWindowMin * 60000 && now <= t + CONFIG.sessionMinutes * 60000;
  }

  function renderSessCards() {
    const up = D.sessions.filter(function (s) { const e = effStatus(s); return e === 'upcoming' || e === 'live'; })
      .sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); });

    $('sessCards').innerHTML = up.length ? up.map(function (s) {
      const mode = s.start_mode === 'auto' ? 'auto' : 'manual';
      const trOn = !!s.transcription;
      const started = !!s.started_at;
      const link = /^https:\/\//i.test(s.meeting_url || '')
        ? '<a class="btn" href="' + esc(s.meeting_url) + '" target="_blank" rel="noopener noreferrer">Join lesson</a>'
        : '';
      const on = function (cond) { return cond ? ' class="on"' : ''; };
      const dis = started ? ' disabled' : '';

      let action;
      if (started) {
        action = '<span class="chip ok">Started</span>' + link;
      } else if (mode === 'auto') {
        action = '<span class="m">Starts automatically at ' + esc(new Date(s.starts_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })) + '.</span>' + link;
      } else {
        action = '<button type="button" class="btn btn-gold" data-act="start"' + (sessCanStart(s) ? '' : ' disabled') + '>Start session</button>' +
          (sessCanStart(s) ? '' : '<span class="m">Opens ' + CONFIG.startWindowMin + ' minutes before the start time.</span>') + link;
      }

      return '<div class="sess" data-id="' + esc(s.id) + '">' +
        '<div class="sess-top"><div><b>' + esc(s.learner_name) + '</b><span class="m">' + esc(s.topic || '') + '</span></div>' +
        '<span class="chip">' + esc(s.duration_min || CONFIG.sessionMinutes) + ' min</span></div>' +
        '<span class="m">' + esc(dateStr(s.starts_at, true)) + '</span>' +
        '<div class="opt-label">How it starts</div>' +
        '<div class="seg"><button type="button"' + on(mode === 'auto') + ' data-act="mode" data-v="auto"' + dis + '>Auto</button>' +
        '<button type="button"' + on(mode === 'manual') + ' data-act="mode" data-v="manual"' + dis + '>Manual</button></div>' +
        '<div class="opt-label">Transcription</div>' +
        '<div class="seg"><button type="button"' + on(trOn) + ' data-act="tr" data-v="on"' + dis + '>On</button>' +
        '<button type="button"' + on(!trOn) + ' data-act="tr" data-v="off"' + dis + '>Off</button></div>' +
        '<div class="sess-actions">' + action + '</div></div>';
    }).join('') : '<div class="empty">No upcoming sessions yet.</div>';
  }

  function renderSessions() {
    const count = function (s) { return D.sessions.filter(function (x) { return effStatus(x) === s; }).length; };
    const hours = D.sessions.filter(function (s) { return s.status === 'completed'; }).reduce(function (t, s) { return t + (Number(s.duration_min) || 0); }, 0) / 60;
    $('sessStats').innerHTML = [['Total', D.sessions.length], ['Completed', count('completed')], ['Upcoming', count('upcoming')], ['Due now', count('live') + count('awaiting')], ['Hours taught', (Math.round(hours * 10) / 10) + ' h']]
      .map(function (p) { return '<div class="stat"><div class="label">' + p[0] + '</div><strong>' + p[1] + '</strong></div>'; }).join('');

    const list = D.sessions.filter(function (s) {
      const e = effStatus(s);
      return sessFilter === 'all' || e === sessFilter || (sessFilter === 'due' && (e === 'live' || e === 'awaiting'));
    });
    $('sessTable').innerHTML = '<div class="t-row head"><div>Date</div><div>Learner &amp; topic</div><div>Length</div><div class="r">Earned</div><div class="r">Status</div></div>' +
      (list.length ? list.map(function (s) {
        return '<div class="t-row"><div>' + esc(dateStr(s.starts_at, true)) + '</div><div><b>' + esc(s.learner_name) + '</b><br><span style="color:var(--muted);font-size:12.5px">' + esc(s.topic || '') + '</span>' + transcriptHtml(s) + '</div>' +
          '<div>' + esc(s.duration_min) + ' min</div><div class="r"><b>' + kes(s.status === 'cancelled' ? 0 : s.amount_kes) + '</b></div><div class="r">' + chip(s.status) + '</div></div>';
      }).join('') : '<div class="empty">No sessions to show.</div>');
  }

  /* ---------- tasks ---------- */
  const KIND = { translation: 'Translation', questions: 'Questions', marking: 'Marking' };
  function renderTasks() {
    const taken = {};
    D.subs.forEach(function (x) { taken[x.task_id] = x; });
    $('taskList').innerHTML = D.tasks.length ? D.tasks.map(function (t) {
      const sub = taken[t.id];
      const action = sub ? chip(sub.status) : '<a class="btn btn-gold btn-sm" href="task?id=' + encodeURIComponent(t.id) + '">Start</a>';
      return '<div class="row"><div class="grow"><b>' + esc(t.title) + '</b><span class="m">' + esc(KIND[t.kind] || t.kind) + ' · ' + esc(t.time_limit_min) + ' min · ' + (t.payout_kes ? kes(t.payout_kes) : 'No payout') + '</span></div>' + action + '</div>';
    }).join('') : '<div class="empty">No tasks open right now. Check back soon.</div>';

    $('subList').innerHTML = D.subs.length ? D.subs.map(function (x) {
      const t = x.tasks || {};
      const extra = x.status === 'approved' ? ' · ' + kes(x.payout_kes) + ' earned' : '';
      const note = x.review_note ? '<span class="m">Reviewer: ' + esc(x.review_note) + '</span>' : '';
      return '<div class="row"><div class="grow"><b>' + esc(t.title || 'Task') + '</b><span class="m">' + esc(KIND[t.kind] || '') + extra + '</span>' + note + '</div>' + chip(x.status) + '</div>';
    }).join('') : '<div class="empty">You have not submitted anything yet.</div>';
  }

  /* ---------- invites (optional) ---------- */
  function inviteUrl() {
    const base = location.origin + location.pathname.replace(/[^/]*$/, '');
    return base + 'signup?ref=' + encodeURIComponent(D.refCode);
  }
  function renderInvite() {
    const rewarded = D.invites.filter(function (i) { return i.status === 'rewarded'; });
    const earned = rewarded.reduce(function (t, i) { return t + (Number(i.reward_kes) || 0); }, 0);
    $('invLink').value = D.refCode ? inviteUrl() : 'Your link is not ready yet.';
    $('invCopy').disabled = !D.refCode;
    $('invShare').hidden = !(D.refCode && navigator.share);
    $('invStats').innerHTML = [['People invited', D.invites.length], ['Earned from invites', kes(earned)], ['Waiting on certificate', D.invites.length - rewarded.length]]
      .map(function (p) { return '<div class="stat"><div class="label">' + p[0] + '</div><strong>' + p[1] + '</strong></div>'; }).join('');
    $('invList').innerHTML = D.invites.length ? D.invites.map(function (i) {
      const sub = i.status === 'rewarded' ? kes(i.reward_kes) + ' added to your earnings' : 'You earn ' + kes(i.reward_kes) + ' when they get their certificate';
      return '<div class="row"><div class="grow"><b>' + esc(i.first_name) + '</b><span class="m">Joined ' + esc(dateStr(i.joined_at)) + ' · ' + esc(sub) + '</span></div>' + chip(i.status) + '</div>';
    }).join('') : '<div class="empty">No one has joined with your link yet. Share it whenever you like.</div>';
  }

  function renderEarnings(lifetime, withdrawn, processing, pending) {
    $('earnStats').innerHTML = [
      ['Available balance', kes(balance), 'Ready to withdraw', 'gold'],
      ['Pending clearance', kes(pending), 'Awaiting verification', ''],
      ['Total withdrawn', kes(withdrawn), processing ? kes(processing) + ' processing' : 'Paid out', ''],
      ['Lifetime earned', kes(lifetime), 'Cleared earnings', '']
    ].map(function (p) { return '<div class="stat ' + p[3] + '"><div class="label">' + p[0] + '</div><strong>' + p[1] + '</strong><small>' + p[2] + '</small></div>'; }).join('');

    $('wdAvail').textContent = 'You can withdraw up to your available balance of ' + kes(balance) + '.';
    $('wdRules').innerHTML = [
      'Minimum withdrawal: ' + kes(CONFIG.minWithdrawal) + '.',
      'Payouts are processed ' + CONFIG.processingText + '.',
      'Fees: ' + CONFIG.feesText + '.',
      'Get paid by M-Pesa, Airtel Money, Mixx by Yas, HaloPesa or bank transfer, in Kenya or Tanzania.',
      'Each payout account has its own password, which you enter every time you withdraw to it.',
      'You can only withdraw your available balance. Pending earnings clear after MeloTutor verifies the session.'
    ].map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    $('wdPolicy').textContent = 'Minimum withdrawal: ' + kes(CONFIG.minWithdrawal) + '. Processing time: ' + CONFIG.processingText + '. Fees: ' + CONFIG.feesText + '. You will see the status of every request below.';

    const list = D.withdrawals.filter(function (w) { return wdFilter === 'all' || w.status === wdFilter; });
    $('wdTable').innerHTML = '<div class="t-row wd head"><div>Date</div><div>Reference</div><div>Method</div><div class="r">Amount</div><div class="r">Status</div></div>' +
      (list.length ? list.map(function (w) {
        return '<div class="t-row wd"><div>' + esc(dateStr(w.created_at)) + '</div><div class="mono">' + esc(w.reference || String(w.id).slice(0, 8)) + '</div>' +
          '<div>' + methodLabel(w.method) + '</div><div class="r"><b>' + kes(w.amount_kes) + '</b></div><div class="r">' + chip(w.status) + '</div></div>';
      }).join('') : '<div class="empty">No withdrawals yet.</div>');
  }

  /* ---------- certificate (made from the registered name; always available) ---------- */
  function titleCase(s) {
    return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|[\s'-])([a-zÀ-ɏ])/g, function (m, a, b) { return a + b.toUpperCase(); });
  }
  function certNumber() { return 'MT-' + String(user.id).replace(/-/g, '').slice(0, 8).toUpperCase(); }
  function certDate() {
    const issued = D.certs.filter(function (c) { return c.status === CONFIG.certIssuedStatus; }).map(function (c) { return new Date(c.created_at).getTime(); }).filter(Boolean).sort();
    const t = issued.length ? issued[0] : new Date((D.profile && D.profile.created_at) || user.created_at || Date.now()).getTime();
    return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function drawCertificate() {
    const cv = $('certCanvas');
    if (!cv || !cv.getContext) return;
    const c = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const gold = '#f4d58d', amber = '#e9a23b';
    const sans = "'Space Grotesk', 'Inter', system-ui, sans-serif";

    const bg = c.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0b0f17'); bg.addColorStop(1, '#121a28');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    let g = c.createRadialGradient(180, 140, 0, 180, 140, 760);
    g.addColorStop(0, 'rgba(233,162,59,.34)'); g.addColorStop(1, 'rgba(233,162,59,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    g = c.createRadialGradient(W - 140, H - 120, 0, W - 140, H - 120, 700);
    g.addColorStop(0, 'rgba(47,181,163,.26)'); g.addColorStop(1, 'rgba(47,181,163,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    function frame(inset, width, alpha, radius) {
      c.strokeStyle = 'rgba(244,213,141,' + alpha + ')'; c.lineWidth = width;
      c.beginPath();
      if (c.roundRect) c.roundRect(inset, inset, W - inset * 2, H - inset * 2, radius); else c.rect(inset, inset, W - inset * 2, H - inset * 2);
      c.stroke();
    }
    frame(44, 3, 0.9, 36); frame(66, 1.5, 0.45, 26);

    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    function text(t, x, y, font, color, spacing) {
      c.font = font; c.fillStyle = color;
      if ('letterSpacing' in c) c.letterSpacing = (spacing || 0) + 'px';
      c.fillText(t, x, y);
      if ('letterSpacing' in c) c.letterSpacing = '0px';
    }
    text('MELOTUTOR', W / 2, 190, '600 30px ' + sans, amber, 10);
    text('Certificate of Recognition', W / 2, 300, '600 84px ' + sans, gold, 0);
    text('This certifies that', W / 2, 400, '400 32px ' + sans, '#aab2bf', 1);

    const nm = titleCase(name) || 'Tutor';
    let size = 130;
    c.font = '700 ' + size + 'px ' + sans;
    while (c.measureText(nm).width > W - 340 && size > 40) { size -= 4; c.font = '700 ' + size + 'px ' + sans; }
    text(nm, W / 2, 560, '700 ' + size + 'px ' + sans, '#ffffff', 0);

    const line = c.createLinearGradient(W / 2 - 420, 0, W / 2 + 420, 0);
    line.addColorStop(0, 'rgba(244,213,141,0)'); line.addColorStop(.5, 'rgba(244,213,141,1)'); line.addColorStop(1, 'rgba(244,213,141,0)');
    c.fillStyle = line; c.fillRect(W / 2 - 420, 600, 840, 3);

    text('is a certified Swahili tutor with MeloTutor,', W / 2, 690, '400 36px ' + sans, '#dfe3ea', 0);
    text('having met the standards to teach Swahili to learners around the world.', W / 2, 744, '400 36px ' + sans, '#dfe3ea', 0);

    /* seal */
    const sx = W / 2, sy = 905;
    const sg = c.createLinearGradient(sx - 70, sy - 70, sx + 70, sy + 70);
    sg.addColorStop(0, '#ffe3a6'); sg.addColorStop(.6, amber); sg.addColorStop(1, '#c9731f');
    c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, 70, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.beginPath(); c.arc(sx, sy, 58, 0, Math.PI * 2); c.stroke();
    text('M', sx, sy + 24, '700 70px ' + sans, '#1b1206', 0);

    c.textAlign = 'left';
    text('CERTIFICATE NO.', 150, 880, '600 22px ' + sans, '#8e97a6', 4);
    text(certNumber(), 150, 930, '600 40px ' + sans, gold, 2);
    c.textAlign = 'right';
    text('DATE ISSUED', W - 150, 880, '600 22px ' + sans, '#8e97a6', 4);
    text(certDate(), W - 150, 930, '600 40px ' + sans, gold, 0);
    c.textAlign = 'center';
    text('melotutor.site', W / 2, 1040, '500 24px ' + sans, '#6f7888', 3);
  }

  function renderCert() {
    $('certBox').innerHTML = D.certs.length ? D.certs.map(function (c) {
      return '<div class="row"><div class="grow"><b>' + esc(c.certificate_title || 'Certificate') + '</b><span class="m">' + esc(dateStr(c.created_at)) + '</span></div>' + chip(c.status) + '</div>';
    }).join('') : '<div class="empty">Certificates you submit for review will be listed here.</div>';
    drawCertificate();
    /* draw again once the page fonts are ready, so the name uses the right typeface */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawCertificate);
  }

  function maskEmail(e) {
    const m = String(e || '').match(/^(.)(.*?)(.?)@(.+)$/);
    return m ? m[1] + '••••' + (m[3] || '') + '@' + m[4] : '—';
  }

  function renderProfile() {
    const p = D.profile || {};
    const since = p.created_at || user.created_at;
    const rows = [
      ['Name', titleCase(name) || '—'],
      ['Username', p.username ? '@' + p.username : '—'],
      ['Phone', p.phone || '—'],
      ['Country', p.country || '—'],
      ['Email', maskEmail(p.email || user.email)],
      ['Specialty', (D.app && D.app.specialty) || '—'],
      ['Member since', since ? dateStr(since) : '—'],
      ['Status', 'Certified tutor']
    ];
    $('profBox').innerHTML = rows.map(function (r) { return '<div><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('');
  }

  /* ---------- reservation requests (what the tutor applied for on the home page) ---------- */
  function renderMyRes() {
    $('myRes').innerHTML = D.myRes.length ? D.myRes.map(function (r) {
      return '<div class="row"><div class="grow"><b>' + esc(r.learner_name || 'Learner') + '</b><span class="m">' + esc(r.learner_code || '') + (r.preferred_start ? ' · Preferred start ' + esc(dateStr(r.preferred_start)) : '') + ' · Sent ' + esc(dateStr(r.created_at)) + '</span></div>' + chip(r.status) + '</div>';
    }).join('') : '<div class="empty">You have not applied for a learner yet. Reserve one from the learner requests page.</div>';
  }

  /* ---------- routing ---------- */
  function route() {
    let v = (location.hash || '#overview').slice(1);
    if (VIEWS.indexOf(v) === -1) v = 'overview';
    VIEWS.forEach(function (n) { $('v-' + n).hidden = n !== v; });
    document.querySelectorAll('#nav a').forEach(function (a) { a.classList.toggle('active', a.dataset.view === v); });
    /* keep the active tab in view on the phone's bottom bar */
    try {
      const act = document.querySelector('#nav a.active');
      if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest', inline: 'center' });
    } catch (e) { /* ignore */ }
    $('pageTitle').textContent = v === 'overview' ? 'Welcome back, ' + titleCase(String(name).trim().split(/\s+/)[0]) : TITLES[v];
    const un = D.profile && D.profile.username;
    $('pageSub').textContent = v === 'overview' && un ? '@' + un : '';
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
  $('invCopy').addEventListener('click', async function () {
    const el = $('invMsg');
    try { await navigator.clipboard.writeText($('invLink').value); el.textContent = 'Link copied.'; el.className = 'dmsg ok'; }
    catch (e) { $('invLink').select(); el.textContent = 'Press and hold the link to copy it.'; el.className = 'dmsg'; }
  });
  $('invShare').addEventListener('click', function () {
    navigator.share({ title: 'MeloTutor', text: 'Become a certified Swahili tutor on MeloTutor.', url: $('invLink').value }).catch(function () {});
  });

  $('signOutBtn').addEventListener('click', signOut);

  $('sessCards').addEventListener('click', async function (e) {
    const b = e.target.closest('button[data-act]');
    if (!b || b.disabled) return;
    const card = b.closest('.sess');
    const s = D.sessions.find(function (x) { return String(x.id) === card.dataset.id; });
    if (!s) return;

    sessMsg('');
    b.disabled = true;
    let res;
    if (b.dataset.act === 'start') {
      res = await sb.rpc('start_session', { p_session: s.id });
    } else {
      const mode = b.dataset.act === 'mode' ? b.dataset.v : (s.start_mode === 'auto' ? 'auto' : 'manual');
      const tr = b.dataset.act === 'tr' ? b.dataset.v === 'on' : !!s.transcription;
      res = await sb.rpc('set_session_options', { p_session: s.id, p_start_mode: mode, p_transcription: tr });
    }

    if (res.error) {
      sessMsg(res.error.message || 'Could not update the session. Please try again.', 'err');
      b.disabled = false;
      return;
    }
    sessMsg(b.dataset.act === 'start' ? 'Session started.' : 'Session updated.', 'ok');
    await loadAll();
    render();
  });

  document.querySelector('.quick').addEventListener('click', function (e) {
    const b = e.target.closest('button[data-q]');
    if (!b) return;
    const v = b.dataset.q === 'all' ? balance : Math.min(Number(b.dataset.q), balance);
    $('wdAmount').value = v ? v.toLocaleString('en-US') : '';
  });

  /* ---------- payout accounts (each one has its own password) ---------- */
  const PROVIDERS = {
    KE: [['mpesa', 'M-Pesa'], ['airtel', 'Airtel Money'], ['bank', 'Bank transfer']],
    TZ: [['mpesa', 'M-Pesa (Vodacom)'], ['mixx', 'Mixx by Yas (Tigo Pesa)'], ['airtel', 'Airtel Money'], ['halopesa', 'HaloPesa'], ['bank', 'Bank transfer']]
  };
  const COUNTRY = { KE: 'Kenya', TZ: 'Tanzania' };

  function methodLabel(m) { return { mpesa: 'M-Pesa', airtel: 'Airtel Money', mixx: 'Mixx by Yas', halopesa: 'HaloPesa', bank: 'Bank transfer' }[m] || 'Bank transfer'; }
  function providerLabel(a) {
    const hit = (PROVIDERS[a.country] || []).filter(function (p) { return p[0] === a.provider; })[0];
    return hit ? hit[1] : methodLabel(a.provider);
  }
  function maskPhone(p) { p = String(p || ''); return p.length > 8 ? p.slice(0, 5) + '••••' + p.slice(-3) : p; }

  function acctCard(a) {
    const on = a.id === selAcct;
    const locked = a.locked_until && new Date(a.locked_until) > new Date();
    const detail = a.provider === 'bank'
      ? (a.bank_name || 'Bank') + ' · ••••' + String(a.bank_account || '').slice(-4)
      : maskPhone(a.phone);
    let panel = '';
    if (acctPanel && acctPanel.id === a.id) {
      panel = acctPanel.mode === 'rm'
        ? '<form class="acct-panel" data-panel="rm" data-id="' + esc(a.id) + '" novalidate><label>Password for this account</label><input type="password" name="p1" autocomplete="off">' +
          '<div class="acct-btns"><button class="btn btn-danger btn-sm" type="submit">Remove account</button><button class="btn btn-sm" type="button" data-tool="close">Cancel</button></div><div class="dmsg" role="status"></div></form>'
        : '<form class="acct-panel" data-panel="pw" data-id="' + esc(a.id) + '" novalidate><label>Current password</label><input type="password" name="p1" autocomplete="off">' +
          '<label>New password (at least 6 characters)</label><input type="password" name="p2" autocomplete="new-password">' +
          '<div class="acct-btns"><button class="btn btn-gold btn-sm" type="submit">Change password</button><button class="btn btn-sm" type="button" data-tool="close">Cancel</button></div><div class="dmsg" role="status"></div></form>';
    }
    return '<div class="acct' + (on ? ' on' : '') + '">' +
      '<button type="button" class="acct-main" data-pick="' + esc(a.id) + '" role="radio" aria-checked="' + (on ? 'true' : 'false') + '">' +
      '<span class="acct-ico">' + esc((providerLabel(a)[0] || 'M').toUpperCase()) + '</span>' +
      '<span class="acct-txt"><b>' + esc(providerLabel(a)) + ' · ' + esc(COUNTRY[a.country] || '') + '</b><span>' + esc(a.account_name) + ' · ' + esc(detail) + '</span>' +
      (locked ? '<span class="acct-lock">Locked for a few minutes after wrong passwords</span>' : '') + '</span>' +
      '<span class="acct-tick" aria-hidden="true">✓</span></button>' +
      '<div class="acct-tools"><button type="button" data-tool="pw" data-id="' + esc(a.id) + '">Change password</button><button type="button" data-tool="rm" data-id="' + esc(a.id) + '">Remove</button></div>' +
      panel + '</div>';
  }

  function renderAccounts() {
    const list = $('acctList');
    if (D.acctsErr) {
      list.innerHTML = '<div class="empty">Payout accounts are not available right now. Please try again later.</div>';
      $('acctAddBtn').hidden = true; $('wdForm').hidden = true;
      return;
    }
    $('acctAddBtn').hidden = false;
    $('acctAddBtn').disabled = D.accts.length >= 5;
    $('acctAddBtn').textContent = D.accts.length >= 5 ? 'You have saved 5 accounts' : '+ Add payout account';
    if (!D.accts.length) {
      selAcct = null;
      list.innerHTML = '<div class="empty">Add the mobile money number or bank account where you want to receive your money.</div>';
    } else {
      if (!D.accts.some(function (a) { return a.id === selAcct; })) selAcct = D.accts[0].id;
      list.innerHTML = D.accts.map(acctCard).join('');
    }
    $('wdForm').hidden = !selAcct || !$('acctForm').hidden;
  }

  function fillProviders() {
    const c = $('afCountry').value;
    $('afProvider').innerHTML = PROVIDERS[c].map(function (p) { return '<option value="' + p[0] + '">' + esc(p[1]) + '</option>'; }).join('');
    syncAcctForm();
  }
  function syncAcctForm() {
    const bank = $('afProvider').value === 'bank';
    $('afMobile').hidden = bank; $('afBank').hidden = !bank;
    $('afPhone').placeholder = $('afCountry').value === 'TZ' ? 'e.g. 07XX XXX XXX or 06XX XXX XXX' : 'e.g. 07XX XXX XXX';
  }
  $('afCountry').addEventListener('change', fillProviders);
  $('afProvider').addEventListener('change', syncAcctForm);
  fillProviders();

  $('acctAddBtn').addEventListener('click', function () {
    msg('');
    acctPanel = null;
    $('acctForm').hidden = false;
    $('wdForm').hidden = true;
    renderAccounts();
    $('afName').focus();
  });
  $('afCancel').addEventListener('click', function () {
    $('acctForm').reset(); fillProviders();
    $('acctForm').hidden = true; msg('');
    renderAccounts();
  });

  $('acctForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    msg('');
    const country = $('afCountry').value, provider = $('afProvider').value;
    const nm = $('afName').value.trim().replace(/\s+/g, ' ');
    const pass = $('afPass').value;
    let phone = '', bankName = '', bankAcct = '';

    if (nm.length < 3 || nm.indexOf(' ') === -1) return msg('Enter the full name of the person who receives the money (at least two names).', 'err');
    if (provider === 'bank') {
      bankName = $('afBankName').value.trim(); bankAcct = $('afBankAcct').value.replace(/\s/g, '');
      if (bankName.length < 2) return msg('Enter the bank name.', 'err');
      if (!/^\d{6,20}$/.test(bankAcct)) return msg('Enter a valid bank account number (digits only).', 'err');
    } else {
      phone = $('afPhone').value.replace(/[\s\-()]/g, '');
      const ok = country === 'KE' ? /^(\+?254|0)?[17]\d{8}$/.test(phone) : /^(\+?255|0)?[67]\d{8}$/.test(phone);
      if (!ok) return msg('Enter a valid ' + COUNTRY[country] + ' phone number.', 'err');
    }
    if (pass.length < 6) return msg('The password must be at least 6 characters.', 'err');
    if (pass !== $('afPass2').value) return msg('The two passwords do not match.', 'err');

    const btn = $('afSave');
    btn.disabled = true; btn.textContent = 'Saving…';
    const res = await sb.rpc('add_payout_account', {
      p_country: country, p_provider: provider, p_name: nm, p_phone: phone || null,
      p_bank_name: bankName || null, p_bank_account: bankAcct || null, p_password: pass
    });
    btn.disabled = false; btn.textContent = 'Save account';
    if (res.error) return msg(res.error.message || 'Could not save the account. Please try again.', 'err');

    $('acctForm').reset(); fillProviders();
    $('acctForm').hidden = true;
    selAcct = res.data;
    await loadAll();
    render();
    msg('Account saved. Enter its password whenever you withdraw to it.', 'ok');
  });

  $('acctList').addEventListener('click', function (e) {
    const pick = e.target.closest('button[data-pick]');
    if (pick) { selAcct = pick.dataset.pick; msg(''); renderAccounts(); return; }
    const tool = e.target.closest('button[data-tool]');
    if (!tool) return;
    if (tool.dataset.tool === 'close') acctPanel = null;
    else acctPanel = { id: tool.dataset.id, mode: tool.dataset.tool };
    renderAccounts();
  });

  $('acctList').addEventListener('submit', async function (e) {
    const f = e.target.closest('form.acct-panel');
    if (!f) return;
    e.preventDefault();
    const out = f.querySelector('.dmsg');
    const say = function (t, k) { out.textContent = t; out.className = 'dmsg' + (k ? ' ' + k : ''); };
    const id = f.dataset.id, p1 = f.elements.p1.value;
    if (!p1) return say('Enter the password for this account.', 'err');
    const btn = f.querySelector('button[type="submit"]');
    let res;
    if (f.dataset.panel === 'pw') {
      const p2 = f.elements.p2.value;
      if (p2.length < 6) return say('The new password must be at least 6 characters.', 'err');
      btn.disabled = true;
      res = await sb.rpc('change_payout_password', { p_id: id, p_old: p1, p_new: p2 });
    } else {
      if (!confirm('Remove this payout account? You can add it again later.')) return;
      btn.disabled = true;
      res = await sb.rpc('delete_payout_account', { p_id: id, p_password: p1 });
    }
    btn.disabled = false;
    if (res.error || !res.data || !res.data.ok) {
      say((res.error && res.error.message) || (res.data && res.data.message) || 'That did not work. Please try again.', 'err');
      return;
    }
    const wasPw = f.dataset.panel === 'pw';
    acctPanel = null;
    await loadAll();
    render();
    msg(wasPw ? 'Password changed.' : 'Account removed.', 'ok');
  });

  $('wdForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    msg('');
    const amount = parseInt($('wdAmount').value.replace(/[^\d]/g, ''), 10);
    const pass = $('wdPass').value;

    if (!selAcct) return msg('Pick or add a payout account first.', 'err');
    if (!amount || amount < CONFIG.minWithdrawal) return msg('Minimum withdrawal is ' + kes(CONFIG.minWithdrawal) + '.', 'err');
    if (amount > balance) return msg('That is more than your available balance of ' + kes(balance) + '.', 'err');
    if (!pass) return msg('Enter the password for this payout account.', 'err');

    const btn = $('wdBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    const res = await sb.rpc('request_withdrawal_v2', { p_amount: amount, p_account: selAcct, p_password: pass });
    btn.disabled = false;
    btn.textContent = 'Request withdrawal';
    $('wdPass').value = '';

    const failText = res.error ? (res.error.message || 'Could not submit the request. Please try again.') : (res.data && !res.data.ok ? res.data.message : '');
    if (failText) {
      /* refresh so the lock state is right, then show the reason */
      await loadAll();
      render();
      return msg(failText, 'err');
    }
    $('wdAmount').value = '';
    await loadAll();
    render();
    msg('Withdrawal requested' + (res.data && res.data.reference ? ' (' + res.data.reference + ')' : '') + '. You can follow it in the history below.', 'ok');
  });

  /* ---------- notifications (bell) ---------- */
  function renderNotifs() {
    const unread = D.notifs.filter(function (n) { return !n.read_at; }).length;
    const dot = $('bellDot');
    dot.hidden = !unread;
    dot.textContent = unread > 9 ? '9+' : unread;
    $('bellBtn').setAttribute('aria-label', unread ? unread + ' new notifications' : 'Notifications');
    const p = $('notifPanel');
    p.innerHTML = '<div class="notif-head">Notifications</div>' + (D.notifs.length
      ? D.notifs.map(function (n) {
          const ok = /approved/.test(n.kind || ''), no = /declined/.test(n.kind || '');
          return '<a class="notif-item' + (n.read_at ? '' : ' new') + '" href="' + esc(n.link || '#overview') + '">' +
            '<span class="notif-ico ' + (ok ? 'ok' : no ? 'no' : '') + '">' + (ok ? '✓' : no ? '!' : 'i') + '</span>' +
            '<span class="notif-txt"><b>' + esc(n.title) + '</b><span>' + esc(n.body || '') + '</span><small>' + esc(timeAgo(n.created_at)) + '</small></span></a>';
        }).join('')
      : '<div class="empty">Nothing new yet. When a session you applied for is approved, you will see it here.</div>');
  }
  function timeAgo(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return Math.floor(s / 86400) + ' d ago';
  }
  async function refreshNotifs() {
    try {
      const r = await sb.rpc('my_notifications');
      if (Array.isArray(r.data)) { D.notifs = r.data; renderNotifs(); }
    } catch (e) { /* stay quiet */ }
  }
  $('bellBtn').addEventListener('click', async function (e) {
    e.stopPropagation();
    const p = $('notifPanel'), open = p.hidden;
    p.hidden = !open;
    $('bellBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open && D.notifs.some(function (n) { return !n.read_at; })) {
      /* keep the highlight while the panel is open, clear the badge now */
      $('bellDot').hidden = true;
      await sb.rpc('mark_notifications_read');
      D.notifs = D.notifs.map(function (n) { return Object.assign({}, n, { read_at: n.read_at || new Date().toISOString(), _was: !n.read_at }); });
    }
  });
  document.addEventListener('click', function (e) {
    const p = $('notifPanel');
    if (!p.hidden && !e.target.closest('.bell-wrap')) { p.hidden = true; $('bellBtn').setAttribute('aria-expanded', 'false'); renderNotifs(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('notifPanel').hidden = true; });
  setInterval(function () { if (!document.hidden && $('notifPanel').hidden) refreshNotifs(); }, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && $('notifPanel').hidden) refreshNotifs(); });

  /* ---------- progress levels ---------- */
  function pbar(done, total) {
    const pct = total > 0 ? Math.min(100, Math.round(done / total * 100)) : 100;
    return '<div class="pbar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>';
  }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  function renderProgress() {
    const p = D.prog;
    const strip = $('progStrip');
    if (!p) {
      strip.hidden = true;
      $('progHero').innerHTML = '<h2>Your progress</h2><div class="empty">Your level will show here once your account has some activity.</div>';
      $('progStats').innerHTML = ''; $('progNext').innerHTML = ''; $('progLadder').innerHTML = '';
      return;
    }
    const lv = p.level, nx = p.next;
    const bonus = Number(lv.bonus_pct) || 0;
    const sLeft = nx ? Math.max(0, nx.min_sessions - p.sessions) : 0;
    const wLeft = nx ? Math.max(0, nx.min_weeks - p.weeks) : 0;
    const headline = bonus > 0 ? '+' + bonus + '% on every session you complete' : (nx ? 'Reach ' + nx.name + ' to earn +' + Number(nx.bonus_pct) + '% on every session' : 'Keep teaching');
    const toNext = nx ? (sLeft ? plural(sLeft, 'more session') : '') + (sLeft && wLeft ? ' and ' : '') + (wLeft ? plural(wLeft, 'more week') : '') : '';

    /* overview strip */
    const ratio = nx ? Math.min(nx.min_sessions ? p.sessions / nx.min_sessions : 1, nx.min_weeks ? p.weeks / nx.min_weeks : 1) : 1;
    strip.hidden = false;
    strip.innerHTML = '<div class="ps-top"><div><div class="label">Your level</div><b class="ps-name">' + esc(lv.name) + '</b></div><span class="chip ' + (bonus > 0 ? 'ok' : '') + '">' + (bonus > 0 ? '+' + bonus + '% per session' : 'Level ' + esc(lv.level)) + '</span></div>' +
      pbar(ratio, 1) + '<div class="ps-note">' + (nx ? esc(toNext || 'Almost there') + ' to reach ' + esc(nx.name) : 'You are at the top level. Thank you for teaching with MeloTutor.') + '</div>';

    /* progress page */
    const ex = Math.round(1000 * (1 + bonus / 100));
    const payNote = bonus > 0
      ? '<div class="pay-note"><b>What this means for your pay</b><span>Every session you complete now earns <b>+' + bonus + '%</b> on top of the session fee. A KSh 1,000 session pays <b>KSh ' + ex.toLocaleString('en-US') + '</b>. This applies to new sessions. Money already in your account does not change.' + (nx ? ' Reach ' + esc(nx.name) + ' and it rises to +' + Number(nx.bonus_pct) + '%.' : '') + '</span></div>'
      : '<div class="pay-note"><b>What this means for your pay</b><span>You earn the standard session fee for now. As you complete sessions and stay with MeloTutor, each new level adds a bonus to every session you complete' + (nx ? ' (+' + Number(nx.bonus_pct) + '% at ' + esc(nx.name) + ')' : '') + '.</span></div>';
    $('progHero').innerHTML = '<div class="label">Your level' + (p.granted ? ' · upgraded by MeloTutor' : '') + '</div><div class="big">' + esc(lv.name) + '</div><p class="note" style="margin:0">' + esc(headline) + '.</p>' + payNote;
    $('progStats').innerHTML = [['Sessions completed', p.sessions], ['Weeks with MeloTutor', p.weeks], ['Bonus earned so far', kes(p.bonus_earned)]]
      .map(function (s) { return '<div class="stat"><div class="label">' + s[0] + '</div><strong>' + s[1] + '</strong></div>'; }).join('');

    $('progNext').innerHTML = nx
      ? '<div class="card-head"><h2>Next level: ' + esc(nx.name) + '</h2><span class="chip ok">+' + Number(nx.bonus_pct) + '% per session</span></div>' +
        '<div class="pl"><span>Sessions</span><b>' + p.sessions + ' / ' + nx.min_sessions + '</b></div>' + pbar(p.sessions, nx.min_sessions) +
        '<div class="pl"><span>Weeks with MeloTutor</span><b>' + p.weeks + ' / ' + nx.min_weeks + '</b></div>' + pbar(p.weeks, nx.min_weeks) +
        '<p class="note">' + (toNext ? 'You need ' + esc(toNext) + '.' : 'You have reached everything for this level. It applies as soon as your next session is completed.') + '</p>'
      : '<h2>Top level reached</h2><p class="note" style="margin:0">You earn the highest bonus on every session. Keep it up.</p>';

    $('progLadder').innerHTML = (p.ladder || []).map(function (l) {
      const reached = l.level <= lv.level, current = l.level === lv.level;
      return '<div class="row"><div class="lv-badge' + (reached ? ' on' : '') + '">' + esc(l.level) + '</div><div class="grow"><b>' + esc(l.name) + '</b><span class="m">' +
        (l.min_sessions ? plural(l.min_sessions, 'session') + ' and ' + plural(l.min_weeks, 'week') : 'Where everyone starts') + ' · ' + (Number(l.bonus_pct) > 0 ? '+' + Number(l.bonus_pct) + '% on every session' : 'No bonus') + '</span></div>' +
        '<span class="chip ' + (current ? '' : reached ? 'ok' : 'warn') + '">' + (current ? 'You are here' : reached ? 'Reached' : 'Locked') + '</span></div>';
    }).join('');
  }

  /* Phone navigation: the bottom bar shows the main tabs, "More" opens the rest. */
  (function () {
    const nav = $('nav'), more = $('navMore'), scrim = $('navScrim');
    function setOpen(on) {
      nav.classList.toggle('open', on);
      more.setAttribute('aria-expanded', on ? 'true' : 'false');
      scrim.hidden = !on;
    }
    more.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
    scrim.addEventListener('click', function () { setOpen(false); });
    window.addEventListener('hashchange', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  })();

  /* Certificate: download as a picture, or print. */
  $('certDownload').addEventListener('click', function () {
    drawCertificate();
    $('certCanvas').toBlob(function (blob) {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'MeloTutor-Certificate-' + (String(name).trim().replace(/[^\w]+/g, '-') || 'tutor') + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, 'image/png');
  });
  $('certPrint').addEventListener('click', function () { drawCertificate(); window.print(); });

  init();
})();
