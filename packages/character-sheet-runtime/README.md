# @dnd/character-sheet-runtime

Owns player-character in-play state: damage, conditions, expenditures, rests,
and sheet actions. Durable build and progression facts belong to
[`CharacterBuild`](../character-creation-runtime/README.md). Battle projection
and settlement belong to
[`@dnd/character-battle-runtime`](../character-battle-runtime/README.md); this
package must not depend on `@dnd/battle-runtime`.

## Choose an entry point

All subpaths below are under `@dnd/character-sheet-runtime`.

| Need                                                              | Entry point                                                                                                                               |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Complete application API                                          | [Package root](src/index.ts)                                                                                                              |
| Composition or external-consumer contract                         | [`/consumer-protocol`](src/consumer-protocol.ts), the single protocol owner re-exported by the root                                       |
| Structural fresh-sheet projections and construction-issue schemas | [`/fresh-character-sheet-schema`](src/fresh-character-sheet-schema.ts), without loading the application API                               |
| Fresh construction with an installed Stat Block catalog           | [`/source-free-construction`](src/source-free-construction.ts), sharing the construction algorithm without the root's bundled SRD default |
| Sheet projection for Battle initialization                        | [`/battle-init-protocol`](src/battle-init-protocol.ts)                                                                                    |

## State contracts

- Store mutable state and selections. Derive Hit Point Maximum, Hit Dice
  capacity and die size, ordinary Spell Slot and Pact Slot capacities, and
  feature-resource capacities from `CharacterBuild` and installed Unit facts.
  `hitPointMaximumReduction` and `createdSpellSlots` are mutable deltas, not
  replacement capacities.
- `hitPoints` owns current and Temporary Hit Points, Death Saving Throws,
  Stable state, death, and Unconscious (including positive-HP Knock Out).
  `conditions` excludes that HP-owned lifecycle. Current HP cannot exceed the
  effective maximum; battle settlement returns non-Unconscious conditions.
- Fresh construction and parsing establish full build-derived HP, zero
  Temporary HP and maximum reduction, and unspent initial play state. Use
  `createFreshCharacterSheet` for first construction,
  `parseFreshCharacterSheet` for stored fresh state, `parseCharacterSheet` for
  stored in-play state, and `rebuildCharacterSheet` for mutable reconstruction.
  Independent construction failures accumulate into one flat non-empty list of
  structured issues; joined display messages are not stored in issues.
- Fresh conditions, spent Hit Dice, rest-feature uses, resource expenditures,
  and spellcasting slot-expenditure lists use `[]`. Feature-owned absence means
  inapplicable; an applicable Wild Shape roster is non-empty. Expenditure
  exceptions: missing ordinary slot levels and absent Pact expenditure mean
  zero spent; the ordinary expenditure list exists only on spellcasting sheets.
- Store only nonzero resource and slot expenditures. Admit only supported
  feature-resource profiles. Free-cast resources are keyed by the Spell Access
  pair of source Unit and Spell Unit, independently of ordinary and Pact Slots.
- Static projections remove root-record identity and Material-component prose.
  Production owners consume projected facts instead of re-reading Surface
  records or dispatching on authored identity.

## Find the behavior owner

Read the linked owner and its adjacent tests before changing that behavior.

- **Construct or restore a sheet:** [lifecycle](src/sheet-lifecycle.ts),
  [construction core](src/fresh-character-sheet-construction-core.ts),
  [stored parser](src/stored-sheet-parser.ts), and [sheet types](src/sheet-types.ts)
  own correlation and fresh-state checks.
- **Change HP, death, or recovery:** [HP](src/hit-points.ts) and
  [healing/rest benefits](src/healing-rest-benefit.ts). Lay On Hands healing and
  Poisoned removal spend the same pool.
- **Change rests or reselections:** [rests](src/rests.ts) owns eligibility,
  timing, interruption, recharge, and installed-feature Weapon Mastery
  reselection limits. [Healing/rest benefits](src/healing-rest-benefit.ts) owns
  Hit Dice and Arcane Recovery's budget, slot-level limit, and
  once-per-Long-Rest use. Long Rest clears maximum reduction and temporary
  created slots; free-cast expenditure survives Short Rest and clears on Long Rest.
- **Apply a spell-granted rest benefit:**
  [healing/rest benefits](src/healing-rest-benefit.ts) requires caller-provided
  completed-cast recipient eligibility, spends the slot at completion, applies
  capped healing and Short Rest benefits, and records same-spell recipient
  lockout. Callers own range maintenance and interruption tracking.
- **Change resources or slots:** [resources](src/resources.ts) and
  [slots](src/spell-slots.ts) own spends and recovery; retain ordinary/Pact
  distinctions.
- **Change Spell Access or ritual admission:**
  [class-feature spells](src/class-feature-spells.ts),
  [prepared access](src/prepared-spell-access.ts), and
  [invocation](src/spell-invocation.ts). Preserve learned versus always-prepared
  access and the selected casting ability. Spellbook rituals derive from access,
  ritual shape, and installed feature facts; a retained Unit reference alone is
  insufficient. Route projections retain selected-reference `qRoute` evidence
  without a ritual ledger.
- **Change Armor Class:** [AC](src/armor-class.ts) consumes projected equipment
  and installed feature formulas. Multiple class-feature base formulas require
  `baseChoice`. Mutable carried/equipped workflows remain a future
  equipment-module responsibility, initialized from build equipment.
- **Admit Surface mechanics:** [spell](src/character-spell-projection.ts),
  [feature](src/character-feature-projection.ts), and
  [equipment](src/equipment-definition-projection.ts) projections own static
  admission. Keep build selections, actors, expenditures, rests, current state,
  and generated Slice membership outside them. Spell material
  presence/cost/consumption and equipment facts remain correlated; nested
  authored expression must be narrowed before execution and excluded from
  execution results. Partial projections report exact consumed/unowned paths;
  feature projections accumulate independent represented-branch failures.

## Verification

Run `pnpm check:character-sheet-runtime-split` from the repository root for
package-boundary changes. Use adjacent `*.test.ts` files for focused behavior
checks; [package scripts](package.json) separate ordinary tests from MBT.

New reducer semantics must extend a
[rules-kernel semantic obligation](../../plans/rules-kernel-coverage/) and
connect QNT ownership to production TypeScript through MBT or deterministic QNT
replay. Follow the [QNT/MBT execution policy](../../docs/agents/QNT-MBT.md) for
those checks and the [repository verification policy](../../CLAUDE.md) for
broad gates and reviewer convergence.
