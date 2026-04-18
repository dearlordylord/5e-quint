# Proposal: Storm of Vengeance — atom_widening

## Unit

- Slug: `storm_of_vengeance`
- Kind: spell
- Level: 9 / School: Conjuration
- Duration: Concentration, up to 1 minute
- Family: `ongoing_effect` (structurally correct, but under-powered surface)

## Summary

Storm of Vengeance cannot be honestly encoded. Two independent blockers prevent a valid trace:

1. **Phased turn-sequenced operations** — the spell fires a different effect on each turn of concentration. The current `OngoingTrigger` vocabulary has no mechanism to express "fire only on caster turn N."
2. **Missing area-environmental effect atoms** — Turns 5-10 impose Difficult Terrain, Heavily Obscured, ranged weapon prohibition, and Strong Wind on the area. None of these have corresponding EffectAtom variants.

---

## Blocker 1 — Phased Turn-Sequenced Operations

### What the SRD says

> At the start of each of your later turns, the storm produces different effects, as detailed below.
> - **Turn 2:** 4d6 Acid damage to all creatures/objects under cloud (no save)
> - **Turn 3:** Six Dex saves → 10d6 Lightning or half (6 distinct targets)
> - **Turn 4:** 2d6 Bludgeoning to all under cloud (no save)
> - **Turns 5–10:** 1d6 Cold to all + environmental effects (for remainder of duration)

### What the surface can express

`OngoingEffectMechanics.operations` is `ReadonlyNonEmptyArray<OngoingOperation>`. Each `OngoingOperation` has a `trigger: OngoingTrigger`. The only per-caster-turn trigger is:

```typescript
{ readonly kind: "on_caster_turn_start" }
```

This fires on **every** caster turn for the spell's lifetime. There is no way to say "fire this operation only on turn 2" or "fire this operation on turns 5 through 10."

### Proposed widening

**New `OngoingTrigger` variant** (surface_widening):

```typescript
| {
    readonly kind: "on_caster_turn_n";
    readonly turnMin: number;   // inclusive; 1-indexed from cast
    readonly turnMax?: number;  // inclusive; absent = fire every turn >= turnMin
  }
```

This would allow:

```
{ kind: "on_caster_turn_n", turnMin: 2, turnMax: 2 }   // Turn 2 acid
{ kind: "on_caster_turn_n", turnMin: 3, turnMax: 3 }   // Turn 3 lightning
{ kind: "on_caster_turn_n", turnMin: 4, turnMax: 4 }   // Turn 4 hail
{ kind: "on_caster_turn_n", turnMin: 5 }               // Turns 5-10 cold+env
```

Tracer extension needed: a new `turn_start_window` node labeled with the turn range, emitted from the procedure via `opens_window`.

---

## Blocker 2 — Missing Area-Environmental Effect Atoms

### 2a. `difficult_terrain`

**SRD text:** "Until the spell ends, the area is Difficult Terrain"

Difficult Terrain halves movement speed for creatures moving through it (SRD 5.2.1 Playing-the-Game). This is a **zone-level property**, not a per-creature speed modification. The existing `set_speed_ratio` and `modify_speed` atoms apply to creatures, not to zones.

**Proposed atom:**
```typescript
| {
    readonly kind: "difficult_terrain";
    // No additional fields needed — the zone is set by the Attachment.
  }
```

### 2b. `heavily_obscured`

**SRD text:** "the area is ... Heavily Obscured"

Per SRD 5.2.1 Rules Glossary, a Heavily Obscured area causes creatures inside to effectively have the Blinded condition for sight-dependent tasks. This is a zone-level visibility state distinct from the Blinded condition applied to a creature. `apply_condition { kind: "blinded" }` would be wrong (it would flag the creature as having the Blinded condition, which is a different mechanical state from being in a heavily obscured zone — other creatures outside the zone are not affected by the creature's condition).

**Proposed atom:**
```typescript
| {
    readonly kind: "area_heavily_obscured";
  }
```

### 2c. Ranged Weapon Attack Prohibition

**SRD text:** "ranged attacks with weapons are impossible there"

This is a zone-level prohibition on one category of attack. `block_targeting` per its SRD pressure cases (Globe of Invulnerability, Sanctuary) targets magical ability targeting, not physical weapon attacks. Using `block_targeting { scope: "ranged weapon attacks in area" }` would be a false trace — the tracer emits a node labeled with scope as a string, but the semantic family is wrong.

**Proposed atom:**
```typescript
| {
    readonly kind: "block_ranged_weapon_attacks";
    // Scoped to the Attachment's area; no additional fields needed.
  }
```

Alternatively this could be modeled as a `modify_roll_advantage { mode: "disadvantage", ... }` with no roll target — but RAW says "impossible", not "disadvantage", so that would also be dishonest.

### 2d. `strong_wind`

**SRD text:** "strong wind blows through the area"

Per SRD 5.2.1 Rules Glossary, Strong Wind imposes disadvantage on ranged attack rolls made with weapons AND on Perception checks relying on hearing, and extinguishes unprotected open flames. This is a named environmental state with multiple downstream mechanical effects. It partially overlaps with 2c (ranged attack prohibition when combined with the gusts mechanic), but per RAW both appear explicitly in Turns 5-10.

**Proposed atom:**
```typescript
| {
    readonly kind: "strong_wind";
  }
```

The downstream effects (disadvantage on ranged weapon attacks, disadvantage on hearing-based Perception, extinguish flames) flow from the SRD environmental rule and do not need to be separately listed on the atom — the atom names the state, and the rules engine applies the consequences.

---

## Secondary Note — Turn 3 Six-Target Lightning

Turn 3 ("six bolts of lightning to strike six different creatures or objects") uses a fixed count of 6 distinct targets. This could be approximated with:

```dhall
{ kind = "target"
, selection = { mode = "choose_up_to", count = 6, typeFilter = None }
}
```

with a `save_gate` phase. This is not a blocker in isolation — the selection shape is serviceable — but it cannot be correctly encoded until Blocker 1 (turn-sequenced triggers) is resolved.

---

## Classification

| Gap | Kind | Priority |
|-----|------|----------|
| Turn-sequenced OngoingTrigger | `new_variant` (surface_widening) | Required |
| `difficult_terrain` area atom | `new_atom` (atom_widening) | Required |
| `area_heavily_obscured` atom | `new_atom` (atom_widening) | Required |
| `block_ranged_weapon_attacks` atom | `new_atom` (atom_widening) | Required |
| `strong_wind` atom | `new_atom` (atom_widening) | Required |

All five gaps must be addressed before Storm of Vengeance can be honestly encoded. The dominant gap category is `atom_widening` (four missing atoms), with a secondary `surface_widening` for the phased trigger variant.
