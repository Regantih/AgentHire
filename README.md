# AgentHire — AI-Powered Hiring Platform

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-blue.svg)](https://github.com/Regantih/AgentHire)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

**AgentHire** deploys intelligent AI agents that deeply understand both sides of hiring. They negotiate, evaluate, and match — so humans only talk when there's real mutual fit.

> Privacy-first. Consent-driven. Agent-powered.

---

## Key Features

- **Agent-to-Agent Matching** — AI agents review hundreds of profiles, negotiate fit across 5 dimensions, and surface only top matches
- **Multi-Dimensional Scoring** — Skills, experience, salary, culture fit, and work preferences evaluated simultaneously
- **Privacy First** — Full profiles only revealed when both sides express mutual interest
- **Mutual Consent** — No cold outreach; both sides must opt-in before any human conversation
- **Dual Dashboards** — Separate candidate and recruiter experiences with role-specific features
- **Job Posting & Management** — Recruiters can post jobs with detailed requirements, salary ranges, and preferences
- **AI Agent Personality** — Customize your agent's negotiation style (Curious, Analytical, Direct, etc.)
- **Real-Time Notifications** — Cross-account notifications when matches and interest are expressed

---

## How It Works

1. **Build Your Persona** — Create a rich profile with skills, preferences, and deal-breakers
2. **Agents Explore** — Your AI agent scans the marketplace, analyzing compatibility in real-time
3. **Agents Negotiate** — Both agents engage in structured conversation to evaluate fit
4. **Humans Connect** — Only when both agents recommend proceeding do the humans get introduced

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Python (CGI) |
| Database | SQLite |
| AI Scoring | Multi-dimensional matching algorithm with seeded deterministic scoring |
| Auth | Session-based with demo account support |

---

## Getting Started

### Prerequisites

- Python 3.8+
- A modern web browser

### Installation

```bash
# Clone the repository
git clone https://github.com/Regantih/AgentHire.git
cd AgentHire

# Start the application
python -m http.server 8000
# Or use the CGI server
python cgi-bin/api.py
```

### Demo Accounts

You can test with pre-built demo accounts (password: `demo123`):

**Candidates:**
- sarah.chen@demo.com — Sr. Full-Stack Engineer
- james.wright@demo.com — ML/AI Engineer
- raj.patel@demo.com — SAP S/4HANA Architect

**Recruiters:**
- hr@technovate.demo.com — TechNovate Inc.
- talent@globalcorp.demo.com — GlobalCorp Consulting

---

## Project Structure

```
AgentHire/
├── index.html          # Main SPA (Single Page Application)
├── cgi-bin/
│   └── api.py          # Python backend API
├── LICENSE             # MIT License
├── README.md           # This file
└── CONTRIBUTING.md     # Contribution guidelines
```

---

## Roadmap & Community Enhancement Opportunities

We welcome contributions! Here are areas where the community can help:

### High Priority
- [ ] **Real Backend Migration** — Move from CGI to FastAPI/Flask with PostgreSQL
- [ ] **OAuth/SSO Integration** — Google, LinkedIn, GitHub sign-in
- [ ] **Mobile Responsive Design** — Full mobile/tablet support
- [ ] **Real AI/LLM Integration** — Connect to OpenAI/Anthropic for actual agent conversations

### Medium Priority
- [ ] **Email Notifications** — Real email delivery for match notifications
- [ ] **Resume/CV Upload** — Parse resumes to auto-populate candidate profiles
- [ ] **Analytics Dashboard** — Hiring funnel metrics and insights
- [ ] **Accessibility (a11y)** — Full WCAG 2.1 compliance
- [ ] **Internationalization (i18n)** — Multi-language support

### Nice to Have
- [ ] **Chrome Extension** — Import LinkedIn profiles directly
- [ ] **Slack/Teams Integration** — Match notifications in team channels
- [ ] **API Documentation** — OpenAPI/Swagger spec
- [ ] **Docker Support** — One-command deployment
- [ ] **CI/CD Pipeline** — Automated testing and deployment

---

## Contributing

We love contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built with [Perplexity Computer](https://www.perplexity.ai/hub/use-cases)
- Inspired by the need for more humane, privacy-respecting hiring practices
- Special thanks to the open-source community

---

**Made with ❤️ by [Regantih](https://github.com/Regantih)**
