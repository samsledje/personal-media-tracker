# Testing Guide for Markdown Media Tracker

## Overview

This guide explains how to run, write, and maintain tests for the Markdown Media Tracker project. We use Vitest for unit and integration tests, and Playwright for end-to-end tests.

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug
```

## Test Structure

```
src/
├── utils/__tests__/          # Unit tests for utility functions
├── services/__tests__/       # Tests for external API services
├── hooks/__tests__/          # Tests for custom React hooks
├── components/__tests__/     # Tests for React components
├── integration/__tests__/    # Integration tests for workflows
└── test/
    ├── setup.js              # Global test configuration
    ├── helpers/               # Test utility helpers
    │   ├── testUtils.js      # Common test utilities
    │   ├── mockHelpers.js    # Mock factory functions
    │   └── assertionHelpers.js # Custom assertions
    ├── mocks/                # Reusable mock implementations
    │   ├── apis.js           # Mock API responses
    │   ├── localStorage.js   # Mock localStorage
    │   └── storage.js        # Mock storage adapters
    └── fixtures/             # Sample test data
        ├── sampleItems.js    # Sample books and movies
        └── sampleCSV.js      # Sample CSV data
tests/
└── e2e/                      # End-to-end tests (Playwright)
    ├── storage-selection.spec.js
    ├── item-crud.spec.js
    ├── search-and-add.spec.js
    ├── filtering-sorting.spec.js
    ├── keyboard-shortcuts.spec.js
    └── import-export.spec.js
```

## Writing Tests

### Unit Tests for Utilities

Utility functions should have comprehensive test coverage (90%+ goal).

**Example:**

```javascript
import { describe, it, expect } from 'vitest';
import { parseMarkdown, generateMarkdown } from '../../utils/markdownUtils.js';

describe('markdownUtils', () => {
  describe('parseMarkdown', () => {
    it('should parse valid YAML frontmatter', () => {
      const markdown = `---
title: "Test Book"
author: "Test Author"
---

Notes here.`;

      const result = parseMarkdown(markdown);
      
      expect(result.metadata.title).toBe('Test Book');
      expect(result.metadata.author).toBe('Test Author');
      expect(result.body).toBe('Notes here.');
    });

    it('should handle missing frontmatter', () => {
      const markdown = 'Just content';
      const result = parseMarkdown(markdown);
      
      expect(result.metadata).toEqual({});
      expect(result.body).toBe('Just content');
    });
  });
});
```

### Service Layer Tests

Service tests should mock external APIs and test error handling.

**Example:**

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { searchBooks } from '../../services/openLibraryService.js';
import { mockFetch } from '../../test/mocks/apis.js';

describe('openLibraryService', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = mockFetch();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should search for books successfully', async () => {
    const results = await searchBooks('gatsby');
    
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe('The Great Gatsby');
  });
});
```

### Hook Tests

Custom hooks should be tested with React Testing Library's `renderHook`.

**Example:**

```javascript
import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useItems } from '../useItems';

describe('useItems', () => {
  it('should load items from storage', async () => {
    const { result } = renderHook(() => useItems());
    
    await waitFor(() => {
      expect(result.current.items).toHaveLength(4);
    });
  });

  it('should save a new item', async () => {
    const { result } = renderHook(() => useItems());
    
    const newItem = { id: '5', title: 'New Book', type: 'book' };

    await act(async () => {
      await result.current.saveItem(newItem);
    });

    expect(result.current.items).toContainEqual(newItem);
  });
});
```

### Component Tests

React components should be tested with React Testing Library.

**Example:**

```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ItemCard from '../ItemCard';

describe('ItemCard', () => {
  const mockItem = {
    id: '1',
    title: 'Test Book',
    author: 'Test Author',
    type: 'book',
    rating: 5,
  };

  it('should render book card correctly', () => {
    render(
      <ItemCard
        item={mockItem}
        cardSize="medium"
        onItemClick={vi.fn()}
      />
    );

    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('should call onItemClick when clicked', () => {
    const mockOnClick = vi.fn();
    
    render(
      <ItemCard
        item={mockItem}
        cardSize="medium"
        onItemClick={mockOnClick}
      />
    );

    fireEvent.click(screen.getByText('Test Book'));
    expect(mockOnClick).toHaveBeenCalledWith(mockItem, expect.any(Object));
  });
});
```

## Test Coverage Goals

- **Utils**: 95%+ coverage
- **Hooks**: 90%+ coverage
- **Services**: 85%+ coverage
- **Components**: 80%+ coverage
- **Overall**: 85%+ coverage

Current thresholds are enforced in `vitest.config.js`:
- Lines: 85%
- Functions: 68%
- Branches: 80%
- Statements: 85%

View coverage report:

