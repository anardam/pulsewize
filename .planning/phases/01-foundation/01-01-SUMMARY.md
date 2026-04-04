---
phase: 01-foundation
plan: "01"
subsystem: infra
tags: [next.js, react, supabase, zod, lucide-react, tailwind, tesserix, npm-registry]

# Dependency graph
requires: []
provides:
  - "Next.js 16.2.1 upgraded from 14.2.35"
  - "React 19.2.4 upgraded from 18.x"
  - "@supabase/supabase-js and @supabase/ssr installed"
  - "zod@^4.3.6 installed"
  - "lucide-react@^0.511.0 installed"
  - "@tesserix/web and @tesserix/tokens declared in package.json (requires private registry)"
  - ".npmrc with @tesserix:registry=https://npm.tesserix.dev placeholder"
  - "Dark theme CSS variables aligned with Tesserix violet theme"
  - "Tailwind config updated with @tesserix/web content path and progress-fill keyframe"
affects: [02, 03, 04, 05]

# Tech tracking
tech-stack:
  added:
    - "next@16.2.1 (from 14.2.35)"
    - "react@19.2.4 (from ^18)"
    - "react-dom@19.2.4"
    - "@supabase/supabase-js@^2.100.1"
    - "@supabase/ssr@^0.10.0"
    - "zod@^4.3.6"
    - "lucide-react@^0.511.0"
    - "eslint@^9 (from ^8 — required by eslint-config-next@16.2.1)"
    - "eslint-config-next@16.2.1"
    - "@tesserix/web@1.7.0 (declared — private registry not yet configured)"
    - "@tesserix/tokens@1.0.0 (declared — private registry not yet configured)"
  patterns:
    - "HSL CSS variables for Tesserix design token compatibility"
    - "class-based dark mode via .dark selector"
    - "transpilePackages in next.config.mjs for @tesserix scope"
    - "turbopack.root set to resolve worktree lockfile warning"

key-files:
  created:
    - ".npmrc"
  modified:
    - "package.json"
    - "package-lock.json"
    - "next.config.mjs"
    - "tsconfig.json"
    - "src/app/globals.css"
    - "tailwind.config.ts"

key-decisions:
  - "Used eslint@^9 (upgraded from ^8) — eslint-config-next@16.2.1 requires peer eslint>=9.0.0"
  - "Used import.meta.dirname instead of __dirname in next.config.mjs (ESM module scope)"
  - "@tesserix packages declared in package.json but not installed — private registry URL placeholder used; user must configure TESSERIX_NPM_TOKEN and confirm registry URL"
  - "@types/react and @types/react-dom pinned to ^19 range (no exact 19.2.14 for react-dom at time of install)"
  - "Converted body background/color to hsl(var(--xxx)) format to match Tesserix design token expectations"

patterns-established:
  - "ESLint 9 flat config required for Next.js 16 projects"
  - "HSL CSS variables (no # hex) for all design tokens in .dark selector"
  - "import.meta.dirname for __dirname equivalent in ESM next.config.mjs"

requirements-completed: [INFRA-01]

# Metrics
duration: 16min
completed: 2026-03-30
---

# Phase 01 Plan 01: Foundation — Dependency Upgrade Summary

**Next.js 16.2.1 + React 19.2.4 upgrade with Supabase, Zod, Lucide React installed; Tesserix violet dark theme CSS variables aligned; @tesserix private registry configured as placeholder**

## Performance

- **Duration:** 16 min
- **Started:** 2026-03-30T22:42:50Z
- **Completed:** 2026-03-30T22:59:15Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Upgraded Next.js 14 → 16.2.1 and React 18 → 19.2.4 with build passing clean
- Installed all Phase 1 dependencies: @supabase/supabase-js, @supabase/ssr, zod, lucide-react
- Created `.npmrc` for @tesserix private registry with `${TESSERIX_NPM_TOKEN}` env var auth
- Applied Tesserix violet dark theme CSS variable overrides (HSL format) to `globals.css`
- Updated `tailwind.config.ts` with `@tesserix/web` content path and `progress-fill` keyframe
- All existing utility classes preserved: `.gradient-text`, `.card-glow`, `.animate-progress`

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure private registry and upgrade Next.js 16 + React 19** - `cbfac3e` (feat)
2. **Task 2: Apply dark theme CSS overrides and carry forward animations** - `8f6ea7f` (feat)

**Plan metadata:** (docs commit hash — see final commit)

## Files Created/Modified

