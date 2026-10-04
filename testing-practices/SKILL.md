---
name: testing-practices
description: Guide agents writing, reviewing, or maintaining automated tests so tests protect intended behavior with clear signals and reasonable maintenance cost.
---

# Testing Practices

Use this skill when adding, changing, or reviewing unit, integration, functional, or end-to-end tests. Follow the repository's instructions, existing test conventions, and the user's requested scope. These guidelines are decision aids, not a mandate to add tests to every change or to use one testing style everywhere.

## Standard for a useful test

A test should protect an intended behavior or important boundary, fail when that behavior regresses, and make its purpose and failure understandable. Keep it only when the confidence it adds is worth the cost of reading, running, and maintaining it.

Before adding a test, be able to say:

- Which behavior, risk, or contract does it cover?
- What meaningful regression would make it fail?
- What confidence does it add beyond existing tests?

If those answers are unclear, clarify the expected behavior or improve an existing test instead of adding another one. Treat coverage numbers as diagnostic signals, not as a reason by themselves to add tests.

## Workflow

1. Read relevant project instructions, nearby tests, and the available test commands. Reuse local naming, fixture, and runner conventions unless they are causing a concrete problem.
2. Establish expected behavior from the request, specification, or public contract. Use the implementation and existing tests as evidence, not as the sole definition of correct behavior. If they conflict, surface the ambiguity rather than encoding a guess.
3. Choose the narrowest test scope that gives confidence about the risk. Add a broader test when it checks a real boundary or user journey that narrower tests cannot establish.
4. Write a small, clear scenario with relevant setup and assertions tied to its expected outcome. Keep the key inputs and reason for the expectation visible; extract helpers only when they clarify repeated concepts without hiding the scenario.
5. After changing tests, run the focused test command when available. Run broader checks when a concrete risk or project requirement calls for them. Report what ran and anything you could not run.

For a bug fix, verify when feasible that the test fails for the reported defect before the fix and passes afterward.

## Choosing scope

- **Unit or component tests:** Cover focused logic and meaningful edge cases through the unit's public interface. A unit can be a function, class, module, or other coherent boundary; don't force a one-test-per-method structure.
- **Integration tests:** Exercise important boundaries with real collaborators when practical, such as persistence, serialization, adapters, or service contracts. Use isolated data and resources.
- **Functional or end-to-end tests:** Protect a small set of high-value flows across components, especially behavior experienced by users. Assert observable outcomes and use stable, user-facing selectors where available.

The labels vary between projects. Prefer the repository's own definitions and choose tests by the confidence they provide, not by a target ratio or a rigid pyramid. Avoid repeating every lower-level case in higher-level tests.

## Keep tests clear and robust

- Organize setup, action, and outcome so a reader can follow the scenario. A test may have several assertions when together they establish one behavior; don't split tests merely to satisfy a one-assertion rule.
- Name the behavior or scenario, not just the method under test. Make failure output point toward the violated expectation.
- Test observable state and externally meaningful side effects. Check interactions only when the interaction itself is part of the contract; avoid coupling tests to incidental call order, private methods, or internal implementation details.
- Prefer simple, representative cases. Add edge cases for meaningful risks, not every theoretical input combination. Parameterize cases when that makes their shared behavior clearer.
- Keep tests independent and repeatable. Control their data and relevant sources of nondeterminism, such as time, randomness, environment, and external services. Avoid order-dependent shared state and arbitrary sleeps.
- Keep setup proportionate. Use real dependencies when they are cheap, fast, and deterministic. Use fakes or stubs to control a boundary or failure scenario; use mocks selectively. A double that disagrees with its real implementation can give false confidence, so cover important contracts with an integration test when needed.
- For browser tests, prefer accessible roles, labels, or other explicit user-facing contracts over brittle DOM structure. Use the framework's retrying assertions and waiting behavior rather than manual polling or fixed delays.

## Maintaining existing tests

When reviewing a test, check that its assertions observe the claimed behavior, a meaningful regression would fail it, and an unrelated refactor would not.

When a test fails, determine whether the product behavior regressed, the expectation is obsolete or mistaken, or the test is flaky. Don't change an assertion just to make a failure disappear. When intended behavior changes, update the tests that express that contract and remove obsolete or redundant coverage when its lack of value is clear. Fix flakiness at its cause rather than hiding it with retries or weakened assertions.

## References

Consult these for deeper rationale or examples; follow the project's framework documentation for tool-specific syntax.

- [Software Engineering at Google, Chapter 12: Unit Testing](https://abseil.io/resources/swe-book/html/ch12.html) — clarity, concise setup, public interfaces, and avoiding brittle tests.
- [Software Engineering at Google, Chapter 13: Test Doubles](https://abseil.io/resources/swe-book/html/ch13.html) — fidelity and trade-offs among real dependencies, fakes, stubs, and mocks.
- [Software Engineering at Google, Chapter 14: Larger Tests](https://abseil.io/resources/swe-book/html/ch14.html) — why and when broader tests add confidence.
- [Martin Fowler: The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) — balancing test scope, speed, and maintenance cost.
- [Playwright: Best Practices](https://playwright.dev/docs/best-practices) — framework-specific guidance for user-visible and resilient browser tests.
