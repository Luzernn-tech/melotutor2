
/* =====================================================
   MELOTUTOR — SUPABASE CONFIGURATION
   File: js/config.js
===================================================== */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://eyyfphdmtihmhzabnamv.supabase.co';

  const SUPABASE_ANON_KEY =
    'sb_publishable_iFPU8j_Vru0q6Nshp92_Yg_ENP1HcGI';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('MeloTutor: Supabase library has not loaded.');
    return;
  }

  // Prevent duplicate client initialization.
  if (window.sb) {
    console.info('MeloTutor: Shared Supabase client already initialized.');
    return;
  }

  window.sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  console.info('MeloTutor: Supabase client initialized.');
})();
