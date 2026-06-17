# CLAUDE.md — AI Agent Guide for Markdown Media Tracker

This file is the primary reference for AI coding agents working on this codebase. Read it fully before making any changes.

## Project Overview

Markdown Media Tracker is a **client-side-only React app** hosted on GitHub Pages. It lets users track books and movies as Markdown files with YAML frontmatter. There is no backend, no server, no database. All data lives either in the browser's local filesystem (via File System Access API) or Google Drive.

The app is **AI agent written** with human oversight. Keeping this file accurate is critical.

## Tech Stack

| Concern | Tool |
| --- | --- |
| Framework | React 19 + Vite (rolldown-vite) |
| Styling | Tailwind CSS 3 |
| Icons | lucide-react |
| Unit/integration tests | Vitest 3 + @testing-library/react |
| E2E | Playwright (stubs only — not relied upon) |
| Markdown rendering | marked + DOMPurify |
| YAML frontmatter | js-yaml (parse + dump) |
| CSV parsing | papaparse (parse + unparse) |
| Fuzzy search | fuse.js |
| ZIP export | jszip |
| Book search API | Open Library (no key required) |
| Movie search API | OMDb (user-supplied API key, stored in localStorage) |
| Storage option A | File System Access API (local directory) |
| Storage option B | Google Drive via GIS (Google Identity Services) |

## Architecture

### Directory Map

```text
src/
├── MediaTracker.jsx        # Main orchestration component (~1978 lines). NOT in coverage.
├── App.jsx                 # Root wrapper with ToastProvider. NOT in coverage.
├── main.jsx                # Vite entry point. NOT in coverage.
├── config.js               # OMDb API key + Google Drive folder name (localStorage-backed)
├── components/
│   ├── cards/              # ItemCard (memoized), ViewDetails
│   ├── forms/              # EditForm, TagInput
│   ├── layout/             # Button
│   ├── modals/             # AddEditModal, BatchEditModal, FilterModal, HelpModal,
│   │                       #   ItemDetailModal, ObsidianBaseModal, SearchModal, ApiKeyModal
│   ├── LandingPage.jsx     # Shown before storage is selected
│   ├── StorageIndicator.jsx
│   └── StorageSelector.jsx
├── hooks/
│   ├── useItems.js         # Item CRUD + storage adapter + undo stack
│   ├── useFilters.js       # Search, filter, sort (memoized)
│   ├── useSelection.js     # Bulk selection (Set-based for O(1))
│   ├── useTheme.js         # Colors + card size (localStorage-backed)
│   ├── useKeyboardNavigation.js  # Grid nav + keyboard shortcuts
│   ├── useOmdbApi.js       # OMDb API key state
│   ├── useHalfStars.js     # Half-star rating toggle
│   └── useToast.js         # ToastContext + useToast() (provided by ToastProvider)
├── services/
│   ├── storageAdapter.js          # Abstract base class (interface only)
│   ├── fileSystemStorage.js       # File System Access API implementation
│   ├── googleDriveStorageGIS.js   # Google Drive + GIS implementation (912 lines — complex, don't refactor without tests)
│   ├── driveCache.js              # IndexedDB caching for Drive
│   ├── fileSystemCache.js         # Caching for local filesystem
│   ├── openLibraryService.js      # Book search
│   ├── omdbService.js             # Movie search
│   ├── configService.js           # localStorage persistence helpers
│   ├── obsidianBase.js            # Obsidian Bases file generation
│   └── toastService.js            # Toast notification system
├── utils/
│   ├── statusUtils.jsx     # getStatusIcon(), getStatusColorClass() — THE canonical source
│   ├── filterUtils.js      # Core filter/sort logic (pure functions)
│   ├── markdownUtils.js    # YAML frontmatter parse/generate
│   ├── csvUtils.js         # CSV import/export
│   ├── importUtils.js      # Goodreads/CSV import processing
│   ├── fileUtils.js        # File System Access API helpers
│   ├── coverUtils.js       # Cover image URL handling
│   ├── colorUtils.js       # Tailwind color helpers
│   ├── fuzzySearchUtils.js # fuse.js integration
│   ├── commonUtils.js      # isTyping() etc.
│   └── statusUtils.jsx     # (see above)
├── constants/
│   ├── index.js            # STATUS_LABELS, STATUS_ICONS, STATUS_COLORS, STATUS_TYPES,
│   │                       #   getDefaultStatus(), CARD_SIZES, FILTER_TYPES, SORT_OPTIONS,
│   │                       #   KEYBOARD_SHORTCUTS
│   └── colors.js           # PRIMARY_COLOR_PRESETS, HIGHLIGHT_COLOR_PRESETS
└── test/
    ├── setup.js            # Global mocks: localStorage, matchMedia, showDirectoryPicker, indexedDB
    ├── fixtures/
    │   ├── sampleItems.js  # sampleBook, sampleMovie, sampleItems array
    │   └── sampleCSV.js    # CSV strings for import tests
    ├── mocks/
    │   ├── apis.js         # Mock Open Library / OMDb responses
    │   ├── localStorage.js # LocalStorageMock class
    │   ├── storage.js      # Mock StorageAdapter
    │   └── indexedDB.js    # Mock IndexedDB
    └── helpers/
        ├── testUtils.js         # renderWithProviders, waitForAsync, createMockFile, etc.
        ├── mockHelpers.js       # createMockStorage, createMockItem, etc.
        └── assertionHelpers.js  # Custom assertion helpers
```

