# Task Plan — Supplementary Domain Ontology

## Architecture

- Modular injection: each module is a TypeScript file exporting a string constant
- `assembleDomainOntology()` function composes all modules
- Phase 1: always inject all modules; selective injection deferred to future optimization

## Files

| File | Action |
|---|---|
| `server/ontology/core.ts` | Created — core ontology (~1,500 tokens) |
| `server/ontology/datahub.ts` | Created — Data Hub deep dive (~1,200 tokens) |
| `server/ontology/adapters.ts` | Created — adapter context (~500 tokens) |
| `server/ontology/index.ts` | Created — module registry + assembler |
| `server/system-prompt.ts` | Modified — imports from ontology modules |
| `server/ontology/README.md` | Created — human-readable reference |

## Progress

- [x] Phase 1: Create core.ts module
- [x] Phase 2: Create datahub.ts module
- [x] Phase 3: Create adapters.ts module
- [x] Phase 4: Create index.ts assembler
- [x] Phase 4: Update system-prompt.ts
- [x] Phase 4: Create README.md
- [x] Phase 4: Create task tracking
- [x] Verify: pnpm build succeeds
