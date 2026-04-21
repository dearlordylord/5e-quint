# Surface Runtime Correction Quint Mapping

This note records the naming alignment between the frozen TypeScript contract
and the Quint model in [surfaceRuntimeCorrection.qnt](../../surfaceRuntimeCorrection.qnt).

The Quint spec keeps the same slice boundary as the TS package:

- initiative-owned `BattleState`
- derived prompt discovery
- minimal open-prompt state
- complete prompt answers only
- pure reduction for `endTurn`, `attack`, `singleTargetHeal`, `areaSaveDamage`, and `grantExtraAction`

## Naming Alignment

- TS prompt tag `"chooseAction"` maps to Quint variant `BPChooseAction`; the answer tag maps to `BAChooseAction`.
- TS prompt tags `"chooseAttackTarget"`, `"chooseSingleTargetUnit"`, and `"chooseAreaEffect"` map to Quint variants `BPChooseAttackTarget`, `BPChooseSingleTargetUnit`, and `BPChooseAreaEffect`.
- TS `BattleState.openPrompt` uses `null | { tag: ... }`; Quint makes the same ownership boundary explicit with `NoOpenPrompt | OPChooseAttackTarget | OPChooseSingleTargetUnit(unitId) | OPChooseAreaEffect(unitId)`.
- TS `turnActorId: CreatureId | null` maps to Quint `NoTurnActor | TurnActor(actorId)`.
- TS `BattleResolutionResult` tags `"resolvedAction"` and `"openedPrompt"` map to Quint `AnswerResolved` and `AnswerOpened`.
- TS keeps nested prompt payload records for `targeting`, `save`, and `effect`; Quint flattens those fields into the prompt variants because the variant constructor already fixes the prompt kind.
- TS runtime helpers interpret `Surface` units structurally through `SurfaceUnitInterpretation`; Quint models the same semantic categories as `SupportedBattleUnit` and keeps `unitId` as bookkeeping only.
- TS `grantExtraAction` interpretation carries `restriction`, `useCountCap`, and `usageLimit`; Quint keeps those same structural facts inside `BUGrantExtraAction(...)` rather than collapsing them into an Action Surge-only tag.

## RAW And UL Traceability

The modeled slice is grounded in the repo-local SRD corpus and `UBIQUITOUS_LANGUAGE.md` before matching the frozen TS artifact.

| Quint / TS slice concept | RAW grounding | UL grounding |
| --- | --- | --- |
| initiative-owned battle state (`initiativeCounts`, `initiativeOrder`, `turnActorId`, `round`, `turnNumber`) | [Playing-the-Game.md](../../.references/srd-5.2.1/Playing-the-Game.md:482), [Playing-the-Game.md](../../.references/srd-5.2.1/Playing-the-Game.md:494), and [Playing-the-Game.md](../../.references/srd-5.2.1/Playing-the-Game.md:497) ground initiative count, initiative order, stable ordering across rounds, and turn ownership | [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md:132) for Round, [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md:133) for Turn, and [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md:162) for Initiative |
| `attack` prompt and resolved action shape | [Playing-the-Game.md](../../.references/srd-5.2.1/Playing-the-Game.md:584) gives the attack structure: choose a target, determine modifiers, resolve the attack | [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md:134) for Action and [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md:146) for Armor Class / attack-facing combat terms |
| `singleTargetHeal` (`cure_wounds`) | [Spells/Descriptions-A-D.md](../../.references/srd-5.2.1/Spells/Descriptions-A-D.md:1277) gives casting time `Action`, range `Touch`, and HP restoration; [Playing-the-Game.md](../../.references/srd-5.2.1/Playing-the-Game.md:736) grounds healing clamp-to-max behavior | [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md:134) for Action and [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md:236) for Spell Invocation |
| `areaSaveDamage` (`fireball`) | [Spells/Descriptions-E-L.md](../../.references/srd-5.2.1/Spells/Descriptions-E-L.md:418) gives range, radius, Dexterity save, Fire damage, and half-on-success; [Playing-the-Game.md](../../.references/srd-5.2.1/Playing-the-Game.md:710) grounds single-roll-for-multiple-targets and half-damage rounding | [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md:175) for Area of Effect and [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md:236) for Spell Invocation |
| `grantExtraAction` (`fighter_action_surge_l2`) | [Classes/Fighter.md](../../.references/srd-5.2.1/Classes/Fighter.md:76) grounds the extra action, non-Magic restriction, rest-based use cap, and level-17 second use; [Playing-the-Game.md](../../.references/srd-5.2.1/Playing-the-Game.md:497) grounds the normal one-action turn that this extends | [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md:134) for Action, [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md:49) for Quota, and [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md:54) for Spend |
| open prompt ownership and prompt clearing on turn advance | [Playing-the-Game.md](../../.references/srd-5.2.1/Playing-the-Game.md:479) and [Playing-the-Game.md](../../.references/srd-5.2.1/Playing-the-Game.md:497) ground combat step order and per-turn ownership | [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md:19) for Offer and [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md:58) for Advance |

Domain alignment note:

- The TS package uses the frontend-facing word "prompt"; `UBIQUITOUS_LANGUAGE.md` prefers "offer" for a reaction window. This slice is not modeling reactions, so the Quint module keeps the frozen TS prompt vocabulary for parity and defers any wider terminology cleanup to a later cross-stack task.

## Simplify Convergence

Round 1:
- kept `grantExtraAction` structural in Quint by carrying restriction, use-count cap, and usage-limit facts instead of collapsing them into an Action Surge-only tag
- replaced transient worktree links with stable repo-relative links
- added a deterministic Quint test for the level-17 second-use cap

Round 2:
- re-checked the slice boundary for remaining duplicated authored/runtime facts
- re-checked the docs for transient-path leakage and missing RAW/UL trace notes
- no further material simplification was needed
