// PART 6: Job Posting Form, Jobs List, Settings, Privacy Page
// ============================================================

// ─── Job Posting Form ───────────────────────────────────────────
function renderJobForm(jobId) {
  if (!APP.user) { navigate('landing'); return; }
  const job = jobId ? SAMPLE_JOBS.find(j => j.id === jobId) : null;
  const isEdit = !!job;

  const JOB_TEMPLATES = [
    { label: 'Software Engineer', title: 'Senior Software Engineer', skills: ['Python','JavaScript','AWS'], salary: [130000, 170000] },
    { label: 'ML Engineer', title: 'Machine Learning Engineer', skills: ['Python','TensorFlow','MLOps'], salary: [150000, 200000] },
    { label: 'Product Manager', title: 'Senior Product Manager', skills: ['Product Strategy','SQL','Figma'], salary: [130000, 175000] },
    { label: 'DevOps Engineer', title: 'DevOps / Platform Engineer', skills: ['Kubernetes','Terraform','AWS'], salary: [125000, 165000] },
    { label: 'Data Scientist', title: 'Senior Data Scientist', skills: ['Python','R','Statistics','ML'], salary: [120000, 160000] },
  ];

  const reqSkills = job ? [...job.skills] : [];
  const salary = job ? job.salary : [100000, 150000];

  renderApp(`
    <div class="app-layout">
      ${navBar()}
      <div class="main-content">
        ${topBar(isEdit ? `Edit: ${job.title}` : 'Post New Job', isEdit ? 'Update this job posting' : 'Create a new job posting')}
        <div class="dashboard-body">
          <button class="back-btn" onclick="navigate('jobs')">← Back to Jobs</button>

          <div class="job-form-layout">
            <div class="job-form-main">
              <div class="dashboard-card">
                <!-- Template Library -->
                <div class="form-group">
                  <label class="form-label">Start from Template</label>
                  <select class="form-input" id="job-template" onchange="applyJobTemplate(this.value)">
                    <option value="">— Choose a template —</option>
                    ${JOB_TEMPLATES.map(t => `<option value="${t.label}">${t.label}</option>`).join('')}
                  </select>
                </div>

                <!-- Role Title -->
                <div class="form-group">
                  <label class="form-label">Role Title <span class="required-star">*</span></label>
                  <div style="display:flex;gap:8px">
                    <input type="text" id="job-title" class="form-input" value="${job?.title || ''}" placeholder="e.g. Senior Machine Learning Engineer" oninput="updateJobQuality()">
                    <button class="btn btn-outline ai-suggest-btn" onclick="aiSuggestJobDesc()" title="AI Suggest">🤖 AI Suggest</button>
                  </div>
                </div>

                <!-- Description -->
                <div class="form-group">
                  <label class="form-label">Job Description <span class="required-star">*</span></label>
                  <textarea id="job-desc" class="form-input form-textarea" rows="6"
                    placeholder="Describe the role, responsibilities, and what success looks like..."
                    oninput="updateJobQuality()">${job?.description || ''}</textarea>
                  <div class="textarea-count" id="desc-count">${job?.description?.length || 0} chars (aim for 200+)</div>
                </div>

                <!-- Required Skills -->
                <div class="form-group">
                  <label class="form-label">Required Skills <span class="required-star">*</span></label>
                  <div class="skill-tag-input">
                    <div class="skill-tags-selected" id="job-skills-tags">
                      ${reqSkills.map(s => `<span class="skill-tag skill-tag-added">${s}<button onclick="removeJobSkill('${s}')">×</button></span>`).join('')}
                      <input type="text" id="job-skill-input" class="skill-input" placeholder="Add required skill..."
                        onkeydown="addJobSkillOnEnter(event)" oninput="filterJobSkillSuggestions(this.value);updateJobQuality()">
                    </div>
                  </div>
                  <div class="skill-suggestions" id="job-skill-suggestions" style="margin-top:8px">
                    ${SKILL_SUGGESTIONS.filter(s => !reqSkills.includes(s)).slice(0,10).map(s =>
                      `<span class="skill-suggestion" onclick="addJobSkill('${s}')">${s}</span>`).join('')}
                  </div>
                </div>

                <!-- Salary (MANDATORY) -->
                <div class="form-group">
                  <label class="form-label">Salary Range <span class="required-star">*</span> <span class="form-label-hint">REQUIRED — improves match rate by 40%</span></label>
                  <strong id="job-sal-display">${formatSalaryRange(salary[0], salary[1])}</strong>
                  <input type="range" id="job-sal-min" class="range-slider" min="50000" max="300000" step="5000" value="${salary[0]}"
                    oninput="updateJobSalaryDisplay();updateJobQuality()">
                  <input type="range" id="job-sal-max" class="range-slider" min="50000" max="300000" step="5000" value="${salary[1]}"
                    oninput="updateJobSalaryDisplay();updateJobQuality()">
                  <div class="range-labels"><span>$50k</span><span>$175k</span><span>$300k</span></div>
                </div>

                <!-- Work Model -->
                <div class="form-group">
                  <label class="form-label">Work Model</label>
                  <div class="toggle-group" id="job-work-model">
                    ${['Remote','Hybrid','On-site'].map(w => `
                      <button class="toggle-btn ${(job?.workModel || 'Remote') === w ? 'toggle-active' : ''}"
                        onclick="selectJobWorkModel('${w}')">${w}</button>`).join('')}
                  </div>
                </div>

                <!-- Experience Level -->
                <div class="form-group">
                  <label class="form-label">Experience Level</label>
                  <div class="toggle-group">
                    ${['Junior (0-2y)','Mid (2-5y)','Senior (5-8y)','Staff (8y+)'].map(e => `
                      <button class="toggle-btn ${e.startsWith('Senior') ? 'toggle-active' : ''}"
                        onclick="selectJobExpLevel(this, '${e}')">${e}</button>`).join('')}
                  </div>
                </div>

                <!-- Benefits -->
                <div class="form-group">
                  <label class="form-label">Benefits Offered</label>
                  <div class="checklist-grid">
                    ${BENEFIT_OPTIONS.map(b => {
                      const isChecked = ['Health Insurance','401k/Retirement','Equity/Stock'].includes(b);
                      return `<label class="check-item"><input type="checkbox" ${isChecked ? 'checked' : ''} onchange="updateJobQuality()"><span>${b}</span></label>`;
                    }).join('')}
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="job-form-actions">
                  <button class="btn btn-ghost" onclick="saveJobDraft()">Save as Draft</button>
                  <button class="btn btn-primary btn-lg" onclick="publishJob()">
                    ${isEdit ? 'Update Job' : 'Publish Job'} →
                  </button>
                </div>
              </div>
            </div>

            <!-- SIDEBAR: Quality Score -->
            <div class="job-form-sidebar">
              <div class="dashboard-card quality-score-card">
                <div class="card-title">Job Quality Score</div>
                <div class="quality-score-ring" id="quality-ring">
                  ${jobQualityRing(job ? 82 : 35)}
                </div>
                <div class="quality-checklist" id="quality-checklist">
                  ${renderQualityChecklist(job ? 82 : 35)}
                </div>
                <div class="quality-tip" id="quality-tip">
                  ${job ? '✅ Good quality — consider adding more benefits' : '💡 Add a title and description to start'}
                </div>
              </div>

              <!-- AI Suggestions Panel -->
              <div class="dashboard-card ai-suggestions-panel" id="ai-suggestions-panel" style="display:none">
                <div class="card-title">🤖 AI Suggestions</div>
                <div id="ai-suggestion-content"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${isMobile() ? navBar() : ''}
    </div>
  `);

  // Store job skills globally for this form
  window._jobFormSkills = [...(job?.skills || [])];
}

function jobQualityRing(score) {
  const color = score >= 70 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  const r = 40, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return `<svg width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="8"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="8"
      stroke-dasharray="${dash} ${circ}" stroke-linecap="round" transform="rotate(-90 50 50)"/>
    <text x="50" y="50" text-anchor="middle" fill="${color}" font-size="20" font-weight="700" dy="6">${score}</text>
  </svg>`;
}

function renderQualityChecklist(score) {
  const checks = [
    { label: 'Role title filled', done: score > 10 },
    { label: 'Description (200+ chars)', done: score > 30 },
    { label: 'Skills added (3+)', done: score > 50 },
    { label: 'Salary range set', done: score > 40 },
    { label: 'Work model selected', done: true },
    { label: 'Benefits listed', done: score > 60 },
  ];
  return checks.map(c => `
    <div class="quality-check ${c.done ? 'quality-check-done' : ''}">
      <span>${c.done ? '✓' : '○'}</span>
      <span>${c.label}</span>
    </div>`).join('');
}

function updateJobQuality() {
  let score = 0;
  const title = document.getElementById('job-title')?.value.trim();
  const desc = document.getElementById('job-desc')?.value.trim();
  const count = document.getElementById('desc-count');
  if (count && desc !== undefined) count.textContent = `${desc.length} chars (aim for 200+)`;
  if (title && title.length > 3) score += 20;
  if (desc && desc.length > 50) score += 15;
  if (desc && desc.length > 200) score += 10;
  const skills = (window._jobFormSkills || []).length;
  if (skills >= 1) score += 10;
  if (skills >= 3) score += 10;
  const salMin = parseInt(document.getElementById('job-sal-min')?.value || 0);
  if (salMin > 50000) score += 15;
  const benefits = document.querySelectorAll('.checklist-grid input[type=checkbox]:checked').length;
  if (benefits >= 2) score += 10;
  if (benefits >= 4) score += 10;
  score = Math.min(100, score);
  const ring = document.getElementById('quality-ring');
  if (ring) ring.innerHTML = jobQualityRing(score);
  const checklist = document.getElementById('quality-checklist');
  if (checklist) checklist.innerHTML = renderQualityChecklist(score);
  const tip = document.getElementById('quality-tip');
  if (tip) tip.textContent = score >= 80 ? '✅ Excellent! This job will attract top matches' : score >= 60 ? '💡 Good — add more details to improve' : '⚠️ Add title, description, and salary for better matches';
}

function updateJobSalaryDisplay() {
  const min = parseInt(document.getElementById('job-sal-min')?.value || 100000);
  const max = parseInt(document.getElementById('job-sal-max')?.value || 150000);
  const disp = document.getElementById('job-sal-display');
  if (disp) disp.textContent = formatSalaryRange(Math.min(min,max), Math.max(min,max));
}

function selectJobWorkModel(model) {
  document.querySelectorAll('#job-work-model .toggle-btn').forEach((btn, i) => {
    btn.classList.toggle('toggle-active', ['Remote','Hybrid','On-site'][i] === model);
  });
}

function selectJobExpLevel(el, level) {
  el.parentNode.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('toggle-active'));
  el.classList.add('toggle-active');
}

function addJobSkill(skill) {
  if (!window._jobFormSkills) window._jobFormSkills = [];
  if (!window._jobFormSkills.includes(skill)) {
    window._jobFormSkills.push(skill);
    const tags = document.getElementById('job-skills-tags');
    const input = document.getElementById('job-skill-input');
    if (tags && input) {
      const span = document.createElement('span');
      span.className = 'skill-tag skill-tag-added';
      span.innerHTML = `${skill}<button onclick="removeJobSkill('${skill}')">×</button>`;
      tags.insertBefore(span, input);
    }
    updateJobQuality();
  }
}

function removeJobSkill(skill) {
  window._jobFormSkills = (window._jobFormSkills || []).filter(s => s !== skill);
  document.querySelectorAll('#job-skills-tags .skill-tag-added').forEach(el => {
    if (el.textContent.replace('×','').trim() === skill) el.remove();
  });
  updateJobQuality();
}

function addJobSkillOnEnter(e) {
  if (e.key === 'Enter') {
    const val = e.target.value.trim();
    if (val) { addJobSkill(val); e.target.value = ''; }
    e.preventDefault();
  }
}

function filterJobSkillSuggestions(val) {
  const container = document.getElementById('job-skill-suggestions');
  if (!container) return;
  const selected = window._jobFormSkills || [];
  const filtered = SKILL_SUGGESTIONS.filter(s => !selected.includes(s) && s.toLowerCase().includes(val.toLowerCase())).slice(0, 10);
  container.innerHTML = filtered.map(s => `<span class="skill-suggestion" onclick="addJobSkill('${s}')">${s}</span>`).join('');
}

