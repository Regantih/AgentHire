// PART 3: Onboarding Wizards
// ============================================================

const SKILL_SUGGESTIONS = ['Python','JavaScript','React','TypeScript','Node.js','AWS','GCP','Azure','Docker','Kubernetes','PostgreSQL','MongoDB','Redis','GraphQL','REST APIs','Machine Learning','TensorFlow','PyTorch','MLOps','System Design','Go','Rust','Java','C++','Scala','Spark','Kafka','Terraform','CI/CD','Product Strategy','SQL','Figma','Agile','Scrum','Data Analysis','Tableau','R','Statistics','Leadership','Communication'];
const INDUSTRY_OPTIONS = ['Technology','AI/ML','FinTech','HealthTech','EdTech','E-commerce','Enterprise SaaS','Cybersecurity','Quantum Computing','Biotech','Gaming','Media','Consulting','Government'];
const BENEFIT_OPTIONS = ['Health Insurance','401k/Retirement','Remote Work','Equity/Stock','Unlimited PTO','Parental Leave','Learning Budget','Gym Membership','Home Office Stipend','Flexible Hours'];
const DEALBREAKER_OPTIONS = ['No Relocation','No On-site Required','No Startups','No Enterprise','No Travel','No On-call Rotation','No Non-compete','No < $100k'];
const PRIORITY_OPTIONS = ['Compensation','Culture Fit','Career Growth','Work-life Balance','Technical Challenge','Team Quality','Company Mission','Brand/Prestige'];

function renderOnboarding() {
  if (!APP.user) { navigate('landing'); return; }
  if (APP.user.role === 'recruiter') renderRecruiterWizard();
  else renderCandidateWizard();
}

