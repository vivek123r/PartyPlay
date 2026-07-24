# Complex Task Orchestration & Subagent Rule Protocol

## 🎯 Scope & Trigger Condition
This rule automatically applies whenever the user submits a non-trivial or complex request (e.g., building a new game feature, physics overhaul, 3D projection upgrade, architectural refactoring, or multi-component integration).

---

## 📋 Rule 1: Multi-Phase Architecture & Granular TODOs
For any complex task, the agent MUST:
1. Divide the objective into clear, sequential **Phases** (e.g., Phase 1: Architecture & Math, Phase 2: Engine Implementation, Phase 3: Visual Polish, Phase 4: Verification).
2. Under each Phase, list granular, actionable **TODO items**.
3. Track and check off TODO items as each phase completes.

---

## 🤖 Rule 2: Subagent Model Tier Selection & Parallel Dispatch
When dispatching subagents via `define_subagent` and `invoke_subagent`:
- 🧠 **Pro Tier (`Model: "pro"`)**: Assigned for deep reasoning, architectural design, complex 3D math/physics calculations, and high-risk refactoring.
- ⚡ **Flash Tier (`Model: "flash"`)**: Assigned for fast file lookups, rapid search/grep operations, log extraction, and targeted code edits.
- 🔀 **Parallel Control**: Spawn multiple specialized subagents simultaneously to execute independent tasks concurrently.

---

## 🛠️ Rule 3: Persistent Memory & Zero Regression
- Always preserve API contracts and existing feature flags.
- Verify every phase empirically with `npx tsc --noEmit` and production builds before declaring completion.
