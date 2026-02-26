// PART 4: Dashboards — Candidate & Recruiter
// ============================================================

function renderDashboard() {
  if (!APP.user) { navigate('landing'); return; }
  if (APP.user.role === 'recruiter') renderRecruiterDashboard();
  else renderCandidateDashboard();
}

// ─── Candidate Dashboard ──────────────────────────────────────
async function renderCandidateDashboard() {
  const user = APP.user;
  const stats = { matches: 6, interviews: 2, agentActions: 147, profileViews: 34 };
  const weeklyDigest = { matches: 5, interviews: 2, profileViews: 18, topMatch: 'TechNovate AI' };

  const STAGES = ['New Matches','Interested','Interviewing','Offer','Hired'];
  const matchesByStage = (stage) => SAMPLE_MATCHES.filter(m => m.stage === stage);

  const kanbanHTML = `
    <div class="kanban-board ${isMobile() ? 'kanban-mobile' : ''}">
      ${STAGES.map(stage => {
        const cards = matchesByStage(stage);
        return `
          <div class="kanban-col">
            <div class="kanban-col-header" style="border-color:${stageColor(stage)}">
              <span class="kanban-col-title">${stage}</span>
              <span class="kanban-col-count" style="background:${stageColor(stage)}20;color:${stageColor(stage)}">${cards.length}</span>
            </div>
            <div class="kanban-cards">
              ${cards.map(m => `
                <div class="kanban-card" onclick="navigate('match/${m.id}')">
                  <div class="kanban-card-header">
                    <div class="company-initial" style="background:${m.companyColor}20;color:${m.companyColor}">${m.logo}</div>
                    <div class="kanban-card-info">
                      <div class="kanban-card-title">${m.title}</div>
                      <div class="kanban-card-company">${m.company}</div>
                    </div>
                    ${matchRing(m.score, 44)}
                  </div>
                  <div class="kanban-card-reasons">
                    ${m.reasons.slice(0,2).map(r => `<span class="match-reason-tag">${r}</span>`).join('')}
                  </div>
                  <div class="kanban-card-actions">
                    ${stage !== 'New Matches' ? `<button class="kanban-btn kanban-btn-back" onclick="event.stopPropagation();moveMatchStage('${m.id}',-1)">←</button>` : ''}
                    <button class="kanban-btn kanban-btn-view" onclick="event.stopPropagation();navigate('match/${m.id}')">View</button>
                    ${stage !== 'Hired' ? `<button class="kanban-btn kanban-btn-forward" onclick="event.stopPropagation();moveMatchStage('${m.id}',1)">→</button>` : ''}
                  </div>
                </div>`).join('')}
              ${cards.length === 0 ? `<div class="kanban-empty">No matches here yet</div>` : ''}
            </div>
          </div>`;
      }).join('')}
    </div>`;

  const feedHTML = AGENT_FEED_ITEMS.slice(0, 5).map(item => {
    const icons = { matched: iconLink(), negotiating: iconChat(), reviewed: iconEye(), declined: iconX(), milestone: iconStar() };
    const colors = { matched: '#0d9488', negotiating: '#7c3aed', reviewed: '#2563eb', declined: '#dc2626', milestone: '#d97706' };
    return `
      <div class="feed-item">
        <div class="feed-icon" style="color:${colors[item.type]};background:${colors[item.type]}15">${icons[item.type] || iconStar()}</div>
        <div class="feed-content">
          <div class="feed-msg">${item.message}</div>
          <div class="feed-time">${item.time}</div>
        </div>
      </div>`;
  }).join('');

  const achievementsHTML = [
    { icon: '✅', name: 'Profile Complete', desc: 'Filled out all key sections', earned: true },
    { icon: '🎯', name: 'First Match', desc: 'Received your first AI match', earned: true },
    { icon: '⭐', name: '5-Star Responder', desc: 'Responded to 5 matches in <24h', earned: true },
    { icon: '🌐', name: 'Power Networker', desc: 'Connect with 10 companies', earned: false },
    { icon: '🔒', name: 'Trust Verified', desc: 'Email + LinkedIn verified', earned: false },
    { icon: '🚀', name: 'First Hire', desc: 'Land your dream role', earned: false },
  ].map(a => `
    <div class="achievement-badge ${a.earned ? '' : 'achievement-locked'}">
      <div class="achievement-icon">${a.icon}</div>
      <div class="achievement-name">${a.name}</div>
      <div class="achievement-desc">${a.desc}</div>
      ${!a.earned ? '<div class="achievement-lock">🔒</div>' : ''}
    </div>`
  ).join('');

  renderApp(`
    <div class="app-layout">
      ${navBar()}
      <div class="main-content">
        ${topBar(`Good morning, ${user.name.split(' ')[0]} 👋`, 'Your agent found 3 new matches overnight')}

        <div class="dashboard-body">
          <!-- QUICK ACTIONS -->
          <div class="quick-actions-bar">
            <div class="agent-status-toggle">
              <span class="agent-dot agent-dot-active"></span>
              <span>Agent Active</span>
              <label class="toggle-switch" title="Pause/Resume Agent">
                <input type="checkbox" checked onchange="toggleAgent(this.checked)">
                <span class="toggle-track"></span>
              </label>
            </div>
            <button class="btn btn-sm btn-outline" onclick="showAvailabilityDropdown()">
              🟢 Actively Looking ▾
            </button>
            <button class="btn btn-sm btn-primary" onclick="showBoostModal()">
              ⚡ Boost Profile
            </button>
          </div>

          <!-- STAT CARDS -->
          <div class="stat-cards-grid">
            <div class="stat-card stat-teal">
              <div class="stat-card-icon">🎯</div>
              <div class="stat-card-body">
                <div class="stat-card-num">${stats.matches}</div>
                <div class="stat-card-label">Active Matches</div>
                <div class="stat-card-trend trend-up">↑ 2 this week</div>
              </div>
              <svg class="sparkline" viewBox="0 0 60 20"><polyline points="0,18 10,14 20,16 30,10 40,8 50,5 60,3" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/></svg>
            </div>
            <div class="stat-card stat-purple">
              <div class="stat-card-icon">📅</div>
              <div class="stat-card-body">
                <div class="stat-card-num">${stats.interviews}</div>
                <div class="stat-card-label">Interview Pipeline</div>
                <div class="stat-card-trend trend-up">↑ 1 scheduled</div>
              </div>
              <svg class="sparkline" viewBox="0 0 60 20"><polyline points="0,18 10,18 20,15 30,15 40,10 50,8 60,5" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/></svg>
            </div>
            <div class="stat-card stat-emerald">
              <div class="stat-card-icon">🤖</div>
              <div class="stat-card-body">
                <div class="stat-card-num">${stats.agentActions}</div>
                <div class="stat-card-label">Agent Actions Today</div>
                <div class="stat-card-trend trend-up">↑ Active 16h</div>
              </div>
              <svg class="sparkline" viewBox="0 0 60 20"><polyline points="0,15 10,12 20,14 30,8 40,10 50,6 60,4" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/></svg>
            </div>
            <div class="stat-card stat-amber">
              <div class="stat-card-icon">👁</div>
              <div class="stat-card-body">
                <div class="stat-card-num">${stats.profileViews}</div>
                <div class="stat-card-label">Profile Views This Week</div>
                <div class="stat-card-trend trend-up">↑ 12 vs last week</div>
              </div>
              <svg class="sparkline" viewBox="0 0 60 20"><polyline points="0,18 10,16 20,12 30,14 40,9 50,7 60,4" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/></svg>
            </div>
          </div>

          <!-- MAIN GRID -->
          <div class="dashboard-grid-2col">
            <!-- LEFT: Agent Feed + Weekly Digest -->
            <div class="dashboard-col">
              <!-- Agent Feed -->
              <div class="dashboard-card">
                <div class="card-header">
                  <h3 class="card-title">🤖 Your Agent's Activity</h3>
                  <button class="card-action" onclick="showFullFeed()">View All</button>
                </div>
                <div class="feed-list">${feedHTML}</div>
              </div>

              <!-- Weekly Digest -->
              <div class="dashboard-card weekly-digest-card">
                <div class="digest-header">
                  <span class="digest-icon">📊</span>
                  <div>
                    <div class="digest-title">Your Weekly Digest</div>
                    <div class="digest-date">Feb 17–24, 2026</div>
                  </div>
                </div>
                <div class="digest-stats">
                  <div class="digest-stat"><span class="digest-num">${weeklyDigest.matches}</span> new matches</div>
                  <div class="digest-stat"><span class="digest-num">${weeklyDigest.interviews}</span> moved to interview</div>
                  <div class="digest-stat"><span class="digest-num">${weeklyDigest.profileViews}</span> profile views</div>
                </div>
                <div class="digest-highlight">Top match: <strong>${weeklyDigest.topMatch}</strong></div>
              </div>

              <!-- Achievements -->
              <div class="dashboard-card">
                <div class="card-header">
                  <h3 class="card-title">🏆 Achievements</h3>
                  <span class="card-badge">3/6 earned</span>
                </div>
                <div class="achievements-grid">${achievementsHTML}</div>
              </div>
            </div>

            <!-- RIGHT: Trust Score + Profile Completeness -->
            <div class="dashboard-col">
              <!-- Trust Score -->
              <div class="dashboard-card">
                <div class="card-header">
                  <h3 class="card-title">⚡ Trust Score</h3>
                  <span class="trust-badge-large" style="background:#059669">${user.trust || 94}</span>
                </div>
                <div class="trust-breakdown">
                  <div class="trust-row">
                    <span class="trust-label">Identity Verification</span>
                    <div class="trust-bar-wrap"><div class="trust-bar" style="width:90%;background:#0d9488"></div></div>
                    <span class="trust-pct">90%</span>
                  </div>
                  <div class="trust-row">
                    <span class="trust-label">Activity Score</span>
                    <div class="trust-bar-wrap"><div class="trust-bar" style="width:95%;background:#059669"></div></div>
                    <span class="trust-pct">95%</span>
                  </div>
                  <div class="trust-row">
                    <span class="trust-label">Response Rate</span>
                    <div class="trust-bar-wrap"><div class="trust-bar" style="width:97%;background:#7c3aed"></div></div>
                    <span class="trust-pct">97%</span>
                  </div>
                </div>
                <div class="trust-actions">
                  <button class="btn btn-sm btn-outline" onclick="toast('Email already verified ✓','success')">✉️ Email Verified</button>
                  <button class="btn btn-sm btn-outline" onclick="showAddLinkedIn()">🔗 Add LinkedIn</button>
                </div>
              </div>

              <!-- Profile Completeness -->
              <div class="dashboard-card">
                <div class="card-header">
                  <h3 class="card-title">📝 Profile Completeness</h3>
                  <button class="card-action" onclick="navigate('persona')">Edit</button>
                </div>
                <div class="pc-center">
                  ${completenessRing(87)}
                </div>
                <div class="pc-suggestions">
                  <div class="pc-suggestion">💡 Add LinkedIn URL — +5%</div>
                  <div class="pc-suggestion">💡 Upload resume — +5%</div>
                  <div class="pc-suggestion">💡 Add 2 more skills — +3%</div>
                </div>
              </div>

              <!-- Referral Card -->
              <div class="dashboard-card referral-card">
                <div class="referral-icon">🎁</div>
                <div class="referral-content">
                  <div class="referral-title">Invite a Colleague</div>
                  <div class="referral-desc">3 people joined through your link. Earn rewards for each hire!</div>
                  <div class="referral-link-row">
                    <code class="referral-link-text" id="referral-link-text">${APP.referralLink}</code>
                    <button class="btn btn-sm btn-primary" onclick="copyReferralLink()">Copy</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- KANBAN BOARD -->
          <div class="dashboard-card kanban-card-container">
            <div class="card-header">
              <h3 class="card-title">📌 Match Pipeline</h3>
              <button class="card-action" onclick="navigate('matches')">View All Matches</button>
            </div>
            ${isMobile() ? '<div class="swipe-hint">← Swipe right = interested, left = pass →</div>' : ''}
            ${kanbanHTML}
          </div>
        </div>
      </div>
      ${isMobile() ? navBar() : ''}
    </div>
  `);
}

