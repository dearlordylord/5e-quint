# Proposal: ranger_precise_hunter_l17

## Unit

**Name**: Precise Hunter (Ranger Level 17)  
**Kind**: `class_feature`  
**SRD text**: "You have Advantage on attack rolls against the creature currently marked by your *Hunter's Mark*."

## Classification: `surface_widening`

## What fits

- `class_feature` record kind ✓  
- `passive` mechanics family ✓  
- `modify_roll_advantage` effect atom exists in both v4 taxonomy and `types.ts` ✓  
- `on: ["attack_roll"]` ✓  
- `mode: "advantage"` ✓  

## What is missing

`modify_roll_advantage` has no field to scope the advantage to attacks made **against a specifically marked target**. The existing filter fields are:

| Field | What it scopes |
|---|---|
| `attackerTypeFilter` | Creature type of the **attacker** |
| `skillFilter` | Skill for ability checks |
| `conditionFilter` | D20 tests to avoid/end a condition |
| `saveAbilityFilter` | Ability of a saving throw |
| `saveSourceFilter` | Spell/magical-effect source of a save |

None can express "against the target that currently has [spellId]'s mark attachment on it." Encoding without this filter would be dishonest — the trace would read as advantage on all attack rolls rather than only against the marked creature.

## Proposed widening

Add an optional `targetMarkedBySpellFilter` field (or a general `targetStateFilter`) to `modify_roll_advantage`:

```typescript
// Option A — narrow, mark-specific
readonly targetMarkedBySpellFilter?: string; // spellId

// Option B — general target-state filter (admits future similar riders)
readonly targetStateFilter?: {
  readonly kind: "marked_by_spell";
  readonly spellId: string;
};
```

**Option B** is preferred: future class features or magic items may similarly scope a roll modifier to "targets that have a specific ongoing effect." The closed `kind` discriminant keeps the vocabulary explicit.

## Encoding (blocked)

No `.dhall` or `.json` authored — encoding blocked until the widening lands.

## Reference

SRD 5.2.1 `Classes/Ranger#Level 17: Precise Hunter`