function applyJobTemplate(templateLabel) {
  const JOB_TEMPLATES = [
    { label: 'Software Engineer', title: 'Senior Software Engineer', skills: ['Python','JavaScript','AWS'], salary: [130000, 170000], desc: 'We are looking for a Senior Software Engineer to build scalable systems.' },
    { label: 'ML Engineer', title: 'Machine Learning Engineer', skills: ['Python','TensorFlow','MLOps'], salary: [150000, 200000], desc: 'Join our ML team to develop and deploy production ML models at scale.' },
    { label: 'Product Manager', title: 'Senior Product Manager', skills: ['Product Strategy','SQL','Figma'], salary: [130000, 175000], desc: 'Lead product development from discovery through launch.' },
    { label: 'DevOps Engineer', title: 'DevOps / Platform Engineer', skills: ['Kubernetes','Terraform','AWS'], salary: [125000, 165000], desc: 'Own our cloud infrastructure and CI/CD pipelines.' },
    { label: 'Data Scientist', title: 'Senior Data Scientist', skills: ['Python','R','Statistics','ML'], salary: [120000, 160000], desc: 'Drive data-driven decisions through advanced analytics and ML.' },
  ];
  const t = JOB_TEMPLATES.find(x => x.label === templateLabel);
  if (!t) return;
  const titleEl = document.getElementById('job-title');
  const descEl = document.getElementById('job-desc');
  const salMin = document.getElementById('job-sal-min');
  const salMax = document.getElementById('job-sal-max');
  if (titleEl) titleEl.value = t.title;
  if (descEl) descEl.value = t.desc;
  if (salMin) salMin.value = t.salary[0];
  if (salMax) salMax.value = t.salary[1];
  window._jobFormSkills = [...t.skills];
  const tags = document.getElementById('job-skills-tags');
  const input = document.getElementById('job-skill-input');
  if (tags && input) {
    document.querySelectorAll('#job-skills-tags .skill-tag-added').forEach(el => el.remove());
    t.skills.forEach(s => {
      const span = document.createElement('span');
      span.className = 'skill-tag skill-tag-added';
      span.innerHTML = `${s}<button onclick="removeJobSkill('${s}')">×</button>`;
      tags.insertBefore(span, input);
    });
  }
  updateJobSalaryDisplay();
  updateJobQuality();
  toast(`Template "${t.label}" applied!`, 'success', 2000);
}

async function aiSuggestJobDesc() {
  const title = document.getElementById('job-title')?.value.trim() || 'Software Engineer';
  toast('🤖 AI generating suggestions...', 'info', 1500);
  await new Promise(r => setTimeout(r, 1000));
  const panel = document.getElementById('ai-suggestions-panel');
  if (panel) panel.style.display = 'block';
  const content = document.getElementById('ai-suggestion-content');
  if (content) {
    content.innerHTML = `
      <div class="ai-result">
        <p><strong>Suggested description for "${title}":</strong></p>
        <p style="font-size:13px;color:var(--text-secondary)">We are looking for an exceptional ${title} to join our team and help shape the future of our platform. You will design and implement scalable systems, mentor junior engineers, and collaborate closely with product and design.</p>
        <button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="applyAISuggestion()">Use This</button>
      </div>
      <div class="ai-result" style="margin-top:12px">
        <p><strong>Suggested salary range:</strong> $140k–$185k</p>
        <p><strong>Suggested skills:</strong> Python, System Design, AWS, PostgreSQL</p>
        <button class="btn btn-sm btn-outline" style="margin-top:8px" onclick="applyAISalary(140000, 185000)">Apply</button>
      </div>`;
  }
}

function applyAISuggestion() {
  const descEl = document.getElementById('job-desc');
  const title = document.getElementById('job-title')?.value.trim() || 'Software Engineer';
  if (descEl) descEl.value = `We are looking for an exceptional ${title} to join our team and help shape the future of our platform. You will design and implement scalable systems, mentor junior engineers, and collaborate closely with product and design.`;
  updateJobQuality();
  toast('AI description applied!', 'success');
}

function applyAISalary(min, max) {
  const salMin = document.getElementById('job-sal-min');
  const salMax = document.getElementById('job-sal-max');
  if (salMin) salMin.value = min;
  if (salMax) salMax.value = max;
  updateJobSalaryDisplay();
  updateJobQuality();
  toast('AI salary range applied!', 'success');
}

function saveJobDraft() {
  toast('Job saved as draft. Publish when ready.', 'info');
  navigate('jobs');
}

function publishJob() {
  const title = document.getElementById('job-title')?.value.trim();
  if (!title) { toast('Please add a job title', 'error'); return; }
  const salMin = parseInt(document.getElementById('job-sal-min')?.value || 0);
  if (salMin < 60000) { toast('Please set a salary range (required for matching)', 'error'); return; }
  toast('🎉 Job published! Your agent is now matching candidates.', 'success', 4000);
  navigate('jobs');
}

// ─── Jobs List (Recruiter) ───────────────────────────────────────────
function renderJobs() {
  if (!APP.user) { navigate('landing'); return; }
  renderRecruiterDashboard();
}

// ─── Settings Page ───────────────────────────────────────────────
function renderSettings() {
  if (!APP.user) { navigate('landing'); return; }
  const user = APP.user;
  const activeSection = APP.settingsSection || 'account';

  const SECTIONS = [
    { id: 'account', icon: '👤', label: 'Account' },
    { id: 'privacy', icon: '🔒', label: 'Privacy' },
    { id: 'notifications', icon: '🔔', label: 'Notifications' },
    { id: 'agent', icon: '🤖', label: 'Agent Tuning' },
    { id: 'session', icon: '⏱', label: 'Session' },
    { id: 'danger', icon: '⚠️', label: 'Danger Zone' },
  ];

  const sectionContent = {
    account: `
      <h3 class="settings-section-title">Account Settings</h3>
      <div class="form-group">
        <label class="form-label">Email Address</label>
        <div class="email-field-row">
          <input type="email" class="form-input" value="${user.email}" readonly>
          <span class="verified-badge">✓ Verified</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Display Name</label>
        <input type="text" id="s-name" class="form-input" value="${user.name}">
      </div>
      <button class="btn btn-primary" onclick="saveAccountSettings()">Save Changes</button>
      <hr class="settings-divider">
      <h4>Change Password</h4>
      <div class="form-group">
        <label class="form-label">Current Password</label>
        <input type="password" id="s-current-pw" class="form-input" placeholder="••••••••">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">New Password</label>
          <input type="password" id="s-new-pw" class="form-input" placeholder="Min 8 characters">
        </div>
        <div class="form-group">
          <label class="form-label">Confirm New Password</label>
          <input type="password" id="s-confirm-pw" class="form-input" placeholder="Repeat new password">
        </div>
      </div>
      <button class="btn btn-outline" onclick="changePassword()">Change Password</button>
      <hr class="settings-divider">
      <h4>Two-Factor Authentication</h4>
      <div class="settings-toggle-row">
        <div>
          <div class="settings-toggle-label">2FA via Authenticator App</div>
          <div class="settings-toggle-desc">Adds an extra layer of security to your account</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" onchange="toggle2FA(this.checked)">
          <span class="toggle-track"></span>
        </label>
      </div>`,

    privacy: `
      <h3 class="settings-section-title">Privacy Settings</h3>
      <div class="settings-toggle-row">
        <div>
          <div class="settings-toggle-label">Default profile visibility</div>
          <div class="settings-toggle-desc">Show profile to all recruiter agents by default</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" checked onchange="toast('Privacy setting updated','info')">
          <span class="toggle-track"></span>
        </label>
      </div>
      <div class="settings-toggle-row">
        <div>
          <div class="settings-toggle-label">Auto-consent to matched companies</div>
          <div class="settings-toggle-desc">Automatically share full profile after a confirmed match</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" onchange="toast('Auto-consent updated','info')">
          <span class="toggle-track"></span>
        </label>
      </div>
      <div class="settings-toggle-row">
        <div>
          <div class="settings-toggle-label">Allow anonymized data for research</div>
          <div class="settings-toggle-desc">Help improve matching algorithms (anonymized, never sold)</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" checked onchange="toast('Research data preference updated','info')">
          <span class="toggle-track"></span>
        </label>
      </div>
      <hr class="settings-divider">
      <button class="btn btn-outline" onclick="navigate('privacy')">View Full Privacy Policy</button>
      <button class="btn btn-outline" style="margin-left:8px" onclick="downloadMyData()">⬇ Download My Data</button>`,

    notifications: `
      <h3 class="settings-section-title">Notification Preferences</h3>
      <div class="notif-group">
        <div class="notif-group-title">Email Digest</div>
        <div class="toggle-group" style="margin-top:8px">
          ${['Daily','Weekly','Never'].map(f => `
            <button class="toggle-btn ${f === 'Weekly' ? 'toggle-active' : ''}"
              onclick="selectDigestFreq(this,'${f}')">${f}</button>`).join('')}
        </div>
      </div>
      <div class="notif-group">
        <div class="notif-group-title">Match Alerts</div>
        ${[
          { label: 'New match found', key: 'new-match', default: true },
          { label: 'Match moved to interview', key: 'interview', default: true },
          { label: 'Offer received', key: 'offer', default: true },
          { label: 'Match declined by company', key: 'declined', default: false },
        ].map(n => `
          <div class="settings-toggle-row">
            <span class="settings-toggle-label">${n.label}</span>
            <label class="toggle-switch">
              <input type="checkbox" ${n.default ? 'checked' : ''} onchange="toast('Notification preference saved','info')">
              <span class="toggle-track"></span>
            </label>
          </div>`).join('')}
      </div>
      <div class="notif-group">
        <div class="notif-group-title">Agent Activity</div>
        ${[
          { label: 'Daily agent summary', key: 'daily-agent', default: true },
          { label: 'Agent negotiation updates', key: 'negotiation', default: false },
          { label: 'Profile view alerts', key: 'profile-views', default: true },
        ].map(n => `
          <div class="settings-toggle-row">
            <span class="settings-toggle-label">${n.label}</span>
            <label class="toggle-switch">
              <input type="checkbox" ${n.default ? 'checked' : ''} onchange="toast('Notification preference saved','info')">
              <span class="toggle-track"></span>
            </label>
          </div>`).join('')}
      </div>`,

    agent: `
      <h3 class="settings-section-title">Agent Tuning</h3>
      <div class="form-group">
        <label class="form-label">Aggressiveness: <strong id="settings-aggr-display">70%</strong></label>
        <input type="range" class="range-slider" min="0" max="100" value="70"
          oninput="document.getElementById('settings-aggr-display').textContent=this.value+'%'">
        <div class="range-help">Low = conservative · High = explore broadly</div>
      </div>
      <div class="form-group">
        <label class="form-label">Auto-decline threshold: <strong id="settings-threshold-display">Below 60% match</strong></label>
        <input type="range" class="range-slider" min="30" max="90" step="5" value="60"
          oninput="document.getElementById('settings-threshold-display').textContent='Below '+this.value+'% match'">
      </div>
      <div class="settings-toggle-row">
        <div>
          <div class="settings-toggle-label">Auto-respond to recruiter agents</div>
          <div class="settings-toggle-desc">Agent sends automated responses on your behalf</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" checked onchange="toast('Agent setting updated','info')">
          <span class="toggle-track"></span>
        </label>
      </div>
      <div class="settings-toggle-row">
        <div>
          <div class="settings-toggle-label">Batch responses</div>
          <div class="settings-toggle-desc">Respond every 4 hours instead of real-time</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" onchange="toast('Agent setting updated','info')">
          <span class="toggle-track"></span>
        </label>
      </div>
      <button class="btn btn-primary" style="margin-top:16px" onclick="toast('Agent settings saved!','success')">Save Agent Settings</button>`,

    session: `
      <h3 class="settings-section-title">Session & Security</h3>
      <div class="session-info">
        <div class="session-info-row">
          <span>Last Login</span>
          <strong>Today, 6:14 AM (Chicago)</strong>
        </div>
        <div class="session-info-row">
          <span>Session Started</span>
          <strong>Just now</strong>
        </div>
        <div class="session-info-row">
          <span>Browser</span>
          <strong>Chrome / Desktop</strong>
        </div>
      </div>
      <div class="settings-toggle-row" style="margin-top:16px">
        <div>
          <div class="settings-toggle-label">Session timeout warning</div>
          <div class="settings-toggle-desc">Show warning 1 minute before auto-logout (15 min inactivity)</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" checked onchange="toast('Session setting updated','info')">
          <span class="toggle-track"></span>
        </label>
      </div>
      <hr class="settings-divider">
      <h4>Active Sessions</h4>
      <div class="session-list">
        <div class="session-item session-current">
          <div class="session-device">💻 This Browser</div>
          <div class="session-location">Chicago, IL · Current</div>
          <span class="pill pill-green">Active</span>
        </div>
      </div>`,

    danger: `
      <h3 class="settings-section-title danger-title">⚠️ Danger Zone</h3>
      <div class="danger-zone">
        <div class="danger-action">
          <div>
            <div class="danger-action-title">Deactivate Account</div>
            <div class="danger-action-desc">Temporarily deactivate your account. Your data is preserved and you can reactivate anytime.</div>
          </div>
          <button class="btn btn-outline danger-btn" onclick="showDeactivateModal()">Deactivate</button>
        </div>
        <div class="danger-action">
          <div>
            <div class="danger-action-title">Export All Data</div>
            <div class="danger-action-desc">Download a complete copy of all your data (GDPR compliant).</div>
          </div>
          <button class="btn btn-outline" onclick="downloadMyData()">⬇ Export</button>
        </div>
        <div class="danger-action danger-action-last">
          <div>
            <div class="danger-action-title">Delete Account Permanently</div>
            <div class="danger-action-desc">Permanently delete your account and all associated data. This action cannot be undone.</div>
          </div>
          <button class="btn danger-delete-btn" onclick="showDeleteModal()">Delete Account</button>
        </div>
      </div>`,
  };

  renderApp(`
    <div class="app-layout">
      ${navBar()}
      <div class="main-content">
        ${topBar('Settings', 'Manage your account and preferences')}
        <div class="dashboard-body">
          <div class="settings-layout">
            <div class="settings-sidebar">
              ${SECTIONS.map(s => `
                <button class="settings-nav-item ${activeSection === s.id ? 'settings-nav-active' : ''}"
                  onclick="APP.settingsSection='${s.id}';renderSettings()">
                  <span>${s.icon}</span>
                  <span>${s.label}</span>
                </button>`).join('')}
            </div>
            <div class="settings-content">
              <div class="dashboard-card">
                ${sectionContent[activeSection] || ''}
              </div>
            </div>
          </div>
        </div>
      </div>
      ${isMobile() ? navBar() : ''}
    </div>
  `);
}

