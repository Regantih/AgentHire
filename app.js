// ============================================================
// AgentHire v2.0 — app.js
// Single-page application — all state in APP object
// All state kept in-memory (sandboxed iframe)
// ============================================================

'use strict';

// ─── Global Constants ───────────────────────────────────────
const CGI = '__CGI_BIN__';

// ─── Global State ───────────────────────────────────────────
const APP = {
  user: null,
  token: null,
  route: 'landing',
  cache: {},
  personaDirty: false,
  inactivityTimer: null,
  onboardingStep: 0,
  onboardingData: {},
  wizardRole: null,
  matchFilter: 'all',
  jobFilter: 'all',
  expandedJob: null,
  currentMatchId: null,
  currentJobId: null,
  referralLink: 'https://agenthire.ai/r/AH-' + Math.floor(10000 + Math.random() * 89999),
  chatOpen: false,
  chatMessages: [],
  autoSaveInterval: null,
  convoMessages: [],
  convoPreview: null,
  lastAISuggest: null,
};

// ─── Mobile Detection ───────────────────────────────────────
function isMobile() { return window.innerWidth <= 768; }

// ─── Demo Accounts ──────────────────────────────────────────
const DEMO_ACCOUNTS = [
  // Candidates
  { email: 'sarah.chen@demo.com',    password: 'demo123', name: 'Sarah Chen',      role: 'candidate', title: 'ML Engineer',            avatar: 'SC', availability: 'active',  skills: ['Python','TensorFlow','PyTorch','AWS','MLOps'], salary: [160000,200000], trust: 94, experience: 7, location: 'San Francisco, CA' },
  { email: 'marcus.j@demo.com',      password: 'demo123', name: 'Marcus Johnson',  role: 'candidate', title: 'Product Manager',         avatar: 'MJ', availability: 'open',    skills: ['Product Strategy','Roadmapping','SQL','Figma','Agile'], salary: [140000,180000], trust: 88, experience: 9, location: 'Austin, TX' },
  { email: 'priya.k@demo.com',       password: 'demo123', name: 'Priya Kapoor',    role: 'candidate', title: 'Senior Frontend Engineer', avatar: 'PK', availability: 'active',  skills: ['React','TypeScript','GraphQL','Node.js','CSS'], salary: [130000,165000], trust: 91, experience: 6, location: 'New York, NY' },
  { email: 'alex.r@demo.com',        password: 'demo123', name: 'Alex Rivera',     role: 'candidate', title: 'Data Scientist',           avatar: 'AR', availability: 'open',    skills: ['Python','R','Statistics','Tableau','SQL'], salary: [120000,155000], trust: 79, experience: 4, location: 'Chicago, IL' },
  { email: 'jordan.t@demo.com',      password: 'demo123', name: 'Jordan Torres',   role: 'candidate', title: 'DevOps Engineer',          avatar: 'JT', availability: 'active',  skills: ['Kubernetes','Docker','Terraform','AWS','CI/CD'], salary: [125000,160000], trust: 86, experience: 5, location: 'Seattle, WA' },
  { email: 'nina.w@demo.com',        password: 'demo123', name: 'Nina Williams',   role: 'candidate', title: 'Backend Engineer',         avatar: 'NW', availability: 'active',  skills: ['Go','Rust','PostgreSQL','Redis','gRPC'], salary: [135000,170000], trust: 92, experience: 8, location: 'Denver, CO' },
  { email: 'carlos.m@demo.com',      password: 'demo123', name: 'Carlos Mendoza',  role: 'candidate', title: 'Security Engineer',        avatar: 'CM', availability: 'open',    skills: ['Penetration Testing','SIEM','Python','Compliance','ISO27001'], salary: [145000,185000], trust: 83, experience: 6, location: 'Miami, FL' },
  { email: 'yuki.h@demo.com',        password: 'demo123', name: 'Yuki Hara',       role: 'candidate', title: 'Staff Engineer',           avatar: 'YH', availability: 'open',    skills: ['Systems Design','Java','Kafka','Spark','Leadership'], salary: [180000,230000], trust: 97, experience: 12, location: 'Los Angeles, CA' },
  // Recruiters
  { email: 'lisa.park@technova.com', password: 'demo123', name: 'Lisa Park',       role: 'recruiter', title: 'Head of Talent',           avatar: 'LP', company: 'TechNovate AI',    companySize: '201-500', industry: 'AI/ML' },
  { email: 'david.c@meridian.com',   password: 'demo123', name: 'David Chen',      role: 'recruiter', title: 'Senior Recruiter',         avatar: 'DC', company: 'Meridian Systems', companySize: '1001-5000', industry: 'Enterprise SaaS' },
  { email: 'rachel.s@quantum.com',   password: 'demo123', name: 'Rachel Santos',   role: 'recruiter', title: 'Talent Lead',              avatar: 'RS', company: 'Quantum Dynamics', companySize: '51-200', industry: 'Quantum Computing' },
  { email: 'james.o@atlas.com',      password: 'demo123', name: 'James O\'Brien',  role: 'recruiter', title: 'Head of People Ops',       avatar: 'JO', company: 'Atlas Global',     companySize: '5000+', industry: 'FinTech' },
];

// ─── Sample Match Data ───────────────────────────────────────
const SAMPLE_MATCHES = [
  { id: 'm1', jobId: 'j1', company: 'TechNovate AI', title: 'Head of AI Research', stage: 'New Matches', score: 94, confidence: 'High', reasons: ['Python + ML overlap 85%', 'Salary aligned $160-200k', 'Remote match'], logo: 'TA', companyColor: '#0d9488' },
  { id: 'm2', jobId: 'j2', company: 'Meridian Systems', title: 'Staff ML Engineer', stage: 'Interested', score: 88, confidence: 'High', reasons: ['TensorFlow expertise', 'Culture: innovation-first', 'Equity offered'], logo: 'MS', companyColor: '#7c3aed' },
  { id: 'm3', jobId: 'j3', company: 'Quantum Dynamics', title: 'ML Platform Lead', stage: 'Interviewing', score: 82, confidence: 'Moderate', reasons: ['MLOps aligned', 'Hybrid matches pref', 'Team size fits'], logo: 'QD', companyColor: '#059669' },
  { id: 'm4', jobId: 'j4', company: 'Atlas Global', title: 'Principal AI Engineer', stage: 'New Matches', score: 76, confidence: 'Moderate', reasons: ['PyTorch match', 'Salary: $175-220k', 'Growth trajectory'], logo: 'AG', companyColor: '#d97706' },
  { id: 'm5', jobId: 'j5', company: 'Nova Frontier', title: 'AI Research Scientist', stage: 'Offer', score: 91, confidence: 'High', reasons: ['Research background', 'Remote-first culture', 'Salary $200k+'], logo: 'NF', companyColor: '#db2777' },
  { id: 'm6', jobId: 'j6', company: 'Cascade Tech', title: 'Senior ML Engineer', stage: 'Hired', score: 95, confidence: 'High', reasons: ['Perfect skill match', 'Culture verified', 'Team matched'], logo: 'CT', companyColor: '#2563eb' },
];

const SAMPLE_JOBS = [
  { id: 'j1', title: 'Head of AI Research', status: 'Active', posted: '2026-02-15', candidates: 24, matchRate: 68, salary: [180000,250000], workModel: 'Remote', skills: ['Python','TensorFlow','Research','Publications'], description: 'Lead our AI research team to advance frontier capabilities in multimodal models. You will define research agenda, mentor researchers, and publish breakthroughs.' },
  { id: 'j2', title: 'Staff ML Engineer', status: 'Active', posted: '2026-02-18', candidates: 31, matchRate: 74, salary: [160000,210000], workModel: 'Hybrid', skills: ['Python','PyTorch','MLOps','Distributed Systems'], description: 'Join our ML platform team to scale training infrastructure and deployment pipelines serving 50M+ daily active users.' },
  { id: 'j3', title: 'ML Platform Lead', status: 'Paused', posted: '2026-02-10', candidates: 17, matchRate: 55, salary: [155000,195000], workModel: 'Hybrid', skills: ['Kubernetes','Spark','Python','System Design'], description: 'Own the ML platform powering our recommendation systems.' },
  { id: 'j4', title: 'Principal AI Engineer', status: 'Active', posted: '2026-02-20', candidates: 42, matchRate: 81, salary: [175000,230000], workModel: 'Remote', skills: ['LLMs','Python','AWS','System Design'], description: 'Build and deploy next-generation AI systems at scale.' },
  { id: 'j5', title: 'AI Research Scientist', status: 'Closed', posted: '2026-01-28', candidates: 19, matchRate: 72, salary: [200000,270000], workModel: 'Remote', skills: ['Research','NLP','Python','Math'], description: 'Conduct fundamental research in language model alignment.' },
];

const AGENT_FEED_ITEMS = [
  { type: 'matched',     message: 'Identified strong match: Head of AI Research at TechNovate AI (94% score)', time: '2 min ago' },
  { type: 'negotiating', message: 'Negotiating salary range with Meridian Systems agent — mutual window found $175k', time: '18 min ago' },
  { type: 'reviewed',    message: 'Reviewed 47 new postings — 12 qualified, 35 filtered (below threshold)', time: '1 hr ago' },
  { type: 'declined',    message: 'Auto-declined: Blockchain Dev role (skills mismatch: Solidity not in profile)', time: '2 hrs ago' },
  { type: 'milestone',   message: 'Profile completeness reached 87% — 3 more achievements unlocked', time: '3 hrs ago' },
  { type: 'matched',     message: 'New match: Principal AI Engineer at Atlas Global (76% score)', time: '4 hrs ago' },
  { type: 'reviewed',    message: 'Morning scan: 103 job postings evaluated across 8 categories', time: '8 hrs ago' },
  { type: 'negotiating', message: 'Exploring culture fit with Quantum Dynamics — awaiting response', time: '10 hrs ago' },
];

const NEGOTIATION_LOG = [
  { agent: 'candidate', name: 'Your Agent', time: '14:22', message: 'Initiating match evaluation for Head of AI Research. Candidate profile score: 94/100. Salary range compatible. Submitting qualification packet.' },
  { agent: 'recruiter', name: 'TechNovate Agent', time: '14:23', message: 'Received qualification packet. Evaluating against JD requirements... Skills overlap: 85% (strong). Culture alignment: Remote-friendly verified. Requesting salary confirmation.' },
  { agent: 'candidate', name: 'Your Agent', time: '14:25', message: 'Confirmed salary expectation: $160,000–$200,000 total comp. Equity preferred over base inflation. Availability: 2-week notice.' },
  { agent: 'recruiter', name: 'TechNovate Agent', time: '14:27', message: 'Salary window accepted. Authorized range: $170,000–$220,000 + equity. Escalating to human review. Match status: RECOMMENDED. Confidence: HIGH.' },
  { agent: 'system',    name: 'AgentHire System', time: '14:28', message: 'Both agents recommend proceeding. Match surfaced to both parties. Interview request available.' },
];

// ─── API Helper ─────────────────────────────────────────────
async function api(route, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (APP.token) opts.headers['Authorization'] = 'Bearer ' + APP.token;
  if (body) opts.body = JSON.stringify(body);
  try {
    const r = await fetch(`${CGI}/api.py?route=${route}`, opts);
    if (!r.ok) {
      const e = await r.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(e.error || 'Request failed');
    }
    return r.json();
  } catch (err) {
    // In demo mode without backend, return mock data
    return mockApiResponse(route, body);
  }
}

function mockApiResponse(route, body) {
  const mocks = {
    'hiring-pulse': { matches: 247, interviews: 89, hires: 12, agents: 1847 },
    'login': { token: 'demo-token-xyz', user: body },
    'register': { token: 'reg-token-xyz', user: body },
    'agent-feed': { items: AGENT_FEED_ITEMS },
    'dashboard-stats': { matches: 6, interviews: 2, agentActions: 147, profileViews: 34 },
    'recruiter-stats': { activeJobs: 4, matched: 133, interviews: 8, hires: 2 },
    'matches': { matches: SAMPLE_MATCHES },
    'jobs': { jobs: SAMPLE_JOBS },
    'trust-score': { total: 94, verification: 90, activity: 95, response: 97 },
    'profile-completeness': { score: 87, suggestions: ['Add LinkedIn URL', 'Upload resume', 'Add 2 more skills'] },
    'linkedin-import': { name: 'Demo User', headline: 'Senior Software Engineer', location: 'San Francisco, CA', skills: ['Python','React','AWS','PostgreSQL'] },
    'ai-suggest-job': { description: 'We are looking for an exceptional engineer to join our team...', skills: ['Python','System Design','AWS'], salary: [140000, 190000] },
    'ai-suggest-profile': { headline: 'Software Engineer', skills: ['Python','JavaScript','AWS'], experience: 3, marketRate: [120000, 160000] },
    'ai-chat-assist': { answer: 'I can help you with that! Based on your profile, here are my recommendations...' },
    'parse-resume': { name: 'Demo User', headline: 'Senior Software Engineer', location: 'San Francisco, CA', skills: ['Python','React','AWS','PostgreSQL'], experience: 5 },
    'skill-taxonomy': { related: ['React','Vue.js','Angular','TypeScript','Node.js'] },
    'validate-record': { errors: [], warnings: [{ msg: 'Consider adding more skills for better matches' }], suggestions: [{ msg: 'Add your GitHub profile to boost trust score' }] },
    'check-duplicate': { duplicate: false },
    'draft': { id: 'draft-' + Date.now(), saved: true },
    'job-templates': { templates: [
      { id: 'swe', title: 'Software Engineer', skills: ['Python','JavaScript','System Design'], salary: [140000, 190000] },
      { id: 'pm', title: 'Product Manager', skills: ['Product Strategy','Roadmapping','SQL'], salary: [130000, 180000] },
      { id: 'ds', title: 'Data Scientist', skills: ['Python','R','Statistics','ML'], salary: [130000, 175000] },
      { id: 'devops', title: 'DevOps Engineer', skills: ['Kubernetes','Docker','Terraform','AWS'], salary: [135000, 180000] },
    ]},
    'weekly-digest': { matches: 5, interviews: 2, profileViews: 18, topMatch: 'TechNovate AI' },
    'leaderboard': { entries: [
      { rank: 1, area: 'ML Engineering', matches: 24, avgScore: 91, badges: ['top-matcher'] },
      { rank: 2, area: 'Frontend Dev', matches: 21, avgScore: 88, badges: ['fastest-responder'] },
      { rank: 3, area: 'Product Mgmt', matches: 19, avgScore: 85, badges: ['star-profile'] },
      { rank: 4, area: 'DevOps', matches: 17, avgScore: 83, badges: [] },
      { rank: 5, area: 'Data Science', matches: 15, avgScore: 80, badges: [] },
    ]},
  };
  return mocks[route] || {};
}

// ─── Toast System ────────────────────────────────────────────
function toast(message, type = 'success', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = {
    success: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>',
    error:   '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>',
    info:    '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>',
    warning: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
  };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${message}</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast-show'));
  setTimeout(() => {
    el.classList.remove('toast-show');
    setTimeout(() => el.remove(), 400);
  }, duration);
}

