# Battle Runtime Primitive Inventory

Task PBA13G audited production runtime/domain primitives with:

- `rg -n 'slotLevel|rangeFeet|movementCostFeet|distanceMovedFeet|usesRemaining|attackBonus|discoveryDc|escapeDc|reachFeet|stackDepth|number|string|boolean' packages/battle-runtime/src packages/mcp/src packages/shared/src packages/surface/src packages/character-creation-runtime/src`
- `rg -n 'SpellSlotLevel|MovementFeet|ResourceCount|DifficultyClass|AbilityModifier|ElapsedTimeTicks' packages`

## Replaced With Existing Shared Types

- Spell invocation `slotLevel` and durable Spell Slot state now use
  `SpellSlotLevel`.
- Spell invocation `rangeFeet`, area radius, movement costs, movement distance
  updates, combatant distances, reach constraints, and battle movement budget
  state now use `MovementFeet`.
- Character and Stat Block mutable use counters and spell slot counts/expended
  values now use `ResourceCount`.
- Hide/Search discovery DCs, Grapple escape DCs, concentration DC holes, and
  ability-check/grapple holes now use `DifficultyClass`.
- Weapon and spellcasting ability modifiers now use `AbilityModifier`; attack
  roll bonuses use `AttackBonus` only at attack-roll boundaries.
- After-damage reaction amounts and concentration damage holes now use
  `DamageAmount`.

## Added Shared Domain Types

- `AttackBonus` belongs in `@dnd/shared` because weapon attacks, spell attacks,
  Stat Block attacks, and future non-battle projections all use the same d20
  attack-roll modifier concept.
- `MovementDeltaFeet` belongs in `@dnd/shared` because speed-changing effects
  need signed feet deltas; `MovementFeet` is intentionally non-negative and
  would misrepresent speed reductions.

## Added Package-Local Domain Types

- `BattleReplayStackDepth` belongs in `@dnd/battle-runtime` because it is a
  battle replay/interrupt protocol counter, not a general counted rules
  resource.

## Parsed At Boundary Only

- `CharacterBattleSpellcastingInit` keeps raw `spellLevel`, `count`, and
  `expended` numbers so invalid initialization input is representable and can
  be rejected at `startBattle`. `CharacterBattleSpellcastingState` is the
  durable parsed state and carries `SpellSlotLevel`/`ResourceCount`.
- `CharacterBattleResourceInit.usesRemaining` remains raw input; the battle
  reducer parses it into `CharacterBattleResourceState.usesRemaining`.
- `BattleFillEncoded` and MCP tool schemas keep raw JSON primitives. Decoding
  maps them into `BattleFill`, `BattleCombatantDistance`, `CombatantId`, and
  other branded runtime values before resolution.

## Deferred With Owner Rationale

- Surface-authored numeric fields such as Stat Block `reachFeet`,
  `rangeFeet`, `attackBonus.value`, and limited-use authored counts still live
  on `@dnd/surface` records. Battle-runtime now parses those into branded
  runtime support-profile projections where it consumes them. Follow-up task
  PBA15A owns the full Surface and character-creation-runtime primitive
  migration after the current promoted battle feature-parity queue.
- Character-creation support gates still contain authored-choice and validation
  primitives at their package boundary. Follow-up task PBA15A owns converting
  durable post-parse domain values to package-owned or shared domain types
  without blocking promoted battle-runtime feature restoration.
- Generic d20 roll totals, damage dice counts/sizes, literal authored numeric
  values, array lengths, and validation issue pair counts remain ordinary
  numbers. They are calculation primitives or structural counts, not durable
  domain values.
- Booleans that represent binary runtime facts such as `usedThisTurn`,
  `available`, `reactionAvailable`, and saving-throw success remain booleans
  because the domain has exactly two states at those fields and no richer
  lifecycle is currently encoded there.
