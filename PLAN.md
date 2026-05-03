# Plan: Replace BattleStance With Active Ongoing Feature Occurrences

## Context

Ralph Task 55 restored Barbarian Rage and Reckless Attack behavior into the
promoted `@dnd/battle-runtime` lane, but the staged implementation introduced a
new abstraction named `BattleStance` / `persistentStance` and mirrored it in
Quint as:

```quint
type ActiveStance =
  | ActiveRage({ expiresRound: int })
  | ActiveRecklessAttack
```

That direction is mechanically useful but architecturally wrong. `stance` is not
SRD vocabulary, and the abstraction is already broader than a stance: it is an
active occurrence of an ongoing feature that contributes rules riders until a
timing boundary or early-end condition removes it.

The current staged patch is therefore a working baseline to reshape before
commit. Do not treat its vocabulary or state shape as final.

## RAW And UL Findings

- SRD 5.2.1 `Classes/Barbarian.md:56-78` says Rage is entered as a Bonus
  Action, is unavailable while wearing Heavy armor, has active benefits,
  expires at the end of the Barbarian's next turn, can be extended for another
  round by attack roll / forcing a saving throw / Bonus Action, ends early on
  Heavy armor or Incapacitated, and can last up to 10 minutes.
- SRD 5.2.1 `Classes/Barbarian.md:66-70` says active Rage grants Resistance to
  Bludgeoning, Piercing, and Slashing damage, bonus damage for Strength weapon
  or Unarmed Strike damage, Advantage on Strength checks and Strength saving
  throws, and prevents maintaining Concentration or casting spells.
- SRD 5.2.1 `Classes/Barbarian.md:94-97` says Reckless Attack is chosen when
  making the first attack roll on the Barbarian's turn; it grants Advantage on
  Strength attack rolls until the start of the next turn, and attack rolls
  against the Barbarian have Advantage during that time.
- SRD 5.2.1 `Classes/Barbarian.md:150-154` changes Rage at level 15:
  Persistent Rage lasts 10 minutes without round-by-round extension and ends
  early on Unconscious or Heavy armor, not generic Incapacitated.
- SRD 5.2.1 `Playing-the-Game.md:479-495` defines combat as rounds and turns in
  Initiative order. This supports turn-boundary expiry, not a naked
  `expiresRound` scalar.
- SRD 5.2.1 `Playing-the-Game.md:318-324` and `Rules-Glossary.md:138-140`
  define Bonus Action availability and the one-Bonus-Action-per-turn rule.
- SRD 5.2.1 `Rules-Glossary.md:594-598` defines Incapacitated as blocking
  actions, Bonus Actions, and Reactions; it is also an explicit Rage early-end
  condition.
- SRD 5.2.1 `Playing-the-Game.md:720-730` and `Rules-Glossary.md:828-830`
  define Resistance and its damage-order semantics.
- SRD 5.2.1 `Rules-Glossary.md:239-247` defines Concentration breakage, and
  `Spells/Gaining-and-Casting.md:90-104` defines spell casting-time context for
  Rage's spellcasting restriction.
- `UBIQUITOUS_LANGUAGE.md` already defines Advantage, Resistance, Timers,
  Conditions, Speed/Movement, and the "Round is exactly 6 seconds for
  conversion" taxonomy. It does not define `stance`, and the SRD search finds no
  RAW use of `stance` as a rules term.

## Modeling Principles

1. **Do not keep unit identities in engine code except tests.**
   Runtime code may carry a generic Unit source key when needed to identify the
   source of an active occurrence, but it must not branch on
   `"barbarian_rage"`, `"barbarian_reckless_attack"`, `ActiveRage`, or
   `ActiveRecklessAttack`.

2. **Store activation occurrence state, derive source mechanics.**
   A character having a Unit feature does not mean the feature is active, so the
   runtime must store that activation happened. But static mechanics such as
   roll modifiers, damage modifiers, resistances, extension triggers, early-end
   predicates, action restrictions, concentration effects, display labels, and
   source names are derivable from the Unit / Surface profile and should not be
   duplicated in active state.

