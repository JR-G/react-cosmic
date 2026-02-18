# Contributing

## Prerequisites

- [Bun](https://bun.sh) (runtime and package manager)
- Node.js 20+ (for compatibility checks)

## Setup

```bash
git clone https://github.com/JR-G/react-cosmic
cd react-cosmic
bun install
bun run hooks:install   # sets up Lefthook pre-push hook
```

## Development commands

```bash
bun run test            # watch mode
bun run test:file       # single run
bun run test:coverage   # coverage report
bun run lint            # ESLint
bun run typecheck       # tsc --noEmit
bun run build           # tsdown → dist/
bun run docs            # TypeDoc → docs/api/
bun run demo            # basic form demo (localhost)
bun run demo:collab     # WebSocket collab demo
```

## Code conventions

- UK English in all documentation and comments
- No inline comments — use TSDoc/JSDoc on exported functions and types
- Strict TypeScript — no `any`, `noUncheckedIndexedAccess` is enabled
- No `any` in test mocks — define typed interfaces for mock objects
- Each `OrbitProvider` in tests must use a unique `storeId` to avoid state leakage

## Testing

Tests live in `tests/`. Run `bun run test:file` before pushing (the Lefthook pre-push hook does this automatically). Coverage is generated with `bun run test:coverage` (v8 provider).

File organisation:

```
tests/
├── core/           Unit tests for OrbitStore, storage adapters, text-diff utility
├── react/          Integration tests for hooks using real OrbitStore + fake-indexeddb
│   └── collaboration.test.tsx  Uses vi.mock to isolate WebSocket-dependent hooks
└── sync/           Unit tests for tab sync
```

## PR guidelines

- Keep PRs focused — one logical change per PR
- CI runs lint, typecheck, test, and build in parallel — all must pass
- Add tests for new hooks or non-trivial behaviour changes
- Update `CHANGELOG.md` under `[Unreleased]`

## Release process

Releases use a two-step PR-based workflow:

**Step 1 — Bump version and open PR:**
```bash
bun run release <patch|minor|major>
```
This creates a `release/vX.Y.Z` branch, bumps `package.json`, updates `CHANGELOG.md`, and opens a PR.

**Step 2 — After the PR merges, tag the release:**
```bash
bun run release:tag
```
This pulls the latest main, creates and pushes the `vX.Y.Z` tag. The GitHub Actions release workflow picks this up and publishes to npm via trusted OIDC publishing (no token stored as a secret).

Do not push tags manually — the script handles fetching latest main first to avoid tagging a stale commit.
