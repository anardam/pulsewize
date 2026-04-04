# Testing Patterns

**Analysis Date:** 2026-03-31

## Test Framework

**Runner:** None configured

No test framework is installed or configured. The project has zero test files.

**Missing from `package.json`:**
- No Jest, Vitest, Mocha, or any test runner in dependencies or devDependencies
- No Playwright, Cypress, or any E2E framework
- No React Testing Library or similar component testing tools
- No test-related scripts in `package.json` (only `dev`, `build`, `start`, `lint`)

## Test File Organization

**Location:** No test files exist anywhere in the project.

**Naming:** Not established -- no convention to follow.

**Search results:**
- `*.test.*` files: 0
- `*.spec.*` files: 0
- `__tests__/` directories: 0
- Test config files: 0

## Test Structure

No test structure established. When adding tests, follow these recommendations based on the codebase structure:

**Recommended framework:** Vitest (aligns with Next.js ecosystem, fast, TypeScript-native)

**Recommended file placement:** Co-located with source files:
```
src/lib/rate-limit.ts
src/lib/rate-limit.test.ts

src/lib/nlp.ts
src/lib/nlp.test.ts

src/components/ApiKeyModal.tsx
src/components/ApiKeyModal.test.tsx
```

**Recommended setup:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

## Mocking

**Framework:** Not applicable (no tests)

**When tests are added, key mocking needs:**
- `fetch` -- used extensively in scrapers (`src/lib/instagram.ts`, `src/lib/scraper-rapidapi.ts`) and client-side API calls
- `localStorage` -- used in `src/components/ApiKeyModal.tsx` and `src/lib/report-history.ts`
- `child_process.spawn` / `child_process.execFile` -- used in `src/lib/claude-cli.ts`
- `@anthropic-ai/sdk` -- used in `src/lib/claude-api.ts`
- `google-trends-api` -- used in `src/lib/trends.ts`
- `natural` -- used in `src/lib/nlp.ts`
- `puppeteer-core` -- used in `src/lib/scraper-puppeteer.ts`

## Fixtures and Factories

**Test Data:** None exists.

**Recommended fixture location:** `src/__fixtures__/` or co-located `*.fixture.ts` files

**Key test data needed:**
- Sample `InstagramProfile` objects (public, private, verified, with/without posts)
- Sample `ManualProfileInput` objects
- Sample `AnalysisReport` JSON (mock Claude API response)
- Sample RapidAPI response payloads (multiple provider formats)
- Sample Instagram public API response payloads

## Coverage

**Requirements:** None enforced

**Current coverage:** 0% -- no tests exist

## Test Types

**Unit Tests (not implemented -- high priority):**
- `src/lib/rate-limit.ts` -- Pure function, easy to test: `checkRateLimit(ip)` with various call patterns
- `src/lib/nlp.ts` -- `analyzeCaption()` with various caption arrays, empty input, edge cases
- `src/lib/trends.ts` -- `getTrendDirection()` with mocked Google Trends responses
- `src/lib/scraper-rapidapi.ts` -- `parseResponse()` helper and `asNumber`/`asString` utilities
- `src/lib/scraper-puppeteer.ts` -- `parseCount()` helper function
- `src/lib/report-history.ts` -- `saveAndGetPrevious()` and `getPreviousReport()` with mocked localStorage
- `src/lib/prompt.ts` -- `buildAnalysisPrompt()` output structure

**Integration Tests (not implemented -- medium priority):**
- `src/app/api/analyze/route.ts` -- POST handler with mocked scrapers and Claude API
- `src/app/api/health/route.ts` -- GET handler with mocked CLI check
- `src/lib/claude-api.ts` -- `analyzeWithApi()` with mocked Anthropic SDK
- `src/lib/claude-cli.ts` -- `checkClaudeCli()` and `analyzeProfile()` with mocked child_process

**E2E Tests (not implemented -- lower priority):**
- Full analysis flow: enter username -> loading -> report display
- Manual entry flow: enter stats -> submit -> report display
- API key management: open modal -> save key -> verify badge updates
- Error flows: invalid username, rate limit, network failure

## CI/CD Test Integration

**CI Pipeline:** None detected

No GitHub Actions workflows, no `.github/` directory, no CI configuration files found.

**Available lint command:**
```bash
npm run lint       # Runs next lint (ESLint only)
```

**Recommended CI additions:**
```bash
npm run test       # Unit + integration tests (to be added)
npm run test:cov   # Coverage report (to be added)
npm run lint       # Already exists
npm run build      # Type checking via tsc (already works)
```

## Priority Testing Roadmap

**Immediate (pure functions, no mocking needed):**
1. `src/lib/rate-limit.ts` -- `checkRateLimit()` is self-contained with in-memory store
2. `src/lib/scraper-rapidapi.ts` -- `asNumber()`, `asString()`, `parseResponse()` helpers
3. `src/lib/scraper-puppeteer.ts` -- `parseCount()` helper

**Short-term (requires mocking):**
4. `src/lib/nlp.ts` -- `analyzeCaption()` with real `natural` library (or mocked)
5. `src/lib/report-history.ts` -- localStorage mocking
6. `src/lib/prompt.ts` -- `buildAnalysisPrompt()` output validation

**Medium-term (API route integration tests):**
7. `src/app/api/analyze/route.ts` -- Full request/response cycle
8. `src/app/api/health/route.ts` -- Environment detection

---

*Testing analysis: 2026-03-31*
