# Quint Rule Core Proofs

This directory contains production rule-core Quint proofs. It follows the
QCORE0 composition result:

- reusable rule modules are stateless contracts/procedures;
- stateful proof modules own their state variables and import stateless
  procedures;
- integration modules stay shallow and measured;
- QNT fixtures are projection-shaped rule facts, not Surface mirrors.

## QCORE1: Hit Point Damage

`hit-point-damage.qnt` models the SRD 5.2.1 procedure for applying a resolved
damage amount to a creature's Hit Points and Temporary Hit Points while the
creature still has positive Hit Points. Damage at 0 Hit Points is a different
procedure because it inflicts Death Saving Throw failures.

Callers must establish `canApplyResolvedDamageToPositiveHitPoints(...)` before
using `applyResolvedDamageToPositiveHitPoints(...)`. The owned proof machine
enforces that guard before every damage transition.

Scope:

- nonnegative resolved damage;
- Temporary Hit Points are lost before Hit Points;
- Hit Points clamp at 0;
- monsters die when they drop to 0 Hit Points;
- player characters that drop to 0 Hit Points die from massive damage when the
  remaining damage equals or exceeds their Hit Point Maximum;
- player characters that drop to 0 Hit Points without instant death gain the
  Unconscious condition fact.

Out of scope for this first procedure:

- damage type Resistance, Vulnerability, and Immunity;
- damage at 0 Hit Points and Death Saving Throw failures;
- healing and revival;
- melee knock-out choice;
- broad battle action sequencing.

`hit-point-damage-inductive.qnt` is the owned proof machine. Its `step` action
has a documented branch budget and is intentionally small enough for serialized
`quint verify`.

## QCORE2: Zero-HP Lifecycle

`zero-hit-point-lifecycle.qnt` models the SRD 5.2.1 player-character procedure
for damage and Death Saving Throws after a character is already at 0 Hit Points.
It imports QCORE1's `CreatureVitals` type and keeps `dead` canonical there; the
Death Saving Throw lifecycle carries only counters plus Stable and HP-regained
facts, avoiding a second death field.

Scope:

- damage at 0 Hit Points adds one Death Saving Throw failure;
- Critical Hit damage at 0 Hit Points adds two failures;
- damage at 0 Hit Points that equals or exceeds the Hit Point Maximum kills;
- three Death Saving Throw failures kills;
- three Death Saving Throw successes makes the character Stable and resets
  counters;
- a natural 20 Death Saving Throw restores 1 Hit Point and ends this procedure's
  Unconscious fact;
- positive-Hit-Point damage from QCORE1 initializes or finalizes the Death
  Saving Throw lifecycle when it drops a player character to 0 Hit Points.

Out of scope for QCORE2:

- ordinary healing spells/features beyond the natural-20 Death Saving Throw
  result;
- positive-HP Knock Out lifecycle;
- Stable 1d4-hour recovery;
- damage type Resistance, Vulnerability, and Immunity;
- broad battle action sequencing.

`zero-hit-point-lifecycle-inductive.qnt` is the owned proof machine and shallow
composition check with QCORE1. Its `step` action records the branch budget near
the `any` action.

## QCORE3: Hit Point Recovery

`hit-point-recovery.qnt` models the SRD 5.2.1 procedures for Hit Point
recovery and Knock Out disposition over the QCORE1/QCORE2 state shapes. It
imports QCORE1's `CreatureVitals` and QCORE2's Death Saving Throw lifecycle
instead of introducing parallel Hit Point, death, Stable, or Death Saving Throw
state.

Scope:

- healing restores Hit Points up to the Hit Point Maximum;
- dead creatures do not regain Hit Points through this procedure;
- a player character that regains Hit Points resets Death Saving Throws, and
  zero-HP recovery ends the Unconscious fact from the zero-HP lifecycle;
- Stable remains a zero-HP Unconscious state until Hit Points are regained or
  another QCORE2 zero-HP event occurs;
- Knock Out disposition can replace a qualifying drop-to-zero damage result
  with 1 Hit Point and Unconscious for any creature kind;
- first aid can end the positive-Hit-Point Unconscious recovery state created by
  Knock Out without changing Hit Points.

Out of scope for QCORE3:

- damage type Resistance, Vulnerability, and Immunity;
- attack roll and melee eligibility facts for choosing Knock Out;
- Stable 1d4-hour recovery;
- broad battle action sequencing.

`hit-point-recovery-inductive.qnt` is the owned proof machine and shallow
composition check with QCORE1/QCORE2. Its `step` action records the branch
budget near the `any` action.
