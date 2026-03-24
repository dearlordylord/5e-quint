// Source: https://rpg.stackexchange.com/q/93132
module _qa_126f82b8695d4097 {
  import dnd.* from "./dnd"

  // SKIP: Arcane Recovery (Wizard class feature) is not modeled in the spec — no `pArcaneRecovery` function, no `arcaneRecoveryUsed` tracking field in `SpellSlotState` or `CreatureState`, and short rest only restores pact slots (`pRestorePactSlots`). The once-per-day use constraint cannot be expressed with existing spec functions.
}
