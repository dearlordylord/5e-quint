# D&D 5e PHB — project notes

## Quint parity (CRITICAL)

The XState machine (`machine.ts`, `machine-helpers.ts`) MUST maintain full parity with the Quint spec (`dnd.qnt`). The MBT bridge (`machine.mbt.test.ts`) via `@firfi/quint-connect` is the correctness proof — 50 traces × 30 steps comparing Quint and XState state field-by-field.

- **Never** add logic to the XState machine that diverges from the Quint spec without updating the spec first.
- **Never** "fix" XState behavior that the Quint spec models differently — update the spec or accept it as spec-level intentional.
- **Never** remove or rename context fields that the MBT bridge maps — check `machine.mbt.test.ts` before removing anything from `DndContext`.
- If a simplify/refactor changes behavior, the MBT tests MUST still pass. If they don't, the refactor is wrong.

## Rules reference

`.references/rules/` — D&D 5e Player's Handbook chapters as markdown. Key files:

- `01-step-by-step-characters.md` — character creation, ability scores, XP table
- `05-equipment.md` — armor, weapons, gear
- `06-customization-options.md` — multiclassing, feats
- `07-using-ability-scores.md` — checks, saves, skills, contests
- `08-adventuring.md` — travel, resting, environment
- `09-combat.md` — turn structure, actions, attacks, damage, healing, death saves, conditions
- `10-spellcasting.md` — casting, components, concentration, spell slots
- `12-conditions.md` — 14 conditions + exhaustion
