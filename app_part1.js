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
const iconTrophy     = () => `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M5 3a2 2 0 00-2 2v1c0 2.761 2.239 5 5 5h4c2.761 0 5-2.239 5-5V5a2 2 0 00-2-2H5zm0 2h10v1a3 3 0 11-6 0h-4zm4 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>`;
const iconShield     = () => `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd"/></svg>`;

// ============================================================
// PART 2: Landing Page, Auth Pages
// ============================================================

// ─── Landing Page ────────────────────────────────────────────
function renderLanding() {
  renderApp(`
    <div class="landing">
      <!-- NAV -->
      <nav class="landing-nav">
        <div class="landing-nav-inner">
          <div class="logo-lockup">
            <div class="logo-mark">AH</div>
            <div>
              <div class="logo-name">AgentHire</div>
              <div class="logo-version">v2.0</div>
            </div>
          </div>
          <div class="landing-nav-links">
            <a href="#signin" onclick="navigate('signin');return false" class="btn btn-ghost">Sign In</a>
            <a href="#register" onclick="navigate('register');return false" class="btn btn-primary">Get Started</a>
          </div>
        </div>
      </nav>

      <!-- HERO -->
      <section class="hero">
        <div class="hero-glow hero-glow-1"></div>
        <div class="hero-glow hero-glow-2"></div>
        <div class="hero-content">
          <div class="hero-badge">
            <span class="live-dot"></span> 1,847 AI Agents Active Now
          </div>
          <h1 class="hero-headline">Your AI Agent Finds<br>Your Perfect Match</h1>
          <p class="hero-subtitle">Neither recruiters nor candidates search. Describe what you want,<br>and AI agents find mutual matches. Zero noise. Zero ghosting.</p>
          <div class="hero-ctas">
            <button class="btn btn-primary btn-lg hero-cta-candidate" onclick="navigate('register/candidate')">
              I'm a Candidate
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </button>
            <button class="btn btn-outline btn-lg hero-cta-recruiter" onclick="navigate('register/recruiter')">
              I'm Hiring
            </button>
          </div>
          <div class="hero-demo-link">
            <a href="#" onclick="showDemoModal();return false">✨ Try the Demo — instant access</a>
          </div>
        </div>
        <div class="hero-visual">
          <div class="agent-card agent-card-left">
            <div class="agent-card-header">
              ${avatar('SC', '#0d9488', 36)}
              <div>
                <div class="agent-card-name">Sarah's Agent</div>
                <div class="agent-card-status agent-active">Active</div>
              </div>
            </div>
            <div class="agent-card-activity">Reviewed 47 postings • Found 3 matches</div>
          </div>
          <div class="match-connector">
            <div class="match-score-bubble">94%</div>
            <div class="connector-line"></div>
          </div>
          <div class="agent-card agent-card-right">
            <div class="agent-card-header">
              ${avatar('LP', '#7c3aed', 36)}
              <div>
                <div class="agent-card-name">TechNovate Agent</div>
                <div class="agent-card-status agent-active">Active</div>
              </div>
            </div>
            <div class="agent-card-activity">Screened 124 profiles • 1 recommended</div>
          </div>
        </div>
      </section>

      <!-- LIVE TICKER -->
      <div class="ticker-bar" id="ticker-bar">
        <div class="ticker-inner" id="ticker-inner">
          <span>Loading live data...</span>
        </div>
      </div>

      <!-- HOW IT WORKS -->
      <section class="how-it-works">
        <div class="section-container">
          <div class="section-label">The Process</div>
          <h2 class="section-title">Three steps to your perfect match</h2>
          <div class="steps-grid">
            <div class="step-card" style="animation-delay:0s">
              <div class="step-number">01</div>
              <div class="step-icon">🎯</div>
              <h3>Describe What You Want</h3>
              <p>Tell your AI agent your ideal role, salary, culture preferences. Recruiters describe their ideal candidate profile.</p>
              <div class="step-detail">Takes ~3 minutes</div>
            </div>
            <div class="step-card" style="animation-delay:0.1s">
              <div class="step-number">02</div>
              <div class="step-icon">🤝</div>
              <h3>Agents Negotiate</h3>
              <p>AI agents from both sides evaluate compatibility, negotiate terms, and filter out noise — automatically, 24/7.</p>
              <div class="step-detail">Fully automated</div>
            </div>
            <div class="step-card" style="animation-delay:0.2s">
              <div class="step-number">03</div>
              <div class="step-icon">✅</div>
              <h3>Meet Your Matches</h3>
              <p>Only see pre-vetted, relevant options. Both sides opted in. Start the conversation with context already established.</p>
              <div class="step-detail">Zero noise guaranteed</div>
            </div>
          </div>
        </div>
      </section>

      <!-- SOCIAL PROOF -->
      <section class="social-proof">
        <div class="section-container">
          <div class="section-label">Testimonials</div>
          <h2 class="section-title">People love their agents</h2>
          <div class="testimonials-grid">
            <div class="testimonial-card">
              <div class="testimonial-quote">"My agent found me a perfect role in 3 days. No endless scrolling, no ghosting. The trust scores eliminated all the noise."</div>
              <div class="testimonial-author">
                ${avatar('SC', '#0d9488', 44)}
                <div>
                  <div class="testimonial-name">Sarah Chen</div>
                  <div class="testimonial-role">ML Engineer, now at TechNovate AI</div>
                </div>
              </div>
              <div class="testimonial-stars">${'★'.repeat(5)}</div>
            </div>
            <div class="testimonial-card testimonial-featured">
              <div class="testimonial-quote">"We filled 3 senior roles in 2 weeks. The AI agents pre-screened everything — we only spoke to candidates who were genuinely qualified and interested."</div>
              <div class="testimonial-author">
                ${avatar('LP', '#7c3aed', 44)}
                <div>
                  <div class="testimonial-name">Lisa Park</div>
                  <div class="testimonial-role">Head of Talent, TechNovate</div>
                </div>
              </div>
              <div class="testimonial-stars">${'★'.repeat(5)}</div>
            </div>
            <div class="testimonial-card">
              <div class="testimonial-quote">"The trust scores eliminated fake jobs entirely. Every single match was a real company with a real role. That alone is worth it."</div>
              <div class="testimonial-author">
                ${avatar('MJ', '#d97706', 44)}
                <div>
                  <div class="testimonial-name">Marcus Johnson</div>
                  <div class="testimonial-role">Product Manager, Meridian Systems</div>
                </div>
              </div>
              <div class="testimonial-stars">${'★'.repeat(5)}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- FEATURED COMPANIES -->
      <section class="companies-section">
        <div class="section-container">
          <p class="companies-label">Trusted by leading companies</p>
          <div class="companies-row">
            <div class="company-badge" style="--c:#0d9488">TechNovate AI</div>
            <div class="company-badge" style="--c:#7c3aed">Meridian Systems</div>
            <div class="company-badge" style="--c:#2563eb">Quantum Dynamics</div>
            <div class="company-badge" style="--c:#d97706">Atlas Global</div>
            <div class="company-badge" style="--c:#059669">Nova Frontier</div>
            <div class="company-badge" style="--c:#db2777">Cascade Tech</div>
          </div>
        </div>
      </section>

      <!-- STATS BANNER -->
      <section class="stats-banner">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-num" id="stat-matches">247</div>
            <div class="stat-lbl">Matches Today</div>
          </div>
          <div class="stat-item">
            <div class="stat-num" id="stat-interviews">89</div>
            <div class="stat-lbl">Interviews Scheduled</div>
          </div>
          <div class="stat-item">
            <div class="stat-num" id="stat-hires">12</div>
            <div class="stat-lbl">Hires Completed</div>
          </div>
          <div class="stat-item">
            <div class="stat-num" id="stat-agents">1,847</div>
            <div class="stat-lbl">Agents Active</div>
          </div>
        </div>
      </section>

      <!-- FOOTER -->
      <footer class="landing-footer">
        <div class="footer-inner">
          <div class="footer-brand">
            <div class="logo-lockup">
              <div class="logo-mark logo-mark-sm">AH</div>
              <span class="footer-brand-name">AgentHire</span>
            </div>
            <p class="footer-tagline">AI-powered career matching. Zero noise.</p>
          </div>
          <div class="footer-links">
            <div class="footer-col">
              <div class="footer-col-title">Product</div>
              <a href="#" onclick="navigate('landing');return false">How It Works</a>
              <a href="#" onclick="showDemoModal();return false">Try Demo</a>
              <a href="#leaderboard" onclick="navigate('leaderboard');return false">Leaderboard</a>
            </div>
            <div class="footer-col">
              <div class="footer-col-title">Legal</div>
              <a href="#privacy" onclick="navigate('privacy');return false">Privacy Policy</a>
              <a href="#" onclick="showTermsModal();return false">Terms of Service</a>
              <a href="mailto:hello@agenthire.ai" target="_blank" rel="noopener noreferrer">Contact</a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 AgentHire, Inc. All rights reserved.</span>
          <span>Built with AI. Powered by trust.</span>
        </div>
      </footer>
    </div>
  `);

  // Load live ticker data
  loadTicker();
}

