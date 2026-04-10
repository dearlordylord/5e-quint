# Closed Mechanical DAG

## Status

The mechanical/rulewise DAG is closed. Do not use this file to schedule new
mechanical runbooks unless new SRD/rules work is explicitly added.

Current active planning now lives in [ACTIVE_PLAN.md](./ACTIVE_PLAN.md).

## Closed Result

- DAG Runbooks 4-8 were completed and removed from the active tree.
- The final mechanical parity tail, including Fire Shield reactive payload
  parity, landed before MCP/product work resumed.
- No mechanical implementation nodes remain ready or blocked.

## Remaining Tail

Only product/MCP-tail work remains outside the closed mechanical DAG:

- `dm-override`
- `transcript-port-to-dnd`

Keep those lower priority than SRD coverage and domain-language ownership unless
explicitly reprioritized.

## Historical Note

This file is intentionally small. The deleted runbook files remain available in
git history; active scheduling should happen in [ACTIVE_PLAN.md](./ACTIVE_PLAN.md)
instead of reviving old runbook queues.
