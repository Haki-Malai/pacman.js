# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run watch` or `bun run watch` (Vite dev mode)
- **Build for production**: `npm run build` or `bun run build`
- **Run tests**: `npm run test` or `bun test` (uses Bun test runner with HappyDOM)
- **Type checking**: `npm run typecheck` or `bun run typecheck` ⚠️ **MUST PASS WITH ZERO ERRORS**
- **Linting**: `npm run lint` (ESLint with --max-warnings=0)
- **Auto-fix linting issues**: `npm run lint:fix`
- **Format code**: `npm run format` (Prettier)

## 🎯 CORE PRINCIPLES FOR CODE GENERATION

**CRITICAL PHILOSOPHY**: Write the minimum code necessary to solve the problem elegantly.

### Code Minimalism

1. **LESS CODE IS BETTER CODE**
   - Every line of code is a liability (maintenance cost, bugs, complexity)
   - Always ask: "Can this be simpler?" before writing
   - Delete code aggressively when refactoring
   - 10 lines that work > 100 lines that work

2. **REDUCE COMPLEXITY, NOT FUNCTIONALITY**
   - Simplify implementation, preserve behavior
   - Remove abstraction layers that don't add value
   - Consolidate duplicate logic
   - **NEVER break existing functionality when simplifying**

3. **REFACTORING SAFETY**
   - Run tests BEFORE refactoring (establish baseline)
   - Run tests AFTER refactoring (verify nothing broke)
   - If tests fail after refactoring, fix immediately
   - Incremental changes > big rewrites

4. **MEASURE BEFORE REMOVING**
   - Don't assume code is unused - verify with grep/search
   - Check all imports before deleting exports
   - Test edge cases when removing conditions
   - Preserve public APIs unless explicitly migrating

### Quality Metrics

When evaluating code quality, prioritize in this order:
1. **Correctness** - Does it work? (tests pass)
2. **Simplicity** - Is it the simplest solution? (minimal code)
3. **Readability** - Can others understand it? (clear intent)
4. **Performance** - Is it fast enough? (only optimize if needed)

**Remember**: Well-written code is simple, correct, and minimal.

## 🚨 MANDATORY DEVELOPMENT WORKFLOW FOR CLAUDE

**CRITICAL**: Follow this exact workflow to prevent TypeScript error accumulation:

### Before Starting Any Task

1. **Baseline Check**: Run `npm run typecheck` - must show ZERO errors
2. **Test Baseline**: Run `npm run test` - must show 100% pass rate
3. **Only proceed if both commands pass successfully**

### During Development (Every 10-20 Lines of Code)

1. **Incremental Check**: Run `npm run typecheck`
2. **If errors appear**: IMMEDIATELY fix them before writing more code
3. **Never accumulate more than 3-5 TypeScript errors**

### After Each Function/Component/Feature

1. **Complete Check**: Run `npm run typecheck`
2. **Test Verification**: Run `npm run test`
3. **Both must pass before moving to next task**

### Code Generation Rules

- **Design types first** - Create proper interfaces before writing implementation
- **Use type guards** - Prefer runtime type checking over blind assertions
- **Handle optional properties correctly** with conditional assignment patterns
- **Test files require the same type safety as production code**
- **Never use `as any`** - Always create proper type definitions for external libraries

**ZERO TOLERANCE POLICY**: If TypeScript errors accumulate, STOP all feature work and fix them immediately.

## Architecture Overview

This is a React-based document analysis application that interfaces with a backend API for querying and managing research documents. The application supports both standalone operation and embedding into other websites.

### Key Architectural Patterns

**State Management**:

- **Jotai Atoms** (`src/atoms/dataAtoms.ts`): Unified reactive state management for all server data
  - Single source of truth for projects, queries, and parsed data
  - Atom families for granular reactivity (only re-renders affected components)
  - Built-in deduplication and caching
  - Minimal effects (only 2 total for auto-fetch and URL sync)