### Data Flow

```text
MediaTracker (orchestrator)
  ├── useItems          → storageAdapter (FileSystem | GoogleDrive)
  │                       ↓ reads/writes .md files with YAML frontmatter
  ├── useFilters        → filterUtils (pure: filter + sort items)
  ├── useSelection      → Set<id> (bulk select)
  ├── useTheme          → localStorage (colors, card size)
  ├── useKeyboardNavigation → DOM refs (grid focus)
  └── Modal components  → EditForm, SearchModal → openLibraryService / omdbService
```

### Storage Adapter Pattern

All storage backends implement the abstract interface in `storageAdapter.js`:

- `initialize()`, `isConnected()`, `selectStorage()`, `loadItems()`, `saveItem(item)`, `deleteItem(id)`, `writeFile(path, content)`, `fileExists(path)`

`useItems.js` only talks to the adapter — it never references FileSystem or Drive directly.

## Key Rules

### Do Not Duplicate Status Utilities

`getStatusIcon()` and `getStatusColorClass()` live **only** in `src/utils/statusUtils.jsx`. Do not redefine them anywhere else. Import them from there.

### statusUtils is .jsx, not .js

`statusUtils.jsx` returns JSX (React elements). The oxc transformer only processes JSX in `.jsx` files. Do not rename it to `.js`.

### MediaTracker.jsx is Excluded from Coverage

`src/MediaTracker.jsx`, `src/App.jsx`, and `src/main.jsx` are excluded from coverage thresholds in `vitest.config.js`. This is intentional — they require integration-level testing, which is addressed separately. Do not add them to coverage without also adding adequate integration tests.

### Google Drive Service — Handle With Care

`src/services/googleDriveStorageGIS.js` (912 lines) is complex auth + API code. It works. Do not refactor it without a dedicated test suite covering the auth flow.

### No Backend

This is a GitHub Pages static site. There are no API routes, no server-side rendering, no database migrations, no environment secrets at runtime (the Google client ID is public; the OMDb key is user-supplied).

## Testing

### Run Tests

```bash
npm run test              # watch mode
npm run test -- --run     # single run (CI mode)
npm run test:coverage     # with coverage report
npm run test:e2e          # Playwright (stubs only, not reliable)
```

### Test Organization

