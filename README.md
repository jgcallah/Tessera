# Tessera

Browser-based Gridfinity layout planner and 3D part generator.

## Features (Planned)

- Configurable grid system (defaults to Gridfinity 42mm, supports custom sizes)
- Visual layout editor for planning full drawer/shelf organizations
- Baseplate and bin generation with Gridfinity-compatible stacking lip
- Real-time 3D preview with orbit controls
- Print bed optimization — minimizes number of prints
- STL export for FDM 3D printing

## Development

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Setup

```bash
pnpm install
pnpm dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Type-check and build for production |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run tests in watch mode |
| `pnpm test:run` | Run tests once (CI) |
| `pnpm lint` | ESLint check |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm format` | Format with Prettier |

## Tech Stack

- **UI:** React 19, Tailwind CSS v4
- **3D:** Three.js, React Three Fiber, Drei
- **Geometry:** Manifold 3D (WASM)
- **Build:** Vite 6, TypeScript 5.8
- **Test:** Vitest, Testing Library
- **CI/CD:** GitHub Actions, GitHub Pages

## License

MIT
