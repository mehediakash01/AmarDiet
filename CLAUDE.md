# AGENT & COPILOT EXECUTION CONSTRAINTS

1. **Source of Truth**: Refer strictly to `PROJECT_BUILD_GUIDE.md`.
2. **Phase Isolation**: Build ONLY one phase at a time per Section 6. Do not jump ahead.
3. **No Mocking/Placeholders**: Never generate static placeholder data or empty `onClick={() => {}}` handlers in UI components. Every component must bind to live state/IndexedDB/API calls.
4. **Deterministic Math**: NEVER use AI or LLMs for arithmetic or nutrition math. All calculations belong in `packages/nutrition-engine`.
5. **Cuisine Neutrality**: Treat all food data as a single universal dataset. Never filter or restrict food items by cuisine or tier.
6. **Data Contract**: Validate all schema structures using Zod before persisting.

## Agent skills

### Issue tracker

Issues and specs live in GitHub issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical five-role triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context (`GLOSSARY.md` + `docs/adr/` at the repo root). See `docs/agents/domain.md`.