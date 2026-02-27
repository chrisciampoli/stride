# Stride - Claude Code Guidelines

## CRITICAL: Plugin & Memory Usage

**Every conversation MUST follow this workflow. This is non-negotiable.**

### Session Start (ALWAYS do these first)
1. Run `check_onboarding_performed` via Serena — complete onboarding if needed
2. Run `list_memories` via Serena — read all relevant memories before starting work
3. Check available skills via the superpowers system

### Serena (MCP Plugin) — USE IN ALL PHASES
- **Onboarding**: `check_onboarding_performed` at conversation start. Complete if not done.
- **Memories**: `list_memories` + `read_memory` at session start. `write_memory` / `edit_memory` after significant work.
- **Code Navigation**: `find_symbol`, `get_symbols_overview`, `find_referencing_symbols` for targeted code understanding instead of reading entire files.
- **Editing**: `replace_symbol_body`, `replace_content`, `insert_after_symbol` for precise edits.
- **Search**: `search_for_pattern` for flexible codebase search.

### Memory Recording (ALWAYS do after significant work)
After completing any meaningful task, **always** record what was done to Serena memories:
- What files were created/modified and why
- Architecture decisions made
- Patterns established or changed
- Current state of implementation progress
- Any gotchas or learnings discovered

This ensures the next conversation has full context without re-reading the entire codebase.

### Expert Panel (`.claude/agents/`)
**8 PhD-level expert agents MUST be used during all planning and implementation sessions.**

| Expert | File | Use During |
|--------|------|------------|
| Product Owner | `product-owner.md` | All planning, scope questions |
| Project Manager | `project-manager.md` | All planning, parallel coordination |
| UI/UX Engineer | `ui-ux-engineer.md` | All planning, any UI changes |
| Software Architect | `software-architect.md` | All planning, structural changes |
| Software Engineer | `software-engineer.md` | All planning + implementation |
| QA Engineer | `qa-engineer.md` | All planning + implementation |
| Marketing Expert | `marketing-expert.md` | All planning, user-facing features |
| Human Behaviour Analyst | `human-behaviour-analyst.md` | All planning, engagement features |

**Rules:**
- **Planning sessions**: Launch ALL 8 as parallel `Task` subagents (`model: opus`)
- **Implementation sessions**: Launch RELEVANT experts as parallel `Task` subagents
- **Every agent MUST use Context7** (`resolve-library-id` + `query-docs`) BEFORE making decisions
- **Every agent MUST use all available plugins**: Context7, Serena, Supabase MCP, Playwright
- Read agent `.md` files for full prompts before dispatching

### Subagents
- Use parallel Task agents for independent work (e.g., reading multiple files, independent file modifications).
- Use `Explore` agents for broad codebase research.
- Use `Plan` agents for architecture decisions.
- **ALWAYS dispatch expert panel agents via Task tool for planning and implementation.**

### Context7
- **MANDATORY**: Every agent and every session must use Context7 for latest docs before making decisions.
- Look up Expo Router, React Query, Supabase, NativeWind docs when unsure about APIs.
- Use `resolve-library-id` first, then `query-docs` for current API documentation.

### Supabase MCP
- Use `list_tables`, `execute_sql`, `apply_migration` for database operations.
- Use `search_docs` for Supabase documentation.

### Workflow Phases
1. **Session Start**: Serena onboarding check + read memories + check skills
2. **Planning**: Use `EnterPlanMode` for non-trivial features. Read Serena memories. Use brainstorming skill. **Launch ALL 8 expert panel agents as parallel subagents.**
3. **Pre-implementation**: Read relevant files via Serena symbolic tools. Check existing patterns. Create task list. **Synthesize expert panel outputs into the plan.**
4. **Implementation**: Edit using Serena or Edit tool. Run `npx tsc --noEmit` between batches. Mark tasks complete. **Launch relevant expert agents as parallel subagents for review.**
5. **Post-implementation**: Record learnings to Serena memories. Run verification checklist. Update memories with progress.
6. **Session End**: Ensure all significant work is recorded in Serena memories for next session continuity.

## Tech Stack
- Expo SDK 54 + Expo Router v6
- React Native + NativeWind (Tailwind CSS)
- Supabase (Auth, Database, RLS)
- Zustand + TanStack React Query v5
- TypeScript (strict mode)

## Key Commands
- `pnpm install` - Install dependencies
- `npx tsc --noEmit` - Type check (must pass with zero errors)
- `npx expo lint` - Lint
- `npx expo start` - Start dev server

## Code Conventions
- No `any` casts - use proper types
- Types in `types/index.ts`
- Hooks in `hooks/` (queries) and `hooks/mutations/` (mutations)
- Path alias: `@/` maps to project root
- NativeWind `className` for styling
- Functional components only
