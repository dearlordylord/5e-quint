/**
 * Dependency-light transport codecs for consumers that do not need the full
 * battle runtime API.
 */
export {
  BattleActPresentationSchema,
  BattleDroppedObjectOutcomeSchema,
  BattleFillSchema,
  BattleHoleSchema,
  BattleInterruptProcedureChoiceSchema,
  BattleObjectDamageOutcomeSchema,
  BattleObjectIgnitionOutcomeSchema,
  BattlePresentedSnapshotSchema,
  BattleShovePushOutcomeSchema,
  BattleSpellPresentationSchema,
} from "./battle-reducer/battle-codecs.ts";
export { BattleInitiativePositionSchema } from "./battle-initiative-position.ts";
export { BattleSubjectSchema } from "./battle-subjects.ts";
export { CombatantId } from "./identity.ts";