- **React Context**: UI-specific state via `AppStateContext` and `DocumentContext`
  - `AppStateContext`: Wraps Jotai state for component consumption
  - `DocumentContext`: Drag/drop, search, collapsed nodes, optimistic updates
- **Optimistic Updates**: Used extensively for responsive UI during API operations

**Data Flow**:

- **Unified Data Layer** (`src/atoms/dataAtoms.ts`): All server state managed by Jotai atoms
  - Explicit initialization via `initializeAppAtom` (called once on mount)
  - Auto-fetch on project change via `autoFetchDataEffect`
  - URL sync via `syncProjectToUrlEffect` with early bailout
- **API Layer** (`src/utils/api.ts`): All backend communication
- **Components**: Access state directly via Jotai atoms (`useAtomValue`, `useSetAtom`)
  - No wrapper hooks - read atoms directly
  - Subscribe to effects when needed
  - Use action atoms for mutations

**Component Structure**:

- Main app structure: `App.tsx` → `Layout.tsx` → `Document.tsx`
- Hierarchical document rendering via `SideNavHierarchy.tsx`
- Editor integration using BlockNote/Editor.js for rich text editing
- Modal dialogs for project management (`ProjectEditorDialog.tsx`)

### Core Data Types

- `Query`: Main data structure representing research queries/questions
- `ParsedQuery`: Represents processed documents with metadata
- `Project`: Container for related queries and documents
- Document hierarchy uses parent-child relationships via `parentQuery` field

### Unified Query State Architecture (NEW)

**Philosophy**: Single source of truth with automatic optimistic updates - components never manage optimistic state manually.

**Core Pattern**:
```typescript
// ✅ Components use simple action atoms
const addQuery = useSetAtom(addQueryAtom);
await addQuery({ title, prompt, topic });

// ❌ NEVER do manual optimistic updates
// setOptimisticData([...data, newItem]); // OLD PATTERN - DON'T DO THIS
```

**Architecture Layers**:

1. **Unified State Atom** (`unifiedQueriesFamily`) - Internal state per project:
   - `server: Query[]` - Authoritative server data
   - `local: Query[]` - Optimistic local changes (temporary)
   - `pending: Set<string>` - Track in-flight operations

2. **Public Read Atom** (`currentProjectQueriesAtom`) - What components use:
   - Returns `local` if available (during mutations)
   - Falls back to `server` (normal state)
   - Single source of truth - no more `effectiveData = optimistic || queries`

3. **Mutation Action Atoms** - Automatic optimistic updates:
   - `addQueryAtom` - Add new query
   - `moveQueryAtom` - Drag & drop reordering
   - `updateQueryAtom` - Update query fields
   - `deleteQueryAtom` - Delete query

**Mutation Flow** (Automatic):
1. Component calls action atom: `await addQuery({ title, prompt })`
2. Action applies optimistic update to `local` state
3. UI updates immediately (reads from `currentProjectQueriesAtom`)
4. Action calls API in background
5. Action refetches server data
6. Action clears `local` state (server is now authoritative)
7. On error: automatic rollback (clears `local`, shows server data)

**Benefits**:
- **90% less code** - Components don't manage optimistic state
- **Consistent** - All mutations follow same pattern
- **Error-safe** - Automatic rollback on failure
- **Type-safe** - Full TypeScript support
- **No race conditions** - Pending state prevents concurrent mutations

**Migration Status**:
- ✅ Phase 1: Unified state atoms implemented
- ✅ Phase 2: Mutation action atoms implemented
- ✅ Phase 3: Component migration complete
- ✅ Phase 4: Legacy `optimisticDataAtom` removed (migration complete!)

**Legacy Pattern** (REMOVED - Do not use):
```typescript
// ❌ OLD: Manual optimistic updates (REMOVED - optimisticDataAtom no longer exists)
// This pattern has been completely replaced by the unified mutation system
const optimisticData = useAtomValue(optimisticDataAtom); // ❌ This atom no longer exists
const effectiveData = optimisticData || queries;
setOptimisticData([...effectiveData, newItem]);
// ... manual state management ...
```

