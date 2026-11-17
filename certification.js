/* =====================================================
   MELOTUTOR — CERTIFICATION
   File: js/certification.js
   Requires js/config.js (window.sb)
===================================================== */

(function () {
  'use strict';

  const sb = window.sb;

  if (!sb) {
    console.error('MeloTutor: Supabase client unavailable.');
    const b = document.getElementById('dataBanner');
    if (b) {
      b.textContent = 'Connection error. Please refresh the page.';
      b.hidden = false;
    }
    return;
  }

  const $ = (id) => document.getElementById(id);

  const CERTIFICATE_FEE_USD = 1;

  const exchangeRates = {
    KES: 130,
    TZS: 2645
  };

  let exchangeRatesPromise = null;
  let user = null;
  let loadFailed = false;

  /* ---------- HELPERS ---------- */

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c];
    });
  }

  function pretty(status) {
    if (!status) return 'Not submitted';
    const s = String(status).replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function fmtDate(value) {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function setMsg(id, text, kind) {
    const el = $(id);
    if (!el) return;
    el.textContent = text || '';
    el.className = 'dmsg' + (kind ? ' ' + kind : '');
  }

  /* ---------- CERTIFICATE FEE AND EXCHANGE RATES ---------- */

  function getCertificateAmount(currency) {
    const rate = exchangeRates[currency];

    if (!rate || !Number.isFinite(rate)) {
      throw new Error('Exchange rate unavailable.');
    }

    return Math.round(CERTIFICATE_FEE_USD * rate);
  }

  function formatCertificateFee(currency) {
    const amount = getCertificateAmount(currency);

    if (currency === 'KES') {
      return 'KSh ' + amount.toLocaleString('en-KE') + ' (USD $1.00)';
    }

    if (currency === 'TZS') {
      return 'TSh ' + amount.toLocaleString('en-TZ') + ' (USD $1.00)';
    }

    return '$1.00 USD';
  }

  function updateCertificateFee() {
    const country = $('readyCountry');
    const fee = $('certificateFee');

    if (!country || !fee) return;

    const currency = country.value === 'TZ' ? 'TZS' : 'KES';

    try {
      fee.textContent = formatCertificateFee(currency);
    } catch (err) {
      fee.textContent = '$1.00 USD';
    }
  }

  async function loadExchangeRates() {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');

      if (!response.ok) {
        throw new Error('Exchange rate request failed.');
      }

      const result = await response.json();

      if (
        result.result !== 'success' ||
        !result.rates ||
        !Number.isFinite(result.rates.KES) ||
        !Number.isFinite(result.rates.TZS)
      ) {
        throw new Error('Invalid exchange rate data.');
      }

      exchangeRates.KES = result.rates.KES;
      exchangeRates.TZS = result.rates.TZS;

    } catch (err) {
      console.warn('MeloTutor: Using fallback exchange rates.', err);
    }

    updateCertificateFee();
  }

  exchangeRatesPromise = loadExchangeRates();

  /* Run one query; a missing table or policy never breaks the rest of the page. */
  async function safe(promise) {
    try {
      const res = await promise;

      if (res.error) {
        console.warn('MeloTutor dashboard query:', res.error.message);
        loadFailed = true;
      }

      return res;
    } catch (err) {
      console.warn('MeloTutor dashboard query failed:', err);
      loadFailed = true;

      return {
        data: null,
        error: err,
        count: null
      };
    }
  }

  /* ---------- SESSION ---------- */

  async function init() {
    const { data } = await sb.auth.getSession();

    if (!data || !data.session) {
      window.location.replace('login.html?next=certification.html');
      return;
    }

    user = data.session.user;

    sb.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT') {
        window.location.replace('login.html');
      }
    });

    if (new URLSearchParams(window.location.search).get('welcome')) {
      $('welcomeBanner').hidden = false;
    }

    await loadProfile();
    await loadAll();
  }

  /* ---------- PROFILE ---------- */

  async function loadProfile() {
    const meta = user.user_metadata || {};
    let profile = null;

    const res = await safe(
      sb.from('profiles')
        .select('full_name,username,email')
        .eq('id', user.id)
        .maybeSingle()
    );

    profile = res.data;

    /* Google sign-ups have no profile row yet: create a basic one. */
    if (!profile && !res.error) {
      const fullName = meta.full_name || meta.name || '';

      const up = await safe(
        sb.from('profiles').upsert(
          {
            id: user.id,
            full_name: fullName,
            email: user.email
          },
          { onConflict: 'id' }
        )
      );

      if (!up.error) {
        profile = {
          full_name: fullName,
          username: '',
          email: user.email
        };
      }
    }

    const name =
      (profile && profile.full_name) ||
      meta.full_name ||
      meta.name ||
      user.email;

    const first = String(name).trim().split(/\s+/)[0];
    const username = profile && profile.username
      ? '@' + profile.username
      : '';

    $('welcomeTitle').textContent = 'Welcome, ' + first;
    $('welcomeSub').textContent = [username, user.email]
      .filter(Boolean)
      .join(' · ');

    $('chipName').textContent = name;
    $('chipEmail').textContent = user.email || '';
  }

  /* ---------- DASHBOARD DATA ---------- */

  async function loadAll() {
    const uid = user.id;

    const [app, certs, orders] = await Promise.all([
      safe(
        sb.from('tutor_applications')
          .select('status,phone,country_code,specialty,experience_note')
          .eq('user_id', uid)
          .maybeSingle()
      ),

      safe(
        sb.from('certificates')
          .select('status,certificate_title,created_at')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
      ),

      safe(
        sb.from('certificate_orders')
          .select('status,created_at')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
      )
    ]);

    /* Tutor application */
    const appRow = app.data;

    const appStatus = app.error
      ? 'Unavailable'
      : (appRow ? pretty(appRow.status) : 'Not submitted');

    /* The application form and its status labels are not on this page, so skip them if absent. */
    if ($('statApp')) $('statApp').textContent = appStatus;
    if ($('stepAppState')) $('stepAppState').textContent = appStatus;

    if (appRow && $('appForm')) {
      $('appPhone').value = appRow.phone || '';
      $('appCountry').value = appRow.country_code || 'KE';

      if (appRow.specialty) {
        $('appSpecialty').value = appRow.specialty;
      }

      $('appExperience').value = appRow.experience_note || '';
    }

    /* Certificates */
    const certList = certs.data || [];
    const orderList = orders.data || [];

    /* Certificate issued: this step is finished, go to the dashboard. */
    if (certList.some((c) => c.status === 'issued')) {
      window.location.replace('dashboard.html');
      return;
    }

    let certStatus = 'Not submitted';

    if (certs.error) {
      certStatus = 'Unavailable';
    } else if (certList.length) {
      certStatus = pretty(certList[0].status);
    } else if (orderList.length) {
      certStatus = pretty(orderList[0].status);
    }

    $('statCert').textContent = certStatus;
    $('stepCertState').textContent = certStatus;

    /* Activity */
    const items = [];

    if (appRow) {
      items.push({
        text: 'Tutor application: ' + pretty(appRow.status),
        date: ''
      });
    }

    certList.forEach((c) => {
      items.push({
        text: 'Certificate' +
          (c.certificate_title ? ' “' + c.certificate_title + '”' : '') +
          ': ' + pretty(c.status),
        date: c.created_at
      });
    });

    orderList.forEach((o) => {
      items.push({
        text: 'Expedited assessment application: ' + pretty(o.status),
        date: o.created_at
      });
    });

    $('activityList').innerHTML = items.length
      ? items.map((i) =>
          '<li><span>' + esc(i.text) +
          '</span><time>' + esc(fmtDate(i.date)) +
          '</time></li>'
        ).join('')
      : '<li class="empty">No activity recorded yet.</li>';

    if (loadFailed) {
      const b = $('dataBanner');
      b.textContent = 'Some account details could not be loaded.';
      b.hidden = false;
    }
  }

  /* ---------- TUTOR APPLICATION ---------- */

  const appFormEl = $('appForm');

  if (appFormEl) appFormEl.addEventListener('submit', async function (e) {
    e.preventDefault();

    const phone = $('appPhone').value.trim();
    const experience = $('appExperience').value.trim();

    if (phone.replace(/\D/g, '').length < 9) {
      setMsg('appMsg', 'Please enter a valid phone number.', 'error');
      return;
    }

    if (experience.length < 10) {
      setMsg('appMsg', 'Please describe your teaching background.', 'error');
      return;
    }

    $('appBtn').disabled = true;

    const { error } = await sb.from('tutor_applications').upsert({
      user_id: user.id,
      phone: phone,
      country_code: $('appCountry').value,
      specialty: $('appSpecialty').value,
      experience_note: experience,
      status: 'pending'
    }, {
      onConflict: 'user_id'
    });

    $('appBtn').disabled = false;

    if (error) {
      console.error('MeloTutor application error:', error);

      setMsg(
        'appMsg',
        'We could not submit your application. Please try again.',
        'error'
      );

      return;
    }

    setMsg('appMsg', 'Application submitted. It is pending review.', 'ok');

    loadFailed = false;
    await loadAll();
  });

  /* ---------- CERTIFICATE: EXISTING ---------- */

  $('existingForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const institution = $('certInstitution').value.trim();
    const title = $('certTitle').value.trim();
    const file = $('certFile').files[0];

    if (!institution || !title || !file) {
      setMsg(
        'existingMsg',
        'Please complete every field and choose a file.',
        'error'
      );
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setMsg(
        'existingMsg',
        'The file must be 8 MB or smaller.',
        'error'
      );
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();

    if (['pdf', 'jpg', 'jpeg', 'png'].indexOf(ext) === -1) {
      setMsg(
        'existingMsg',
        'Only PDF, JPG and PNG files are accepted.',
        'error'
      );
      return;
    }

    $('existingBtn').disabled = true;

    try {
      const path = user.id + '/' + crypto.randomUUID() + '.' + ext;

      const up = await sb.storage
        .from('certificate-documents')
        .upload(path, file, {
          upsert: false,
          contentType: file.type
        });

      if (up.error) throw up.error;

      const ins = await sb.from('certificates').insert({
        user_id: user.id,
        certificate_type: 'existing',
        certificate_title: title,
        issuing_institution: institution,
        file_path: path,
        status: 'pending_verification'
      });

      if (ins.error) throw ins.error;

      setMsg(
        'existingMsg',
        'Certificate submitted successfully.',
        'ok'
      );

      $('existingForm').reset();

      loadFailed = false;
      await loadAll();

    } catch (err) {
      console.error('MeloTutor certificate error:', err);

      setMsg(
        'existingMsg',
        'We could not submit your certificate. Please try again.',
        'error'
      );

    } finally {
      $('existingBtn').disabled = false;
    }
  });

  /* ---------- CERTIFICATE: FREE COURSE ---------- */

  $('courseBtn').addEventListener('click', function () {
    setMsg(
      'courseMsg',
      'The free certification programme is not open yet. Enrolment will be announced here.',
      'ok'
    );
  });

  /* ---------- CERTIFICATE: EXPEDITED ASSESSMENT ---------- */

  $('readyCountry').addEventListener('change', updateCertificateFee);

  $('readyForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const country = $('readyCountry').value;
    const experience = $('readyExperience').value.trim();

    if (experience.length < 10) {
      setMsg(
        'readyMsg',
        'Please describe your Swahili teaching experience.',
        'error'
      );
      return;
    }

    $('readyBtn').disabled = true;

    try {
      /* Wait for the live exchange-rate request before recording the fee. */
      await exchangeRatesPromise;

      const currency = country === 'TZ' ? 'TZS' : 'KES';
      const amount = getCertificateAmount(currency);

      /* Never create a second unpaid order: reuse the one already waiting. */
      const waiting = await sb.from('certificate_orders')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'awaiting_payment')
        .limit(1);

      if (waiting.error) throw waiting.error;

      if (waiting.data && waiting.data.length) {
        setMsg(
          'readyMsg',
          'You already have an application waiting for payment. Use the Pay now button below.',
          'ok'
        );
      } else {
        const { error } = await sb.from('certificate_orders').insert({
          user_id: user.id,
          country_code: country,
          amount: amount,
          currency: currency,
          experience_note: experience,
          status: 'awaiting_payment'
        });

        if (error) throw error;

        setMsg(
          'readyMsg',
          'Application recorded. Complete your payment below to receive your certificate.',
          'ok'
        );
      }

      $('readyForm').reset();
      updateCertificateFee();

      loadFailed = false;
      await loadAll();

    } catch (err) {
      console.error('MeloTutor assessment error:', err);

      setMsg(
        'readyMsg',
        'We could not record your application. Please try again.',
        'error'
      );

    } finally {
      $('readyBtn').disabled = false;
    }
  });

  /* ---------- SLIDER ---------- */

  const track = $('stepsTrack');

  function slideBy(dir) {
    const slide = track.querySelector('.slide');
    const step = slide
      ? slide.getBoundingClientRect().width + 14
      : 320;

    track.scrollBy({
      left: dir * step,
      behavior: 'smooth'
    });
  }

  $('stepsPrev').addEventListener('click', () => slideBy(-1));
  $('stepsNext').addEventListener('click', () => slideBy(1));

  /* ---------- SIDEBAR: ACTIVE LINK ---------- */

  const links = document.querySelectorAll('.nav a[href^="#"]');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        links.forEach((a) => {
          a.classList.toggle(
            'active',
            a.getAttribute('href') === '#' + entry.target.id
          );
        });
      });
    }, {
      rootMargin: '-30% 0px -60% 0px'
    });

    links.forEach(function (a) {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) observer.observe(target);
    });
  }

  /* ---------- SIGN OUT ---------- */

  $('signOutBtn').addEventListener('click', async function () {
    $('signOutBtn').disabled = true;

    await sb.auth.signOut();
    window.location.href = 'login.html';
  });

  updateCertificateFee();
  init();

})();
