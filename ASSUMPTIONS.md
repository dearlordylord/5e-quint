# Modeling Assumptions

Strictness decisions where the PHB rules imply a constraint that isn't strictly necessary for model safety but reflects how the game actually works. Each entry records the assumption, rules justification, and what changed in both Quint and XState.

## A1: Spell slot expenditure requires ability to act

**Assumption:** EXPEND_SLOT and EXPEND_PACT_SLOT are only valid when conscious (hp > 0, not dead) AND not incapacitated.

**Rules basis (PHB Ch. 10, Ch. 12):** Casting a spell requires an action or bonus action. The Incapacitated condition (PHB Ch. 12) prevents taking actions or reactions. Multiple conditions impose Incapacitated: Unconscious (from dropping to 0 HP), Paralyzed, Petrified, Stunned, and direct Incapacitated. Any of these should block slot expenditure.

**Changes:**
- `dnd.qnt`: `doExpendSlot` and `doExpendPactSlot` guarded by `isConscious(state) and pCanAct(state)`
- `machine-states.ts`: `EXPEND_SLOT` and `EXPEND_PACT_SLOT` given `canExpendSlot` guard
- `machine.ts`: added `canExpendSlot` guard (`c.hp > 0 && !isIncapacitated(c)`)