```bash
npm run test:coverage
# Open coverage/index.html in your browser
```

## Best Practices

### 1. Test Organization

- Place test files next to the code they test (in `__tests__` folders)
- Use descriptive test names that explain what is being tested
- Group related tests with `describe` blocks

### 2. Test Independence

- Each test should be independent and not rely on other tests
- Use `beforeEach` to set up test state
- Use `afterEach` to clean up after tests

### 3. Mocking

- Mock external dependencies (APIs, storage, etc.)
- Use the provided mocks in `src/test/mocks/`
- Keep mocks realistic and based on actual behavior

### 4. Assertions

- Use specific assertions (prefer `toBe` over `toBeTruthy` when checking exact values)
- Test both success and error cases
- Test edge cases (empty arrays, null values, etc.)

### 5. Async Testing

- Use `async/await` for asynchronous tests
- Use `waitFor` from React Testing Library when needed
- Don't forget to `await` promises in tests

## Common Patterns

### Testing localStorage

```javascript
import { beforeEach } from 'vitest';

beforeEach(() => {
  localStorage.clear();
});

it('should save to localStorage', () => {
  saveToStorage('key', 'value');
  expect(localStorage.getItem('key')).toBe('value');
});
```

### Testing API Calls

```javascript
import { vi } from 'vitest';

it('should handle API errors', async () => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: false,
      status: 500,
    })
  );

  const result = await apiCall();
  expect(result).toEqual([]);
});
```

### Testing React Hooks

```javascript
import { renderHook, act } from '@testing-library/react';

it('should update state', () => {
  const { result } = renderHook(() => useMyHook());
  
  act(() => {
    result.current.updateValue('new value');
  });
  
  expect(result.current.value).toBe('new value');
});
```

### Testing User Interactions

```javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should handle click', async () => {
  const user = userEvent.setup();
  const mockFn = vi.fn();
  render(<Button onClick={mockFn}>Click me</Button>);
  
  await user.click(screen.getByText('Click me'));
  expect(mockFn).toHaveBeenCalledTimes(1);
});
```

### Using Test Helpers

```javascript
import { createMockStorageAdapter } from '../../test/helpers/mockHelpers.js';
import { expectValidItem } from '../../test/helpers/assertionHelpers.js';

it('should load items', async () => {
  const mockStorage = createMockStorageAdapter({
    items: [{ id: '1', title: 'Test', type: 'book' }]
  });
  
  const items = await mockStorage.loadItems();
  expectValidItem(items[0]);
});
```

### Testing Import Workflows

```javascript
import { processImportFile } from '../../utils/importUtils.js';
import { createMockFile } from '../../test/helpers/mockHelpers.js';

it('should import CSV file', async () => {
  const csvContent = 'Title,Author\nBook,Author';
  const file = createMockFile(csvContent, 'test.csv');
  
  const result = await processImportFile(file, [], mockSaveItem, mockOnProgress);
  expect(result.added).toBeGreaterThan(0);
});
```

## Debugging Tests

### Run Single Test File

```bash
npm test -- path/to/test.js
```

### Run Tests Matching Pattern

```bash
npm test -- --grep "should filter by"
```

### Debug with UI

```bash
npm test:ui
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run"],
  "console": "integratedTerminal"
}
```

## Continuous Integration

Tests run automatically on:

- Pull requests to `dev` and `main` branches
- Pushes to `dev` and `main` branches

### GitHub Actions Workflow

See `.github/workflows/test.yml` for the CI configuration.

CI currently runs:

- `npm run test:coverage` (unit/integration with coverage gate)
- `npm run test:e2e` as a Chromium smoke suite

## Test Helpers

The test suite includes reusable helpers in `src/test/helpers/`:

### testUtils.js
- `renderWithProviders()` - Render components with context providers
- `waitForAsync()` - Wait for async operations
- `createDelayedMock()` - Create mocks with delays
- `flushPromises()` - Flush pending promises
- `createMockAbortSignal()` - Create AbortSignal mocks
- `createMockFile()` - Create File objects for testing

### mockHelpers.js
- `createMockStorageAdapter()` - Create storage adapter mocks
- `createMockItems()` - Generate test items
- `createMockApiResponse()` - Create API response mocks
- `createMockFetch()` - Create fetch mocks
- `createMockProgressCallback()` - Create progress callback mocks
- `createMockLocalStorage()` - Create localStorage mocks

### assertionHelpers.js
- `expectValidItem()` - Assert item has required fields
- `expectValidBook()` / `expectValidMovie()` - Type-specific assertions
- `expectValidMarkdown()` - Assert valid markdown structure
- `expectValidStorageAdapter()` - Assert storage adapter interface
- `expectValidProgress()` - Assert progress callback data
- `expectValidRating()` - Assert valid rating values

