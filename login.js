/* MeloTutor — login and password recovery */
(function () {
  'use strict';

  var sb = window.sb;

  if (!sb) {
    console.error('MeloTutor: Supabase client is not initialized.');
    var failBox = document.getElementById('authMessage');
    if (failBox) {
      failBox.textContent = 'Connection error. Please refresh the page.';
      failBox.className = 'msg error';
    }
    return;
  }

  var $ = function (selector) {
    return document.querySelector(selector);
  };

  var loginForm = $('#loginForm');
  var resetForm = $('#resetPasswordForm');
  var loginMessage = $('#authMessage');
  var resetMessage = $('#resetMessage');

  var loginBtn = $('#loginBtn');
  var googleBtn = $('#googleBtn');
  var updatePasswordBtn = $('#updatePasswordBtn');

  var MIN_PASSWORD = 6;
  var recoveryMode = false;

  $('#loginYear').textContent = new Date().getFullYear();

  function setMessage(element, message, type) {
    element.textContent = message || '';
    element.className = 'msg' + (type ? ' ' + type : '');
  }

  function setLoginBusy(busy) {
    loginBtn.disabled = busy;
    googleBtn.disabled = busy;

    loginBtn.textContent = busy ? 'Signing in…' : 'Sign In';
  }

  function getNextPage() {
    var params = new URLSearchParams(window.location.search);
    var next = params.get('next');

    /* Only allow simple local HTML page redirects. */
    if (next && /^[a-z0-9_-]+\.html$/i.test(next)) {
      return next;
    }

    return 'dashboard.html';
  }

  function goToDashboard() {
    window.location.replace(getNextPage());
  }

  /* Password-recovery links carry type=recovery. Read it from the URL itself, because the
     PASSWORD_RECOVERY event can fire before this script is listening and be missed. */
  function isRecoveryLink() {
    var original = '';

    try {
      var entries = performance.getEntriesByType('navigation');
      if (entries && entries[0]) original = entries[0].name || '';
    } catch (e) { /* ignore */ }

    return /type=recovery/.test(
      window.location.hash + ' ' + window.location.search + ' ' + original
    );
  }

  /* Google refuses sign-in inside app browsers (Instagram, Facebook, TikTok, Android WebView). */
  function isEmbeddedBrowser() {
    return /; wv\)|FBAN|FBAV|Instagram|TikTok|musical_ly|Line\//i.test(navigator.userAgent || '');
  }

  /* Make sure the account has a profile row with its email (payments are matched by email).
     Never overwrites a name or username that already exists. */
  async function ensureProfile(user) {
    if (!user) return;

    try {
      var existing = await sb
        .from('profiles')
        .select('id,email')
        .eq('id', user.id)
        .maybeSingle();

      if (existing.error) return;

      var email = (user.email || '').toLowerCase();

      if (existing.data) {
        if (!existing.data.email && email) {
          await sb.from('profiles').update({ email: email }).eq('id', user.id);
        }
        return;
      }

      var meta = user.user_metadata || {};

      await sb.from('profiles').upsert(
        {
          id: user.id,
          full_name: (meta.full_name || meta.name || '').trim(),
          email: email
        },
        { onConflict: 'id' }
      );
    } catch (e) {
      console.warn('Profile sync notice:', e.message);
    }
  }

  function showResetMode() {
    recoveryMode = true;

    loginForm.hidden = true;
    resetForm.hidden = false;
    $('#signupPrompt').hidden = true;

    $('#formTitle').textContent = 'Create a new password';
    $('#formSubtitle').textContent =
      'Choose a new password for your MeloTutor account.';
  }

  function showLoginMode() {
    recoveryMode = false;

    resetForm.hidden = true;
    loginForm.hidden = false;
    $('#signupPrompt').hidden = false;

    $('#formTitle').textContent = 'Welcome back';
    $('#formSubtitle').textContent =
      'Enter your details to sign in to MeloTutor.';
  }

  function togglePassword(inputSelector, buttonSelector) {
    var input = $(inputSelector);
    var button = $(buttonSelector);

    if (!input || !button) return;

    var visible = input.type === 'password';

    input.type = visible ? 'text' : 'password';
    button.textContent = visible ? 'Hide' : 'Show';
    button.setAttribute(
      'aria-label',
      visible ? 'Hide password' : 'Show password'
    );
  }

  /* Password visibility */
  $('#toggleLoginPw').addEventListener('click', function () {
    togglePassword('#loginPassword', '#toggleLoginPw');
  });

  $('#toggleNewPw').addEventListener('click', function () {
    togglePassword('#newPassword', '#toggleNewPw');
  });

  /* Opened from a password-recovery email: show the new-password form, do not redirect. */
  if (isRecoveryLink()) {
    showResetMode();
  }

  /* Existing session */
  sb.auth.getSession().then(async function (result) {
    if (result.error) {
      console.error(result.error);
      return;
    }

    if (result.data.session && !recoveryMode) {
      await ensureProfile(result.data.session.user);
      goToDashboard();
    }
  });

  /* Detect password recovery links */
  sb.auth.onAuthStateChange(function (event, session) {
    if (event === 'PASSWORD_RECOVERY') {
      showResetMode();
    }

    if (event === 'SIGNED_OUT') {
      showLoginMode();
    }
  });

  /* EMAIL + PASSWORD LOGIN */
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    var email = $('#loginEmail').value.trim().toLowerCase();
    var password = $('#loginPassword').value;

    if (!email || !password) {
      setMessage(loginMessage, 'Enter your email and password.', 'error');
      return;
    }

    setLoginBusy(true);
    setMessage(loginMessage, 'Verifying your account…');

    try {
      var result = await sb.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (result.error) throw result.error;

      if (!result.data.user) {
        throw new Error('Login was unsuccessful. Please try again.');
      }

      setMessage(loginMessage, 'Login successful. Opening your dashboard…', 'ok');

      await ensureProfile(result.data.user);

      goToDashboard();

    } catch (error) {
      console.error('MeloTutor login error:', error);

      setMessage(
        loginMessage,
        error.message || 'Unable to sign in. Please try again.',
        'error'
      );

      setLoginBusy(false);
    }
  });

  /* GOOGLE LOGIN */
  googleBtn.addEventListener('click', async function () {
    if (isEmbeddedBrowser()) {
      setMessage(
        loginMessage,
        'Google blocks sign-in inside this app. Open this page in Chrome or Safari, or use your email and password.',
        'error'
      );
      return;
    }

    setLoginBusy(true);
    setMessage(loginMessage, 'Connecting to Google…');

    try {
      var result = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin +
            window.location.pathname.replace(/[^/]*$/, '') +
            getNextPage(),
          queryParams: {
            prompt: 'select_account'
          }
        }
      });

      if (result.error) throw result.error;

    } catch (error) {
      console.error('MeloTutor Google login error:', error);

      setMessage(
        loginMessage,
        error.message || 'Google sign-in is currently unavailable.',
        'error'
      );

      setLoginBusy(false);
    }
  });

  /* FORGOT PASSWORD */
  $('#forgotPasswordBtn').addEventListener('click', async function () {
    var email = $('#loginEmail').value.trim().toLowerCase();

    if (!email) {
      setMessage(
        loginMessage,
        'Enter your email address first, then select Forgot password.',
        'error'
      );

      $('#loginEmail').focus();
      return;
    }

    setLoginBusy(true);
    setMessage(loginMessage, 'Sending password recovery email…');

    try {
      var redirectUrl = window.location.origin +
        window.location.pathname.replace(/[^/]*$/, '') +
        'login.html';

      var result = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      if (result.error) throw result.error;

      setMessage(
        loginMessage,
        'If an account exists for this email, a password recovery link will be sent. Check your inbox.',
        'ok'
      );

    } catch (error) {
      console.error('MeloTutor password recovery error:', error);

      setMessage(
        loginMessage,
        error.message || 'Unable to send the recovery email.',
        'error'
      );

    } finally {
      setLoginBusy(false);
    }
  });

  /* SAVE NEW PASSWORD */
  resetForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    var password = $('#newPassword').value;
    var confirmation = $('#confirmNewPassword').value;

    if (password.length < MIN_PASSWORD) {
      setMessage(
        resetMessage,
        'Your password must contain at least 6 characters.',
        'error'
      );
      return;
    }

    if (password !== confirmation) {
      setMessage(resetMessage, 'Your passwords do not match.', 'error');
      return;
    }

    updatePasswordBtn.disabled = true;
    updatePasswordBtn.textContent = 'Updating…';

    setMessage(resetMessage, 'Updating your password…');

    try {
      var result = await sb.auth.updateUser({
        password: password
      });

      if (result.error) throw result.error;

      setMessage(
        resetMessage,
        'Your password has been updated. You can now sign in.',
        'ok'
      );

      await sb.auth.signOut();
      resetForm.reset();

      setTimeout(function () {
        /* Drop the recovery token from the address so the form does not reopen. */
        window.location.href = 'login.html';
      }, 1800);

    } catch (error) {
      console.error('MeloTutor password update error:', error);

      setMessage(
        resetMessage,
        error.message || 'Unable to update your password.',
        'error'
      );

    } finally {
      updatePasswordBtn.disabled = false;
      updatePasswordBtn.textContent = 'Update Password';
    }
  });

  /* Coming back from Google with the Back button restores the page with buttons still disabled. */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) setLoginBusy(false);
  });

})();
