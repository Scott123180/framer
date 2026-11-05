<!--
Sync Impact Report
==================
Version change: (unversioned template) → 1.0.0
Bump rationale: Initial ratification; all placeholders replaced with concrete governance.

Modified principles (template placeholder → adopted title):
  - [PRINCIPLE_1_NAME] → I. Test-First Development (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. SOLID Design
  - [PRINCIPLE_3_NAME] → III. End-to-End Verification of User Journeys
  - [PRINCIPLE_4_NAME] → IV. Clean, Simple User Experience
  - [PRINCIPLE_5_NAME] → V. Simplicity & Maintainability

Added sections:
  - Testing Standards & Quality Gates (was [SECTION_2_NAME])
  - Development Workflow (was [SECTION_3_NAME])

Removed sections: none

Deferred TODOs: none
  - RATIFICATION_DATE set to 2026-11-04 (first adoption; no prior constitution existed).
  - PROJECT_NAME inferred as "Framer" from the repository directory name.
-->

# Framer Constitution

## Core Principles

### I. Test-First Development (NON-NEGOTIABLE)

All production code MUST be driven by a failing test written before the implementation.

- The Red-Green-Refactor cycle is mandatory: write a test, confirm it fails for the expected
  reason, write the minimum code to make it pass, then refactor with the tests green.
- No production code may be merged without tests that exercise its behavior. Bug fixes MUST begin
  with a test that reproduces the defect.
- Tests MUST assert observable behavior (inputs, outputs, rendered UI, side effects), not
  implementation details, so refactoring does not require rewriting tests.
- Unit tests MUST be fast, deterministic, and isolated; no reliance on test ordering, wall-clock
  time, or live external services (use fakes, stubs, or fixtures at boundaries).
- A failing or skipped test on the main branch is a blocking defect, not technical debt.

**Rationale**: Writing tests first forces clear requirements, produces testable designs, and gives
a safety net that makes continuous refactoring and rapid change safe.

### II. SOLID Design

Code MUST follow the SOLID principles of object-oriented and modular design:

- **Single Responsibility**: each module, class, or component MUST have one reason to change.
  UI rendering, state management, domain logic, and I/O MUST live in separate units.
- **Open/Closed**: behavior MUST be extended through composition, configuration, or new
  implementations rather than by editing stable, tested code paths.
- **Liskov Substitution**: any implementation of an interface or subtype MUST be usable wherever
  its abstraction is expected without callers needing to know which one they have.
- **Interface Segregation**: interfaces and component props MUST be small and focused; consumers
  MUST NOT depend on members they do not use.
- **Dependency Inversion**: domain and UI logic MUST depend on abstractions; concrete
  dependencies (network, storage, clock, third-party SDKs) MUST be injected, which is also what
  makes Principle I achievable.

**Rationale**: SOLID boundaries keep the codebase testable, limit the blast radius of change, and
let features evolve independently.

### III. End-to-End Verification of User Journeys

Every user-facing feature MUST be covered by automated end-to-end (E2E) tests that drive the
real application the way a user would.

- Each prioritized user story in a feature spec MUST map to at least one E2E scenario covering
  its primary happy path; critical error and edge paths MUST also be covered.
- E2E tests MUST run in a real browser via an established framework (Playwright is the default;
  an alternative requires justification in the feature plan).
- E2E tests MUST select elements by accessible role, label, or text (or a dedicated test id
  when no accessible handle exists), never by brittle CSS structure.
- E2E tests MUST be independent, seed their own data, and be safe to run in parallel.
- Flaky tests MUST be fixed or quarantined with a tracked issue within one working day; retries
  MUST NOT be used to hide nondeterminism.

**Rationale**: Unit tests prove the parts work; E2E tests prove the product works for the people
using it, and they guard the user experience against regressions.

### IV. Clean, Simple User Experience

The user interface MUST be clean, simple, and focused on helping the user accomplish their goal
with minimal effort.

- Every screen MUST have one clear primary action; secondary actions MUST be visually
  subordinate. Remove any element that does not serve the user's current task.
- UI MUST be built from a shared, consistent set of components, spacing, typography, and color
  tokens; one-off styling requires justification.
- Every interactive flow MUST define its loading, empty, error, and success states, and errors
  MUST tell the user what happened and how to recover in plain language.
- Interfaces MUST be accessible: WCAG 2.2 AA contrast, full keyboard operability, visible focus,
  and semantic markup with proper labels.
- Layouts MUST be responsive and usable from mobile to desktop widths.
- User-perceived interactions MUST feel immediate: provide feedback within 100 ms and avoid
  layout shift during loading.

**Rationale**: An amazing user experience comes from clarity and consistency, not from feature
count. Simple interfaces are easier to learn, easier to test, and easier to maintain.

### V. Simplicity & Maintainability

Build the simplest thing that satisfies the current, specified requirements.

- YAGNI: speculative features, abstractions, and configuration MUST NOT be added without a
  present requirement.
- New dependencies MUST be justified by clear value over a small in-house implementation and
  MUST be actively maintained.
- Names MUST reveal intent; functions MUST be short and do one thing; duplication is removed
  during the refactor step once a pattern is proven (rule of three).
- Any deviation from these principles MUST be recorded in the plan's Complexity Tracking table
  with the simpler alternative that was rejected and why.

**Rationale**: Simplicity in code mirrors simplicity in the UI; both reduce defects and keep the
team fast.

## Testing Standards & Quality Gates

The following gates MUST pass before any change is merged:

1. **Test pyramid**: the suite consists mostly of fast unit tests, a focused layer of integration
   or contract tests at module and service boundaries, and E2E tests for user journeys.
2. **Coverage**: changed code MUST be covered by tests; overall line coverage for domain and UI
   logic MUST NOT decrease. Coverage is a floor, not a goal; untested behavior is still a defect.
3. **CI**: linting, type checking (where the language supports it), unit, integration, and E2E
   suites MUST run automatically on every pull request and MUST be green to merge.
4. **Accessibility**: automated accessibility checks (e.g., axe) MUST run as part of the E2E
   suite on every primary screen and report zero serious or critical violations.
5. **Visual consistency**: UI changes MUST include a screenshot or recording in the pull request
   so reviewers can evaluate the experience, not just the code.

## Development Workflow

1. **Specify**: each feature begins with a spec that defines prioritized user stories and
   acceptance scenarios written from the user's perspective.
2. **Plan**: the plan MUST pass a Constitution Check against Principles I–V before design work
   proceeds, and again after design.
3. **Tasks**: test tasks (unit and E2E) MUST precede their corresponding implementation tasks in
   the task list.
4. **Implement**: follow Red-Green-Refactor for every task; commit in small, reviewable
   increments with passing tests.
5. **Review**: every pull request requires at least one reviewer who verifies test-first
   evidence, SOLID boundaries, E2E coverage of affected journeys, and UX consistency.

## Governance

This constitution supersedes all other development practices for this project. Where a template,
guide, or habit conflicts with it, the constitution wins.

- **Amendments**: changes MUST be proposed via pull request that edits this file, states the
  motivation, includes a Sync Impact Report, and describes any migration needed for existing
  code or artifacts. Amendments take effect on merge.
- **Versioning**: this document follows semantic versioning. MAJOR for removing or redefining a
  principle in a backward-incompatible way; MINOR for adding a principle or section or materially
  expanding guidance; PATCH for clarifications and wording fixes.
- **Compliance**: every plan and pull request review MUST verify compliance with the Core
  Principles and Quality Gates. Justified exceptions MUST be documented in the plan's Complexity
  Tracking table; unjustified violations block merge.
- **Review cadence**: the constitution SHOULD be reviewed at least once per quarter, or whenever
  repeated exceptions suggest a principle no longer fits the project.

**Version**: 1.0.0 | **Ratified**: 2026-11-04 | **Last Amended**: 2026-11-04
