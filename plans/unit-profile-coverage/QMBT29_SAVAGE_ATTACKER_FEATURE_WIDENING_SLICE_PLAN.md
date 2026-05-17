# QMBT29 Savage Attacker Feature Widening Slice Plan

Date: 2026-05-07

## Decision

Select `feat_savage_attacker` as the next SRD feature-style widening slice
after Archery.

The slice should promote a new
`unit-feature.weapon-damage-dice-roll-choice` profile for the SRD Savage
Attacker origin feat: once per turn, when the creature hits a target with a
weapon, it may roll that weapon's damage dice twice and use either roll against
the target.

This keeps the next feature lane on a narrow battle-executable feature. It
does not pivot to spell widening, magic item intake, movement capacity, attack
count scaling, species resource mixtures, or weapon mastery ownership.

## Source Check

Local RAW anchors read for this decision:

- `.references/srd-5.2.1/Feats.md`, `Savage Attacker`: once per turn on a
  weapon hit, the attacker can roll the weapon's damage dice twice and use
  either roll against the target.
- `.references/srd-5.2.1/Playing-the-Game.md`, `Damage Rolls`: weapon damage
  rolls roll the damage dice, then add modifiers; weapon attacks add the same
  ability modifier used for the attack roll unless a rule says otherwise.