// ─── Modal System ────────────────────────────────────────────
function showModal(title, content, actions = []) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close-btn" onclick="closeModal()" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">${typeof content === 'string' ? content : ''}</div>
      ${actions.length ? `<div class="modal-footer">${actions.map(a =>
        `<button class="btn ${a.primary ? 'btn-primary' : 'btn-secondary'}" data-modal-action="${a.label}">${a.label}</button>`
      ).join('')}</div>` : ''}
    </div>`;
  if (typeof content !== 'string') {
    overlay.querySelector('.modal-body').appendChild(content);
  }
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('modal-show'));
  // Bind action buttons
  actions.forEach(a => {
    const btn = overlay.querySelector(`[data-modal-action="${a.label}"]`);
    if (btn && a.action) btn.addEventListener('click', a.action);
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('modal-show');
    setTimeout(() => overlay.remove(), 300);
  }
}

// ─── Session Management ──────────────────────────────────────
function startInactivityTimer() {
  clearTimeout(APP.inactivityTimer);
  APP.inactivityTimer = setTimeout(() => {
    showModal('Session Timeout', '<p>Your session will expire in 1 minute due to inactivity.</p>', [
      { label: 'Stay Logged In', primary: true, action: () => { startInactivityTimer(); closeModal(); } },
      { label: 'Log Out', action: logout },
    ]);
  }, 15 * 60 * 1000);
}
['click', 'keydown', 'mousemove', 'scroll'].forEach(e =>
  document.addEventListener(e, startInactivityTimer, { passive: true })
);

// ─── Router ──────────────────────────────────────────────────
function navigate(route) {
  if (APP.personaDirty && window.location.hash.includes('persona')) {
    if (!confirm('You have unsaved changes. Leave without saving?')) return;
    APP.personaDirty = false;
  }
  window.location.hash = route;
}

window.addEventListener('hashchange', handleRoute);

function handleRoute() {
  const raw = window.location.hash.slice(1) || 'landing';
  APP.route = raw;

  // Guard: auth-required routes
  const publicRoutes = ['landing', 'signin', 'register', 'onboarding'];
  const isAuthRoute = !publicRoutes.some(r => raw.startsWith(r));
  if (isAuthRoute && !APP.user) {
    navigate('landing');
    return;
  }

  // Dispatch
  if (raw === 'landing')                  renderLanding();
  else if (raw === 'signin')              renderSignIn();
  else if (raw.startsWith('register'))    renderRegister(raw.includes('/recruiter') ? 'recruiter' : raw.includes('/candidate') ? 'candidate' : null);
  else if (raw === 'onboarding')          renderOnboarding();
  else if (raw === 'dashboard')           renderDashboard();
  else if (raw === 'matches')             renderMatches();
  else if (raw.startsWith('match/'))      renderMatchDetail(raw.split('/')[1]);
  else if (raw === 'persona')             renderPersona();
  else if (raw === 'jobs')                renderJobs();
  else if (raw.startsWith('job/'))        renderJobForm(raw.split('/')[1]);
  else if (raw === 'job-new')             renderJobForm(null);
  else if (raw === 'settings')            renderSettings();
  else if (raw === 'leaderboard')         renderLeaderboard();
  else if (raw === 'privacy')             renderPrivacyPage();
  else                                    renderLanding();
}

// ─── Shared Layout Helpers ───────────────────────────────────
function renderApp(html) {
  document.getElementById('app').innerHTML = html;
  // Remove any stale chat bubble from previous page
  const oldBubble = document.getElementById('ai-chat-bubble');
  if (oldBubble) oldBubble.remove();
  // Inject AI chat bubble for authenticated users on non-auth pages
  if (APP.user) {
    const route = APP.route || '';
    const noChat = ['landing', 'signin', 'register'].some(r => route === r || route.startsWith(r + '/'));
    if (!noChat) {
      const bubbleEl = document.createElement('div');
      bubbleEl.innerHTML = renderAIChatBubble();
      const bubble = bubbleEl.firstElementChild;
      if (bubble) document.body.appendChild(bubble);
    }
  }
}

function avatar(initials, color = '#0d9488', size = 40) {
  return `<div class="avatar" style="background:${color};width:${size}px;height:${size}px;font-size:${Math.floor(size*0.38)}px">${initials}</div>`;
}

function trustBadge(score) {
  const color = score >= 90 ? '#059669' : score >= 75 ? '#d97706' : '#dc2626';
  return `<span class="trust-badge" style="background:${color}20;color:${color};border-color:${color}40">⚡ ${score}</span>`;
}

function matchRing(score, size = 52) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 85 ? '#059669' : score >= 70 ? '#d97706' : '#dc2626';
  return `<svg class="match-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="4"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="4"
      stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${circ * 0.25}" stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})"/>
    <text x="${size/2}" y="${size/2 + 5}" text-anchor="middle" fill="${color}" font-size="${size > 60 ? 16 : 12}" font-weight="700">${score}%</text>
  </svg>`;
}

function stageColor(stage) {
  const map = { 'New Matches': '#0d9488', 'Interested': '#7c3aed', 'Interviewing': '#2563eb', 'Offer': '#d97706', 'Hired': '#059669' };
  return map[stage] || '#6b7280';
}

function pillStatus(status) {
  const map = { 'Active': 'pill-green', 'Paused': 'pill-amber', 'Closed': 'pill-gray', 'Draft': 'pill-blue' };
  return `<span class="pill ${map[status] || 'pill-gray'}">${status}</span>`;
}

function formatSalary(n) {
  if (n >= 1000) return '$' + (n/1000).toFixed(0) + 'k';
  return '$' + n;
}

function formatSalaryRange(min, max) {
  return `${formatSalary(min)}–${formatSalary(max)}`;
}

// ─── Navigation Bar (Authenticated) ─────────────────────────
function navBar() {
  const user = APP.user;
  if (!user) return '';
  const role = user.role;
  const items = role === 'candidate'
    ? [
        ['dashboard', 'Dashboard', iconDashboard()],
        ['matches', 'Matches', iconMatches()],
        ['persona', 'My Profile', iconPerson()],
        ['settings', 'Settings', iconGear()],
      ]
    : [
        ['dashboard', 'Dashboard', iconDashboard()],
        ['jobs', 'Jobs', iconBriefcase()],
        ['matches', 'Matches', iconMatches()],
        ['settings', 'Settings', iconGear()],
      ];

  const navItems = items.map(([route, label, icon]) =>
    `<a class="nav-item ${APP.route === route ? 'nav-active' : ''}" href="#${route}" onclick="navigate('${route}');return false">
      <span class="nav-icon">${icon}</span>
      <span class="nav-label">${label}</span>
    </a>`
  ).join('');

  if (isMobile()) {
    return `
      <nav class="mobile-nav">
        ${navItems}
      </nav>`;
  }

  return `
    <aside class="sidebar">
      <div class="sidebar-logo" onclick="navigate('dashboard')" style="cursor:pointer">
        <div class="logo-mark">AH</div>
        <div>
          <div class="logo-name">AgentHire</div>
          <div class="logo-version">v2.0</div>
        </div>
      </div>
      <div class="sidebar-user">
        ${avatar(user.avatar || user.name.slice(0,2).toUpperCase(), '#0d9488', 44)}
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${user.name}</div>
          <div class="sidebar-user-role">${user.role === 'candidate' ? user.title || 'Candidate' : user.company || 'Recruiter'}</div>
        </div>
      </div>
      <nav class="sidebar-nav">${navItems}</nav>
      <div class="sidebar-footer">
        <div class="sidebar-referral" onclick="showReferralModal()">
          <span>🎁</span> Invite a Colleague
        </div>
        <button class="sidebar-logout" onclick="logout()">Sign Out</button>
      </div>
    </aside>`;
}

function topBar(title, subtitle = '') {
  const user = APP.user;
  if (!user) return '';
  return `
    <header class="top-bar">
      ${isMobile() ? `<button class="hamburger" onclick="toggleMobileNav()">☰</button>` : ''}
      <div class="top-bar-title">
        <h1 class="page-title">${title}</h1>
        ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
      </div>
      <div class="top-bar-actions">
        <button class="notif-btn" onclick="showNotifications()" title="Notifications">
          ${iconBell()}
          <span class="notif-badge">3</span>
        </button>
        <div class="top-bar-avatar" onclick="navigate('persona')">
          ${avatar(user.avatar || user.name.slice(0,2).toUpperCase(), '#0d9488', 36)}
        </div>
      </div>
    </header>`;
}

function authLayout(html) {
  return `
    <div class="auth-layout">
      <div class="auth-brand" onclick="navigate('landing')" style="cursor:pointer">
        <div class="logo-mark">AH</div>
        <span class="auth-brand-name">AgentHire</span>
      </div>
      ${html}
    </div>`;
}

// ─── SVG Icons ───────────────────────────────────────────────
const iconDashboard  = () => `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>`;
const iconMatches    = () => `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/></svg>`;
const iconPerson     = () => `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>`;
const iconGear       = () => `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>`;
const iconBell       = () => `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>`;
const iconBriefcase  = () => `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd"/><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15a24.98 24.98 0 01-8-1.308z"/></svg>`;
const iconStar       = () => `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
const iconCheck      = () => `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`;
const iconEye        = () => `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>`;
const iconLink       = () => `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clip-rule="evenodd"/></svg>`;
const iconChat       = () => `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/></svg>`;
const iconX          = () => `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`;
const iconTrophy     = () => `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M5 3a2 2 0 00-2 2v1c0 2.761 2.239 5 5 5h4c2.761 0 5-2.239 5-5V5a2 2 0 00-2-2H5zm9 2H6v1a4 4 0 008 0V5zm-4 6a6 6 0 01-5.917-5H4a4 4 0 004 4h4a4 4 0 004-4h-.083A6 6 0 0110 11z" clip-rule="evenodd"/><path d="M9 13h2v4H9z"/><path d="M7 18h6a1 1 0 000-2H7a1 1 0 000 2z"/></svg>`;

// ─── Landing Page ────────────────────────────────────────────
function renderLanding() {
  const stats = { matches: '247K+', hires: '12K+', companies: '1.8K+', agents: '50K+' };

  renderApp(`
    <div class="landing">

      <!-- Hero -->
      <header class="landing-header">
        <nav class="landing-nav">
          <div class="landing-logo">
            <div class="logo-mark">AH</div>
            <span class="logo-name">AgentHire</span>
          </div>
          <div class="landing-nav-links">
            <a href="#features" class="nav-link">Features</a>
            <a href="#how-it-works" class="nav-link">How It Works</a>
            <a href="#signin" onclick="navigate('signin');return false" class="btn btn-ghost">Sign In</a>
            <a href="#register" onclick="navigate('register');return false" class="btn btn-primary">Get Started</a>
          </div>
        </nav>

        <div class="hero">
          <div class="hero-badge">🤖 AI-Native Hiring Platform</div>
          <h1 class="hero-title">Your AI Agent<br>Finds the Perfect Match</h1>
          <p class="hero-sub">AgentHire deploys intelligent agents that negotiate, evaluate,
          and match on your behalf — autonomously, 24/7.</p>
          <div class="hero-cta">
            <button class="btn btn-primary btn-lg" onclick="navigate('register/candidate')">I'm Looking for Work</button>
            <button class="btn btn-secondary btn-lg" onclick="navigate('register/recruiter')">I'm Hiring</button>
          </div>
          <div class="hero-proof">
            <span>✓ No recruiters needed</span>
            <span>✓ Agents negotiate for you</span>
            <span>✓ Matched in hours, not weeks</span>
          </div>
        </div>
      </header>

      <!-- Stats -->
      <section class="landing-stats">
        ${Object.entries(stats).map(([k, v]) =>
          `<div class="stat-item"><div class="stat-num">${v}</div><div class="stat-label">${k.replace(/([A-Z])/g,' $1').toLowerCase()}</div></div>`
        ).join('')}
      </section>

      <!-- Agent Demo Feed -->
      <section class="landing-demo">
        <div class="demo-header">
          <h2>Watch Your Agent Work in Real-Time</h2>
          <p>While you sleep, your agent evaluates hundreds of opportunities</p>
        </div>
        <div class="demo-feed">
          ${AGENT_FEED_ITEMS.map(item => `
            <div class="demo-feed-item">
              <span class="feed-dot feed-dot-${item.type}"></span>
              <span class="feed-msg">${item.message}</span>
              <span class="feed-time">${item.time}</span>
            </div>`).join('')}
        </div>
      </section>

      <!-- Features -->
      <section class="landing-features" id="features">
        <h2>Everything Your Agent Needs to Win</h2>
        <div class="features-grid">
          ${[
            ['🤖', 'Autonomous Agents', 'Your personal AI agent handles sourcing, evaluation, and negotiation 24/7 without manual input.'],
            ['⚡', 'Real-Time Matching', 'Agents communicate directly to find salary, culture, and skill alignment instantly.'],
            ['🔒', 'Trust Score System', 'Every participant earns a verifiable trust score — more trust means better matches.'],
            ['📊', 'Live Negotiations', 'Watch your agent negotiate in real-time with recruiter agents to secure the best terms.'],
            ['🔐', 'Privacy-First', 'Your full identity stays private until both agents agree to proceed. You control your data.'],
            ['🎯', 'Smart Filtering', 'Agents auto-reject mismatches and surface only high-confidence opportunities above your threshold.'],
          ].map(([icon, title, desc]) =>
            `<div class="feature-card">
              <div class="feature-icon">${icon}</div>
              <h3 class="feature-title">${title}</h3>
              <p class="feature-desc">${desc}</p>
            </div>`
          ).join('')}
        </div>
      </section>

      <!-- How It Works -->
      <section class="landing-how" id="how-it-works">
        <h2>How AgentHire Works</h2>
        <div class="how-steps">
          ${[
            ['1', 'Set Your Preferences', 'Tell your agent your ideal role, salary range, culture fit, and dealbreakers in under 5 minutes.'],
            ['2', 'Agent Takes Over', 'Your AI agent evaluates every matching posting, filters noise, and initiates conversations autonomously.'],
            ['3', 'Agents Negotiate', 'When two agents find a match, they negotiate salary and terms — surfacing only qualified opportunities.'],
            ['4', 'You Get Matched', 'Review curated, pre-negotiated matches. You only talk to companies worth your time.'],
          ].map(([n, title, desc]) =>
            `<div class="how-step">
              <div class="step-num">${n}</div>
              <h3 class="step-title">${title}</h3>
              <p class="step-desc">${desc}</p>
            </div>`
          ).join('')}
        </div>
      </section>

      <!-- CTA -->
      <section class="landing-cta">
        <h2>Ready to Let Your Agent Work for You?</h2>
        <p>Join 50,000+ professionals who've delegated their job search to AI</p>
        <div class="cta-buttons">
          <button class="btn btn-primary btn-lg" onclick="navigate('register/candidate')">Start as Candidate</button>
          <button class="btn btn-secondary btn-lg" onclick="navigate('register/recruiter')">Start Hiring</button>
        </div>
      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <div class="footer-logo">
          <div class="logo-mark logo-mark-sm">AH</div>
          <span>AgentHire v2.0</span>
        </div>
        <div class="footer-links">
          <a href="#privacy" onclick="navigate('privacy');return false">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Support</a>
        </div>
        <div class="footer-copy">© 2026 AgentHire. All rights reserved.</div>
      </footer>
    </div>`);
}

// ─── Sign In ─────────────────────────────────────────────────
function renderSignIn() {
  renderApp(authLayout(`
    <div class="auth-card">
      <h2 class="auth-title">Welcome back</h2>
      <p class="auth-sub">Sign in to continue to AgentHire</p>

      <div class="demo-accounts-panel">
        <div class="demo-panel-title">Demo Accounts — click to auto-fill</div>
        <div class="demo-accounts-grid">
          ${DEMO_ACCOUNTS.map(a =>
            `<button class="demo-account-btn" onclick="fillDemo('${a.email}','${a.password}')">
              <span class="demo-account-avatar" style="background:${a.role==='recruiter'?'#7c3aed':'#0d9488'}">${a.avatar}</span>
              <span class="demo-account-name">${a.name}</span>
              <span class="demo-account-role">${a.role}</span>
            </button>`
          ).join('')}
        </div>
      </div>

      <form id="signin-form" onsubmit="handleSignIn(event)">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" id="signin-email" placeholder="you@example.com" required autocomplete="email">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input class="form-input" type="password" id="signin-password" placeholder="••••••••" required autocomplete="current-password">
        </div>
        <div id="signin-error" class="form-error" style="display:none"></div>
        <button type="submit" class="btn btn-primary btn-full" id="signin-btn">Sign In</button>
      </form>

      <p class="auth-switch">New to AgentHire? <a href="#register" onclick="navigate('register');return false">Create account</a></p>
    </div>`));
}

function fillDemo(email, password) {
  document.getElementById('signin-email').value = email;
  document.getElementById('signin-password').value = password;
}