3. **Keep RAW-facing vocabulary separate from engine vocabulary.**
   `Rage`, `Reckless Attack`, Advantage, Resistance, Bonus Action, and turn
   boundaries are RAW terms. `ActiveOngoingFeatureOccurrence` is engine
   vocabulary. `BattleStance` is neither RAW nor broad enough.

4. **Make invalid active states harder to represent.**
   The staged `Set[ActiveStance]` in Quint permits multiple Rages with different
   `expiresRound` payloads. The TypeScript `activeStances: BattleStance[]`
   similarly relies on helper behavior to avoid duplicate active occurrences.
   The replacement must key occurrences by source, use a map/slot shape, or use
   a branded collection whose only constructor enforces same-source uniqueness.
   A raw array fallback is not acceptable.

5. **Model timing as boundary expiry, not absolute round count.**
   Rage and Reckless Attack expire at actor turn boundaries. Runtime expiry
   should use the shared turn-boundary vocabulary already introduced by the
   round/time taxonomy work, not `expiresRound`.

## Target Vocabulary

Use these names unless implementation research finds a stronger local precedent:

- `ActiveOngoingFeatureOccurrence`: runtime state saying a source-created
  ongoing feature is currently active.
- `OngoingFeatureProfile`: parsed, source-derived mechanics that describe what
  an active occurrence contributes.
- `OngoingFeatureSource`: source reference for profile lookup, initially
  `{ kind: "unit"; unitId: UnitRecord["id"] }`.
- `OngoingFeatureExpiration`: turn-boundary expiry using the existing battle
  expiration vocabulary.
- `OngoingFeatureEarlyEnd`: typed predicates such as condition present or armor
  category worn.
- `AttackRollFeatureActivation`: first-attack-roll activation option, replacing
  `BattleAttackRollStanceActivation`.

Avoid:

- `BattleStance`
- `persistentStance`
- `ActiveRage`
- `ActiveRecklessAttack`
- storing `sourceUnitName` in active state
- storing derived modifiers/resistances/early ends in active state when the
  source Unit profile can be recovered

## Proposed Type Shape

The exact names may change during implementation, but the semantic split should
remain:

```ts
type ActiveOngoingFeatureOccurrence = {
  readonly source: OngoingFeatureSource;
  readonly expiresAt: OngoingFeatureExpiration;
  readonly startedAt: BattleTimeAnchor;
};

type OngoingFeatureSource =
  | { readonly kind: "unit"; readonly unitId: UnitRecord["id"] };

type OngoingFeatureProfile = {
  readonly activation:
    | { readonly kind: "bonusAction"; readonly spendsUse: boolean }
    | { readonly kind: "firstAttackRoll" };
  readonly initialExpiration: "startOfNextTurn" | "endOfNextTurn";
  readonly maximumDuration?: TimeSpanDuration;
  readonly extensionTriggers: readonly OngoingFeatureExtensionTrigger[];
  readonly earlyEnds: readonly OngoingFeatureEarlyEnd[];
  readonly rollModifiers: readonly BattleRollModifier[];
  readonly damageModifiers: readonly BattleDamageModifier[];
  readonly resistances: readonly DamageType[];
  readonly actionRestrictions: readonly OngoingFeatureActionRestriction[];
  readonly concentrationEffects: readonly OngoingFeatureConcentrationEffect[];
};
```

`OngoingFeatureProfile` intentionally has no `source`; callers must derive a
profile from an occurrence's source at one boundary so mismatched
occurrence/profile pairs are not representable.

At `startBattle`, parse supported ongoing Unit features into a stable,
battle-local profile table keyed by `OngoingFeatureSource`. Active occurrences
then reference that table. This avoids copying mechanics into every active
occurrence while making Unit/resource mutation during battle irrelevant to active
feature semantics.

## Implementation Steps

1. **Inventory current active-state reads.**
   Search for:
   `BattleStance`, `persistentStance`, `activeStances`, `sourceUnitId`,
   `sourceUnitName`, `BattleAttackRollStanceActivation`, `ActiveRage`,
   `ActiveRecklessAttack`, and `expiresRound`.
   Classify each read as occurrence identity, expiry, early-end filtering,
   modifier projection, resource spend, or display.

2. **Rename and split TypeScript runtime types.**
   Replace `BattleStance*` types with ongoing-feature names. Active occurrence
   state should keep only source identity and mutable runtime facts. Move
   modifiers, resistances, extension rules, and early-end rules into the parsed
   profile returned from Unit mechanics.

