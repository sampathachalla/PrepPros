<!--
Sync Impact Report
- Version change: unversioned template -> 1.0.0
- Modified principles:
  - Template Principle 1 -> I. Server-Owned Meal Planning Rules
  - Template Principle 2 -> II. Privacy and Household Isolation
  - Template Principle 3 -> III. Typed Contracts at Every Boundary
  - Template Principle 4 -> IV. Resilient User Journeys
  - Template Principle 5 -> V. Small, Verifiable Changes
- Added sections:
  - Product and Technical Constraints
  - Development Workflow and Quality Gates
- Removed sections: none; template placeholders were resolved
- Follow-up TODOs: none
-->
# PrepPros Constitution

## Core Principles

### I. Server-Owned Meal Planning Rules

The API MUST be the source of truth for household membership, roles, calendar state,
meal responses, suggestion decisions, serving counts, and shopping-list derivation.
The mobile app MAY present optimistic or cached state, but it MUST NOT invent or
independently enforce business outcomes that can differ from the server. State
transitions such as draft, voting, fixed, and reopened MUST be explicit,
deterministic, and safe to repeat. Changes to these rules MUST cover authorization,
time boundaries, absent members, ties or defaults, and concurrent requests.

Rationale: every household member must see the same plan, and the cook must be able
to trust the final quantities.

### II. Privacy and Household Isolation

Every protected API operation MUST authenticate the caller and authorize access to
the specific user- or household-owned resource. User-supplied identifiers MUST NOT
be trusted as proof of ownership or membership. Inputs MUST be validated at the
request boundary, secrets MUST remain in environment or secret-storage systems, and
tokens or credentials MUST NOT appear in source, logs, analytics, backups, or error
messages. Password handling remains with Supabase; PrepPros MUST store only the
profile and provider data required by the product. Backup, scraping, research-agent,
and telemetry integrations MUST minimize personal data and preserve the same access
boundaries as the primary database.

Rationale: recipes, schedules, preferences, and household membership are private
user data shared only within an intentionally joined household.

### III. Typed Contracts at Every Boundary

API request and response shapes MUST be validated with Zod or an equivalent runtime
schema at untrusted boundaries and represented with TypeScript types in application
code. Mobile consumers and API producers MUST agree on field names, nullability,
enums, date formats, error behavior, and lifecycle states. A contract change MUST
update the server schema and behavior, the mobile type and consumer, and relevant
specification or tests in the same change. Dates that represent meal days MUST use
an explicit calendar-date format and MUST NOT silently shift with timezone
conversion. Database schema changes MUST use reviewable Prisma migrations and MUST
define how existing data remains valid.

Rationale: PrepPros spans a React Native client, HTTP API, PostgreSQL database, and
external services; explicit contracts prevent silent cross-layer failures.

### IV. Resilient User Journeys

Core journeys—sign-in, household access, calendar planning, meal voting, meal prep,
shopping, and recipe saving—MUST expose clear loading, empty, success, and actionable
error states. Network retries and background work MUST be bounded, idempotent where
possible, and safe across process restarts. Slow external operations such as social
content extraction or research MUST run asynchronously when they would otherwise
block the user, persist their status, and report progress or failure without losing
the user's original action. External service failure MUST NOT corrupt household or
meal-plan state.

Rationale: the app is used while coordinating real meals, often on mobile networks,
so partial failure must be recoverable and understandable.

### V. Small, Verifiable Changes

Implementations MUST make the smallest change that fully satisfies the approved
specification. Existing modules, components, schemas, design tokens, and dependencies
MUST be reused before new abstractions or packages are introduced. Unrelated
refactors, renames, formatting churn, and cleanup MUST be separated from feature
work. Each change MUST state its assumptions and acceptance criteria and MUST add or
update focused tests when behavior, contracts, permissions, or state transitions
change. Validation results MUST name the exact checks run; a check MUST NOT be
reported as passing unless it actually ran.

Rationale: narrow changes are easier to review, safer to deploy, and easier to
diagnose across the mobile and API layers.

## Product and Technical Constraints

- PrepPros is a household meal-planning product. The primary experience MUST remain
  usable on iOS and Android through Expo/React Native and Expo Router; web support is
  secondary unless a feature specification says otherwise.
- The mobile app MUST use shared services for backend selection, authentication, and
  API transport. Feature screens MUST NOT hard-code deployment URLs or credentials.
- The API uses Node.js, Express, TypeScript, Zod, Prisma, and PostgreSQL. Modules MUST
  preserve the established route/controller/service/repository separation when it
  clarifies validation, business policy, and persistence ownership.
- Supabase is the authentication authority. PostgreSQL/Prisma is the application-data
  authority. Synchronization between them MUST be explicit and recoverable.
- Calendar and meal-prep rules MUST remain centralized under the API calendar and
  meal-prep domains. Presentation-specific logic belongs in mobile components,
  hooks, and stores and MUST not redefine server policy.
- Accessibility, safe-area behavior, readable contrast, touch-target sizing, and
  dynamic loading/error feedback MUST be considered for every changed mobile flow.
- New dependencies, background services, or externally hosted integrations MUST have
  a documented product need, failure mode, privacy impact, and operational owner.

## Development Workflow and Quality Gates

1. A feature begins with an approved specification describing user outcomes,
   boundaries, edge cases, and measurable acceptance criteria.
2. The implementation plan MUST identify affected mobile, API, database, external
   integration, privacy, migration, and rollback concerns before coding begins.
3. Changes MUST follow the existing architecture and keep business rules in the
   owning domain. Cross-layer behavior MUST be implemented as one coherent contract.
4. Reviews MUST verify household isolation, role permissions, input validation,
   calendar-date handling, state-transition invariants, failure states, and migration
   safety wherever those concerns apply.
5. Relevant focused tests and static checks MUST be identified for the change.
   Execution follows the repository's active testing instructions; any checks not run
   MUST be reported as not run with the associated residual risk.
6. Database or API compatibility changes MUST include rollout and rollback notes.
   Destructive data operations require an explicit migration and recovery plan.
7. User-visible behavior changes MUST update durable documentation or the relevant
   Spec Kit artifacts before the work is considered complete.

## Governance

This constitution is the highest-priority engineering policy for PrepPros. Feature
specifications, plans, tasks, reviews, and implementation decisions MUST demonstrate
compliance. If another repository document conflicts with it, the stricter security
or data-protection requirement applies while the conflict is resolved.

Amendments MUST be proposed as a reviewable change to this file with a rationale, a
Sync Impact Report, and any migration needed for active specifications or code. The
project owner approves amendments. Versioning follows semantic versioning: MAJOR for
removing or incompatibly redefining a principle or governance rule, MINOR for adding
a principle or materially expanding mandatory guidance, and PATCH for clarifications
that do not change obligations.

Every feature review MUST include a constitution check. Exceptions MUST be explicit,
time-bounded, documented with risk and remediation, and approved by the project
owner. Repeated exceptions require a constitution amendment rather than informal
precedent.

**Version**: 1.0.0 | **Ratified**: 2026-11-07 | **Last Amended**: 2026-11-07
