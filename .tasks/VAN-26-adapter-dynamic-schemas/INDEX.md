# VAN-26 — Dynamic Adapter Schemas for Create/Update Forms

**Status**: Planning
**Linear**: [VAN-26](https://linear.app/vanch3d/issue/VAN-26/dynamic-adapter-schemas-for-createupdate-forms)
**Branch**: TBD

## Summary

The `mutateAdapter` create/update forms use a static `AdapterSchema` from the OpenAPI spec, which only has `id`, `type`, `config` (opaque JsonNode), and `status`. The real adapter type definitions include per-type `configSchema` and `uiSchema` that define the actual fields (connection URI, polling interval, security policy, etc.). These are completely missing from the mutation flow.

## Links

- [TASK_PLAN.md](./TASK_PLAN.md) — Full analysis and implementation plan