3. **Remove derived display/source duplication.**
   Delete `sourceUnitName` from active state. Derive labels from the source Unit
   when projecting snapshots or available acts. Keep `unitId` in subjects and
   test fixtures because it is the user-selected authored feature identity.

4. **Make duplicate active occurrences unrepresentable or centrally rejected.**
   Replace raw `activeStances: BattleStance[]` with a keyed active occurrence
   store or branded unique collection. Do not keep a raw array fallback. The
   attack-roll activation path must update by source key rather than append.

5. **Genericize parser names and mechanics.**
   Rename `parsePersistentStanceUnitFeatureProfile` and friends to
   ongoing-feature terminology. The parser should stay structural: it should
   recognize Surface mechanics shape, not specific Unit ids.

6. **Fix first-attack-roll activation vocabulary.**
   Rename `BattleAttackRollStanceActivation` and related fill fields if needed.
   Preserve RAW behavior: Reckless Attack is offered only on the first attack
   roll on the Barbarian's turn for attack rolls using Strength, and applies
   reciprocal Advantage until the start of the next turn. Do not import Rage
   Damage's weapon/Unarmed Strike restriction into Reckless Attack. If current
   battle-runtime attack support can only surface weapon/Unarmed Strength
   attacks, label that as a temporary support boundary in tests/docs rather than
   as RAW.

7. **Update exported snapshots, schemas, and tool projections.**
   `BattleSnapshot` currently exposes `activeStances`, attack-roll holes expose
   `stanceActivations`, and fills expose `activatedStanceUnitId`. Rename these
   to ongoing-feature terminology consistently and check `packages/mcp/src`,
   `packages/app/src`, and any schema tests that consume battle-runtime output.

8. **Fix Rage extension and early-end modeling.**
   Rage activation spends Bonus Action and a use, and must not be offered or
   accepted while the actor is wearing Heavy armor. Extension by Bonus Action
   must not spend another use. Extension by attack roll should update only
   occurrence expiry, and only when the attack roll is against an enemy.
   Extension by forcing an enemy Saving Throw must either be implemented
   wherever battle-runtime has save-forcing actions, or explicitly scoped as not
   yet reachable if no supported save-forcing Unit/Spell path exists in this
   promoted lane. Heavy armor and Incapacitated early-end predicates should be
   derived from the Rage profile, not hardcoded in active state. Enforce the
   10-minute maximum using the time-span/round conversion taxonomy.

9. **Model Rage spell/concentration and D20 riders.**
   Active Rage must break or prevent maintained Concentration as RAW requires
   and must prevent casting spells while active. It must also expose Advantage
   on Strength checks and Strength saving throws where battle-runtime models
   those roll families. If a roll family is not present in this promoted lane,
   record the support boundary in documentation and avoid pretending the rider is
   implemented.

10. **Model Persistent Rage or make the level boundary explicit.**
   Because the Unit profile parser receives class level, level 15+ Rage should
   project Persistent Rage semantics: no round-by-round extension requirement,
   10-minute duration, and early end on Unconscious or Heavy armor. If the
   current Task 55 slice intentionally excludes level 15, the exclusion must be
   documented in `ASSUMPTIONS.md` or the plan must be narrowed before
   implementation.

11. **Update Quint without feature identity constructors.**
   Replace `ActiveRage | ActiveRecklessAttack` with a representative generic
   ongoing-feature occurrence model, or a record with generic slots if Quint
   needs a very small bounded domain. The spec may still have representative
   actions for the two restored behaviors, but active-state constructors should
   not encode Unit identity as type variants.

12. **Update documentation and ubiquitous language.**
   Add engine vocabulary for active ongoing feature occurrences, explicitly
   saying it is not SRD vocabulary and must not appear in authored Surface
   content or user-facing RAW labels. Update `packages/battle-runtime/README.md`
   to cite Barbarian Rage/Reckless Attack and the generic ongoing-feature
   runtime family.

13. **Remove unrelated fuzz-script changes from this commit unless proven needed.**
   The staged Ralph patch includes script edits unrelated to ongoing feature
   architecture. These must be split out or dropped unless implementation proves
   they are required for this task.

