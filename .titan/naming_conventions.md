# NAMING CONVENTIONS

**Document Class:** Technical Governance
**Authority:** Subordinate to `coding_standards.md`, works alongside it. Binding on all code, files, and repository artifacts.

---

## 1. General Naming Rules

- Names must describe **purpose**, not implementation detail (`userRepository`, not `sqlUserHelper1`, unless the implementation detail is genuinely the point, e.g. `PostgresUserRepository` as a concrete class implementing a `UserRepository` interface).
- Avoid abbreviations unless they are universally understood in context (`id`, `url`, `config` are fine; `usrMgr` is not).
- Booleans read as questions/assertions: `isActive`, `hasPermission`, `canRetry` — not `active`, `flag1`.
- Avoid negative booleans (`isNotValid`) — prefer `isValid` and negate at the call site if needed.
- Plural names for collections (`users`, `orderIds`), singular for single entities (`user`, `orderId`).

## 2. Casing Conventions (Applied Per Ecosystem)

| Element | JS/TS | Python | General fallback |
|---|---|---|---|
| Variables/functions | `camelCase` | `snake_case` | follow ecosystem convention |
| Classes/Types/Interfaces | `PascalCase` | `PascalCase` | `PascalCase` |
| Constants (true constants) | `UPPER_SNAKE_CASE` | `UPPER_SNAKE_CASE` | `UPPER_SNAKE_CASE` |
| Files (code) | `kebab-case.ts` or `camelCase.ts` per project convention, chosen once and applied consistently | `snake_case.py` | consistent within project |
| Directories | `kebab-case/` | `snake_case/` | consistent within project |

Once a specific ecosystem convention is chosen in `tech_stack.md`, it is binding — do not mix conventions within the same codebase.

## 3. File & Directory Naming

- One primary export/responsibility per file where practical; the filename should match that responsibility (`userService.ts` exports the user service).
- Test files mirror the file under test with a suffix: `userService.test.ts`, `test_user_service.py`.
- Governance artifacts (this directory) use `kebab-case.md` and numeric prefixes where ordering matters (`phase-001-requirements.md`, `adr-0001-...` if split into individual files later).

## 4. Git Conventions

### Branches
`<type>/<short-description>`, e.g. `feature/user-auth`, `fix/login-crash`, `chore/update-deps`, `docs/architecture-update`.

### Commit Messages (Conventional Commits)
```
<type>(<scope>): <short summary>

<optional body explaining why, not just what>
```
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `security`.

Example: `feat(auth): add JWT refresh token rotation`

### Pull Requests
Title mirrors the primary commit type/summary. Description follows `templates/pr-template.md` and must reference the relevant phase (`phases/phase-00X-*.md`) and any ADR touched.

## 5. API & Data Naming (Once Applicable)

- REST endpoints: plural nouns, kebab-case paths (`/api/user-profiles/:id`), HTTP verbs carry the action (no `/getUser` endpoints).
- Database tables: plural, `snake_case` (`user_profiles`).
- Database columns: `snake_case`, foreign keys as `<singular_table>_id` (`user_id`).
- JSON payload keys: `camelCase` for JS/TS-facing APIs unless integrating with a system that mandates otherwise (record the exception as an ADR).

## 6. Naming Things That Don't Exist Yet

When scaffolding for a future phase, name placeholders explicitly as placeholders (`UnimplementedPaymentGateway`) rather than giving them a name indistinguishable from a real implementation — this prevents a future agent from mistaking a stub for production-ready code.
