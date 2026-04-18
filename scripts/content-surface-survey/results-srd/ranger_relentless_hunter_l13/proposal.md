# Proposal: Ranger Relentless Hunter (L13)

## Unit

- **Name**: Relentless Hunter
- **Kind**: `class_feature` / `passive`
- **Acquired at**: Ranger level 13
- **SRD text**: "Taking damage can't break your Concentration on *Hunter's Mark*."

## Why encoding fails

The feature is structurally a passive class feature — `family: "passive"` is the correct shell, and `acquiredAtLevel`, `className`, etc. all fit. The problem is the payload atom.

The mechanic is: the concentration-break-on-damage rule (SRD Playing the Game: "Each time you take damage while concentrating on a spell, you must succeed on a Constitution saving throw…") **does not apply** when the concentration is specifically on Hunter's Mark. This is complete suppression of the mechanic for that spell — not advantage on the save, not auto-success with a condition, but immunity.

### What the surface currently offers

| Atom | Why it fails |
|---|---|
| `modify_roll_advantage` (mode: "advantage") | Advantage ≠ immunity. Also, `saveSourceFilter` only supports `{ kind: "spell_or_other_magical_effect" }` — there is no filter for "damage-induced concentration check". |
| `grant_condition_immunity` | Suppresses SRD *conditions*, not the concentration-break mechanic. |
| `block_max_hp_reduction` | Unrelated. |
| Any DurationEndTrigger suppression | `DurationEndTrigger` only appears on Duration itself, not on passive grants; and none of its variants cover "concentration save from damage". |

### v4 taxonomy gap

The v4 taxonomy (TAXONOMY_atoms_graph.md) does not include any atom for suppressing or modifying the concentration-check-on-damage mechanic. The nearest v4 atoms are:
- `modify_roll_advantage` — wrong semantics (advantage vs. suppression)
- No equivalent of `suppress_concentration_break`

## Proposed widenings

### Option A — New atom `suppress_concentration_break`

```typescript
| {
    readonly kind: "suppress_concentration_break";
    // Scope to a specific spell's concentration, or omit for all concentration.
    readonly spellId?: string;
    // Narrow to a specific damage trigger (default: all damage).
    readonly trigger?: "damage";
  }
```

**Justification**: The SRD concept is a named, discrete rule: "damage cannot break concentration [on this spell]." It appears on multiple potential future units (e.g., a hypothetical War Caster improvement, class-specific feature, magic item). Encoding it as a first-class atom makes the rule unambiguous and avoids misrepresenting it as a save modifier.

**Encoding of Relentless Hunter**:
```dhall
{ family = "passive"
, grants =
    [ { kind = "suppress_concentration_break"
      , spellId = Some "hunters_mark"
      , trigger = Some "damage"
      }
    ]
}
```

### Option B — New mode on `modify_roll_advantage` + new `saveSourceFilter` variant

Widen `modify_roll_advantage.mode` to add `"auto_success"` and add:
```typescript
| { readonly kind: "damage_induced_concentration_check"; readonly spellId?: string }
```
to `SavingThrowSourceFilter`.

**Encoding of Relentless Hunter**:
```json
{
  "kind": "modify_roll_advantage",
  "mode": "auto_success",
  "on": ["saving_throw"],
  "saveSourceFilter": { "kind": "damage_induced_concentration_check", "spellId": "hunters_mark" }
}
```

**Assessment**: This is possible but awkward — "auto_success" on a saving throw is mechanically different from advantage/disadvantage (it bypasses the roll entirely), and encoding it within `modify_roll_advantage` blurs the atom's semantics. Option A is cleaner.

## Recommendation

**Option A** — new `suppress_concentration_break` atom. It names the rule exactly, composes naturally with `passive` family grants, and is specific enough that no existing atom is a plausible stand-in. Classification: `atom_widening`.
