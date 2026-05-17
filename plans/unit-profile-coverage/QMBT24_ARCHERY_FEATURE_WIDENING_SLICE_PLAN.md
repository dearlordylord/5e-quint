# QMBT24 Archery Feature Widening Slice Plan

Date: 2026-05-06

## Decision

Select `feat_archery` as the next SRD feature-style widening slice.

The slice should promote a new `unit-feature.passive-ranged-attack-roll-bonus`
profile for the SRD Archery Fighting Style feat: a passive +2 bonus to attack
rolls made with Ranged weapons.

## Source Check

Local RAW anchors read for this decision:

- `.references/srd-5.2.1/Feats.md`, `Archery`: "You gain a +2 bonus to
  attack rolls you make with Ranged weapons."
- `.references/srd-5.2.1/Feats.md`, `Defense`: prior Fighting Style precedent
  from QMBT18.

`UBIQUITOUS_LANGUAGE.md` anchors checked:

- `Armor Class (AC)` for the QMBT18 Defense precedent.
- `Action`, `Speed`, and `Movement` to avoid folding movement-capacity features
  into this slice.
- `Multiattack` / `Extra Attack` distinction to keep attack-count features out
  of this numeric roll-modifier slice.

## Candidate Triage

| Candidate | Why not this slice |
| --- | --- |
| `barbarian_fast_movement` | Narrow, but it widens Speed derivation and Movement budget projection. That should be planned as a movement-capacity profile, not as the next Defense-style Fighting Style slice. |
| `ranger_roving` | Contains the Fast Movement-style +10 Speed plus Climb and Swim Speed grants. It should wait until walk-speed derivation and alternate Speed kinds have a common boundary. |
| `fighter_extra_attack`, `paladin_extra_attack`, `ranger_extra_attack` | High value, but attack-count scaling rewrites the Attack action and must not be conflated with passive numeric roll bonuses. |
| `orc_adrenaline_rush` | Already classified as `needs-surface-widening`; it mixes Dash-as-Bonus-Action, Temporary Hit Points, and per-Proficiency-Bonus rest resources. |
| `feat_archery` | Best next slice: already authored in Surface, absent from the installed SRD Unit catalog, battle-executable, narrow, and structurally parallel to QMBT18 Defense without touching action economy or reactions. |

## Red/Green Plan

1. Add profile pressure and red evidence.

   Add `unit-feature.passive-ranged-attack-roll-bonus` to
   `plans/unit-profile-coverage/profiles.jsonl` with QCORE9/QMBT follow-on
   task refs, then classify `feat_archery` as the target supported row only
   when the implementation lands. Before implementation, keep the matrix honest:
   `feat_archery` remains an authored not-in-catalog pressure row.

2. Promote the Unit catalog boundary.

   Import `packages/surface/content/feat_archery.json` into
   `packages/surface/src/surface/unit-catalog.ts` and add it to
   `srdUnitCollection`. Update `unit-catalog.test.ts` so the SRD collection
   boundary admits `feat_archery` with SRD provenance.

3. Model the QNT profile before runtime behavior.

   Extend `packages/shared-algebras/proofs/rule-core/unit-feature-procedure-profiles.qnt`
   with a passive ranged-weapon attack-roll bonus profile. Keep the model about
   procedure facts, not the authored Unit id:

   - weapon usage fact: ranged vs non-ranged;
   - bonus amount fact fixed at +2 for this SRD profile;
   - effective attack-roll total derived from the caller-supplied roll total and
     the admitted passive bonus;
   - non-ranged attacks receive no bonus.

   Extend the inductive proof and focused feature MBT projection so the
   QCORE-observable state includes the effective attack-roll total, the bonus
   source, and hit/miss at the target AC.

4. Promote production support without duplicating roll state.

   Extend `packages/battle-runtime/src/unit-feature-support.ts` with a precise
   passive ranged attack-roll bonus support profile parsed from the existing
   Surface `modify_roll_numeric` grant. The parser should accept only:

   - `kind: "feat"`;
   - `family: "passive"`;
   - one `modify_roll_numeric` grant;
   - `on: ["attack_roll"]`;
   - `weaponFilter: { kind: "weapon_category", category: "ranged" }`;
   - fixed +2 delta.

   Do not add an authored-id registry for Archery.

5. Make the runtime boundary executable.

   Thread the parsed passive attack-roll bonus into character-origin battle
   projection and the weapon attack-roll procedure. The attack-roll procedure
   should derive any bonus from the attack option and the attacker's supported
   feature profiles at the point the attack roll is resolved. If the existing
   `AttackRollResult.total` remains the caller-supplied final total, expose the
   expected bonus in the attack-roll hole or typed projection so callers and MBT
   can distinguish "base roll plus Archery" from an unrelated total. Do not
   store a second copy of the same bonus beside the source profile.

6. Add deterministic admission/projection evidence.

   Add `feat_archery` to `unit-claims.jsonl` only after support is executable,
   with profile id `unit-feature.passive-ranged-attack-roll-bonus`. Add
   deterministic evidence in `unit-evidence.jsonl` owned by
   `packages/battle-runtime/src/unit-profile-admission.test.ts`. The test should
   load the authored Unit through the SRD Unit catalog, project support through
   production support gates, and prove:

   - ranged weapon attack receives +2;
   - melee weapon attack receives no +2;
   - the support gate still rejects adjacent passive roll shapes.

7. Refresh generated matrix artifacts.

   Run `pnpm unit-profile-coverage:check` after claims/evidence updates and
   commit the generated report/matrix changes from that implementation task.

## Verification For Implementation Task

- RAW and `UBIQUITOUS_LANGUAGE.md` check for Archery, Fighting Style, Attack
  Rolls, and Ranged weapons.
- Focused QNT proof for the new passive ranged attack-roll bonus profile.
- Focused QMBT feature parity with the mandatory timed background protocol if
  runtime behavior changes.
- `pnpm unit-profile-coverage:check`.
- Relevant package typecheck/tests.
- `pnpm quality` for the production behavior change.
- reviewer loop convergence, minimum two rounds.

## Plan Impact

QMBT26 should append a follow-on implementation task for this slice before
starting broader unsupported-feature planning. Suggested task:

`QMBT27 - Promote Archery Passive Ranged Attack-Roll Bonus`

Scope: implement the red/green plan above and close `feat_archery` as a
supported SRD Unit profile. Out of scope: Fast Movement/Roving, Extra Attack,
weapon masteries, Temporary Hit Point traits, and general roll-modifier
families beyond the Archery-shaped passive ranged weapon attack-roll bonus.