function saveAccountSettings() {
  const name = document.getElementById('s-name')?.value.trim();
  if (name && APP.user) APP.user.name = name;
  toast('Account settings saved!', 'success');
}

function changePassword() {
  const curr = document.getElementById('s-current-pw')?.value;
  const newPw = document.getElementById('s-new-pw')?.value;
  const conf = document.getElementById('s-confirm-pw')?.value;
  if (!curr || !newPw || !conf) { toast('Fill in all password fields', 'error'); return; }
  if (newPw !== conf) { toast('New passwords do not match', 'error'); return; }
  if (newPw.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
  toast('Password changed successfully!', 'success');
}

function toggle2FA(enabled) {
  if (enabled) {
    showModal('Set Up 2FA', `
      <p>Scan this QR code with your authenticator app:</p>
      <div class="qr-placeholder">[ QR Code would appear here ]</div>
      <div class="form-group" style="margin-top:16px">
        <label class="form-label">Enter 6-digit code to verify</label>
        <input type="text" id="twofa-code" class="form-input" placeholder="000000" maxlength="6">
      </div>
      <button class="btn btn-primary btn-full" onclick="verify2FA()">Verify & Enable</button>
    `);
  } else {
    toast('2FA disabled', 'warning');
  }
}

function verify2FA() {
  closeModal();
  toast('2FA enabled! Your account is more secure.', 'success');
}

function selectDigestFreq(el, freq) {
  el.parentNode.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('toggle-active'));
  el.classList.add('toggle-active');
  toast(`Email digest set to: ${freq}`, 'info');
}

function downloadMyData() {
  toast('📦 Preparing data export... (demo mode)', 'info', 3000);
}

function showDeactivateModal() {
  showModal('Deactivate Account', `
    <p>Your account will be deactivated. Your data is preserved and you can reactivate by signing in again.</p>
    <p style="margin-top:8px;color:var(--text-muted)">Your agent will stop all matching activities.</p>
    <button class="btn btn-outline btn-full" style="margin-top:16px" onclick="closeModal();logout();toast('Account deactivated. See you soon!','info')">Confirm Deactivation</button>
  `);
}

function showDeleteModal() {
  showModal('⚠️ Delete Account Permanently', `
    <p>This will <strong>permanently delete</strong> your account, all matches, and all data. This cannot be undone.</p>
    <div class="form-group" style="margin-top:16px">
      <label class="form-label">Type your email to confirm: <code>${APP.user?.email}</code></label>
      <input type="email" id="delete-confirm-email" class="form-input" placeholder="${APP.user?.email}">
    </div>
    <button class="btn danger-delete-btn btn-full" style="margin-top:8px" onclick="confirmDeleteAccount()">Permanently Delete Account</button>
  `);
}

function confirmDeleteAccount() {
  const input = document.getElementById('delete-confirm-email')?.value;
  if (input !== APP.user?.email) { toast('Email does not match', 'error'); return; }
  closeModal();
  logout();
  toast('Account deleted. Sorry to see you go.', 'info');
}

// ─── Privacy Page ────────────────────────────────────────────────────
function renderPrivacyPage() {
  renderApp(`
    <div class="app-layout ${APP.user ? '' : 'no-sidebar'}">
      ${APP.user ? navBar() : ''}
      <div class="main-content">
        ${APP.user ? topBar('Privacy Policy') : `
          <div class="auth-brand" onclick="navigate('landing')" style="cursor:pointer;padding:20px;display:flex;align-items:center;gap:10px">
            <div class="logo-mark">AH</div>
            <span style="font-weight:700">AgentHire</span>
          </div>`}
        <div class="privacy-page">
          <div class="privacy-content">
            <h1>Privacy Policy</h1>
            <p class="privacy-updated">Last updated: February 26, 2026</p>

            <h2>1. Information We Collect</h2>
            <p>AgentHire collects information you provide directly (name, email, skills, preferences), information from your AI agent's activity (matches evaluated, negotiations conducted), and technical data (login timestamps, device type).</p>

            <h2>2. How We Use Your Information</h2>
            <p>We use your information to operate the AI matching service, improve matching algorithms using anonymized patterns, send you relevant notifications about matches and activity, and comply with legal obligations.</p>

            <h2>3. AI Agent Data</h2>
            <p>Your AI agent acts on your behalf. All agent communications and negotiations are logged and visible to you in your dashboard. Agents never share information beyond what you've configured in Privacy Shield settings.</p>

            <h2>4. Data Sharing</h2>
            <p>We share limited profile information with matched companies' agents only when you have configured your Privacy Shield to allow it. We never sell your personal data to third parties. We may share anonymized, aggregated data for research purposes.</p>

            <h2>5. Your Rights (GDPR & CCPA)</h2>
            <p>You have the right to access, correct, export, and delete your personal data. Use Settings → Privacy → Export to download your data, or contact privacy@agenthire.ai to request deletion.</p>

            <h2>6. Data Retention</h2>
            <p>Active account data is retained while your account is active. After account deletion, personal data is removed within 30 days, with anonymized records retained for up to 2 years for safety and fraud prevention.</p>

            <h2>7. Security</h2>
            <p>We protect your data with AES-256 encryption at rest, TLS in transit, and regular security audits. All agent communications are end-to-end encrypted.</p>

            <h2>8. Contact</h2>
            <p>For privacy questions: <a href="mailto:privacy@agenthire.ai" target="_blank" rel="noopener noreferrer">privacy@agenthire.ai</a></p>
          </div>
        </div>
      </div>
    </div>
  `);
}

// ============================================================
// PART 7: Viral Features, Leaderboard, Auth Utilities, Init
// ============================================================

