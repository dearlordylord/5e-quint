# CAM6-CAM16 Review Findings

This ledger records review stabilization work and carry-forward items from the
post-CAM16 audit. It is intentionally separate from CAM17 so the MCP character
tool work can proceed without losing review findings from the completed
CAM6-CAM16 slice.

## Resolved In Review Batch

- `@dnd/battle-runtime` no longer imports `@dnd/character-creation-runtime`.
  Character Sheet to battle-seed mapping lives at the MCP green composition
  boundary.
- Battle subjects distinguish SRD Actions from runtime commands:
  `srdAction.attack` and `runtimeCommand.endTurn`. The same subject tag split
  was applied to `@dnd/surface-runtime-correction` so active docs and reducer
  code do not preserve `coreAct` vocabulary.
- Critical Hit damage now requests doubled weapon damage dice in the battle
  runtime and the battle QNT slice.
- Massive Damage and damage-at-0-HP instant death are modeled in the battle
  runtime and battle QNT slice.
- Soldier tool-choice discovery is derived from the Surface background tool
  proficiency fact, then narrowed to the currently authored Dice Set option.
- MCP green composition tests cover catalog installation, selected monster
  storage, session battle storage, and Character Sheet to battle-seed mapping.

## Carry Forward

These items are deliberately not CAM17 scope, but must be checked before or
inside CAM18 when the full MCP battle fixture lands.

1. Goblin attack support or explicit fighter-only fixture

   The Goblin Warrior stat block authors attacks in Surface, but the current
   battle runtime only discovers the character weapon Attack vertical. CAM18
   must either add minimal Goblin attack projection from the stat block or state
   explicitly that the first fixture is Fighter-attacks-only. Do not leave the
   authored Goblin attack data silently unreachable once the MCP battle fixture
   claims monster battle support.

2. Stat-block and attack projection cleanup

   Battle durable state currently carries enough stat-block-derived data to run
   the first vertical, including attack profile data with weapon records for
   character attacks. Before widening battle support, audit whether durable
   state should store only identities plus runtime facts that cannot drift from
   Surface catalogs. Avoid a second executable stat-block or attack IR.

3. Initiative input semantics

   The current green fixture uses deterministic Initiative scores derived from
   `10 + modifier`. Before CAM18 exposes battle tools, decide whether MCP
   battle start accepts caller-supplied Initiative rolls or deliberately exposes
   deterministic fixture Initiative. Tool names and docs must make that choice
   explicit.

4. Target legality

   Current target discovery is all other living combatants. That is acceptable
   for the 1v1 vertical, but not a general battle rule. Range, reach, line of
   effect, and target legality must be added before presenting the battle
   runtime as general combat support.

5. Catalog and support-gate language

   `UnitLibrary` remains a compatibility alias for `UnitCatalog`, and
   package-private `unsupported*` issues are phase narrowings. When the green
   path grows, remove aliases/narrowing language that has become semantic load
   instead of durable domain vocabulary.
