# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Tessera is a browser-based Gridfinity layout planner and 3D part generator.
It uses React Three Fiber for 3D preview and Manifold 3D (WASM) for
constructive solid geometry operations. Deployed to GitHub Pages.

## Common Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start Vite dev server (http://localhost:5173)
pnpm build            # Typecheck + production build
pnpm test             # Vitest in watch mode
pnpm test:run         # Vitest single run (CI)
pnpm lint             # ESLint with cache
pnpm lint:fix         # ESLint autofix
pnpm typecheck        # tsc --noEmit
pnpm format           # Prettier write
pnpm format:check     # Prettier check
```

## Architecture

- `src/components/` — React components (`.tsx`)
- `src/lib/` — Non-React utilities, WASM wrappers, geometry helpers
- `src/lib/manifold.ts` — Async singleton for Manifold WASM initialization
- `public/` — Static assets served as-is

## Conventions

- **TypeScript:** Very strict config (exactOptionalPropertyTypes, noUncheckedIndexedAccess, verbatimModuleSyntax). Do not relax these.
- **Imports:** Use `import type` for type-only imports (enforced by ESLint).
- **Formatting:** Prettier with double quotes, semicolons, trailing commas (es5). Do not use single quotes.
- **Styling:** Tailwind CSS v4 utility classes. No CSS modules, no styled-components.
- **3D:** React Three Fiber declarative components. Keep imperative Three.js code in `src/lib/`.
- **WASM:** Always use `getManifold()` from `src/lib/manifold.ts`. Never import `manifold-3d` directly in components.
- **Testing:** Vitest + Testing Library. Tests colocated with source (`*.test.tsx`). R3F Canvas must be mocked in tests (jsdom has no WebGL).
- **No default exports** for components. Use named exports.

## Manifold 3D Notes

- WASM module loads asynchronously. Wrap in Suspense or useEffect.
- Call `.delete()` on Manifold objects when done to free WASM memory.
- The `setup()` call in `src/lib/manifold.ts` is required once after Module() resolves.

## GitHub Pages

- Base path is `/Tessera/` (configured in vite.config.ts).
- Deploy is automated via GitHub Actions on push to main.