**Example usage:**
```javascript
import { createMockStorageAdapter } from '../../test/helpers/mockHelpers.js';
import { expectValidItem } from '../../test/helpers/assertionHelpers.js';

const mockStorage = createMockStorageAdapter({ items: [...] });
const item = await mockStorage.loadItems();
expectValidItem(item[0]);
```

## Integration Tests

Integration tests are located in `src/integration/__tests__/` and test complete workflows:

- **storageWorkflows.test.jsx** - Storage selection, switching, reconnection
- **importWorkflows.test.jsx** - CSV/ZIP import flows with API enrichment
- **searchWorkflows.test.jsx** - Online search → add → edit workflows
- **batchOperations.test.jsx** - Batch edit, delete, restore operations
- **itemManagement.test.jsx** - Complete CRUD workflows

Integration tests use longer timeouts (15 seconds) and test real user workflows.

## E2E Tests

End-to-end tests use Playwright and are located in `tests/e2e/`:

- **storage-selection.spec.js** - Storage selection and persistence
- **item-crud.spec.js** - Create, read, update, delete items
- **search-and-add.spec.js** - Online search and adding items
- **filtering-sorting.spec.js** - Filtering and sorting functionality
- **keyboard-shortcuts.spec.js** - Keyboard navigation
- **import-export.spec.js** - CSV import/export flows

E2E tests require the dev server to be running. Playwright will start it automatically.

## Current Status

**Test Suite Progress:**

- ✅ Infrastructure setup complete
- ✅ Test helpers created (testUtils, mockHelpers, assertionHelpers)
- ✅ Utility tests: Comprehensive coverage (markdownUtils, filterUtils, colorUtils, importUtils, coverUtils)
- ✅ Service tests: Full coverage (openLibraryService, omdbService, configService, toastService, obsidianBase)
- ✅ Hook tests: Complete (useItems, useFilters, useSelection, useTheme, useKeyboardNavigation, useOmdbApi, useHalfStars)
- ✅ Component tests: Comprehensive (ItemCard, StorageIndicator, modals, forms)
- ✅ Integration tests: Broad workflow coverage (storage, import, search, batch operations)
- ✅ E2E tests: Stable smoke coverage for core UI paths (Playwright)
- ✅ Test configuration: Coverage thresholds and smoke E2E enforced in CI

### Quarantined/Deferred Tests

Some tests remain intentionally skipped due to known environment constraints and are tracked in-file with TODO notes:

- `src/components/modals/__tests__/BatchEditModal.test.jsx` (text-input + checkbox interaction edge cases)
- `src/components/__tests__/LandingPage.test.jsx` (carousel timing/interval behavior)
- `src/integration/__tests__/itemManagement.test.jsx` (complex modal + keyboard lifecycle in JSDOM)

These are candidates for future migration to browser-level E2E assertions.

## Contributing

When adding new features:
1. Write tests first (TDD approach recommended)
2. Ensure all tests pass before committing
3. Aim for coverage goals (90%+ for utils, 85%+ for hooks, etc.)
4. Update this documentation if adding new testing patterns

## Performance Testing

The test suite includes performance considerations:

- Tests with large datasets (1000+ items) verify scalability
- Batch operations are tested for efficiency
- Import operations are tested with progress callbacks
- Test timeouts are configured appropriately (10s default, 15s for integration)

## Accessibility Testing

Accessibility tests verify:
- ARIA labels are present and correct
- Keyboard navigation works as expected
- Screen reader compatibility
- Focus management in modals

Use `@testing-library/jest-dom` matchers for accessibility assertions:
```javascript
expect(element).toHaveAttribute('aria-label', 'Close modal');
expect(element).toHaveFocus();
```

## Troubleshooting

### Tests failing with timeout errors
- Increase timeout in test: `vi.setConfig({ testTimeout: 30000 })`
- Check for slow async operations
- Verify mocks are properly set up

### E2E tests failing
- Ensure dev server is running: `npm run dev`
- Check Playwright is installed: `npx playwright install`
- Verify browser compatibility

### Coverage not meeting thresholds
- Run `npm run test:coverage` to see detailed report
- Check `coverage/index.html` for line-by-line coverage
- Focus on uncovered branches and edge cases

### Mock not working as expected
- Verify mock is set up in `beforeEach`
- Check mock is not being overridden
- Use `vi.clearAllMocks()` to reset between tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [User Event Documentation](https://testing-library.com/docs/user-event/intro/)

## Getting Help

- Check existing tests for examples
- Review [AGENTS.md](./AGENTS.md) for project architecture
- Review [CONTRIBUTING.md](./CONTRIBUTING.md) for code guidelines
- Open an issue for questions or problems