async function handleSignIn(e) {
  e.preventDefault();
  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;
  const errEl = document.getElementById('signin-error');
  const btn = document.getElementById('signin-btn');

  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  // Try demo accounts first
  const demo = DEMO_ACCOUNTS.find(a => a.email === email && a.password === password);
  if (demo) {
    APP.user = { ...demo };
    APP.token = 'demo-token-' + Date.now();
    startInactivityTimer();
    toast('Welcome back, ' + demo.name + '!', 'success');
    navigate('dashboard');
    return;
  }

  // Try API
  try {
    const res = await api('login', 'POST', { email, password });
    if (res.token) {
      APP.user = res.user;
      APP.token = res.token;
      startInactivityTimer();
      toast('Welcome back!', 'success');
      navigate('dashboard');
    } else {
      throw new Error('Invalid credentials');
    }
  } catch (err) {
    errEl.textContent = err.message || 'Invalid email or password';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

// ─── Register ────────────────────────────────────────────────
function renderRegister(preRole = null) {
  const role = preRole;
  renderApp(authLayout(`
    <div class="auth-card auth-card-wide">
      <h2 class="auth-title">Create your account</h2>
      <p class="auth-sub">Join AgentHire and let AI work for you</p>

      <div class="role-selector" id="role-selector">
        <button class="role-btn ${role === 'candidate' ? 'role-active' : ''}" onclick="selectRole('candidate')" id="role-candidate">
          <span class="role-icon">👤</span>
          <span class="role-label">I'm a Candidate</span>
          <span class="role-desc">Looking for my next role</span>
        </button>
        <button class="role-btn ${role === 'recruiter' ? 'role-active' : ''}" onclick="selectRole('recruiter')" id="role-recruiter">
          <span class="role-icon">🏢</span>
          <span class="role-label">I'm a Recruiter</span>
          <span class="role-desc">Hiring for my company</span>
        </button>
      </div>

      <form id="register-form" onsubmit="handleRegister(event)">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input class="form-input" type="text" id="reg-name" placeholder="Jane Smith" required autocomplete="name">
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" id="reg-email" placeholder="jane@example.com" required autocomplete="email">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" type="password" id="reg-password" placeholder="Min 8 characters" required minlength="8" autocomplete="new-password">
          </div>
          <div class="form-group" id="company-field" style="display:${role === 'recruiter' ? 'block' : 'none'}">
            <label class="form-label">Company Name</label>
            <input class="form-input" type="text" id="reg-company" placeholder="Acme Corp" autocomplete="organization">
          </div>
        </div>
        <input type="hidden" id="reg-role" value="${role || ''}">
        <div id="reg-error" class="form-error" style="display:none"></div>
        <button type="submit" class="btn btn-primary btn-full" id="reg-btn">Create Account & Launch Agent</button>
      </form>

      <p class="auth-switch">Already have an account? <a href="#signin" onclick="navigate('signin');return false">Sign in</a></p>
      <p class="auth-legal">By creating an account you agree to our <a href="#privacy" onclick="navigate('privacy');return false">Privacy Policy</a> and Terms of Service.</p>
    </div>`));
}

function selectRole(role) {
  document.getElementById('reg-role').value = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('role-active'));
  document.getElementById('role-' + role).classList.add('role-active');
  document.getElementById('company-field').style.display = role === 'recruiter' ? 'block' : 'none';
}

async function handleRegister(e) {
  e.preventDefault();
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const role     = document.getElementById('reg-role').value;
  const company  = document.getElementById('reg-company')?.value?.trim();
  const errEl    = document.getElementById('reg-error');
  const btn      = document.getElementById('reg-btn');

  if (!role) {
    errEl.textContent = 'Please select a role to continue';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account...';
  errEl.style.display = 'none';

  // Check for duplicate
  const dup = DEMO_ACCOUNTS.find(a => a.email === email);
  if (dup) {
    errEl.textContent = 'Email already registered. Try signing in.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Create Account & Launch Agent';
    return;
  }

  try {
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const user = { name, email, role, avatar: initials, ...(company ? { company } : {}) };
    const res = await api('register', 'POST', user);
    APP.user = { ...user };
    APP.token = res.token || 'token-' + Date.now();
    startInactivityTimer();
    toast('Account created! Setting up your agent...', 'success');
    navigate('onboarding');
  } catch (err) {
    errEl.textContent = err.message || 'Registration failed. Please try again.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Create Account & Launch Agent';
  }
}

// ─── Onboarding Wizard ───────────────────────────────────────
function renderOnboarding() {
  const user = APP.user;
  if (!user) { navigate('landing'); return; }
  const isCandidate = user.role === 'candidate';

  const steps = isCandidate
    ? ['Basics', 'Skills & Experience', 'Preferences', 'Agent Setup']
    : ['Company Info', 'Roles & Requirements', 'Culture & Process', 'Launch'];

  const step = APP.onboardingStep || 0;

  renderApp(`
    <div class="onboarding-layout">
      <div class="onboarding-header">
        <div class="logo-mark">AH</div>
        <div class="ob-steps">
          ${steps.map((s, i) =>
            `<div class="ob-step ${i < step ? 'ob-done' : i === step ? 'ob-active' : ''}">  
              <div class="ob-step-num">${i < step ? '✓' : i + 1}</div>
              <div class="ob-step-label">${s}</div>
            </div>`
          ).join('<div class="ob-connector"></div>')}
        </div>
      </div>
      <div class="onboarding-body">
        ${isCandidate ? renderCandidateStep(step) : renderRecruiterStep(step)}
      </div>
    </div>`);
}

function renderCandidateStep(step) {
  const d = APP.onboardingData;
  if (step === 0) return `
    <div class="ob-card">
      <h2>Tell us about yourself</h2>
      <p class="ob-desc">Your agent uses this to filter and pitch on your behalf</p>
      <div class="form-group">
        <label class="form-label">Current Job Title</label>
        <input class="form-input" id="ob-title" placeholder="Senior ML Engineer" value="${d.title || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Years of Experience</label>
        <select class="form-select" id="ob-exp">
          ${['<1 year','1–3 years','3–5 years','5–8 years','8–12 years','12+ years'].map(v =>
            `<option ${d.experience === v ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Location</label>
        <input class="form-input" id="ob-location" placeholder="San Francisco, CA" value="${d.location || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Work Preference</label>
        <div class="btn-group">
          ${['Remote','Hybrid','On-site'].map(v =>
            `<button class="btn-toggle ${d.workPref === v ? 'active' : ''}" onclick="setOBPref('workPref','${v}',this)">${v}</button>`
          ).join('')}
        </div>
      </div>
      <div class="ob-actions">
        <button class="btn btn-primary" onclick="advanceOnboarding(0)">Continue →</button>
      </div>
    </div>`;

  if (step === 1) return `
    <div class="ob-card">
      <h2>Your skills & experience</h2>
      <p class="ob-desc">The more specific you are, the better your agent performs</p>
      <div class="form-group">
        <label class="form-label">Top Skills <span class="form-hint">(comma-separated)</span></label>
        <input class="form-input" id="ob-skills" placeholder="Python, Machine Learning, AWS, React..." value="${(d.skills || []).join(', ')}">
      </div>
      <div class="form-group">
        <label class="form-label">Education Level</label>
        <select class="form-select" id="ob-edu">
          ${["High School","Associate's","Bachelor's","Master's","PhD","Bootcamp/Self-taught"].map(v =>
            `<option ${d.education === v ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">LinkedIn URL <span class="form-hint">(optional)</span></label>
        <div class="input-btn-row">
          <input class="form-input" id="ob-linkedin" placeholder="https://linkedin.com/in/yourprofile" value="${d.linkedin || ''}">
          <button class="btn btn-secondary" onclick="importLinkedIn()">Import</button>
        </div>
      </div>
      <div class="ob-actions">
        <button class="btn btn-ghost" onclick="APP.onboardingStep=0;renderOnboarding()">← Back</button>
        <button class="btn btn-primary" onclick="advanceOnboarding(1)">Continue →</button>
      </div>
    </div>`;

  if (step === 2) return `
    <div class="ob-card">
      <h2>Job preferences</h2>
      <p class="ob-desc">Set your agent's filters — it will only pursue opportunities matching these</p>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Min Salary</label>
          <input class="form-input" type="number" id="ob-salary-min" placeholder="120000" value="${d.salaryMin || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Max Salary</label>
          <input class="form-input" type="number" id="ob-salary-max" placeholder="200000" value="${d.salaryMax || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Availability</label>
        <div class="btn-group">
          ${['Actively looking','Open to offers','Not looking'].map(v =>
            `<button class="btn-toggle ${d.availability === v ? 'active' : ''}" onclick="setOBPref('availability','${v}',this)">${v}</button>`
          ).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Target Roles <span class="form-hint">(comma-separated)</span></label>
        <input class="form-input" id="ob-roles" placeholder="ML Engineer, AI Researcher, Platform Lead" value="${(d.targetRoles || []).join(', ')}">
      </div>
      <div class="form-group">
        <label class="form-label">Industries of Interest</label>
        <div class="multi-select" id="ob-industries">
          ${['AI/ML','FinTech','HealthTech','Enterprise SaaS','Consumer','Gaming','Climate','Crypto'].map(v =>
            `<button class="multi-select-item ${(d.industries || []).includes(v) ? 'selected' : ''}" onclick="toggleMultiSelect(this, 'industries', '${v}')">${v}</button>`
          ).join('')}
        </div>
      </div>
      <div class="ob-actions">
        <button class="btn btn-ghost" onclick="APP.onboardingStep=1;renderOnboarding()">← Back</button>
        <button class="btn btn-primary" onclick="advanceOnboarding(2)">Continue →</button>
      </div>
    </div>`;

  // Step 3: Agent Setup
  return `
    <div class="ob-card ob-card-final">
      <div class="ob-rocket">🤖</div>
      <h2>Your Agent is Ready!</h2>
      <p class="ob-desc">Here's what your agent will do for you:</p>
      <div class="agent-capabilities">
        ${[
          ['⚡', 'Auto-scan', '500+ job boards daily'],
          ['🎯', 'Smart filter', 'Only matches above your threshold'],
          ['💬', 'Negotiate', 'Salary & terms on your behalf'],
          ['🔒', 'Stay private', 'Until you approve a match'],
          ['📊', 'Track activity', 'Full audit trail of agent actions'],
        ].map(([icon, title, desc]) =>
          `<div class="agent-cap-item">
            <span class="agent-cap-icon">${icon}</span>
            <div><strong>${title}</strong><span> — ${desc}</span></div>
          </div>`
        ).join('')}
      </div>
      <div class="ob-actions">
        <button class="btn btn-ghost" onclick="APP.onboardingStep=2;renderOnboarding()">← Back</button>
        <button class="btn btn-primary btn-lg" onclick="completeOnboarding()">Launch My Agent 🚀</button>
      </div>
    </div>`;
}

function renderRecruiterStep(step) {
  const d = APP.onboardingData;
  if (step === 0) return `
    <div class="ob-card">
      <h2>Tell us about your company</h2>
      <p class="ob-desc">This helps us match you with the right candidates</p>
      <div class="form-group">
        <label class="form-label">Company Name</label>
        <input class="form-input" id="ob-company" placeholder="Acme Technologies" value="${d.company || APP.user?.company || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Company Size</label>
        <select class="form-select" id="ob-size">
          ${['1–10','11–50','51–200','201–500','501–1000','1001–5000','5000+'].map(v =>
            `<option ${d.size === v ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Industry</label>
        <select class="form-select" id="ob-industry">
          ${['AI/ML','FinTech','HealthTech','Enterprise SaaS','Consumer','Gaming','Climate','Crypto','Other'].map(v =>
            `<option ${d.industry === v ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="ob-actions">
        <button class="btn btn-primary" onclick="advanceOnboarding(0)">Continue →</button>
      </div>
    </div>`;

  if (step === 1) return `
    <div class="ob-card">
      <h2>What roles are you hiring for?</h2>
      <p class="ob-desc">Your agent will create smart job profiles to match candidates</p>
      <div class="form-group">
        <label class="form-label">Role Categories</label>
        <div class="multi-select">
          ${['Engineering','Product','Design','Data','Marketing','Sales','Operations','Finance'].map(v =>
            `<button class="multi-select-item ${(d.roleCategories || []).includes(v) ? 'selected' : ''}" onclick="toggleMultiSelect(this, 'roleCategories', '${v}')">${v}</button>`
          ).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Typical Salary Range</label>
        <div class="form-row">
          <input class="form-input" type="number" id="ob-sal-min" placeholder="100000" value="${d.salMin || ''}">
          <input class="form-input" type="number" id="ob-sal-max" placeholder="200000" value="${d.salMax || ''}">
        </div>
      </div>
      <div class="ob-actions">
        <button class="btn btn-ghost" onclick="APP.onboardingStep=0;renderOnboarding()">← Back</button>
        <button class="btn btn-primary" onclick="advanceOnboarding(1)">Continue →</button>
      </div>
    </div>`;

  if (step === 2) return `
    <div class="ob-card">
      <h2>Culture & Hiring Process</h2>
      <p class="ob-desc">Candidates value culture transparency — this improves match quality</p>
      <div class="form-group">
        <label class="form-label">Work Model</label>
        <div class="btn-group">
          ${['Remote','Hybrid','On-site'].map(v =>
            `<button class="btn-toggle ${d.workModel === v ? 'active' : ''}" onclick="setOBPref('workModel','${v}',this)">${v}</button>`
          ).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Hiring Speed</label>
        <div class="btn-group">
          ${['ASAP (<2 weeks)','Standard (2–4 weeks)','No rush (4+ weeks)'].map(v =>
            `<button class="btn-toggle ${d.hiringSpeed === v ? 'active' : ''}" onclick="setOBPref('hiringSpeed','${v}',this)">${v}</button>`
          ).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Interview Rounds</label>
        <select class="form-select" id="ob-rounds">
          ${['1–2 rounds','3–4 rounds','5+ rounds'].map(v =>
            `<option ${d.rounds === v ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="ob-actions">
        <button class="btn btn-ghost" onclick="APP.onboardingStep=1;renderOnboarding()">← Back</button>
        <button class="btn btn-primary" onclick="advanceOnboarding(2)">Continue →</button>
      </div>
    </div>`;

  return `
    <div class="ob-card ob-card-final">
      <div class="ob-rocket">🤖</div>
      <h2>Ready to Find Great Candidates!</h2>
      <p class="ob-desc">Your recruiter agent is configured to:</p>
      <div class="agent-capabilities">
        ${[
          ['🔍', 'Search', 'Active candidate pool with matching criteria'],
          ['📊', 'Score', 'Candidates against your JD requirements'],
          ['💬', 'Pre-screen', 'Via agent-to-agent negotiation'],
          ['⚡', 'Alert', 'You when top candidates are found'],
          ['📈', 'Analytics', 'Match rate & pipeline performance'],
        ].map(([icon, title, desc]) =>
          `<div class="agent-cap-item">
            <span class="agent-cap-icon">${icon}</span>
            <div><strong>${title}</strong><span> — ${desc}</span></div>
          </div>`
        ).join('')}
      </div>
      <div class="ob-actions">
        <button class="btn btn-ghost" onclick="APP.onboardingStep=2;renderOnboarding()">← Back</button>
        <button class="btn btn-primary btn-lg" onclick="completeOnboarding()">Launch Recruiter Agent 🚀</button>
      </div>
    </div>`;
}

function setOBPref(key, val, btn) {
  APP.onboardingData[key] = val;
  const group = btn.closest('.btn-group');
  if (group) group.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function toggleMultiSelect(btn, key, val) {
  btn.classList.toggle('selected');
  const arr = APP.onboardingData[key] = APP.onboardingData[key] || [];
  const idx = arr.indexOf(val);
  if (idx === -1) arr.push(val); else arr.splice(idx, 1);
}

async function importLinkedIn() {
  const url = document.getElementById('ob-linkedin')?.value;
  if (!url) { toast('Enter a LinkedIn URL first', 'warning'); return; }
  toast('Importing LinkedIn profile...', 'info');
  try {
    const res = await api('linkedin-import', 'POST', { url });
    if (res.name) {
      APP.onboardingData.skills = res.skills || [];
      document.getElementById('ob-skills').value = res.skills?.join(', ') || '';
      toast('LinkedIn imported: ' + res.skills?.length + ' skills found', 'success');
    }
  } catch (e) {
    toast('Import failed — using manual entry', 'error');
  }
}

function advanceOnboarding(currentStep) {
  // Collect current step data
  const collect = (id) => document.getElementById(id)?.value;
  if (currentStep === 0 && APP.user?.role === 'candidate') {
    APP.onboardingData.title    = collect('ob-title');
    APP.onboardingData.location = collect('ob-location');
    APP.onboardingData.experience = collect('ob-exp');
  } else if (currentStep === 1 && APP.user?.role === 'candidate') {
    const skillsRaw = collect('ob-skills') || '';
    APP.onboardingData.skills    = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
    APP.onboardingData.education = collect('ob-edu');
    APP.onboardingData.linkedin  = collect('ob-linkedin');
  } else if (currentStep === 2 && APP.user?.role === 'candidate') {
    APP.onboardingData.salaryMin    = parseInt(collect('ob-salary-min')) || 0;
    APP.onboardingData.salaryMax    = parseInt(collect('ob-salary-max')) || 0;
    const rolesRaw = collect('ob-roles') || '';
    APP.onboardingData.targetRoles  = rolesRaw.split(',').map(s => s.trim()).filter(Boolean);
  } else if (currentStep === 0 && APP.user?.role === 'recruiter') {
    APP.onboardingData.company  = collect('ob-company');
    APP.onboardingData.size     = collect('ob-size');
    APP.onboardingData.industry = collect('ob-industry');
  } else if (currentStep === 1 && APP.user?.role === 'recruiter') {
    APP.onboardingData.salMin = parseInt(collect('ob-sal-min')) || 0;
    APP.onboardingData.salMax = parseInt(collect('ob-sal-max')) || 0;
  } else if (currentStep === 2 && APP.user?.role === 'recruiter') {
    APP.onboardingData.rounds = collect('ob-rounds');
  }
  APP.onboardingStep = currentStep + 1;
  renderOnboarding();
}

async function completeOnboarding() {
  // Merge onboarding data into user profile
  Object.assign(APP.user, APP.onboardingData);
  toast('Agent launched successfully!', 'success');
  navigate('dashboard');
}

// ─── Dashboard ───────────────────────────────────────────────
async function renderDashboard() {
  const user = APP.user;
  if (!user) { navigate('landing'); return; }

  if (user.role === 'recruiter') {
    renderRecruiterDashboard();
    return;
  }

  // Candidate Dashboard
  renderApp(`
    <div class="app-layout ${isMobile() ? 'mobile-layout' : ''}">
      ${navBar()}
      <main class="main-content">
        ${topBar('Dashboard', 'Your agent is working 24/7')}
        <div class="page-body">

          <!-- Stats Row -->
          <div class="stats-row" id="dash-stats">
            <div class="stat-card">
              <div class="stat-card-icon" style="background:#0d948820">🎯</div>
              <div class="stat-card-body">
                <div class="stat-card-num" id="stat-matches">—</div>
                <div class="stat-card-label">Active Matches</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon" style="background:#7c3aed20">💬</div>
              <div class="stat-card-body">
                <div class="stat-card-num" id="stat-interviews">—</div>
                <div class="stat-card-label">Interviews</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon" style="background:#d9770620">⚡</div>
              <div class="stat-card-body">
                <div class="stat-card-num" id="stat-agent-actions">—</div>
                <div class="stat-card-label">Agent Actions</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon" style="background:#2563eb20">👁</div>
              <div class="stat-card-body">
                <div class="stat-card-num" id="stat-views">—</div>
                <div class="stat-card-label">Profile Views</div>
              </div>
            </div>
          </div>

          <!-- Main Grid -->
          <div class="dash-grid">

            <!-- Agent Feed -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Agent Activity Feed</h3>
                <span class="live-badge">● LIVE</span>
              </div>
              <div id="agent-feed" class="agent-feed">Loading...</div>
            </div>

            <!-- Right Column -->
            <div class="dash-right">

              <!-- Trust Score -->
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">Trust Score</h3>
                  <button class="btn btn-ghost btn-sm" onclick="showTrustDetail()">Details</button>
                </div>
                <div id="trust-panel" class="trust-panel">Loading...</div>
              </div>

              <!-- Profile Completeness -->
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">Profile Strength</h3>
                  <button class="btn btn-ghost btn-sm" onclick="navigate('persona')">Edit</button>
                </div>
                <div id="profile-completeness" class="profile-completeness">Loading...</div>
              </div>

              <!-- Top Match Preview -->
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">Top Match</h3>
                  <button class="btn btn-ghost btn-sm" onclick="navigate('matches')">View All</button>
                </div>
                <div id="top-match-preview" class="top-match-preview">Loading...</div>
              </div>

            </div>
          </div>

          <!-- Negotiation Panel -->
          <div class="card" style="margin-top:24px">
            <div class="card-header">
              <h3 class="card-title">Live Agent Negotiation</h3>
              <span class="pill pill-green">Active</span>
            </div>
            <div id="negotiation-panel" class="negotiation-log">Loading...</div>
          </div>

          <!-- Hiring Market Pulse -->
          <div class="card" style="margin-top:24px">
            <div class="card-header">
              <h3 class="card-title">Hiring Market Pulse</h3>
              <span class="form-hint">Live market data</span>
            </div>
            <div id="market-pulse" class="market-pulse">Loading...</div>
          </div>

        </div>
      </main>
    </div>`);

  loadDashboardData();
}

async function loadDashboardData() {
  try {
    const [stats, feed, trust, completeness, matches, pulse] = await Promise.all([
      api('dashboard-stats'),
      api('agent-feed'),
      api('trust-score'),
      api('profile-completeness'),
      api('matches'),
      api('hiring-pulse'),
    ]);

    // Stats
    document.getElementById('stat-matches').textContent    = stats.matches  ?? 6;
    document.getElementById('stat-interviews').textContent = stats.interviews ?? 2;
    document.getElementById('stat-agent-actions').textContent = stats.agentActions ?? 147;
    document.getElementById('stat-views').textContent      = stats.profileViews ?? 34;

    // Agent Feed
    const feedEl = document.getElementById('agent-feed');
    if (feedEl) feedEl.innerHTML = (feed.items || AGENT_FEED_ITEMS).map(item => `
      <div class="feed-item">
        <span class="feed-dot feed-dot-${item.type}"></span>
        <span class="feed-msg">${item.message}</span>
        <span class="feed-time">${item.time}</span>
      </div>`).join('');

    // Trust Score
    const trustEl = document.getElementById('trust-panel');
    if (trustEl) {
      const t = trust.total ?? 94;
      trustEl.innerHTML = `
        <div class="trust-score-big">
          ${matchRing(t, 80)}
          <div class="trust-breakdown">
            <div class="trust-row"><span>Verification</span><span>${trust.verification ?? 90}%</span></div>
            <div class="trust-row"><span>Activity</span><span>${trust.activity ?? 95}%</span></div>
            <div class="trust-row"><span>Response Rate</span><span>${trust.response ?? 97}%</span></div>
          </div>
        </div>`;
    }

    // Profile Completeness
    const compEl = document.getElementById('profile-completeness');
    if (compEl) {
      const score = completeness.score ?? 87;
      compEl.innerHTML = `
        <div class="progress-bar-row">
          <span>${score}% complete</span>
          <span class="pill pill-${score >= 80 ? 'green' : score >= 60 ? 'amber' : 'gray'}">${score >= 80 ? 'Strong' : score >= 60 ? 'Good' : 'Basic'}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${score}%"></div></div>
        ${(completeness.suggestions || []).map(s =>
          `<div class="completeness-tip">💡 ${s}</div>`
        ).join('')}`;
    }

    // Top Match Preview
    const topMatchEl = document.getElementById('top-match-preview');
    const topMatch = (matches.matches || SAMPLE_MATCHES).sort((a, b) => b.score - a.score)[0];
    if (topMatchEl && topMatch) {
      topMatchEl.innerHTML = `
        <div class="top-match-card" onclick="navigate('match/${topMatch.id}')">
          <div class="top-match-header">
            ${avatar(topMatch.logo, topMatch.companyColor, 44)}
            <div>
              <div class="top-match-title">${topMatch.title}</div>
              <div class="top-match-company">${topMatch.company}</div>
            </div>
            ${matchRing(topMatch.score)}
          </div>
          <div class="top-match-reasons">
            ${topMatch.reasons.map(r => `<span class="reason-tag">${r}</span>`).join('')}
          </div>
        </div>`;
    }

    // Negotiation Panel
    const negEl = document.getElementById('negotiation-panel');
    if (negEl) {
      negEl.innerHTML = NEGOTIATION_LOG.map(entry => `
        <div class="neg-entry neg-entry-${entry.agent}">
          <div class="neg-agent">${entry.name} <span class="neg-time">${entry.time}</span></div>
          <div class="neg-msg">${entry.message}</div>
        </div>`).join('');
    }

    // Market Pulse
    const pulseEl = document.getElementById('market-pulse');
    if (pulseEl) {
      pulseEl.innerHTML = `
        <div class="pulse-grid">
          <div class="pulse-item"><div class="pulse-num">${pulse.matches ?? 247}K+</div><div class="pulse-label">Active Matches This Week</div></div>
          <div class="pulse-item"><div class="pulse-num">${pulse.interviews ?? 89}K+</div><div class="pulse-label">Interviews Scheduled</div></div>
          <div class="pulse-item"><div class="pulse-num">${pulse.hires ?? 12}K+</div><div class="pulse-label">Successful Hires</div></div>
          <div class="pulse-item"><div class="pulse-num">${pulse.agents ?? 1847}</div><div class="pulse-label">Agents Active Now</div></div>
        </div>`;
    }
  } catch (e) {
    console.error('Dashboard load error:', e);
  }
}

async function renderRecruiterDashboard() {
  const user = APP.user;
  renderApp(`
    <div class="app-layout ${isMobile() ? 'mobile-layout' : ''}">
      ${navBar()}
      <main class="main-content">
        ${topBar('Recruiter Dashboard', user.company || 'Your Company')}
        <div class="page-body">

          <!-- Stats -->
          <div class="stats-row">
            <div class="stat-card">
              <div class="stat-card-icon" style="background:#0d948820">📋</div>
              <div class="stat-card-body">
                <div class="stat-card-num" id="rec-stat-jobs">—</div>
                <div class="stat-card-label">Active Jobs</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon" style="background:#7c3aed20">🎯</div>
              <div class="stat-card-body">
                <div class="stat-card-num" id="rec-stat-matched">—</div>
                <div class="stat-card-label">Candidates Matched</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon" style="background:#d9770620">💬</div>
              <div class="stat-card-body">
                <div class="stat-card-num" id="rec-stat-interviews">—</div>
                <div class="stat-card-label">Interviews</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon" style="background:#05966920">✅</div>
              <div class="stat-card-body">
                <div class="stat-card-num" id="rec-stat-hires">—</div>
                <div class="stat-card-label">Hires Made</div>
              </div>
            </div>
          </div>

          <!-- Main Grid -->
          <div class="dash-grid">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Active Job Listings</h3>
                <button class="btn btn-primary btn-sm" onclick="navigate('job-new')">+ New Job</button>
              </div>
              <div id="rec-jobs-list">Loading...</div>
            </div>

            <div class="dash-right">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">Top Candidates</h3>
                  <button class="btn btn-ghost btn-sm" onclick="navigate('matches')">View All</button>
                </div>
                <div id="rec-top-candidates">Loading...</div>
              </div>
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">Agent Activity</h3>
                  <span class="live-badge">● LIVE</span>
                </div>
                <div id="rec-agent-feed" class="agent-feed">Loading...</div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>`);

  try {
    const [stats, jobs, matches, feed] = await Promise.all([
      api('recruiter-stats'),
      api('jobs'),
      api('matches'),
      api('agent-feed'),
    ]);

    document.getElementById('rec-stat-jobs').textContent       = stats.activeJobs  ?? 4;
    document.getElementById('rec-stat-matched').textContent    = stats.matched     ?? 133;
    document.getElementById('rec-stat-interviews').textContent = stats.interviews  ?? 8;
    document.getElementById('rec-stat-hires').textContent      = stats.hires       ?? 2;

    const jobsEl = document.getElementById('rec-jobs-list');
    if (jobsEl) {
      jobsEl.innerHTML = (jobs.jobs || SAMPLE_JOBS).map(job => `
        <div class="job-row" onclick="navigate('job/${job.id}')">
          <div class="job-row-info">
            <div class="job-row-title">${job.title}</div>
            <div class="job-row-meta">${job.candidates} candidates · ${job.matchRate}% match rate · ${job.workModel}</div>
          </div>
          <div class="job-row-right">
            ${pillStatus(job.status)}
            <span class="job-row-salary">${formatSalaryRange(job.salary[0], job.salary[1])}</span>
          </div>
        </div>`).join('');
    }

    const candEl = document.getElementById('rec-top-candidates');
    if (candEl) {
      candEl.innerHTML = (matches.matches || SAMPLE_MATCHES).slice(0, 4).map(m => `
        <div class="cand-row" onclick="navigate('match/${m.id}')">
          ${avatar(m.logo, m.companyColor, 36)}
          <div class="cand-row-info">
            <div class="cand-row-name">${m.title}</div>
            <div class="cand-row-company">${m.company}</div>
          </div>
          ${matchRing(m.score, 44)}
        </div>`).join('');
    }

    const feedEl = document.getElementById('rec-agent-feed');
    if (feedEl) feedEl.innerHTML = (feed.items || AGENT_FEED_ITEMS).slice(0, 5).map(item => `
      <div class="feed-item">
        <span class="feed-dot feed-dot-${item.type}"></span>
        <span class="feed-msg">${item.message}</span>
        <span class="feed-time">${item.time}</span>
      </div>`).join('');

  } catch (e) {
    console.error('Recruiter dashboard error:', e);
  }
}

// ─── Matches ─────────────────────────────────────────────────
async function renderMatches() {
  const user = APP.user;
  if (!user) { navigate('landing'); return; }

  const stages = ['All', 'New Matches', 'Interested', 'Interviewing', 'Offer', 'Hired'];

  renderApp(`
    <div class="app-layout ${isMobile() ? 'mobile-layout' : ''}">
      ${navBar()}
      <main class="main-content">
        ${topBar('Matches', `${SAMPLE_MATCHES.length} active matches`)}
        <div class="page-body">
          <div class="filter-bar">
            ${stages.map(s =>
              `<button class="filter-btn ${APP.matchFilter === (s === 'All' ? 'all' : s) ? 'filter-active' : ''}" onclick="setMatchFilter('${s === 'All' ? 'all' : s}')">${s}</button>`
            ).join('')}
          </div>
          <div id="matches-list" class="matches-grid">Loading...</div>
        </div>
      </main>
    </div>`);

  loadMatches();
}

function setMatchFilter(filter) {
  APP.matchFilter = filter;
  renderMatches();
}

async function loadMatches() {
  try {
    const res = await api('matches');
    const matches = res.matches || SAMPLE_MATCHES;
    const filtered = APP.matchFilter === 'all' ? matches : matches.filter(m => m.stage === APP.matchFilter);
    const el = document.getElementById('matches-list');
    if (!el) return;
    if (!filtered.length) {
      el.innerHTML = `<div class="empty-state"><p>No matches in this stage yet.</p><button class="btn btn-primary" onclick="setMatchFilter('all')">View All</button></div>`;
      return;
    }
    el.innerHTML = filtered.map(m => `
      <div class="match-card" onclick="navigate('match/${m.id}')">
        <div class="match-card-header">
          ${avatar(m.logo, m.companyColor, 48)}
          ${matchRing(m.score)}
        </div>
        <div class="match-card-body">
          <div class="match-card-title">${m.title}</div>
          <div class="match-card-company">${m.company}</div>
          <span class="pill" style="background:${stageColor(m.stage)}20;color:${stageColor(m.stage)};margin-top:6px">${m.stage}</span>
        </div>
        <div class="match-card-reasons">
          ${m.reasons.map(r => `<span class="reason-tag">${r}</span>`).join('')}
        </div>
        <div class="match-card-footer">
          <span class="match-confidence match-conf-${m.confidence.toLowerCase()}">${m.confidence} confidence</span>
          <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();navigate('match/${m.id}')">View →</button>
        </div>
      </div>`).join('');
  } catch (e) {
    console.error('Matches error:', e);
  }
}

// ─── Match Detail ─────────────────────────────────────────────
async function renderMatchDetail(id) {
  const user = APP.user;
  if (!user) { navigate('landing'); return; }

  let match = SAMPLE_MATCHES.find(m => m.id === id);
  if (!match) match = SAMPLE_MATCHES[0];

  const job = SAMPLE_JOBS.find(j => j.id === match.jobId) || SAMPLE_JOBS[0];

  renderApp(`
    <div class="app-layout ${isMobile() ? 'mobile-layout' : ''}">
      ${navBar()}
      <main class="main-content">
        ${topBar(match.title, match.company)}
        <div class="page-body">
          <button class="back-btn" onclick="navigate('matches')">← Back to Matches</button>

          <div class="match-detail-grid">
            <!-- Left: Match Info -->
            <div class="match-detail-left">
              <div class="card">
                <div class="match-detail-header">
                  ${avatar(match.logo, match.companyColor, 64)}
                  <div>
                    <h2 class="match-detail-title">${match.title}</h2>
                    <div class="match-detail-company">${match.company}</div>
                    <span class="pill" style="background:${stageColor(match.stage)}20;color:${stageColor(match.stage)}">${match.stage}</span>
                  </div>
                  ${matchRing(match.score, 72)}
                </div>

                <div class="match-detail-reasons">
                  <h4>Why This Match</h4>
                  ${match.reasons.map(r => `
                    <div class="reason-row">${iconCheck()} <span>${r}</span></div>`).join('')}
                </div>

                <div class="match-detail-actions">
                  <button class="btn btn-primary" onclick="showInterestModal('${match.id}')">Express Interest</button>
                  <button class="btn btn-secondary" onclick="showDeclineModal('${match.id}')">Decline</button>
                  <button class="btn btn-ghost" onclick="showShareModal('${match.id}')">Share</button>
                </div>
              </div>

              <!-- Negotiation Log -->
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">Agent Negotiation Log</h3>
                  <span class="pill pill-green">Active</span>
                </div>
                <div class="negotiation-log">
                  ${NEGOTIATION_LOG.map(entry => `
                    <div class="neg-entry neg-entry-${entry.agent}">
                      <div class="neg-agent">${entry.name} <span class="neg-time">${entry.time}</span></div>
                      <div class="neg-msg">${entry.message}</div>
                    </div>`).join('')}
                </div>
              </div>
            </div>

            <!-- Right: Job Details -->
            <div class="match-detail-right">
              <div class="card">
                <h3 class="card-title">Job Details</h3>
                <div class="job-detail-row"><span>Salary</span><strong>${formatSalaryRange(job.salary[0], job.salary[1])}</strong></div>
                <div class="job-detail-row"><span>Work Model</span><strong>${job.workModel}</strong></div>
                <div class="job-detail-row"><span>Posted</span><strong>${job.posted}</strong></div>
                <div class="job-detail-row"><span>Status</span>${pillStatus(job.status)}</div>
                <div class="job-detail-skills">
                  <div class="form-hint">Required Skills</div>
                  <div class="skills-list">${job.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>
                </div>
                <p class="job-description">${job.description}</p>
              </div>

              <div class="card">
                <h3 class="card-title">Confidence Breakdown</h3>
                ${[
                  ['Skills Match', 85],
                  ['Salary Alignment', 92],
                  ['Culture Fit', 78],
                  ['Location/Remote', 100],
                ].map(([label, val]) => `
                  <div class="conf-row">
                    <span class="conf-label">${label}</span>
                    <div class="conf-bar"><div class="conf-fill" style="width:${val}%;background:${val>=85?'#059669':val>=70?'#d97706':'#dc2626'}"></div></div>
                    <span class="conf-val">${val}%</span>
                  </div>`).join('')}
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>`);
}

function showInterestModal(matchId) {
  showModal('Express Interest', `
    <p>Your agent will notify the recruiter agent that you're interested in this role.</p>
    <p>The negotiation process will continue automatically. You'll be notified of updates.</p>`,
    [
      { label: 'Confirm Interest', primary: true, action: () => {
        toast('Interest expressed! Agents resuming negotiation.', 'success');
        closeModal();
      }},
      { label: 'Cancel', action: closeModal },
    ]
  );
}

function showDeclineModal(matchId) {
  showModal('Decline Match', `
    <p>Your agent will inform the recruiter that you're not interested.</p>
    <div class="form-group" style="margin-top:12px">
      <label class="form-label">Reason (optional)</label>
      <select class="form-select" id="decline-reason">
        <option>Salary below expectations</option>
        <option>Role not aligned</option>
        <option>Company culture mismatch</option>
        <option>Location/remote conflict</option>
        <option>Other</option>
      </select>
    </div>`,
    [
      { label: 'Decline Match', action: () => {
        toast('Match declined. Agent will inform the recruiter.', 'info');
        closeModal();
        navigate('matches');
      }},
      { label: 'Cancel', primary: true, action: closeModal },
    ]
  );
}

function showShareModal(matchId) {
  showModal('Share Match', `
    <p>Share this opportunity with a colleague or mentor for advice.</p>
    <div class="input-btn-row" style="margin-top:12px">
      <input class="form-input" value="https://agenthire.ai/match/${matchId}" readonly onclick="this.select()">
      <button class="btn btn-primary" onclick="navigator.clipboard.writeText(this.previousElementSibling.value);toast('Link copied!','success')">Copy</button>
    </div>`,
    [{ label: 'Close', action: closeModal }]
  );
}

// ─── Persona / Profile Editor ─────────────────────────────────
async function renderPersona() {
  const user = APP.user;
  if (!user) { navigate('landing'); return; }
  const isCandidate = user.role === 'candidate';

  renderApp(`
    <div class="app-layout ${isMobile() ? 'mobile-layout' : ''}">
      ${navBar()}
      <main class="main-content">
        ${topBar('My Profile', 'Manage your agent persona')}
        <div class="page-body">
          <div class="persona-grid">

            <!-- Left: Profile Card -->
            <div class="persona-left">
              <div class="card persona-card">
                <div class="persona-avatar-row">
                  ${avatar(user.avatar || user.name.slice(0,2).toUpperCase(), '#0d9488', 72)}
                  <div>
                    <div class="persona-name">${user.name}</div>
                    <div class="persona-role">${user.role === 'candidate' ? user.title || 'Candidate' : user.company || 'Recruiter'}</div>
                    ${user.trust !== undefined ? trustBadge(user.trust) : ''}
                  </div>
                </div>
                ${isCandidate ? `
                  <div class="persona-stats">
                    <div class="pstat"><div class="pstat-num">${user.experience || 5}</div><div class="pstat-label">Yrs Exp</div></div>
                    <div class="pstat"><div class="pstat-num">${(user.skills || []).length}</div><div class="pstat-label">Skills</div></div>
                    <div class="pstat"><div class="pstat-num">${user.trust || 85}</div><div class="pstat-label">Trust</div></div>
                  </div>` : ''}
                <div class="persona-badges">
                  <span class="badge-item">✓ Email Verified</span>
                  ${user.linkedin ? '<span class="badge-item">✓ LinkedIn</span>' : ''}
                  ${(user.trust || 0) > 90 ? '<span class="badge-item">⭐ Elite</span>' : ''}
                </div>
              </div>

              <!-- Referral Card -->
              <div class="card" style="margin-top:16px">
                <h3 class="card-title">Invite & Earn</h3>
                <p class="form-hint">Share your link to earn priority matching</p>
                <div class="referral-row">
                  <input class="form-input" value="${APP.referralLink}" readonly onclick="this.select()">
                  <button class="btn btn-secondary" onclick="copyReferral()">Copy</button>
                </div>
              </div>
            </div>

            <!-- Right: Edit Form -->
            <div class="persona-right">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">Profile Details</h3>
                  <button class="btn btn-primary btn-sm" id="save-persona-btn" onclick="savePersona()">Save Changes</button>
                </div>
                <form id="persona-form" onchange="APP.personaDirty=true">
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Full Name</label>
                      <input class="form-input" id="p-name" value="${user.name}">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Email</label>
                      <input class="form-input" id="p-email" type="email" value="${user.email}">
                    </div>
                  </div>
                  ${isCandidate ? `
                    <div class="form-group">
                      <label class="form-label">Job Title</label>
                      <input class="form-input" id="p-title" value="${user.title || ''}">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Location</label>
                      <input class="form-input" id="p-location" value="${user.location || ''}">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Skills</label>
                      <input class="form-input" id="p-skills" value="${(user.skills || []).join(', ')}" placeholder="Python, React, AWS...">
                      <div class="skill-suggestions" id="skill-suggestions"></div>
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label class="form-label">Min Salary</label>
                        <input class="form-input" type="number" id="p-sal-min" value="${user.salary?.[0] || ''}">
                      </div>
                      <div class="form-group">
                        <label class="form-label">Max Salary</label>
                        <input class="form-input" type="number" id="p-sal-max" value="${user.salary?.[1] || ''}">
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Availability</label>
                      <div class="btn-group">
                        ${['active','open','not-looking'].map(v =>
                          `<button type="button" class="btn-toggle ${user.availability === v ? 'active' : ''}" onclick="toggleAvailability('${v}',this)">${v.replace('-',' ')}</button>`
                        ).join('')}
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Work Preference</label>
                      <div class="btn-group">
                        ${['Remote','Hybrid','On-site'].map(v =>
                          `<button type="button" class="btn-toggle ${user.workPref === v ? 'active' : ''}" onclick="toggleWorkPref('${v}',this)">${v}</button>`
                        ).join('')}
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Resume Upload</label>
                      <div class="file-upload-row">
                        <input type="file" id="p-resume" accept=".pdf,.doc,.docx" onchange="handleResumeUpload(event)" style="display:none">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('p-resume').click()">Upload Resume</button>
                        <span class="form-hint" id="resume-filename">${user.resumeFile || 'No file selected'}</span>
                      </div>
                    </div>` : `
                    <div class="form-group">
                      <label class="form-label">Company</label>
                      <input class="form-input" id="p-company" value="${user.company || ''}">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Industry</label>
                      <input class="form-input" id="p-industry" value="${user.industry || ''}">
                    </div>`}
                  <div class="form-group">
                    <label class="form-label">LinkedIn URL</label>
                    <div class="input-btn-row">
                      <input class="form-input" id="p-linkedin" type="url" placeholder="https://linkedin.com/in/..." value="${user.linkedin || ''}">
                      <button type="button" class="btn btn-secondary" onclick="syncLinkedIn()">Sync</button>
                    </div>
                  </div>
                </form>
              </div>

              <!-- AI Assist -->
              <div class="card" style="margin-top:16px">
                <div class="card-header">
                  <h3 class="card-title">AI Profile Assistant</h3>
                  <span class="form-hint">Powered by AgentHire AI</span>
                </div>
                <div class="ai-assist-panel">
                  <button class="btn btn-secondary" onclick="aiSuggestProfile()">✨ Suggest Improvements</button>
                  <button class="btn btn-secondary" onclick="getSkillSuggestions()">🎯 Skill Suggestions</button>
                  <button class="btn btn-secondary" onclick="viewMarketRate()">💰 Market Rate Analysis</button>
                </div>
                <div id="ai-suggest-output" class="ai-output" style="display:none"></div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>`);

  // Skill input auto-suggest
  const skillsInput = document.getElementById('p-skills');
  if (skillsInput) {
    skillsInput.addEventListener('input', debounce(async () => {
      const val = skillsInput.value.split(',').pop().trim();
      if (val.length < 2) return;
      const res = await api('skill-taxonomy', 'POST', { query: val });
      const suggestEl = document.getElementById('skill-suggestions');
      if (!suggestEl) return;
      suggestEl.innerHTML = (res.related || []).map(s =>
        `<button class="skill-suggest-btn" onclick="addSkillSuggestion('${s}')">${s}</button>`
      ).join('');
    }, 400));
  }
}

function toggleAvailability(val, btn) {
  APP.user.availability = val;
  btn.closest('.btn-group').querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function toggleWorkPref(val, btn) {
  APP.user.workPref = val;
  btn.closest('.btn-group').querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function addSkillSuggestion(skill) {
  const input = document.getElementById('p-skills');
  if (!input) return;
  const parts = input.value.split(',').map(s => s.trim()).filter(Boolean);
  if (!parts.includes(skill)) parts.push(skill);
  input.value = parts.join(', ');
  const suggestEl = document.getElementById('skill-suggestions');
  if (suggestEl) suggestEl.innerHTML = '';
}

async function handleResumeUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  toast('Parsing resume...', 'info');
  document.getElementById('resume-filename').textContent = file.name;
  // In real app: upload file and parse
  const res = await api('parse-resume', 'POST', { filename: file.name });
  if (res.skills) {
    APP.user.resumeFile = file.name;
    const input = document.getElementById('p-skills');
    if (input) input.value = res.skills.join(', ');
    toast('Resume parsed: ' + res.skills.length + ' skills found', 'success');
  }
}

async function savePersona() {
  const btn = document.getElementById('save-persona-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  const updates = {
    name:  document.getElementById('p-name')?.value,
    email: document.getElementById('p-email')?.value,
    title: document.getElementById('p-title')?.value,
    location: document.getElementById('p-location')?.value,
    skills: document.getElementById('p-skills')?.value.split(',').map(s => s.trim()).filter(Boolean),
    salary: [
      parseInt(document.getElementById('p-sal-min')?.value) || 0,
      parseInt(document.getElementById('p-sal-max')?.value) || 0,
    ],
    linkedin: document.getElementById('p-linkedin')?.value,
    company: document.getElementById('p-company')?.value,
  };
  Object.assign(APP.user, updates);
  APP.personaDirty = false;

  await api('draft', 'POST', { type: 'persona', data: updates });
  toast('Profile saved!', 'success');
  btn.textContent = 'Save Changes';
  btn.disabled = false;
}

async function syncLinkedIn() {
  const url = document.getElementById('p-linkedin')?.value;
  if (!url) { toast('Enter a LinkedIn URL first', 'warning'); return; }
  toast('Syncing LinkedIn...', 'info');
  const res = await api('linkedin-import', 'POST', { url });
  if (res.skills) {
    const input = document.getElementById('p-skills');
    if (input) input.value = res.skills.join(', ');
    toast('LinkedIn synced: ' + res.skills.length + ' skills updated', 'success');
  }
}

async function aiSuggestProfile() {
  const outEl = document.getElementById('ai-suggest-output');
  outEl.style.display = 'block';
  outEl.innerHTML = '<span class="loading-dots">Analyzing profile</span>';
  const res = await api('ai-suggest-profile');
  APP.lastAISuggest = res;
  outEl.innerHTML = `
    <div class="ai-output-card">
      <div class="ai-output-title">AI Profile Suggestions</div>
      ${res.headline ? `<div class="ai-row"><strong>Headline:</strong> ${res.headline}</div>` : ''}
      ${res.skills ? `<div class="ai-row"><strong>Add skills:</strong> ${res.skills.join(', ')}</div>` : ''}
      ${res.marketRate ? `<div class="ai-row"><strong>Market rate:</strong> ${formatSalaryRange(res.marketRate[0], res.marketRate[1])}</div>` : ''}
      <button class="btn btn-sm btn-primary" onclick="applyAISuggestions()">Apply Suggestions</button>
    </div>`;
}

async function getSkillSuggestions() {
  const skills = document.getElementById('p-skills')?.value || '';
  if (!skills) { toast('Add some skills first', 'warning'); return; }
  toast('Analyzing skills gap...', 'info');
  const res = await api('skill-taxonomy', 'POST', { skills });
  const outEl = document.getElementById('ai-suggest-output');
  outEl.style.display = 'block';
  outEl.innerHTML = `
    <div class="ai-output-card">
      <div class="ai-output-title">Related Skills to Add</div>
      <div class="skills-list">${(res.related || ['TypeScript','Docker','Kubernetes','Terraform']).map(s =>
        `<button class="skill-suggest-btn" onclick="addSkillSuggestion('${s}')">${s} +</button>`
      ).join('')}</div>
    </div>`;
}

async function viewMarketRate() {
  const skills = document.getElementById('p-skills')?.value || '';
  const res = await api('ai-suggest-profile', 'POST', { skills });
  toast(`Market rate: ${formatSalaryRange(res.marketRate?.[0] || 120000, res.marketRate?.[1] || 160000)}`, 'info', 5000);
}

function applyAISuggestions() {
  const sug = APP.lastAISuggest;
  if (!sug) return;
  if (sug.headline) {
    const titleEl = document.getElementById('p-title');
    if (titleEl) titleEl.value = sug.headline;
  }
  if (sug.skills) {
    const skillsEl = document.getElementById('p-skills');
    if (skillsEl) {
      const existing = skillsEl.value.split(',').map(s => s.trim()).filter(Boolean);
      const merged = [...new Set([...existing, ...sug.skills])];
      skillsEl.value = merged.join(', ');
    }
  }
  toast('AI suggestions applied!', 'success');
}

function copyReferral() {
  navigator.clipboard.writeText(APP.referralLink).then(() => toast('Referral link copied!', 'success'));
}

function showReferralModal() {
  showModal('Invite a Colleague', `
    <p>Share your referral link and earn priority matching for each colleague who joins.</p>
    <div class="input-btn-row" style="margin-top:12px">
      <input class="form-input" value="${APP.referralLink}" readonly onclick="this.select()">
      <button class="btn btn-primary" onclick="copyReferral();closeModal()">Copy Link</button>
    </div>`,
    [{ label: 'Close', action: closeModal }]
  );
}

// ─── Jobs Management ─────────────────────────────────────────
async function renderJobs() {
  const user = APP.user;
  if (!user) { navigate('landing'); return; }

  renderApp(`
    <div class="app-layout ${isMobile() ? 'mobile-layout' : ''}">
      ${navBar()}
      <main class="main-content">
        ${topBar('Job Listings', 'Manage your open positions')}
        <div class="page-body">
          <div class="filter-bar">
            <div>
              ${['All','Active','Paused','Closed','Draft'].map(s =>
                `<button class="filter-btn ${APP.jobFilter === (s === 'All' ? 'all' : s) ? 'filter-active' : ''}" onclick="setJobFilter('${s === 'All' ? 'all' : s}')">${s}</button>`
              ).join('')}
            </div>
            <button class="btn btn-primary" onclick="navigate('job-new')">+ New Job</button>
          </div>
          <div id="jobs-list" class="jobs-list">Loading...</div>
        </div>
      </main>
    </div>`);

  loadJobs();
}

function setJobFilter(f) {
  APP.jobFilter = f;
  renderJobs();
}

async function loadJobs() {
  try {
    const res = await api('jobs');
    const jobs = res.jobs || SAMPLE_JOBS;
    const filtered = APP.jobFilter === 'all' ? jobs : jobs.filter(j => j.status === APP.jobFilter);
    const el = document.getElementById('jobs-list');
    if (!el) return;
    if (!filtered.length) {
      el.innerHTML = `<div class="empty-state"><p>No jobs in this status.</p><button class="btn btn-primary" onclick="navigate('job-new')">Create First Job</button></div>`;
      return;
    }
    el.innerHTML = filtered.map(job => `
      <div class="job-item ${APP.expandedJob === job.id ? 'job-item-expanded' : ''}">
        <div class="job-item-header" onclick="toggleJobExpand('${job.id}')">
          <div class="job-item-info">
            <div class="job-item-title">${job.title}</div>
            <div class="job-item-meta">
              <span>${formatSalaryRange(job.salary[0], job.salary[1])}</span>
              <span>·</span>
              <span>${job.workModel}</span>
              <span>·</span>
              <span>${job.candidates} candidates</span>
              <span>·</span>
              <span>${job.matchRate}% match rate</span>
            </div>
          </div>
          <div class="job-item-right">
            ${pillStatus(job.status)}
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();navigate('job/${job.id}')">Edit</button>
          </div>
        </div>
        ${APP.expandedJob === job.id ? `
          <div class="job-item-body">
            <p>${job.description}</p>
            <div class="skills-list">${job.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>
            <div class="job-item-actions">
              <button class="btn btn-sm btn-primary" onclick="navigate('matches')">View Candidates</button>
              <button class="btn btn-sm btn-secondary" onclick="toggleJobStatus('${job.id}')">Toggle Status</button>
              <button class="btn btn-sm btn-ghost" onclick="duplicateJob('${job.id}')">Duplicate</button>
            </div>
          </div>` : ''}
      </div>`).join('');
  } catch (e) {
    console.error(e);
  }
}

function toggleJobExpand(id) {
  APP.expandedJob = APP.expandedJob === id ? null : id;
  loadJobs();
}

function toggleJobStatus(id) {
  const job = SAMPLE_JOBS.find(j => j.id === id);
  if (job) {
    job.status = job.status === 'Active' ? 'Paused' : 'Active';
    loadJobs();
    toast('Job status updated', 'info');
  }
}

function duplicateJob(id) {
  const job = SAMPLE_JOBS.find(j => j.id === id);
  if (job) {
    const newJob = { ...job, id: 'j' + Date.now(), title: job.title + ' (Copy)', status: 'Draft' };
    SAMPLE_JOBS.push(newJob);
    loadJobs();
    toast('Job duplicated as draft', 'success');
  }
}

// ─── Job Form ─────────────────────────────────────────────────
async function renderJobForm(jobId) {
  const user = APP.user;
  if (!user) { navigate('landing'); return; }

  const existingJob = jobId ? SAMPLE_JOBS.find(j => j.id === jobId) : null;
  const isNew = !existingJob;

  renderApp(`
    <div class="app-layout ${isMobile() ? 'mobile-layout' : ''}">
      ${navBar()}
      <main class="main-content">
        ${topBar(isNew ? 'Create Job' : 'Edit Job', isNew ? 'Post a new position' : existingJob.title)}
        <div class="page-body">
          <button class="back-btn" onclick="navigate('jobs')">← Back to Jobs</button>
          <div class="job-form-grid">

            <div class="job-form-main">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">${isNew ? 'New Job Listing' : 'Edit Listing'}</h3>
                  <div>
                    <button class="btn btn-ghost btn-sm" onclick="loadJobTemplate()">📋 Template</button>
                    <button class="btn btn-secondary btn-sm" onclick="aiSuggestJob()">✨ AI Assist</button>
                  </div>
                </div>
                <form id="job-form" onsubmit="saveJob(event)">
                  <div class="form-group">
                    <label class="form-label">Job Title *</label>
                    <input class="form-input" id="j-title" placeholder="Senior ML Engineer" value="${existingJob?.title || ''}" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Job Description *</label>
                    <textarea class="form-textarea" id="j-desc" rows="6" placeholder="Describe the role, responsibilities, and team..." required>${existingJob?.description || ''}</textarea>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Min Salary</label>
                      <input class="form-input" type="number" id="j-sal-min" placeholder="120000" value="${existingJob?.salary?.[0] || ''}">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Max Salary</label>
                      <input class="form-input" type="number" id="j-sal-max" placeholder="200000" value="${existingJob?.salary?.[1] || ''}">
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Required Skills</label>
                    <input class="form-input" id="j-skills" placeholder="Python, Machine Learning, AWS..." value="${(existingJob?.skills || []).join(', ')}">
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Work Model</label>
                      <select class="form-select" id="j-workmodel">
                        ${['Remote','Hybrid','On-site'].map(v =>
                          `<option ${existingJob?.workModel === v ? 'selected' : ''}>${v}</option>`
                        ).join('')}
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Status</label>
                      <select class="form-select" id="j-status">
                        ${['Active','Paused','Draft'].map(v =>
                          `<option ${existingJob?.status === v ? 'selected' : ''}>${v}</option>`
                        ).join('')}
                      </select>
                    </div>
                  </div>
                  <div class="form-actions">
                    <button type="submit" class="btn btn-primary" id="save-job-btn">${isNew ? 'Post Job' : 'Save Changes'}</button>
                    <button type="button" class="btn btn-ghost" onclick="saveDraft()">Save Draft</button>
                    ${!isNew ? `<button type="button" class="btn btn-ghost" style="color:#dc2626" onclick="deleteJob('${existingJob?.id}')">Delete</button>` : ''}
                  </div>
                </form>
              </div>
            </div>

            <!-- Right Panel -->
            <div class="job-form-right">
              <div class="card">
                <h3 class="card-title">Job Validation</h3>
                <div id="validation-panel" class="validation-panel">
                  <button class="btn btn-secondary btn-full" onclick="validateJob()">Run Validation</button>
                </div>
              </div>
              <div class="card" style="margin-top:16px">
                <h3 class="card-title">AI Suggestions</h3>
                <div id="job-ai-output" class="ai-output" style="display:none"></div>
                <button class="btn btn-secondary btn-full" onclick="aiSuggestJob()">✨ Get AI Help</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>`);
}

async function aiSuggestJob() {
  const title = document.getElementById('j-title')?.value;
  if (!title) { toast('Enter a job title first', 'warning'); return; }
  toast('Generating AI suggestions...', 'info');
  const res = await api('ai-suggest-job', 'POST', { title });
  const outEl = document.getElementById('job-ai-output');
  if (outEl) {
    outEl.style.display = 'block';
    outEl.innerHTML = `
      <div class="ai-output-card">
        <div class="ai-output-title">AI Suggestions for "${title}"</div>
        ${res.description ? `<div class="ai-row"><strong>Description:</strong> <button class="btn btn-sm btn-ghost" onclick="applyJobDesc()">Apply</button></div>` : ''}
        ${res.skills ? `<div class="ai-row"><strong>Skills:</strong> ${res.skills.join(', ')} <button class="btn btn-sm btn-ghost" onclick="applyJobSkills('${res.skills.join(',')}')">Apply</button></div>` : ''}
        ${res.salary ? `<div class="ai-row"><strong>Salary:</strong> ${formatSalaryRange(res.salary[0], res.salary[1])}</div>` : ''}
      </div>`;
  }
  window._lastJobSuggest = res;
}

function applyJobDesc() {
  const res = window._lastJobSuggest;
  if (res?.description) {
    document.getElementById('j-desc').value = res.description;
    toast('Description applied', 'success');
  }
}

function applyJobSkills(skillStr) {
  document.getElementById('j-skills').value = skillStr.replace(/,/g, ', ');
  toast('Skills applied', 'success');
}

async function loadJobTemplate() {
  const res = await api('job-templates');
  const templates = res.templates || [];
  showModal('Job Templates', `
    <div class="template-list">
      ${templates.map(t => `
        <div class="template-item" onclick="applyTemplate(${JSON.stringify(t).replace(/"/g, '&quot;')})">
          <strong>${t.title}</strong>
          <span>${t.skills.join(', ')}</span>
          <span>${formatSalaryRange(t.salary[0], t.salary[1])}</span>
        </div>`).join('')}
    </div>`,
    [{ label: 'Close', action: closeModal }]
  );
}

function applyTemplate(t) {
  document.getElementById('j-title').value = t.title;
  document.getElementById('j-skills').value = t.skills.join(', ');
  document.getElementById('j-sal-min').value = t.salary[0];
  document.getElementById('j-sal-max').value = t.salary[1];
  closeModal();
  toast('Template applied', 'success');
}

async function validateJob() {
  const title = document.getElementById('j-title')?.value;
  const desc  = document.getElementById('j-desc')?.value;
  if (!title || !desc) { toast('Fill in title and description first', 'warning'); return; }
  const res = await api('validate-record', 'POST', { type: 'job', title, desc });
  const panel = document.getElementById('validation-panel');
  if (panel) {
    panel.innerHTML = `
      <div class="validation-results">
        ${(res.errors || []).map(e => `<div class="val-error">✗ ${e.msg}</div>`).join('')}
        ${(res.warnings || []).map(w => `<div class="val-warning">⚠ ${w.msg}</div>`).join('')}
        ${(res.suggestions || []).map(s => `<div class="val-suggest">💡 ${s.msg}</div>`).join('')}
        ${!res.errors?.length ? '<div class="val-ok">✓ No errors found</div>' : ''}
      </div>`;
  }
}

async function saveJob(e) {
  e.preventDefault();
  const btn = document.getElementById('save-job-btn');
  btn.disabled = true; btn.textContent = 'Saving...';
  const job = {
    title:     document.getElementById('j-title').value,
    description: document.getElementById('j-desc').value,
    salary:    [parseInt(document.getElementById('j-sal-min').value)||0, parseInt(document.getElementById('j-sal-max').value)||0],
    skills:    document.getElementById('j-skills').value.split(',').map(s=>s.trim()).filter(Boolean),
    workModel: document.getElementById('j-workmodel').value,
    status:    document.getElementById('j-status').value,
    posted:    new Date().toISOString().slice(0,10),
    candidates: 0,
    matchRate: 0,
  };
  await api('draft', 'POST', { type: 'job', data: job });
  toast('Job posted successfully!', 'success');
  navigate('jobs');
}

async function saveDraft() {
  await api('draft', 'POST', { type: 'job', draft: true, title: document.getElementById('j-title')?.value });
  toast('Draft saved', 'info');
}

function deleteJob(id) {
  showModal('Delete Job?', '<p>This will permanently delete the job listing. This action cannot be undone.</p>',
    [
      { label: 'Delete', action: () => {
        const idx = SAMPLE_JOBS.findIndex(j => j.id === id);
        if (idx !== -1) SAMPLE_JOBS.splice(idx, 1);
        toast('Job deleted', 'info');
        closeModal();
        navigate('jobs');
      }},
      { label: 'Cancel', primary: true, action: closeModal },
    ]
  );
}

// ─── Settings ────────────────────────────────────────────────
function renderSettings() {
  const user = APP.user;
  if (!user) { navigate('landing'); return; }

  renderApp(`
    <div class="app-layout ${isMobile() ? 'mobile-layout' : ''}">
      ${navBar()}
      <main class="main-content">
        ${topBar('Settings', 'Manage your account and agent')}
        <div class="page-body">
          <div class="settings-grid">

            <!-- Agent Settings -->
            <div class="card">
              <h3 class="card-title">Agent Settings</h3>
              <div class="setting-row">
                <div>
                  <div class="setting-label">Agent Status</div>
                  <div class="setting-desc">Enable or pause your AI agent</div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="agent-status" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="setting-row">
                <div>
                  <div class="setting-label">Auto-Accept Matches</div>
                  <div class="setting-desc">Agent auto-accepts matches above 90% score</div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="auto-accept">
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="setting-row">
                <div>
                  <div class="setting-label">Match Threshold</div>
                  <div class="setting-desc">Minimum score to surface a match</div>
                </div>
                <div class="setting-control">
                  <input type="range" id="match-threshold" min="50" max="95" value="70" class="slider" oninput="document.getElementById('threshold-val').textContent=this.value+'%'">
                  <span id="threshold-val">70%</span>
                </div>
              </div>
              <div class="setting-row">
                <div>
                  <div class="setting-label">Negotiation Autonomy</div>
                  <div class="setting-desc">How far agent can negotiate without asking you</div>
                </div>
                <select class="form-select" style="width:160px">
                  <option>Conservative (±5%)</option>
                  <option selected>Moderate (±10%)</option>
                  <option>Aggressive (±20%)</option>
                </select>
              </div>
            </div>

            <!-- Notification Settings -->
            <div class="card">
              <h3 class="card-title">Notifications</h3>
              ${[
                ['New Match Found', 'new-match', true],
                ['Interview Request', 'interview-req', true],
                ['Negotiation Update', 'neg-update', true],
                ['Agent Weekly Digest', 'weekly-digest', true],
                ['Profile View Alert', 'profile-view', false],
                ['Market Pulse Report', 'market-pulse', false],
              ].map(([label, id, checked]) => `
                <div class="setting-row">
                  <div class="setting-label">${label}</div>
                  <label class="toggle-switch">
                    <input type="checkbox" id="notif-${id}" ${checked ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                </div>`).join('')}
            </div>

            <!-- Privacy Settings -->
            <div class="card">
              <h3 class="card-title">Privacy & Data</h3>
              <div class="setting-row">
                <div>
                  <div class="setting-label">Anonymous Mode</div>
                  <div class="setting-desc">Hide your identity until match is confirmed</div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="anon-mode" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="setting-row">
                <div>
                  <div class="setting-label">Data Export</div>
                  <div class="setting-desc">Download all your data as JSON</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="exportData()">Export</button>
              </div>
              <div class="setting-row">
                <div>
                  <div class="setting-label">Delete Account</div>
                  <div class="setting-desc">Permanently delete account and data</div>
                </div>
                <button class="btn btn-sm" style="color:#dc2626;border-color:#dc2626" onclick="confirmDelete()">Delete</button>
              </div>
            </div>

            <!-- Security -->
            <div class="card">
              <h3 class="card-title">Security</h3>
              <div class="form-group">
                <label class="form-label">Current Password</label>
                <input class="form-input" type="password" id="cur-pw" placeholder="••••••••">
              </div>
              <div class="form-group">
                <label class="form-label">New Password</label>
                <input class="form-input" type="password" id="new-pw" placeholder="Min 8 characters" minlength="8">
              </div>
              <div class="form-group">
                <label class="form-label">Confirm New Password</label>
                <input class="form-input" type="password" id="conf-pw" placeholder="Repeat new password">
              </div>
              <button class="btn btn-primary" onclick="changePassword()">Update Password</button>
            </div>

          </div>
        </div>
      </main>
    </div>`);
}

function exportData() {
  const data = JSON.stringify({ user: APP.user, matches: SAMPLE_MATCHES, jobs: SAMPLE_JOBS }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'agenthire-data.json'; a.click();
  URL.revokeObjectURL(url);
  toast('Data exported', 'success');
}

function confirmDelete() {
  showModal('Delete Account?', '<p>This will permanently delete your account and all data. This cannot be undone.</p>',
    [
      { label: 'Delete Account', action: () => { logout(); closeModal(); toast('Account deleted', 'info'); }},
      { label: 'Cancel', primary: true, action: closeModal },
    ]
  );
}

function changePassword() {
  const cur  = document.getElementById('cur-pw')?.value;
  const newP = document.getElementById('new-pw')?.value;
  const conf = document.getElementById('conf-pw')?.value;
  if (!cur || !newP || !conf) { toast('Fill all fields', 'warning'); return; }
  if (newP !== conf) { toast('Passwords do not match', 'error'); return; }
  if (newP.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
  toast('Password updated successfully', 'success');
}

// ─── Leaderboard ─────────────────────────────────────────────
async function renderLeaderboard() {
  const user = APP.user;
  if (!user) { navigate('landing'); return; }

  renderApp(`
    <div class="app-layout ${isMobile() ? 'mobile-layout' : ''}">
      ${navBar()}
      <main class="main-content">
        ${topBar('Leaderboard', 'Top performers this week')}
        <div class="page-body">
          <div id="leaderboard-content">Loading...</div>
        </div>
      </main>
    </div>`);

  const res = await api('leaderboard');
  const entries = res.entries || [];
  const el = document.getElementById('leaderboard-content');
  if (!el) return;
  el.innerHTML = `
    <div class="card">
      <table class="leaderboard-table">
        <thead><tr><th>Rank</th><th>Area</th><th>Matches</th><th>Avg Score</th><th>Badges</th></tr></thead>
        <tbody>
          ${entries.map(e => `
            <tr class="${e.rank <= 3 ? 'lb-top-' + e.rank : ''}">
              <td class="lb-rank">${e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank}</td>
              <td>${e.area}</td>
              <td>${e.matches}</td>
              <td>${e.avgScore}%</td>
              <td>${e.badges.map(b => `<span class="badge-tag">${b}</span>`).join('')}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ─── Privacy Page ─────────────────────────────────────────────
function renderPrivacyPage() {
  renderApp(`
    <div class="content-page">
      <div class="content-page-header">
        <button class="back-btn" onclick="history.back()">← Back</button>
        <h1>Privacy Policy</h1>
      </div>
      <div class="content-body">
        <h2>1. Information We Collect</h2>
        <p>AgentHire collects information you provide directly to us, such as when you create an account, set up your agent persona, or contact us for support. This includes name, email address, professional profile data, and preferences.</p>
        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to operate and improve AgentHire, match you with relevant opportunities or candidates via our AI agents, and communicate updates and service notices.</p>
        <h2>3. Data Sharing</h2>
        <p>We do not sell your personal data. Your identity is kept anonymous until both parties' agents agree to proceed with a match. Only then is limited profile information shared with the matched party.</p>
        <h2>4. Agent Data</h2>
        <p>Agent activity logs — including negotiations, evaluations, and actions taken on your behalf — are stored securely and accessible only to you. You can export or delete this data at any time from Settings.</p>
        <h2>5. Security</h2>
        <p>We use industry-standard encryption and access controls. All data is transmitted over HTTPS. Passwords are hashed and never stored in plain text.</p>
        <h2>6. Your Rights</h2>
        <p>You have the right to access, correct, export, or delete your personal data at any time. Contact us at privacy@agenthire.ai or use the in-app data tools in Settings.</p>
        <h2>7. Contact</h2>
        <p>For privacy-related questions: privacy@agenthire.ai</p>
        <p class="form-hint">Last updated: February 2026</p>
      </div>
    </div>`);
}

// ─── AI Chat Bubble ───────────────────────────────────────────
function renderAIChatBubble() {
  return `
    <div id="ai-chat-bubble" class="ai-chat-bubble">
      <button class="ai-chat-trigger" onclick="toggleChat()" aria-label="AI Assistant">
        <span class="ai-chat-icon">🤖</span>
      </button>
      <div class="ai-chat-window" id="ai-chat-window" style="display:none">
        <div class="ai-chat-header">
          <span>AgentHire AI</span>
          <button onclick="toggleChat()" class="ai-chat-close">✕</button>
        </div>
        <div class="ai-chat-messages" id="ai-chat-messages">
          <div class="ai-msg ai-msg-bot">Hi! I'm your AgentHire AI assistant. Ask me anything about your matches, profile, or job search strategy.</div>
        </div>
        <div class="ai-chat-input-row">
          <input class="ai-chat-input" id="ai-chat-input" placeholder="Ask anything..." onkeydown="if(event.key==='Enter')sendChatMessage()">
          <button class="ai-chat-send" onclick="sendChatMessage()">→</button>
        </div>
      </div>
    </div>`;
}

function toggleChat() {
  APP.chatOpen = !APP.chatOpen;
  const win = document.getElementById('ai-chat-window');
  if (win) win.style.display = APP.chatOpen ? 'flex' : 'none';
}

async function sendChatMessage() {
  const input = document.getElementById('ai-chat-input');
  const msg = input?.value?.trim();
  if (!msg) return;
  input.value = '';

  const msgsEl = document.getElementById('ai-chat-messages');
  if (!msgsEl) return;

  // Add user message
  msgsEl.innerHTML += `<div class="ai-msg ai-msg-user">${msg}</div>`;
  msgsEl.innerHTML += `<div class="ai-msg ai-msg-bot" id="ai-typing"><span class="loading-dots">Thinking</span></div>`;
  msgsEl.scrollTop = msgsEl.scrollHeight;

  const res = await api('ai-chat-assist', 'POST', { message: msg, context: APP.route });

  const typingEl = document.getElementById('ai-typing');
  if (typingEl) typingEl.innerHTML = res.answer || 'I can help with that!';
  msgsEl.scrollTop = msgsEl.scrollHeight;

  APP.chatMessages.push({ role: 'user', content: msg });
  APP.chatMessages.push({ role: 'bot', content: res.answer });
}

// ─── Notifications ────────────────────────────────────────────
function showNotifications() {
  showModal('Notifications', `
    <div class="notifications-list">
      <div class="notif-item notif-unread">
        <div class="notif-icon" style="background:#0d948820">🎯</div>
        <div class="notif-body">
          <div class="notif-title">New high-confidence match</div>
          <div class="notif-desc">TechNovate AI — Head of AI Research (94%)</div>
          <div class="notif-time">2 minutes ago</div>
        </div>
      </div>
      <div class="notif-item notif-unread">
        <div class="notif-icon" style="background:#7c3aed20">💬</div>
        <div class="notif-body">
          <div class="notif-title">Negotiation update</div>
          <div class="notif-desc">Meridian Systems agent responded — salary window found</div>
          <div class="notif-time">18 minutes ago</div>
        </div>
      </div>
      <div class="notif-item">
        <div class="notif-icon" style="background:#d9770620">⚡</div>
        <div class="notif-body">
          <div class="notif-title">Agent milestone</div>
          <div class="notif-desc">Your agent reviewed 103 postings this morning</div>
          <div class="notif-time">8 hours ago</div>
        </div>
      </div>
    </div>`,
    [{ label: 'Mark All Read', action: closeModal }]
  );
}

function showTrustDetail() {
  showModal('Trust Score Details', `
    <div class="trust-detail">
      <div class="trust-detail-header">${matchRing(APP.user?.trust || 94, 80)}</div>
      <p>Your trust score reflects verification, activity quality, and response rates. Higher scores unlock premium matching.</p>
      <div class="trust-breakdown">
        <div class="trust-row"><span>Email Verification</span><span>+20pts</span></div>
        <div class="trust-row"><span>Profile Completeness</span><span>+15pts</span></div>
        <div class="trust-row"><span>Response Rate 97%</span><span>+12pts</span></div>
        <div class="trust-row"><span>Match Activity</span><span>+10pts</span></div>
        <div class="trust-row"><span>No violations</span><span>+10pts</span></div>
      </div>
      <p class="form-hint">Add LinkedIn or GitHub to boost by up to 15 points.</p>
    </div>`,
    [{ label: 'Close', action: closeModal }]
  );
}

// ─── Utility Functions ────────────────────────────────────────
function logout() {
  clearTimeout(APP.inactivityTimer);
  clearInterval(APP.autoSaveInterval);
  APP.user = null;
  APP.token = null;
  APP.route = 'landing';
  APP.onboardingStep = 0;
  APP.onboardingData = {};
  navigate('landing');
  toast('Signed out successfully', 'info');
}

function toggleMobileNav() {
  document.querySelector('.mobile-nav')?.classList.toggle('mobile-nav-open');
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Auto-Save ────────────────────────────────────────────────
APP.autoSaveInterval = setInterval(async () => {
  if (APP.user && APP.personaDirty) {
    await api('draft', 'POST', { type: 'auto-save', user: APP.user });
    // Don't reset dirty flag on auto-save — only explicit save does that
  }
}, 30000);

// ─── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  handleRoute();
});

if (document.readyState !== 'loading') {
  handleRoute();
}

// ─── Styles ───────────────────────────────────────────────────
(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `

  /* ── Reset & Base ──────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 16px; -webkit-text-size-adjust: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: #f8fafc;
    color: #1e293b;
    min-height: 100vh;
    line-height: 1.5;
  }
  a { color: inherit; text-decoration: none; }
  button { cursor: pointer; border: none; background: none; font: inherit; }
  input, select, textarea { font: inherit; }
  img { max-width: 100%; }

  /* ── Layout ─────────────────────────────────────────── */
  #app { min-height: 100vh; }
  .app-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    min-height: 100vh;
  }
  .main-content {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    overflow-x: hidden;
  }
  .page-body {
    padding: 24px;
    flex: 1;
  }

  /* ── Sidebar ────────────────────────────────────────── */
  .sidebar {
    background: #fff;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: sticky;
    top: 0;
    overflow-y: auto;
  }
  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 20px 16px;
    border-bottom: 1px solid #e2e8f0;
  }
  .logo-mark {
    background: linear-gradient(135deg, #0d9488, #0891b2);
    color: #fff;
    font-weight: 800;
    font-size: 14px;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .logo-mark-sm { width: 24px; height: 24px; font-size: 10px; border-radius: 6px; }
  .logo-name { font-weight: 700; font-size: 15px; color: #0f172a; }
  .logo-version { font-size: 11px; color: #94a3b8; }
  .sidebar-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
  }
  .sidebar-user-name { font-weight: 600; font-size: 13px; }
  .sidebar-user-role { font-size: 11px; color: #64748b; }
  .sidebar-nav { flex: 1; padding: 12px 12px; display: flex; flex-direction: column; gap: 2px; }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 14px;
    color: #475569;
    font-weight: 500;
    transition: all 0.15s;
  }
  .nav-item:hover { background: #f1f5f9; color: #0f172a; }
  .nav-active { background: #f0fdfa; color: #0d9488; }
  .nav-icon { display: flex; align-items: center; }
  .sidebar-footer {
    padding: 16px 20px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sidebar-referral {
    font-size: 13px;
    color: #0d9488;
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .sidebar-referral:hover { background: #f0fdfa; }
  .sidebar-logout {
    font-size: 13px;
    color: #64748b;
    padding: 6px;
    border-radius: 6px;
    text-align: left;
  }
  .sidebar-logout:hover { background: #fee2e2; color: #dc2626; }

  /* ── Top Bar ────────────────────────────────────────── */
  .top-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 24px;
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .top-bar-title { flex: 1; }
  .page-title { font-size: 20px; font-weight: 700; color: #0f172a; }
  .page-subtitle { font-size: 13px; color: #64748b; }
  .top-bar-actions { display: flex; align-items: center; gap: 12px; }
  .notif-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    color: #475569;
  }
  .notif-btn:hover { background: #f1f5f9; }
  .notif-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 16px;
    height: 16px;
    background: #dc2626;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .top-bar-avatar { cursor: pointer; border-radius: 50%; overflow: hidden; }

  /* ── Avatar ─────────────────────────────────────────── */
  .avatar {
    border-radius: 50%;
    color: #fff;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  /* ── Cards ──────────────────────────────────────────── */
  .card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
  }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .card-title { font-size: 15px; font-weight: 700; color: #0f172a; }

  /* ── Buttons ────────────────────────────────────────── */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.15s;
    border: 1.5px solid transparent;
    white-space: nowrap;
  }
  .btn-primary { background: #0d9488; color: #fff; border-color: #0d9488; }
  .btn-primary:hover { background: #0f766e; border-color: #0f766e; }
  .btn-secondary { background: #fff; color: #374151; border-color: #d1d5db; }
  .btn-secondary:hover { background: #f9fafb; }
  .btn-ghost { color: #64748b; }
  .btn-ghost:hover { background: #f1f5f9; color: #0f172a; }
  .btn-full { width: 100%; }
  .btn-sm { padding: 5px 11px; font-size: 12px; border-radius: 6px; }
  .btn-lg { padding: 12px 24px; font-size: 16px; border-radius: 10px; }

  /* ── Forms ──────────────────────────────────────────── */
  .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
  .form-label { font-size: 13px; font-weight: 600; color: #374151; }
  .form-hint { font-size: 12px; color: #94a3b8; }
  .form-input {
    padding: 9px 12px;
    border: 1.5px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    color: #1e293b;
    background: #fff;
    outline: none;
    transition: border-color 0.15s;
  }
  .form-input:focus { border-color: #0d9488; box-shadow: 0 0 0 3px #0d948820; }
  .form-select {
    padding: 9px 12px;
    border: 1.5px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    color: #1e293b;
    background: #fff;
    outline: none;
    cursor: pointer;
  }
  .form-select:focus { border-color: #0d9488; }
  .form-textarea {
    padding: 9px 12px;
    border: 1.5px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    color: #1e293b;
    background: #fff;
    outline: none;
    resize: vertical;
    min-height: 100px;
  }
  .form-textarea:focus { border-color: #0d9488; box-shadow: 0 0 0 3px #0d948820; }
  .form-error { color: #dc2626; font-size: 13px; padding: 8px; background: #fef2f2; border-radius: 6px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .form-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
  .input-btn-row { display: flex; gap: 8px; }
  .input-btn-row .form-input { flex: 1; }

  /* ── Pills & Badges ─────────────────────────────────── */
  .pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
  }
  .pill-green  { background: #d1fae5; color: #059669; }
  .pill-amber  { background: #fef3c7; color: #d97706; }
  .pill-gray   { background: #f1f5f9; color: #64748b; }
  .pill-blue   { background: #dbeafe; color: #2563eb; }
  .trust-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid;
  }
  .live-badge {
    font-size: 11px;
    font-weight: 600;
    color: #059669;
    animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
  .badge-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #059669;
    background: #d1fae5;
    padding: 2px 8px;
    border-radius: 9999px;
    font-weight: 600;
  }
  .badge-tag {
    background: #dbeafe;
    color: #2563eb;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 9999px;
    font-weight: 600;
  }
  .skill-tag {
    background: #f0fdfa;
    color: #0d9488;
    border: 1px solid #99f6e4;
    padding: 2px 10px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 500;
  }
  .reason-tag {
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 12px;
  }
  .skills-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }

  /* ── Stats ──────────────────────────────────────────── */
  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .stat-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .stat-card-icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  .stat-card-num { font-size: 24px; font-weight: 800; color: #0f172a; }
  .stat-card-label { font-size: 12px; color: #64748b; font-weight: 500; }

  /* ── Dashboard Grid ─────────────────────────────────── */
  .dash-grid { display: grid; grid-template-columns: 1fr 340px; gap: 20px; }
  .dash-right { display: flex; flex-direction: column; gap: 16px; }

  /* ── Feed ───────────────────────────────────────────── */
  .agent-feed { display: flex; flex-direction: column; gap: 10px; }
  .feed-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; }
  .feed-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 4px;
  }
  .feed-dot-matched    { background: #0d9488; }
  .feed-dot-negotiating { background: #7c3aed; }
  .feed-dot-reviewed   { background: #2563eb; }
  .feed-dot-declined   { background: #dc2626; }
  .feed-dot-milestone  { background: #d97706; }
  .feed-msg { flex: 1; color: #374151; }
  .feed-time { color: #94a3b8; white-space: nowrap; font-size: 12px; }

  /* ── Trust Score ────────────────────────────────────── */
  .trust-score-big { display: flex; align-items: center; gap: 20px; }
  .trust-breakdown { display: flex; flex-direction: column; gap: 8px; flex: 1; }
  .trust-row { display: flex; justify-content: space-between; font-size: 13px; color: #475569; }

  /* ── Profile Completeness ───────────────────────────── */
  .progress-bar-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; }
  .progress-bar { height: 8px; background: #e2e8f0; border-radius: 9999px; overflow: hidden; margin-bottom: 12px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #0d9488, #0891b2); border-radius: 9999px; transition: width 0.5s; }
  .completeness-tip { font-size: 12px; color: #64748b; padding: 4px 0; }

  /* ── Match Card ─────────────────────────────────────── */
  .matches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
  .match-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .match-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-color: #0d9488; transform: translateY(-1px); }
  .match-card-header { display: flex; align-items: center; justify-content: space-between; }
  .match-card-title { font-size: 15px; font-weight: 700; color: #0f172a; }
  .match-card-company { font-size: 13px; color: #64748b; }
  .match-card-reasons { display: flex; flex-wrap: wrap; gap: 6px; }
  .match-card-footer { display: flex; align-items: center; justify-content: space-between; }
  .match-confidence { font-size: 12px; font-weight: 600; }
  .match-conf-high { color: #059669; }
  .match-conf-moderate { color: #d97706; }
  .match-conf-low { color: #dc2626; }

  /* ── Match Detail ───────────────────────────────────── */
  .match-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .match-detail-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .match-detail-title { font-size: 20px; font-weight: 700; }
  .match-detail-company { font-size: 14px; color: #64748b; margin-bottom: 6px; }
  .match-detail-reasons { margin-bottom: 20px; }
  .match-detail-reasons h4 { font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  .reason-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 14px; color: #374151; border-bottom: 1px solid #f1f5f9; }
  .match-detail-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .job-detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  .job-detail-skills { margin-top: 12px; }
  .job-description { font-size: 14px; color: #475569; margin-top: 12px; line-height: 1.6; }
  .conf-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .conf-label { font-size: 13px; color: #475569; min-width: 110px; }
  .conf-bar { flex: 1; height: 8px; background: #e2e8f0; border-radius: 9999px; overflow: hidden; }
  .conf-fill { height: 100%; border-radius: 9999px; transition: width 0.5s; }
  .conf-val { font-size: 12px; font-weight: 600; color: #374151; min-width: 36px; text-align: right; }

  /* ── Negotiation Log ────────────────────────────────── */
  .negotiation-log { display: flex; flex-direction: column; gap: 12px; }
  .neg-entry { padding: 12px; border-radius: 8px; font-size: 13px; }
  .neg-entry-candidate { background: #f0fdfa; border-left: 3px solid #0d9488; }
  .neg-entry-recruiter { background: #faf5ff; border-left: 3px solid #7c3aed; }
  .neg-entry-system { background: #f8fafc; border-left: 3px solid #94a3b8; }
  .neg-agent { font-weight: 700; margin-bottom: 4px; color: #0f172a; }
  .neg-time { font-size: 11px; color: #94a3b8; font-weight: 400; margin-left: 8px; }
  .neg-msg { color: #475569; line-height: 1.5; }

  /* ── Filter Bar ─────────────────────────────────────── */
  .filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .filter-btn {
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    background: #fff;
    border: 1.5px solid #e2e8f0;
  }
  .filter-btn:hover { border-color: #0d9488; color: #0d9488; }
  .filter-active { background: #0d9488; color: #fff; border-color: #0d9488; }

  /* ── Jobs ───────────────────────────────────────────── */
  .jobs-list { display: flex; flex-direction: column; gap: 12px; }
  .job-item {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
  }
  .job-item-expanded { border-color: #0d9488; }
  .job-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .job-item-header:hover { background: #f8fafc; }
  .job-item-title { font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .job-item-meta { font-size: 13px; color: #64748b; display: flex; gap: 8px; flex-wrap: wrap; }
  .job-item-right { display: flex; align-items: center; gap: 10px; }
  .job-item-body { padding: 16px 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
  .job-item-body p { font-size: 14px; color: #475569; margin-bottom: 12px; }
  .job-item-actions { display: flex; gap: 8px; margin-top: 12px; }
  .job-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
  }
  .job-row:last-child { border-bottom: none; }
  .job-row:hover .job-row-title { color: #0d9488; }
  .job-row-title { font-weight: 600; font-size: 14px; }
  .job-row-meta { font-size: 12px; color: #64748b; margin-top: 2px; }
  .job-row-right { display: flex; align-items: center; gap: 10px; }
  .job-row-salary { font-size: 13px; font-weight: 600; color: #374151; }

  /* ── Job Form ───────────────────────────────────────── */
  .job-form-grid { display: grid; grid-template-columns: 1fr 300px; gap: 20px; }
  .validation-panel { font-size: 13px; }
  .val-error   { color: #dc2626; padding: 4px 0; }
  .val-warning { color: #d97706; padding: 4px 0; }
  .val-suggest { color: #2563eb; padding: 4px 0; }
  .val-ok      { color: #059669; padding: 4px 0; }
  .template-list { display: flex; flex-direction: column; gap: 10px; }
  .template-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
  }
  .template-item:hover { border-color: #0d9488; background: #f0fdfa; }

  /* ── Persona ────────────────────────────────────────── */
  .persona-grid { display: grid; grid-template-columns: 300px 1fr; gap: 20px; }
  .persona-card { text-align: center; }
  .persona-avatar-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; text-align: left; }
  .persona-name { font-size: 18px; font-weight: 700; }
  .persona-role { font-size: 13px; color: #64748b; margin-bottom: 6px; }
  .persona-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0; text-align: center; }
  .pstat-num { font-size: 22px; font-weight: 800; color: #0d9488; }
  .pstat-label { font-size: 11px; color: #64748b; }
  .persona-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  .referral-row { display: flex; gap: 8px; margin-top: 8px; }
  .skill-suggestions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .skill-suggest-btn {
    padding: 3px 10px;
    background: #f0fdfa;
    color: #0d9488;
    border: 1px solid #99f6e4;
    border-radius: 9999px;
    font-size: 12px;
    cursor: pointer;
  }
  .skill-suggest-btn:hover { background: #ccfbf1; }
  .file-upload-row { display: flex; align-items: center; gap: 10px; }
  .ai-assist-panel { display: flex; flex-wrap: wrap; gap: 8px; }
  .ai-output { margin-top: 12px; }
  .ai-output-card {
    background: #f0fdfa;
    border: 1px solid #99f6e4;
    border-radius: 8px;
    padding: 14px;
    font-size: 13px;
  }
  .ai-output-title { font-weight: 700; color: #0d9488; margin-bottom: 8px; }
  .ai-row { padding: 4px 0; color: #374151; }

  /* ── Settings ───────────────────────────────────────── */
  .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    border-bottom: 1px solid #f1f5f9;
    gap: 16px;
  }
  .setting-row:last-child { border-bottom: none; }
  .setting-label { font-size: 14px; font-weight: 600; color: #0f172a; }
  .setting-desc { font-size: 12px; color: #64748b; margin-top: 2px; }
  .setting-control { display: flex; align-items: center; gap: 10px; }
  .slider {
    width: 120px;
    accent-color: #0d9488;
  }
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    flex-shrink: 0;
  }
  .toggle-switch input { opacity: 0; width: 0; height: 0; }
  .toggle-slider {
    position: absolute;
    inset: 0;
    background: #d1d5db;
    border-radius: 9999px;
    cursor: pointer;
    transition: 0.2s;
  }
  .toggle-slider:before {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    bottom: 3px;
    left: 3px;
    transition: 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  input:checked + .toggle-slider { background: #0d9488; }
  input:checked + .toggle-slider:before { transform: translateX(20px); }

  /* ── Leaderboard ────────────────────────────────────── */
  .leaderboard-table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .leaderboard-table th {
    text-align: left;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #e2e8f0;
  }
  .leaderboard-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
  .lb-rank { font-size: 18px; }
  .lb-top-1 td { background: #fefce8; }
  .lb-top-2 td { background: #f8fafc; }
  .lb-top-3 td { background: #fff7ed; }

  /* ── Auth ───────────────────────────────────────────── */
  .auth-layout {
    min-height: 100vh;
    background: linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .auth-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 32px;
  }
  .auth-brand-name { font-size: 20px; font-weight: 800; color: #0f172a; }
  .auth-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 32px;
    width: 100%;
    max-width: 440px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }
  .auth-card-wide { max-width: 560px; }
  .auth-title { font-size: 22px; font-weight: 800; text-align: center; margin-bottom: 4px; }
  .auth-sub { font-size: 14px; color: #64748b; text-align: center; margin-bottom: 24px; }
  .auth-switch { text-align: center; font-size: 13px; color: #64748b; margin-top: 16px; }
  .auth-switch a { color: #0d9488; font-weight: 600; }
  .auth-legal { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 8px; }
  .auth-legal a { color: #0d9488; }
  .demo-accounts-panel {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 20px;
  }
  .demo-panel-title { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
  .demo-accounts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .demo-account-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    font-size: 12px;
    transition: border-color 0.15s;
  }
  .demo-account-btn:hover { border-color: #0d9488; background: #f0fdfa; }
  .demo-account-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .demo-account-name { font-weight: 600; flex: 1; text-align: left; }
  .demo-account-role { font-size: 10px; color: #94a3b8; }

  /* ── Role Selector ───────────────────────────────────── */
  .role-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .role-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 16px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
    cursor: pointer;
    transition: all 0.15s;
  }
  .role-btn:hover { border-color: #0d9488; }
  .role-active { border-color: #0d9488; background: #f0fdfa; }
  .role-icon { font-size: 24px; }
  .role-label { font-weight: 700; font-size: 14px; }
  .role-desc { font-size: 12px; color: #64748b; }

  /* ── Onboarding ─────────────────────────────────────── */
  .onboarding-layout { min-height: 100vh; background: #f8fafc; }
  .onboarding-header {
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    padding: 20px 24px;
    display: flex;
    align-items: center;
    gap: 24px;
  }
  .ob-steps { display: flex; align-items: center; gap: 0; flex: 1; }
  .ob-step { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .ob-step-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    background: #e2e8f0;
    color: #64748b;
  }
  .ob-active .ob-step-num { background: #0d9488; color: #fff; }
  .ob-done .ob-step-num { background: #059669; color: #fff; }
  .ob-step-label { font-size: 11px; color: #64748b; white-space: nowrap; }
  .ob-active .ob-step-label { color: #0d9488; font-weight: 600; }
  .ob-connector { flex: 1; height: 2px; background: #e2e8f0; min-width: 20px; }
  .onboarding-body { display: flex; justify-content: center; padding: 40px 24px; }
  .ob-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 32px;
    width: 100%;
    max-width: 560px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  }
  .ob-card h2 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
  .ob-desc { font-size: 14px; color: #64748b; margin-bottom: 24px; }
  .ob-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
  .ob-card-final { text-align: center; }
  .ob-rocket { font-size: 48px; margin-bottom: 16px; }
  .btn-group { display: flex; flex-wrap: wrap; gap: 8px; }
  .btn-toggle {
    padding: 6px 14px;
    border-radius: 8px;
    border: 1.5px solid #e2e8f0;
    background: #fff;
    font-size: 13px;
    font-weight: 600;
    color: #475569;
  }
  .btn-toggle:hover { border-color: #0d9488; color: #0d9488; }
  .btn-toggle.active { background: #0d9488; color: #fff; border-color: #0d9488; }
  .multi-select { display: flex; flex-wrap: wrap; gap: 6px; }
  .multi-select-item {
    padding: 5px 12px;
    border-radius: 9999px;
    border: 1.5px solid #e2e8f0;
    background: #fff;
    font-size: 13px;
    font-weight: 500;
    color: #475569;
    cursor: pointer;
  }
  .multi-select-item:hover { border-color: #0d9488; }
  .multi-select-item.selected { background: #0d9488; color: #fff; border-color: #0d9488; }
  .agent-capabilities { display: flex; flex-direction: column; gap: 12px; margin: 20px 0; text-align: left; }
  .agent-cap-item { display: flex; align-items: center; gap: 12px; font-size: 14px; color: #374151; }
  .agent-cap-icon { font-size: 20px; }

  /* ── Landing ────────────────────────────────────────── */
  .landing { overflow-x: hidden; }
  .landing-header {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    padding: 0;
  }
  .landing-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 40px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .landing-logo { display: flex; align-items: center; gap: 10px; }
  .landing-logo .logo-name { color: #fff; font-size: 18px; font-weight: 800; }
  .landing-nav-links { display: flex; align-items: center; gap: 16px; }
  .nav-link { color: rgba(255,255,255,0.7); font-size: 14px; font-weight: 500; }
  .nav-link:hover { color: #fff; }
  .hero {
    padding: 80px 40px 100px;
    text-align: center;
    max-width: 800px;
    margin: 0 auto;
  }
  .hero-badge {
    display: inline-block;
    background: rgba(13,148,136,0.2);
    color: #5eead4;
    border: 1px solid rgba(13,148,136,0.3);
    padding: 6px 16px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 24px;
  }
  .hero-title {
    font-size: 52px;
    font-weight: 900;
    color: #fff;
    line-height: 1.1;
    margin-bottom: 20px;
  }
  .hero-sub { font-size: 18px; color: rgba(255,255,255,0.7); max-width: 560px; margin: 0 auto 32px; }
  .hero-cta { display: flex; gap: 12px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap; }
  .hero-proof { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; }
  .hero-proof span { font-size: 13px; color: #5eead4; font-weight: 500; }
  .landing-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: #0d9488;
    padding: 32px 40px;
    text-align: center;
  }
  .stat-num { font-size: 32px; font-weight: 900; color: #fff; }
  .stat-label { font-size: 13px; color: rgba(255,255,255,0.8); text-transform: capitalize; font-weight: 500; }
  .landing-demo {
    padding: 60px 40px;
    background: #f8fafc;
    text-align: center;
  }
  .demo-header h2 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
  .demo-header p { color: #64748b; margin-bottom: 32px; }
  .demo-feed {
    max-width: 680px;
    margin: 0 auto;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
  }
  .demo-feed-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 20px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 14px;
    text-align: left;
  }
  .demo-feed-item:last-child { border-bottom: none; }
  .landing-features {
    padding: 60px 40px;
    text-align: center;
  }
  .landing-features h2 { font-size: 28px; font-weight: 800; margin-bottom: 40px; }
  .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 1100px; margin: 0 auto; text-align: left; }
  .feature-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 24px;
    transition: all 0.2s;
  }
  .feature-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); transform: translateY(-2px); }
  .feature-icon { font-size: 28px; margin-bottom: 12px; }
  .feature-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
  .feature-desc { font-size: 14px; color: #64748b; line-height: 1.6; }
  .landing-how {
    background: #f0fdfa;
    padding: 60px 40px;
    text-align: center;
  }
  .landing-how h2 { font-size: 28px; font-weight: 800; margin-bottom: 40px; }
  .how-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; max-width: 1100px; margin: 0 auto; text-align: left; }
  .how-step { padding: 20px; }
  .step-num {
    width: 40px;
    height: 40px;
    background: #0d9488;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 800;
    margin-bottom: 16px;
  }
  .step-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
  .step-desc { font-size: 14px; color: #64748b; line-height: 1.6; }
  .landing-cta {
    background: linear-gradient(135deg, #0f172a, #1e293b);
    padding: 80px 40px;
    text-align: center;
    color: #fff;
  }
  .landing-cta h2 { font-size: 32px; font-weight: 800; margin-bottom: 12px; }
  .landing-cta p { color: rgba(255,255,255,0.7); margin-bottom: 32px; font-size: 16px; }
  .cta-buttons { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  .landing-footer {
    background: #0f172a;
    padding: 24px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
  }
  .footer-logo { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.7); font-size: 14px; }
  .footer-links { display: flex; gap: 20px; }
  .footer-links a { color: rgba(255,255,255,0.5); font-size: 13px; }
  .footer-links a:hover { color: #fff; }
  .footer-copy { font-size: 13px; color: rgba(255,255,255,0.4); }

  /* ── Toast ───────────────────────────────────────────── */
  .toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    font-size: 14px;
    min-width: 280px;
    max-width: 420px;
    pointer-events: all;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.3s;
  }
  .toast-show { opacity: 1; transform: none; }
  .toast-icon { width: 18px; height: 18px; flex-shrink: 0; }
  .toast-success .toast-icon { color: #059669; }
  .toast-error .toast-icon { color: #dc2626; }
  .toast-info .toast-icon { color: #2563eb; }
  .toast-warning .toast-icon { color: #d97706; }
  .toast-msg { flex: 1; color: #0f172a; }
  .toast-close { color: #94a3b8; font-size: 12px; padding: 2px 6px; }

  /* ── Modal ───────────────────────────────────────────── */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9000;
    opacity: 0;
    transition: opacity 0.3s;
    padding: 20px;
  }
  .modal-show { opacity: 1; }
  .modal-box {
    background: #fff;
    border-radius: 16px;
    width: 100%;
    max-width: 520px;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 0;
    margin-bottom: 16px;
  }
  .modal-title { font-size: 17px; font-weight: 700; }
  .modal-close-btn { color: #94a3b8; font-size: 16px; padding: 4px 8px; }
  .modal-body { padding: 0 24px 20px; font-size: 14px; color: #374151; line-height: 1.6; }
  .modal-footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding: 16px 24px;
    border-top: 1px solid #e2e8f0;
    flex-wrap: wrap;
  }

  /* ── AI Chat ─────────────────────────────────────────── */
  .ai-chat-bubble {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 8000;
  }
  .ai-chat-trigger {
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, #0d9488, #0891b2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(13,148,136,0.4);
    transition: transform 0.2s;
  }
  .ai-chat-trigger:hover { transform: scale(1.05); }
  .ai-chat-icon { font-size: 22px; }
  .ai-chat-window {
    position: absolute;
    bottom: 64px;
    right: 0;
    width: 340px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    flex-direction: column;
    overflow: hidden;
  }
  .ai-chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: linear-gradient(135deg, #0d9488, #0891b2);
    color: #fff;
    font-weight: 700;
    font-size: 14px;
  }
  .ai-chat-close { color: rgba(255,255,255,0.8); }
  .ai-chat-messages {
    padding: 16px;
    height: 240px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ai-msg { padding: 10px 12px; border-radius: 10px; font-size: 13px; max-width: 90%; line-height: 1.5; }
  .ai-msg-bot { background: #f1f5f9; color: #374151; align-self: flex-start; }
  .ai-msg-user { background: #0d9488; color: #fff; align-self: flex-end; }
  .ai-chat-input-row {
    display: flex;
    padding: 12px;
    gap: 8px;
    border-top: 1px solid #e2e8f0;
  }
  .ai-chat-input {
    flex: 1;
    padding: 8px 12px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    outline: none;
  }
  .ai-chat-input:focus { border-color: #0d9488; }
  .ai-chat-send {
    background: #0d9488;
    color: #fff;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  }

  /* ── Match Ring ─────────────────────────────────────── */
  .match-ring { display: block; }

  /* ── Top Match Preview ──────────────────────────────── */
  .top-match-card { cursor: pointer; padding: 12px; border-radius: 8px; background: #f8fafc; }
  .top-match-card:hover { background: #f0fdfa; }
  .top-match-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .top-match-title { font-weight: 700; font-size: 14px; }
  .top-match-company { font-size: 12px; color: #64748b; }

  /* ── Cand Row ───────────────────────────────────────── */
  .cand-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
  }
  .cand-row:last-child { border-bottom: none; }
  .cand-row:hover .cand-row-name { color: #0d9488; }
  .cand-row-info { flex: 1; }
  .cand-row-name { font-weight: 600; font-size: 14px; }
  .cand-row-company { font-size: 12px; color: #64748b; }

  /* ── Market Pulse ───────────────────────────────────── */
  .market-pulse {}
  .pulse-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .pulse-item { text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px; }
  .pulse-num { font-size: 22px; font-weight: 800; color: #0d9488; }
  .pulse-label { font-size: 11px; color: #64748b; margin-top: 4px; }

  /* ── Notifications ──────────────────────────────────── */
  .notifications-list { display: flex; flex-direction: column; gap: 12px; }
  .notif-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }
  .notif-unread { background: #f0fdfa; border-color: #99f6e4; }
  .notif-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }
  .notif-title { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
  .notif-desc { font-size: 13px; color: #475569; }
  .notif-time { font-size: 11px; color: #94a3b8; margin-top: 4px; }

  /* ── Back Button ────────────────────────────────────── */
  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 20px;
    padding: 6px 10px;
    border-radius: 8px;
  }
  .back-btn:hover { background: #f1f5f9; color: #0f172a; }

  /* ── Content Page ───────────────────────────────────── */
  .content-page { max-width: 800px; margin: 0 auto; padding: 24px; }
  .content-page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
  .content-page-header h1 { font-size: 24px; font-weight: 800; }
  .content-body h2 { font-size: 17px; font-weight: 700; margin: 20px 0 8px; }
  .content-body p { font-size: 14px; color: #475569; line-height: 1.7; }

  /* ── Loading ────────────────────────────────────────── */
  @keyframes loadingDots { 0%,60%,100%{opacity:1} 30%{opacity:0.3} }
  .loading-dots:after {
    content: '...';
    animation: loadingDots 1.4s infinite;
  }

  /* ── Trust Detail ───────────────────────────────────── */
  .trust-detail-header { display: flex; justify-content: center; margin-bottom: 16px; }

  /* ── Mobile Nav ─────────────────────────────────────── */
  .mobile-nav {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-around;
    padding: 8px 0;
    z-index: 100;
    box-shadow: 0 -4px 16px rgba(0,0,0,0.08);
  }
  .mobile-layout .main-content { padding-bottom: 64px; }
  .mobile-layout .sidebar { display: none; }
  .hamburger { display: none; }

  /* ── Responsive ─────────────────────────────────────── */
  @media (max-width: 1024px) {
    .dash-grid { grid-template-columns: 1fr; }
    .match-detail-grid { grid-template-columns: 1fr; }
    .job-form-grid { grid-template-columns: 1fr; }
    .persona-grid { grid-template-columns: 1fr; }
    .settings-grid { grid-template-columns: 1fr; }
    .features-grid { grid-template-columns: 1fr 1fr; }
    .how-steps { grid-template-columns: 1fr 1fr; }
  }

  @media (max-width: 768px) {
    .app-layout { grid-template-columns: 1fr; }
    .sidebar { display: none; }
    .stats-row { grid-template-columns: 1fr 1fr; }
    .form-row { grid-template-columns: 1fr; }
    .pulse-grid { grid-template-columns: 1fr 1fr; }
    .features-grid { grid-template-columns: 1fr; }
    .how-steps { grid-template-columns: 1fr; }
    .landing-stats { grid-template-columns: 1fr 1fr; }
    .hero-title { font-size: 36px; }
    .hero { padding: 40px 20px 60px; }
    .landing-nav { padding: 16px 20px; }
    .landing-features, .landing-how, .landing-demo, .landing-cta { padding: 40px 20px; }
    .hamburger { display: flex; }
    .role-selector { grid-template-columns: 1fr; }
    .demo-accounts-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 480px) {
    .stats-row { grid-template-columns: 1fr; }
    .auth-card { padding: 20px; }
    .hero-cta { flex-direction: column; align-items: stretch; }
  }

  `;
  document.head.appendChild(style);
})();