function moveMatchStage(id, dir) {
  const STAGES = ['New Matches','Interested','Interviewing','Offer','Hired'];
  const match = SAMPLE_MATCHES.find(m => m.id === id);
  if (!match) return;
  const idx = STAGES.indexOf(match.stage);
  const newIdx = Math.max(0, Math.min(STAGES.length - 1, idx + dir));
  match.stage = STAGES[newIdx];
  toast(`Moved to "${STAGES[newIdx]}"`, 'success', 2000);
  renderCandidateDashboard();
}

function toggleAgent(isOn) {
  toast(isOn ? '🟢 Agent resumed — actively matching' : '⏸ Agent paused — no new matches', isOn ? 'success' : 'warning');
}

function showBoostModal() {
  showModal('⚡ Boost Your Profile', `
    <div class="boost-modal">
      <p>Boosting puts your profile at the top of recruiter agent queues for 48 hours.</p>
      <div class="boost-features">
        <div class="boost-feature">✅ 3× more visibility to recruiter agents</div>
        <div class="boost-feature">✅ Priority match evaluation</div>
        <div class="boost-feature">✅ "Boost" badge on your profile</div>
        <div class="boost-feature">✅ Estimated +40% match rate</div>
      </div>
      <div class="boost-price">Free during beta • <s>$29/mo</s> coming soon</div>
      <button class="btn btn-primary btn-full" onclick="activateBoost()">Activate 48-hour Boost</button>
    </div>
  `);
}

function activateBoost() {
  closeModal();
  toast('⚡ Profile boosted for 48 hours!', 'success', 4000);
}

function showAvailabilityDropdown() {
  showModal('Update Availability', `
    <div class="availability-selector">
      <div class="avail-option" onclick="updateAvailability('active')">
        <span class="avail-dot" style="background:#059669"></span>
        <div><div class="avail-label">Actively Looking</div><div class="avail-desc">Respond to matches quickly</div></div>
      </div>
      <div class="avail-option" onclick="updateAvailability('open')">
        <span class="avail-dot" style="background:#d97706"></span>
        <div><div class="avail-label">Open to Opportunities</div><div class="avail-desc">Passive — only great matches</div></div>
      </div>
      <div class="avail-option" onclick="updateAvailability('closed')">
        <span class="avail-dot" style="background:#dc2626"></span>
        <div><div class="avail-label">Not Looking</div><div class="avail-desc">Pause agent matching</div></div>
      </div>
    </div>
  `);
}

function updateAvailability(val) {
  if (APP.user) APP.user.availability = val;
  const labels = { active: '🟢 Actively Looking', open: '🟡 Open to Offers', closed: '🔴 Not Looking' };
  closeModal();
  toast('Availability updated: ' + labels[val], 'success');
}

function showAddLinkedIn() {
  showModal('Add LinkedIn Profile', `
    <div class="form-group">
      <label class="form-label">LinkedIn URL</label>
      <input type="url" id="linkedin-url" class="form-input" placeholder="https://linkedin.com/in/yourprofile">
    </div>
    <button class="btn btn-primary btn-full" onclick="saveLinkedIn()">Connect LinkedIn</button>
  `);
}

function saveLinkedIn() {
  closeModal();
  toast('LinkedIn connected! Trust score updated.', 'success');
}

