// ============================================================
// AgentHire v2.0 — app.js
// Single-page application — all state in APP object
// All state kept in-memory (sandboxed iframe)
// ============================================================

'use strict';

// ─── Global Constants ───────────────────────────────────────────────────────
const CGI = '__CGI_BIN__';

// ─── Global State ───────────────────────────────────────────────────────────
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

function isMobile() { return window.innerWidth <= 768; }

const DEMO_ACCOUNTS = [
  { email: 'sarah.chen@demo.com',    password: 'demo123', name: 'Sarah Chen',      role: 'candidate', title: 'ML Engineer' },
  { email: 'marcus.j@demo.com',      password: 'demo123', name: 'Marcus Johnson',  role: 'candidate', title: 'Product Manager' },
  { email: 'lisa.park@technova.com', password: 'demo123', name: 'Lisa Park',       role: 'recruiter', title: 'Head of Talent' },
];

handleRoute();