- **Unit tests**: colocated with source, e.g. `src/utils/__tests__/filterUtils.test.js`
- **Integration tests**: `src/integration/__tests__/`
- **Test infrastructure**: `src/test/` (excluded from coverage — don't test the tests)

### Coverage Thresholds

```text
lines: 85%  |  functions: 68%  |  branches: 80%  |  statements: 85%
```

These are enforced in CI. If your changes drop coverage below these, the build fails.

### Global Mocks (always active via setup.js)

- `localStorage` → `LocalStorageMock` (in-memory, shared across a test file — clear in `beforeEach` if you write to it)
- `window.matchMedia` → vi.fn()
- `global.showDirectoryPicker` → vi.fn()
- `global.indexedDB` → mock with `open` and `deleteDatabase`

### Integration / Regression Tests

`src/integration/__tests__/` contains 6 test files covering key workflows:

| File | What it covers |
| --- | --- |
| `systemHealth.test.jsx` | **System health regression tests** — storage lifecycle, filter accuracy, sort correctness, markdown round-trip, CSV import pipeline. Run these first when debugging a regression. |
| `itemManagement.test.jsx` | Manual add, online search → add, edit, delete + undo via `useItems` hook |
| `batchOperations.test.jsx` | Batch edit, batch delete, undo, tag mutation on multiple items |
| `storageWorkflows.test.jsx` | Storage selection, switching, reconnection, persistence, error handling |
| `importWorkflows.test.jsx` | Goodreads CSV import with dedup; Letterboxd ZIP (skipped — JSZip mock incomplete) |
| `searchWorkflows.test.jsx` | Book/movie search → add workflows; search → add → edit cycles |

### Known Pre-existing Issues

- **Test isolation flakiness**: A few integration tests (notably `itemManagement.test.jsx`) can still flake under full-suite load even though they pass in isolation. The shared `localStorage` mock in `setup.js` is now cleared in a global `afterEach`, which removes the main state-leak source; if you see a remaining flake, suspect resource contention rather than a logic bug.
- **Playwright E2E stubs**: All 6 spec files in `tests/e2e/` are placeholder stubs. The `e2e-smoke` CI job has been removed — Playwright is not run in CI. Use Vitest integration tests for regression coverage instead.

### How to Write a New Test

1. Use fixtures from `src/test/fixtures/sampleItems.js` for item data
2. Use mocks from `src/test/mocks/storage.js` for storage adapter
3. Use helpers from `src/test/helpers/testUtils.js` for rendering and async waits
4. Clear `localStorage` in `beforeEach` if your test touches it: `localStorage.clear()`
5. For component tests, mock `src/services/toastService.js` to avoid noise: `vi.mock('../../services/toastService.js', () => ({ toast: vi.fn() }))`

## Item Data Model

Items are stored as Markdown files with YAML frontmatter. The in-memory shape:

```js
{
  id: string,           // filename without .md
  type: 'book' | 'movie',
  title: string,
  author: string,       // books only
  director: string,     // movies only
  status: 'to-read' | 'reading' | 'read' | 'to-watch' | 'watching' | 'watched' | 'dnf',
  rating: number,       // 0–5, supports 0.5 increments if halfStars enabled
  tags: string[],
  genre: string,
  year: string,
  isbn: string,         // books only
  notes: string,        // free-text review/notes
  coverUrl: string,     // URL to cover image
  dateAdded: string,    // ISO date
  dateRead: string,     // books: date finished
  dateWatched: string,  // movies: date watched
}
```

## Common Patterns

### Adding a new utility function

1. Add to the appropriate file in `src/utils/`
2. Write tests in `src/utils/__tests__/<name>.test.js`
3. If it returns JSX, use `.jsx` extension for both the utility and its import path

### Adding a new modal

1. Create `src/components/modals/MyModal.jsx`
2. Create `src/components/modals/__tests__/MyModal.test.jsx`
3. Import and render it in `MediaTracker.jsx` via `createPortal`
4. Add the boolean open/close state to MediaTracker's state block

### Non-obvious API contracts

- `useItems()` exports `undoStack` as **a number** (the stack length), not the array itself. Check `undoStack > 0`, not `undoStack.length`.
- `deleteItem()` re-throws on storage errors. Callers must catch.

### Adding a new hook

1. Create `src/hooks/useMyHook.js`
2. Create `src/hooks/__tests__/useMyHook.test.js`
3. Use `renderHook` from `@testing-library/react` for testing

### Adding a new constant

Add to `src/constants/index.js` and export it. Import from there — do not define constants inline in components.

## CI/CD

- **test.yml**: Runs on PRs/pushes to `dev` and `main`. Runs `npm run test:coverage`. Uploads coverage to Codecov.
- **deploy.yml**: Runs on push to `main`. Builds and deploys to GitHub Pages.
- Target `dev` for feature PRs; `main` is for releases.

## Before Opening a PR

```bash
npm run lint              # ~101 known problems remain (96 errors / 5 warnings) — don't add new ones
npm run test -- --run     # all tests must pass
npm run test:coverage     # coverage thresholds must be met
npm run build             # must build without errors
```

The lint baseline is ~101 problems (mostly remaining unused vars and missing-dependency warnings in `MediaTracker.jsx` and the large modals). Do not suppress them with eslint-disable comments — fix them or leave them if they're pre-existing. Do not add new lint errors.
