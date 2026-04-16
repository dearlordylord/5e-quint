# Proposal: Mind Blank — atom_widening

## Unit
**Mind Blank** — Level 8 abjuration spell, SRD 5.2.1, section `Spells/Descriptions-M-R#Mind Blank`.

## Outcome
`atom_widening` — The `ongoing_effect` family is the correct structural fit. The blocker is that all three of Mind Blank's core effects are absent from the v4 atom inventory and from the `OngoingOperation` surface type.

## Why ongoing_effect fits

Mind Blank is a clean `ongoing_effect` spell:
- Casting time: action → `action_quota`
- Level 8 → `spell_slot ≥ 8`
- Duration: 24 hours (timed, non-concentration) → `persist → expire`
- Range: Touch, single willing target → `{ kind: target, selection: { mode: one } }`

The `attach_to` → `operation` graph shape applies. The gap is entirely in what operations are available.

## Missing atoms

### 1. `grant_immunity` (new atom)

Mind Blank grants **Immunity** to Psychic damage. The v4 taxonomy has `grant_resistance` but not `grant_immunity`.

These are mechanically distinct:
- **Resistance**: damage is halved before application.
- **Immunity**: damage is not applied at all.

A `grant_resistance` atom cannot honestly represent immunity — the downstream math is different. A new `grant_immunity` atom is required, or a `mode` field added to `grant_resistance` with values `resistance | immunity`.

**Evidence:** "one willing creature you touch has Immunity to Psychic damage"

---

### 2. `grant_condition_immunity` (new atom)

Mind Blank grants ongoing immunity to the **Charmed** condition for 24 hours. The v4 taxonomy has:
- `apply_condition` — imposes a condition.
- `remove_condition` — lifts an active condition.

Neither covers "for the duration of this spell, the target cannot gain the Charmed condition." This is a persistent protective state, not an instantaneous removal. A new `grant_condition_immunity` atom is required.

**Evidence:** "one willing creature you touch has Immunity to ... the Charmed condition"

---

### 3. `block_divination` (new atom)

Mind Blank blocks a cluster of magical information-access effects:
- Sensing the target's emotions or alignment
- Reading the target's thoughts
- Magically detecting the target's location
- Gathering information about the target via any spell (including Wish)
- Remotely observing the target

The existing v4 atom `block_targeting` covers preventing attack and spell targeting — it is about the resolution path of an offensive action. The anti-divination clause is categorically different: it prevents the *initiation* of information-retrieval magic rather than redirecting or negating a targeting roll.

A new `block_divination` (or `block_magical_sensing`) atom is needed.

**Evidence:** "The target is also unaffected by anything that would sense its emotions or alignment, read its thoughts, or magically detect its location, and no spell—not even Wish—can gather information about the target, observe it remotely, or control its mind."

Note: "control its mind" partially overlaps with Charmed immunity (dominate effects impose Charmed), but the broader information-access clause is distinct and requires its own atom.

---

### 4. New `OngoingOperation` surface variant

The `OngoingOperation` union currently has two variants:
- `roll_modifier` — adds a dice delta to rolls.
- `damage_on_hit` — adds damage when the caster hits the attachment.

All of Mind Blank's effects require a new variant (or variants) of `OngoingOperation` to carry protection grants through the tracer. Candidates:
- `grant_protection` with a `kind` sub-discriminant (`damage_immunity | condition_immunity | block_divination`).
- Three separate operation variants.

If multiple operations are needed on a single ongoing spell, `OngoingEffectMechanics.operation` would also need to become an array (currently singular).

## Proposed encoding sketch (pending atom widening)

```
kind: spell
mechanics:
  family: ongoing_effect
  level: 8
  school: abjuration
  castingTime: { kind: action }
  range: { kind: touch }
  components: { v: true, s: true, m: false }
  duration: { kind: timed, value: { unit: hour, amount: 24 } }
  attachment: { kind: target, selection: { mode: one } }
  operations:   # currently singular — would need array widening
    - { kind: grant_immunity,            damageType: psychic }
    - { kind: grant_condition_immunity,  condition: charmed }
    - { kind: block_divination }
```

## Classification summary

| Gap | Kind | Narrowest classification |
|-----|------|--------------------------|
| `grant_immunity` atom absent | new_atom | atom_widening |
| `grant_condition_immunity` atom absent | new_atom | atom_widening |
| `block_divination` atom absent | new_atom | atom_widening |
| `OngoingOperation` lacks protection-grant variant | new_variant | surface_widening (driven by atom widening) |

Overall: **`atom_widening`** — the family is correct; the atoms are missing.
