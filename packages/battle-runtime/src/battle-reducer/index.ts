// Barrel for battle-reducer subpackage. Re-exports the modules extracted from
// the original `battle-reducer.ts` monolith. The remaining behavior still
// lives in `../battle-reducer.ts`; only leaf constants and pure helpers have
// been split out so far.

export * from "./domain-constants.ts";
export * from "./domain-helpers.ts";
export * from "./spell-effects.ts";
export * from "./damage-helpers.ts";
export * from "./creature-state-leaves.ts";
export * from "./movement-speed.ts";
export * from "./hole-helpers.ts";
export * from "./result-helpers.ts";
export * from "./statblock.ts";
export * from "./statblock-attacks.ts";
export * from "./attack-damage-apply.ts";
export * from "./ongoing-feature-helpers.ts";
export * from "./attack-roll.ts";
export * from "./creature-state.ts";
export * from "./spell-condition-effects-helpers.ts";
export * from "./damage-apply.ts";
export * from "./spells-discovery.ts";
export * from "./spells-profiles.ts";
export * from "./spells-holes-fills.ts";
