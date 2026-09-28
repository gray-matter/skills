---
name: refactoring
description: Use whenever the user asks to refactor, clean up, simplify, modernize, reduce complexity, remove dead code, or plan a restructuring of existing code — even if they just describe messy or confusing code, ask "what should we do about this file/module," or want a second opinion on whether something is still needed, without using the word "refactor." Produces a reviewed, coding-agent-ready task list; stops short of changing code unless asked to proceed.
---

# refactoring

## Principles

- **Question transition code before assuming it's load-bearing.** Codebases pass through multiple owners and migrations; a block that looks intentional may just be scaffolding nobody removed. Migration shims, feature flags with only one reachable branch, and patterns that no longer match the rest of the codebase are candidates for deletion — flag them for confirmation rather than treating them as untouchable.
- **Avoid NIH, but don't assume the library always wins.** Prefer mature, widely-adopted libraries over reimplementing a solved problem — but keep custom code where it's already correct and well-tested, or where a library would add more surface area (dependency weight, API mismatch, learning curve) than it saves. When the tradeoff isn't clear-cut, don't decide unilaterally: ask the user, and give them the features actually needed, the size of each option, and maturity signals (age, adoption, release cadence, time since last commit) — including for niche libraries, where the maturity signals matter most.
- **Lean on language and framework idioms.** The result should read like it was always written that way, not like a foreign pattern was grafted on.
- **Separate behavior changes from structural ones.** A refactor should preserve observable behavior. If you spot a bug or security issue in passing (XSS, injection, hardcoded credentials, missing validation), give it its own task rather than folding the fix into a structural change — each task should be reviewable and revertible on its own.
- **Check test coverage before recommending a touch.** For each area you plan to change, note whether it's covered. Where it isn't, either add "write tests first" as a prerequisite task or call out the risk explicitly in the task — don't assume a refactor is safe just because it compiles.

## Process

1. **Explore before planning.** Read the code like a legacy system: note ownership boundaries, migration remnants, duplicated concepts.
2. **Resolve ambiguity with the user before writing the plan — not during execution.** Every open question (library vs. custom, whether a block is really dead, scope boundaries) gets asked and answered up front. A coding agent working through task N should never need to come back to the user mid-task.
3. **Deliver the plan as an ordered task list** using the template below. Each task must be executable by a coding agent with zero context beyond what's written in it.
4. **Propose a phasing** (e.g. safe deletions and dependency bumps first, structural moves next, behavior-adjacent fixes last) — but the user has final say on ordering and batching.
5. **Stop after the plan.** Don't start implementing unless the user asks you to proceed.

## Task template

Use this for every item in the plan:

```markdown
## [Short, self-explanatory title]
**Criticality:** Critical | High | Medium | Low
**Issue:** [1–3 sentences: what's wrong and why it matters]

**For the coding agent:**
[Everything needed to execute with zero back-and-forth: file/line references,
the decision made and why, edge cases or gotchas, what "done" looks like.
If a choice (library vs. custom, scope boundary, dead-code call) was
surfaced to the user, state the resolution here — don't leave it open.]
```

**Criticality scale:**
- **Critical** — security vulnerability or correctness bug found in passing
- **High** — meaningfully reduces complexity/maintainability, or removes confirmed dead code blocking other work
- **Medium** — valuable cleanup, no urgency
- **Low** — cosmetic or speculative
