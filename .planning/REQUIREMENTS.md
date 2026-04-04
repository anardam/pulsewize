# Requirements: InstaAnalyse

**Defined:** 2026-03-31
**Core Value:** AI-powered social media analysis that gives creators and businesses actionable growth strategies

## v1 Requirements

### Infrastructure

- [x] **INFRA-01**: Upgrade Next.js to latest version (16.x) and update all npm packages to latest
- [x] **INFRA-02**: Supabase project setup with PostgreSQL database schema for users, reports, subscriptions, and usage tracking
- [x] **INFRA-03**: Replace in-memory rate limiter with atomic Supabase RPC-based usage enforcement
- [x] **INFRA-04**: Platform-agnostic scraper registry with adapter pattern (abstract existing Instagram scrapers)

### Authentication

- [x] **AUTH-01**: User can sign up with email and password via Supabase Auth
- [x] **AUTH-02**: User receives email verification after signup
- [x] **AUTH-03**: User can sign in with Google OAuth via Supabase Auth
- [x] **AUTH-04**: User session persists across browser refresh (cookie-based SSR via @supabase/ssr)
- [x] **AUTH-05**: User can reset password via email link
- [x] **AUTH-06**: User can log out from any page
- [x] **AUTH-07**: Row Level Security (RLS) policies on all user-facing tables

### Platform Scraping

- [x] **PLAT-01**: YouTube channel scraping via YouTube Data API v3
- [x] **PLAT-02**: Twitter/X profile scraping via third-party API with fallback
- [x] **PLAT-03**: TikTok profile scraping via third-party API with fallback
- [x] **PLAT-04**: LinkedIn profile scraping via third-party API with error + retry UX (no manual entry, per D-07)
- [x] **PLAT-05**: Facebook page scraping via third-party API with error + retry UX (no manual entry, per D-07)
- [x] **PLAT-06**: Each platform returns normalized data matching existing InstagramProfile shape
- [x] **PLAT-07**: Platform health monitoring (canary checks for scraper availability)

### AI Analysis

- [x] **AI-01**: Multi-agent debate analysis — 3 Claude agents independently analyze a profile, then synthesize diverse perspectives into one richer report
- [x] **AI-02**: Single-agent analysis remains available for free-tier users
- [x] **AI-03**: Competitor comparison — side-by-side analysis of 2-3 profiles on the same platform
- [x] **AI-04**: AI-generated content calendar with optimal posting times and content ideas per platform
- [x] **AI-05**: Hashtag strategy recommendations based on niche, trends, and engagement data
- [x] **AI-06**: AI cost controls — use Haiku for worker agents, token caps, result caching for same-handle analyses

### Growth Tracking

- [x] **GROW-01**: User can save analysis reports to their account (persisted in Supabase)
- [x] **GROW-02**: User can view historical reports for any previously analyzed profile
- [x] **GROW-03**: Dashboard shows metric trends over time (followers, engagement rate, posting frequency)
- [x] **GROW-04**: Visual charts for growth metrics across saved reports

### Payments

- [x] **PAY-01**: Razorpay subscription integration with recurring billing (global, UPI + cards + wallets)
- [x] **PAY-03**: Freemium gating — 3 free analyses per month, advanced features (multi-agent, competitor compare, content calendar) gated to paid tier
- [x] **PAY-04**: Usage dashboard showing remaining analyses, current plan, and upgrade prompts
- [ ] **PAY-05**: Webhook handler for Razorpay with idempotency (x-razorpay-event-id deduplication)
- [x] **PAY-06**: Subscription state synced to Supabase subscriptions table

### User Dashboard

- [x] **DASH-01**: User dashboard as authenticated home page with saved reports and account overview
- [x] **DASH-02**: Account settings page (profile, email, password, subscription management)
- [x] **DASH-03**: Report history with search and filter by platform and date

## v2 Requirements

### Advanced Features

- **ADV-01**: Instagram Graph API integration for audience demographics (requires Meta app review)
- **ADV-02**: Email notifications for significant metric changes
- **ADV-03**: Shareable public report links
- **ADV-04**: CSV/Excel export of growth data
- **ADV-05**: Custom AI prompt tuning per user preference

### Team Features

- **TEAM-01**: Team/agency accounts with multiple seats
- **TEAM-02**: Client management for agencies
- **TEAM-03**: White-label reports with custom branding

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first, revisit after v1 traction |
| Social media posting/scheduling | Analysis only, not a management tool |
| Real-time monitoring/alerts | Batch analysis, not live tracking |
| Proprietary API access | Direct consumer product first |
| Video content analysis | High compute cost, defer to v2+ |
| Multi-language support | English-first for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| AUTH-07 | Phase 1 | Complete |
| PLAT-01 | Phase 2 | Complete |
| PLAT-02 | Phase 2 | Complete |
| PLAT-03 | Phase 2 | Complete |
| PLAT-04 | Phase 2 | Complete |
| PLAT-05 | Phase 2 | Complete |
| PLAT-06 | Phase 2 | Complete |
| PLAT-07 | Phase 2 | Complete |
| PAY-01 | Phase 3 | Complete |
| PAY-03 | Phase 3 | Complete |
| PAY-04 | Phase 3 | Complete |
| PAY-05 | Phase 3 | Pending |
| PAY-06 | Phase 3 | Complete |
| AI-01 | Phase 4 | Complete |
| AI-02 | Phase 4 | Complete |
| AI-03 | Phase 4 | Complete |
| AI-04 | Phase 4 | Complete |
| AI-05 | Phase 4 | Complete |
| AI-06 | Phase 4 | Complete |
| GROW-01 | Phase 5 | Complete |
| GROW-02 | Phase 5 | Complete |
| GROW-03 | Phase 5 | Complete |
| GROW-04 | Phase 5 | Complete |
| DASH-01 | Phase 5 | Complete |
| DASH-02 | Phase 5 | Complete |
| DASH-03 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after roadmap creation*
