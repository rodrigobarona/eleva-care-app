# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Build: `pnpm build` (production), `pnpm dev` (development with turbopack)
- Lint: `pnpm lint`
- Format: `pnpm format`
- Test: `pnpm test` (all tests), `pnpm test tests/path/to/file.test.ts` (single test)
- Test with watch: `pnpm test:watch -- tests/path/to/file.test.ts`

## Code Style
- Use TypeScript for all code with proper typing
- Prefer interfaces over types for object shapes
- Use Zod for runtime schema validation
- Follow Atomic Design principles for UI components (atoms, molecules, organisms)
- Use named exports for components and functions
- Use TailwindCSS for styling with Shadcn/ui and Radix UI components
- Boolean variables should use auxiliary verbs (e.g., `isLoading`, `hasError`)
- Follow Next.js App Router structure with server components when possible
- Limit `use client` to components requiring client-side functionality

## Error Handling
- Validate all inputs with Zod schemas
- Use try/catch blocks for error handling with proper error messages
- Always secure API routes with validation and authentication

## Testing
- Place all tests in the `tests/` directory
- Mirror folder structure of source code in tests
- Use Jest as the test runner with React Testing Library for components
- Test utility functions for typical, edge, and error cases