**New Pattern** (Use this):
```typescript
// ✅ NEW: Automatic optimistic updates
const addQuery = useSetAtom(addQueryAtom);
try {
  await addQuery({ title, prompt, topic, displayOrder });
} catch (err) {
  showToast({ message: "Failed to add query", type: "error" });
}
```

## API Integration

The application connects to a backend API with configurable endpoints:

- API URL configured via `window.apiURL`
- Supports CORS proxy setup for development (see `no-cors.js`)
- RESTful operations for CRUD on queries, projects, and documents
- File upload capabilities for document ingestion

## Testing Setup

- **Test Runner**: Bun with HappyDOM for DOM simulation
- **Testing Library**: React Testing Library for component tests
- **Test Files**: Located alongside source files with `.spec.ts` extension
- **Coverage**: Comprehensive test coverage for utility functions
- **Setup Files**: `happydom.ts` and `testing-library.ts` handle test environment

## Build Configuration

- **Bundler**: Vite with React plugin and Tailwind CSS
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **Path Aliases**: `@/*` maps to project root
- **Base Path**: `/Minion/react/` for production builds
- **Output**: Generates `app.js` for embedding into other sites

## Styling

- **Framework**: Tailwind CSS v4 with component-based UI library
- **Components**: Radix UI primitives with custom styling
- **Icons**: Lucide React icon library
- **Responsive**: Mobile-first responsive design patterns

## Code Quality Standards

### TypeScript Requirements - ZERO ERROR TOLERANCE

**MANDATORY TYPE CHECKING**: Every code change MUST pass `npm run typecheck` with ZERO errors before proceeding.

#### Strict Type Safety Rules

- **ZERO TOLERANCE for `any` types** - Always use proper TypeScript types
  - **NEVER use `as any`** - Use proper type assertions or guards
  - **NEVER use `: any`** - Define proper interfaces or use `unknown` with type guards
  - **Acceptable alternatives**:
    - Use `unknown` with type guards for truly dynamic data
    - Use `Record<string, unknown>` for objects with unknown structure
    - Create specific interfaces for external library types
    - Use type guards (`typeof`, `in`, custom guards) for runtime checks

- **PROPER TYPE DEFINITIONS** - Define interfaces for external library types:

  ```typescript
  // Good: Define proper interfaces
  interface ReactPDFStyleProps {
    fontSize?: number;
    fontWeight?: string;
    marginTop?: number;
    // ... other known properties
  }

  interface ReactPDFComponent {
    type: string;
    props?: {
      style?: ReactPDFStyleProps;
      src?: string;
    };
    children?: (string | ReactPDFComponent)[];
  }

  // Use proper typing
  expect((result[0] as ReactPDFComponent).props?.style?.fontSize).toBe(12);
  ```

- **HANDLING UNKNOWN DATA** - Use `unknown` and type guards instead of `any`:

  ```typescript
  // ❌ BAD: Using any
  function processItem(item: any) {
    if (item.type === "text") return item.text;
  }

  // ✅ GOOD: Using unknown with type guards
  function processItem(item: unknown): string {
    if (typeof item !== "object" || item === null) return "";
    const itemObj = item as Record<string, unknown>;
    if ("type" in itemObj && itemObj.type === "text" && "text" in itemObj) {
      return String(itemObj.text);
    }
    return "";
  }

  // ✅ EVEN BETTER: Define proper interface
  interface TextItem {
    type: "text";
    text: string;
  }

  function isTextItem(item: unknown): item is TextItem {
    return (
      typeof item === "object" &&
      item !== null &&
      "type" in item &&
      item.type === "text" &&
      "text" in item &&
      typeof (item as TextItem).text === "string"
    );
  }

  function processItem(item: unknown): string {
    return isTextItem(item) ? item.text : "";
  }
  ```

