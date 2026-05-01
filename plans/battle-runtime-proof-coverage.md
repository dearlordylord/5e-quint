# Battle Runtime Proof Coverage

Date: 2026-05-01

Task: BA2 - Inventory Promoted Runtime Proof Coverage.

This inventory covers the promoted `@dnd/battle-runtime` path after BA0. It is
not a behavior-widening plan. Its job is to show what the promoted runtime
already implements, how that behavior is currently proved, and where BA3/BA10
can choose the first integrated promoted-runtime MBT candidate without
rediscovering current coverage.

## Coverage Layers

Coverage is deliberately split:

- **Deterministic battle-runtime tests:** `packages/battle-runtime/src/index.test.ts`
  exercises public runtime APIs, fixture flows, validation, and generated QNT
  parity checks.
- **Package-local QNT spec:** `packages/battle-runtime/battle-runtime.qnt` is a
  deterministic parity/reference spec for implemented behavior. It is not an
  integrated MBT driver.
- **Modular shared-algebra MBT:** `packages/surface-runtime-correction/*-mbt.qnt`
  plus `*.mbt.test.ts` replay Quint traces against reusable
  `@dnd/shared-algebras` modules. These prove small algebras, not the integrated
  `@dnd/battle-runtime` reducer flow.
- **MCP/user workflow coverage:** `packages/mcp/src/server.test.ts`,
  `packages/mcp/src/end-user-vertical.acceptance.test.ts`, and
  `packages/mcp/test-support/mcp-acceptance-scenarios.ts` prove promoted tools
  compose character creation, battle runtime, transient fill sessions, and
  post-battle handoff.
- **Integrated promoted battle-runtime MBT:** no current test drives
  `@dnd/battle-runtime` through a nondeterministic QNT trace. That is the
  explicit BA10/BA11 gap.

## Proof-Coverage Map