async function loadTicker() {
  try {
    const data = await api('hiring-pulse');
    const bar = document.getElementById('ticker-inner');
    if (!bar) return;
    const pulse = data.matches ? data : { matches: 247, interviews: 89, hires: 12, agents: 1847 };
    const msg = `${pulse.matches} matches made today • ${pulse.interviews} interviews scheduled • ${pulse.hires} hires completed • ${pulse.agents} agents active`;
    bar.innerHTML = `<span>${msg} • ${msg} • ${msg}</span>`;
    // Update stats
    ['matches','interviews','hires','agents'].forEach((k,i) => {
      const el = document.getElementById('stat-' + k);
      if (el) el.textContent = [pulse.matches, pulse.interviews, pulse.hires, pulse.agents.toLocaleString()][i];
    });
  } catch(e) {}
}

function showTermsModal() {
  showModal('Terms of Service', `
    <div style="max-height:60vh;overflow-y:auto;line-height:1.7">
      <h4>1. Acceptance of Terms</h4>
      <p>By using AgentHire, you agree to these terms. AgentHire is an AI-powered job matching platform.</p>
      <h4>2. Agent Behavior</h4>
      <p>Your AI agent acts on your behalf. You are responsible for the preferences and thresholds you set.</p>
      <h4>3. Privacy</h4>
      <p>We protect your data with enterprise-grade encryption. See our Privacy Policy for details.</p>
      <h4>4. Acceptable Use</h4>
      <p>You may not use AgentHire to post fraudulent jobs, spam candidates, or circumvent matching systems.</p>
      <h4>5. Termination</h4>
      <p>We reserve the right to terminate accounts that violate these terms.</p>
    </div>
  `);
}