// ─── Leaderboard ─────────────────────────────────────────────────────
async function renderLeaderboard() {
  const isAuth = !!APP.user;
  let entries = [
    { rank: 1, area: 'ML Engineering', matches: 24, avgScore: 91, badges: ['top-matcher'] },
    { rank: 2, area: 'Frontend Dev', matches: 21, avgScore: 88, badges: ['fastest-responder'] },
    { rank: 3, area: 'Product Mgmt', matches: 19, avgScore: 85, badges: ['star-profile'] },
    { rank: 4, area: 'DevOps', matches: 17, avgScore: 83, badges: [] },
    { rank: 5, area: 'Data Science', matches: 15, avgScore: 80, badges: [] },
    { rank: 6, area: 'Security Eng', matches: 14, avgScore: 79, badges: [] },
    { rank: 7, area: 'Mobile Dev', matches: 13, avgScore: 77, badges: [] },
    { rank: 8, area: 'Data Eng', matches: 12, avgScore: 76, badges: [] },
    { rank: 9, area: 'Full-stack', matches: 11, avgScore: 74, badges: [] },
    { rank: 10, area: 'Backend Eng', matches: 10, avgScore: 72, badges: [] },
  ];

  const badgeLabels = {
    'top-matcher': { icon: '🏆', label: 'Top Matcher' },
    'fastest-responder': { icon: '⚡', label: 'Fastest Responder' },
    'star-profile': { icon: '🌟', label: '5-Star Profile' },
  };

  const leaderboardHTML = `
    <div class="leaderboard-table">
      <div class="leaderboard-header-row">
        <div class="lb-col lb-rank">Rank</div>
        <div class="lb-col lb-area">Skill Area</div>
        <div class="lb-col lb-matches">Matches</div>
        <div class="lb-col lb-avg">Avg Score</div>
        <div class="lb-col lb-badges">Badges</div>
      </div>
      ${entries.map(e => `
        <div class="leaderboard-row ${e.rank <= 3 ? 'leaderboard-top-3' : ''}">
          <div class="lb-col lb-rank">
            ${e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `<span class="lb-rank-num">${e.rank}</span>`}
          </div>
          <div class="lb-col lb-area">
            <span class="lb-area-label">${e.area}</span>
            <div class="lb-sparkbar" style="width:${(e.matches/24*100).toFixed(0)}%;background:${e.rank <= 3 ? '#0d9488' : '#e5e7eb'}"></div>
          </div>
          <div class="lb-col lb-matches"><strong>${e.matches}</strong></div>
          <div class="lb-col lb-avg">${matchRing(e.avgScore, 40)}</div>
          <div class="lb-col lb-badges">
            ${e.badges.map(b => `<span class="lb-badge" title="${badgeLabels[b]?.label || b}">${badgeLabels[b]?.icon || '🏅'}</span>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;

  const layout = isAuth ? `
    <div class="app-layout">
      ${navBar()}
      <div class="main-content">
        ${topBar('Leaderboard', 'Top matched candidates this week')}
        <div class="dashboard-body">
          <div class="dashboard-card">
            <div class="card-header">
              <h3 class="card-title">🏆 Top Matched Candidates This Week</h3>
              <span class="card-badge">Anonymized</span>
            </div>
            <p style="color:var(--text-muted);margin-bottom:16px">Rankings based on match count and average quality score. All identities are anonymized.</p>
            ${leaderboardHTML}
          </div>
          ${renderAchievementsCard()}
        </div>
      </div>
      ${isMobile() ? navBar() : ''}
    </div>` : `
    <div class="leaderboard-public">
      <div class="auth-brand" onclick="navigate('landing')" style="cursor:pointer;padding:24px;display:flex;align-items:center;gap:12px">
        <div class="logo-mark">AH</div>
        <span style="font-weight:700;font-size:18px">AgentHire</span>
      </div>
      <div class="section-container">
        <h2 class="section-title">Weekly Leaderboard</h2>
        <p style="color:var(--text-muted);text-align:center;margin-bottom:24px">Top matched candidates this week — anonymized rankings</p>
        ${leaderboardHTML}
        <div style="text-align:center;margin-top:32px">
          <button class="btn btn-primary btn-lg" onclick="navigate('register')">Get Started Free →</button>
        </div>
      </div>
    </div>`;

  renderApp(layout);
}

function renderAchievementsCard() {
  const achievements = [
    { icon: '✅', name: 'Profile Complete', desc: 'Filled all key profile sections', earned: true },
    { icon: '🎯', name: 'First Match', desc: 'Your agent found your first match', earned: true },
    { icon: '⭐', name: '5-Star Responder', desc: 'Responded to 5 matches within 24h', earned: true },
    { icon: '🌐', name: 'Power Networker', desc: 'Connected with 10 companies', earned: false },
    { icon: '🔒', name: 'Trust Verified', desc: 'Email + LinkedIn verified', earned: false },
    { icon: '🚀', name: 'First Hire', desc: 'Land your dream role', earned: false },
    { icon: '📊', name: 'Data Driven', desc: 'View your agent analytics 5 times', earned: true },
    { icon: '💬', name: 'Conversationalist', desc: 'Send 10 messages to matches', earned: false },
  ];
  return `
    <div class="dashboard-card" style="margin-top:24px">
      <div class="card-header">
        <h3 class="card-title">🏅 Your Achievements</h3>
        <span class="card-badge">${achievements.filter(a=>a.earned).length}/${achievements.length} earned</span>
      </div>
      <div class="achievements-grid-full">
        ${achievements.map(a => `
          <div class="achievement-badge-lg ${a.earned ? '' : 'achievement-locked'}">
            <div class="achievement-icon-lg">${a.icon}</div>
            <div class="achievement-name">${a.name}</div>
            <div class="achievement-desc">${a.desc}</div>
            ${!a.earned ? '<div class="achievement-lock-overlay">🔒</div>' : '<div class="achievement-earned-mark">✓</div>'}
          </div>`).join('')}
      </div>
    </div>`;
}

// ─── Logout ─────────────────────────────────────────────────────────────
function logout() {
  clearTimeout(APP.inactivityTimer);
  APP.user = null;
  APP.token = null;
  APP.personaDirty = false;
  APP.onboardingStep = 1;
  APP.onboardingData = {};
  APP.cache = {};
  closeModal();
  toast('Signed out successfully', 'info', 2000);
  navigate('landing');
}

// ─── Inline CSS injection ───────────────────────────────────────────────
// (CSS is in style.css — see companion file)

// ─── App Initialization ───────────────────────────────────────────────────
function initApp() {
  // Check for hash on load
  handleRoute();

  // Delegate click events on #app
  document.getElementById('app').addEventListener('click', (e) => {
    // Any internal nav links
    const link = e.target.closest('[data-navigate]');
    if (link) {
      e.preventDefault();
      navigate(link.dataset.navigate);
    }
  });

  // Handle logo click
  document.addEventListener('click', (e) => {
    if (e.target.closest('.logo-mark') || e.target.closest('.logo-name')) {
      if (APP.user) navigate('dashboard');
      else navigate('landing');
    }
  });
}

// Start inactivity timer setup on first load
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// Also trigger on immediate if DOM already loaded
if (document.readyState !== 'loading') {
  initApp();
}

// ─── CSS Injection for complete styling ───────────────────────────────
// Inject critical CSS that may not be in style.css
(function injectBaseStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* ── Base Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f1117;
      --bg-secondary: #161b27;
      --bg-card: #1a2035;
      --bg-hover: #1e2640;
      --border: #2a3350;
      --border-light: #1e2640;
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --teal: #0d9488;
      --teal-light: #14b8a6;
      --purple: #7c3aed;
      --emerald: #059669;
      --amber: #d97706;
      --red: #dc2626;
      --blue: #2563eb;
      --sidebar-width: 260px;
      --topbar-height: 72px;
      --radius: 12px;
      --radius-sm: 8px;
      --shadow: 0 4px 24px rgba(0,0,0,0.4);
      --transition: 0.2s ease;
    }
    html, body { height: 100%; }
    body {
      font-family: 'DM Sans', 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text-primary);
      line-height: 1.6;
      overflow-x: hidden;
    }
    #app { min-height: 100vh; }
    a { color: var(--teal); text-decoration: none; }
    a:hover { text-decoration: underline; }
    button { cursor: pointer; font-family: inherit; border: none; outline: none; }
    input, select, textarea { font-family: inherit; }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    /* ── Toast Container ── */
    .toast-container {
      position: fixed; top: 20px; right: 20px; z-index: 9999;
      display: flex; flex-direction: column; gap: 10px;
      pointer-events: none;
    }
    .toast {
      display: flex; align-items: center; gap: 10px;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-sm); padding: 12px 16px;
      min-width: 280px; max-width: 400px; box-shadow: var(--shadow);
      transform: translateX(120%); transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
      pointer-events: all; font-size: 14px;
    }
    .toast-show { transform: translateX(0); }
    .toast-icon { width: 18px; height: 18px; flex-shrink: 0; }
    .toast-success { border-color: #059669; }
    .toast-success .toast-icon { color: #059669; }
    .toast-error { border-color: #dc2626; }
    .toast-error .toast-icon { color: #dc2626; }
    .toast-info { border-color: #2563eb; }
    .toast-info .toast-icon { color: #2563eb; }
    .toast-warning { border-color: #d97706; }
    .toast-warning .toast-icon { color: #d97706; }
    .toast-close { background: none; color: var(--text-muted); font-size: 12px; margin-left: auto; padding: 0 4px; }
    .toast-msg { flex: 1; }

    /* ── Modal ── */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center;
      z-index: 9000; padding: 20px;
      opacity: 0; transition: opacity 0.3s ease;
    }
    .modal-show { opacity: 1; }
    .modal-box {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius); width: 100%; max-width: 540px;
      max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow);
      transform: scale(0.95); transition: transform 0.3s ease;
    }
    .modal-show .modal-box { transform: scale(1); }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px; border-bottom: 1px solid var(--border);
    }
    .modal-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
    .modal-close-btn { background: none; color: var(--text-muted); font-size: 18px; padding: 4px 8px; border-radius: 4px; }
    .modal-close-btn:hover { background: var(--bg-hover); }
    .modal-body { padding: 24px; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }

    /* ── Buttons ── */
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 18px; border-radius: var(--radius-sm);
      font-size: 14px; font-weight: 600; transition: all var(--transition);
      white-space: nowrap;
    }
    .btn-primary { background: var(--teal); color: #fff; }
    .btn-primary:hover { background: var(--teal-light); transform: translateY(-1px); }
    .btn-secondary { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); }
    .btn-secondary:hover { background: var(--bg-hover); }
    .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text-primary); }
    .btn-outline:hover { border-color: var(--teal); color: var(--teal); }
    .btn-ghost { background: transparent; color: var(--text-secondary); }
    .btn-ghost:hover { background: var(--bg-hover); color: var(--text-primary); }
    .btn-lg { padding: 13px 24px; font-size: 15px; }
    .btn-sm { padding: 7px 14px; font-size: 13px; }
    .btn-xs { padding: 4px 10px; font-size: 12px; }
    .btn-full { width: 100%; justify-content: center; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    /* ── Forms ── */
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); display: flex; justify-content: space-between; }
    .form-label-link { color: var(--teal); font-weight: 400; }
    .form-label-hint { color: var(--text-muted); font-weight: 400; font-size: 12px; }
    .form-input {
      background: var(--bg-secondary); border: 1px solid var(--border);
      color: var(--text-primary); border-radius: var(--radius-sm);
      padding: 10px 14px; font-size: 14px; transition: border-color var(--transition);
    }
    .form-input:focus { outline: none; border-color: var(--teal); }
    .form-input::placeholder { color: var(--text-muted); }
    .form-textarea { resize: vertical; min-height: 80px; }
    .form-check { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: var(--text-secondary); }
    .form-check input { margin-top: 2px; accent-color: var(--teal); }
    .required-star { color: var(--red); }
    .textarea-count { font-size: 12px; color: var(--text-muted); }
    select.form-input { appearance: none; background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHBhdGggZmlsbD0iIzk0YTNiOCIgZD0iTTUuMjkzIDcuMjkzYTEgMSAwIDAxMS40MTQgMEwxMCAxMC41ODZsMS4yOTMtMy4yOTNhMSAxIDAgMTExLjQxNCAxLjQxNGwtMiAyYTEgMSAwIDAxLTEuNDE0IDBsLTItMmExIDEgMCAwMTAtMS40MTR6Ii8+PC9zdmc+"); background-repeat: no-repeat; background-position: right 10px center; background-size: 18px; padding-right: 36px; }

    /* ── Toggle Switch ── */
    .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-track {
      position: absolute; inset: 0; background: var(--border);
      border-radius: 12px; cursor: pointer; transition: background 0.3s;
    }
    .toggle-track::before {
      content: ''; position: absolute; width: 18px; height: 18px;
      left: 3px; top: 3px; background: #fff; border-radius: 50%;
      transition: transform 0.3s;
    }
    .toggle-switch input:checked + .toggle-track { background: var(--teal); }
    .toggle-switch input:checked + .toggle-track::before { transform: translateX(20px); }
    .toggle-label { display: flex; align-items: center; gap: 10px; font-size: 14px; }

    /* ── Toggle Group ── */
    .toggle-group { display: flex; background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 4px; gap: 2px; }
    .toggle-btn { padding: 7px 16px; border-radius: 6px; background: transparent; color: var(--text-secondary); font-size: 13px; font-weight: 500; transition: all var(--transition); }
    .toggle-btn:hover { color: var(--text-primary); }
    .toggle-active { background: var(--teal) !important; color: #fff !important; }

    /* ── Range Slider ── */
    .range-slider { width: 100%; accent-color: var(--teal); margin: 8px 0; cursor: pointer; height: 6px; }
    .range-labels { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); }
    .range-help { font-size: 12px; color: var(--text-muted); }
    .dual-slider-container { position: relative; }
    .dual-slider { display: block; }

    /* ── Avatar ── */
    .avatar {
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-weight: 700; color: #fff; flex-shrink: 0; letter-spacing: 0.5px;
    }

    /* ── Pills / Badges ── */
    .pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .pill-green { background: #059669'20; color: #059669; background: rgba(5,150,105,0.15); }
    .pill-amber { background: rgba(217,119,6,0.15); color: #d97706; }
    .pill-gray { background: rgba(100,116,139,0.15); color: #94a3b8; }
    .pill-blue { background: rgba(37,99,235,0.15); color: #60a5fa; }
    .trust-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 700; border: 1px solid; }
    .confidence-badge { display: inline-flex; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .confidence-high { background: rgba(5,150,105,0.15); color: #059669; }
    .confidence-moderate { background: rgba(217,119,6,0.15); color: #d97706; }
    .confidence-exploratory { background: rgba(100,116,139,0.15); color: #94a3b8; }

    /* ── Tags ── */
    .skill-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; }
    .skill-tag-added { background: rgba(13,148,136,0.15); color: var(--teal); border: 1px solid rgba(13,148,136,0.3); }
    .skill-tag-added button { background: none; color: var(--teal); font-size: 14px; opacity: 0.7; padding: 0; line-height: 1; }
    .skill-tag-display { display: inline-flex; padding: 3px 10px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; font-size: 12px; color: var(--text-secondary); }
    .skill-tag-input { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px; display: flex; flex-wrap: wrap; gap: 6px; min-height: 48px; cursor: text; }
    .skill-tag-input:focus-within { border-color: var(--teal); }
    .skill-input { background: none; border: none; color: var(--text-primary); font-size: 14px; outline: none; flex: 1; min-width: 120px; }
    .skill-suggestions { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-suggestion { padding: 4px 10px; border-radius: 6px; background: var(--bg-secondary); border: 1px solid var(--border); font-size: 12px; color: var(--text-secondary); cursor: pointer; transition: all var(--transition); }
    .skill-suggestion:hover, .skill-suggestion-selected { border-color: var(--teal); color: var(--teal); background: rgba(13,148,136,0.1); }
    .industry-tag { display: inline-flex; padding: 5px 12px; border-radius: 20px; font-size: 13px; background: var(--bg-secondary); border: 1px solid var(--border); cursor: pointer; color: var(--text-secondary); transition: all var(--transition); }
    .industry-tag:hover, .industry-selected { border-color: var(--teal); color: var(--teal); background: rgba(13,148,136,0.1); }
    .industry-danger.industry-selected { border-color: var(--red); color: var(--red); background: rgba(220,38,38,0.1); }
    .industry-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .match-reason-tag { display: inline-flex; padding: 3px 9px; border-radius: 6px; font-size: 11px; background: rgba(37,99,235,0.1); border: 1px solid rgba(37,99,235,0.2); color: #60a5fa; }
    .match-reason-tag-lg { display: inline-flex; padding: 5px 12px; border-radius: 6px; font-size: 13px; background: rgba(5,150,105,0.1); border: 1px solid rgba(5,150,105,0.2); color: #34d399; }
    .match-stage-pill { display: inline-flex; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }

    /* ── Card Styles ── */
    .dashboard-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; margin-bottom: 20px; }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .card-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
    .card-action { font-size: 13px; color: var(--teal); background: none; border: none; cursor: pointer; }
    .card-action:hover { text-decoration: underline; }
    .card-badge { font-size: 12px; color: var(--text-muted); background: var(--bg-secondary); padding: 3px 8px; border-radius: 12px; }
    .card-actions-row { display: flex; gap: 8px; flex-wrap: wrap; }

    /* ── App Layout ── */
    .app-layout { display: flex; min-height: 100vh; }
    .main-content { flex: 1; margin-left: var(--sidebar-width); min-height: 100vh; display: flex; flex-direction: column; }
    .no-sidebar .main-content { margin-left: 0; }
    .dashboard-body { flex: 1; padding: 24px; max-width: 1440px; }

    /* ── Sidebar ── */
    .sidebar {
      width: var(--sidebar-width); background: var(--bg-secondary);
      border-right: 1px solid var(--border); position: fixed;
      top: 0; left: 0; height: 100vh; overflow-y: auto;
      display: flex; flex-direction: column; z-index: 100;
    }
    .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 20px; border-bottom: 1px solid var(--border); }
    .logo-mark { background: var(--teal); color: #fff; font-weight: 800; font-size: 14px; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; letter-spacing: 0.5px; }
    .logo-mark-sm { width: 28px; height: 28px; font-size: 11px; }
    .logo-name { font-weight: 800; font-size: 16px; color: var(--text-primary); }
    .logo-version { font-size: 10px; color: var(--text-muted); }
    .sidebar-user { display: flex; align-items: center; gap: 10px; padding: 16px 20px; border-bottom: 1px solid var(--border); }
    .sidebar-user-info { min-width: 0; }
    .sidebar-user-name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sidebar-user-role { font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sidebar-nav { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 2px; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 14px; font-weight: 500; transition: all var(--transition); text-decoration: none; }
    .nav-item:hover { background: var(--bg-hover); color: var(--text-primary); text-decoration: none; }
    .nav-active { background: rgba(13,148,136,0.15) !important; color: var(--teal) !important; }
    .nav-icon { display: flex; align-items: center; }
    .nav-label {}
    .sidebar-footer { padding: 16px; border-top: 1px solid var(--border); }
    .sidebar-referral { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 13px; cursor: pointer; transition: all var(--transition); }
    .sidebar-referral:hover { background: var(--bg-hover); color: var(--text-primary); }
    .sidebar-logout { width: 100%; margin-top: 8px; background: transparent; border: 1px solid var(--border); color: var(--text-muted); padding: 8px; border-radius: var(--radius-sm); font-size: 13px; transition: all var(--transition); }
    .sidebar-logout:hover { border-color: var(--red); color: var(--red); }

    /* ── Top Bar ── */
    .top-bar {
      height: var(--topbar-height); background: var(--bg-secondary);
      border-bottom: 1px solid var(--border); display: flex; align-items: center;
      justify-content: space-between; padding: 0 24px; gap: 16px; position: sticky; top: 0; z-index: 10;
    }
    .top-bar-title { flex: 1; }
    .page-title { font-size: 22px; font-weight: 800; color: var(--text-primary); line-height: 1.2; }
    .page-subtitle { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
    .top-bar-actions { display: flex; align-items: center; gap: 12px; }
    .notif-btn { position: relative; background: none; padding: 8px; color: var(--text-secondary); border-radius: var(--radius-sm); transition: all var(--transition); }
    .notif-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .notif-badge { position: absolute; top: 4px; right: 4px; background: var(--red); color: #fff; font-size: 10px; font-weight: 700; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .top-bar-avatar { cursor: pointer; border-radius: 50%; }
    .hamburger { background: none; color: var(--text-primary); font-size: 20px; padding: 4px 8px; border-radius: var(--radius-sm); }

    /* ── Landing Page ── */
    .landing { background: var(--bg); }
    .landing-nav { position: sticky; top: 0; z-index: 100; background: rgba(15,17,23,0.9); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
    .landing-nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 16px 32px; max-width: 1200px; margin: 0 auto; }
    .logo-lockup { display: flex; align-items: center; gap: 10px; }
    .landing-nav-links { display: flex; gap: 12px; }

    .hero { position: relative; overflow: hidden; padding: 80px 32px 100px; text-align: center; min-height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 48px; }
    .hero-glow { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.15; pointer-events: none; }
    .hero-glow-1 { width: 600px; height: 600px; background: var(--teal); top: -200px; left: -100px; }
    .hero-glow-2 { width: 400px; height: 400px; background: var(--purple); bottom: -100px; right: -100px; }
    .hero-content { position: relative; z-index: 1; }
    .hero-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(13,148,136,0.1); border: 1px solid rgba(13,148,136,0.3); padding: 6px 16px; border-radius: 20px; font-size: 13px; color: var(--teal); font-weight: 600; margin-bottom: 24px; }
    .live-dot { width: 8px; height: 8px; background: var(--teal); border-radius: 50%; display: inline-block; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .hero-headline { font-size: clamp(36px, 6vw, 72px); font-weight: 900; line-height: 1.1; color: var(--text-primary); letter-spacing: -1px; margin-bottom: 20px; }
    .hero-subtitle { font-size: clamp(15px, 2vw, 20px); color: var(--text-secondary); max-width: 600px; margin: 0 auto 32px; line-height: 1.6; }
    .hero-ctas { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
    .hero-cta-candidate { font-size: 16px; padding: 14px 28px; }
    .hero-cta-recruiter { font-size: 16px; padding: 14px 28px; }
    .hero-demo-link { margin-top: 16px; }
    .hero-demo-link a { color: var(--text-muted); font-size: 14px; }
    .hero-demo-link a:hover { color: var(--teal); }
    .hero-visual { display: flex; align-items: center; gap: 24px; position: relative; z-index: 1; flex-wrap: wrap; justify-content: center; }
    .agent-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; min-width: 220px; max-width: 280px; }
    .agent-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .agent-card-name { font-weight: 600; font-size: 14px; }
    .agent-card-status { font-size: 12px; }
    .agent-active { color: var(--emerald); }
    .agent-card-activity { font-size: 12px; color: var(--text-muted); }
    .match-connector { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .match-score-bubble { background: var(--teal); color: #fff; font-weight: 800; font-size: 18px; padding: 12px 16px; border-radius: 50%; box-shadow: 0 0 24px rgba(13,148,136,0.4); }
    .connector-line { width: 2px; height: 40px; background: linear-gradient(to bottom, var(--teal), transparent); }

    /* ── Ticker ── */
    .ticker-bar { background: linear-gradient(135deg, rgba(13,148,136,0.15), rgba(124,58,237,0.15)); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 10px 0; overflow: hidden; }
    .ticker-inner { display: flex; white-space: nowrap; animation: ticker 20s linear infinite; font-size: 13px; font-weight: 600; color: var(--text-secondary); }
    .ticker-inner span { padding: 0 32px; }
    @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }

    /* ── Sections ── */
    .section-container { max-width: 1100px; margin: 0 auto; padding: 80px 32px; }
    .section-label { display: inline-block; background: rgba(13,148,136,0.1); border: 1px solid rgba(13,148,136,0.2); color: var(--teal); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
    .section-title { font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: var(--text-primary); margin-bottom: 40px; line-height: 1.2; }

    /* ── Steps ── */
    .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .step-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 32px 24px; position: relative; animation: fadeUp 0.6s ease both; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .step-number { position: absolute; top: 16px; right: 16px; font-size: 48px; font-weight: 900; color: var(--teal); opacity: 0.1; }
    .step-icon { font-size: 36px; margin-bottom: 16px; }
    .step-card h3 { font-size: 18px; font-weight: 700; margin-bottom: 10px; }
    .step-card p { font-size: 14px; color: var(--text-secondary); line-height: 1.7; }
    .step-detail { margin-top: 16px; font-size: 12px; color: var(--teal); font-weight: 600; }

    /* ── Testimonials ── */
    .testimonials-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .testimonial-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 28px; display: flex; flex-direction: column; gap: 16px; }
    .testimonial-featured { border-color: var(--teal); background: rgba(13,148,136,0.05); }
    .testimonial-quote { font-size: 15px; color: var(--text-secondary); line-height: 1.7; flex: 1; font-style: italic; }
    .testimonial-author { display: flex; align-items: center; gap: 12px; }
    .testimonial-name { font-weight: 700; font-size: 14px; }
    .testimonial-role { font-size: 12px; color: var(--text-muted); }
    .testimonial-stars { color: #f59e0b; font-size: 16px; letter-spacing: 2px; }

    /* ── Companies ── */
    .companies-section { border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); background: var(--bg-secondary); padding: 40px 32px; }
    .companies-label { text-align: center; color: var(--text-muted); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px; }
    .companies-row { display: flex; justify-content: center; gap: 24px; flex-wrap: wrap; }
    .company-badge { padding: 10px 20px; border-radius: var(--radius-sm); border: 1px solid var(--c, var(--border)); color: var(--c, var(--text-secondary)); background: rgba(var(--c-rgb, 100,116,139), 0.05); font-weight: 700; font-size: 14px; }

    /* ── Stats Banner ── */
    .stats-banner { background: linear-gradient(135deg, var(--teal) 0%, var(--purple) 100%); padding: 60px 32px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); max-width: 900px; margin: 0 auto; gap: 24px; text-align: center; }
    .stat-num { font-size: 48px; font-weight: 900; color: #fff; }
    .stat-lbl { font-size: 14px; color: rgba(255,255,255,0.8); margin-top: 4px; }

    /* ── Footer ── */
    .landing-footer { background: var(--bg-secondary); border-top: 1px solid var(--border); padding: 48px 32px 24px; }
    .footer-inner { display: flex; justify-content: space-between; gap: 40px; max-width: 1100px; margin: 0 auto; flex-wrap: wrap; }
    .footer-brand { max-width: 280px; }
    .footer-brand-name { font-weight: 800; font-size: 18px; }
    .footer-tagline { color: var(--text-muted); font-size: 14px; margin-top: 8px; }
    .footer-links { display: flex; gap: 40px; }
    .footer-col { display: flex; flex-direction: column; gap: 10px; }
    .footer-col-title { font-weight: 700; font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .footer-col a { color: var(--text-muted); font-size: 14px; text-decoration: none; }
    .footer-col a:hover { color: var(--teal); }
    .footer-bottom { display: flex; justify-content: space-between; padding-top: 24px; border-top: 1px solid var(--border); margin-top: 40px; color: var(--text-muted); font-size: 13px; max-width: 1100px; margin: 40px auto 0; flex-wrap: wrap; gap: 8px; }

    /* ── Auth ── */
    .auth-layout { min-height: 100vh; background: var(--bg); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; }
    .auth-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
    .auth-brand-name { font-weight: 800; font-size: 20px; color: var(--text-primary); }
    .auth-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 36px; width: 100%; max-width: 440px; }
    .auth-card-wide { max-width: 560px; }
    .auth-title { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
    .auth-subtitle { color: var(--text-muted); font-size: 14px; margin-bottom: 24px; }
    .auth-divider { text-align: center; position: relative; margin: 24px 0; color: var(--text-muted); font-size: 13px; }
    .auth-divider::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: var(--border); }
    .auth-divider span { background: var(--bg-card); position: relative; padding: 0 12px; }
    .auth-switch { text-align: center; font-size: 13px; color: var(--text-muted); }
    .role-tabs { display: flex; background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 4px; gap: 4px; margin-bottom: 20px; }
    .role-tab { flex: 1; padding: 10px; border-radius: 6px; background: transparent; color: var(--text-secondary); font-size: 14px; font-weight: 500; transition: all var(--transition); }
    .role-tab-active { background: var(--teal) !important; color: #fff !important; }
    .linkedin-btn { margin-bottom: 16px; border-color: #0A66C2 !important; color: #0A66C2 !important; }
    .linkedin-btn:hover { background: rgba(10,102,194,0.1) !important; }
    .email-verify-notice { display: flex; gap: 10px; align-items: flex-start; background: rgba(37,99,235,0.1); border: 1px solid rgba(37,99,235,0.2); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 16px; font-size: 13px; color: var(--text-secondary); }
    .verify-icon { font-size: 18px; }
    .password-strength { margin-top: 4px; }
    .strength-bar { background: var(--bg-secondary); height: 4px; border-radius: 2px; overflow: hidden; margin-bottom: 4px; }
    .demo-section { margin-top: 24px; border-top: 1px solid var(--border); padding-top: 16px; }
    .demo-section-header { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--text-secondary); padding: 8px 0; }
    .demo-section-title { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .demo-grid-inline { display: flex; flex-wrap: wrap; gap: 8px; }
    .demo-pill { display: flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); cursor: pointer; font-size: 13px; color: var(--text-secondary); transition: all var(--transition); background: var(--bg-secondary); }
    .demo-pill:hover { border-color: var(--teal); color: var(--teal); }
    .demo-intro { color: var(--text-muted); font-size: 14px; margin-bottom: 16px; }
    .demo-accounts-grid { display: flex; flex-direction: column; gap: 8px; }
    .demo-account-card { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border); cursor: pointer; transition: all var(--transition); background: var(--bg-secondary); }
    .demo-account-card:hover { border-color: var(--teal); transform: translateX(4px); }
    .demo-card-info { flex: 1; }
    .demo-card-name { font-weight: 700; font-size: 14px; }
    .demo-card-title { font-size: 12px; color: var(--text-muted); }
    .demo-card-avail { font-size: 11px; margin-top: 2px; }
    .avail-active { color: var(--emerald); }
    .avail-open { color: var(--amber); }
    .demo-card-arrow { color: var(--text-muted); }

    /* ── Wizard ── */
    .wizard-container { min-height: 100vh; background: var(--bg); display: flex; align-items: center; justify-content: center; padding: 32px; }
    .wizard-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); width: 100%; max-width: 680px; overflow: hidden; }
    .wizard-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border); }
    .wizard-step-indicator { font-size: 13px; color: var(--text-muted); background: var(--bg-secondary); padding: 4px 12px; border-radius: 12px; }
    .wizard-progress { display: flex; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); }
    .wizard-step { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .wizard-step-circle { width: 32px; height: 32px; border-radius: 50%; background: var(--bg-secondary); border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: var(--text-muted); transition: all var(--transition); }
    .wizard-step-active .wizard-step-circle { border-color: var(--teal); background: rgba(13,148,136,0.15); color: var(--teal); }
    .wizard-step-done .wizard-step-circle { border-color: var(--teal); background: var(--teal); color: #fff; }
    .wizard-step-label { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
    .wizard-connector { flex: 1; height: 2px; background: var(--border); margin: 0 8px; margin-bottom: 18px; transition: background var(--transition); }
    .wizard-connector-done { background: var(--teal); }
    .wizard-body { padding: 28px; }
    .wizard-step-title { font-size: 20px; font-weight: 800; margin-bottom: 20px; }
    .wizard-footer { display: flex; justify-content: space-between; padding: 20px 24px; border-top: 1px solid var(--border); }
    .avatar-upload-area { display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 20px; }
    .avatar-upload-circle { position: relative; }
    .avatar-camera { position: absolute; bottom: 0; right: 0; background: var(--teal); color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; }
    .avatar-upload-hint { font-size: 12px; color: var(--teal); }
    .dropzone { border: 2px dashed var(--border); border-radius: var(--radius-sm); padding: 32px; text-align: center; cursor: pointer; transition: all var(--transition); }
    .dropzone:hover { border-color: var(--teal); background: rgba(13,148,136,0.05); }
    .dropzone-icon { font-size: 32px; margin-bottom: 8px; }
    .dropzone-text { font-size: 14px; color: var(--text-secondary); }
    .dropzone-link { color: var(--teal); }
    .dropzone-hint { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    .dropzone-success { color: var(--emerald); font-size: 14px; }
    .availability-selector { display: flex; flex-direction: column; gap: 8px; }
    .avail-option { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border); cursor: pointer; transition: all var(--transition); }
    .avail-option:hover { border-color: var(--teal); }
    .avail-selected { border-color: var(--teal) !important; background: rgba(13,148,136,0.08); }
    .avail-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .avail-label { font-weight: 600; font-size: 14px; }
    .avail-desc { font-size: 12px; color: var(--text-muted); }
    .completeness-ring { display: block; margin: 0 auto; }
    .pcr-label { font-size: 14px; font-weight: 600; text-align: center; margin-bottom: 8px; }
    .pcr-hint { font-size: 12px; color: var(--text-muted); text-align: center; margin-top: 8px; }
    .profile-completeness-ring-container { display: flex; flex-direction: column; align-items: center; background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 20px; margin-top: 16px; }
    .priority-rank { display: flex; flex-direction: column; gap: 8px; }
    .priority-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: grab; }
    .priority-item:active { cursor: grabbing; }
    .priority-rank-num { width: 24px; height: 24px; background: rgba(13,148,136,0.15); color: var(--teal); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    .priority-rank-label { flex: 1; font-size: 14px; }
    .priority-drag-handle { color: var(--text-muted); font-size: 18px; }
    .approach-selector { display: flex; flex-direction: column; gap: 8px; }
    .approach-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border); cursor: pointer; transition: all var(--transition); }
    .approach-card:hover { border-color: var(--teal); }
    .approach-selected { border-color: var(--teal) !important; background: rgba(13,148,136,0.08); }
    .approach-icon { font-size: 24px; }
    .approach-label { font-weight: 600; font-size: 14px; }
    .approach-desc { font-size: 12px; color: var(--text-muted); }
    .company-logo-upload { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 20px; cursor: pointer; }
    .logo-upload-circle { width: 80px; height: 80px; background: var(--bg-secondary); border: 2px dashed var(--border); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 32px; }

    /* ── Stat Cards ── */
    .stat-cards-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
    .stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; display: flex; align-items: flex-start; gap: 14px; position: relative; overflow: hidden; }
    .stat-card-icon { font-size: 24px; flex-shrink: 0; }
    .stat-card-body { flex: 1; }
    .stat-card-num { font-size: 32px; font-weight: 900; line-height: 1; }
    .stat-card-label { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
    .stat-card-trend { font-size: 12px; margin-top: 4px; }
    .trend-up { color: var(--emerald); }
    .stat-teal .stat-card-num { color: var(--teal); }
    .stat-purple .stat-card-num { color: var(--purple); }
    .stat-emerald .stat-card-num { color: var(--emerald); }
    .stat-amber .stat-card-num { color: var(--amber); }
    .sparkline { position: absolute; bottom: 0; right: 0; opacity: 0.3; color: var(--teal); }
    .stat-teal .sparkline { color: var(--teal); }
    .stat-purple .sparkline { color: var(--purple); }
    .stat-emerald .sparkline { color: var(--emerald); }
    .stat-amber .sparkline { color: var(--amber); }

    /* ── Quick Actions ── */
    .quick-actions-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .agent-status-toggle { display: flex; align-items: center; gap: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 14px; font-size: 14px; }
    .agent-dot { width: 8px; height: 8px; border-radius: 50%; }
    .agent-dot-active { background: var(--emerald); animation: pulse 2s infinite; }

    /* ── Dashboard Grid ── */
    .dashboard-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .dashboard-col { display: flex; flex-direction: column; }

    /* ── Feed ── */
    .feed-list { display: flex; flex-direction: column; gap: 0; }
    .feed-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-light); }
    .feed-item:last-child { border-bottom: none; }
    .feed-icon { width: 32px; height: 32px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .feed-content { flex: 1; }
    .feed-msg { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
    .feed-time { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    /* ── Kanban ── */
    .kanban-board { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; overflow-x: auto; }
    .kanban-mobile { grid-template-columns: repeat(5, minmax(180px, 1fr)); }
    .kanban-col { background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 12px; min-height: 200px; }
    .kanban-col-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .kanban-col-title { font-size: 12px; font-weight: 700; }
    .kanban-col-count { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; }
    .kanban-cards { display: flex; flex-direction: column; gap: 8px; }
    .kanban-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; cursor: pointer; transition: all var(--transition); }
    .kanban-card:hover { border-color: var(--teal); transform: translateY(-2px); box-shadow: var(--shadow); }
    .kanban-card-header { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
    .company-initial { width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
    .kanban-card-info { flex: 1; min-width: 0; }
    .kanban-card-title { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .kanban-card-company { font-size: 11px; color: var(--text-muted); }
    .kanban-card-reasons { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
    .kanban-card-actions { display: flex; gap: 4px; }
    .kanban-btn { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-secondary); }
    .kanban-btn-forward { border-color: var(--teal); color: var(--teal); }
    .kanban-btn-back { border-color: var(--text-muted); }
    .kanban-btn-view { border-color: var(--purple); color: var(--purple); }
    .kanban-empty { color: var(--text-muted); font-size: 12px; text-align: center; padding: 20px 10px; }
    .kanban-card-container { overflow: visible; }
    .swipe-hint { font-size: 12px; color: var(--text-muted); text-align: center; margin-bottom: 12px; background: rgba(13,148,136,0.08); padding: 6px; border-radius: var(--radius-sm); }

    /* ── Weekly Digest ── */
    .weekly-digest-card { background: linear-gradient(135deg, rgba(13,148,136,0.08), rgba(124,58,237,0.08)); }
    .digest-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .digest-icon { font-size: 28px; }
    .digest-title { font-weight: 700; font-size: 15px; }
    .digest-date { font-size: 12px; color: var(--text-muted); }
    .digest-stats { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 10px; }
    .digest-stat { font-size: 13px; color: var(--text-secondary); }
    .digest-num { font-weight: 800; color: var(--teal); margin-right: 4px; }
    .digest-highlight { font-size: 13px; color: var(--text-muted); }

    /* ── Achievements ── */
    .achievements-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .achievements-grid-full { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .achievement-badge { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; text-align: center; position: relative; }
    .achievement-badge-lg { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px 12px; text-align: center; position: relative; }
    .achievement-locked { opacity: 0.5; }
    .achievement-icon { font-size: 24px; margin-bottom: 6px; }
    .achievement-icon-lg { font-size: 32px; margin-bottom: 8px; }
    .achievement-name { font-size: 12px; font-weight: 700; }
    .achievement-desc { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .achievement-lock { position: absolute; top: 6px; right: 6px; font-size: 14px; }
    .achievement-lock-overlay { position: absolute; top: 6px; right: 6px; font-size: 14px; }
    .achievement-earned-mark { position: absolute; top: 6px; right: 6px; color: var(--emerald); font-size: 14px; font-weight: 700; }

    /* ── Trust ── */
    .trust-breakdown { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
    .trust-row { display: flex; align-items: center; gap: 10px; }
    .trust-label { font-size: 13px; min-width: 140px; color: var(--text-secondary); }
    .trust-desc { font-size: 11px; color: var(--text-muted); }
    .trust-bar-wrap { flex: 1; background: var(--bg-secondary); border-radius: 2px; height: 6px; overflow: hidden; }
    .trust-bar { height: 100%; border-radius: 2px; transition: width 0.8s ease; }
    .trust-pct { font-size: 12px; font-weight: 700; min-width: 36px; text-align: right; }
    .trust-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .trust-badge-large { background: var(--emerald); color: #fff; font-weight: 700; font-size: 16px; padding: 4px 12px; border-radius: 8px; }
    .trust-score-hero { text-align: center; margin-bottom: 20px; }
    .trust-score-big { font-size: 64px; font-weight: 900; }
    .trust-score-label { font-size: 14px; color: var(--text-muted); }
    .trust-actions-section { margin-top: 20px; }
    .trust-actions-section h4 { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
    .trust-action-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-light); }
    .trust-action-label { font-size: 14px; font-weight: 600; }
    .trust-action-status { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .trust-done { color: var(--emerald) !important; }
    .trust-bar-section { display: flex; align-items: center; gap: 8px; }

    /* ── Profile Completeness ── */
    .pc-center { display: flex; justify-content: center; margin-bottom: 12px; }
    .pc-suggestions { display: flex; flex-direction: column; gap: 8px; }
    .pc-suggestion { font-size: 13px; color: var(--teal); background: rgba(13,148,136,0.05); border-radius: var(--radius-sm); padding: 8px 12px; }

    /* ── Referral ── */
    .referral-card { background: linear-gradient(135deg, rgba(13,148,136,0.1), rgba(124,58,237,0.1)) !important; border-color: rgba(13,148,136,0.2) !important; }
    .referral-icon { font-size: 32px; margin-bottom: 12px; }
    .referral-title { font-weight: 700; font-size: 16px; margin-bottom: 8px; }
    .referral-desc { font-size: 14px; color: var(--text-secondary); margin-bottom: 12px; }
    .referral-link-row { display: flex; gap: 8px; align-items: center; }
    .referral-link-text { font-size: 12px; background: var(--bg-secondary); padding: 8px 12px; border-radius: var(--radius-sm); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted); }

    /* ── Matches ── */
    .filter-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px; }
    .filter-tab { padding: 7px 14px; border-radius: 6px; background: transparent; color: var(--text-secondary); font-size: 13px; font-weight: 500; transition: all var(--transition); }
    .filter-tab:hover { color: var(--text-primary); }
    .filter-tab-active { background: var(--teal) !important; color: #fff !important; }
    .matches-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .match-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; cursor: pointer; transition: all var(--transition); display: flex; flex-direction: column; gap: 12px; }
    .match-card:hover { border-color: var(--teal); transform: translateY(-2px); box-shadow: var(--shadow); }
    .match-card-header { display: flex; align-items: flex-start; gap: 12px; }
    .company-initial-lg { width: 48px; height: 48px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; flex-shrink: 0; }
    .match-card-meta { flex: 1; min-width: 0; }
    .match-card-company { font-size: 13px; color: var(--text-muted); }
    .match-card-title { font-weight: 700; font-size: 15px; }
    .match-card-stage-pill { display: inline-flex; margin-top: 4px; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
    .match-card-confidence { display: flex; }
    .match-card-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .empty-state { text-align: center; color: var(--text-muted); padding: 40px; font-size: 14px; }
    .match-ring { display: block; }

    /* ── Match Detail ── */
    .back-btn { display: inline-flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 14px; margin-bottom: 20px; background: none; border: none; cursor: pointer; }
    .back-btn:hover { color: var(--teal); }
    .match-detail-header { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 28px; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
    .match-detail-company { display: flex; align-items: flex-start; gap: 16px; flex: 1; }
    .company-initial-xl { width: 64px; height: 64px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; flex-shrink: 0; }
    .match-detail-company-name { font-size: 16px; color: var(--text-muted); margin-bottom: 4px; }
    .match-detail-job-title { font-size: 24px; font-weight: 800; }
    .match-detail-meta { font-size: 13px; color: var(--text-muted); margin-top: 6px; }
    .match-detail-score-block { display: flex; flex-direction: column; align-items: center; gap: 10px; flex-shrink: 0; }
    .match-detail-stage-pill { display: inline-flex; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .match-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .match-detail-col { display: flex; flex-direction: column; }
    .match-reasons-detail { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
    .match-reason-row { display: flex; align-items: center; gap: 10px; }
    .mr-label { font-size: 13px; min-width: 120px; color: var(--text-secondary); }
    .mr-bar-wrap { flex: 1; background: var(--bg-secondary); border-radius: 2px; height: 8px; overflow: hidden; }
    .mr-bar { height: 100%; border-radius: 2px; }
    .mr-pct { font-size: 12px; font-weight: 700; min-width: 36px; text-align: right; }
    .match-reason-tags-block { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .salary-overlap-vis { height: 8px; border-radius: 2px; background: linear-gradient(to right, #0d9488 40%, #7c3aed 100%); }
    .negotiation-log { display: flex; flex-direction: column; gap: 12px; max-height: 300px; overflow-y: auto; }
    .neg-entry { padding: 12px; border-radius: var(--radius-sm); }
    .neg-candidate { background: rgba(13,148,136,0.08); border: 1px solid rgba(13,148,136,0.15); }
    .neg-recruiter { background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.15); }
    .neg-system { background: rgba(217,119,6,0.08); border: 1px solid rgba(217,119,6,0.15); }
    .neg-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .neg-agent-icon { font-size: 18px; }
    .neg-agent-name { font-weight: 700; font-size: 13px; }
    .neg-time { font-size: 11px; color: var(--text-muted); margin-left: auto; }
    .neg-message { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
    .neg-status-banner { background: rgba(5,150,105,0.1); border: 1px solid rgba(5,150,105,0.2); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 13px; font-weight: 600; color: var(--emerald); text-align: center; }
    .profile-preview { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
    .pp-name { font-weight: 700; font-size: 16px; }
    .pp-title { font-size: 13px; color: var(--text-muted); }
    .pp-location { font-size: 13px; color: var(--text-muted); }
    .pp-skills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .pp-availability { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
    .avail-dot-inline { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .privacy-badge { font-size: 12px; color: var(--text-muted); background: var(--bg-secondary); padding: 3px 8px; border-radius: 10px; }
    .jd-preview { font-size: 14px; color: var(--text-secondary); line-height: 1.7; }
    .jd-skills { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .jd-salary { margin-top: 8px; font-size: 14px; }
    .match-action-bar { display: flex; gap: 12px; flex-wrap: wrap; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }

    /* ── Persona ── */
    .persona-layout { display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: start; }
    .persona-sidebar {}
    .persona-main { min-width: 0; }
    .persona-completeness-card { display: flex; flex-direction: column; align-items: center; }
    .persona-tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border); margin: -24px -24px 20px; padding: 0 24px; overflow-x: auto; }
    .persona-tab { padding: 14px 14px; font-size: 13px; font-weight: 600; color: var(--text-muted); background: none; border-bottom: 2px solid transparent; white-space: nowrap; transition: all var(--transition); }
    .persona-tab:hover { color: var(--text-primary); }
    .persona-tab-active { color: var(--teal) !important; border-bottom-color: var(--teal) !important; }
    .persona-tab-content { padding-top: 4px; }
    .persona-avatar-row { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
    .persona-avatar-upload { position: relative; cursor: pointer; }
    .persona-avatar-edit { position: absolute; bottom: 0; right: 0; background: var(--teal); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .persona-name { font-size: 20px; font-weight: 800; }
    .persona-role { font-size: 14px; color: var(--text-muted); }
    .persona-save-bar { display: flex; align-items: center; justify-content: space-between; background: rgba(13,148,136,0.1); border: 1px solid rgba(13,148,136,0.2); border-radius: var(--radius-sm); padding: 12px 16px; margin-top: 20px; transform: translateY(20px); opacity: 0; transition: all var(--transition); pointer-events: none; }
    .save-bar-visible { transform: translateY(0) !important; opacity: 1 !important; pointer-events: all !important; }
    .unsaved-indicator { font-size: 13px; color: var(--teal); font-weight: 600; }
    .privacy-shield { display: flex; flex-direction: column; gap: 16px; }
    .privacy-shield-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .privacy-shield-title { font-size: 16px; font-weight: 700; }
    .privacy-shield-desc { font-size: 13px; color: var(--text-muted); }
    .privacy-fields { display: flex; flex-direction: column; gap: 12px; }
    .privacy-field-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-light); }
    .privacy-field-info { display: flex; flex-direction: column; gap: 2px; }
    .privacy-field-name { font-size: 14px; font-weight: 600; }
    .privacy-field-status { font-size: 12px; }
    .pf-visible { color: var(--emerald); }
    .pf-hidden { color: var(--text-muted); }
    .privacy-note { font-size: 12px; color: var(--text-muted); background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 12px; margin-top: 8px; line-height: 1.6; }
    .agent-settings-section { display: flex; flex-direction: column; gap: 16px; }
    .priority-weights-section { display: flex; flex-direction: column; gap: 10px; }
    .priority-weight-row { display: flex; align-items: center; gap: 10px; }
    .pw-label { font-size: 13px; min-width: 140px; color: var(--text-secondary); }
    .pw-slider { flex: 1; }
    .pw-val { font-size: 12px; font-weight: 700; min-width: 36px; text-align: right; }

    /* ── Jobs Table ── */
    .jobs-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    .jobs-filter-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
    .jobs-table-wrap { overflow-x: auto; }
    .jobs-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .jobs-table th { padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); cursor: pointer; }
    .jobs-table th:hover { color: var(--text-primary); }
    .jobs-table td { padding: 14px; border-bottom: 1px solid var(--border-light); vertical-align: middle; }
    .jobs-row:hover td { background: var(--bg-hover); }
    .job-title-cell { display: flex; flex-direction: column; }
    .job-title-text { font-weight: 700; }
    .job-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .job-date { color: var(--text-muted); font-size: 13px; }
    .job-count { font-weight: 700; }
    .job-salary { font-size: 13px; color: var(--text-secondary); }
    .match-rate-cell { display: flex; align-items: center; gap: 8px; }
    .match-rate-bar { flex: 1; background: var(--bg-secondary); border-radius: 2px; height: 6px; overflow: hidden; }
    .job-actions { display: flex; gap: 6px; }
    .job-pipeline-row td { background: var(--bg-secondary) !important; padding: 16px !important; }
    .job-pipeline-inner { padding: 4px 0; }
    .mini-kanban { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .mini-kanban-col { display: flex; flex-direction: column; gap: 8px; }
    .mini-kanban-header { font-size: 11px; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
    .mini-kanban-count { background: var(--bg-secondary); border-radius: 10px; padding: 1px 6px; font-size: 10px; }
    .mini-kanban-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; padding: 8px; display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .mini-kanban-card:hover { border-color: var(--teal); }

    /* ── Job Form ── */
    .job-form-layout { display: grid; grid-template-columns: 1fr 300px; gap: 20px; align-items: start; }
    .job-form-main {}
    .job-form-sidebar {}
    .ai-suggest-btn { white-space: nowrap; }
    .quality-score-card { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .quality-score-ring { margin: 8px 0; }
    .quality-checklist { display: flex; flex-direction: column; gap: 6px; width: 100%; }
    .quality-check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); }
    .quality-check-done { color: var(--emerald); }
    .quality-tip { font-size: 12px; color: var(--text-muted); text-align: center; }
    .ai-suggestions-panel {}
    .ai-generating { font-size: 13px; color: var(--text-muted); }
    .ai-result { background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 12px; font-size: 13px; }
    .ai-result-meta { margin-top: 8px; color: var(--text-muted); }
    .job-form-actions { display: flex; gap: 12px; justify-content: flex-end; padding-top: 16px; border-top: 1px solid var(--border); margin-top: 8px; }

    /* ── Settings ── */
    .settings-layout { display: grid; grid-template-columns: 220px 1fr; gap: 20px; align-items: start; }
    .settings-sidebar { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px; position: sticky; top: 90px; }
    .settings-nav-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-radius: var(--radius-sm); background: transparent; color: var(--text-secondary); font-size: 14px; font-weight: 500; transition: all var(--transition); }
    .settings-nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
    .settings-nav-active { background: rgba(13,148,136,0.12) !important; color: var(--teal) !important; }
    .settings-content {}
    .settings-section-title { font-size: 18px; font-weight: 800; margin-bottom: 20px; }
    .settings-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-light); gap: 16px; }
    .settings-toggle-label { font-size: 14px; font-weight: 600; }
    .settings-toggle-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .settings-divider { border: none; border-top: 1px solid var(--border); margin: 20px 0; }
    .email-field-row { display: flex; align-items: center; gap: 10px; }
    .verified-badge { background: rgba(5,150,105,0.15); color: var(--emerald); padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; white-space: nowrap; }
    .notif-group { margin-bottom: 20px; }
    .notif-group-title { font-size: 14px; font-weight: 700; color: var(--text-secondary); margin-bottom: 10px; }
    .session-info { background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .session-info-row { display: flex; justify-content: space-between; font-size: 14px; }
    .session-list { display: flex; flex-direction: column; gap: 8px; }
    .session-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-secondary); border-radius: var(--radius-sm); }
    .session-current { border: 1px solid var(--teal); }
    .session-device { font-weight: 600; font-size: 14px; flex: 1; }
    .session-location { font-size: 12px; color: var(--text-muted); flex: 1; }
    .danger-zone { display: flex; flex-direction: column; gap: 16px; }
    .danger-action { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: var(--bg-secondary); border-radius: var(--radius-sm); gap: 16px; }
    .danger-action-last { border: 1px solid rgba(220,38,38,0.3); background: rgba(220,38,38,0.05); }
    .danger-action-title { font-weight: 700; font-size: 14px; }
    .danger-action-desc { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
    .danger-btn { border-color: rgba(220,38,38,0.3) !important; color: var(--red) !important; }
    .danger-delete-btn { background: var(--red) !important; color: #fff !important; border: none !important; padding: 10px 18px; border-radius: var(--radius-sm); font-size: 14px; font-weight: 600; white-space: nowrap; }
    .danger-title { color: var(--red) !important; }
    .qr-placeholder { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 40px; text-align: center; color: var(--text-muted); font-size: 13px; margin: 12px 0; }
    .two-fa-section {}

    /* ── Notifications ── */
    .notif-list { display: flex; flex-direction: column; gap: 0; }
    .notif-item { display: flex; align-items: flex-start; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--border-light); }
    .notif-unread .notif-msg { font-weight: 600; }
    .notif-dot { width: 8px; height: 8px; background: var(--teal); border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
    .notif-msg { font-size: 14px; color: var(--text-secondary); }
    .notif-time { font-size: 12px; color: var(--text-muted); margin-top: 3px; }

    /* ── Privacy Page ── */
    .privacy-page { max-width: 760px; margin: 0 auto; padding: 40px 24px; }
    .privacy-content h1 { font-size: 32px; font-weight: 900; margin-bottom: 8px; }
    .privacy-updated { color: var(--text-muted); font-size: 13px; margin-bottom: 32px; }
    .privacy-content h2 { font-size: 18px; font-weight: 700; margin: 28px 0 10px; color: var(--text-primary); }
    .privacy-content p { font-size: 15px; color: var(--text-secondary); line-height: 1.7; }

    /* ── Leaderboard ── */
    .leaderboard-table { display: flex; flex-direction: column; gap: 0; }
    .leaderboard-header-row { display: grid; grid-template-columns: 60px 1fr 80px 80px 80px; gap: 16px; padding: 10px 14px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; }
    .leaderboard-row { display: grid; grid-template-columns: 60px 1fr 80px 80px 80px; gap: 16px; padding: 14px; border-bottom: 1px solid var(--border-light); align-items: center; transition: background var(--transition); }
    .leaderboard-row:hover { background: var(--bg-hover); }
    .leaderboard-top-3 { background: rgba(13,148,136,0.04); }
    .lb-col { display: flex; align-items: center; }
    .lb-rank { justify-content: center; font-size: 20px; }
    .lb-rank-num { font-size: 16px; font-weight: 700; color: var(--text-muted); }
    .lb-area { flex-direction: column; align-items: flex-start; gap: 6px; }
    .lb-area-label { font-weight: 600; font-size: 14px; }
    .lb-sparkbar { height: 4px; border-radius: 2px; min-width: 20px; transition: width 0.8s; }
    .lb-matches { font-weight: 700; font-size: 16px; }
    .lb-badges { gap: 6px; }
    .lb-badge { font-size: 18px; cursor: default; }
    .leaderboard-public { min-height: 100vh; background: var(--bg); }

    /* ── Boost Modal ── */
    .boost-modal {}
    .boost-features { display: flex; flex-direction: column; gap: 8px; margin: 16px 0; }
    .boost-feature { font-size: 14px; color: var(--text-secondary); }
    .boost-price { font-size: 14px; color: var(--text-muted); margin-bottom: 16px; text-align: center; }

    /* ── Share Card ── */
    .share-card { background: linear-gradient(135deg, rgba(13,148,136,0.1), rgba(124,58,237,0.1)); border: 1px solid rgba(13,148,136,0.2); border-radius: var(--radius); padding: 20px; }
    .share-card-content { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
    .share-company-initial { width: 56px; height: 56px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; }
    .share-reasons { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .share-caption { font-size: 13px; color: var(--teal); font-weight: 600; }

    /* ── Report Preview ── */
    .report-preview {}
    .report-header { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
    .report-period { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
    .report-stats { display: flex; flex-direction: column; gap: 8px; }
    .report-stat { display: flex; justify-content: space-between; font-size: 14px; padding: 8px 0; border-bottom: 1px solid var(--border-light); }

    /* ── Checklist Grid ── */
    .checklist-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .check-item { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-secondary); cursor: pointer; }
    .check-item input { accent-color: var(--teal); }

    /* ── Mobile Navigation ── */
    .mobile-nav { display: flex; background: var(--bg-secondary); border-top: 1px solid var(--border); position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; }
    .mobile-nav .nav-item { flex: 1; flex-direction: column; gap: 4px; justify-content: center; padding: 10px 6px; font-size: 10px; text-align: center; }
    .mobile-nav .nav-icon { display: flex; justify-content: center; }
    .mobile-nav .nav-label { font-size: 10px; }
    .sidebar-mobile-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; }
    .sidebar-mobile-open { position: fixed; left: 0; top: 0; height: 100vh; z-index: 201; }

    /* ── Misc ── */
    .jobs-cards-mobile { display: flex; flex-direction: column; gap: 12px; }
    .job-card-mobile { background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 16px; cursor: pointer; transition: all var(--transition); }
    .job-card-mobile:hover { border: 1px solid var(--teal); }
    .job-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
    .job-card-stats { display: flex; gap: 16px; font-size: 13px; color: var(--text-muted); }

    /* ── Mobile Responsive ── */
    @media (max-width: 768px) {
      .main-content { margin-left: 0 !important; padding-bottom: 70px; }
      .sidebar { display: none; }
      .stat-cards-grid { grid-template-columns: 1fr 1fr !important; }
      .dashboard-grid-2col { grid-template-columns: 1fr !important; }
      .steps-grid { grid-template-columns: 1fr !important; }
      .testimonials-grid { grid-template-columns: 1fr !important; }
      .stats-grid { grid-template-columns: 1fr 1fr !important; }
      .matches-grid { grid-template-columns: 1fr !important; }
      .match-detail-grid { grid-template-columns: 1fr !important; }
      .persona-layout { grid-template-columns: 1fr !important; }
      .job-form-layout { grid-template-columns: 1fr !important; }
      .settings-layout { grid-template-columns: 1fr !important; }
      .hero { padding: 40px 20px 60px !important; }
      .hero-visual { display: none !important; }
      .section-container { padding: 40px 20px !important; }
      .landing-nav-inner { padding: 14px 20px !important; }
      .form-row { grid-template-columns: 1fr !important; }
      .achievements-grid-full { grid-template-columns: repeat(2, 1fr) !important; }
      .top-bar { padding: 0 16px !important; }
      .dashboard-body { padding: 16px !important; }
      .match-action-bar { flex-direction: column !important; }
      .mini-kanban { grid-template-columns: repeat(3, 1fr) !important; }
    }

    /* ── AI Chat Bubble ── */
    .ai-chat-bubble { position: fixed; bottom: 24px; right: 24px; z-index: 9999; }
    .chat-toggle { width: 56px; height: 56px; border-radius: 50%; background: var(--teal); color: #fff; font-size: 24px; border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(13,148,136,0.4); transition: all 0.3s; display: flex; align-items: center; justify-content: center; }
    .chat-toggle:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(13,148,136,0.5); }
    .chat-panel { position: absolute; bottom: 70px; right: 0; width: 360px; max-height: 480px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); display: flex; flex-direction: column; animation: scaleIn 0.2s ease; overflow: hidden; }
    .chat-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--border); font-weight: 700; font-size: 14px; color: var(--text-primary); }
    .chat-context { font-size: 11px; color: var(--text-muted); font-weight: 400; }
    .chat-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; max-height: 320px; min-height: 200px; }
    .chat-msg { display: flex; gap: 8px; align-items: flex-start; }
    .chat-msg-ai { }
    .chat-msg-user { flex-direction: row-reverse; }
    .chat-msg-avatar { flex-shrink: 0; }
    .chat-msg-text { padding: 8px 12px; border-radius: 12px; font-size: 13px; line-height: 1.5; max-width: 80%; }
    .chat-msg-ai .chat-msg-text { background: var(--bg-secondary); color: var(--text-primary); border-bottom-left-radius: 4px; }
    .chat-msg-user .chat-msg-text { background: var(--teal); color: #fff; border-bottom-right-radius: 4px; }
    .chat-input-row { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--border); }
    .chat-input { flex: 1; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 20px; padding: 8px 16px; font-size: 13px; color: var(--text-primary); outline: none; }
    .chat-input:focus { border-color: var(--teal); }
    .chat-send-btn { width: 36px; height: 36px; border-radius: 50%; background: var(--teal); color: #fff; border: none; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }

    /* ── AI Conversation Starter ── */
    .ai-convo-container { max-width: 600px; margin: 0 auto; }
    .ai-convo-messages { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
    .ai-convo-msg { display: flex; gap: 10px; align-items: flex-start; animation: fadeUp 0.3s ease; }
    .ai-convo-msg-ai { }
    .ai-convo-msg-user { flex-direction: row-reverse; }
    .ai-convo-bubble { padding: 12px 16px; border-radius: 16px; font-size: 14px; line-height: 1.6; max-width: 85%; }
    .ai-convo-msg-ai .ai-convo-bubble { background: var(--bg-secondary); color: var(--text-primary); border-bottom-left-radius: 4px; }
    .ai-convo-msg-user .ai-convo-bubble { background: var(--teal); color: #fff; border-bottom-right-radius: 4px; }
    .ai-convo-input-row { display: flex; gap: 10px; }
    .ai-convo-input { flex: 1; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 24px; padding: 12px 20px; font-size: 14px; color: var(--text-primary); }
    .ai-convo-input:focus { border-color: var(--teal); outline: none; }
    .ai-convo-send { width: 48px; height: 48px; border-radius: 50%; background: var(--teal); color: #fff; font-size: 20px; border: none; cursor: pointer; }
    .ai-preview-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; margin: 16px 0; }
    .ai-preview-card h4 { font-size: 15px; margin-bottom: 12px; color: var(--teal); }
    .ai-preview-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid var(--border); }
    .ai-preview-item:last-child { border-bottom: none; }

    /* ── Related Skills Panel ── */
    .related-skills-panel { background: rgba(13,148,136,0.08); border: 1px solid rgba(13,148,136,0.2); border-radius: var(--radius-sm); padding: 12px; margin-top: 8px; animation: fadeUp 0.3s ease; }
    .related-skills-header { font-size: 12px; color: var(--teal); font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
    .related-skills-list { display: flex; flex-wrap: wrap; gap: 6px; }

    /* ── Validation Indicators ── */
    .field-valid { position: relative; }
    .field-valid::after { content: '✓'; position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #059669; font-weight: 700; }
    .field-warning::after { content: '⚠'; position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #d97706; }
    .field-error::after { content: '✕'; position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #dc2626; }
    .validation-msg { font-size: 12px; margin-top: 4px; }
    .validation-msg-error { color: #dc2626; }
    .validation-msg-warning { color: #d97706; }
    .validation-msg-success { color: #059669; }
    .validation-msg-info { color: #60a5fa; }

    /* ── Contextual Help Tooltips ── */
    .help-icon { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background: var(--bg-secondary); border: 1px solid var(--border); font-size: 11px; color: var(--text-muted); cursor: help; position: relative; margin-left: 6px; font-style: normal; }
    .help-icon:hover::after { content: attr(data-tooltip); position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: var(--bg-card); border: 1px solid var(--border); color: var(--text-primary); padding: 8px 12px; border-radius: 8px; font-size: 12px; white-space: normal; width: 220px; z-index: 100; box-shadow: var(--shadow); font-weight: 400; line-height: 1.5; }

    /* ── Auto-save Indicator ── */
    .autosave-indicator { background: rgba(5,150,105,0.15); color: #059669; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
    .autosave-visible { opacity: 1; }

    /* ── Gamification Bar ── */
    .gamification-bar { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 20px; }
    .gamification-progress { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; margin: 8px 0; }
    .gamification-fill { height: 100%; background: linear-gradient(90deg, var(--teal), #059669); border-radius: 4px; transition: width 0.6s ease; }
    .gamification-label { display: flex; justify-content: space-between; font-size: 12px; }
    .gamification-percent { font-weight: 700; color: var(--teal); }
    .gamification-msg { color: var(--text-muted); }

    /* ── Review Step ── */
    .review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .review-section { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px; }
    .review-section-title { font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
    .review-item { padding: 6px 0; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; }
    .review-item:last-child { border-bottom: none; }
    .validation-results { margin-top: 16px; }
    .validation-result-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 6px; font-size: 13px; }
    .validation-error { background: rgba(220,38,38,0.1); color: #f87171; }
    .validation-warning { background: rgba(217,119,6,0.1); color: #fbbf24; }
    .validation-suggestion { background: rgba(37,99,235,0.1); color: #60a5fa; }
    .confetti-burst { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; }
    .confetti-particle { position: absolute; width: 8px; height: 8px; border-radius: 2px; animation: confettiFall 2s ease-out forwards; }
    @keyframes confettiFall { 0% { opacity: 1; transform: translateY(-20px) rotate(0deg); } 100% { opacity: 0; transform: translateY(100vh) rotate(720deg); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    /* ── Quick-start Templates ── */
    .template-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
    .template-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px; text-align: center; cursor: pointer; transition: all 0.2s; }
    .template-card:hover { border-color: var(--teal); background: rgba(13,148,136,0.08); transform: translateY(-2px); }
    .template-icon { font-size: 28px; margin-bottom: 8px; }
    .template-label { font-size: 13px; font-weight: 600; color: var(--text-primary); }

    /* ── Mobile adjustments for new features ── */
    @media (max-width: 768px) {
      .chat-panel { width: calc(100vw - 32px); right: -8px; }
      .template-grid { grid-template-columns: repeat(2, 1fr); }
      .review-grid { grid-template-columns: 1fr; }
      .ai-convo-bubble { max-width: 90%; }
    }
    @media (max-width: 480px) {
      .ai-chat-bubble { bottom: 72px; right: 12px; }
      .chat-toggle { width: 48px; height: 48px; font-size: 20px; }
    }
  `;
  document.head.appendChild(style);
})();