- **DEFENSIVE ARRAY ACCESS** - Use proper bounds checking and optional chaining:

  ```typescript
  // Good: Proper defensive access
  if (results.length > 0 && results[0]?.content) {
    expect(results[0].content.text).toBe("expected");
  }

  // Acceptable in tests where we control the data
  expect(results[0]!.content![0]!.text).toBe("expected");
  ```

- **EXACT OPTIONAL PROPERTIES** - handle `exactOptionalPropertyTypes: true` correctly:
  ```typescript
  // Good: Conditional property assignment
  function createNode(value: string, language?: string): CodeBlockNode {
    const node: CodeBlockNode = { id: generateId(), type: "codeBlock", value };
    if (language !== undefined) {
      node.language = language;
    }
    return node;
  }
  ```

#### Proper Type Design Principles

- **TYPE-FIRST APPROACH** - Design types before writing code:

  ```typescript
  // Good: Define complete interfaces upfront
  interface ExportResult {
    type: string;
    props?: Record<string, unknown>;
    content?: ContentNode[];
    children?: (string | ExportResult)[];
  }

  interface ContentNode {
    text: string;
    styles?: {
      bold?: boolean;
      italic?: boolean;
    };
  }
  ```

- **EXTERNAL LIBRARY INTEGRATION** - Create proper type definitions:

  ```typescript
  // Good: Define what we actually expect from ReactPDF
  interface PDFTextComponent {
    type: "Text";
    props: {
      style?: {
        fontSize?: number;
        fontWeight?: "normal" | "bold";
        color?: string;
      };
    };
    children: string[];
  }

  // Use type guards for runtime safety
  function isPDFTextComponent(comp: unknown): comp is PDFTextComponent {
    return typeof comp === "object" && comp !== null && "type" in comp && comp.type === "Text";
  }
  ```

- **TEST FILE TYPE SAFETY** - Tests should model production code safety:

  ```typescript
  // Good: Proper type checking in tests
  const results = exporter.export(document) as ExportResult[];
  expect(results).toHaveLength(1);

  const firstResult = results[0];
  if (firstResult && "content" in firstResult) {
    expect(firstResult.content?.[0]?.text).toBe("expected");
  }

  // Acceptable for controlled test data
  expect(results[0]!.content![0]!.text).toBe("expected");
  ```

#### Error Prevention Workflow

1. **BEFORE writing any code**: Run `npm run typecheck` to establish baseline
2. **DURING development**: Run typecheck frequently (every 10-20 lines)
3. **AFTER each function/component**: Run typecheck before moving to next
4. **BEFORE committing**: Final typecheck must show ZERO errors

#### Common Error Patterns and Proper Solutions

- **TS2532 "Object is possibly 'undefined'"** → Design better types or use proper guards:

  ```typescript
  // Bad: Blind assertions
  result[0]!.content!.text;

  // Good: Proper type guards
  if (result[0]?.content?.[0]?.text) {
    // work with result[0].content[0].text safely
  }

  // Acceptable: When you control the data in tests
  expect(result[0]!.content![0]!.text).toBe("expected");
  ```

- **TS2339 "Property does not exist"** → Define proper interfaces:

  ```typescript
  // Bad: Casting to any
  (obj as any).someProperty;

  // Good: Define proper interface
  interface MyObject {
    someProperty: string;
  }
  const typedObj = obj as MyObject;
  expect(typedObj.someProperty).toBe("value");
  ```

- **TS2345 "Argument type not assignable"** → Fix type alignment at source:

  ```typescript
  // Bad: Force casting
  someFunction(value as any);

  // Good: Ensure proper types
  if (typeof value === "string") {
    someFunction(value); // TypeScript knows value is string
  }
  ```

#### Immediate Fix Requirements

If TypeScript errors are introduced:

1. **STOP all other work**
2. **Fix ALL TypeScript errors immediately**
3. **Verify with `npm run typecheck`**
4. **Ensure tests still pass with `npm run test`**
5. **Only then continue with feature work**

**NEVER ACCUMULATE TYPESCRIPT ERRORS** - Fix them as they appear, not in batch later.

### Production Code Standards