// ─── Demo Modal ───────────────────────────────────────────────
function showDemoModal() {
  const candidates = DEMO_ACCOUNTS.filter(a => a.role === 'candidate');
  const recruiters = DEMO_ACCOUNTS.filter(a => a.role === 'recruiter');

  const cardHTML = (acct) => `
    <div class="demo-account-card" onclick="loginDemo('${acct.email}')">
      ${avatar(acct.avatar, acct.role === 'candidate' ? '#0d9488' : '#7c3aed', 44)}
      <div class="demo-card-info">
        <div class="demo-card-name">${acct.name}</div>
        <div class="demo-card-title">${acct.title}${acct.company ? ` · ${acct.company}` : ''}</div>
        ${acct.role === 'candidate' ? `<div class="demo-card-avail avail-${acct.availability}">${acct.availability === 'active' ? '🟢 Actively Looking' : '🟡 Open to Offers'}</div>` : ''}
      </div>
      <div class="demo-card-arrow">→</div>
    </div>`;

  showModal('Try the Demo', `
    <p class="demo-intro">Click any account to sign in instantly — no password needed.</p>
    <div class="demo-section-title">👤 Candidates (8)</div>
    <div class="demo-accounts-grid">${candidates.map(cardHTML).join('')}</div>
    <div class="demo-section-title" style="margin-top:20px">🏢 Recruiters (4)</div>
    <div class="demo-accounts-grid">${recruiters.map(cardHTML).join('')}</div>
  `);
}

async function loginDemo(email) {
  const acct = DEMO_ACCOUNTS.find(a => a.email === email);
  if (!acct) return;
  closeModal();
  APP.user = { ...acct };
  APP.token = 'demo-' + acct.email;
  toast(`Welcome back, ${acct.name}! Your agent is active.`, 'success', 4000);
  startInactivityTimer();
  setTimeout(() => navigate('dashboard'), 400);
}

