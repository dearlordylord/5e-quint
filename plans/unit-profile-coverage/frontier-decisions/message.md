# Message Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:279` defines Message
  as a Transmutation cantrip for Bard, Druid, Sorcerer, and Wizard.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:283` through
  `.references/srd-5.2.1/Spells/Descriptions-M-P.md:286` define Action
  casting time, 120-foot range, Somatic/Material components, and 1-round
  duration.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:288` defines pointing
  toward a creature within range, the caster's whispered message, target-only
  hearing, and the target's private whispered reply.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:290` defines casting
  through solid objects when the caster is familiar with the target and knows
  it is beyond the barrier, and says magical silence; 1 foot of stone, metal,
  or wood; or a thin sheet of lead blocks the spell.
- `.references/srd-5.2.1/Classes/Bard.md:151`,
  `.references/srd-5.2.1/Classes/Druid.md:192`,
  `.references/srd-5.2.1/Classes/Sorcerer.md:231`, and
  `.references/srd-5.2.1/Classes/Wizard.md:150` are the level-1 spell-list
  pressure rows.
- `UBIQUITOUS_LANGUAGE.md:32` confirms Action casting maps to a Magic Action
  spell invocation when modeled at runtime.
- `UBIQUITOUS_LANGUAGE.md:234` through `UBIQUITOUS_LANGUAGE.md:244`
  distinguish Spell Definition, Spell Access, Spell Invocation, and Spell
  Effect ownership.
- `UBIQUITOUS_LANGUAGE.md:270` defines Transmutation as transformation magic.

## Current Generated State

- Unit pressure id: `message`.
- `plans/unit-profile-coverage/srd-unit-inventory.json` has four level-1 spell
  pressure rows: Bard, Druid, Sorcerer, and Wizard.
- Each row has `surface.state: outside-surface-runtime-mechanics`,
  `authoredContent.state: missing-authored-record`,
  `catalogAdmission.state: not-installed`, no owner evidence, and
  `finalDisposition: catalog-only/dead-for-now`.
- Each row has `battleReadinessStatus: accepted-no-battle-effect`.
- Each row's next action says private communication and barrier/silence
  blocking are exploration communication effects outside promoted runtime
  owners.
- `plans/unit-profile-coverage/unit-matrix.json` has no `message` Unit matrix
  row.
- `packages/surface/content/message.json` and
  `packages/surface/content/message.dhall` do not exist.
- `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/profiles.jsonl`,
  `plans/unit-profile-coverage/unit-evidence.jsonl`, and
  `plans/unit-profile-coverage/task-claims.jsonl` have no `message` rows.
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md` lists `message` under
  No Matrix SRD Pressure, outside the strict executable denominator.

## Owner Classification

- `packageOwner: null`
- `closureKind: catalog-only/no-runtime-profile`

No promoted runtime package currently owns private creature-to-creature
communication, target-only hearing permissions, reply-channel permissions,
through-barrier familiarity and knowledge adjudication, magical-silence
blocking, or material barrier blocking for communication. Existing battle
runtime targeting and range concepts do not by themselves create a Message
owner, because the spell's consequential payload is communication access rather
than damage, conditions, movement, active combat state, light, obscurement, or a
persisted Spell Effect.

## Effect Classification

| RAW effect | Classification | Rationale |
| --- | --- | --- |
| Point toward a creature within 120 feet | Runtime-detached communication targeting adjudication | Range and target choice are invocation legality facts, but there is no admitted Message UnitRecord or communication owner to consume them. |
| Caster whispers a message heard only by the target | Runtime-detached communication access adjudication | Private hearing and message contents are table-facing communication facts, not battle-owned Spell Effect state. |
| Target can reply in a whisper heard only by the caster | Runtime-detached reciprocal communication adjudication | The reply permission is a temporary communication channel with no current runtime owner for message contents or speaker/listener permissions. |
| Cast through solid objects when familiar with the target and aware it is beyond the barrier | Runtime-detached table adjudication | Familiarity, knowledge that the target is beyond a barrier, and barrier traversal are exploration communication facts. |
| Magical silence blocks the spell | Runtime-detached communication/silence adjudication | Silence is relevant to the communication attempt, but no current Message profile or communication owner models sound propagation or whisper delivery. |
| 1 foot of stone, metal, or wood, or a thin sheet of lead, blocks the spell | Runtime-detached material-barrier adjudication | Barrier material and thickness are map/environment facts outside the promoted battle-runtime owner boundary. |

## Decision

Keep `message` as no-matrix spell pressure with no runtime profile. The SRD
mechanics are private communication, a temporary reply permission, and
communication blocking by magical silence or specified barriers. Those facts are
exploration and table adjudication outside the current promoted runtime owner
boundary.

The existing Strict Level 1 report treatment is correct: the Bard, Druid,
Sorcerer, and Wizard spell-list pressures are product readiness
accepted/no-battle-effect pressure and remain outside strict support accounting
because no executable Unit matrix row exists.

## Promotion Gate

Do not promote this pressure into a Unit claim or strict-support closure until
the base Unit gates are true:

- a SRD-provenance `message` Surface UnitRecord exists;
- the UnitRecord is admitted into the relevant catalog boundary;

After those gates, promotion still needs one of these owner decisions:

- a communication owner explicitly accepts private message contents,
  target-only hearing, reply permissions, silence blocking, and barrier-material
  blocking as runtime state or typed table-supplied witnesses; or
- the decider chooses to close an admitted Unit as runtime-detached
  communication adjudication.

Without those gates, adding a Unit claim, support profile, evidence row, or
runtime behavior would treat a spell-list pressure row as a Unit that does not
exist.

## Follow-Up Tasks

None for the current plan. A future communication or environment/barrier owner
would be a new product boundary, not a Task 11 prerequisite. If that boundary is
created later, add a separate implementation atom to author/admit `message`
before adding any Unit claim, runtime closure, or runtime behavior.

## Verification

- RAW checked against `.references/srd-5.2.1/Spells/Descriptions-M-P.md:279`
  through `.references/srd-5.2.1/Spells/Descriptions-M-P.md:290`.
- Spell-list pressure checked against `.references/srd-5.2.1/Classes/Bard.md:151`,
  `.references/srd-5.2.1/Classes/Druid.md:192`,
  `.references/srd-5.2.1/Classes/Sorcerer.md:231`, and
  `.references/srd-5.2.1/Classes/Wizard.md:150`.
- Ubiquitous language checked for Magic Action, Spell Definition, Spell Access,
  Spell Invocation, Spell Effect, and Transmutation terminology.
- Generated state checked against `srd-unit-inventory.json`,
  `unit-matrix.json`, `LEVEL1_FULL_SUPPORT.md`, Surface content paths, and
  existing claim/profile/evidence row files.