| Promoted behavior | Runtime owner | QNT coverage | Deterministic test coverage | Shared-algebra MBT coverage | MCP/user workflow coverage | Proof gap |
| --- | --- | --- | --- | --- | --- | --- |
| Battle id, combatant id, initiative score boundary parsing | `@dnd/battle-runtime` branded constructors in `src/index.ts` | None beyond QNT fixtures assuming valid values | `index.test.ts` checks non-empty `BattleId` and integer Initiative scores | None; scalar parsing is outside modular MBT | Tool input schemas and start-battle tests exercise valid/invalid MCP inputs | Implemented behavior gap: no integrated MBT needed unless BA10 chooses initialization boundary as the trace frontier |
| `startBattle` creates durable state from caller-built creature init, rejects empty/duplicate/over-max HP, and initializes distances | `startBattle`, `battleCreatureStateFromInit`, `battleCombatantDistances` | Slice has fixed `initialState` and helper HP mutations, but does not model generic init validation or distance maps | `index.test.ts` covers sorted Initiative, snapshot contract, over-max HP, explicit-distance validation, and spell-slot init validation | Initiative ordering is MBT-covered through shared initiative algebra; distance validation is not MBT-covered | `server.test.ts` covers composition-boundary start, character-only rosters, multiple Stat Blocks, missing Initiative, duplicate ids, over-wide character inputs, and distance errors; acceptance tests start Goblin and Skeleton battles | Implemented behavior gap: generic initialization validation is table-tested, not QNT/MBT-proved |
| Initiative order, current actor, End Turn, round wrap, and turn-resource reset | `@dnd/battle-runtime` with `@dnd/shared-algebras/initiative-algebra` and `action-economy-algebra` | Spec models `nextInitiative`, `endTurn`, self-tests, and generated parity for Fighter/Goblin turn advance and round wrap | `index.test.ts` covers End Turn, fill rejection for runtime command, snapshot current acts, and round wrap | Initiative algebra MBT covers current/next actor stack; action-economy MBT covers reset/spend resource semantics | MCP tests cover `end_turn`, pending-fill rejection, and acceptance flow actor advancement through Fighter, Wizard, Skeleton | Implemented behavior gap: no integrated battle-runtime MBT proves public `discover -> end_turn -> snapshot` flow across arbitrary traces |
| Current actor and incapacitated/zero-HP action gating | `discoverBattleActs`, `resolveBattleSubject`, `combatantCanTakeActions`, shared conditions algebra | Spec models `currentActorCanAttack` for Fighter/Goblin and `openHoles` | `index.test.ts` covers omission/rejection of Attack for Unconscious 0-HP characters and non-current actor rejection | Conditions algebra MBT covers condition set operations; it does not prove battle subject legality | MCP error/recovery tests cover stale/unavailable subjects generally | Implemented behavior gap: composed action gating is deterministic-test covered, not integrated-MBT covered |
| Attack discovery and replay holes for supported character weapon attacks | `discoverBattleActs`, `resolveAttack`, runtime-hole/dice helpers | Spec models target/roll/damage replay states for Fighter attacks | `index.test.ts` covers initial target hole, target-to-roll replay, hit-to-damage replay, miss without damage, invalid fill sequencing, weapon dice validation, critical doubled dice, action spend, and HP mutation | Attack-roll algebra has no current MBT file; runtime-dice algebra has no current MBT file. Action-economy MBT covers the action spend primitive | MCP server and acceptance tests cover Attack fill sequencing, transient fill sessions, and requires-holes errors | Implemented behavior gap and strong BA10 candidate: a narrow integrated MBT for one weapon Attack through `discoverBattleActs`/`resolveBattleSubject` would cover the current public reducer path that modular MBT does not |
| Attack roll hit adjudication, natural 1/natural 20, critical-hit damage dice | `@dnd/shared-algebras/attack-roll-algebra` plus battle critical damage validation | Spec models `attackHits` and critical damage multiplier | `index.test.ts` covers natural 1 miss, natural 20 hit, critical doubled weapon dice, and critical Ray of Frost dice validation | No modular MBT currently covers attack-roll algebra | MCP workflow covers concrete hit/miss flows, but not natural 1/20 breadth beyond fixed scenarios | Implemented behavior gap: attack-roll algebra is shared and deterministic-tested through battle fixtures, but not modular-MBT-covered |
| Temporary HP absorption, HP clamp, Stat Block death at 0 HP | `applyHpDamage`, `applyInitialZeroHpLifecycle`, `applyDropToZeroHpLifecycle` | Spec models temp HP, clamp, and `DiesAtZeroHp` lifecycle | `index.test.ts` covers Temporary HP, clamp to 0, and Goblin dead snapshot | Death-save MBT covers counters, not this composed HP lifecycle; conditions MBT covers condition operations | MCP acceptance verifies concrete HP decreases and battle closeout after positive-HP character state | Implemented behavior gap: composed HP lifecycle is deterministic/QNT-spec covered, but not modular or integrated MBT |
| Character zero-HP lifecycle scaffold: unconscious/prone/incapacitated, death failures from damage at 0 HP, instant death by massive damage | `applyDropToZeroHpLifecycle`, `applyDamageAtZeroHp`, `applyInstantDeath` with shared conditions/death-save algebras | Spec models `UsesDeathSavingThrows`, damage at 0, critical damage at 0, and massive-damage death | `index.test.ts` covers drop to 0, massive damage, damage while at 0, critical damage while at 0, and dead lifecycle projection | Death-save MBT covers counter arithmetic; conditions MBT covers condition facts. The composed lifecycle is not modular-MBT-covered | MCP handoff documents and tests reject 0-HP post-battle handoff; user workflows avoid ending with a 0-HP character | Implemented behavior gap: current damage lifecycle is covered by deterministic/QNT-spec checks, but start-turn death-save rolls and rest/handoff are future width |
| Supported Stat Block named attacks from retained `StatBlockRecord` | `supportedStatBlockAttackActionOption`, attack target/damage projection | Slice has a generic Goblin actor and `resolveGoblinAttack`, but no authored Stat Block parser | `index.test.ts` covers Goblin Warrior Scimitar/Shortbow discovery, authored attack bonus/damage, attack identity, reach/normal-range target legality, advantage bonus damage rider, and Skeleton Shortsword in workflows | Modular MBT does not cover Stat Block projection | MCP tests cover selecting Goblin/Skeleton, starting battles from Stat Blocks, and attacks through tool fills | Implemented behavior gap: authored Stat Block projection/support gates are table-tested, not QNT/MBT-proved |
| Pairwise combatant distance and supported attack target legality | `combatantDistances`, `attackTargetChoices`, attack target constraints | Slice does not model distance maps; target legality is implicit in fixed two-actor state | `index.test.ts` covers melee reach and normal ranged target filters plus invalid out-of-range target fills | No modular MBT coverage | MCP start-battle tests cover explicit distances; acceptance workflows use default distance | Implemented behavior gap: distance validation/target filtering is deterministic-test covered only |
| Damage immunities, resistances, and vulnerabilities from `StatBlockRecord` | `damageAmountAfterTargetAdjustments` at HP mutation boundary | Spec models `damageAfterAdjustments` for Skeleton vulnerability/immunity examples | `index.test.ts` covers Skeleton Bludgeoning vulnerability and Poison immunity | No modular MBT coverage | End-user and protocol acceptance cover Skeleton Bludgeoning vulnerability through Fighter Flail; Poison immunity is runtime-test only | Implemented behavior gap: deterministic and QNT-spec coverage exists; integrated MBT could include Skeleton vulnerability if BA10 wants a promoted-width candidate |
| Action Surge from retained Unit resource grants one non-Magic action, spends one use, blocks second use in same turn | `supportedUnitFeatureActs`, `resolveUnitFeature`, `grantUnitActionResource`, `spendAction` | Spec models `grantActionSurge` use spend and once-per-turn guard | `index.test.ts` covers discovery, resource spend, non-Magic restriction, second-use rejection, and defeated-actor rejection | Action-economy MBT covers reusable resource granting/spending/reset primitives, but not the Action Surge Unit support gate or once-per-turn resource state | MCP server and acceptance tests cover Fighter 2 Action Surge discovery, no-hole `resolve_battle_act`, extra Attack, and resource handoff in battle state | Implemented behavior gap and BA10 candidate: integrated MBT can prove a Unit-feature subject with public discovery/resolution and restricted action resource semantics |
| Wizard action-time spell discovery, armor-training spell gate, Magic action spend | `discoverSupportedSpellActs`, `spendMagicAction`, armor-class state/training facts | Spec models `canDiscoverSpellActs` and spell facts abstractly, but not armor-training projection | `index.test.ts` covers Magic Missile/Ray of Frost discovery and resolution; `server.test.ts` covers spell suppression when armor training blocks casting and preservation when only shield training is missing | Action-economy MBT covers Magic action spend capability in the abstract; armor-class MBT covers AC math, not spellcasting training gates | MCP acceptance covers Wizard spell acts through promoted tools | Implemented behavior gap: armor-training spell gate has deterministic MCP coverage but no package-local QNT or integrated MBT |
| Magic Missile prepared level-1 spell: all darts at one target, force damage, level-1 slot expenditure | `supportedPreparedSlotSpell`, `resolveSpellAct`, `expendSpellSlot` | Spec models spell-slot expenditure and all-darts damage arithmetic | `index.test.ts` covers target/damage holes, damage, action spend, and slot expenditure | Action-economy MBT covers resource spend only; no spell-slot MBT exists | MCP acceptance covers Magic Missile after Wizard turn comes back around and verifies slot handoff after `end_battle` | Implemented behavior gap and BA10 candidate: integrated MBT can prove an actionSpell subject with slot expenditure, public holes, and state transition |
| Ray of Frost cantrip spell attack: spell attack bonus, no slot spend, Cold damage, speed reduction until caster's next turn | `supportedCantripSpellAttack`, `resolveSpellAct`, `applySpellActiveEffects`, `expireStartOfTurnEffects` | Spec models spell attack modifier and speed-effect expiry predicate; no full public replay model | `index.test.ts` covers attack bonus, hit damage, no slot spend, effect refresh, critical dice, miss, and start-of-turn expiry after round wrap | Attack-roll and runtime-dice algebras have no modular MBT; action-economy MBT covers Magic action spend only | MCP acceptance covers Ray of Frost miss and no slot spend; hit/effect behavior is runtime-test only | Implemented behavior gap: active-effect lifecycle is deterministic/QNT-spec covered but not integrated-MBT covered |
| Snapshot projection and JSON-friendly MCP output | `snapshotBattle`, MCP `battle-state-projection` and output schemas | Spec parity tests compare selected runtime snapshots to generated QNT projections | `index.test.ts` covers MCP snapshot contract and current acts; MCP tests cover output schemas and state projection | No modular MBT coverage | MCP server/protocol tests cover registered tool schemas, structured content, result paths, and session snapshots | Implemented behavior gap: snapshot shape is contract-tested, not model-proved |
| Caller-owned transient fills and replay-from-root protocol | MCP `session-store`, `battle-tools`, battle runtime `resolveBattleSubject` | Spec models replay hole states but not MCP transient storage | `index.test.ts` covers replay fill order and invalid stale/mismatched fills at runtime level | Runtime-hole algebra has no current MBT file | MCP server and protocol acceptance cover pending fills, contradictory subject rejection, no-hole misuse, `end_turn`/`end_battle` blocking while fills are pending, and recovery guidance | Implemented behavior gap: MCP protocol is deterministic-test covered, not QNT/MBT-proved |
| Post-battle character state handoff for positive-HP characters and spell-slot expenditure | MCP `battle-handoff`, `session-store`, character list projection | No QNT coverage | MCP deterministic and in-memory protocol acceptance cover durable HP and Wizard Spell Slot handoff | No modular MBT coverage | End-user and protocol acceptance cover ending battles and listing reduced HP/spell slots | Implemented behavior gap: handoff is MCP integration-tested only; 0-HP handoff remains future width |
| Stat Block Multiattack, long-range Disadvantage, bonus-action Stat Block options, unsupported riders, broad spell effects, split-target Magic Missile, reactions, bonus-action subjects, nonlethal knockout, start-turn death-save roll, rest recovery | Not implemented in promoted battle runtime | No QNT coverage | Listed as not modeled in `packages/battle-runtime/README.md`; deterministic tests do not assert these behaviors | Some modular algebras can support pieces, such as bonus actions and death-save counters, but no integrated promoted behavior exists | MCP workflow guide records current support frontier and 0-HP handoff limit | Future-width gap: do not treat these as proof gaps for already-implemented behavior |