- All code must pass TypeScript compilation without errors
- All code must pass ESLint with zero warnings (`--max-warnings=0`)
- Write comprehensive unit tests for new functionality
- Use meaningful variable and function names
- Follow existing code patterns and conventions
- Handle errors gracefully with proper error boundaries

### Task Completion Requirements

**MANDATORY PRE-COMPLETION CHECKS**: Before marking any task as completed, the following checks MUST pass with ZERO errors/warnings:

1. **Type Checking**: `npm run typecheck` must pass with zero TypeScript errors
2. **Linting**: `npm run lint` must pass with zero ESLint warnings
3. **Test Suite**: `npm run test` must pass with 100% success rate

**NO EXCEPTIONS**: Tasks cannot be considered complete unless all three checks pass. If any check fails:

- STOP immediately and fix all issues
- Re-run the failed check to verify the fix
- Only proceed when all checks pass cleanly

This policy ensures code quality and prevents technical debt accumulation.

### Refactoring and Migration Guidelines

**CRITICAL RULES FOR CODE REFACTORING**:

1. **NO BACKWARD COMPATIBILITY LAYERS**
   - When refactoring or migrating code, **NEVER** create backward compatibility files or re-export layers
   - **ALWAYS** update all callers to use the new interfaces directly
   - Remove old files completely after migration
   - Example of what NOT to do:
     ```typescript
     // ❌ BAD: Creating compatibility layer
     // oldAtoms.ts
     export { newAtom as oldAtom } from "./newAtoms";
     ```
   - Correct approach:
     ```typescript
     // ✅ GOOD: Update all imports directly
     // Change all files importing from oldAtoms.ts to import from newAtoms.ts
     // Then delete oldAtoms.ts entirely
     ```

2. **CLEAN MIGRATION PROCESS**
   - Step 1: **Test baseline** - Run tests to ensure they pass before changes
   - Step 2: Create the new improved version
   - Step 3: Find ALL imports of the old version (use grep/search)
   - Step 4: Update ALL callers to use new version
   - Step 5: Delete old files completely
   - Step 6: **Verify with typecheck and tests** - Ensure nothing broke
   - Step 7: If tests fail, fix immediately before continuing

3. **PRESERVE FUNCTIONALITY**
   - **Goal**: Reduce code while keeping same behavior
   - **Verify**: Tests must pass before AND after refactoring
   - **Safety**: If you break functionality, revert and try smaller steps
   - **Incremental**: Make small changes, test each change

4. **RATIONALE**
   - Backward compatibility layers create technical debt
   - They make the codebase harder to understand and maintain
   - They hide the true dependencies between modules
   - Clean breaks force proper updates and prevent confusion
   - Less code = fewer bugs = easier maintenance

4. **STATE MANAGEMENT WITH JOTAI**
   - **Single source of truth**: All server state in `src/atoms/dataAtoms.ts`
   - **Direct atom usage**: Use `useAtomValue`/`useSetAtom` directly in components
   - **No wrapper hooks**: Don't create hooks that just wrap atom reads
   - **No pointless wrapper atoms**: Don't create action atoms that just set other atoms
     - ❌ BAD: `hideToastAtom` that just sets `toastAtom.isVisible = false`
     - ❌ BAD: `openProjectDocumentsAtom` that just sets `projectDialogActionAtom`
     - ✅ GOOD: Set the base atom directly: `setToastAtom({ ...toast, isVisible: false })`
     - ✅ GOOD: Set the base atom directly: `setProjectDialogAction({ type: "openDocuments" })`
     - **Exception**: Action atoms that contain business logic (validation, API calls, etc.) are fine
   - **Atom families**: Use for collections (projects, queries) to enable granular reactivity
   - **Minimal effects**: Keep to absolute minimum (we use only 2: auto-fetch and URL sync)
   - **Explicit actions**: Prefer write-only action atoms over reactive effects
   - **Built-in deduplication**: Action atoms check if data exists before fetching
   - **Subscribe to effects**: Use `useAtomValue(effectAtom)` to subscribe when needed

