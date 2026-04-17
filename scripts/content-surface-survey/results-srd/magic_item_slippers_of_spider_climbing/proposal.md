# Slippers of Spider Climbing

This unit fit the current authored surface as a passive `magic_item` with:

- `requiresAttunement = True`
- passive `grant_speed`
- `speedKind = "climb"`
- `feet = { kind = "walk_speed" }`

Explicit carveout:

- The item text also says the wearer can move on vertical surfaces and ceilings while leaving hands free, and that this movement fails on slippery surfaces such as ice or oil.
- This package already makes the same carveout for [`Spider Climb`](./content/spider_climb.dhall): only the linked Climb Speed grant is modeled.
- No widening is proposed here because local precedent already treats those clauses as spatial / terrain adjudication outside the deterministic content surface.
