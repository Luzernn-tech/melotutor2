/* =====================================================
   MELOTUTOR — TASK PAGE (translation, questions, marking)
   File: js/task.js
   Requires config.js (window.sb) and supabase-tasks-setup.sql.

   Honest note on the integrity guard: a web page CAN notice when someone leaves
   it, switches tabs, or pastes. It CANNOT see screenshots or other apps' AI tools.
   So the guard is a deterrent, and the real safeguard is that an admin reviews
   every submission before anyone is paid.
===================================================== */

(function () {
  'use strict';

  const sb = window.sb;
  const $ = (id) => document.getElementById(id);
  const KIND = { translation: 'English to Swahili translation', questions: 'Questions', marking: 'Assignment marking' };

  let task = null;
  let questions = [];
  let sub = null;          // the submission row
  let deadline = 0;        // ms timestamp
  let timerId = 0;
  let guardOn = false;     // true only while a task is in progress
  let finished = false;
  const integrity = { pasteAttempts: 0, copyAttempts: 0, keystrokes: 0, flags: [] };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function show(which) {
    ['tMsg', 'tRules', 'tWork'].forEach(function (id) { $(id).hidden = id !== which; });
    window.scrollTo(0, 0);
  }

  function message(text, buttons) {
    $('tMsgText').textContent = text;
    $('tMsgActions').innerHTML = '';
    (buttons || [{ label: 'Back to tasks', href: 'dashboard.html#tasks', gold: true }]).forEach(function (b) {
      const a = document.createElement('a');
      a.className = 'btn ' + (b.gold ? 'btn-gold' : '');
      a.textContent = b.label;
      a.href = b.href;
      $('tMsgActions').appendChild(a);
    });
    show('tMsg');
  }

  /* ---------- load ---------- */
  async function init() {
    if (!sb) return message('Connection error. Please refresh the page.');

    const id = new URLSearchParams(location.search).get('id');
    if (!id) return message('That task link is not valid.');

    const s = await sb.auth.getSession();
    if (!s.data || !s.data.session) {
      location.replace('login.html?next=' + encodeURIComponent('task.html?id=' + id));
      return;
    }

    const t = await sb.from('tasks').select('*').eq('id', id).maybeSingle();
    if (t.error || !t.data) return message('This task is not available.');
    task = t.data;

    const q = await sb.from('task_questions').select('id,position,prompt').eq('task_id', id).order('position');
    questions = q.data || [];

    const existing = await sb.from('submissions').select('id,status,review_note').eq('task_id', id).eq('user_id', s.data.session.user.id).maybeSingle();
    sub = existing.data || null;

    if (sub) {
      if (sub.status === 'in_progress') {
        /* They came back to a task they never finished: that means they left it. */
        await sb.rpc('forfeit_submission', { p_id: sub.id, p_reason: 'Left the task page', p_integrity: integrity });
        return message('You left this task before submitting, so the attempt was closed. Tasks cannot be restarted.');
      }
      const text = {
        pending: 'You already submitted this task. It is waiting for review.',
        approved: 'Your work on this task was approved. Nice work.',
        rejected: 'Your work on this task was reviewed and not approved.' + (sub.review_note ? ' Reviewer note: ' + sub.review_note : ''),
        forfeited: 'This attempt was closed, so the task cannot be started again.'
      }[sub.status] || 'You already took this task.';
      return message(text);
    }

    $('tKind').textContent = KIND[task.kind] || task.kind;
    $('tTitle').textContent = task.title;
    $('tMeta').textContent = task.time_limit_min + ' minutes · ' + (task.payout_kes ? 'KSh ' + Number(task.payout_kes).toLocaleString('en-US') + ' when approved' : 'Unpaid');
    $('tInstr').textContent = task.instructions || '';
    show('tRules');
  }

  $('tAgree').addEventListener('change', function () { $('tStart').disabled = !this.checked; });

  /* ---------- start ---------- */
  $('tStart').addEventListener('click', async function () {
    this.disabled = true;
    this.textContent = 'Starting…';
    const res = await sb.rpc('start_submission', { p_task: task.id });
    if (res.error || !res.data) {
      this.disabled = false;
      this.textContent = 'Start task';
      return message((res.error && res.error.message) || 'Could not start the task. Please try again.');
    }
    sub = res.data;
    try { if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); } catch (e) { /* optional */ }
    buildWork();
    show('tWork');
    deadline = new Date(sub.started_at).getTime() + task.time_limit_min * 60000;
    startTimer();
    guardOn = true;
  });

  function buildWork() {
    $('tWorkTitle').textContent = task.title;
    $('tWorkKind').textContent = ' ' + (KIND[task.kind] || '');
    const src = $('tSource');
    let html = '';

    if (task.kind === 'translation') {
      src.hidden = false;
      src.innerHTML = '<div class="label">Translate into Swahili</div><div class="source-text">' + esc(task.source_text) + '</div>';
      html = '<label for="f0">Your Swahili translation</label><textarea id="f0" data-k="translation" rows="12" placeholder="Andika tafsiri yako hapa…"></textarea>';
    } else if (task.kind === 'questions') {
      html = questions.map(function (qu, i) {
        return '<label for="f' + i + '">' + (i + 1) + '. ' + esc(qu.prompt) + '</label><textarea id="f' + i + '" data-k="' + esc(qu.id) + '" rows="4"></textarea>';
      }).join('') || '<div class="empty">This task has no questions yet.</div>';
    } else {
      src.hidden = false;
      src.innerHTML = '<div class="label">Work to mark</div><div class="source-text">' + esc(task.source_text) + '</div>' +
        (task.rubric ? '<div class="label" style="margin-top:14px">How to mark</div><div class="source-text">' + esc(task.rubric) + '</div>' : '');
      html = '<label for="fScore">Score (0 to ' + esc(task.max_score || 100) + ')</label><input id="fScore" type="number" inputmode="numeric" min="0" max="' + esc(task.max_score || 100) + '">' +
        '<label for="f0">Feedback for the learner</label><textarea id="f0" data-k="feedback" rows="8" placeholder="What was good, what to fix…"></textarea>';
    }
    $('tFields').innerHTML = html;
  }

  /* ---------- timer ---------- */
  function startTimer() {
    function tick() {
      const left = Math.max(0, deadline - Date.now());
      const m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60;
      $('tTimer').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      $('tTimer').classList.toggle('low', left < 60000);
      if (left <= 0) { clearInterval(timerId); submit(true); }
    }
    tick();
    timerId = setInterval(tick, 1000);
  }

  /* ---------- integrity guard ---------- */
  async function forfeit(reason) {
    if (!guardOn || finished) return;
    finished = true;
    guardOn = false;
    clearInterval(timerId);
    if (document.fullscreenElement && document.exitFullscreen) { try { document.exitFullscreen(); } catch (e) { /* ignore */ } }
    integrity.flags.push(reason);
    message('You left the task page, so this attempt was closed and cannot be restarted. Rules: stay on the page until you submit.');
    try { await sb.rpc('forfeit_submission', { p_id: sub.id, p_reason: reason, p_integrity: integrity }); } catch (e) { /* the server also closes it on next visit */ }
  }

  document.addEventListener('visibilitychange', function () { if (document.hidden) forfeit('Switched tab or app'); });
  window.addEventListener('pagehide', function () { forfeit('Left the page'); });
  window.addEventListener('blur', function () {
    if (!guardOn) return;
    /* short pause so a quick system pop-up does not count as leaving */
    setTimeout(function () { if (guardOn && !document.hasFocus()) forfeit('Window lost focus'); }, 1200);
  });

  function block(kind) {
    return function (e) {
      if (!guardOn) return;
      e.preventDefault();
      integrity[kind]++;
      const el = $('tErr');
      el.textContent = 'Copying and pasting are not allowed. This was recorded.';
      el.className = 'dmsg err';
    };
  }
  document.addEventListener('paste', block('pasteAttempts'));
  document.addEventListener('drop', block('pasteAttempts'));
  document.addEventListener('copy', block('copyAttempts'));
  document.addEventListener('cut', block('copyAttempts'));
  document.addEventListener('contextmenu', function (e) { if (guardOn) e.preventDefault(); });
  document.addEventListener('keydown', function (e) {
    if (!guardOn) return;
    if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey) integrity.keystrokes++;
  });

  /* ---------- submit ---------- */
  function collect() {
    const answers = {};
    document.querySelectorAll('#tFields textarea').forEach(function (t) { answers[t.dataset.k] = t.value.trim(); });
    const chars = Object.keys(answers).reduce(function (n, k) { return n + answers[k].length; }, 0);
    /* flag text that appeared with far fewer keystrokes than characters (possible paste or auto-fill) */
    if (chars > 40 && integrity.keystrokes < chars * 0.6) integrity.flags.push('Few keystrokes for the text length');
    return answers;
  }

  async function submit(auto) {
    if (!guardOn || finished) return;
    const answers = collect();
    let score = null;
    if (task.kind === 'marking') {
      const raw = $('fScore').value;
      score = raw === '' ? NaN : Number(raw);
      if (!auto && (isNaN(score) || score < 0 || score > (task.max_score || 100))) {
        $('tErr').textContent = 'Enter a score between 0 and ' + (task.max_score || 100) + '.';
        $('tErr').className = 'dmsg err';
        return;
      }
      if (isNaN(score)) score = null;
    }
    if (!auto && Object.keys(answers).every(function (k) { return !answers[k]; })) {
      $('tErr').textContent = 'Write your answer before submitting.';
      $('tErr').className = 'dmsg err';
      return;
    }

    $('tSubmit').disabled = true;
    $('tSubmit').textContent = 'Submitting…';
    guardOn = false;           /* stop the guard so a successful submit is not a forfeit */
    clearInterval(timerId);

    const res = await sb.rpc('submit_submission', { p_id: sub.id, p_answers: answers, p_score: score, p_integrity: integrity });
    if (res.error) {
      finished = true;
      if (document.fullscreenElement && document.exitFullscreen) { try { document.exitFullscreen(); } catch (e) { /* ignore */ } }
      return message(res.error.message || 'Could not submit. Please contact support.');
    }
    finished = true;
    if (document.fullscreenElement && document.exitFullscreen) { try { document.exitFullscreen(); } catch (e) { /* ignore */ } }
    message(auto ? 'Time is up. We submitted what you had written. It is now waiting for review.' : 'Submitted. The team will review your work and you will see the result under Tasks.');
  }
  $('tSubmit').addEventListener('click', function () { submit(false); });

  init();
})();
