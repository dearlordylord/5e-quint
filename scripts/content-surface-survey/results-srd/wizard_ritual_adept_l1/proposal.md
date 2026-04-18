# Proposal: Ritual Adept (wizard L1) — atom_widening

## Unit

**Name:** Ritual Adept  
**Kind:** class_feature (wizard, L1)  
**Provenance:** srd-5.2.1, Classes/Wizard#Ritual Adept

> You can cast any spell as a Ritual if that spell has the Ritual tag and the spell is in your spellbook. You needn't have the spell prepared, but you must read from the book to cast a spell in this way.

---

## Why it doesn't fit

The `passive` family is the correct mechanics family — this is always-on while the wizard has the feature. However, there is no effect atom that can honestly encode the grant.

### The gap: categorical spell-access vs. per-spell access

`grant_spell_access` requires a specific `spellId` and a `SpellAccessMode`. Every call site is one named spell:

```typescript
{
  readonly kind: "grant_spell_access";
  readonly spellId: string;       // ← required, per-spell
  readonly mode: SpellAccessMode;
}
```

Ritual Adept's scope is **categorical**: it applies to every spell that satisfies two predicates simultaneously:

1. The spell has the **Ritual** tag.
2. The spell is **in the wizard's spellbook**.

There is no bounded enumeration of spells to expand into a list of `grant_spell_access` atoms — the wizard's spellbook is open-ended and changes at play time.

### Secondary constraint: source gate (must read from book)

Even if the categorical scope were solved, the "must read from the book" clause is an additional casting constraint that no existing `ClassFeatureActivationCost` or `SpellAccessMode` variant expresses. It is a source-gate on casting — the spell's usual casting components still apply, but the caster is additionally constrained to have the physical book in hand. This is secondary to the scope gap but would need surface coverage.

---

## Proposed widening

### New atom: `grant_ritual_casting`

```typescript
| {
    readonly kind: "grant_ritual_casting";
    // Source the spell must be drawn from. "spellbook" is the Wizard
    // case; future pressure could add "spell_list" for Cleric / Druid
    // ritual casting variants.
    readonly source: "spellbook";
    // Whether the caster must have the book physically accessible.
    readonly requiresReadingFromBook?: true;
  }
```

**Emission:** Passive grant node → `grant_ritual_casting` effect node. No new relation needed; standard `grants` edge.

**Scope:** The atom records the categorical eligibility rule. The predicate (Ritual tag present, spell in spellbook) is resolved per-cast by the engine against the character's current spellbook state — not at encoding time.

---

## Alternatively: new variant on `grant_spell_access`

If the taxonomy prefers to keep ritual casting inside `grant_spell_access`, a categorical mode variant could be introduced:

```typescript
| {
    readonly kind: "ritual_from_source";
    readonly source: "spellbook";
    readonly requiresReadingFromBook?: true;
  }
```

as a new member of `SpellAccessMode`, paired with a wildcard `spellId` sentinel (e.g. `"*"` or a new `spellScope` field). However, this would require `spellId` to become optional, complicating all existing call sites and making invalid states more representable. A standalone atom is cleaner.

---

## Files not written

- `content/wizard_ritual_adept_l1.dhall` — not authored (no honest encoding possible)
- `content/wizard_ritual_adept_l1.json` — not authored
- `content/wizard_ritual_adept_l1.trace.md` — not authored