function showFullFeed() {
  const feedHTML = AGENT_FEED_ITEMS.map(item => {
    const icons = { matched: '🎯', negotiating: '💬', reviewed: '👁', declined: '✗', milestone: '⭐' };
    return `<div class="feed-item" style="padding:12px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:18px;margin-right:10px">${icons[item.type] || '•'}</span>
      <div><div>${item.message}</div><div style="color:var(--text-muted);font-size:12px;margin-top:4px">${item.time}</div></div>
    </div>`;
  }).join('');
  showModal('Agent Activity Log', `<div style="max-height:60vh;overflow-y:auto">${feedHTML}</div>`);
}

function showNotifications() {
  showModal('Notifications', `
    <div class="notif-list">
      <div class="notif-item notif-unread">
        <div class="notif-dot"></div>
        <div>
          <div class="notif-msg">New match: Head of AI Research at TechNovate (94%)</div>
          <div class="notif-time">2 minutes ago</div>
        </div>
      </div>
      <div class="notif-item notif-unread">
        <div class="notif-dot"></div>
        <div>
          <div class="notif-msg">Agent negotiation complete — Meridian Systems interview available</div>
          <div class="notif-time">1 hour ago</div>
        </div>
      </div>
      <div class="notif-item notif-unread">
        <div class="notif-dot"></div>
        <div>
          <div class="notif-msg">Trust score increased to 94 — email verification complete</div>
          <div class="notif-time">3 hours ago</div>
        </div>
      </div>
      <div class="notif-item">
        <div style="width:8px"></div>
        <div>
          <div class="notif-msg">Weekly digest ready — 5 matches, 2 interviews</div>
          <div class="notif-time">Yesterday</div>
        </div>
      </div>
    </div>
  `);
}

function copyReferralLink() {
  const link = APP.referralLink;
  if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => toast('Referral link copied!', 'success'));
  else toast('Referral link: ' + link, 'info', 5000);
}

function showReferralModal() {
  showModal('🎁 Invite a Colleague', `
    <p>Share your unique referral link and earn rewards when they get hired!</p>
    <div class="form-group" style="margin-top:16px">
      <label class="form-label">Your Referral Link</label>
      <div style="display:flex;gap:8px">
        <input type="text" class="form-input" value="${APP.referralLink}" readonly id="referral-input">
        <button class="btn btn-primary" onclick="copyReferralLink()">Copy</button>
      </div>
    </div>
    <div class="referral-stats" style="display:flex;gap:16px;margin-top:16px">
      <div style="text-align:center"><div style="font-size:24px;font-weight:700;color:#0d9488">3</div><div style="font-size:12px;color:var(--text-muted)">Joined</div></div>
      <div style="text-align:center"><div style="font-size:24px;font-weight:700;color:#7c3aed">1</div><div style="font-size:12px;color:var(--text-muted)">Hired</div></div>
      <div style="text-align:center"><div style="font-size:24px;font-weight:700;color:#d97706">$150</div><div style="font-size:12px;color:var(--text-muted)">Earned</div></div>
    </div>
  `);
}

