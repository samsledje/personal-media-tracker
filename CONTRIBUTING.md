# Contributing to Markdown Media Tracker

Thank you for your interest in contributing to the Markdown Media Tracker! This document provides information about the project structure and guidelines for contributing.

## Project Structure

The app has been refactored into a clean, modular architecture for better maintainability and development experience:

### Core Application

- `src/MediaTracker.jsx` — main app component (now streamlined using hooks and components)
- `src/App.jsx` — root app wrapper
- `src/main.jsx` — application entry point
- `src/config.js` — place your OMDb API key here

### Modular Architecture

- `src/components/` — reusable UI components
  - `modals/` — SearchModal, HelpModal, BatchEditModal, ItemDetailModal, AddEditModal
  - `forms/` — EditForm component
  - `cards/` — ViewDetails component  
  - `layout/` — Button and other layout components
- `src/hooks/` — custom React hooks for state management
  - `useItems.js` — item management and file operations
  - `useFilters.js` — search, filtering, and sorting logic
  - `useSelection.js` — bulk selection and batch operations
  - `useTheme.js` — theme colors and card size management
  - `useKeyboardNavigation.js` — keyboard shortcuts and navigation
  - `useOmdbApi.js` — OMDb API key management
- `src/services/` — external API integrations and config
  - `openLibraryService.js` — book search integration
  - `omdbService.js` — movie search integration  
  - `configService.js` — localStorage persistence
- `src/utils/` — pure utility functions
  - `colorUtils.js` — theme color manipulation
  - `markdownUtils.js` — YAML frontmatter parsing/generation
  - `csvUtils.js` — CSV import/export functionality
  - `fileUtils.js` — File System Access API operations
  - `filterUtils.js` — item filtering and sorting logic
  - `importUtils.js` — CSV import processing
  - `commonUtils.js` — shared utility functions
- `src/constants/` — application constants and configuration
  - `index.js` — card sizes, filter types, sort options, etc.
  - `colors.js` — customizable color presets

### Data & Assets

- `data/` — sample markdown items provided for demo/testing
- `public/` — static assets and screenshots

This modular structure makes the codebase much easier to navigate, test, and extend. Each module has a single responsibility and clear boundaries.

## Development Guidelines

### Code Organization

- **Components**: Keep UI components focused and reusable
- **Hooks**: Extract stateful logic into custom hooks
- **Services**: Isolate external API calls and data persistence
- **Utils**: Write pure functions for data transformation and validation
- **Constants**: Centralize configuration values and magic numbers

### Best Practices

- Follow React best practices and hooks patterns
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep components small and focused on a single responsibility
- Use TypeScript-style JSDoc annotations where helpful

### Testing

- Test components in isolation when possible
- Verify that utility functions work correctly with edge cases
- Test API service integration points
- Ensure custom hooks manage state correctly

## How to Contribute

Contributions are welcome! Here's how to get started:

### Small Changes

For bug fixes or small improvements:

1. Fork the repository
2. Create a feature branch (`git checkout -b fix/bug-description`)
3. Make your changes following the code organization patterns
4. Test your changes locally
5. Submit a pull request with a clear description

### Pull Request Checklist

Before opening or updating a PR, run the merge gate locally:

1. `npm run lint`
2. `npm run test -- --run`
3. `npm run test:coverage`
4. `npm run test:e2e`
5. `npm run build`

Include in your PR description:

- What changed and why
- How you tested it (commands run + key results)
- Any intentionally deferred tests with rationale

Unless coordinated otherwise, target `dev` for regular feature PRs and reserve direct `main` PRs for release/hotfix workflows.

### Larger Changes

For significant features or architectural changes:

1. Open an issue first to discuss the proposed changes
2. Get feedback on the approach before implementing
3. Follow the same process as small changes once approved

### Areas for Contribution

- **UI/UX improvements**: Better responsive design, accessibility features
- **New import formats**: Support for additional CSV formats or services
- **Performance optimizations**: Faster file operations, better caching
- **Testing**: Add unit tests for components and utilities
- **Documentation**: Improve inline documentation and examples
- **Bug fixes**: Address any issues found during use

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Make changes and test locally
5. Ensure code follows the existing patterns and structure

## Questions?

Feel free to open an issue for questions about contributing or to discuss potential improvements to the project structure or development workflow.