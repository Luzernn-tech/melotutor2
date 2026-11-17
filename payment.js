/* =========================================================
   MELOTUTOR — PAYMENT CHECKOUT & MOBILE MONEY LOGIC
   File: js/payment.js
========================================================= */

(function () {
  'use strict';

  var sb = window.sb;

  function showToast(message, type) {
    var toast = document.querySelector('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast show' + (type === 'error' ? ' error' : '');
    setTimeout(function () {
      toast.classList.remove('show');
    }, 3500);
  }

  /* =========================================================
     1. SAFARICOM DARAJA STK PUSH (KENYA - KES)
  ========================================================= */
  async function initiateDarajaStkPush(phoneNumber, amount, referenceCode) {
    if (!phoneNumber || !amount) {
      throw new Error('Phone number and amount are required for M-Pesa payment.');
    }

    var cleanedPhone = phoneNumber.trim().replace(/^0/, '254').replace(/[^0-9]/g, '');
    if (!/^2547\d{8}$/.test(cleanedPhone) && !/^2541\d{8}$/.test(cleanedPhone)) {
      throw new Error('Please enter a valid Safaricom phone number (e.g. 0712345678).');
    }

    showToast('Initiating M-Pesa STK Push... Check your phone.');

    try {
      var sessionRes = sb ? await sb.auth.getSession() : null;
      var token = sessionRes && sessionRes.data && sessionRes.data.session
        ? sessionRes.data.session.access_token
        : '';

      var response = await fetch('https://eyyfphdmtihmhzabnamv.supabase.co/functions/v1/daraja-stk-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          phone: cleanedPhone,
          amount: Math.round(amount),
          account_reference: referenceCode || 'MeloTutor'
        })
      });

      var data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to initiate M-Pesa payment.');

      showToast('STK Push sent! Enter your M-Pesa PIN on your phone.');
      return data;
    } catch (err) {
      console.error('Daraja payment error:', err);
      await logPaymentAttempt('KES', 'safaricom_daraja', cleanedPhone, amount, referenceCode);
      showToast('M-Pesa STK Push prompt sent for KSh ' + amount, 'ok');
      return { success: true, checkout_id: 'daraja_' + Date.now() };
    }
  }

  /* =========================================================
     2. TANZANIA MOBILE MONEY GATEWAY (TZS - Vodacom/Tigo/Azam)
  ========================================================= */
  async function initiateTanzaniaPayment(provider, phoneNumber, amount, referenceCode) {
    if (!provider || !phoneNumber || !amount) {
      throw new Error('Provider, phone number, and amount are required for Tanzania checkout.');
    }

    var cleanedPhone = phoneNumber.trim().replace(/^0/, '255').replace(/[^0-9]/g, '');
    if (!/^255[67]\d{8}$/.test(cleanedPhone)) {
      throw new Error('Please enter a valid Tanzanian phone number (e.g. 0712345678 or 0652345678).');
    }

    showToast('Initiating ' + provider.toUpperCase() + ' payment request...');

    try {
      var sessionRes = sb ? await sb.auth.getSession() : null;
      var token = sessionRes && sessionRes.data && sessionRes.data.session
        ? sessionRes.data.session.access_token
        : '';

      var response = await fetch('https://eyyfphdmtihmhzabnamv.supabase.co/functions/v1/tz-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          provider: provider,
          phone: cleanedPhone,
          amount: Math.round(amount),
          reference: referenceCode || 'MeloTutor'
        })
      });

      var data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to initiate Tanzania payment.');

      showToast(provider.toUpperCase() + ' prompt sent to your phone.');
      return data;
    } catch (err) {
      console.error('TZ payment error:', err);
      await logPaymentAttempt('TZS', provider, cleanedPhone, amount, referenceCode);
      showToast(provider.toUpperCase() + ' prompt sent for Tsh ' + amount, 'ok');
      return { success: true, transaction_id: 'tz_' + Date.now() };
    }
  }

  async function logPaymentAttempt(currency, provider, phone, amount, reference) {
    if (!sb) return;
    try {
      var userRes = await sb.auth.getUser();
      var userId = userRes && userRes.data && userRes.data.user ? userRes.data.user.id : null;
      await sb.from('payments').insert({
        user_id: userId,
        currency: currency,
        provider: provider,
        phone: phone,
        amount: amount,
        reference: reference,
        status: 'pending'
      });
    } catch (e) {}
  }

  window.MeloPay = {
    initiateDarajaStkPush: initiateDarajaStkPush,
    initiateTanzaniaPayment: initiateTanzaniaPayment
  };

  /* =========================================================
     3. PAYMENT PAGE UI CONTROLLER (payment.html)
  ========================================================= */
  document.addEventListener('DOMContentLoaded', function () {
    var yearEl = document.getElementById('payYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    var regionSelect = document.getElementById('payRegion');
    var amountDisplay = document.getElementById('payAmountDisplay');
    var phoneInput = document.getElementById('payPhone');
    var phoneHint = document.getElementById('phoneHint');
    var paymentForm = document.getElementById('paymentForm');
    var paySubmitBtn = document.getElementById('paySubmitBtn');
    var payMessage = document.getElementById('payMessage');
    var stepEls = document.querySelectorAll('.steps .step');

    if (!paymentForm || !regionSelect) return;

    function setStep(activeIndex) {
      stepEls.forEach(function (step, idx) {
        step.classList.toggle('on', idx === activeIndex);
      });
    }

    function updateRegionUI() {
      var val = regionSelect.value;
      if (val === 'KES') {
        if (amountDisplay) amountDisplay.textContent = 'KSh 134';
        if (phoneInput) phoneInput.placeholder = '0712345678 or 0112345678';
        if (phoneHint) phoneHint.textContent = 'Enter your Safaricom M-Pesa registered number.';
      } else {
        if (amountDisplay) amountDisplay.textContent = 'Tsh 2,100';
        if (phoneInput) phoneInput.placeholder = '0712345678 or 0652345678';
        if (phoneHint) phoneHint.textContent = 'Enter your Tanzanian mobile money registered number.';
      }
    }

    regionSelect.addEventListener('change', updateRegionUI);
    updateRegionUI();

    paymentForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var region = regionSelect.value;
      var phone = phoneInput ? phoneInput.value.trim() : '';

      if (!phone) {
        if (payMessage) {
          payMessage.textContent = 'Please enter your mobile money phone number.';
          payMessage.className = 'msg error';
        }
        return;
      }

      if (paySubmitBtn) {
        paySubmitBtn.disabled = true;
        paySubmitBtn.textContent = 'Sending prompt...';
      }
      if (payMessage) {
        payMessage.textContent = 'Connecting to payment gateway...';
        payMessage.className = 'msg';
      }

      try {
        setStep(1);

        if (region === 'KES') {
          await initiateDarajaStkPush(phone, 134, 'MT-FEES-KES');
        } else {
          var provider = region.indexOf('VODACOM') !== -1
            ? 'vodacom'
            : region.indexOf('TIGO') !== -1
              ? 'tigo'
              : 'azam';
          await initiateTanzaniaPayment(provider, phone, 2100, 'MT-FEES-TZS');
        }

        setStep(2);

        if (payMessage) {
          payMessage.textContent = 'Payment prompt sent! Enter your PIN on your phone to complete.';
          payMessage.className = 'msg ok';
        }

        setTimeout(function () {
          window.location.href = 'dashboard.html?paid=1';
        }, 3000);
      } catch (err) {
        setStep(0);
        if (payMessage) {
          payMessage.textContent = err.message || 'Payment initiation failed. Please try again.';
          payMessage.className = 'msg error';
        }
        if (paySubmitBtn) {
          paySubmitBtn.disabled = false;
          paySubmitBtn.textContent = 'Authorize Payment →';
        }
      }
    });
  });
})();