## Integrated MBT Boundary For BA10

BA10 should treat the current proof stack as follows:

- Modular algebra MBT already proves selected reusable primitives:
  Initiative, action economy, armor class, conditions, death-save counters, and
  ability-score algebra. These are evidence for imported helpers, not proof that
  the promoted battle runtime composes them correctly.
- `battle-runtime.qnt` is the canonical package-local deterministic reference
  with self-tests and generated parity assertions. It is useful for
  expected-state facts, but it is not a trace-generating integrated MBT.
- The highest-value first integrated promoted-runtime MBT candidates are
  already-implemented behavior with public discovery/replay state:
  1. Character weapon Attack against a Stat Block target, including target
     choice, attack roll, damage roll, action spend, HP mutation, and zero-HP
     policy.
  2. Action Surge, including Unit-feature discovery, no-hole resolution,
     restricted extra action, and once-per-turn/use-count state.
  3. Magic Missile, including actionSpell discovery, target/damage holes, Magic
     action spend, and Spell Slot expenditure.
  4. Skeleton vulnerability in the weapon Attack candidate if BA10 wants the
     first integrated MBT to cover promoted width as well as the original green
     attack path.

The first candidate is the narrowest bridge from the old broad battle proof
world to the promoted runtime because it exercises the public
`discoverBattleActs -> resolveBattleSubject -> snapshotBattle` loop while
touching algebras that are not currently MBT-covered as a composition:
attack-roll adjudication, dice validation, action spend, damage adjustment, HP
mutation, and zero-HP lifecycle.

## Verification Notes

This task added an inventory document only. No runtime behavior, tests, QNT, or
tool command definitions changed. No battle MBT was run.

Recommended command if later edits touch battle-runtime tests or docs in a way
that affects commands:

```sh
pnpm --filter @dnd/battle-runtime test
```
