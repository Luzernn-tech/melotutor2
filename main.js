/* =========================================================
   MELOTUTOR — MAIN LANDING PAGE SCRIPT
   File: js/main.js
========================================================= */

(function () {
  'use strict';

  const sb = window.sb;

  /* A date N days from today, formatted for display. */
  function futureDate(days) {
    const d = new Date(Date.now() + days * 86400000);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  /* 30 Unique Learner Requests Catalogue Data */
  const learnersData = [
    {
      id: 'req_01',
      code: '#MT-8492',
      name: 'Dr. Elena Rostova',
      country: '🇺🇸 United States',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      level: 'business',
      levelName: 'Business & NGO',
      goal: 'Preparing for diplomatic missions and NGO community deployments in East Africa. Needs professional Swahili vocabulary and formal greetings.',
      checklist: ['Formal correspondence vocabulary', 'NGO sector terminology', 'Diplomatic protocols & greetings'],
      payoutUsd: 28,
      slotsLeft: 2,
      postedDate: '2 hours ago',
      startDate: futureDate(7)
    },
    {
      id: 'req_02',
      code: '#MT-7310',
      name: 'Marcus Lindqvist',
      country: '🇸🇪 Sweden',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      level: 'intermediate',
      levelName: 'Intermediate',
      goal: 'Conversational fluency for upcoming tech hub relocation to Nairobi. Focus on natural phrasing and slang.',
      checklist: ['Colloquial Nairobi slang & tone', 'Market negotiation practice', 'Advanced sentence structures'],
      payoutUsd: 22,
      slotsLeft: 4,
      postedDate: '3 hours ago',
      startDate: futureDate(10)
    },
    {
      id: 'req_03',
      code: '#MT-6219',
      name: 'Aisha Al-Mansoor',
      country: '🇦🇪 UAE',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      level: 'beginner',
      levelName: 'Beginner',
      goal: 'Absolute beginner looking for structured grammar foundations, noun classes, and pronunciation guides.',
      checklist: ['Swahili noun class system', 'Core vowel & consonant sounds', 'Essential daily greetings'],
      payoutUsd: 18,
      slotsLeft: 1,
      postedDate: '4 hours ago',
      startDate: futureDate(14)
    },
    {
      id: 'req_04',
      code: '#MT-5184',
      name: 'Liam O’Connor',
      country: '🇮🇪 Ireland',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      level: 'advanced',
      levelName: 'Advanced',
      goal: 'Swahili literature analysis and coastal dialect nuances (Kiunguja vs Kimvita).',
      checklist: ['Coastal dialect comparison', 'Classical Swahili poetry reading', 'Advanced composition review'],
      payoutUsd: 25,
      slotsLeft: 3,
      postedDate: '5 hours ago',
      startDate: futureDate(18)
    },
    {
      id: 'req_05',
      code: '#MT-4290',
      name: 'Sophie Bernard',
      country: '🇫🇷 France',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      level: 'beginner',
      levelName: 'Beginner',
      goal: 'Preparing for a coastal vacation in Zanzibar. Wants practical travel phrases, market negotiation, and polite requests.',
      checklist: ['Zanzibar travel vocabulary', 'Market bargaining phrases', 'Polite daily expressions'],
      payoutUsd: 19,
      slotsLeft: 3,
      postedDate: '6 hours ago',
      startDate: futureDate(5)
    },
    {
      id: 'req_06',
      code: '#MT-3105',
      name: 'Kenji Takahashi',
      country: '🇯🇵 Japan',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80',
      level: 'intermediate',
      levelName: 'Intermediate',
      goal: 'Wildlife conservation research coordination. Needs professional ecological and community liaison terminology.',
      checklist: ['Wildlife & conservation vocabulary', 'Community meeting facilitation', 'Reporting terminology'],
      payoutUsd: 24,
      slotsLeft: 2,
      postedDate: '7 hours ago',
      startDate: futureDate(8)
    },
    {
      id: 'req_07',
      code: '#MT-2981',
      name: 'Chloe van der Berg',
      country: '🇳🇱 Netherlands',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      level: 'business',
      levelName: 'Business & NGO',
      goal: 'Corporate banking and micro-finance advisory sessions. Focus on financial terminology and professional etiquette.',
      checklist: ['Banking & financial Swahili', 'Formal contract vocabulary', 'Client advisory phrasing'],
      payoutUsd: 27,
      slotsLeft: 1,
      postedDate: '8 hours ago',
      startDate: futureDate(12)
    },
    {
      id: 'req_08',
      code: '#MT-1543',
      name: 'David Jerome',
      country: '🇬🇧 United Kingdom',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
      level: 'advanced',
      levelName: 'Advanced',
      goal: 'Heritage reconnection and fluency refinement. Focus on complex sentence structuring and cultural idioms.',
      checklist: ['Cultural proverbs & idioms', 'Advanced syntax structuring', 'Fluent debate practice'],
      payoutUsd: 26,
      slotsLeft: 4,
      postedDate: '9 hours ago',
      startDate: futureDate(15)
    },
    {
      id: 'req_09',
      code: '#MT-9921',
      name: 'Beatriz Silva',
      country: '🇧🇷 Brazil',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
      level: 'beginner',
      levelName: 'Beginner',
      goal: 'Passionate about East African music and culture. Looking to understand lyrics and traditional storytelling.',
      checklist: ['Musical terminology', 'Traditional expressions', 'Song lyric translation'],
      payoutUsd: 17,
      slotsLeft: 2,
      postedDate: '10 hours ago',
      startDate: futureDate(6)
    },
    {
      id: 'req_10',
      code: '#MT-8843',
      name: 'Matthias Weber',
      country: '🇩🇪 Germany',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
      level: 'intermediate',
      levelName: 'Intermediate',
      goal: 'Renewable energy infrastructure project manager. Needs technical terminology for solar and wind farm developments.',
      checklist: ['Engineering vocabulary', 'Site supervision dialogue', 'Safety instructions'],
      payoutUsd: 23,
      slotsLeft: 3,
      postedDate: '11 hours ago',
      startDate: futureDate(9)
    },
    {
      id: 'req_11',
      code: '#MT-7762',
      name: 'Fatima Al-Hassan',
      country: '🇶🇦 Qatar',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80',
      level: 'business',
      levelName: 'Business & NGO',
      goal: 'Real estate investment and hospitality consultancy across coastal East Africa.',
      checklist: ['Property negotiation terms', 'Hospitality management phrases', 'Formal contract drafting'],
      payoutUsd: 29,
      slotsLeft: 1,
      postedDate: '12 hours ago',
      startDate: futureDate(11)
    },
    {
      id: 'req_12',
      code: '#MT-6650',
      name: 'Oliver Thorne',
      country: '🇦🇺 Australia',
      avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=200&q=80',
      level: 'beginner',
      levelName: 'Beginner',
      goal: 'Mount Kilimanjaro expedition preparation. Needs mountain camp communication and emergency terms.',
      checklist: ['Mountain expedition terms', 'Basic health & safety phrases', 'Guide coordination'],
      payoutUsd: 18,
      slotsLeft: 5,
      postedDate: '13 hours ago',
      startDate: futureDate(14)
    },
    {
      id: 'req_13',
      code: '#MT-5541',
      name: 'Yuki Tanaka',
      country: '🇯🇵 Japan',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      level: 'intermediate',
      levelName: 'Intermediate',
      goal: 'Agricultural development researcher focusing on sustainable farming practices in rural communities.',
      checklist: ['Farming & crop terminology', 'Rural community outreach', 'Cooperative meetings'],
      payoutUsd: 21,
      slotsLeft: 2,
      postedDate: '14 hours ago',
      startDate: futureDate(16)
    },
    {
      id: 'req_14',
      code: '#MT-4432',
      name: 'Clara Dupont',
      country: '🇫🇷 France',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      level: 'advanced',
      levelName: 'Advanced',
      goal: 'Journalistic reporting and documentary script reviews in Swahili media circles.',
      checklist: ['Media & broadcasting terms', 'Political discourse analysis', 'Interview execution'],
      payoutUsd: 26,
      slotsLeft: 3,
      postedDate: '15 hours ago',
      startDate: futureDate(20)
    },
    {
      id: 'req_15',
      code: '#MT-3321',
      name: 'Sven Johansen',
      country: '🇳🇴 Norway',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      level: 'beginner',
      levelName: 'Beginner',
      goal: 'Marine biology research assistant focusing on coral reef preservation along the Indian Ocean coast.',
      checklist: ['Marine life vocabulary', 'Dredging & diving terminology', 'Local fisherman interviews'],
      payoutUsd: 19,
      slotsLeft: 4,
      postedDate: '16 hours ago',
      startDate: futureDate(13)
    },
    {
      id: 'req_16',
      code: '#MT-2210',
      name: 'Amara Diallo',
      country: '🇸🇳 Senegal',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      level: 'business',
      levelName: 'Business & NGO',
      goal: 'Pan-African trade policy advocate requiring high-level economic negotiation vocabulary.',
      checklist: ['Trade agreements', 'Economic policy phrasing', 'Multilateral diplomacy'],
      payoutUsd: 30,
      slotsLeft: 1,
      postedDate: '17 hours ago',
      startDate: futureDate(22)
    },
    {
      id: 'req_17',
      code: '#MT-1109',
      name: 'Giannis Papadopoulos',
      country: '🇬🇷 Greece',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
      level: 'intermediate',
      levelName: 'Intermediate',
      goal: 'Shipping and maritime logistics coordinator at East African ports.',
      checklist: ['Port operations terminology', 'Cargo handling instructions', 'Customs clearance dialogue'],
      payoutUsd: 22,
      slotsLeft: 2,
      postedDate: '18 hours ago',
      startDate: futureDate(19)
    },
    {
      id: 'req_18',
      code: '#MT-9998',
      name: 'Mei-Ling Zhou',
      country: '🇹🇼 Taiwan',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
      level: 'beginner',
      levelName: 'Beginner',
      goal: 'Infrastructure project supply chain analyst needing day-to-day conversational competence.',
      checklist: ['Supply chain terminology', 'Daily office communication', 'Inventory tracking terms'],
      payoutUsd: 17,
      slotsLeft: 3,
      postedDate: '19 hours ago',
      startDate: futureDate(7)
    },
    {
      id: 'req_19',
      code: '#MT-8887',
      name: 'Hans Gruber',
      country: '🇦🇹 Austria',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
      level: 'advanced',
      levelName: 'Advanced',
      goal: 'Translating European classical literature and educational textbooks into Swahili.',
      checklist: ['Literary translation', 'Academic syntax', 'Pedagogical terminology'],
      payoutUsd: 27,
      slotsLeft: 2,
      postedDate: '20 hours ago',
      startDate: futureDate(25)
    },
    {
      id: 'req_20',
      code: '#MT-7776',
      name: 'Zara Patel',
      country: '🇮🇳 India',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      level: 'business',
      levelName: 'Business & NGO',
      goal: 'Pharmaceutical supply and healthcare distribution operations across East Africa.',
      checklist: ['Medical distribution terms', 'Regulatory compliance', 'Wholesale negotiations'],
      payoutUsd: 28,
      slotsLeft: 1,
      postedDate: '21 hours ago',
      startDate: futureDate(10)
    },
    {
      id: 'req_21',
      code: '#MT-6665',
      name: 'Mateo Fernandez',
      country: '🇦🇷 Argentina',
      avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=200&q=80',
      level: 'intermediate',
      levelName: 'Intermediate',
      goal: 'Coffee and tea export trade coordination with local cooperative farms.',
      checklist: ['Agricultural grading terms', 'Cooperative pricing dialogue', 'Export logistics'],
      payoutUsd: 23,
      slotsLeft: 4,
      postedDate: '22 hours ago',
      startDate: futureDate(12)
    },
    {
      id: 'req_22',
      code: '#MT-5554',
      name: 'Kirsty MacLeod',
      country: '🇬🇧 United Kingdom',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      level: 'beginner',
      levelName: 'Beginner',
      goal: 'Archaeological excavation field team member working in the Rift Valley.',
      checklist: ['Excavation tools vocabulary', 'Camp coordination', 'Local community interactions'],
      payoutUsd: 18,
      slotsLeft: 3,
      postedDate: '23 hours ago',
      startDate: futureDate(15)
    },
    {
      id: 'req_23',
      code: '#MT-4443',
      name: 'Ibrahim Touré',
      country: '🇨🇮 Cote d’Ivoire',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80',
      level: 'advanced',
      levelName: 'Advanced',
      goal: 'Telecommunications network rollout strategy and governmental licensing discussions.',
      checklist: ['Telecom regulatory terminology', 'Technical negotiations', 'Government briefing format'],
      payoutUsd: 29,
      slotsLeft: 2,
      postedDate: '1 day ago',
      startDate: futureDate(21)
    },
    {
      id: 'req_24',
      code: '#MT-3332',
      name: 'Evelyn Wright',
      country: '🇨🇦 Canada',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      level: 'intermediate',
      levelName: 'Intermediate',
      goal: 'Wildlife veterinary medicine coordination and field rescue operations.',
      checklist: ['Veterinary terminology', 'Emergency field communication', 'Animal welfare advocacy'],
      payoutUsd: 24,
      slotsLeft: 2,
      postedDate: '1 day ago',
      startDate: futureDate(16)
    },
    {
      id: 'req_25',
      code: '#MT-2221',
      name: 'Dmitri Sokolov',
      country: '🇷🇺 Russia',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      level: 'beginner',
      levelName: 'Beginner',
      goal: 'Mining exploration safety inspection and operational compliance reporting.',
      checklist: ['Mining safety vocabulary', 'Inspection protocols', 'Equipment terminology'],
      payoutUsd: 20,
      slotsLeft: 3,
      postedDate: '1 day ago',
      startDate: futureDate(11)
    },
    {
      id: 'req_26',
      code: '#MT-1110',
      name: 'Nadia Benali',
      country: '🇲🇦 Morocco',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      level: 'business',
      levelName: 'Business & NGO',
      goal: 'Fintech partnership development and mobile money platform integration.',
      checklist: ['Digital payments vocabulary', 'API integration discussion', 'Merchant onboarding'],
      payoutUsd: 27,
      slotsLeft: 1,
      postedDate: '1 day ago',
      startDate: futureDate(9)
    },
    {
      id: 'req_27',
      code: '#MT-0999',
      name: 'Jarkko Nieminen',
      country: '🇫🇮 Finland',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      level: 'intermediate',
      levelName: 'Intermediate',
      goal: 'Vocational education training curriculum design for technical schools.',
      checklist: ['Vocational training terms', 'Classroom instruction phrasing', 'Assessment terminology'],
      payoutUsd: 22,
      slotsLeft: 4,
      postedDate: '1 day ago',
      startDate: futureDate(17)
    },
    {
      id: 'req_28',
      code: '#MT-0888',
      name: 'Carmen Ortiz',
      country: '🇪🇸 Spain',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      level: 'beginner',
      levelName: 'Beginner',
      goal: 'Humanitarian aid distribution logistics and community welfare assessment.',
      checklist: ['Humanitarian aid terms', 'Needs assessment dialogue', 'Distribution center coordination'],
      payoutUsd: 18,
      slotsLeft: 2,
      postedDate: '1 day ago',
      startDate: futureDate(8)
    },
    {
      id: 'req_29',
      code: '#MT-0777',
      name: 'Sung-Min Park',
      country: '🇰🇷 South Korea',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80',
      level: 'advanced',
      levelName: 'Advanced',
      goal: 'Smart city infrastructure planning and digital governance development.',
      checklist: ['Urban planning vocabulary', 'Smart city tech terms', 'Government committee reporting'],
      payoutUsd: 30,
      slotsLeft: 1,
      postedDate: '1 day ago',
      startDate: futureDate(24)
    },
    {
      id: 'req_30',
      code: '#MT-0666',
      name: 'Astrid Lindgren',
      country: '🇸🇪 Sweden',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
      level: 'intermediate',
      levelName: 'Intermediate',
      goal: 'Children book illustration publishing and cultural folklore preservation.',
      checklist: ['Folklore narration structure', 'Publishing industry terms', 'Creative storytelling phrasing'],
      payoutUsd: 21,
      slotsLeft: 3,
      postedDate: '1 day ago',
      startDate: futureDate(13)
    }
  ];

  /* Application State */
  let currentCurrency = 'USD';
  let currentLevel = 'all';
  let currentSort = 'featured';
  let searchQuery = '';
  let shortlist = JSON.parse(localStorage.getItem('mt_shortlist') || '[]');
  let activeLearner = null;

  /* Currency conversion rates and symbols */
  const currencyConfig = {
    USD: {
      symbol: 'USD ($)',
      rate: 1,
      code: '$',
      decimals: 2,
      heroRange: '$16–$28'
    },
    KES: {
      symbol: 'KES (KSh)',
      rate: 130,
      code: 'KSh ',
      decimals: 0,
      heroRange: 'KSh 2,080–3,640'
    },
    TZS: {
      symbol: 'TZS (Tsh)',
      rate: 2645,
      code: 'Tsh ',
      decimals: 0,
      heroRange: 'Tsh 42,320–74,060'
    }
  };

  const CERTIFICATE_FEE_USD = 1;

  /* Escape text from the database before it goes into the page. */
  function escHtml(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* =========================================================
     LIVE LEARNER REQUESTS (from the database)
     The built-in list below is only a safety net, used if the database
     cannot be reached (for example before the SQL update has been run).
  ========================================================= */
  const builtInLearners = learnersData.slice();
  let catalogueLoading = true;
  const LEVEL_NAMES = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', business: 'Business & NGO' };

  function levelKeyOf(r) {
    const c = String(r.category || '').toLowerCase();
    if (LEVEL_NAMES[c]) return c;
    const l = String(r.level || '').toLowerCase();
    if (l.indexOf('business') > -1 || l.indexOf('ngo') > -1) return 'business';
    if (l.indexOf('advanced') > -1) return 'advanced';
    if (l.indexOf('inter') > -1) return 'intermediate';
    return 'beginner';
  }

  function initialsAvatar(name) {
    const parts = String(name || 'L').trim().split(/\s+/).filter(Boolean);
    const ini = ((parts[0] || 'L')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    const hue = Array.from(String(name || '')).reduce(function (h, ch) { return (h * 31 + ch.charCodeAt(0)) % 360; }, 40);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="hsl(' + hue + ',70%,62%)"/><stop offset="1" stop-color="hsl(' + ((hue + 50) % 360) + ',65%,38%)"/></linearGradient></defs>' +
      '<rect width="200" height="200" fill="url(#g)"/><text x="100" y="124" font-family="Arial,sans-serif" font-size="78" font-weight="700" fill="#fff" text-anchor="middle">' +
      ini.replace(/[<>&]/g, '') + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function timeAgoText(iso) {
    const t = new Date(iso).getTime();
    if (!t) return 'Recently';
    const m = Math.max(1, Math.round((Date.now() - t) / 60000));
    if (m < 60) return m + ' minute' + (m === 1 ? '' : 's') + ' ago';
    const h = Math.round(m / 60);
    if (h < 24) return h + ' hour' + (h === 1 ? '' : 's') + ' ago';
    const d = Math.round(h / 24);
    return d + ' day' + (d === 1 ? '' : 's') + ' ago';
  }

  function mapLiveLearner(r) {
    const id = String(r.id);
    const key = levelKeyOf(r);
    const levelName = r.level || LEVEL_NAMES[key];
    const name = r.learner_display_name || 'Learner';
    const kes = Number(r.payout_kes) || 0;
    const checklist = [];
    if (r.schedule_text) checklist.push('Schedule: ' + r.schedule_text);
    checklist.push('Session length: ' + (Number(r.duration_minutes) || 60) + ' minutes');
    checklist.push('Level: ' + levelName);
    return {
      id: 'db_' + id,
      code: '#MT-' + id.replace(/-/g, '').slice(0, 8).toUpperCase(),
      name: name,
      country: r.country || 'Worldwide',
      avatar: initialsAvatar(name),
      level: key,
      levelName: levelName,
      goal: r.goal || 'Swahili lessons.',
      checklist: checklist,
      payoutKes: kes,
      /* worked out from KES with today's rates, so the price is right in USD, KES and TZS */
      get payoutUsd() { return kes / currencyConfig.KES.rate; },
      slotsLeft: Number(r.slots_available) || 1,
      postedDate: timeAgoText(r.posted_at),
      startDate: r.schedule_text || futureDate(7)
    };
  }

  /* true = the list now comes from the database; false = could not reach it */
  async function loadLiveLearners() {
    if (!sb) return false;
    try {
      const res = await Promise.race([
        sb.rpc('public_learner_requests'),
        new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 7000); })
      ]);
      if (!res || res.error || !Array.isArray(res.data)) return false;
      const rows = res.data
        .filter(function (r) { return r.slots_available == null || Number(r.slots_available) > 0; })
        .map(mapLiveLearner);
      learnersData.splice(0, learnersData.length, ...rows);
      return true;
    } catch (e) {
      console.warn('MeloTutor: live learner list unavailable.', e && e.message);
      return false;
    }
  }

  async function refreshLearners(first) {
    const ok = await loadLiveLearners();
    if (!ok && first) learnersData.splice(0, learnersData.length, ...builtInLearners);
    if (ok || first) {
      catalogueLoading = false;
      renderCatalogue();
      updateShortlistBadge();
      updateShortlistDrawer();
    }
  }

  /* DOM Helpers */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  function init() {
    setupYear();
    setupNavigation();
    setupCurrencyDropdown();
    setupCatalogue();
    setupCertificatePreview();
    setupEarningsPlanner();
    setupModals();
    setupSupportDock();
    setupNudge();
    loadExchangeRates();
  }

  function setupYear() {
    const yr = new Date().getFullYear();
    if ($('#year')) $('#year').textContent = yr;
    if ($('#certYearSpan')) $('#certYearSpan').textContent = yr;
  }

  /* =========================================================
     CURRENCY CONVERSION
  ========================================================= */

  function formatCurrency(amount, currency) {
    const cfg = currencyConfig[currency];

    return `${cfg.code}${Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: cfg.decimals,
      maximumFractionDigits: cfg.decimals
    })}`;
  }

  function formatPrice(usdAmount) {
    const cfg = currencyConfig[currentCurrency];
    return formatCurrency(usdAmount * cfg.rate, currentCurrency);
  }

  function updateCertificateFee() {
    const feeDisplay = $('#feePriceDisplay');
    if (!feeDisplay) return;

    feeDisplay.innerHTML =
      `${formatPrice(CERTIFICATE_FEE_USD)} ` +
      `<span style="font-size:13px;font-weight:500;color:var(--muted)">certificate fee</span>`;
  }

  function refreshCurrencyDisplays() {
    const cfg = currencyConfig[currentCurrency];

    if ($('#currSymbolBadge')) {
      $('#currSymbolBadge').textContent = cfg.symbol;
    }

    $$('.currency-option').forEach(opt => {
      opt.classList.toggle(
        'active',
        opt.getAttribute('data-curr') === currentCurrency
      );
    });

    if ($('#heroRateUsd')) {
      $('#heroRateUsd').textContent =
        `${formatPrice(16)}–${formatPrice(28)}`;
    }

    updateCertificateFee();
    updateEstimatorRate();

    if ($('#sessRange')) {
      $('#sessRange').dispatchEvent(new Event('input'));
    }

    renderCatalogue();
    updateShortlistDrawer();
  }

  async function loadExchangeRates() {
    try {
      const response = await fetch(
        'https://open.er-api.com/v6/latest/USD'
      );

      if (!response.ok) {
        throw new Error('Exchange rate request failed');
      }

      const data = await response.json();

      if (data.result !== 'success' || !data.rates) {
        throw new Error('Exchange rate data unavailable');
      }

      if (
        Number.isFinite(data.rates.KES) &&
        data.rates.KES > 0
      ) {
        currencyConfig.KES.rate = data.rates.KES;
      }

      if (
        Number.isFinite(data.rates.TZS) &&
        data.rates.TZS > 0
      ) {
        currencyConfig.TZS.rate = data.rates.TZS;
      }

      refreshCurrencyDisplays();

    } catch (error) {
      console.warn('Exchange rate update unavailable.');
    }
  }

  /* =========================================================
     TOP BAR, SMOOTH SCROLL & SIDEBAR
  ========================================================= */

  function setupNavigation() {
    const toggleBtn = $('#menuToggleBtn');
    const closeBtn = $('#closeSidebarBtn');
    const sidebarBg = $('#siteSidebarBg');

    function openSidebar() {
      if (!sidebarBg) return;

      sidebarBg.hidden = false;

      requestAnimationFrame(() => {
        sidebarBg.classList.add('open');
      });

      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'true');
      }

      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      if (!sidebarBg) return;

      sidebarBg.classList.remove('open');

      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'false');
      }

      document.body.style.overflow = '';

      setTimeout(() => {
        if (!sidebarBg.classList.contains('open')) {
          sidebarBg.hidden = true;
        }
      }, 320);
    }

    if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

    if (sidebarBg) {
      sidebarBg.addEventListener('click', (e) => {
        if (e.target === sidebarBg) closeSidebar();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (sidebarBg && !sidebarBg.hidden) closeSidebar();

        const briefModal = $('#briefModal');
        const faqModal = $('#faqModal');
        const termsModal = $('#termsModal');
        const drawerBg = $('#drawerBg');

        if (briefModal && !briefModal.hidden) briefModal.hidden = true;
        if (faqModal && !faqModal.hidden) faqModal.hidden = true;
        if (termsModal && !termsModal.hidden) termsModal.hidden = true;
        if (drawerBg && !drawerBg.hidden) drawerBg.hidden = true;
      }
    });

    $$('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');

        if (!href || href === '#') return;

        const target = $(href);

        if (target) {
          e.preventDefault();
          closeSidebar();

          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });

    const openTermsModal = () => {
      closeSidebar();

      const termsModal = $('#termsModal');
      if (termsModal) termsModal.hidden = false;
    };

    $('#navTermsBtn')?.addEventListener('click', openTermsModal);
    $('#sidebarTermsBtn')?.addEventListener('click', openTermsModal);
    $('#footerTermsBtn')?.addEventListener('click', openTermsModal);
  }

  /* =========================================================
     CURRENCY DROPDOWN
  ========================================================= */

  function setupCurrencyDropdown() {
    const trigger = $('#currencyTrigger');
    const menu = $('#currencyMenu');
    const wrap = $('#currencyDropdownWrap');

    if (!trigger || !menu) return;

    function applyCurrency(curr) {
      if (!currencyConfig[curr]) return;

      currentCurrency = curr;
      refreshCurrencyDisplays();
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();

      const isOpen = !menu.hidden;
      menu.hidden = isOpen;

      trigger.setAttribute(
        'aria-expanded',
        isOpen ? 'false' : 'true'
      );
    });

    document.addEventListener('click', (e) => {
      if (wrap && !wrap.contains(e.target)) {
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    $$('.currency-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.getAttribute('data-curr');

        applyCurrency(selected);

        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      });
    });

    const hintSwitch = $('#hintSwitchBtn');

    if (hintSwitch) {
      hintSwitch.addEventListener('click', () => {
        const next =
          currentCurrency === 'USD'
            ? 'KES'
            : currentCurrency === 'KES'
              ? 'TZS'
              : 'USD';

        applyCurrency(next);
      });
    }

    refreshCurrencyDisplays();
  }

  /* =========================================================
     LEARNER REQUESTS CATALOGUE & FILTERING
  ========================================================= */

  function setupCatalogue() {
    const searchInput = $('#searchInput');
    const sortSelect = $('#sortSelect');
    const resetBtn = $('#resetBtn');
    const levelChips = $$('#levelFilters .fchip');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderCatalogue();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderCatalogue();
      });
    }

    levelChips.forEach(chip => {
      chip.addEventListener('click', () => {
        levelChips.forEach(c => c.classList.remove('on'));

        chip.classList.add('on');
        currentLevel = chip.getAttribute('data-level');

        renderCatalogue();
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        searchQuery = '';
        currentLevel = 'all';
        currentSort = 'featured';

        if (searchInput) searchInput.value = '';
        if (sortSelect) sortSelect.value = 'featured';

        levelChips.forEach(c => {
          c.classList.toggle(
            'on',
            c.getAttribute('data-level') === 'all'
          );
        });

        renderCatalogue();
      });
    }

    renderCatalogue();                       /* shows "Loading…" until the database answers */
    refreshLearners(true);
    setInterval(function () { refreshLearners(false); }, 90000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshLearners(false); });
  }

  function renderCatalogue() {
    const grid = $('#learnerGrid');
    const emptyBox = $('#learnerEmpty');
    const resultCount = $('#resultCount');
    const resetBtn = $('#resetBtn');

    if (!grid) return;

    if (catalogueLoading) {
      grid.innerHTML = '<div class="card empty" style="grid-column:1/-1">Loading learner requests…</div>';
      if (resultCount) resultCount.textContent = 'Loading learner requests…';
      if (emptyBox) emptyBox.hidden = true;
      return;
    }

    let filtered = learnersData.filter(item => {
      const matchLevel =
        currentLevel === 'all' || item.level === currentLevel;

      const matchSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery) ||
        item.country.toLowerCase().includes(searchQuery) ||
        item.goal.toLowerCase().includes(searchQuery) ||
        item.levelName.toLowerCase().includes(searchQuery) ||
        item.code.toLowerCase().includes(searchQuery);

      return matchLevel && matchSearch;
    });

    if (currentSort === 'payout-desc') {
      filtered.sort((a, b) => b.payoutUsd - a.payoutUsd);
    } else if (currentSort === 'slots-asc') {
      filtered.sort((a, b) => a.slotsLeft - b.slotsLeft);
    }

    const totalMatching = filtered.length;
    // Show only the first 8 items on the public landing page
    const visibleItems = filtered.slice(0, 8);

    if (resultCount) {
      resultCount.textContent = `Showing ${visibleItems.length} of ${totalMatching} new learner requests today`;
    }

    if (resetBtn) {
      resetBtn.hidden =
        currentLevel === 'all' &&
        !searchQuery &&
        currentSort === 'featured';
    }

    if (totalMatching === 0) {
      grid.innerHTML = '';
      if (emptyBox) {
        emptyBox.textContent = learnersData.length === 0
          ? 'No open learner requests right now. New ones are posted often, so check back soon.'
          : 'No matching learner requests found. Try adjusting your search or filters.';
        emptyBox.hidden = false;
      }
      
      const existingLockWrap = $('#lockWallWrap');
      if (existingLockWrap) existingLockWrap.remove();
      return;
    }

    if (emptyBox) emptyBox.hidden = true;

    grid.innerHTML = visibleItems.map(item => {
      const isSaved = shortlist.includes(item.id);

      return `
        <article class="card learner">
          <div class="l-top">
            <div class="av-img">
              <img src="${escHtml(item.avatar)}" alt="${escHtml(item.name)}" loading="lazy">
            </div>
            <div class="l-id">
              <strong>${escHtml(item.name)}</strong>
              <small>${escHtml(item.country)}</small>
            </div>
            <button type="button" class="save-btn ${isSaved ? 'saved' : ''}"
              data-id="${item.id}"
              aria-label="${isSaved ? 'Remove from shortlist' : 'Save to shortlist'}">
              ${isSaved ? '★' : '☆'}
            </button>
          </div>

          <div class="tag-row">
            <span class="tag">${escHtml(item.levelName)}</span>
            <span class="code-tag">${escHtml(item.code)}</span>
          </div>

          <p class="goal">${escHtml(item.goal)}</p>

          <div class="l-pay">
            <div>
              <div class="amount">
                ${formatPrice(item.payoutUsd)}
                <small>/ 60 min</small>
              </div>
              <div class="slots-left">
                ● ${item.slotsLeft} slot${item.slotsLeft > 1 ? 's' : ''} remaining
              </div>
            </div>

            <button type="button" class="btn sm brief-trigger"
              data-id="${item.id}">
              View Brief &amp; Apply
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Handle gate banner for remaining hidden requests
    let lockWallWrap = $('#lockWallWrap');
    if (totalMatching > 8) {
      if (!lockWallWrap) {
        lockWallWrap = document.createElement('div');
        lockWallWrap.id = 'lockWallWrap';
        lockWallWrap.style.cssText = 'grid-column: 1 / -1; text-align: center; background: var(--input); border: 1px solid var(--line2); padding: 32px 20px; border-radius: 16px; margin-top: 10px;';
        grid.parentNode.insertBefore(lockWallWrap, grid.nextSibling);
      }
      lockWallWrap.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 8px;">🔒</div>
        <h3 style="font-size: 18px; margin-bottom: 6px; color: var(--text);">Want to unlock all ${totalMatching} learner requests?</h3>
        <p style="font-size: 13.5px; color: var(--muted); max-width: 460px; margin: 0 auto 16px;">Create a tutor account or sign in to browse the full directory, bookmark briefs, and reserve your teaching slots.</p>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <a class="btn sm" href="signup">Create a tutor account →</a>
          <a class="btn ghost sm" href="login">Sign in</a>
        </div>
      `;
    } else {
      if (lockWallWrap) lockWallWrap.remove();
    }

    grid.querySelectorAll('.save-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleShortlist(btn.getAttribute('data-id'));
      });
    });

    grid.querySelectorAll('.brief-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        openBriefModal(btn.getAttribute('data-id'));
      });
    });
  }

  /* =========================================================
     SHORTLIST & DRAWER
  ========================================================= */

  function toggleShortlist(id) {
    const index = shortlist.indexOf(id);

    if (index > -1) {
      shortlist.splice(index, 1);
      showToast('Removed from your shortlist');
    } else {
      shortlist.push(id);
      showToast('Saved to your shortlist ★');
    }

    localStorage.setItem(
      'mt_shortlist',
      JSON.stringify(shortlist)
    );

    renderCatalogue();
    updateShortlistBadge();
    updateShortlistDrawer();

    if (activeLearner && activeLearner.id === id) {
      const mSaveBtn = $('#mSaveBtn');

      if (mSaveBtn) {
        const isSaved = shortlist.includes(id);

        mSaveBtn.textContent = isSaved
          ? '★ Saved to shortlist'
          : '☆ Save to shortlist';
      }
    }
  }

  function updateShortlistBadge() {
    const badge = $('#savedCount');

    if (badge) badge.textContent = shortlist.length;
  }

  function setupShortlistDrawer() {
    const openBtn = $('#openDrawerBtn');
    const closeBtn = $('#closeDrawerBtn');
    const drawerBg = $('#drawerBg');

    function toggleDrawer(open) {
      if (!drawerBg) return;

      drawerBg.hidden = !open;

      if (open) updateShortlistDrawer();
    }

    if (openBtn) {
      openBtn.addEventListener('click', () => toggleDrawer(true));
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => toggleDrawer(false));
    }

    if (drawerBg) {
      drawerBg.addEventListener('click', (e) => {
        if (e.target === drawerBg) toggleDrawer(false);
      });
    }

    updateShortlistBadge();
  }

  function updateShortlistDrawer() {
    const listContainer = $('#drawerList');
    const totalEl = $('#drawerTotal');

    if (!listContainer) return;

    const savedItems = learnersData.filter(
      i => shortlist.includes(i.id)
    );

    if (savedItems.length === 0) {
      listContainer.innerHTML =
        '<p style="color:var(--muted);font-size:13px;text-align:center;padding:24px 12px">No saved requests yet. Select the star icon on any learner card to bookmark it.</p>';

      if (totalEl) totalEl.textContent = formatPrice(0);
      return;
    }

    let totalUsd = 0;

    listContainer.innerHTML = savedItems.map(item => {
      totalUsd += item.payoutUsd;

      return `
        <div class="d-item">
          <div class="av-img" style="width:38px;height:38px">
            <img src="${escHtml(item.avatar)}" alt="${escHtml(item.name)}">
          </div>

          <div style="flex:1;min-width:0">
            <strong style="font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${escHtml(item.name)}
            </strong>
            <small style="color:var(--gold);font-size:11.5px">
              ${formatPrice(item.payoutUsd)} / hr · ${escHtml(item.levelName)}
            </small>
          </div>

          <button type="button" class="m-close remove-saved"
            data-id="${item.id}" aria-label="Remove item"
            style="width:28px;height:28px;font-size:12px">
            ✕
          </button>
        </div>
      `;
    }).join('');

    if (totalEl) {
      totalEl.textContent = formatPrice(totalUsd);
    }

    listContainer.querySelectorAll('.remove-saved').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleShortlist(btn.getAttribute('data-id'));
      });
    });
  }

  /* =========================================================
     CERTIFICATE LIVE PREVIEW
  ========================================================= */

  function setupCertificatePreview() {
    const input = $('#certInputName');
    const renderSlot = $('#certRenderName');

    if (input && renderSlot) {
      input.addEventListener('input', (e) => {
        const val = e.target.value.trim();

        renderSlot.textContent = val || 'Your Name Here';
      });
    }
  }

  /* =========================================================
     WEEKLY EARNINGS PLANNER
  ========================================================= */

  function setupEarningsPlanner() {
    const range = $('#sessRange');
    const sessLabel = $('#sessLabel');
    const hrsOut = $('#hrsOut');
    const usdOut = $('#usdOut');

    if (!range) return;

    function updatePlanner() {
      const sessions = parseInt(range.value, 10);
      const hours = sessions * 1.0;
      const weeklyUsd = sessions * 20;

      if (sessLabel) {
        sessLabel.textContent =
          `${sessions} session${sessions > 1 ? 's' : ''}`;
      }

      if (hrsOut) {
        hrsOut.textContent = `${hours.toFixed(1)} hrs`;
      }

      if (usdOut) {
        usdOut.textContent = `${formatPrice(weeklyUsd)} / wk`;
      }
    }

    range.addEventListener('input', updatePlanner);
    updatePlanner();
  }

  function updateEstimatorRate() {
    const estRate = $('#estimatorRate');

    if (estRate) {
      estRate.textContent = `${formatPrice(20)}/hr`;
    }
  }

  /* =========================================================
     MODALS (BRIEF, RESERVATION, FAQ, TERMS)
  ========================================================= */

  function setupModals() {
    const briefModal = $('#briefModal');
    const faqModal = $('#faqModal');
    const termsModal = $('#termsModal');

    $('#closeModalBtn')?.addEventListener('click', () => {
      if (briefModal) briefModal.hidden = true;
    });

    $('#doneCloseBtn')?.addEventListener('click', () => {
      if (briefModal) briefModal.hidden = true;
    });

    $('#closeFaqModal')?.addEventListener('click', () => {
      if (faqModal) faqModal.hidden = true;
    });

    $('#closeTermsModal')?.addEventListener('click', () => {
      if (termsModal) termsModal.hidden = true;
    });

    $('#acceptTermsBtn')?.addEventListener('click', () => {
      if (termsModal) termsModal.hidden = true;
    });

    $('#faqBubbleBtn')?.addEventListener('click', () => {
      if (faqModal) faqModal.hidden = false;
    });

    $('#footerFaqBtn')?.addEventListener('click', () => {
      if (faqModal) faqModal.hidden = false;
    });

    [briefModal, faqModal, termsModal].forEach(modal => {
      if (!modal) return;

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.hidden = true;
      });
    });

    $('#mSaveBtn')?.addEventListener('click', () => {
      if (activeLearner) toggleShortlist(activeLearner.id);
    });

    const tabBrief = $('#tabBrief');
    const tabReserve = $('#tabReserve');
    const viewBrief = $('#viewBrief');
    const viewReserve = $('#viewReserve');
    const viewDone = $('#viewDone');
    const goReserveBtn = $('#goReserveBtn');
    const backBriefBtn = $('#backBriefBtn');

    function switchModalView(tab) {
      if (
        !tabBrief ||
        !tabReserve ||
        !viewBrief ||
        !viewReserve ||
        !viewDone
      ) return;

      if (tab === 'brief') {
        tabBrief.classList.add('on');
        tabReserve.classList.remove('on');

        viewBrief.hidden = false;
        viewReserve.hidden = true;
        viewDone.hidden = true;

      } else if (tab === 'reserve') {
        tabReserve.classList.add('on');
        tabBrief.classList.remove('on');

        viewBrief.hidden = true;
        viewReserve.hidden = false;
        viewDone.hidden = true;

      } else if (tab === 'done') {
        viewBrief.hidden = true;
        viewReserve.hidden = true;
        viewDone.hidden = false;
      }
    }

    tabBrief?.addEventListener('click', () => {
      switchModalView('brief');
    });

    tabReserve?.addEventListener('click', () => {
      switchModalView('reserve');
    });

    goReserveBtn?.addEventListener('click', () => {
      switchModalView('reserve');
    });

    backBriefBtn?.addEventListener('click', () => {
      switchModalView('brief');
    });

    /* Reservation Form */
    const reserveForm = $('#reserveForm');

    if (reserveForm) {
      reserveForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fName = $('#fName').value.trim();
        const fEmail = $('#fEmail').value.trim();
        const fDate = $('#fDate').value;

        if (!fName || !fEmail || !fDate) {
          showToast('Please complete all required reservation fields.');
          return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fEmail)) {
          showToast('Please enter a valid email address.');
          return;
        }

        if (!activeLearner) return;

        const submitBtn = reserveForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
          if (!sb) throw new Error('Supabase client unavailable.');

          const session = await sb.auth.getSession();

          if (!session.data || !session.data.session) {
            showToast('Please sign in to request a slot.');
            setTimeout(() => { window.location.href = 'login'; }, 1200);
            return;
          }

          const fStrength = $('#fStrength');
          const fNote = $('#fNote');

          const ins = await sb.from('slot_reservations').insert({
            user_id: session.data.session.user.id,
            learner_code: activeLearner.code,
            learner_name: activeLearner.name,
            tutor_name: fName,
            tutor_email: fEmail,
            preferred_start: fDate,
            specialty: fStrength ? fStrength.value : null,
            note: fNote ? fNote.value.trim().slice(0, 1000) : null,
            status: 'pending'
          });

          if (ins.error) throw ins.error;

          $('#dRef').textContent = activeLearner.code;
          $('#dTutorName').textContent = fName;
          $('#dLearnerName').textContent = activeLearner.name;
          $('#dSummaryLearner').textContent = activeLearner.name;
          $('#dSummaryEmail').textContent = fEmail;
          $('#dSummaryDate').textContent = fDate;

          switchModalView('done');
          showToast('Reservation request submitted successfully!');
          reserveForm.reset();

        } catch (err) {
          console.error('MeloTutor reservation error:', err);
          showToast('We could not submit your request. Please try again.');

        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }

    setupShortlistDrawer();
  }

  function openBriefModal(id) {
    const item = learnersData.find(i => i.id === id);

    if (!item) return;

    activeLearner = item;

    const briefModal = $('#briefModal');

    if (!briefModal) return;

    briefModal.hidden = false;

    $('#mCode').textContent = item.code;
    $('#mAvatar').innerHTML =
      `<img src="${escHtml(item.avatar)}" alt="${escHtml(item.name)}">`;

    $('#mName').textContent = item.name;
    $('#mMeta').textContent =
      `${item.country} · ${item.levelName}`;

    $('#mPayout').textContent =
      `${formatPrice(item.payoutUsd)} / hr`;

    $('#mSlots').textContent =
      `● ${item.slotsLeft} slots left`;

    $('#mGoal').textContent = item.goal;
    $('#mPostedDate').textContent = item.postedDate;
    $('#mStartDate').textContent = item.startDate;

    const mSaveBtn = $('#mSaveBtn');

    if (mSaveBtn) {
      const isSaved = shortlist.includes(item.id);

      mSaveBtn.textContent = isSaved
        ? '★ Saved to shortlist'
        : '☆ Save to shortlist';
    }

    const checklistEl = $('#mChecklist');

    if (checklistEl) {
      checklistEl.innerHTML = item.checklist
        .map(c => `<li>${escHtml(c)}</li>`)
        .join('');
    }

    const fDate = $('#fDate');

    if (fDate) {
      const now = new Date();
      fDate.min = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');
    }

    if (fDate && !fDate.value) {
      const tomorrow = new Date(Date.now() + 86400000)
        .toISOString()
        .split('T')[0];

      fDate.value = tomorrow;
    }

    $('#tabBrief')?.classList.add('on');
    $('#tabReserve')?.classList.remove('on');

    if ($('#viewBrief')) $('#viewBrief').hidden = false;
    if ($('#viewReserve')) $('#viewReserve').hidden = true;
    if ($('#viewDone')) $('#viewDone').hidden = true;
  }

  /* =========================================================
     SUPPORT POPOVER DOCK & ONBOARDING NUDGE
  ========================================================= */

  function setupSupportDock() {
    const bubble = $('#supportBubbleBtn');
    const popover = $('#supportPopover');
    const closePop = $('#closeSupportPop');

    if (!bubble || !popover) return;

    bubble.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.hidden = !popover.hidden;
    });

    $('#footerSupportBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.hidden = false;
    });

    if (closePop) {
      closePop.addEventListener('click', () => {
        popover.hidden = true;
      });
    }

    document.addEventListener('click', (e) => {
      if (
        !popover.hidden &&
        !$('#floatDock')?.contains(e.target)
      ) {
        popover.hidden = true;
      }
    });
  }

  function setupNudge() {
    const nudgeCard = $('#nudgeCard');
    const nudgeText = $('#nudgeText');
    const closeNudge = $('#closeNudgeBtn');

    if (!nudgeCard || !nudgeText) return;

    nudgeText.textContent =
      '2026 Swahili tutor applications are open. Shortlist your preferred learner briefs and complete your dashboard profile.';

    setTimeout(() => {
      if (!sessionStorage.getItem('mt_nudge_dismissed')) {
        nudgeCard.classList.add('show');
      }
    }, 3500);

    closeNudge?.addEventListener('click', () => {
      nudgeCard.classList.remove('show');

      sessionStorage.setItem('mt_nudge_dismissed', '1');
    });
  }

  /* =========================================================
     TOAST NOTIFICATIONS
  ========================================================= */

  let toastTimer = null;

  function showToast(message) {
    const toast = $('#toast');

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  /* =========================================================
     INITIALIZATION
  ========================================================= */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