// ─── Sign In Page ─────────────────────────────────────────────
function renderSignIn() {
  renderApp(authLayout(`
    <div class="auth-card">
      <h2 class="auth-title">Welcome back</h2>
      <p class="auth-subtitle">Sign in to your AgentHire account</p>

      <form id="signin-form" onsubmit="handleSignIn(event)" autocomplete="off">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="signin-email" class="form-input" placeholder="you@example.com" required autocomplete="username">
        </div>
        <div class="form-group">
          <label class="form-label">
            Password
            <a href="#" onclick="showForgotPassword();return false" class="form-label-link">Forgot password?</a>
          </label>
          <input type="password" id="signin-password" class="form-input" placeholder="••••••••" required autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-primary btn-full btn-lg" id="signin-btn">Sign In</button>
      </form>

      <div class="auth-divider"><span>or</span></div>

      <p class="auth-switch">Don't have an account? <a href="#register" onclick="navigate('register');return false">Create one free</a></p>

      <!-- Demo Accounts -->
      <div class="demo-section">
        <div class="demo-section-header" onclick="toggleDemoAccounts()">
          <span>Try Demo Accounts</span>
          <span id="demo-toggle-icon">▼</span>
        </div>
        <div class="demo-accounts-inline" id="demo-accounts-inline" style="display:none">
          <div class="demo-section-title">Candidates</div>
          <div class="demo-grid-inline">
            ${DEMO_ACCOUNTS.filter(a=>a.role==='candidate').map(a=>`
              <div class="demo-pill" onclick="fillAndSignIn('${a.email}','${a.password}','${a.name}')">
                ${avatar(a.avatar, '#0d9488', 28)}
                <span>${a.name}</span>
              </div>`).join('')}
          </div>
          <div class="demo-section-title" style="margin-top:12px">Recruiters</div>
          <div class="demo-grid-inline">
            ${DEMO_ACCOUNTS.filter(a=>a.role==='recruiter').map(a=>`
              <div class="demo-pill" onclick="fillAndSignIn('${a.email}','${a.password}','${a.name}')">
                ${avatar(a.avatar, '#7c3aed', 28)}
                <span>${a.name}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `));
}

function toggleDemoAccounts() {
  const el = document.getElementById('demo-accounts-inline');
  const icon = document.getElementById('demo-toggle-icon');
  if (!el) return;
  const isHidden = el.style.display === 'none';
  el.style.display = isHidden ? 'block' : 'none';
  if (icon) icon.textContent = isHidden ? '▲' : '▼';
}

function fillAndSignIn(email, password, name) {
  document.getElementById('signin-email').value = email;
  document.getElementById('signin-password').value = password;
  document.getElementById('signin-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

async function handleSignIn(e) {
  e.preventDefault();
  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;
  const btn = document.getElementById('signin-btn');

  btn.textContent = 'Signing in...';
  btn.disabled = true;

  // Check demo accounts first
  const demo = DEMO_ACCOUNTS.find(a => a.email === email && a.password === password);
  if (demo) {
    await new Promise(r => setTimeout(r, 600));
    APP.user = { ...demo };
    APP.token = 'demo-token-' + demo.email;
    btn.textContent = 'Sign In';
    btn.disabled = false;
    toast(`Welcome back, ${demo.name}!`, 'success');
    startInactivityTimer();
    navigate('dashboard');
    return;
  }

  try {
    const data = await api('login', 'POST', { email, password });
    APP.user = data.user || { email, name: email.split('@')[0], role: 'candidate', avatar: email.slice(0,2).toUpperCase() };
    APP.token = data.token || 'token-xyz';
    toast('Signed in successfully!', 'success');
    startInactivityTimer();
    navigate('dashboard');
  } catch (err) {
    toast(err.message || 'Invalid credentials', 'error');
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
}

function showForgotPassword() {
  showModal('Reset Password', `
    <p>Enter your email and we'll send you a reset link.</p>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input type="email" id="forgot-email" class="form-input" placeholder="you@example.com">
    </div>
    <button class="btn btn-primary btn-full" onclick="sendResetEmail()">Send Reset Link</button>
  `);
}

function sendResetEmail() {
  const email = document.getElementById('forgot-email')?.value;
  if (!email) { toast('Please enter your email', 'error'); return; }
  closeModal();
  toast('Reset link sent! Check your inbox.', 'success');
}

// ─── Register Page ────────────────────────────────────────────
function renderRegister(preRole) {
  APP.wizardRole = preRole || 'candidate';

  renderApp(authLayout(`
    <div class="auth-card auth-card-wide">
      <h2 class="auth-title">Create your account</h2>
      <p class="auth-subtitle">Your AI agent will be ready in minutes</p>

      <!-- Role Selector -->
      <div class="role-tabs" id="role-tabs">
        <button class="role-tab ${APP.wizardRole === 'candidate' ? 'role-tab-active' : ''}" onclick="setRegisterRole('candidate')">
          👤 I'm a Candidate
        </button>
        <button class="role-tab ${APP.wizardRole === 'recruiter' ? 'role-tab-active' : ''}" onclick="setRegisterRole('recruiter')">
          🏢 I'm Hiring
        </button>
      </div>

      <!-- LinkedIn Import -->
      <button class="btn btn-outline btn-full linkedin-btn" onclick="simulateLinkedInImport()">
        <svg viewBox="0 0 24 24" fill="#0A66C2" width="18" height="18"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        One-click LinkedIn Import
      </button>

      <form id="register-form" onsubmit="handleRegister(event)" autocomplete="off">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" id="reg-name" class="form-input" placeholder="Jane Smith" required autocomplete="off">
          </div>
          <div class="form-group" id="reg-company-group" style="${APP.wizardRole !== 'recruiter' ? 'display:none' : ''}">
            <label class="form-label">Company</label>
            <input type="text" id="reg-company" class="form-input" placeholder="Acme Corp" autocomplete="off">
          </div>
          <div class="form-group" id="reg-title-group" style="${APP.wizardRole !== 'candidate' ? 'display:none' : ''}">
            <label class="form-label">Current Title</label>
            <input type="text" id="reg-title" class="form-input" placeholder="Senior Engineer" autocomplete="off">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="reg-email" class="form-input" placeholder="you@example.com" required autocomplete="off">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="reg-password" class="form-input" placeholder="Min 8 characters" required autocomplete="new-password" oninput="checkPasswordStrength(this.value)">
            <div class="password-strength" id="password-strength"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Confirm Password</label>
            <input type="password" id="reg-confirm" class="form-input" placeholder="Repeat password" required autocomplete="new-password">
          </div>
        </div>

        <div class="email-verify-notice">
          <span class="verify-icon">✉️</span>
          <p>A verification email will be sent to confirm your account. Check spam if you don't see it.</p>
        </div>

        <div class="form-check">
          <input type="checkbox" id="reg-terms" required>
          <label for="reg-terms">I agree to the <a href="#" onclick="showTermsModal();return false">Terms of Service</a> and <a href="#privacy" onclick="navigate('privacy');return false">Privacy Policy</a></label>
        </div>

        <button type="submit" class="btn btn-primary btn-full btn-lg" id="register-btn">Create Account — It's Free</button>
      </form>

      <p class="auth-switch">Already have an account? <a href="#signin" onclick="navigate('signin');return false">Sign in</a></p>
    </div>
  `));
}

function setRegisterRole(role) {
  APP.wizardRole = role;
  document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('role-tab-active'));
  document.querySelectorAll('.role-tab').forEach((t, i) => {
    if ((i === 0 && role === 'candidate') || (i === 1 && role === 'recruiter')) t.classList.add('role-tab-active');
  });
  const companyGroup = document.getElementById('reg-company-group');
  const titleGroup = document.getElementById('reg-title-group');
  if (companyGroup) companyGroup.style.display = role === 'recruiter' ? '' : 'none';
  if (titleGroup) titleGroup.style.display = role === 'candidate' ? '' : 'none';
}

function checkPasswordStrength(val) {
  const el = document.getElementById('password-strength');
  if (!el) return;
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#dc2626', '#d97706', '#2563eb', '#059669'];
  el.innerHTML = val ? `<div class="strength-bar"><div style="width:${score*25}%;background:${colors[score]};height:4px;border-radius:2px;transition:width 0.3s"></div></div><span style="color:${colors[score]};font-size:12px">${labels[score]}</span>` : '';
}

async function simulateLinkedInImport() {
  toast('Connecting to LinkedIn...', 'info', 1500);
  await new Promise(r => setTimeout(r, 1200));
  try {
    const data = await api('linkedin-import');
    const name = document.getElementById('reg-name');
    const title = document.getElementById('reg-title');
    if (name) name.value = data.name || 'Demo User';
    if (title) title.value = data.headline || 'Senior Engineer';
    toast('LinkedIn profile imported!', 'success');
  } catch(e) {
    toast('LinkedIn import simulated (demo mode)', 'info');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const company = document.getElementById('reg-company')?.value.trim();
  const title = document.getElementById('reg-title')?.value.trim();
  const btn = document.getElementById('register-btn');

  if (password !== confirm) { toast('Passwords do not match', 'error'); return; }
  if (password.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }

  btn.textContent = 'Creating account...';
  btn.disabled = true;

  await new Promise(r => setTimeout(r, 800));

  APP.user = {
    name, email,
    role: APP.wizardRole,
    avatar: name.slice(0,2).toUpperCase(),
    title: title || '',
    company: company || '',
    skills: [],
    availability: 'active',
    salary: [120000, 160000],
    experience: 3,
    location: '',
    trust: 52,
  };
  APP.token = 'new-user-token-' + Date.now();
  APP.onboardingStep = 0;
  APP.onboardingData = {};
  APP.convoMessages = [];
  APP.convoPreview = null;

  btn.textContent = 'Create Account — It\'s Free';
  btn.disabled = false;
  toast('Account created! Let\'s set up your profile.', 'success');
  startInactivityTimer();
  navigate('onboarding');
}

// ============================================================