## Connascence Checks

- `source unit id` and active occurrence identity must change together. Keep
  source-key construction in one helper.
- Active occurrence source and profile lookup must change together. Do not pass
  separate source-bearing occurrence and source-bearing profile values through
  the same call path.
- The battle-local profile table and active occurrence store must be initialized
  together at `startBattle`.
- `expiresAt`, extension triggers, and turn-boundary cleanup must change
  together. Keep expiry construction and extension in one module/helper.
- First-attack-roll activation options, attack-roll fills, and activated profile
  resolution must change together. Do not let UI/fill strings diverge from
  runtime validation.
- Snapshot fields, MCP output schemas, and UI/tool consumers must change
  together when exported names change.
- Rage early ends and availability gates must stay tied to source-derived
  profile predicates, not copied into separate code paths.
- Rage action restrictions, concentration effects, and spellcasting discovery
  gates must change together.
- Damage/roll modifier projection must derive from one profile parser so
  Resistance, Advantage, and damage bonus logic cannot diverge between
  discovery, resolution, and snapshots.

## Test Plan

Focused TypeScript tests:

- Rage activation creates one active ongoing occurrence keyed by source and
  spends one use plus Bonus Action.
- Rage is not offered and cannot be resolved while the actor is wearing Heavy
  armor.
- Rage Bonus Action extension updates expiry and does not spend another use.
- Rage attack-roll extension updates expiry without duplicating the occurrence
  only when the attack roll is against an enemy.
- Rage save-forcing extension is implemented for supported save-forcing paths,
  or unsupported paths are explicitly absent from discovery and documented.
- Rage ends when the actor becomes Incapacitated or dons Heavy armor.
- Rage modifiers are applied from the parsed profile: Bludgeoning/Piercing/
  Slashing Resistance and Strength weapon damage bonus. Damage-dealing Unarmed
  Strike support is documented as gated until that attack family exists in the
  promoted runtime.
- Rage prevents spellcasting and breaks/prevents Concentration while active.
- Rage grants Strength check/save Advantage where those roll families exist in
  battle-runtime; otherwise the support boundary is documented.
- Rage cannot be extended beyond 10 minutes.
- Persistent Rage at level 15+ uses the correct 10-minute duration and
  Unconscious/Heavy-armor early-end semantics, unless explicitly scoped out in
  `ASSUMPTIONS.md`.
- Reckless Attack is not offered as a normal Unit action before the first attack
  roll.
- Reckless Attack first-attack-roll activation grants outgoing Advantage on
  attack rolls using Strength and incoming attack-roll Advantage until the start
  of the actor's next turn.
- Same-source active occurrence duplication is impossible through public
  resolution APIs.

Quint tests:

- Generic active ongoing feature occurrence expires at start/end turn boundary.
- Representative Rage-like occurrence extends to end of next turn and cannot
  duplicate.
- Representative Rage-like occurrence respects a maximum duration cap.
- Representative Reckless-like occurrence expires at start of next turn.
- QNT state no longer contains `ActiveRage`, `ActiveRecklessAttack`, or
  `expiresRound`.

## Verification

Before implementation:

- RAW agent check: verify every modeled Rage/Reckless/ongoing-feature rule
  traces to `.references/srd-5.2.1/Classes/Barbarian.md`,
  `Playing-the-Game.md`, `Rules-Glossary.md`,
  `Spells/Gaining-and-Casting.md`, or an existing `ASSUMPTIONS.md` entry.
- Check `UBIQUITOUS_LANGUAGE.md` before naming final types.

After implementation:

- `pnpm --filter @dnd/battle-runtime test`
- `pnpm --filter @dnd/surface test` for Surface schema/tracer changes.
- Affected MCP tests if battle snapshot or hole/fill schema names change.
- `pnpm typecheck`
- Focused Quint tests for `packages/battle-runtime/battle-runtime.qnt`
- Battle MBT Tier 1 only after the implementation is stable:
  `cd packages/core && MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 npx vitest run src/battle-projection.mbt.test.ts`
- `/simplify` convergence, minimum 2 rounds. Start `/simplify` immediately after
  implementation and continue until no important simplification issues remain.

Do not run expensive battle MBT tiers during exploratory refactoring.