function toggleMobileNav() {
  const sidebar = document.querySelector('.sidebar-mobile-overlay');
  if (sidebar) { sidebar.remove(); return; }
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-mobile-overlay';
  overlay.innerHTML = navBar().replace('sidebar', 'sidebar sidebar-mobile-open');
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ─── Recruiter Dashboard ──────────────────────────────────────
function renderRecruiterDashboard() {
  const user = APP.user;

  const statsHTML = `
    <div class="stat-cards-grid">
      <div class="stat-card stat-teal">
        <div class="stat-card-icon">${iconBriefcase()}</div>
        <div class="stat-card-body">
          <div class="stat-card-num">4</div>
          <div class="stat-card-label">Active Jobs</div>
          <div class="stat-card-trend">3 open, 1 draft</div>
        </div>
      </div>
      <div class="stat-card stat-emerald">
        <div class="stat-card-icon">🎯</div>
        <div class="stat-card-body">
          <div class="stat-card-num">133</div>
          <div class="stat-card-label">Candidates Matched</div>
          <div class="stat-card-trend trend-up">↑ 24 this week</div>
        </div>
      </div>
      <div class="stat-card stat-purple">
        <div class="stat-card-icon">📅</div>
        <div class="stat-card-body">
          <div class="stat-card-num">8</div>
          <div class="stat-card-label">Interviews Scheduled</div>
          <div class="stat-card-trend trend-up">↑ 3 new</div>
        </div>
      </div>
      <div class="stat-card stat-amber">
        <div class="stat-card-icon">🏆</div>
        <div class="stat-card-body">
          <div class="stat-card-num">2</div>
          <div class="stat-card-label">Hires This Month</div>
          <div class="stat-card-trend">On track</div>
        </div>
      </div>
    </div>`;

  const jobsTableHTML = `
    <div class="dashboard-card">
      <div class="card-header">
        <h3 class="card-title">📋 Job Listings</h3>
        <div class="card-actions-row">
          <button class="btn btn-sm btn-primary" onclick="navigate('job-new')">+ Post New Job</button>
          <button class="btn btn-sm btn-outline" onclick="showAIJobDescModal()">🤖 AI Generator</button>
          <button class="btn btn-sm btn-outline" onclick="showBulkPostModal()">📦 Bulk Post</button>
        </div>
      </div>
      <div class="jobs-toolbar">
        <div class="jobs-filter-tabs">
          ${['all','Active','Paused','Closed','Draft'].map(f => `
            <button class="filter-tab ${(APP.jobFilter||'all') === f ? 'filter-tab-active' : ''}" onclick="filterJobs('${f}')">${f === 'all' ? 'All Jobs' : f}</button>`
          ).join('')}
        </div>
        <label class="toggle-label">
          <span>Pause All Matching</span>
          <label class="toggle-switch">
            <input type="checkbox" onchange="toggleAllMatching(this.checked)">
            <span class="toggle-track"></span>
          </label>
        </label>
      </div>
      ${isMobile() ? renderJobsCards() : renderJobsTable()}
    </div>`;

  renderApp(`
    <div class="app-layout">
      ${navBar()}
      <div class="main-content">
        ${topBar(`Hiring Dashboard`, `${user.company || 'Your Company'} · ${user.name}`)}
        <div class="dashboard-body">
          <!-- QUICK ACTIONS -->
          <div class="quick-actions-bar">
            <button class="btn btn-primary" onclick="navigate('job-new')">+ Post New Job</button>
            <button class="btn btn-outline" onclick="showDownloadReportModal()">📊 Download Report</button>
            <button class="btn btn-outline" onclick="navigate('matches')">View All Matches</button>
          </div>
          ${statsHTML}
          ${jobsTableHTML}
        </div>
      </div>
      ${isMobile() ? navBar() : ''}
    </div>
  `);
}

function renderJobsTable() {
  const filtered = APP.jobFilter === 'all' ? SAMPLE_JOBS : SAMPLE_JOBS.filter(j => j.status === APP.jobFilter);
  if (filtered.length === 0) return '<div class="empty-state">No jobs match this filter.</div>';

  return `
    <div class="jobs-table-wrap">
      <table class="jobs-table">
        <thead>
          <tr>
            <th onclick="sortJobs('title')">Job Title ⇅</th>
            <th onclick="sortJobs('posted')">Posted ⇅</th>
            <th>Status</th>
            <th onclick="sortJobs('candidates')">Candidates ⇅</th>
            <th onclick="sortJobs('matchRate')">Match Rate ⇅</th>
            <th>Salary</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(job => `
            <tr class="jobs-row" id="row-${job.id}">
              <td>
                <div class="job-title-cell">
                  <div class="job-title-text">${job.title}</div>
                  <div class="job-meta">${job.workModel} • ${job.skills.slice(0,2).join(', ')}</div>
                </div>
              </td>
              <td class="job-date">${job.posted}</td>
              <td>${pillStatus(job.status)}</td>
              <td class="job-count">${job.candidates}</td>
              <td>
                <div class="match-rate-cell">
                  <div class="match-rate-bar"><div style="width:${job.matchRate}%;background:${job.matchRate>70?'#059669':job.matchRate>50?'#d97706':'#dc2626'};height:6px;border-radius:3px"></div></div>
                  <span>${job.matchRate}%</span>
                </div>
              </td>
              <td class="job-salary">${formatSalaryRange(job.salary[0], job.salary[1])}</td>
              <td>
                <div class="job-actions">
                  <button class="btn btn-xs btn-outline" onclick="toggleJobExpand('${job.id}')">Pipeline</button>
                  <button class="btn btn-xs btn-primary" onclick="navigate('job/${job.id}')">Edit</button>
                </div>
              </td>
            </tr>
            <tr class="job-pipeline-row" id="pipeline-${job.id}" style="display:none">
              <td colspan="7">
                <div class="job-pipeline-inner">
                  ${renderMiniKanban(job)}
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderJobsCards() {
  const filtered = APP.jobFilter === 'all' ? SAMPLE_JOBS : SAMPLE_JOBS.filter(j => j.status === APP.jobFilter);
  return `<div class="jobs-cards-mobile">${filtered.map(job => `
    <div class="job-card-mobile" onclick="navigate('job/${job.id}')">
      <div class="job-card-header">
        <div>
          <div class="job-title-text">${job.title}</div>
          <div class="job-meta">${job.workModel} • ${formatSalaryRange(job.salary[0], job.salary[1])}</div>
        </div>
        ${pillStatus(job.status)}
      </div>
      <div class="job-card-stats">
        <span>👥 ${job.candidates} candidates</span>
        <span>📊 ${job.matchRate}% match rate</span>
      </div>
    </div>`).join('')}</div>`;
}

function renderMiniKanban(job) {
  const STAGES = ['New','Reviewed','Interview','Offer','Hired'];
  const candidates = SAMPLE_MATCHES.filter(m => m.jobId === job.id);

  return `
    <div class="mini-kanban">
      ${STAGES.map((s, si) => {
        const stageMatches = candidates.filter((_, i) => i % STAGES.length === si).slice(0, 2);
        return `
          <div class="mini-kanban-col">
            <div class="mini-kanban-header">${s} <span class="mini-kanban-count">${stageMatches.length}</span></div>
            ${stageMatches.map(m => `
              <div class="mini-kanban-card" onclick="navigate('match/${m.id}')">
                ${avatar(m.logo, m.companyColor, 28)}
                <div>
                  <div style="font-size:12px;font-weight:600">${m.title.split(' ').slice(0,2).join(' ')}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${m.score}% match</div>
                </div>
              </div>`).join('')}
          </div>`;
      }).join('')}
    </div>`;
}

function filterJobs(filter) {
  APP.jobFilter = filter;
  renderRecruiterDashboard();
}

function toggleJobExpand(id) {
  const row = document.getElementById('pipeline-' + id);
  if (!row) return;
  const isOpen = row.style.display !== 'none';
  row.style.display = isOpen ? 'none' : 'table-row';
}

function sortJobs(field) {
  SAMPLE_JOBS.sort((a, b) => {
    if (field === 'title') return a.title.localeCompare(b.title);
    if (field === 'posted') return b.posted.localeCompare(a.posted);
    if (field === 'candidates') return b.candidates - a.candidates;
    if (field === 'matchRate') return b.matchRate - a.matchRate;
    return 0;
  });
  renderRecruiterDashboard();
}

function toggleAllMatching(paused) {
  toast(paused ? '⏸ All job matching paused' : '▶ Job matching resumed', paused ? 'warning' : 'success');
}

function showDownloadReportModal() {
  showModal('📊 Hiring Report', `
    <div class="report-preview">
      <div class="report-header">TechNovate AI — Hiring Report</div>
      <div class="report-period">Period: Feb 1 – Feb 26, 2026</div>
      <div class="report-stats">
        <div class="report-stat"><span>Total candidates matched:</span> <strong>133</strong></div>
        <div class="report-stat"><span>Interviews scheduled:</span> <strong>8</strong></div>
        <div class="report-stat"><span>Offers extended:</span> <strong>3</strong></div>
        <div class="report-stat"><span>Hires closed:</span> <strong>2</strong></div>
        <div class="report-stat"><span>Avg time to hire:</span> <strong>11 days</strong></div>
        <div class="report-stat"><span>Top performing role:</span> <strong>Head of AI Research</strong></div>
      </div>
      <button class="btn btn-primary btn-full" style="margin-top:16px" onclick="toast('Report downloaded!','success');closeModal()">⬇ Download PDF</button>
    </div>
  `);
}

function showAIJobDescModal() {
  showModal('🤖 AI Job Description Generator', `
    <div class="form-group">
      <label class="form-label">Role Title</label>
      <input type="text" id="ai-role-title" class="form-input" placeholder="e.g. Senior Backend Engineer">
    </div>
    <button class="btn btn-primary btn-full" onclick="generateJobDesc()">Generate with AI</button>
    <div id="ai-job-output" style="margin-top:16px"></div>
  `);
}

async function generateJobDesc() {
  const title = document.getElementById('ai-role-title')?.value.trim();
  if (!title) { toast('Enter a role title first', 'error'); return; }
  document.getElementById('ai-job-output').innerHTML = '<div class="ai-generating">🤖 Generating description...</div>';
  await new Promise(r => setTimeout(r, 1200));
  document.getElementById('ai-job-output').innerHTML = `
    <div class="ai-result">
      <h4>Generated for: ${title}</h4>
      <p>We are looking for an exceptional ${title} to join our team. You will architect and build systems that serve millions of users, mentor junior engineers, and drive technical strategy alongside product and leadership.</p>
      <div class="ai-result-meta"><strong>Suggested salary:</strong> $130k–$180k · <strong>Skills:</strong> Python, AWS, System Design</div>
      <button class="btn btn-primary" onclick="closeModal();navigate('job-new')">Use This → Create Job</button>
    </div>`;
}

function showBulkPostModal() {
  showModal('📦 Bulk Post Jobs', `
    <p>Paste multiple job titles (one per line) to auto-generate postings.</p>
    <div class="form-group" style="margin-top:12px">
      <textarea id="bulk-jobs" class="form-input form-textarea" rows="6" placeholder="Senior ML Engineer&#10;Product Manager&#10;DevOps Lead&#10;Data Scientist"></textarea>
    </div>
    <button class="btn btn-primary btn-full" onclick="processBulkJobs()">Generate Job Drafts</button>
  `);
}

function processBulkJobs() {
  const text = document.getElementById('bulk-jobs')?.value.trim();
  if (!text) { toast('Enter at least one job title', 'error'); return; }
  const lines = text.split('\n').filter(l => l.trim()).length;
  closeModal();
  toast(`🤖 Generating ${lines} job drafts with AI...`, 'info', 3000);
  setTimeout(() => toast(`✅ ${lines} job drafts created!`, 'success'), 3200);
}

// ============================================================
// PART 5: Match Detail, Matches List, Persona, Job Form
// ============================================================

// ─── Matches List Page ────────────────────────────────────────
function renderMatches() {
  if (!APP.user) { navigate('landing'); return; }
  const filter = APP.matchFilter || 'all';
  const filtered = filter === 'all' ? SAMPLE_MATCHES : SAMPLE_MATCHES.filter(m => m.stage === filter);
  const STAGES = ['New Matches','Interested','Interviewing','Offer','Hired'];

  renderApp(`
    <div class="app-layout">
      ${navBar()}
      <div class="main-content">
        ${topBar('Your Matches', `${SAMPLE_MATCHES.length} total matches from your agent`)}
        <div class="dashboard-body">
          <div class="filter-bar">
            <button class="filter-tab ${filter === 'all' ? 'filter-tab-active' : ''}" onclick="APP.matchFilter='all';renderMatches()">All (${SAMPLE_MATCHES.length})</button>
            ${STAGES.map(s => {
              const count = SAMPLE_MATCHES.filter(m => m.stage === s).length;
              return `<button class="filter-tab ${filter === s ? 'filter-tab-active' : ''}" onclick="APP.matchFilter='${s}';renderMatches()">${s} (${count})</button>`;
            }).join('')}
          </div>
          <div class="matches-grid">
            ${filtered.map(m => `
              <div class="match-card" onclick="navigate('match/${m.id}')">
                <div class="match-card-header">
                  <div class="company-initial-lg" style="background:${m.companyColor}20;color:${m.companyColor}">${m.logo}</div>
                  <div class="match-card-meta">
                    <div class="match-card-company">${m.company}</div>
                    <div class="match-card-title">${m.title}</div>
                    <div class="match-card-stage-pill" style="background:${stageColor(m.stage)}20;color:${stageColor(m.stage)}">${m.stage}</div>
                  </div>
                  ${matchRing(m.score, 64)}
                </div>
                <div class="match-card-reasons">
                  ${m.reasons.map(r => `<span class="match-reason-tag">${r}</span>`).join('')}
                </div>
                <div class="match-card-confidence">
                  <span class="confidence-badge confidence-${m.confidence.toLowerCase()}">${m.confidence}</span>
                </div>
                <div class="match-card-actions">
                  <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();expressInterest('${m.id}')">Express Interest</button>
                  <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();declineMatch('${m.id}')">Decline</button>
                  <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();shareMatch('${m.id}')">Share 📤</button>
                </div>
              </div>`).join('')}
            ${filtered.length === 0 ? '<div class="empty-state">No matches in this stage yet.</div>' : ''}
          </div>
        </div>
      </div>
      ${isMobile() ? navBar() : ''}
    </div>
  `);
}

function expressInterest(id) {
  const m = SAMPLE_MATCHES.find(x => x.id === id);
  if (!m) return;
  if (m.stage === 'New Matches') m.stage = 'Interested';
  toast('Interest expressed! Your agent will follow up.', 'success');
  renderMatches();
}

function declineMatch(id) {
  const m = SAMPLE_MATCHES.find(x => x.id === id);
  if (!m) return;
  if (!confirm(`Decline ${m.title} at ${m.company}? Your agent will learn from this.`)) return;
  SAMPLE_MATCHES.splice(SAMPLE_MATCHES.indexOf(m), 1);
  toast('Match declined. Agent updated preferences.', 'info');
  renderMatches();
}

function shareMatch(id) {
  const m = SAMPLE_MATCHES.find(x => x.id === id);
  if (!m) return;
  const text = `I'm a ${m.score}% match for ${m.title} at ${m.company}! Try AgentHire → https://agenthire.ai`;
  showModal('Share This Match 📤', `
    <div class="share-card">
      <div class="share-card-content">
        <div class="share-company-initial" style="background:${m.companyColor}20;color:${m.companyColor}">${m.logo}</div>
        <div>
          <div style="font-weight:700;font-size:18px">${m.score}% Match</div>
          <div>${m.title} at ${m.company}</div>
        </div>
        ${matchRing(m.score, 60)}
      </div>
      <div class="share-reasons">${m.reasons.map(r => `<span class="match-reason-tag">${r}</span>`).join('')}</div>
      <div class="share-caption">Try AgentHire — AI finds your perfect match</div>
    </div>
    <div style="margin-top:16px">
      <div class="form-group">
        <label class="form-label">Share Link</label>
        <div style="display:flex;gap:8px">
          <input type="text" class="form-input" value="${text}" readonly id="share-text">
          <button class="btn btn-primary" onclick="navigator.clipboard&&navigator.clipboard.writeText(document.getElementById('share-text').value).then(()=>toast('Copied!','success'))">Copy</button>
        </div>
      </div>
    </div>
  `);
}

// ─── Match Detail Page ────────────────────────────────────────
function renderMatchDetail(id) {
  if (!APP.user) { navigate('landing'); return; }
  const m = SAMPLE_MATCHES.find(x => x.id === id) || SAMPLE_MATCHES[0];
  if (!m) { navigate('matches'); return; }
  APP.currentMatchId = id;

  const job = SAMPLE_JOBS.find(j => j.id === m.jobId);

  const confidenceClass = { High: 'confidence-high', Moderate: 'confidence-moderate', Exploratory: 'confidence-exploratory' };

  renderApp(`
    <div class="app-layout">
      ${navBar()}
      <div class="main-content">
        ${topBar('Match Detail', `${m.title} at ${m.company}`)}
        <div class="dashboard-body">
          <button class="back-btn" onclick="navigate('matches')">← Back to Matches</button>

          <!-- MATCH HEADER -->
          <div class="match-detail-header">
            <div class="match-detail-company">
              <div class="company-initial-xl" style="background:${m.companyColor}20;color:${m.companyColor}">${m.logo}</div>
              <div>
                <div class="match-detail-company-name">${m.company}</div>
                <div class="match-detail-job-title">${m.title}</div>
                <div class="match-detail-meta">
                  ${job ? `${job.workModel} · ${formatSalaryRange(job.salary[0], job.salary[1])} · ${job.skills.slice(0,3).join(', ')}` : ''}
                </div>
              </div>
            </div>
            <div class="match-detail-score-block">
              ${matchRing(m.score, 100)}
              <span class="confidence-badge ${confidenceClass[m.confidence]}">${m.confidence} Confidence</span>
              <div class="match-detail-stage-pill" style="background:${stageColor(m.stage)}20;color:${stageColor(m.stage)}">${m.stage}</div>
            </div>
          </div>

          <!-- MATCH GRID -->
          <div class="match-detail-grid">
            <!-- LEFT COLUMN -->
            <div class="match-detail-col">
              <!-- Match Reasons -->
              <div class="dashboard-card">
                <div class="card-header"><h3 class="card-title">Why You Match</h3></div>
                <div class="match-reasons-detail">
                  <div class="match-reason-row">
                    <span class="mr-label">Skills Overlap</span>
                    <div class="mr-bar-wrap"><div class="mr-bar" style="width:85%;background:#0d9488"></div></div>
                    <span class="mr-pct">85%</span>
                  </div>
                  <div class="match-reason-row">
                    <span class="mr-label">Salary Alignment</span>
                    <div class="mr-bar-wrap">
                      <div class="salary-overlap-vis">
                        <div class="salary-range-you" title="Your range: $160-200k"></div>
                        <div class="salary-range-them" title="Their range: $170-220k"></div>
                      </div>
                    </div>
                    <span class="mr-pct">92%</span>
                  </div>
                  <div class="match-reason-row">
                    <span class="mr-label">Culture Fit</span>
                    <div class="mr-bar-wrap"><div class="mr-bar" style="width:78%;background:#7c3aed"></div></div>
                    <span class="mr-pct">78%</span>
                  </div>
                  <div class="match-reason-row">
                    <span class="mr-label">Experience Level</span>
                    <div class="mr-bar-wrap"><div class="mr-bar" style="width:90%;background:#2563eb"></div></div>
                    <span class="mr-pct">90%</span>
                  </div>
                </div>
                <div class="match-reason-tags-block">
                  ${m.reasons.map(r => `<span class="match-reason-tag-lg">✓ ${r}</span>`).join('')}
                </div>
              </div>

              <!-- Negotiation Log -->
              <div class="dashboard-card">
                <div class="card-header">
                  <h3 class="card-title">🤝 Agent Negotiation Log</h3>
                  <button class="card-action" onclick="toggleNegotiationLog()">Expand</button>
                </div>
                <div class="negotiation-log" id="negotiation-log">
                  ${NEGOTIATION_LOG.map(entry => `
                    <div class="neg-entry neg-${entry.agent}">
                      <div class="neg-header">
                        <span class="neg-agent-icon">${entry.agent === 'candidate' ? '👤' : entry.agent === 'recruiter' ? '🏢' : '⚙️'}</span>
                        <span class="neg-agent-name">${entry.name}</span>
                        <span class="neg-time">${entry.time}</span>
                      </div>
                      <div class="neg-message">${entry.message}</div>
                    </div>`).join('')}
                  <div class="neg-status-banner">
                    ✅ Both agents recommend proceeding to human review
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT COLUMN -->
            <div class="match-detail-col">
              <!-- Profile Preview -->
              <div class="dashboard-card">
                <div class="card-header">
                  <h3 class="card-title">👤 Profile Preview</h3>
                  <span class="privacy-badge">🔒 Privacy protected</span>
                </div>
                <div class="profile-preview">
                  ${avatar(APP.user.avatar || APP.user.name.slice(0,2).toUpperCase(), '#0d9488', 56)}
                  <div>
                    <div class="pp-name">${APP.user.name}</div>
                    <div class="pp-title">${APP.user.title || 'Senior Engineer'}</div>
                    <div class="pp-location">${APP.user.location || 'San Francisco, CA'}</div>
                  </div>
                </div>
                <div class="pp-skills">
                  ${(APP.user.skills || ['Python','ML','AWS']).map(s => `<span class="skill-tag-display">${s}</span>`).join('')}
                </div>
                <div class="pp-availability">
                  <span class="avail-dot avail-dot-inline" style="background:#059669"></span>
                  ${APP.user.availability === 'active' ? 'Actively Looking' : APP.user.availability === 'open' ? 'Open to Opportunities' : 'Not Looking'}
                </div>
                <div style="margin-top:12px">
                  ${trustBadge(APP.user.trust || 94)}
                </div>
                <button class="btn btn-outline btn-full" style="margin-top:12px" onclick="showProfileConsentModal()">
                  Share Full Profile →
                </button>
              </div>

              <!-- Job Description -->
              ${job ? `
              <div class="dashboard-card">
                <div class="card-header"><h3 class="card-title">📋 Job Description</h3></div>
                <div class="jd-preview">
                  <p>${job.description}</p>
                  <div class="jd-skills">
                    <strong>Required:</strong>
                    ${job.skills.map(s => `<span class="skill-tag-display">${s}</span>`).join('')}
                  </div>
                  <div class="jd-salary">
                    <strong>Compensation:</strong> ${formatSalaryRange(job.salary[0], job.salary[1])}
                  </div>
                </div>
              </div>` : ''}
            </div>
          </div>

          <!-- ACTION BAR -->
          <div class="match-action-bar">
            <button class="btn btn-primary btn-lg" onclick="expressInterestDetail('${m.id}')">Express Interest</button>
            <button class="btn btn-outline btn-lg" onclick="scheduleInterview('${m.id}')">📅 Schedule Interview</button>
            <button class="btn btn-outline btn-lg" onclick="messageCompany('${m.id}')">💬 Message</button>
            <button class="btn btn-ghost btn-lg" onclick="declineMatch('${m.id}')">Decline</button>
            <button class="btn btn-ghost btn-lg" onclick="shareMatch('${m.id}')">Share 📤</button>
          </div>
        </div>
      </div>
      ${isMobile() ? navBar() : ''}
    </div>
  `);
}

function toggleNegotiationLog() {
  const log = document.getElementById('negotiation-log');
  if (!log) return;
  log.style.maxHeight = log.style.maxHeight ? '' : '600px';
}

function expressInterestDetail(id) {
  const m = SAMPLE_MATCHES.find(x => x.id === id);
  if (m) m.stage = 'Interested';
  toast('🎯 Interest expressed! The recruiter agent has been notified.', 'success', 4000);
  renderMatchDetail(id);
}

function scheduleInterview(id) {
  const m = SAMPLE_MATCHES.find(x => x.id === id);
  showModal('Schedule Interview', `
    <p>Request an interview with ${m ? m.company : 'the company'}.</p>
    <div class="form-group">
      <label class="form-label">Preferred Date</label>
      <input type="date" class="form-input" id="interview-date">
    </div>
    <div class="form-group">
      <label class="form-label">Preferred Time (Your timezone)</label>
      <select class="form-input" id="interview-time">
        <option>9:00 AM</option><option>10:00 AM</option><option>11:00 AM</option>
        <option>1:00 PM</option><option>2:00 PM</option><option>3:00 PM</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Interview Format</label>
      <div class="toggle-group">
        <button class="toggle-btn toggle-active">Video Call</button>
        <button class="toggle-btn">Phone</button>
        <button class="toggle-btn">In-Person</button>
      </div>
    </div>
    <button class="btn btn-primary btn-full" onclick="confirmInterview('${id}')">Send Request</button>
  `);
}

function confirmInterview(id) {
  const m = SAMPLE_MATCHES.find(x => x.id === id);
  if (m) m.stage = 'Interviewing';
  closeModal();
  toast('📅 Interview request sent! Awaiting confirmation.', 'success');
  renderMatchDetail(id);
}

function messageCompany(id) {
  const m = SAMPLE_MATCHES.find(x => x.id === id);
  showModal(`Message ${m ? m.company : 'Company'}`, `
    <div class="form-group">
      <textarea class="form-input form-textarea" rows="4" placeholder="Hi, I'm very excited about this opportunity and would love to learn more about..."></textarea>
    </div>
    <button class="btn btn-primary btn-full" onclick="closeModal();toast('Message sent!','success')">Send Message</button>
  `);
}

function showProfileConsentModal() {
  showModal('Share Full Profile', `
    <p>You're about to share your complete profile with this recruiter's agent. This includes:</p>
    <ul style="margin:12px 0;line-height:1.8">
      <li>Full name and contact details</li>
      <li>Complete work history</li>
      <li>References</li>
      <li>Full skill endorsements</li>
    </ul>
    <p style="color:var(--text-muted);font-size:13px">You can revoke access anytime from Settings → Privacy.</p>
    <button class="btn btn-primary btn-full" onclick="closeModal();toast('Full profile shared securely.','success')">Share Profile</button>
  `, []);
}

// ─── Persona / Profile Edit ───────────────────────────────────
function renderPersona() {
  if (!APP.user) { navigate('landing'); return; }
  const user = APP.user;
  const skills = user.skills || ['Python','TensorFlow','AWS'];
  const activeTab = APP.personaTab || 'basic';

  const TABS = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'skills', label: 'Skills & Exp' },
    { id: 'prefs', label: 'Preferences' },
    { id: 'agent', label: 'Agent Settings' },
    { id: 'privacy', label: 'Privacy Shield' },
    { id: 'trust', label: 'Trust Score' },
  ];

  const tabContentMap = {
    basic: `
      <div class="persona-avatar-row">
        <div class="persona-avatar-upload" onclick="toast('Photo upload coming soon','info')">
          ${avatar(user.avatar || user.name.slice(0,2).toUpperCase(), '#0d9488', 80)}
          <div class="persona-avatar-edit">📷</div>
        </div>
        <div class="persona-avatar-info">
          <div class="persona-name">${user.name}</div>
          <div class="persona-role">${user.title || user.company || 'Member'}</div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" id="p-name" class="form-input" value="${user.name}" oninput="markPersonaDirty()">
        </div>
        <div class="form-group">
          <label class="form-label">Headline / Title</label>
          <input type="text" id="p-headline" class="form-input" value="${user.title || ''}" oninput="markPersonaDirty()">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="p-email" class="form-input" value="${user.email}" oninput="markPersonaDirty()">
        </div>
        <div class="form-group">
          <label class="form-label">Location</label>
          <input type="text" id="p-location" class="form-input" value="${user.location || ''}" placeholder="City, State" oninput="markPersonaDirty()">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">LinkedIn Profile URL</label>
        <input type="url" id="p-linkedin" class="form-input" value="${user.linkedin || ''}" placeholder="https://linkedin.com/in/yourprofile" oninput="markPersonaDirty()">
      </div>`,

    skills: `
      <div class="form-group">
        <label class="form-label">Skills <span class="form-label-hint">Type and press Enter to add</span></label>
        <div class="skill-tag-input">
          <div class="skill-tags-selected" id="persona-skill-tags">
            ${skills.map(s => `<span class="skill-tag skill-tag-added">${s}<button onclick="removePersonaSkill('${s}')">×</button></span>`).join('')}
            <input type="text" id="persona-skill-input" class="skill-input" placeholder="Add skill..." onkeydown="addPersonaSkillOnEnter(event)" oninput="markPersonaDirty()">
          </div>
        </div>
        <div class="skill-suggestions" id="persona-skill-suggestions" style="margin-top:8px">
          ${SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).slice(0,10).map(s =>
            `<span class="skill-suggestion" onclick="addPersonaSkill('${s}')">${s}</span>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Years of Experience: <strong id="persona-exp-display">${user.experience || 5}</strong></label>
        <input type="range" id="persona-exp" class="range-slider" min="0" max="20" value="${user.experience || 5}"
          oninput="document.getElementById('persona-exp-display').textContent=this.value=='20'?'20+':this.value;markPersonaDirty()">
        <div class="range-labels"><span>0</span><span>10</span><span>20+</span></div>
      </div>`,

    prefs: `
      <div class="form-group">
        <label class="form-label">Availability Status</label>
        <div class="availability-selector">
          ${[
            { id: 'active', dot: '#059669', label: 'Actively Looking', desc: 'Respond to matches quickly' },
            { id: 'open', dot: '#d97706', label: 'Open to Opportunities', desc: 'Passive — only great matches' },
            { id: 'closed', dot: '#dc2626', label: 'Not Looking', desc: 'Pause agent matching' },
          ].map(a => `<div class="avail-option ${(user.availability || 'active') === a.id ? 'avail-selected' : ''}" onclick="updateAvailability('${a.id}')">
            <span class="avail-dot" style="background:${a.dot}"></span>
            <div><div class="avail-label">${a.label}</div><div class="avail-desc">${a.desc}</div></div>
          </div>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Target Salary Range: <strong id="persona-sal-display">${formatSalaryRange((user.salary||[120000,160000])[0], (user.salary||[120000,160000])[1])}</strong></label>
        <input type="range" id="persona-sal-min" class="range-slider" min="50000" max="300000" step="5000" value="${(user.salary||[120000,160000])[0]}" oninput="updatePersonaSalary();markPersonaDirty()">
        <input type="range" id="persona-sal-max" class="range-slider" min="50000" max="300000" step="5000" value="${(user.salary||[120000,160000])[1]}" oninput="updatePersonaSalary();markPersonaDirty()">
        <div class="range-labels"><span>$50k</span><span>$175k</span><span>$300k</span></div>
      </div>
      <div class="form-group">
        <label class="form-label">Work Preference</label>
        <div class="toggle-group">
          ${['Remote','Hybrid','On-site'].map(w => `
            <button class="toggle-btn ${(user.workPref || 'Remote') === w ? 'toggle-active' : ''}" onclick="user.workPref='${w}';this.parentNode.querySelectorAll('.toggle-btn').forEach(b=>b.classList.remove('toggle-active'));this.classList.add('toggle-active');markPersonaDirty()">${w}</button>`
          ).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Deal-breakers</label>
        <div class="industry-tags">
          ${DEALBREAKER_OPTIONS.map(d => {
            const sel = (user.dealbreakers || []).includes(d);
            return `<span class="industry-tag ${sel ? 'industry-selected industry-danger' : ''}" onclick="toggleUserDealbreaker('${d}')">${d}</span>`;
          }).join('')}
        </div>
      </div>`,

    agent: `
      <div class="agent-settings-section">
        <div class="form-group">
          <label class="form-label">Agent Aggressiveness: <strong id="aggr-display">70%</strong></label>
          <input type="range" id="aggr-slider" class="range-slider" min="0" max="100" value="70"
            oninput="document.getElementById('aggr-display').textContent=this.value+'%';markPersonaDirty()">
          <div class="range-help">Low = conservative matching · High = explore more options</div>
        </div>
        <div class="priority-weights-section">
          <label class="form-label">Priority Weights</label>
          ${[
            { id: 'pw-compensation', label: 'Compensation', val: 85 },
            { id: 'pw-culture', label: 'Culture Fit', val: 70 },
            { id: 'pw-growth', label: 'Career Growth', val: 75 },
            { id: 'pw-wlb', label: 'Work-life Balance', val: 60 },
            { id: 'pw-tech', label: 'Technical Challenge', val: 80 },
          ].map(p => `
            <div class="priority-weight-row">
              <span class="pw-label">${p.label}</span>
              <input type="range" id="${p.id}" class="range-slider pw-slider" min="0" max="100" value="${p.val}"
                oninput="markPersonaDirty()">
              <span class="pw-val">${p.val}%</span>
            </div>`).join('')}
        </div>
        <div class="form-group">
          <label class="form-label">Auto-decline Threshold: <strong id="autodecline-display">Below 60% match</strong></label>
          <input type="range" id="autodecline-slider" class="range-slider" min="30" max="90" step="5" value="60"
            oninput="document.getElementById('autodecline-display').textContent='Below '+this.value+'% match';markPersonaDirty()">
        </div>
        <div class="form-check">
          <input type="checkbox" id="auto-respond" checked onchange="markPersonaDirty()">
          <label for="auto-respond">Auto-respond to recruiter agents on my behalf</label>
        </div>
        <div class="form-check">
          <input type="checkbox" id="batch-responses" onchange="markPersonaDirty()">
          <label for="batch-responses">Batch agent responses (every 4 hours instead of real-time)</label>
        </div>
      </div>`,

    privacy: `
      <div class="privacy-shield">
        <div class="privacy-shield-header">
          <span>${iconShield()}</span>
          <div>
            <div class="privacy-shield-title">Privacy Shield</div>
            <div class="privacy-shield-desc">Control what information is visible to matches</div>
          </div>
        </div>
        <div class="privacy-fields">
          ${[
            { field: 'Full Name', visible: true },
            { field: 'Professional Headline', visible: true },
            { field: 'Location', visible: true },
            { field: 'Email Address', visible: false },
            { field: 'Phone Number', visible: false },
            { field: 'Current Company', visible: false },
            { field: 'Salary Expectations', visible: true },
            { field: 'Resume / Work History', visible: false },
            { field: 'Skills List', visible: true },
            { field: 'LinkedIn Profile', visible: false },
          ].map(f => `
            <div class="privacy-field-row">
              <div class="privacy-field-info">
                <span class="privacy-field-name">${f.field}</span>
                <span class="privacy-field-status ${f.visible ? 'pf-visible' : 'pf-hidden'}">${f.visible ? '👁 Visible to matches' : '🔒 Hidden'}</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" ${f.visible ? 'checked' : ''} onchange="togglePrivacyField('${f.field}', this.checked)">
                <span class="toggle-track"></span>
              </label>
            </div>`).join('')}
        </div>
        <div class="privacy-note">
          🔒 Hidden fields are never shared. Your agent uses them internally for matching but never reveals them to other agents.
        </div>
      </div>`,

    trust: `
      <div class="trust-score-detail">
        <div class="trust-score-hero">
          <div class="trust-score-big" style="color:#059669">${user.trust || 94}</div>
          <div class="trust-score-label">Trust Score</div>
        </div>
        <div class="trust-breakdown">
          ${[
            { label: 'Identity Verification', pct: 90, color: '#0d9488', desc: 'Email verified · ID pending' },
            { label: 'Activity Score', pct: 95, color: '#059669', desc: 'Regular login, responsive' },
            { label: 'Response Rate', pct: 97, color: '#7c3aed', desc: 'Responded to 97% of matches' },
          ].map(t => `
            <div class="trust-row">
              <div>
                <span class="trust-label">${t.label}</span>
                <span class="trust-desc">${t.desc}</span>
              </div>
              <div class="trust-bar-section">
                <div class="trust-bar-wrap"><div class="trust-bar" style="width:${t.pct}%;background:${t.color}"></div></div>
                <span class="trust-pct">${t.pct}%</span>
              </div>
            </div>`).join('')}
        </div>
        <div class="trust-actions-section">
          <h4>Boost Your Trust Score</h4>
          <div class="trust-action-row">
            <div>
              <div class="trust-action-label">✉️ Email Verification</div>
              <div class="trust-action-status trust-done">Completed — +20 points</div>
            </div>
            <button class="btn btn-sm btn-outline" disabled>Verified ✓</button>
          </div>
          <div class="trust-action-row">
            <div>
              <div class="trust-action-label">🔗 LinkedIn Connection</div>
              <div class="trust-action-status">Not connected — +15 points</div>
            </div>
            <button class="btn btn-sm btn-primary" onclick="showAddLinkedIn()">Connect</button>
          </div>
          <div class="trust-action-row">
            <div>
              <div class="trust-action-label">📱 Phone Verification</div>
              <div class="trust-action-status">Not verified — +10 points</div>
            </div>
            <button class="btn btn-sm btn-primary" onclick="showPhoneVerify()">Verify</button>
          </div>
        </div>
      </div>`,
  };

  renderApp(`
    <div class="app-layout">
      ${navBar()}
      <div class="main-content">
        ${topBar('My Profile', 'Manage your identity and preferences')}
        <div class="dashboard-body">
          <div class="persona-layout">
            <!-- Completeness Ring Sidebar -->
            <div class="persona-sidebar">
              <div class="dashboard-card persona-completeness-card">
                <div class="card-title" style="margin-bottom:12px">Profile Completeness</div>
                ${completenessRing(87)}
                <div class="pc-suggestions">
                  <div class="pc-suggestion">💡 Add LinkedIn — +5%</div>
                  <div class="pc-suggestion">💡 Upload resume — +5%</div>
                  <div class="pc-suggestion">💡 2 more skills — +3%</div>
                </div>
              </div>
            </div>

            <!-- Main Editing Area -->
            <div class="persona-main">
              <div class="dashboard-card">
                <!-- Tabs -->
                <div class="persona-tabs">
                  ${TABS.map(t => `
                    <button class="persona-tab ${activeTab === t.id ? 'persona-tab-active' : ''}" onclick="switchPersonaTab('${t.id}')">${t.label}</button>`
                  ).join('')}
                </div>
                <div class="persona-tab-content" id="persona-tab-content">
                  ${tabContentMap[activeTab] || ''}
                </div>
                <div class="persona-save-bar ${APP.personaDirty ? 'save-bar-visible' : ''}">
                  <span class="unsaved-indicator">● Unsaved changes</span>
                  <div style="display:flex;gap:8px">
                    <button class="btn btn-ghost" onclick="discardPersonaChanges()">Discard</button>
                    <button class="btn btn-primary" onclick="savePersona()">Save Changes</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${isMobile() ? navBar() : ''}
    </div>
  `);
}

function switchPersonaTab(tab) {
  APP.personaTab = tab;
  renderPersona();
}

function markPersonaDirty() {
  if (!APP.personaDirty) {
    APP.personaDirty = true;
    const bar = document.querySelector('.persona-save-bar');
    if (bar) bar.classList.add('save-bar-visible');
  }
}

function savePersona() {
  // Collect basic info
  const name = document.getElementById('p-name')?.value.trim();
  const headline = document.getElementById('p-headline')?.value.trim();
  const location = document.getElementById('p-location')?.value.trim();
  const linkedin = document.getElementById('p-linkedin')?.value.trim();
  if (name) APP.user.name = name;
  if (headline) APP.user.title = headline;
  if (location) APP.user.location = location;
  if (linkedin) APP.user.linkedin = linkedin;
  APP.personaDirty = false;
  toast('Profile saved!', 'success');
  renderPersona();
}

function discardPersonaChanges() {
  APP.personaDirty = false;
  toast('Changes discarded', 'info');
  renderPersona();
}

function addPersonaSkill(skill) {
  if (!APP.user.skills) APP.user.skills = [];
  if (!APP.user.skills.includes(skill)) { APP.user.skills.push(skill); markPersonaDirty(); renderPersona(); }
}

function removePersonaSkill(skill) {
  APP.user.skills = (APP.user.skills || []).filter(s => s !== skill);
  markPersonaDirty(); renderPersona();
}

function addPersonaSkillOnEnter(e) {
  if (e.key === 'Enter') {
    const val = e.target.value.trim();
    if (val) { addPersonaSkill(val); e.target.value = ''; }
    e.preventDefault();
  }
}

function updatePersonaSalary() {
  const min = parseInt(document.getElementById('persona-sal-min')?.value || 120000);
  const max = parseInt(document.getElementById('persona-sal-max')?.value || 160000);
  APP.user.salary = [Math.min(min,max), Math.max(min,max)];
  const disp = document.getElementById('persona-sal-display');
  if (disp) disp.textContent = formatSalaryRange(APP.user.salary[0], APP.user.salary[1]);
}

function toggleUserDealbreaker(d) {
  if (!APP.user.dealbreakers) APP.user.dealbreakers = [];
  const idx = APP.user.dealbreakers.indexOf(d);
  if (idx >= 0) APP.user.dealbreakers.splice(idx, 1);
  else APP.user.dealbreakers.push(d);
  markPersonaDirty();
  document.querySelectorAll('.industry-tags .industry-tag').forEach(el => {
    if (DEALBREAKER_OPTIONS.includes(el.textContent)) {
      el.classList.toggle('industry-selected', APP.user.dealbreakers.includes(el.textContent));
      el.classList.toggle('industry-danger', APP.user.dealbreakers.includes(el.textContent));
    }
  });
}

function togglePrivacyField(field, visible) {
  toast(`${field}: ${visible ? 'Now visible to matches' : 'Now hidden'}`, 'info', 2000);
}

function showPhoneVerify() {
  showModal('Phone Verification', `
    <div class="form-group">
      <label class="form-label">Phone Number</label>
      <input type="tel" id="phone-number" class="form-input" placeholder="+1 (555) 000-0000">
    </div>
    <button class="btn btn-primary btn-full" onclick="sendPhoneCode()">Send Verification Code</button>
    <div id="phone-code-section" style="display:none;margin-top:16px">
      <div class="form-group">
        <label class="form-label">6-digit Code</label>
        <input type="text" id="phone-code" class="form-input" placeholder="000000" maxlength="6">
      </div>
      <button class="btn btn-primary btn-full" onclick="verifyPhoneCode()">Verify</button>
    </div>
  `);
}

function sendPhoneCode() {
  document.getElementById('phone-code-section').style.display = 'block';
  toast('Code sent (demo: use 123456)', 'info');
}

function verifyPhoneCode() {
  const code = document.getElementById('phone-code')?.value;
  if (code === '123456') {
    closeModal();
    toast('Phone verified! +10 trust score points', 'success');
  } else {
    toast('Invalid code. Demo code: 123456', 'error');
  }
}

// ============================================================
