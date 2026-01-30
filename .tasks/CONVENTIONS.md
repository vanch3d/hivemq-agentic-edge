# Task Tracking Conventions

All work is tracked under `.tasks/` with one subfolder per task, named with a sequential ID prefix (e.g. `00001-core-application`).

## Folder Structure

```
.tasks/
  CONVENTIONS.md              ← This file (rules for all agents)
  <taskid>-<slug>/
    INDEX.md                  ← Table of contents for the task folder
    TASK_BRIEF.md             ← What the user asked for (requirements only)
    TASK_PLAN.md              ← Architecture decisions, plan, progress
    ...                       ← Any other documents as needed
```

## Document Roles

| Document | Contains | Does NOT contain |
|----------|----------|------------------|
| **TASK_BRIEF.md** | User's requirements, objectives, scope, and any follow-up requests | Implementation details, architecture decisions, progress checklists |
| **TASK_PLAN.md** | Architecture decisions, file structure, implementation steps with progress checkboxes | User's original requirements (reference the brief instead) |
| **INDEX.md** | Table of contents listing every document in the task folder with a one-line description | Actual task content |

## Rules

1. **TASK_BRIEF is append-only for requirements.** When the user adds or changes requirements, update the brief. Never put planning or progress in the brief.
2. **TASK_PLAN tracks what you decided and where you are.** Use checkboxes (`- [x]` / `- [ ]`) for progress. Update them as you go.
3. **Keep INDEX.md current.** When you add a new document to the task folder, add a row to the index.
4. **Create additional documents as needed.** For example: `DECISIONS.md` for lengthy trade-off discussions, `ISSUES.md` for blockers, `CHANGELOG.md` for a log of changes. Always add them to the index.
5. **Task IDs are zero-padded to 5 digits** (e.g. `00001`, `00002`).
6. **Slug should be short and descriptive** using lowercase kebab-case.
