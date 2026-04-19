# Proposal: Astral Projection (atom_widening)

## Why this unit cannot be encoded honestly

Astral Projection's core mechanic is a **dual-entity projection**: the spell simultaneously places each target's astral form in the Astral Plane AND leaves the physical body on the origin plane in suspended animation. The two entities are fully isolated — damage to one has no effect on the other.

No existing effect atom captures this mechanic:

- `transport_exile { destination: "astral_plane" }` — wrong: implies the creature moves *entirely* to the Astral Plane. The body does not remain.
- `transform_target` — wrong: replaces the creature's form; doesn't create a second simultaneous entity.
- `apply_condition: unconscious` — only models the body side; says nothing about an astral form existing in a separate plane.

Authoring `transport_exile` would produce a trace that says "the creature was exiled to the Astral Plane" — omitting that the original body stays behind, that there are now two entities, and that damage to one has no effect on the other. That trace would be actively misleading.

## Proposed widenings

### 1. New atom: `create_astral_projection`

```
{
  kind: "create_astral_projection",
  destination: ExileDestination,          // "astral_plane"
  bodyState: "suspended_animation",       // body: Unconscious, no food/air/aging
  entityIsolation: true                   // damage to one ≠ damage to the other
}
```

**Semantics:** Projects the target's consciousness/spirit as an astral form into `destination` while leaving the physical body on the origin plane in the named `bodyState`. Creates a dual-entity state. The silver cord connecting the two entities is a structural consequence of this atom (DM resolves cord-cutting events via "an effect states that it does so").

**Pressure:** Astral Projection (1 hit in SRD 5.2.1). The pattern may generalize to Etherealness, though that spell projects the creature to the Border Ethereal with fewer split-entity semantics.

**v4 taxonomy slot:** Effect atom. The projection creates a bound astral companion on the destination plane; `create_companion` could be a loose analogy but that atom is for spawned creatures under the caster's control, not projections of the caster's own party.

---

### 2. New variant: `permanent.endsOn` — `"caster_magic_action"`

The current `permanent.endsOn` union is `"dispel" | "damage"`. Astral Projection adds a third termination path: the caster takes a Magic action to end the spell for **all targets simultaneously**. This is distinct from Dispel Magic (external dispel targeting the effect).

```typescript
// Proposed addition to permanent.endsOn
"caster_magic_action"
```

This appears in other SRD spells (e.g., Sequester, Programmed Illusion) as a voluntary caster-side total-teardown. It is not adequately represented by the existing "dispel" sentinel.

---

### 3. New variant: `DurationEndTrigger` — `target_at_zero_hp`

The spell ends for an individual target when that target's body or astral form reaches 0 HP. The existing `DurationEndTrigger` variants (`target_takes_damage`, `target_makes_attack_roll`, etc.) don't capture this threshold condition, and none apply to `permanent`-kind durations (which have no `earlyEnd` field today).

This would require:
- Adding `earlyEnd` support to `permanent` duration, OR
- A per-target-scoped zero-HP end condition expressed alongside the entity-state atom.

---

## What CAN be encoded (if the atom existed)

The rest of the spell fits the surface cleanly:

| Field | Encoding |
|-------|----------|
| Kind | `spell` |
| Family | `activation` |
| Casting time | `{ kind: "minutes", amount: 60, ritual: false }` |
| Level | 9 |
| School | `"necromancy"` |
| Range | `{ kind: "point", feet: 10 }` |
| Components | `{ v: true, s: true, m: "...", materialConsumed: true }` |
| Duration | `{ kind: "permanent", endsOn: ["dispel"] }` (partial — caster_magic_action missing) |
| Attachment | `{ kind: "target", selection: { mode: "choose_up_to", count: 9 } }` |
| Phase | `{ kind: "direct", effects: [create_astral_projection] }` |

The silver cord mechanic ("cut only when an effect states it does so") is explicitly DM-agenda by the spell text and requires no atom — the spell itself delegates this to named external effects.