### Best Practices

**Philosophy: Minimal, Clean, Elegant Solutions**

**Code Minimalism**:

- **Write less code** - Every line is a maintenance burden
  - Can this be a one-liner? Do it
  - Can this be deleted? Delete it
  - Can this be simpler? Simplify it
- **Reduce, don't just refactor** - Goal is FEWER lines, not just different code
- **Consolidate, don't split** - One file with 200 lines > Three files with 100 lines each
- **Delete dead code** - Unused code is worse than no code

**Simplicity Principles**:

- **Simplicity over cleverness** - Write code that is easy to understand and maintain
- **Direct over indirect** - Avoid unnecessary layers of abstraction
- **Explicit over implicit** - Make data flow and dependencies obvious
- **Fewer files over many** - Consolidate related logic instead of splitting across files
- **Pure functions** - Prefer stateless, testable functions with clear inputs/outputs
- **Minimal state** - Keep only essential state, derive everything else

**Refactoring Safety**:

- **Test before and after** - Always verify functionality is preserved
- **Incremental changes** - Small steps, test each step
- **Verify assumptions** - Don't assume code is unused, verify with search
- **Keep public APIs** - Only break APIs when explicitly migrating callers

**React & Jotai Patterns**:

- **Jotai for server state** - All server data lives in atoms (`dataAtoms.ts`)
  - **Use atoms directly** - `useAtomValue(projectsAtom)`, `useSetAtom(fetchProjectsAtom)`
  - **No wrapper hooks** - Read/write atoms directly in components
  - **No pointless wrapper atoms** - Don't create action atoms that just set other atoms without adding logic
  - **Atom families for collections** - Granular reactivity (only re-render what changes)
  - **Minimal effects** - Only 2 total: `autoFetchDataEffect` and `syncProjectToUrlEffect`
  - **Explicit actions** - Use write-only action atoms for mutations
  - **Built-in deduplication** - Action atoms check before fetching

- **React Context for UI state** - Transient UI state (modals, drag/drop, selections)

- **Example Jotai Usage**:
  ```typescript
  // ✅ GOOD: Read atoms directly
  import { useAtomValue, useSetAtom } from "jotai";
  import { projectsAtom, activeProjectIdAtom, changeActiveProjectAtom } from "../atoms/dataAtoms";

  function MyComponent() {
    const projects = useAtomValue(projectsAtom);
    const activeId = useAtomValue(activeProjectIdAtom);
    const changeProject = useSetAtom(changeActiveProjectAtom);

    return <div onClick={() => changeProject({ projectId: "123" })}>...</div>;
  }

  // ❌ BAD: Don't create wrapper hooks
  function useProjects() {
    return useAtomValue(projectsAtom); // Unnecessary abstraction
  }
  ```

- **Proper dependency arrays** - All React hooks must have correct dependencies
- **Cleanup in useEffect** - Always return cleanup functions when needed

**Code Quality Checklist**:

Before considering code "done", verify:
- ✅ **Correctness**: All tests pass
- ✅ **Simplicity**: Is this the simplest solution? Can any code be removed?
- ✅ **No duplication**: Is logic consolidated, not repeated?
- ✅ **Readability**: Can others understand this in 6 months?
- ✅ **Type safety**: Zero TypeScript errors
- ✅ **No dead code**: Unused imports, functions, or variables removed

**React Code Principles**:

- Prefer composition over inheritance
- Avoid inline event handlers in JSX (extract to named functions)
- Use proper ARIA attributes for accessibility
- Keep components small and focused (single responsibility)
- Extract reusable logic only when actually reused (YAGNI principle)
- MAINTAIN production-quality code standards at all times

**Anti-patterns to Avoid**:

- ❌ Creating abstraction layers "just in case" (YAGNI)
- ❌ Splitting code into many small files unnecessarily
- ❌ Writing wrapper functions that just call other functions
- ❌ Premature optimization
- ❌ Over-engineering simple problems
