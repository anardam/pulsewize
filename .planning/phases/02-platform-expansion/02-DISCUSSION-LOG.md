# Phase 2: Platform Expansion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-03-31
**Phase:** 02-platform-expansion
**Areas discussed:** Platform selector UX, Scraping APIs, Manual entry UX, Profile data shape

---

## Platform Selector UX

| Option | Description | Selected |
|--------|-------------|----------|
| Platform tabs above input | Horizontal tabs above username field | |
| Dropdown next to input | Platform dropdown beside username input | |
| Platform cards grid | Grid of platform cards user clicks | ✓ |

**User's choice:** Platform cards grid

| Option | Description | Selected |
|--------|-------------|----------|
| Instagram (existing) | Keep Instagram as default | |
| Last used | Remember user's last analyzed platform | ✓ |
| No default | Force explicit selection every time | |

**User's choice:** Last used

---

## Scraping APIs

| Option | Description | Selected |
|--------|-------------|----------|
| Official YouTube API | Free, reliable, legal | ✓ |
| Third-party scraper | RapidAPI YouTube scraper | |

**User's choice:** Official YouTube Data API v3

| Option | Description | Selected |
|--------|-------------|----------|
| RapidAPI providers | Familiar pattern, pay-per-use | |
| ScrapeCreators | Single provider for all | |
| Mix per platform | Best provider per platform | |
| You decide | Claude picks best per platform | ✓ |

**User's choice:** Claude's discretion

---

## Manual Entry UX

**User's choice:** NO manual entry for new platforms. Error + retry on failure.
**Notes:** User explicitly stated "there shouldn't be any manual entry" for new platforms.

---

## Profile Data Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Unified NormalizedProfile | Common fields + platform-specific extras | |
| Per-platform types | Separate types per platform | |
| You decide | Claude picks best strategy | ✓ |

**User's choice:** Claude's discretion

| Option | Description | Selected |
|--------|-------------|----------|
| Customized per platform | Platform-specific prompts | ✓ |
| Same prompt, different data | Universal prompt | |
| You decide | Claude picks | |

**User's choice:** Customized per platform

---

## Claude's Discretion

- Scraping API selection for Twitter/X, TikTok, LinkedIn, Facebook
- NormalizedProfile type strategy
- Platform health check implementation

## Deferred Ideas

None