- `.npmrc` — Private registry scope config for @tesserix packages
- `package.json` — Updated all dependencies + scripts (lint → eslint, added test scripts)
- `package-lock.json` — Regenerated lockfile with all new dependencies
- `next.config.mjs` — Added transpilePackages for @tesserix, turbopack.root for worktree
- `tsconfig.json` — Updated by Next.js 16 (target ES2017, jsx react-jsx)
- `src/app/globals.css` — Added `.dark` block with HSL CSS variables, updated body styles
- `tailwind.config.ts` — Added @tesserix/web content path, progress-fill keyframe, HSL color refs

## Decisions Made

- Upgraded eslint from ^8 → ^9: `eslint-config-next@16.2.1` has a hard peer dependency on `eslint>=9.0.0` — required change for the build to proceed
- Used `import.meta.dirname` instead of `__dirname` in `next.config.mjs`: the file uses `export default` ESM syntax and `__dirname` is not defined in ESM scope
- @tesserix packages declared in `package.json` but cannot be installed until user provides registry URL and `TESSERIX_NPM_TOKEN` — placeholder URL `https://npm.tesserix.dev` used per instructions
- `@types/react-dom` pinned to `^19` range: version `19.2.14` specified in plan does not exist on npm registry (latest at install time was `19.2.3`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Upgraded eslint from ^8 to ^9**
- **Found during:** Task 1 (npm install)
- **Issue:** `eslint-config-next@16.2.1` requires peer `eslint>=9.0.0`. npm refused to resolve dependency tree with `eslint@^8`
- **Fix:** Changed `eslint` devDependency from `^8` to `^9` in `package.json`
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npm install` succeeded; `npm run build` passes
- **Committed in:** `cbfac3e` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed `__dirname` ESM error in next.config.mjs**
- **Found during:** Task 1 (npm run build verification)
- **Issue:** Added `turbopack.root: __dirname` but `__dirname` is not defined in ES module scope (file uses `export default`)
- **Fix:** Changed to `import.meta.dirname` which is the ESM equivalent
- **Files modified:** `next.config.mjs`
- **Verification:** Build passes without `ReferenceError`
- **Committed in:** `cbfac3e` (Task 1 commit)

**3. [Rule 1 - Bug] Corrected @types/react-dom version**
- **Found during:** Task 1 (npm install)
- **Issue:** Plan specified `@types/react-dom@19.2.14` but this version does not exist on npm registry
- **Fix:** Changed pinned version to `^19` range
- **Files modified:** `package.json`
- **Verification:** `npm install` succeeded
- **Committed in:** `cbfac3e` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All auto-fixes required for build to proceed. No scope creep.

## Issues Encountered

- **@tesserix private registry unreachable:** The domain `npm.tesserix.dev` (placeholder URL from instructions) is not reachable. Per plan instructions, config files are committed and user must configure the real registry URL and `TESSERIX_NPM_TOKEN`. The `@tesserix/web` and `@tesserix/tokens` packages are listed in `package.json` but not yet installed in `node_modules`.

## User Setup Required

Before `@tesserix/web` and `@tesserix/tokens` can be installed:

1. **Obtain the actual `@tesserix` registry URL** from your registry administrator
2. **Update `.npmrc`** — replace `https://npm.tesserix.dev` with the actual registry URL
3. **Set `TESSERIX_NPM_TOKEN`** environment variable to your registry auth token
4. **Run `npm install`** to install the @tesserix packages

Until this is done, any import of `@tesserix/web` or `@tesserix/tokens` will fail at build time.

## Known Stubs

None — this plan only configures infrastructure (package.json, .npmrc, CSS variables). No UI components or data flows were added.

## Next Phase Readiness

- Next.js 16.2.1 + React 19.2.4 baseline is ready
- Supabase client libraries installed — Plan 01-02 (auth) can proceed
- Tesserix CSS theme tokens are in place — UI plans can use CSS variables
- **Blocker for UI plans:** @tesserix packages not installed until user configures private registry

## Self-Check: PASSED

- .npmrc: FOUND
- package.json (next 16.2.1): VERIFIED
- next.config.mjs: FOUND
- src/app/globals.css (--primary 271 91% 65%): VERIFIED
- src/app/globals.css (--background 240 14% 4%): VERIFIED
- tailwind.config.ts: FOUND
- Task 1 commit cbfac3e: FOUND
- Task 2 commit 8f6ea7f: FOUND

---
*Phase: 01-foundation*
*Completed: 2026-03-30*
