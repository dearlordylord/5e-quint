/**
 * Authored-free character procedure execution vocabulary.
 *
 * Character and spell record admission lives in character-execution-admission;
 * reducers consume only the projected declarations exported here.
 */
export type * from "./procedure-execution/spell-procedure-execution.ts";
export type { SpellRuleExecutionFacts } from "./procedure-execution/spell-rule-facts.ts";
export type { WeaponAttackOverrideSpellProcedureExecution } from "./procedure-execution/weapon-attack-override.ts";
