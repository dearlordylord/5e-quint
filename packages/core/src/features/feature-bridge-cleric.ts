// Cleric feature bridge — query-only re-exports (no BridgeResult, no state mutations)

export {
  blessedHealerSelfHeal,
  type BlessedStrikesChoice,
  canUseDivineIntervention,
  channelDivinityMax,
  clericChannelDivinityMax,
  discipleOfLifeBonus,
  type DivineOrderChoice,
  divineSparkAmount,
  divineSparkDice,
  divineStrikeDice,
  hasGreaterDivineIntervention,
  hasTurnUndead,
  improvedPotentSpellcastingTempHp,
  potentSpellcastingBonus,
  preserveLifePool,
  searUndeadDice,
  supremeHealing,
  thaumaturgeBonus,
} from "#/features/class-cleric.ts";