- `.references/srd-5.2.1/Playing-the-Game.md`, `Critical Hits`: a Critical Hit
  rolls the attack's damage dice twice, adds them together, then adds relevant
  modifiers.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Damage Roll`: a damage roll is a
  die roll adjusted by applicable modifiers that deals damage to a target.

`UBIQUITOUS_LANGUAGE.md` anchors checked:

- `Attack Roll`, `Critical Hit`, and `Damage Roll` for keeping the trigger,
  hit outcome, critical doubling, and damage-roll choice distinct.
- `Attack Damage Rider` for the existing Sneak Attack precedent and to avoid
  misclassifying Savage Attacker as extra damage dice.
- `Pool`, `Quota`, and `Spend` for the once-per-turn use boundary.
- `Weapon Property`, `Mastery Property`, and `Weapon Mastery` for keeping this
  feat slice separate from mastery-property ownership.

## Candidate Triage

| Candidate | Decision |
| --- | --- |
| `feat_savage_attacker` | Best next slice. It is an installed SRD Unit with authored executable mechanics, one weapon-hit trigger, one optional once-per-turn choice, and it can reuse the existing attack target, attack-roll, and weapon damage hole sequence. |
| `barbarian_fast_movement` | Defer. It is narrow, but it widens Speed derivation and Movement budget projection rather than the attack damage pipeline. |
| `ranger_roving` | Defer. It combines Speed increase with Climb and Swim Speed grants, so it should wait for a common Speed-kind projection boundary. |
| `fighter_extra_attack`, `paladin_extra_attack`, `ranger_extra_attack` | Defer. Attack-count scaling rewrites Attack action sequencing and should not be bundled with a damage-roll-choice profile. |
| `barbarian_unarmored_defense`, `monk_unarmored_defense` | Defer. These are Armor Class calculation alternatives, not flat bonuses like Defense; they should be planned as base AC calculation selection. |
| `paladin_lay_on_hands`, `ranger_tireless`, `orc_adrenaline_rush` | Defer. Each mixes resource pools with healing or Temporary Hit Points, and Adrenaline Rush also has a Dash-as-Bonus-Action branch. |
| `species_dragonborn_breath_weapon` | Defer. It replaces one attack inside the Attack action with area save-gated damage and a Proficiency Bonus based rest resource. |
| `dwarf_dwarven_resilience`, `species_dragonborn_damage_resistance` | Defer. Resistance traits widen target-side damage adjustment and typed damage-source admission rather than the attacker-side feature procedure. |
| `mastery_sap`, `mastery_cleave`, `mastery_topple` | Defer. Mastery properties need weapon mastery ownership, weapon-specific eligibility, and on-hit rider windows before selecting a single mastery property. |
| `feat_boon_of_combat_prowess` | Defer. Miss-to-hit conversion is battle-executable but introduces a reaction-like reroll/rewrite timing profile and a rest/Initiative recharge boundary. |

## Red/Green Plan

1. Add profile pressure before support.

   Add `unit-feature.weapon-damage-dice-roll-choice` to
   `plans/unit-profile-coverage/profiles.jsonl` with QCORE9 and QMBT follow-on
   ownership placeholders. Keep `feat_savage_attacker` as unsupported until the
   executable profile lands.

2. Model the QNT profile first.

   Extend
   `packages/shared-algebras/proofs/rule-core/unit-feature-procedure-profiles.qnt`
   with a weapon-hit damage dice choice profile. The model should use procedure
   facts rather than the authored Unit id:

   - weapon hit vs miss;
   - ordinary hit vs Critical Hit;
   - weapon damage dice count and die size;
   - two candidate weapon damage dice rolls;
   - chosen candidate result;
   - once-per-turn availability and use.

   The effective damage amount should derive from the chosen candidate plus the
   existing damage modifier. The implementation task must resolve the Critical
   Hit interaction from local RAW before modeling it: Savage Attacker rerolls
   only the weapon damage dice, while Critical Hit doubles the attack's damage
   dice. If the implementation needs to choose between "choose between two
   full critical weapon dice pools" and another reading, record the owner
   decision in `ASSUMPTIONS.md` before adding executable behavior.

3. Promote production support from authored mechanics.

   Extend `packages/battle-runtime/src/unit-feature-support.ts` with a precise
   support parser for the existing `feat_savage_attacker` authored shape:

   - `kind: "feat"`;
   - `family: "on_hit_trigger"`;
   - `trigger: { kind: "weapon_hit" }`;
   - `optional: true`;
   - `usageLimit: { kind: "once_per_turn" }`;
   - `effect.kind: "reroll_weapon_damage_dice"`;
   - `effect.diceScope: "weapon_damage_dice"`;
   - `effect.choose: "either_roll"`.

   Do not add an authored-id registry. The support profile should be a typed
   projection of the Surface mechanics shape.

4. Make the damage hole executable without duplicating state.

   Extend the attack damage hole/fill boundary so a weapon attack hit can carry
   a Savage Attacker damage-dice choice when the attacker has the supported
   profile and has not used it this turn. The canonical source fact is the
   retained Unit support profile plus `currentTurnResources`; do not store a
   second per-creature copy of the feat.

   The fill should preserve the existing base damage roll path for non-use. For
   use, it should require two weapon-damage-dice groups and one explicit choice
   of which candidate applies. Existing extra damage riders, such as Sneak
   Attack, stay separate components and are not rerolled by Savage Attacker.

5. Keep critical and rider connascence local.

   Colocate the facts that must change together: weapon base dice expression,
   critical doubling, Savage Attacker candidate groups, the chosen candidate,
   and once-per-turn use recording. A future change to critical damage or
   attack damage components should have one obvious helper to update.

6. Add deterministic admission/projection evidence.

   After runtime support is executable, change `feat_savage_attacker` in
   `unit-claims.jsonl` from unsupported to supported with profile id
   `unit-feature.weapon-damage-dice-roll-choice`. Add deterministic evidence in
   `unit-evidence.jsonl` owned by
   `packages/battle-runtime/src/unit-profile-admission.test.ts`. The test should
   load the authored Unit through the SRD Unit catalog, project support through
   production support gates, and prove:

   - a weapon hit can use Savage Attacker and choose either candidate roll;
   - a weapon miss cannot use Savage Attacker;
   - a non-weapon attack cannot use Savage Attacker;
   - the profile is unavailable after one use in the same turn;
   - Sneak Attack or other rider dice are not included in the Savage Attacker
     reroll scope;
   - malformed adjacent Surface shapes remain rejected.

7. Refresh generated matrix artifacts.

   Run `pnpm unit-profile-coverage:check` after claims and evidence updates and
   include the generated `UNIT_REPORT.md` and `unit-matrix.json` changes in the
   implementation task.

## Verification For Implementation Task

- RAW and `UBIQUITOUS_LANGUAGE.md` check for Savage Attacker, weapon hits,
  Damage Rolls, Critical Hits, Attack Damage Riders, and once-per-turn resource
  wording. Confirm whether the Savage Attacker plus Critical Hit interaction is
  directly resolved by RAW or needs an `ASSUMPTIONS.md` entry.
- Focused QNT proof for the new weapon damage dice choice profile.
- Focused QMBT feature parity with the mandatory timed background protocol if
  production battle behavior changes.
- `pnpm unit-profile-coverage:check`.
- Relevant package typecheck/tests.
- `pnpm quality` for the production behavior change.
- reviewer loop convergence, minimum two rounds.

## Task 124 Verification

- RAW checked locally against `.references/srd-5.2.1/Feats.md`,
  `.references/srd-5.2.1/Playing-the-Game.md`, and
  `.references/srd-5.2.1/Rules-Glossary.md` for the Savage Attacker, Damage
  Rolls, Critical Hits, and Damage Roll anchors listed above.
- `UBIQUITOUS_LANGUAGE.md` checked for Attack Roll, Critical Hit, Damage Roll,
  Attack Damage Rider, Pool, Quota, Spend, Weapon Property, Mastery Property,
  and Weapon Mastery terminology.
- reviewer loop round 1: kept `feat_savage_attacker` selected, retained the
  Critical Hit interaction as an explicit implementation-time RAW/assumption
  check, and kept deferred candidates separated by domain boundary instead of
  broad feature-family grouping.
- reviewer loop round 2: no important changes found; the plan still has one
  selected executable feature slice, no runtime implementation, and no mixed
  movement, resource, resistance, attack-count, spell, or mastery scope.
- MBT not run: Task 124 is research-only and makes no promoted battle-runtime
  behavior change.

## Plan Impact

QMBT30 should append a follow-on implementation task for this slice before
starting broad feature-family widening. Suggested task:

`QMBT31 - Promote Savage Attacker Weapon Damage Dice Choice`

Scope: implement the red/green plan above and close `feat_savage_attacker` as
a supported SRD Unit profile. Out of scope: Extra Attack, movement-capacity
features, Unarmored Defense AC calculation alternatives, species resource
mixtures, weapon masteries, magic items, and general damage-reroll families
beyond the Savage Attacker-shaped weapon damage dice choice.