// ─── Candidate Wizard ─────────────────────────────────────────
function renderCandidateWizard() {
  const step = APP.onboardingStep || 0;
  const data = APP.onboardingData || {};

  const progressSteps = [
    { n: 0, label: 'AI Chat' },
    { n: 1, label: 'Basic Info' },
    { n: 2, label: 'Skills' },
    { n: 3, label: 'Preferences' },
    { n: 4, label: 'Review' },
  ];

  const progressHTML = `
    <div class="wizard-progress">
      ${progressSteps.map(s => `
        <div class="wizard-step ${step === s.n ? 'wizard-step-active' : step > s.n ? 'wizard-step-done' : ''}">
          <div class="wizard-step-circle">${step > s.n ? '✓' : s.n + 1}</div>
          <div class="wizard-step-label">${s.label}</div>
        </div>
        ${s.n < 4 ? '<div class="wizard-connector ' + (step > s.n ? 'wizard-connector-done' : '') + '"></div>' : ''}`
      ).join('')}
    </div>`;

  const scoreVal = calcProfileScore(data);
  const gamBar = renderGamificationBar(scoreVal);

  let stepContent = '';

  if (step === 0) {
    // AI Conversation Starter
    const msgs = APP.convoMessages || [];
    const preview = APP.convoPreview;
    stepContent = `
      <h3 class="wizard-step-title">👋 Let's build your profile together</h3>
      <div class="ai-convo-container">
        <div class="ai-convo-messages" id="ai-convo-messages">
          <div class="ai-convo-msg ai-convo-msg-ai">
            <div style="font-size:28px;flex-shrink:0">🤖</div>
            <div class="ai-convo-bubble">Hi! I'm your AI hiring agent. Let's build your profile together.</div>
          </div>
          <div class="ai-convo-msg ai-convo-msg-ai">
            <div style="font-size:28px;flex-shrink:0">🤖</div>
            <div class="ai-convo-bubble">First, tell me a bit about yourself — what do you do professionally?</div>
          </div>
          ${msgs.map(m => `
            <div class="ai-convo-msg ${m.role === 'ai' ? 'ai-convo-msg-ai' : 'ai-convo-msg-user'}">
              <div style="font-size:${m.role === 'ai' ? '28px' : '22px'};flex-shrink:0">${m.role === 'ai' ? '🤖' : '🙋'}</div>
              <div class="ai-convo-bubble">${m.text}</div>
            </div>`).join('')}
        </div>
        ${preview ? `
          <div class="ai-preview-card">
            <h4>✨ Got it! Here's what I've extracted:</h4>
            <div class="ai-preview-item"><span>Headline</span><strong>${preview.headline || '—'}</strong></div>
            <div class="ai-preview-item"><span>Experience</span><strong>${preview.experience ? preview.experience + ' years' : '—'}</strong></div>
            <div class="ai-preview-item"><span>Skills detected</span><strong>${(preview.skills || []).slice(0,4).join(', ') || '—'}</strong></div>
          </div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Look good? Click <strong>Continue</strong> to fine-tune, or tell me more below.</p>
        ` : ''}
        <div class="ai-convo-input-row">
          <input type="text" id="convo-input" class="ai-convo-input" placeholder="e.g. I'm a Python developer with 5 years in machine learning..." onkeydown="if(event.key==='Enter')processConvoInput()">
          <button class="ai-convo-send" onclick="processConvoInput()">→</button>
        </div>
      </div>`;
  } else if (step === 1) {
    // Basic Info — enhanced
    const nameVal = data.name || APP.user.name || '';
    const headlineVal = data.headline || APP.user.title || '';
    const locationVal = data.location || APP.user.location || '';
    const linkedinVal = data.linkedin || '';
    stepContent = `
      <h3 class="wizard-step-title">Tell us about yourself</h3>
      ${gamBar}
      <div class="avatar-upload-area" onclick="toast('Photo upload coming soon','info')">
        <div class="avatar-upload-circle">
          ${avatar(APP.user.avatar || 'ME', '#0d9488', 72)}
          <div class="avatar-camera">📷</div>
        </div>
        <span class="avatar-upload-hint">Click to upload photo</span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Full Name <span class="help-icon" data-tooltip="Your legal name as it appears on your resume.">?</span></label>
          <input type="text" id="w-name" class="form-input" value="${nameVal}" placeholder="Jane Smith" oninput="validateFieldInline('w-name','name')">
          <div class="validation-msg" id="val-w-name"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Professional Headline <span class="help-icon" data-tooltip="A concise title like 'Senior ML Engineer' or 'Product Manager at Series B startups'. Keep it under 60 characters.">?</span></label>
          <input type="text" id="w-headline" class="form-input" value="${headlineVal}" placeholder="Senior ML Engineer" oninput="validateFieldInline('w-headline','headline')">
          <div class="validation-msg" id="val-w-headline"></div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Location <span class="help-icon" data-tooltip="City and state/country. Used for location matching and remote preferences.">?</span></label>
        <input type="text" id="w-location" class="form-input" value="${locationVal}" placeholder="San Francisco, CA">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">LinkedIn URL <span class="help-icon" data-tooltip="Your LinkedIn profile URL. Helps recruiters verify your background.">?</span></label>
          <div style="display:flex;gap:8px">
            <input type="url" id="w-linkedin" class="form-input" value="${linkedinVal}" placeholder="https://linkedin.com/in/yourname" style="flex:1">
            <button class="btn btn-ghost" style="white-space:nowrap;font-size:13px" onclick="importFromLinkedIn()">Import →</button>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Resume <span class="help-icon" data-tooltip="Paste your resume text and we'll auto-fill your skills, experience, and headline.">?</span></label>
        <div class="dropzone" id="resume-dropzone" onclick="simulateResumeUpload()">
          <div class="dropzone-icon">📄</div>
          <div class="dropzone-text">Drag & drop your resume, or <span class="dropzone-link">browse files</span></div>
          <div class="dropzone-hint">PDF, DOCX up to 5MB • AI parses automatically</div>
        </div>
        <textarea id="resume-paste" class="form-input form-textarea" style="margin-top:8px" rows="3"
          placeholder="Or paste your resume text here and click Parse..."
          oninput="scheduleResumeParse()"></textarea>
        <div id="resume-parse-status" style="font-size:12px;color:var(--text-muted);margin-top:4px"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Availability</label>
        <div class="availability-selector">
          <div class="avail-option ${(data.availability || 'active') === 'active' ? 'avail-selected' : ''}" onclick="selectAvailability('active')">
            <span class="avail-dot" style="background:#059669"></span>
            <div>
              <div class="avail-label">Actively Looking</div>
              <div class="avail-desc">Respond to matches quickly</div>
            </div>
          </div>
          <div class="avail-option ${data.availability === 'open' ? 'avail-selected' : ''}" onclick="selectAvailability('open')">
            <span class="avail-dot" style="background:#d97706"></span>
            <div>
              <div class="avail-label">Open to Opportunities</div>
              <div class="avail-desc">Passive — only great matches</div>
            </div>
          </div>
          <div class="avail-option ${data.availability === 'closed' ? 'avail-selected' : ''}" onclick="selectAvailability('closed')">
            <span class="avail-dot" style="background:#dc2626"></span>
            <div>
              <div class="avail-label">Not Looking</div>
              <div class="avail-desc">Pause agent matching</div>
            </div>
          </div>
        </div>
      </div>`;
  } else if (step === 2) {
    const selected = data.skills || APP.user.skills || [];
    const skillCount = selected.length;
    const skillWarning = skillCount < 3 ? `<div class="validation-msg validation-msg-warning">⚠ Add at least ${3 - skillCount} more skill${3 - skillCount > 1 ? 's' : ''} for better matches</div>` : `<div class="validation-msg validation-msg-success">✓ Great skill set!</div>`;
    stepContent = `
      <h3 class="wizard-step-title">Skills & Work Preferences</h3>
      ${gamBar}
      <div class="profile-completeness-ring-container">
        <div class="pcr-label">AI Quality Score</div>
        ${completenessRing(scoreVal)}
        <div class="pcr-hint">Add more skills to improve your score</div>
      </div>
      <div class="form-group">
        <label class="form-label">Your Skills <span class="help-icon" data-tooltip="List your top technical and soft skills. Aim for 5-10 for the best match rate.">?</span></label>
        <div class="skill-tag-input">
          <div class="skill-tags-selected" id="skill-tags-selected">
            ${selected.map(s => `<span class="skill-tag skill-tag-added">${s}<button onclick="removeSkill('${s}')">×</button></span>`).join('')}
            <input type="text" id="skill-input" class="skill-input" placeholder="Type a skill..." oninput="filterSkillSuggestions(this.value);fetchRelatedSkills(this.value)" onkeydown="addSkillOnEnter(event)">
          </div>
          <div class="skill-suggestions" id="skill-suggestions">
            ${SKILL_SUGGESTIONS.filter(s => !selected.includes(s)).slice(0,12).map(s =>
              `<span class="skill-suggestion" onclick="addSkill('${s}')">${s}</span>`).join('')}
          </div>
        </div>
        ${skillWarning}
        <div id="related-skills-panel"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Years of Experience: <strong id="exp-display">${data.experience || 3}</strong> <span class="help-icon" data-tooltip="Total professional experience in your field.">?</span></label>
        <input type="range" id="exp-slider" class="range-slider" min="0" max="20" value="${data.experience || 3}"
          oninput="document.getElementById('exp-display').textContent=this.value=='20'?'20+':this.value">
        <div class="range-labels"><span>0 yrs</span><span>10 yrs</span><span>20+ yrs</span></div>
      </div>
      <div class="form-group">
        <label class="form-label">Work Preference</label>
        <div class="toggle-group" id="work-pref-toggle">
          ${['Remote','Hybrid','On-site'].map(w => `
            <button class="toggle-btn ${(data.workPref || 'Remote') === w ? 'toggle-active' : ''}" onclick="selectWorkPref('${w}')">${w}</button>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Industry Preferences</label>
        <div class="industry-tags" id="industry-tags">
          ${INDUSTRY_OPTIONS.map(i => {
            const sel = (data.industries || []).includes(i);
            return `<span class="industry-tag ${sel ? 'industry-selected' : ''}" onclick="toggleIndustry('${i}')">${i}</span>`;
          }).join('')}
        </div>
      </div>`;
  } else if (step === 3) {
    const salary = data.salary || [120000, 180000];
    const salMin = salary[0], salMax = salary[1];
    const salWarningLow = salMin < 30000 ? `<div class="validation-msg validation-msg-error">⚠ Unusually low — verify your target salary</div>` : '';
    const salWarningHigh = salMax > 500000 ? `<div class="validation-msg validation-msg-warning">⚠ Unusually high — ensure this is accurate</div>` : '';
    const marketRate = APP.lastAISuggest?.marketRate || [120000, 160000];
    stepContent = `
      <h3 class="wizard-step-title">Deal-breakers & Compensation</h3>
      ${gamBar}
      <div class="form-group">
        <label class="form-label">Target Salary Range: <strong id="sal-display">${formatSalaryRange(salMin, salMax)}</strong> <span class="help-icon" data-tooltip="Set your minimum and maximum acceptable salary. This helps filter out mismatched roles.">?</span></label>
        <div class="dual-slider-container">
          <input type="range" id="sal-min" class="range-slider dual-slider" min="50000" max="300000" step="5000" value="${salMin}"
            oninput="updateSalaryDisplay()">
          <input type="range" id="sal-max" class="range-slider dual-slider" min="50000" max="300000" step="5000" value="${salMax}"
            oninput="updateSalaryDisplay()">
        </div>
        <div class="range-labels"><span>$50k</span><span>$175k</span><span>$300k</span></div>
        ${salWarningLow}${salWarningHigh}
        <div class="validation-msg validation-msg-info" style="margin-top:6px">💡 AI market rate estimate for your skills: ${formatSalaryRange(marketRate[0], marketRate[1])}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Must-have Benefits <span class="help-icon" data-tooltip="Select benefits that are non-negotiable for you. Selecting too many may reduce your match volume.">?</span></label>
        <div class="checklist-grid" id="benefits-list">
          ${BENEFIT_OPTIONS.map(b => {
            const checked = (data.benefits || ['Health Insurance','Remote Work']).includes(b);
            return `<label class="check-item"><input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleBenefit('${b}')"><span>${b}</span></label>`;
          }).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Deal-breakers <span class="help-icon" data-tooltip="Roles matching any deal-breaker will be hidden. Use sparingly to avoid limiting your options.">?</span></label>
        <div class="industry-tags">
          ${DEALBREAKER_OPTIONS.map(d => {
            const sel = (data.dealbreakers || []).includes(d);
            return `<span class="industry-tag ${sel ? 'industry-selected industry-danger' : ''}" onclick="toggleDealbreaker('${d}');showDealBreakerWarning('${d}')">` + d + '</span>';
          }).join('')}
        </div>
        <div id="dealbreaker-warning" class="validation-msg validation-msg-warning" style="margin-top:6px"></div>
      </div>
      <div class="form-group">
        <label class="form-label">What Matters Most? <span class="form-label-hint">Drag to rank</span></label>
        <div class="priority-rank" id="priority-rank">
          ${(data.priorities || PRIORITY_OPTIONS.slice(0,5)).map((p, i) => `
            <div class="priority-item" draggable="true" data-priority="${p}" ondragstart="dragPriority(event)" ondragover="event.preventDefault()" ondrop="dropPriority(event)">
              <span class="priority-rank-num">${i+1}</span>
              <span class="priority-rank-label">${p}</span>
              <span class="priority-drag-handle">⠿</span>
            </div>`).join('')}
        </div>
      </div>`;
  } else if (step === 4) {
    // Review & Validate
    const skills = data.skills || APP.user.skills || [];
    const salary = data.salary || [120000, 180000];
    const celebrate = scoreVal >= 80;
    stepContent = `
      <h3 class="wizard-step-title">Review & Validate Your Profile</h3>
      <div style="text-align:center;margin-bottom:16px">
        ${completenessRing(scoreVal)}
        <p style="font-size:14px;color:var(--text-muted);margin-top:8px">
          ${scoreVal >= 80 ? '🎉 Excellent profile! Ready to find great matches.' : 'Your profile is ' + scoreVal + '% complete — a few more details will boost your matches.'}
        </p>
      </div>
      <div class="review-grid">
        <div class="review-section">
          <div class="review-section-title">Basic Info</div>
          <div class="review-item"><span>Name</span><strong>${data.name || APP.user.name || '—'}</strong></div>
          <div class="review-item"><span>Headline</span><strong>${data.headline || APP.user.title || '—'}</strong></div>
          <div class="review-item"><span>Location</span><strong>${data.location || APP.user.location || '—'}</strong></div>
          <div class="review-item"><span>Availability</span><strong>${data.availability || 'active'}</strong></div>
        </div>
        <div class="review-section">
          <div class="review-section-title">Skills & Preferences</div>
          <div class="review-item"><span>Skills</span><strong>${skills.slice(0,4).join(', ') || '—'}${skills.length > 4 ? ' +' + (skills.length-4) + ' more' : ''}</strong></div>
          <div class="review-item"><span>Experience</span><strong>${data.experience || 3} years</strong></div>
          <div class="review-item"><span>Work Pref</span><strong>${data.workPref || 'Remote'}</strong></div>
          <div class="review-item"><span>Target Salary</span><strong>${formatSalaryRange(salary[0], salary[1])}</strong></div>
        </div>
      </div>
      <div class="validation-results" id="validation-results">
        <div style="font-size:13px;color:var(--text-muted);text-align:center;padding:12px">Validating profile...</div>
      </div>
      ${celebrate ? '<div id="confetti-trigger" style="display:none"></div>' : ''}`;
  }

  const isLastStep = step === 4;
  const isFirstStep = step === 0;

  renderApp(`
    <div class="wizard-container">
      <div class="wizard-card">
        <div class="wizard-header">
          <div class="logo-lockup">
            <div class="logo-mark">AH</div>
            <span style="font-weight:700;color:var(--text-primary)">Set up your profile</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <div class="autosave-indicator" id="autosave-indicator">Auto-saved ✓</div>
            <div class="wizard-step-indicator">Step ${step + 1} of 5</div>
          </div>
        </div>
        ${progressHTML}
        <div class="wizard-body">
          ${stepContent}
        </div>
        <div class="wizard-footer">
          <button class="btn btn-ghost" onclick="wizardBack()" ${isFirstStep ? 'disabled' : ''}>← Back</button>
          <div style="display:flex;gap:8px">
            ${isLastStep ? `<button class="btn btn-ghost" onclick="saveCandidateDraft()">Complete Later</button>` : ''}
            <button class="btn btn-primary" onclick="wizardNext()" id="wizard-next-btn">
              ${isLastStep ? 'Create Profile →' : step === 0 && !(APP.convoPreview) ? 'Skip to Form →' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `);

  // Post-render: start auto-save, trigger validation on review step
  startAutoSave();
  if (step === 4) {
    setTimeout(() => runProfileValidation(), 300);
    const cc = document.getElementById('confetti-trigger');
    if (cc) setTimeout(() => showConfetti(), 500);
  }
}

function completenessRing(pct) {
  const r = 40, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626';
  return `<svg class="completeness-ring" width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="8"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="8"
      stroke-dasharray="${dash} ${circ}" stroke-linecap="round" transform="rotate(-90 50 50)"/>
    <text x="50" y="55" text-anchor="middle" fill="${color}" font-size="18" font-weight="700">${pct}%</text>
  </svg>`;
}

function selectAvailability(val) {
  APP.onboardingData.availability = val;
  document.querySelectorAll('.avail-option').forEach(el => el.classList.remove('avail-selected'));
  document.querySelectorAll('.avail-option').forEach((el, i) => {
    if (['active','open','closed'][i] === val) el.classList.add('avail-selected');
  });
}

function simulateResumeUpload() {
  const zone = document.getElementById('resume-dropzone');
  if (!zone) return;
  zone.innerHTML = `<div class="dropzone-success">✅ resume_jane_smith.pdf uploaded · AI parsing...</div>`;
  setTimeout(() => {
    toast('Resume parsed! Skills auto-populated.', 'success');
    APP.onboardingData.resumeUploaded = true;
  }, 1200);
}

function addSkill(skill) {
  if (!APP.onboardingData.skills) APP.onboardingData.skills = [...(APP.user.skills || [])];
  if (!APP.onboardingData.skills.includes(skill)) {
    APP.onboardingData.skills.push(skill);
    renderCandidateWizard();
  }
}

function removeSkill(skill) {
  if (!APP.onboardingData.skills) APP.onboardingData.skills = [...(APP.user.skills || [])];
  APP.onboardingData.skills = APP.onboardingData.skills.filter(s => s !== skill);
  renderCandidateWizard();
}

function filterSkillSuggestions(val) {
  const container = document.getElementById('skill-suggestions');
  if (!container) return;
  const selected = APP.onboardingData.skills || [];
  const filtered = SKILL_SUGGESTIONS.filter(s => !selected.includes(s) && s.toLowerCase().includes(val.toLowerCase())).slice(0, 12);
  container.innerHTML = filtered.map(s => `<span class="skill-suggestion" onclick="addSkill('${s}')">${s}</span>`).join('');
}

function addSkillOnEnter(e) {
  if (e.key === 'Enter') {
    const val = e.target.value.trim();
    if (val) { addSkill(val); e.target.value = ''; }
    e.preventDefault();
  }
}

function selectWorkPref(pref) {
  APP.onboardingData.workPref = pref;
  document.querySelectorAll('.toggle-btn').forEach((btn, i) => {
    btn.classList.toggle('toggle-active', ['Remote','Hybrid','On-site'][i] === pref);
  });
}

function toggleIndustry(ind) {
  if (!APP.onboardingData.industries) APP.onboardingData.industries = [];
  const idx = APP.onboardingData.industries.indexOf(ind);
  if (idx >= 0) APP.onboardingData.industries.splice(idx, 1);
  else APP.onboardingData.industries.push(ind);
  document.querySelectorAll('.industry-tag').forEach(el => {
    el.classList.toggle('industry-selected', APP.onboardingData.industries.includes(el.textContent));
  });
}

function updateSalaryDisplay() {
  const min = parseInt(document.getElementById('sal-min')?.value || 120000);
  const max = parseInt(document.getElementById('sal-max')?.value || 180000);
  const actualMin = Math.min(min, max);
  const actualMax = Math.max(min, max);
  APP.onboardingData.salary = [actualMin, actualMax];
  const display = document.getElementById('sal-display');
  if (display) display.textContent = formatSalaryRange(actualMin, actualMax);
}

function toggleBenefit(b) {
  if (!APP.onboardingData.benefits) APP.onboardingData.benefits = ['Health Insurance','Remote Work'];
  const idx = APP.onboardingData.benefits.indexOf(b);
  if (idx >= 0) APP.onboardingData.benefits.splice(idx, 1);
  else APP.onboardingData.benefits.push(b);
}

function toggleDealbreaker(d) {
  if (!APP.onboardingData.dealbreakers) APP.onboardingData.dealbreakers = [];
  const idx = APP.onboardingData.dealbreakers.indexOf(d);
  if (idx >= 0) APP.onboardingData.dealbreakers.splice(idx, 1);
  else APP.onboardingData.dealbreakers.push(d);
  document.querySelectorAll('.industry-tag').forEach(el => {
    if (DEALBREAKER_OPTIONS.includes(el.textContent)) {
      el.classList.toggle('industry-selected', APP.onboardingData.dealbreakers.includes(el.textContent));
      el.classList.toggle('industry-danger', APP.onboardingData.dealbreakers.includes(el.textContent));
    }
  });
}

let dragPriorityItem = null;
function dragPriority(e) { dragPriorityItem = e.currentTarget; }
function dropPriority(e) {
  if (!dragPriorityItem || dragPriorityItem === e.currentTarget) return;
  const parent = e.currentTarget.parentNode;
  const items = Array.from(parent.children);
  const fromIdx = items.indexOf(dragPriorityItem);
  const toIdx = items.indexOf(e.currentTarget);
  if (toIdx < fromIdx) parent.insertBefore(dragPriorityItem, e.currentTarget);
  else parent.insertBefore(dragPriorityItem, e.currentTarget.nextSibling);
  // Update rank numbers
  Array.from(parent.children).forEach((el, i) => {
    const rankEl = el.querySelector('.priority-rank-num');
    if (rankEl) rankEl.textContent = i + 1;
  });
  APP.onboardingData.priorities = Array.from(parent.children).map(el => el.dataset.priority);
}

function wizardBack() {
  if (APP.onboardingStep > 0) {
    APP.onboardingStep--;
    renderOnboarding();
  }
}

function wizardNext() {
  const step = APP.onboardingStep;
  // Candidate wizard steps
  if (APP.user && APP.user.role === 'candidate') {
    if (step === 0) {
      // Convo step — just advance
      APP.onboardingStep = 1;
      renderOnboarding();
      return;
    } else if (step === 1) {
      const name = document.getElementById('w-name')?.value.trim();
      const headline = document.getElementById('w-headline')?.value.trim();
      const location = document.getElementById('w-location')?.value.trim();
      const linkedin = document.getElementById('w-linkedin')?.value.trim();
      if (name) { APP.onboardingData.name = name; APP.user.name = name; }
      if (headline) { APP.onboardingData.headline = headline; APP.user.title = headline; }
      if (location) { APP.onboardingData.location = location; APP.user.location = location; }
      if (linkedin) APP.onboardingData.linkedin = linkedin;
    } else if (step === 2) {
      const exp = document.getElementById('exp-slider')?.value;
      if (exp !== undefined) APP.onboardingData.experience = parseInt(exp);
    } else if (step === 3) {
      updateSalaryDisplay();
    } else if (step === 4) {
      // Final — complete profile
      Object.assign(APP.user, {
        skills: APP.onboardingData.skills || APP.user.skills || [],
        availability: APP.onboardingData.availability || 'active',
        salary: APP.onboardingData.salary || [120000, 180000],
        experience: APP.onboardingData.experience || 3,
        workPref: APP.onboardingData.workPref || 'Remote',
      });
      clearInterval(APP.autoSaveInterval);
      toast('🎉 Profile complete! Your agent is now active.', 'success', 4000);
      navigate('dashboard');
      return;
    }
    APP.onboardingStep++;
    renderOnboarding();
    return;
  }
  // Fallback for non-candidate (shouldn't hit this in candidate wizard)
  APP.onboardingStep++;
  renderOnboarding();
}

// ─── Recruiter Wizard ─────────────────────────────────────────
function renderRecruiterWizard() {
  const step = APP.onboardingStep || 0;
  const data = APP.onboardingData || {};

  const progressSteps = [
    { n: 0, label: 'AI Start' },
    { n: 1, label: 'Company' },
    { n: 2, label: 'Job Details' },
    { n: 3, label: 'Review' },
  ];

  const progressHTML = `
    <div class="wizard-progress">
      ${progressSteps.map(s => `
        <div class="wizard-step ${step === s.n ? 'wizard-step-active' : step > s.n ? 'wizard-step-done' : ''}">
          <div class="wizard-step-circle">${step > s.n ? '✓' : s.n + 1}</div>
          <div class="wizard-step-label">${s.label}</div>
        </div>
        ${s.n < 3 ? '<div class="wizard-connector ' + (step > s.n ? 'wizard-connector-done' : '') + '"></div>' : ''}`
      ).join('')}
    </div>`;

  const jobScore = calcJobScore(data);

  let stepContent = '';

  if (step === 0) {
    // AI Quick Start
    const aiPreview = APP.convoPreview;
    const templates = [
      { icon: '💻', label: 'Software Engineer', id: 'swe' },
      { icon: '📈', label: 'Product Manager', id: 'pm' },
      { icon: '🧠', label: 'Data Scientist', id: 'ds' },
      { icon: '⚙️', label: 'DevOps Engineer', id: 'devops' },
      { icon: '🎨', label: 'Designer', id: 'designer' },
      { icon: '🔒', label: 'Security Engineer', id: 'security' },
      { icon: '🤖', label: 'ML Engineer', id: 'ml' },
      { icon: '📊', label: 'SAP Consultant', id: 'sap' },
    ];
    stepContent = `
      <h3 class="wizard-step-title">🌟 What role are you hiring for?</h3>
      <div class="form-group">
        <div style="display:flex;gap:10px;margin-bottom:8px">
          <input type="text" id="ai-job-title" class="form-input" placeholder="e.g. Senior Backend Engineer" style="flex:1"
            value="${data.jobTitle || ''}" onkeydown="if(event.key==='Enter')aiSuggestJob()">
          <button class="btn btn-primary" onclick="aiSuggestJob()">✨ Generate</button>
        </div>
        <p style="font-size:12px;color:var(--text-muted)">Or pick a template to get started instantly:</p>
      </div>
      <div class="template-grid">
        ${templates.map(t => `
          <div class="template-card" onclick="wizApplyJobTemplate('${t.id}','${t.label}')">
            <div class="template-icon">${t.icon}</div>
            <div class="template-label">${t.label}</div>
          </div>`).join('')}
      </div>
      ${aiPreview ? `
        <div class="ai-preview-card">
          <h4>✨ Here's what I've drafted for <em>${data.jobTitle || 'this role'}</em>:</h4>
          <div class="ai-preview-item"><span>Description preview</span><strong>${(aiPreview.description || '').slice(0,80)}...</strong></div>
          <div class="ai-preview-item"><span>Suggested skills</span><strong>${(aiPreview.skills || []).join(', ')}</strong></div>
          <div class="ai-preview-item"><span>Suggested salary</span><strong>${aiPreview.salary ? formatSalaryRange(aiPreview.salary[0], aiPreview.salary[1]) : '—'}</strong></div>
        </div>
        <p style="font-size:13px;color:var(--text-muted)">Click <strong>Continue</strong> to fine-tune these details.</p>
      ` : ''}`;
  } else if (step === 1) {
    // Company Info
    const emailDomain = (APP.user.email || '').split('@')[1] || '';
    const websiteVal = data.website || '';
    const websiteDomain = websiteVal.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
    const domainMatch = emailDomain && websiteDomain && emailDomain === websiteDomain;
    stepContent = `
      <h3 class="wizard-step-title">Your Company Profile</h3>
      <div class="company-logo-upload" onclick="toast('Logo upload coming soon','info')">
        <div class="logo-upload-circle">🏢</div>
        <span>Upload company logo</span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Company Name <span class="help-icon" data-tooltip="The official registered name of your company.">?</span></label>
          <input type="text" id="rw-company" class="form-input" value="${APP.user.company || ''}" placeholder="Acme Corp">
        </div>
        <div class="form-group">
          <label class="form-label">Website <span class="help-icon" data-tooltip="Company website used to verify your employer identity.">?</span></label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="url" id="rw-website" class="form-input" value="${websiteVal}" placeholder="https://acme.com" oninput="checkDomainVerification()" style="flex:1">
            <span id="domain-verify-badge" style="white-space:nowrap;font-size:12px;color:${domainMatch ? '#059669' : 'var(--text-muted)'}">
              ${domainMatch ? '✓ Verified' : 'Unverified'}
            </span>
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Industry</label>
          <select id="rw-industry" class="form-input">
            ${INDUSTRY_OPTIONS.map(i => `<option ${(data.industry || 'Technology') === i ? 'selected' : ''}>${i}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Company Size</label>
          <select id="rw-size" class="form-input">
            ${['1-10','11-50','51-200','201-500','501-1000','1001-5000','5000+'].map(s =>
              `<option ${(data.size || '51-200') === s ? 'selected' : ''}>${s} employees</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Founded Year</label>
          <input type="number" id="rw-founded" class="form-input" value="${data.founded || 2018}" min="1900" max="2026">
        </div>
        <div class="form-group">
          <label class="form-label">HQ Location</label>
          <input type="text" id="rw-hq" class="form-input" value="${data.hq || ''}" placeholder="San Francisco, CA">
        </div>
      </div>`;
  } else if (step === 2) {
    // Job Details — enhanced
    const jobSkills = data.jobSkills || (APP.convoPreview && APP.convoPreview.skills) || [];
    const salary = data.jobSalary || (APP.convoPreview && APP.convoPreview.salary) || [120000, 180000];
    const desc = data.description || (APP.convoPreview && APP.convoPreview.description) || '';
    const descLen = desc.length;
    const descQuality = descLen > 300 ? 'good' : descLen > 100 ? 'ok' : 'short';
    const descQColor = descQuality === 'good' ? '#059669' : descQuality === 'ok' ? '#d97706' : '#dc2626';
    const descQLabel = descQuality === 'good' ? 'Detailed ✓' : descQuality === 'ok' ? 'Could be more detailed' : 'Too short';
    stepContent = `
      <h3 class="wizard-step-title">Job Details</h3>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
        <div>
          <div class="pcr-label" style="margin-bottom:4px">Job Quality Score</div>
          ${completenessRing(jobScore)}
        </div>
        <div style="flex:1">
          <div class="gamification-bar">
            <div class="gamification-label"><span class="gamification-percent">${jobScore}%</span><span class="gamification-msg">${jobScore >= 80 ? 'Excellent posting! 🎉' : jobScore >= 60 ? 'Getting there...' : 'Add more details'}</span></div>
            <div class="gamification-progress"><div class="gamification-fill" style="width:${jobScore}%"></div></div>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Job Title <span class="help-icon" data-tooltip="Use a realistic, searchable title. Avoid internal jargon.">?</span></label>
        <input type="text" id="rw-title" class="form-input" value="${data.jobTitle || ''}" placeholder="Senior Backend Engineer" oninput="validateFieldInline('rw-title','jobtitle')">
        <div class="validation-msg" id="val-rw-title"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Job Description <span style="font-size:11px;color:${descQColor}">${descQLabel}</span></label>
        <textarea id="rw-desc" class="form-input form-textarea" rows="5" oninput="updateJobDescCount(this)">${desc}</textarea>
        <div style="font-size:11px;color:var(--text-muted);text-align:right;margin-top:3px"><span id="desc-count">${descLen}</span> chars</div>
      </div>
      <div class="form-group">
        <label class="form-label">Required Skills <span class="help-icon" data-tooltip="List the skills candidates must have. These drive match scoring.">?</span></label>
        <div class="skill-tag-input">
          <div class="skill-tags-selected" id="job-skill-tags">
            ${jobSkills.map(s => `<span class="skill-tag skill-tag-added">${s}<button onclick="wizRemoveJobSkill('${s}')">×</button></span>`).join('')}
            <input type="text" id="job-skill-input" class="skill-input" placeholder="Add a required skill..." oninput="wizFilterJobSkillSuggestions(this.value)" onkeydown="wizAddJobSkillOnEnter(event)">
          </div>
          <div class="skill-suggestions" id="job-skill-suggestions">
            ${SKILL_SUGGESTIONS.filter(s => !jobSkills.includes(s)).slice(0,12).map(s =>
              `<span class="skill-suggestion" onclick="wizAddJobSkill('${s}')">${s}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Salary Range (Required) <span class="help-icon" data-tooltip="Mandatory. No 'competitive salary' allowed — specify an actual range for transparency.">?</span> <span style="font-size:11px;background:rgba(220,38,38,0.15);color:#f87171;padding:2px 6px;border-radius:4px">Required</span></label>
        <div style="font-weight:600;margin-bottom:6px" id="job-sal-display">${formatSalaryRange(salary[0], salary[1])}</div>
        <div class="dual-slider-container">
          <input type="range" id="job-sal-min" class="range-slider dual-slider" min="50000" max="400000" step="5000" value="${salary[0]}" oninput="wizUpdateJobSalaryDisplay()">
          <input type="range" id="job-sal-max" class="range-slider dual-slider" min="50000" max="400000" step="5000" value="${salary[1]}" oninput="wizUpdateJobSalaryDisplay()">
        </div>
        <div class="range-labels"><span>$50k</span><span>$225k</span><span>$400k</span></div>
        <div class="validation-msg validation-msg-info" id="job-sal-market" style="margin-top:6px">💡 Market rate for this role: fetching...</div>
      </div>`;
  } else if (step === 3) {
    // Review & Validate
    const skills = data.jobSkills || [];
    const salary = data.jobSalary || [120000, 180000];
    stepContent = `
      <h3 class="wizard-step-title">Review & Validate Job Posting</h3>
      <div style="text-align:center;margin-bottom:16px">
        ${completenessRing(jobScore)}
        <p style="font-size:14px;color:var(--text-muted);margin-top:8px">
          ${jobScore >= 80 ? '🎉 Great posting! Ready to publish.' : 'Job posting is ' + jobScore + '% complete — improve it to attract better candidates.'}
        </p>
      </div>
      <div class="review-grid">
        <div class="review-section">
          <div class="review-section-title">Company</div>
          <div class="review-item"><span>Company</span><strong>${data.company || APP.user.company || '—'}</strong></div>
          <div class="review-item"><span>Website</span><strong>${data.website || '—'}</strong></div>
          <div class="review-item"><span>Industry</span><strong>${data.industry || '—'}</strong></div>
          <div class="review-item"><span>Size</span><strong>${data.size || '—'}</strong></div>
        </div>
        <div class="review-section">
          <div class="review-section-title">Job Details</div>
          <div class="review-item"><span>Title</span><strong>${data.jobTitle || '—'}</strong></div>
          <div class="review-item"><span>Skills</span><strong>${skills.slice(0,3).join(', ') || '—'}${skills.length > 3 ? ' +' + (skills.length-3) + ' more' : ''}</strong></div>
          <div class="review-item"><span>Salary</span><strong>${formatSalaryRange(salary[0], salary[1])}</strong></div>
          <div class="review-item"><span>Description</span><strong>${(data.description || '').length} chars</strong></div>
        </div>
      </div>
      <div class="validation-results" id="job-validation-results">
        <div style="font-size:13px;color:var(--text-muted);text-align:center;padding:12px">Validating job posting...</div>
      </div>`;
  }

  const isFirstStep = step === 0;
  const isLastStep = step === 3;

  renderApp(`
    <div class="wizard-container">
      <div class="wizard-card">
        <div class="wizard-header">
          <div class="logo-lockup">
            <div class="logo-mark">AH</div>
            <span style="font-weight:700;color:var(--text-primary)">Set up your hiring profile</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <div class="autosave-indicator" id="autosave-indicator">Auto-saved ✓</div>
            <div class="wizard-step-indicator">Step ${step + 1} of 4</div>
          </div>
        </div>
        ${progressHTML}
        <div class="wizard-body">
          ${stepContent}
        </div>
        <div class="wizard-footer">
          <button class="btn btn-ghost" onclick="wizardBack()" ${isFirstStep ? 'disabled' : ''}>← Back</button>
          <div style="display:flex;gap:8px">
            ${isLastStep ? `<button class="btn btn-ghost" onclick="saveJobDraft()">Save as Draft</button>` : ''}
            <button class="btn btn-primary" onclick="recruiterWizardNext()">
              ${isLastStep ? 'Publish Job →' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `);

  startAutoSave();
  if (step === 3) {
    setTimeout(() => runJobValidation(), 300);
  }
  if (step === 2) {
    setTimeout(() => fetchJobMarketRate(), 400);
  }
}

function toggleCultureTag(tag) {
  if (!APP.onboardingData.cultureTags) APP.onboardingData.cultureTags = ['Innovation','Collaboration'];
  const idx = APP.onboardingData.cultureTags.indexOf(tag);
  if (idx >= 0) APP.onboardingData.cultureTags.splice(idx, 1);
  else APP.onboardingData.cultureTags.push(tag);
  document.querySelectorAll('#culture-tags .industry-tag').forEach(el => {
    el.classList.toggle('industry-selected', APP.onboardingData.cultureTags.includes(el.textContent));
  });
}

function selectWorkModel(val) {
  APP.onboardingData.workModel = val;
  document.querySelectorAll('.toggle-group .toggle-btn').forEach((btn, i) => {
    btn.classList.toggle('toggle-active', ['Remote-first','Hybrid','On-site'][i] === val);
  });
}

function toggleTechStack(tag) {
  if (!APP.onboardingData.techStack) APP.onboardingData.techStack = [];
  const idx = APP.onboardingData.techStack.indexOf(tag);
  if (idx >= 0) APP.onboardingData.techStack.splice(idx, 1);
  else APP.onboardingData.techStack.push(tag);
  document.querySelectorAll('#tech-stack-suggestions .skill-suggestion').forEach(el => {
    el.classList.toggle('skill-suggestion-selected', APP.onboardingData.techStack.includes(el.textContent));
  });
}

function selectApproach(val) {
  APP.onboardingData.approach = val;
  document.querySelectorAll('.approach-card').forEach((el, i) => {
    el.classList.toggle('approach-selected', ['quality','balanced','fast'][i] === val);
  });
}

function selectDEI(val) {
  APP.onboardingData.dei = val;
}

function selectResponseTime(val) {
  APP.onboardingData.responseTime = val;
}

function recruiterWizardNext() {
  const step = APP.onboardingStep;
  if (step === 0) {
    // AI Quick Start — just advance
    APP.onboardingStep = 1;
    renderOnboarding();
    return;
  } else if (step === 1) {
    const company = document.getElementById('rw-company')?.value.trim();
    if (company) { APP.onboardingData.company = company; APP.user.company = company; }
    APP.onboardingData.website = document.getElementById('rw-website')?.value.trim();
    APP.onboardingData.industry = document.getElementById('rw-industry')?.value;
    APP.onboardingData.size = document.getElementById('rw-size')?.value;
    APP.onboardingData.hq = document.getElementById('rw-hq')?.value.trim();
  } else if (step === 2) {
    APP.onboardingData.description = document.getElementById('rw-desc')?.value;
    APP.onboardingData.jobTitle = document.getElementById('rw-title')?.value.trim();
    wizUpdateJobSalaryDisplay();
  } else if (step === 3) {
    Object.assign(APP.user, APP.onboardingData);
    clearInterval(APP.autoSaveInterval);
    toast('🎉 Company profile complete! Ready to find great candidates.', 'success', 4000);
    navigate('dashboard');
    return;
  }
  APP.onboardingStep++;
  renderOnboarding();
}

// ============================================================
// PART 3.5: AI-Assisted Wizard Helpers
// ============================================================

// ─── AI Chat Bubble ─────────────────────────────────────────
function renderAIChatBubble() {
  if (!APP.user) return '';
  return `
    <div class="ai-chat-bubble ${APP.chatOpen ? 'chat-open' : ''}" id="ai-chat-bubble">
      <button class="chat-toggle" onclick="toggleAIChat()">
        ${APP.chatOpen ? '✕' : '🤖'}
      </button>
      ${APP.chatOpen ? `
        <div class="chat-panel">
          <div class="chat-header">
            <span>AI Assistant</span>
            <span class="chat-context">${getAIChatContext()}</span>
          </div>
          <div class="chat-messages" id="chat-messages">
            ${(APP.chatMessages.length === 0) ? `
              <div class="chat-msg chat-msg-ai">
                <div class="chat-msg-avatar">🤖</div>
                <div class="chat-msg-text">Hi! I'm your AI assistant. Ask me anything about your profile, job matches, or how to improve your score.</div>
              </div>` : ''}
            ${APP.chatMessages.map(m => `
              <div class="chat-msg chat-msg-${m.role}">
                <div class="chat-msg-avatar">${m.role === 'ai' ? '🤖' : avatar(APP.user.avatar || 'ME', '#0d9488', 24)}</div>
                <div class="chat-msg-text">${m.text}</div>
              </div>
            `).join('')}
          </div>
          <div class="chat-input-row">
            <input type="text" id="chat-input" class="chat-input" placeholder="Ask me anything..." onkeydown="if(event.key==='Enter')sendAIChat()">
            <button class="chat-send-btn" onclick="sendAIChat()">→</button>
          </div>
        </div>
      ` : ''}
    </div>`;
}

function toggleAIChat() {
  APP.chatOpen = !APP.chatOpen;
  // Re-render just the chat bubble without full page re-render
  const existing = document.getElementById('ai-chat-bubble');
  if (existing) {
    const temp = document.createElement('div');
    temp.innerHTML = renderAIChatBubble();
    const newBubble = temp.firstElementChild;
    if (newBubble) existing.replaceWith(newBubble);
  }
}

function getAIChatContext() {
  const route = APP.route || '';
  if (route.includes('onboarding') || route.includes('wizard')) return 'Profile Setup';
  if (route === 'dashboard') return 'Dashboard';
  if (route === 'matches' || route.startsWith('match/')) return 'Matches';
  if (route === 'persona') return 'My Profile';
  if (route === 'jobs' || route.startsWith('job/')) return 'Jobs';
  return 'General';
}

async function sendAIChat() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const question = input.value.trim();
  if (!question) return;
  input.value = '';

  APP.chatMessages.push({ role: 'user', text: question });

  // Show user message immediately
  const messagesEl = document.getElementById('chat-messages');
  if (messagesEl) {
    messagesEl.innerHTML += `
      <div class="chat-msg chat-msg-user">
        <div class="chat-msg-avatar">${avatar(APP.user.avatar || 'ME', '#0d9488', 24)}</div>
        <div class="chat-msg-text">${question}</div>
      </div>
      <div class="chat-msg chat-msg-ai" id="chat-typing">
        <div class="chat-msg-avatar">🤖</div>
        <div class="chat-msg-text" style="color:var(--text-muted)">Thinking...</div>
      </div>`;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  try {
    const ctx = getAIChatContext();
    const res = await api('ai-chat-assist', 'POST', { question, context: ctx });
    const answer = res.answer || 'I can help with that! Based on your profile, here are my recommendations...';
    APP.chatMessages.push({ role: 'ai', text: answer });

    const typing = document.getElementById('chat-typing');
    if (typing) {
      typing.querySelector('.chat-msg-text').textContent = answer;
      typing.removeAttribute('id');
    }
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  } catch(e) {
    const typing = document.getElementById('chat-typing');
    if (typing) typing.querySelector('.chat-msg-text').textContent = 'Sorry, I had trouble responding. Try again!';
  }
}

// ─── Convo Input Processing ──────────────────────────────────
async function processConvoInput() {
  const input = document.getElementById('convo-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  // Add user message
  APP.convoMessages.push({ role: 'user', text });

  // Client-side extraction
  const expMatch = text.match(/(\d+)\s*(?:years?|yrs?)/i);
  const experience = expMatch ? parseInt(expMatch[1]) : null;
  const extractedSkills = SKILL_SUGGESTIONS.filter(s => text.toLowerCase().includes(s.toLowerCase()));
  const headlineGuess = text.split('.')[0].slice(0, 80);

  // Show AI is thinking
  APP.convoMessages.push({ role: 'ai', text: 'Analyzing what you told me...' });
  renderCandidateWizard();

  try {
    const res = await api('ai-suggest-profile', 'POST', { text });
    const skills = [...new Set([...extractedSkills, ...(res.skills || [])])].slice(0, 8);
    const preview = {
      headline: res.headline || headlineGuess,
      experience: res.experience || experience || 3,
      skills,
    };
    APP.convoPreview = preview;
    APP.lastAISuggest = res;
    // Auto-fill onboarding data
    if (skills.length) APP.onboardingData.skills = skills;
    if (preview.experience) APP.onboardingData.experience = preview.experience;
    if (preview.headline) { APP.onboardingData.headline = preview.headline; APP.user.title = preview.headline; }

    // Replace thinking message
    APP.convoMessages[APP.convoMessages.length - 1] = {
      role: 'ai',
      text: `Got it! I've extracted ${skills.length} skills and ${preview.experience} years of experience from what you shared. Review the summary below — click Continue to proceed.`
    };
  } catch(e) {
    APP.convoMessages[APP.convoMessages.length - 1] = {
      role: 'ai',
      text: `Thanks! I've noted that. Click Continue to fill in your profile details.`
    };
  }
  renderCandidateWizard();
}

// ─── AI Job Suggest ──────────────────────────────────────
async function aiSuggestJob() {
  const titleEl = document.getElementById('ai-job-title');
  if (!titleEl) return;
  const title = titleEl.value.trim();
  if (!title) { toast('Enter a job title first', 'warning'); return; }
  APP.onboardingData.jobTitle = title;
  toast('Generating job details...', 'info', 1500);
  try {
    const res = await api('ai-suggest-job', 'POST', { title });
    APP.convoPreview = res;
    if (res.skills) APP.onboardingData.jobSkills = res.skills;
    if (res.salary) APP.onboardingData.jobSalary = res.salary;
    if (res.description) APP.onboardingData.description = res.description;
  } catch(e) { /* mock handles it */ }
  renderRecruiterWizard();
}

async function wizApplyJobTemplate(id, label) {
  APP.onboardingData.jobTitle = label;
  toast(`Loading ${label} template...`, 'info', 1200);
  try {
    const res = await api('ai-suggest-job', 'POST', { title: label });
    APP.convoPreview = res;
    if (res.skills) APP.onboardingData.jobSkills = res.skills;
    if (res.salary) APP.onboardingData.jobSalary = res.salary;
    if (res.description) APP.onboardingData.description = res.description;
  } catch(e) { /* mock */ }
  renderRecruiterWizard();
}

// ─── Auto-save ─────────────────────────────────────────────
function startAutoSave() {
  clearInterval(APP.autoSaveInterval);
  APP.autoSaveInterval = setInterval(() => {
    if (APP.onboardingData && Object.keys(APP.onboardingData).length > 0) {
      const draftType = APP.user?.role === 'recruiter' ? 'job_posting' : 'candidate_profile';
      api('draft', 'POST', { type: draftType, data: APP.onboardingData }).catch(() => {});
      showAutoSaveIndicator();
    }
  }, 30000);
}

function showAutoSaveIndicator() {
  const el = document.getElementById('autosave-indicator');
  if (!el) return;
  el.classList.add('autosave-visible');
  setTimeout(() => el.classList.remove('autosave-visible'), 2500);
}

function saveCandidateDraft() {
  api('draft', 'POST', { type: 'candidate_profile', data: APP.onboardingData }).catch(() => {});
  toast('Draft saved! You can complete your profile later.', 'info');
  navigate('dashboard');
}

function saveJobDraft() {
  api('draft', 'POST', { type: 'job_posting', data: APP.onboardingData }).catch(() => {});
  toast('Job posting saved as draft.', 'info');
  navigate('jobs');
}

// ─── Gamification Bar ───────────────────────────────────────
function calcProfileScore(data) {
  let score = 0;
  if (data.name || (APP.user && APP.user.name)) score += 15;
  if (data.headline || (APP.user && APP.user.title)) score += 15;
  if (data.location || (APP.user && APP.user.location)) score += 10;
  const skills = data.skills || (APP.user && APP.user.skills) || [];
  score += Math.min(skills.length * 5, 30);
  if (data.experience) score += 10;
  if (data.availability) score += 5;
  if (data.salary && data.salary[0] > 0) score += 5;
  if (data.linkedin) score += 10;
  return Math.min(score, 100);
}

function calcJobScore(data) {
  let score = 0;
  if (data.jobTitle) score += 20;
  if (data.description && data.description.length > 100) score += 25;
  const skills = data.jobSkills || [];
  score += Math.min(skills.length * 5, 25);
  if (data.jobSalary) score += 15;
  if (data.company || (APP.user && APP.user.company)) score += 10;
  if (data.website) score += 5;
  return Math.min(score, 100);
}

function renderGamificationBar(pct) {
  let msg = 'Just getting started!';
  if (pct >= 100) msg = 'Profile Champion! 🏆';
  else if (pct >= 80) msg = 'Almost perfect! 🎉';
  else if (pct >= 60) msg = 'Getting there...';
  else if (pct >= 25) msg = 'Nice start!';
  return `
    <div class="gamification-bar">
      <div class="gamification-label">
        <span class="gamification-percent">${pct}%</span>
        <span class="gamification-msg">${msg}</span>
      </div>
      <div class="gamification-progress">
        <div class="gamification-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
}

// ─── Confetti ─────────────────────────────────────────────────
function showConfetti() {
  const colors = ['#0d9488','#7c3aed','#d97706','#2563eb','#dc2626','#059669'];
  const burst = document.createElement('div');
  burst.className = 'confetti-burst';
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-particle';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay: ${Math.random() * 0.5}s;
      animation-duration: ${1.5 + Math.random()}s;
      width: ${6 + Math.random() * 6}px;
      height: ${6 + Math.random() * 6}px;
    `;
    burst.appendChild(p);
  }
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 3000);
}

// ─── Profile Validation ─────────────────────────────────────
async function runProfileValidation() {
  const data = APP.onboardingData || {};
  const el = document.getElementById('validation-results');
  if (!el) return;
  try {
    const [valRes, dupRes] = await Promise.all([
      api('validate-record', 'POST', { type: 'candidate', data }),
      api('check-duplicate', 'POST', { type: 'candidate', email: APP.user?.email, name: data.name, skills: data.skills }),
    ]);
    const errors = valRes.errors || [];
    const warnings = valRes.warnings || [];
    const suggestions = valRes.suggestions || [];
    if (dupRes.duplicate) errors.push({ msg: 'A profile with this email already exists' });

    let html = '<div class="validation-results">';
    errors.forEach(e => html += `<div class="validation-result-item validation-error">✕ ${e.msg}</div>`);
    warnings.forEach(w => html += `<div class="validation-result-item validation-warning">⚠ ${w.msg}</div>`);
    suggestions.forEach(s => html += `<div class="validation-result-item validation-suggestion">💡 ${s.msg}</div>`);
    if (errors.length === 0 && warnings.length === 0) {
      html += `<div class="validation-result-item" style="background:rgba(5,150,105,0.1);color:#6ee7b7">✓ All checks passed! Ready to create your profile.</div>`;
    }
    html += '</div>';
    el.innerHTML = html;

    const btn = document.getElementById('wizard-next-btn');
    if (btn) btn.disabled = errors.length > 0;
  } catch(e) {
    el.innerHTML = '<div class="validation-result-item validation-suggestion">💡 Validation service unavailable — you can still proceed.</div>';
  }
}

async function runJobValidation() {
  const data = APP.onboardingData || {};
  const el = document.getElementById('job-validation-results');
  if (!el) return;
  try {
    const [valRes, dupRes] = await Promise.all([
      api('validate-record', 'POST', { type: 'job', data }),
      api('check-duplicate', 'POST', { type: 'job', title: data.jobTitle, company: data.company }),
    ]);
    const errors = valRes.errors || [];
    const warnings = valRes.warnings || [];
    const suggestions = valRes.suggestions || [];
    if (dupRes.duplicate) warnings.push({ msg: 'A similar job posting already exists from your company' });

    let html = '<div class="validation-results">';
    errors.forEach(e => html += `<div class="validation-result-item validation-error">✕ ${e.msg}</div>`);
    warnings.forEach(w => html += `<div class="validation-result-item validation-warning">⚠ ${w.msg}</div>`);
    suggestions.forEach(s => html += `<div class="validation-result-item validation-suggestion">💡 ${s.msg}</div>`);
    if (errors.length === 0 && warnings.length === 0) {
      html += `<div class="validation-result-item" style="background:rgba(5,150,105,0.1);color:#6ee7b7">✓ Job posting looks great! Ready to publish.</div>`;
    }
    html += '</div>';
    el.innerHTML = html;
  } catch(e) {
    el.innerHTML = '<div class="validation-result-item validation-suggestion">💡 Validation unavailable — you can still publish.</div>';
  }
}

// ─── Related Skills ───────────────────────────────────────────
let relatedSkillsTimer = null;
async function fetchRelatedSkills(skillInput) {
  if (!skillInput || skillInput.length < 2) {
    const panel = document.getElementById('related-skills-panel');
    if (panel) panel.innerHTML = '';
    return;
  }
  clearTimeout(relatedSkillsTimer);
  relatedSkillsTimer = setTimeout(async () => {
    const panel = document.getElementById('related-skills-panel');
    if (!panel) return;
    try {
      const res = await api(`skill-taxonomy?q=${encodeURIComponent(skillInput)}`, 'GET');
      const related = (res.related || []).filter(s => !(APP.onboardingData.skills || []).includes(s));
      if (related.length === 0) { panel.innerHTML = ''; return; }
      panel.innerHTML = `
        <div class="related-skills-panel">
          <div class="related-skills-header">✨ Related skills you might have:</div>
          <div class="related-skills-list">
            ${related.map(s => `<span class="skill-suggestion" onclick="addSkill('${s}')">${s}</span>`).join('')}
          </div>
        </div>`;
    } catch(e) {
      // Silently fail
    }
  }, 400);
}

// ─── Job Skills (Recruiter) ──────────────────────────────────
function wizAddJobSkill(skill) {
  if (!APP.onboardingData.jobSkills) APP.onboardingData.jobSkills = [];
  if (!APP.onboardingData.jobSkills.includes(skill)) {
    APP.onboardingData.jobSkills.push(skill);
    renderRecruiterWizard();
  }
}

function wizRemoveJobSkill(skill) {
  if (!APP.onboardingData.jobSkills) return;
  APP.onboardingData.jobSkills = APP.onboardingData.jobSkills.filter(s => s !== skill);
  renderRecruiterWizard();
}

function wizFilterJobSkillSuggestions(val) {
  const container = document.getElementById('job-skill-suggestions');
  if (!container) return;
  const selected = APP.onboardingData.jobSkills || [];
  const filtered = SKILL_SUGGESTIONS.filter(s => !selected.includes(s) && s.toLowerCase().includes(val.toLowerCase())).slice(0, 12);
  container.innerHTML = filtered.map(s => `<span class="skill-suggestion" onclick="wizAddJobSkill('${s}')">${s}</span>`).join('');
}

function wizAddJobSkillOnEnter(e) {
  if (e.key === 'Enter') {
    const val = e.target.value.trim();
    if (val) { wizAddJobSkill(val); e.target.value = ''; }
    e.preventDefault();
  }
}

function wizUpdateJobSalaryDisplay() {
  const min = parseInt(document.getElementById('job-sal-min')?.value || 120000);
  const max = parseInt(document.getElementById('job-sal-max')?.value || 180000);
  const actualMin = Math.min(min, max);
  const actualMax = Math.max(min, max);
  APP.onboardingData.jobSalary = [actualMin, actualMax];
  const display = document.getElementById('job-sal-display');
  if (display) display.textContent = formatSalaryRange(actualMin, actualMax);
}

function updateJobDescCount(textarea) {
  const counter = document.getElementById('desc-count');
  if (counter) counter.textContent = textarea.value.length;
  APP.onboardingData.description = textarea.value;
}

async function fetchJobMarketRate() {
  const el = document.getElementById('job-sal-market');
  if (!el) return;
  try {
    const res = await api('ai-suggest-job', 'POST', { title: APP.onboardingData.jobTitle || '' });
    if (res.salary) {
      const diff = APP.onboardingData.jobSalary ? APP.onboardingData.jobSalary[0] - res.salary[0] : 0;
      const diffPct = Math.round((diff / res.salary[0]) * 100);
      const aboveBelowText = diffPct > 0 ? `${Math.abs(diffPct)}% above` : diffPct < 0 ? `${Math.abs(diffPct)}% below` : 'at';
      el.textContent = `💡 Market rate: ${formatSalaryRange(res.salary[0], res.salary[1])} — Your range is ${aboveBelowText} market average`;
    }
  } catch(e) {
    el.textContent = '💡 Market rate data unavailable';
  }
}

// ─── Field Inline Validation ─────────────────────────────────
function validateFieldInline(fieldId, type) {
  const input = document.getElementById(fieldId);
  const msgEl = document.getElementById('val-' + fieldId);
  if (!input || !msgEl) return;
  const val = input.value.trim();
  if (type === 'name') {
    if (val.length < 2) {
      msgEl.className = 'validation-msg validation-msg-error';
      msgEl.textContent = 'Name must be at least 2 characters';
    } else {
      msgEl.className = 'validation-msg validation-msg-success';
      msgEl.textContent = '✓ Looks good';
    }
  } else if (type === 'headline') {
    if (val.length < 3) {
      msgEl.className = 'validation-msg validation-msg-warning';
      msgEl.textContent = 'Add a professional headline';
    } else if (val.length > 80) {
      msgEl.className = 'validation-msg validation-msg-warning';
      msgEl.textContent = 'Keep under 80 characters for best display';
    } else {
      msgEl.className = 'validation-msg validation-msg-success';
      msgEl.textContent = '✓ Great headline';
    }
  } else if (type === 'jobtitle') {
    if (val.length < 3) {
      msgEl.className = 'validation-msg validation-msg-error';
      msgEl.textContent = 'Job title must be at least 3 characters';
    } else {
      msgEl.className = 'validation-msg validation-msg-success';
      msgEl.textContent = '✓ Looks realistic';
    }
  }
}

// ─── LinkedIn Import ────────────────────────────────────────
async function importFromLinkedIn() {
  const urlEl = document.getElementById('w-linkedin');
  if (!urlEl || !urlEl.value.trim()) { toast('Enter a LinkedIn URL first', 'warning'); return; }
  toast('Importing from LinkedIn...', 'info', 1500);
  try {
    const res = await api('parse-resume', 'POST', { url: urlEl.value.trim() });
    if (res.name) { const nameEl = document.getElementById('w-name'); if (nameEl) nameEl.value = res.name; APP.onboardingData.name = res.name; }
    if (res.headline) { const hEl = document.getElementById('w-headline'); if (hEl) hEl.value = res.headline; APP.onboardingData.headline = res.headline; }
    if (res.location) { const lEl = document.getElementById('w-location'); if (lEl) lEl.value = res.location; APP.onboardingData.location = res.location; }
    if (res.skills) { APP.onboardingData.skills = res.skills; }
    toast('LinkedIn profile imported!', 'success');
  } catch(e) {
    toast('Could not import — please fill in manually', 'error');
  }
}

// ─── Resume Paste Parse ───────────────────────────────────
let resumeParseTimer = null;
function scheduleResumeParse() {
  clearTimeout(resumeParseTimer);
  const statusEl = document.getElementById('resume-parse-status');
  if (statusEl) statusEl.textContent = 'Typing...';
  resumeParseTimer = setTimeout(async () => {
    const textEl = document.getElementById('resume-paste');
    if (!textEl || textEl.value.trim().length < 50) {
      if (statusEl) statusEl.textContent = '';
      return;
    }
    if (statusEl) statusEl.textContent = 'Parsing resume...';
    try {
      const res = await api('parse-resume', 'POST', { text: textEl.value });
      if (res.name) { const el = document.getElementById('w-name'); if (el) el.value = res.name; APP.onboardingData.name = res.name; }
      if (res.headline) { const el = document.getElementById('w-headline'); if (el) el.value = res.headline; }
      if (res.location) { const el = document.getElementById('w-location'); if (el) el.value = res.location; }
      if (res.skills) APP.onboardingData.skills = res.skills;
      if (res.experience) APP.onboardingData.experience = res.experience;
      if (statusEl) statusEl.textContent = '✓ Resume parsed! Fields auto-filled.';
    } catch(e) {
      if (statusEl) statusEl.textContent = 'Parse failed — fill in manually.';
    }
  }, 1200);
}

// ─── Deal-breaker Warnings ──────────────────────────────────
function showDealBreakerWarning(breaker) {
  const el = document.getElementById('dealbreaker-warning');
  if (!el) return;
  const impact = {
    'No Startups': '40%',
    'No Travel': '25%',
    'No Relocation': '35%',
    'No Equity-only': '15%',
  };
  const pct = impact[breaker];
  const active = (APP.onboardingData.dealbreakers || []).includes(breaker);
  if (active && pct) {
    el.textContent = `⚠ Setting "${breaker}" will exclude approximately ${pct} of potential matches`;
  } else {
    el.textContent = '';
  }
}

// ─── Domain Verification ───────────────────────────────────
function checkDomainVerification() {
  const websiteEl = document.getElementById('rw-website');
  const badge = document.getElementById('domain-verify-badge');
  if (!websiteEl || !badge) return;
  const emailDomain = (APP.user?.email || '').split('@')[1] || '';
  const websiteUrl = websiteEl.value.trim();
  const websiteDomain = websiteUrl.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
  if (emailDomain && websiteDomain && emailDomain === websiteDomain) {
    badge.textContent = '✓ Verified Company';
    badge.style.color = '#059669';
  } else {
    badge.textContent = 'Unverified';
    badge.style.color = 'var(--text-muted)';
  }
}

// ============================================================
