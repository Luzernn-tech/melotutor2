
/* MeloTutor — authentication for signup.html and login.html. */
(function () {
  /* ---------- SUPABASE ---------- */
  var SUPABASE_URL = 'https://eyyfphdmtihmhzabnamv.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_iFPU8j_Vru0q6Nshp92_Yg_ENP1HcGI';
  var sb = window.sb || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  var MIN_PASSWORD = 6;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var USERNAME_RE = /^[A-Za-z0-9_]{3,24}$/;

  function $(s) { return document.querySelector(s); }

  function setMsg(text, kind) {
    var el = $('#authMessage');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'msg' + (kind ? ' ' + kind : '');
  }

  function setBusy(busy) {
    ['#signupBtn', '#loginBtn', '#googleBtn'].forEach(function (id) {
      var b = $(id);
      if (b) b.disabled = busy;
    });
  }

  /* Folder this page lives in, so redirects work on any host or subfolder. */
  function baseUrl() {
    return location.origin + location.pathname.replace(/[^/]*$/, '');
  }

  /* Where to go after logging in. */
  var ALLOWED_NEXT = ['index.html', 'dashboard.html', 'certification.html'];

  function nextUrl() {
    var next = new URLSearchParams(window.location.search).get('next');
    return ALLOWED_NEXT.indexOf(next) !== -1 ? next : 'dashboard.html';
  }

  /* Check username through secure Supabase RPC.
     Does not expose profile records to anonymous visitors. */
  async function isUsernameTaken(username) {
    var res = await sb.rpc('is_username_taken', {
      p_username: username
    });

    if (res.error) throw res.error;
    return res.data === true;
  }

  /* Generate a unique fallback username for Google OAuth signups. */
  async function generateUniqueUsername(user) {
    var meta = user.user_metadata || {};
    var raw = (meta.preferred_username || meta.full_name || meta.name || (user.email || 'tutor').split('@')[0])
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 18);

    if (raw.length < 3) raw = 'tutor_' + raw;

    var candidate = raw;

    for (var i = 0; i < 6; i++) {
      var taken = await isUsernameTaken(candidate);
      if (!taken) return candidate;

      var suffix = Math.floor(100 + Math.random() * 9000);
      candidate = raw.slice(0, 19) + '_' + suffix;
    }

    return 'tutor_' + Date.now().toString().slice(-8);
  }

  /* Ensure Google OAuth users have a profile row with a unique username. */
  async function ensureOAuthProfile(session) {
    if (!session || !session.user) return;

    var user = session.user;

    var existing = await sb
      .from('profiles')
      .select('id, username')
      .eq('id', user.id)
      .maybeSingle();

    if (existing.data && existing.data.username) return;

    var meta = user.user_metadata || {};
    var fullName = (meta.full_name || meta.name || '').trim();
    var username = await generateUniqueUsername(user);

    var profileResult = await sb.from('profiles').upsert(
      {
        id: user.id,
        full_name: fullName || username,
        username: username,
        email: (user.email || '').toLowerCase()
      },
      { onConflict: 'id' }
    );

    if (profileResult.error) throw profileResult.error;
  }

  /* Already signed in (or returning from Google OAuth)? Ensure profile & redirect. */
  sb.auth.getSession().then(async function (r) {
    if (r.data && r.data.session) {
      try {
        await ensureOAuthProfile(r.data.session);
      } catch (e) {
        console.warn('Profile sync notice:', e.message);
      }

      var isSignupPage = Boolean($('#signupForm'));
      var dest = isSignupPage && !new URLSearchParams(window.location.search).get('next')
        ? 'certification.html?welcome=1'
        : nextUrl();

      window.location.replace(dest);
    }
  });

  /* ---------- SHOW / HIDE PASSWORD ---------- */
  var toggle = $('#togglePw');

  if (toggle) {
    toggle.addEventListener('click', function () {
      var input = $('#authPassword');
      var show = input.type === 'password';

      input.type = show ? 'text' : 'password';
      toggle.textContent = show ? 'Hide' : 'Show';
      toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  }

  /* ---------- SIGN UP (email + password + unique username) ---------- */
  var signupForm = $('#signupForm');

  if (signupForm) {
    signupForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      var name = $('#authName').value.trim();
      var username = ($('#authUsername') ? $('#authUsername').value.trim().toLowerCase() : '');
      var email = $('#authEmail').value.trim().toLowerCase();
      var password = $('#authPassword').value;

      if (!name || name.split(/\s+/).length < 2) {
        setMsg('Please enter at least two names for your full legal name.', 'error');
        return;
      }

      if (!USERNAME_RE.test(username)) {
        setMsg('Username must be 3–24 characters using letters, numbers, or underscores only.', 'error');
        return;
      }

      if (!EMAIL_RE.test(email)) {
        setMsg('Please enter a valid email address.', 'error');
        return;
      }

      if (password.length < MIN_PASSWORD) {
        setMsg('Your password must be at least ' + MIN_PASSWORD + ' characters.', 'error');
        return;
      }

      setBusy(true);

      try {
        var taken = await isUsernameTaken(username);

        if (taken) {
          setMsg('That username is already taken. Please choose another one.', 'error');
          setBusy(false);
          return;
        }

        var result = await sb.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              full_name: name,
              username: username
            },
            emailRedirectTo: baseUrl() + 'login.html'
          }
        });

        if (result.error) throw result.error;

        /* Email confirmation is enabled: no session until they confirm. */
        if (!result.data.session) {
          setMsg('Account created. Check your email to confirm your address, then log in.', 'ok');
          signupForm.reset();
          return;
        }

        /* Profile creation is handled by the database auth trigger. */
        window.location.href = 'certification.html?welcome=1';

      } catch (err) {
        setMsg(err.message || 'Unable to create your account. Please try again.', 'error');
      } finally {
        setBusy(false);
      }
    });
  }

  /* ---------- LOG IN (email + password) ---------- */
  var loginForm = $('#loginForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      var email = $('#authEmail').value.trim().toLowerCase();
      var password = $('#authPassword').value;

      if (!EMAIL_RE.test(email)) {
        setMsg('Please enter a valid email address.', 'error');
        return;
      }

      if (!password) {
        setMsg('Please enter your password.', 'error');
        return;
      }

      setBusy(true);

      try {
        var result = await sb.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (result.error) throw result.error;

        window.location.href = nextUrl();

      } catch (err) {
        var text = err.message || 'Unable to log in. Please try again.';

        if (/invalid login credentials/i.test(text)) {
          text = 'Incorrect email or password.';
        }

        if (/email not confirmed/i.test(text)) {
          text = 'Please confirm your email address first. Check your inbox for the confirmation link.';
        }

        setMsg(text, 'error');
        setBusy(false);
      }
    });
  }

  /* ---------- GOOGLE (sign up and log in) ---------- */
  var googleBtn = $('#googleBtn');

  if (googleBtn) {
    googleBtn.addEventListener('click', async function () {
      setBusy(true);

      try {
        var target = loginForm ? nextUrl() : 'certification.html?welcome=1';

        var result = await sb.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: baseUrl() + target,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account'
            }
          }
        });

        if (result.error) throw result.error;

        /* The browser now redirects to Google. */

      } catch (err) {
        setMsg(err.message || 'Google sign-in is not available yet.', 'error');
        setBusy(false);
      }
    });
  }
})();
