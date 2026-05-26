// KERNEL-COVERAGE: parity-witness BATTLE.SANCTUARY.TARGETING_INTERDICTION
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1H-SANCTUARY sanctuary
// UNIT-IDENTITY-MBT-REPLAY: L1H-SANCTUARY sanctuary doCastSanctuaryWardCreation doInterdictDirectAttackFailedSaveLoss doInterdictDirectSpellSuccessfulSavePassThrough doRetargetDirectAttackToLegalReplacement doRejectIllegalReplacementTarget doExcludeAreaEffectFromInterdiction doEndWardOnWardedAttackRoll doEndWardOnWardedSpellCast doEndWardOnWardedDamageDealt
import * as path from "node:path";

import { Either } from "effect";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  DieRollResult,
  Hp,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";

import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";
import {
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  startBattle,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleCreatureInit,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";

type SanctuarySelectedIdentityLastResult =
  | "init"
  | "wardCreated"
  | "attackLost"
  | "spellSaveSucceeded"
  | "replacementAdmitted"
  | "replacementRejected"
  | "areaEffectExcluded"
  | "attackRollEndedWard"
  | "spellCastEndedWard"
  | "damageEndedWard";
type SanctuarySelectedIdentityProjection = {
  readonly wardPresent: boolean;
  readonly wardSourceIsSanctuary: boolean;
  readonly wisdomSaveRequested: boolean;
  readonly attackOrSpellLost: boolean;
  readonly successfulSavePassThrough: boolean;
  readonly legalReplacementPassThrough: boolean;
  readonly illegalReplacementRejected: boolean;
  readonly areaEffectBypassedInterdiction: boolean;
  readonly wardedHp: number;
  readonly lastResult: SanctuarySelectedIdentityLastResult;
};
type SanctuarySelectedIdentityAction =
  | "doCastSanctuaryWardCreation"
  | "doInterdictDirectAttackFailedSaveLoss"
  | "doInterdictDirectSpellSuccessfulSavePassThrough"
  | "doRetargetDirectAttackToLegalReplacement"
  | "doRejectIllegalReplacementTarget"
  | "doExcludeAreaEffectFromInterdiction"
  | "doEndWardOnWardedAttackRoll"
  | "doEndWardOnWardedSpellCast"
  | "doEndWardOnWardedDamageDealt";
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly SanctuarySelectedIdentityAction[];
  readonly expected: SanctuarySelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L1H-SANCTUARY";
  readonly unitId: typeof sanctuaryUnitId;
  readonly actions: readonly SanctuarySelectedIdentityAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

type BonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionSpell" }
  >;
};
type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type AttackAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
};
type NeedsHolesBattleResult = Extract<
  BattleResolutionResult,
  { readonly tag: "needsHoles" }
>;
type ResolvedBattleResult = Extract<
  BattleResolutionResult,
  { readonly tag: "resolved" }
>;
type SanctuaryWardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "sanctuaryWard" }
>;

const sanctuaryUnitId = "sanctuary";
const burningHandsUnitId = "burning_hands";
const fireBoltUnitId = "fire_bolt";
const longstriderUnitId = "longstrider";
type SanctuarySelectedIdentityActionSpellUnitId =
  | typeof burningHandsUnitId
  | typeof fireBoltUnitId
  | typeof longstriderUnitId;
type SanctuarySelectedIdentitySpellUnitId =
  | typeof sanctuaryUnitId
  | SanctuarySelectedIdentityActionSpellUnitId;
const casterId = combatantId("sanctuary-selected-identity-caster");
const wardedId = combatantId("sanctuary-selected-identity-warded");
const attackerId = combatantId("sanctuary-selected-identity-attacker");
const replacementId = combatantId("sanctuary-selected-identity-replacement");
const partySide = battleCombatantSide("party");
const enemySide = battleCombatantSide("enemy");
const unarmedStrikeAttackName = "Unarmed Strike";
const initialWardedHp = 12;
const damageDealtByWardedCreature = 1;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Sanctuary selected identity Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "L1H-SANCTUARY",
    unitId: "sanctuary",
    actions: [
      "doCastSanctuaryWardCreation",
      "doInterdictDirectAttackFailedSaveLoss",
      "doInterdictDirectSpellSuccessfulSavePassThrough",
      "doRetargetDirectAttackToLegalReplacement",
      "doRejectIllegalReplacementTarget",
      "doExcludeAreaEffectFromInterdiction",
      "doEndWardOnWardedAttackRoll",
      "doEndWardOnWardedSpellCast",
      "doEndWardOnWardedDamageDealt",
    ],
    sequences: [
      {
        name: "bonus-action-cast-creates-source-owned-ward",
        actions: ["doCastSanctuaryWardCreation"],
        expected: expectedProjection({
          wardPresent: true,
          wardSourceIsSanctuary: true,
          lastResult: "wardCreated",
        }),
      },
      {
        name: "failed-wisdom-save-loses-direct-attack",
        actions: ["doInterdictDirectAttackFailedSaveLoss"],
        expected: expectedProjection({
          wardPresent: true,
          wardSourceIsSanctuary: true,
          wisdomSaveRequested: true,
          attackOrSpellLost: true,
          lastResult: "attackLost",
        }),
      },
      {
        name: "successful-wisdom-save-passes-direct-spell-through",
        actions: ["doInterdictDirectSpellSuccessfulSavePassThrough"],
        expected: expectedProjection({
          wardPresent: true,
          wardSourceIsSanctuary: true,
          wisdomSaveRequested: true,
          successfulSavePassThrough: true,
          lastResult: "spellSaveSucceeded",
        }),
      },
      {
        name: "failed-save-retargets-direct-attack-to-legal-replacement",
        actions: ["doRetargetDirectAttackToLegalReplacement"],
        expected: expectedProjection({
          wardPresent: true,
          wardSourceIsSanctuary: true,
          wisdomSaveRequested: true,
          legalReplacementPassThrough: true,
          lastResult: "replacementAdmitted",
        }),
      },
      {
        name: "failed-save-rechecks-replacement-target-legality",
        actions: ["doRejectIllegalReplacementTarget"],
        expected: expectedProjection({
          wardPresent: true,
          wardSourceIsSanctuary: true,
          wisdomSaveRequested: true,
          illegalReplacementRejected: true,
          lastResult: "replacementRejected",
        }),
      },
      {
        name: "area-effect-spell-bypasses-sanctuary-interdiction",
        actions: ["doExcludeAreaEffectFromInterdiction"],
        expected: expectedProjection({
          wardPresent: true,
          wardSourceIsSanctuary: true,
          areaEffectBypassedInterdiction: true,
          lastResult: "areaEffectExcluded",
        }),
      },
      {
        name: "warded-attack-roll-ends-ward",
        actions: ["doEndWardOnWardedAttackRoll"],
        expected: expectedProjection({ lastResult: "attackRollEndedWard" }),
      },
      {
        name: "warded-spell-cast-ends-ward",
        actions: ["doEndWardOnWardedSpellCast"],
        expected: expectedProjection({ lastResult: "spellCastEndedWard" }),
      },
      {
        name: "warded-damage-source-ends-ward",
        actions: ["doEndWardOnWardedDamageDealt"],
        expected: expectedProjection({
          wardedHp: initialWardedHp - damageDealtByWardedCreature,
          lastResult: "damageEndedWard",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const sanctuaryDiscoveries = {
  doCastSanctuaryWardCreation: projectWardCreation,
  doInterdictDirectAttackFailedSaveLoss: projectDirectAttackLost,
  doInterdictDirectSpellSuccessfulSavePassThrough:
    projectDirectSpellSuccessfulSave,
  doRetargetDirectAttackToLegalReplacement: projectLegalReplacementTarget,
  doRejectIllegalReplacementTarget: projectIllegalReplacementTarget,
  doExcludeAreaEffectFromInterdiction: projectAreaEffectExclusion,
  doEndWardOnWardedAttackRoll: projectAttackRollEarlyEnd,
  doEndWardOnWardedSpellCast: projectSpellCastEarlyEnd,
  doEndWardOnWardedDamageDealt: projectDamageEarlyEnd,
} as const satisfies Record<
  SanctuarySelectedIdentityAction,
  () => SanctuarySelectedIdentityProjection
>;

defineSelectedIdentityWitness({
  describeLabel: "Sanctuary selected identity MBT",
  taskId: "sanctuary-selected-identity",
  specFile: path.resolve(
    import.meta.dirname,
    "../battle-runtime-sanctuary-selected-identity.mbt.qnt",
  ),
  projectionSchema: {
    wardPresent: "bool",
    wardSourceIsSanctuary: "bool",
    wisdomSaveRequested: "bool",
    attackOrSpellLost: "bool",
    successfulSavePassThrough: "bool",
    legalReplacementPassThrough: "bool",
    illegalReplacementRejected: "bool",
    areaEffectBypassedInterdiction: "bool",
    wardedHp: "int",
    lastResult: "str",
  },
  initialProjection: projectInitialBattle(),
  units: selectedUnitIdentityReplays.map((replay) => ({
    unitId: replay.unitId,
    procedures: replay.sequences.map((sequence) => {
      const actionName = singleReplayAction(
        replay.unitId,
        sequence.name,
        sequence.actions,
      );
      return {
        actionName,
        projectionAfter: sequence.expected,
        discover: sanctuaryDiscoveries[actionName],
      };
    }),
  })),
});

function singleReplayAction(
  unitId: typeof sanctuaryUnitId,
  sequenceName: string,
  actions: readonly SanctuarySelectedIdentityAction[],
): SanctuarySelectedIdentityAction {
  if (actions.length !== 1 || actions[0] === undefined) {
    throw new Error(
      `Expected single Sanctuary selected identity replay action for ${unitId}:${sequenceName}.`,
    );
  }
  return actions[0];
}

function expectedProjection(
  overrides: Partial<SanctuarySelectedIdentityProjection> = {},
): SanctuarySelectedIdentityProjection {
  return {
    wardPresent: false,
    wardSourceIsSanctuary: false,
    wisdomSaveRequested: false,
    attackOrSpellLost: false,
    successfulSavePassThrough: false,
    legalReplacementPassThrough: false,
    illegalReplacementRejected: false,
    areaEffectBypassedInterdiction: false,
    wardedHp: initialWardedHp,
    lastResult: "init",
    ...overrides,
  };
}

function projectInitialBattle(): SanctuarySelectedIdentityProjection {
  return projectBattleState({
    state: battleWithSanctuary(),
    wardedCombatantId: wardedId,
    lastResult: "init",
  });
}

function projectWardCreation(): SanctuarySelectedIdentityProjection {
  const state = castSanctuary(battleWithSanctuary(), wardedId);
  return projectBattleState({
    state,
    wardedCombatantId: wardedId,
    lastResult: "wardCreated",
  });
}

function projectDirectAttackLost(): SanctuarySelectedIdentityProjection {
  const warded = advanceToAttacker(
    castSanctuary(battleWithSanctuary(), wardedId),
  );
  const attack = attackAct(warded, wardedId);
  const targetFill = attackTargetFill(
    requireHole(attack.initialHoles, "targetChoice"),
    wardedId,
  );
  const needsSanctuary = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "Expected direct attack to request Sanctuary outcome.",
  );
  const sanctuaryHole = sanctuaryInterdictionHole(needsSanctuary);
  const lost = requireResolved(
    resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(sanctuaryHole, {
          saveSucceeded: false,
          outcome: { kind: "loseAttackOrSpell" },
        }),
      ],
    }),
  );

  return projectBattleState({
    state: lost.state,
    wardedCombatantId: wardedId,
    lastResult: "attackLost",
    overrides: { wisdomSaveRequested: true, attackOrSpellLost: true },
  });
}

function projectDirectSpellSuccessfulSave(): SanctuarySelectedIdentityProjection {
  const warded = castSanctuary(battleWithSanctuary(), wardedId);
  const act = actionSpellAct(warded, fireBoltUnitId);
  const targetFill = spellTargetFill(
    requireHole(act.initialHoles, "targetChoice"),
    fireBoltUnitId,
    casterId,
    wardedId,
  );
  const needsSanctuary = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [targetFill],
    }),
    "Expected direct spell to request Sanctuary outcome.",
  );
  const afterSave = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(sanctuaryInterdictionHole(needsSanctuary), {
          saveSucceeded: true,
        }),
      ],
    }),
    "Expected successful Sanctuary save to continue to the spell attack roll.",
  );
  requireHole(afterSave.holes, "attackRoll");

  return projectBattleState({
    state: afterSave.state,
    wardedCombatantId: wardedId,
    lastResult: "spellSaveSucceeded",
    overrides: {
      wisdomSaveRequested: true,
      successfulSavePassThrough: true,
    },
  });
}

function projectLegalReplacementTarget(): SanctuarySelectedIdentityProjection {
  const warded = advanceToAttacker(
    castSanctuary(battleWithSanctuary(), wardedId),
  );
  const attack = attackAct(warded, wardedId);
  const targetFill = attackTargetFill(
    requireHole(attack.initialHoles, "targetChoice"),
    wardedId,
  );
  const needsSanctuary = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "Expected original attack target to request Sanctuary outcome.",
  );
  const retargeted = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(sanctuaryInterdictionHole(needsSanctuary), {
          saveSucceeded: false,
          outcome: {
            kind: "newTarget",
            targetId: replacementId,
            spatialFacts: [attackTargetFact(replacementId)],
          },
        }),
      ],
    }),
    "Expected legal Sanctuary replacement target to continue to attack roll.",
  );
  requireHole(retargeted.holes, "attackRoll");

  return projectBattleState({
    state: retargeted.state,
    wardedCombatantId: wardedId,
    lastResult: "replacementAdmitted",
    overrides: {
      wisdomSaveRequested: true,
      legalReplacementPassThrough: true,
    },
  });
}

function projectIllegalReplacementTarget(): SanctuarySelectedIdentityProjection {
  const warded = advanceToAttacker(
    castSanctuary(battleWithSanctuary(), wardedId),
  );
  const attack = attackAct(warded, wardedId);
  const targetFill = attackTargetFill(
    requireHole(attack.initialHoles, "targetChoice"),
    wardedId,
  );
  const needsSanctuary = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "Expected original attack target to request Sanctuary outcome.",
  );
  const rejected = resolveBattleSubject({
    state: warded,
    subject: attack.subject,
    fills: [
      targetFill,
      sanctuaryOutcomeFill(sanctuaryInterdictionHole(needsSanctuary), {
        saveSucceeded: false,
        outcome: {
          kind: "newTarget",
          targetId: attackerId,
          spatialFacts: [attackTargetFact(attackerId)],
        },
      }),
    ],
  });
  if (rejected.tag !== "invalid") {
    throw new Error(
      `Expected illegal Sanctuary replacement target to be rejected, got ${rejected.tag}.`,
    );
  }

  return projectBattleState({
    state: warded,
    wardedCombatantId: wardedId,
    lastResult: "replacementRejected",
    overrides: {
      wisdomSaveRequested: true,
      illegalReplacementRejected: true,
    },
  });
}

function projectAreaEffectExclusion(): SanctuarySelectedIdentityProjection {
  const warded = advanceRoundToCaster(
    castSanctuary(battleWithSanctuary(), wardedId),
  );
  const act = actionSpellAct(warded, burningHandsUnitId);
  const needsDamage = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(
          requireHole(act.initialHoles, "savingThrowOutcome"),
          [{ targetId: wardedId, succeeded: false }],
        ),
      ],
    }),
    "Expected area-effect spell to continue to damage roll.",
  );
  requireHole(needsDamage.holes, "rolledDice");
  if (hasHole(needsDamage.holes, "sanctuaryInterdictionOutcome")) {
    throw new Error("Area-effect spell must not request Sanctuary outcome.");
  }

  return projectBattleState({
    state: needsDamage.state,
    wardedCombatantId: wardedId,
    lastResult: "areaEffectExcluded",
    overrides: { areaEffectBypassedInterdiction: true },
  });
}

function projectAttackRollEarlyEnd(): SanctuarySelectedIdentityProjection {
  const selfWarded = advanceToAttacker(
    castSanctuary(battleWithSanctuary(), attackerId),
  );
  const attack = attackAct(selfWarded, wardedId);
  const targetFill = attackTargetFill(
    requireHole(attack.initialHoles, "targetChoice"),
    wardedId,
  );
  const needsAttackRoll = requireNeedsHoles(
    resolveBattleSubject({
      state: selfWarded,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "Expected warded attacker to reach attack roll.",
  );
  const afterAttackRoll = progressedState(
    resolveBattleSubject({
      state: selfWarded,
      subject: attack.subject,
      fills: [
        targetFill,
        attackRollFill(requireHole(needsAttackRoll.holes, "attackRoll"), {
          total: 1,
          naturalD20: 1,
        }),
      ],
    }),
  );

  return projectBattleState({
    state: afterAttackRoll,
    wardedCombatantId: attackerId,
    lastResult: "attackRollEndedWard",
  });
}

function projectSpellCastEarlyEnd(): SanctuarySelectedIdentityProjection {
  const selfWarded = advanceRoundToCaster(
    castSanctuary(battleWithSanctuary(), casterId),
  );
  const act = actionSpellAct(selfWarded, longstriderUnitId);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: selfWarded,
      subject: act.subject,
      fills: [
        spellTargetFill(
          requireHole(act.initialHoles, "targetChoice"),
          longstriderUnitId,
          casterId,
          casterId,
        ),
      ],
    }),
  );

  return projectBattleState({
    state: resolved.state,
    wardedCombatantId: casterId,
    lastResult: "spellCastEndedWard",
  });
}

function projectDamageEarlyEnd(): SanctuarySelectedIdentityProjection {
  const damageSourceWarded = advanceToAttacker(
    castSanctuary(battleWithSanctuary(), attackerId),
  );
  const afterDamage = applyBattleHitPointDamage({
    state: damageSourceWarded,
    target: combatant(damageSourceWarded, wardedId),
    damageAmount: damageDealtByWardedCreature,
    deathFailuresAtZeroHp: 1,
    damageSourceId: attackerId,
  });

  return projectBattleState({
    state: afterDamage,
    wardedCombatantId: attackerId,
    lastResult: "damageEndedWard",
  });
}

function projectBattleState(input: {
  readonly state: BattleState;
  readonly wardedCombatantId: CombatantId;
  readonly lastResult: SanctuarySelectedIdentityLastResult;
  readonly overrides?: Partial<SanctuarySelectedIdentityProjection>;
}): SanctuarySelectedIdentityProjection {
  const ward = sanctuaryWard(input.state, input.wardedCombatantId);
  return expectedProjection({
    wardPresent: ward !== undefined,
    wardSourceIsSanctuary:
      ward?.sourceSpellId === sanctuaryUnitId &&
      ward.sourceCombatantId === casterId &&
      ward.save.ability === "wis",
    wardedHp: Number(combatant(input.state, wardedId).hp),
    lastResult: input.lastResult,
    ...input.overrides,
  });
}

function srdSpellRecord(
  unitId: SanctuarySelectedIdentitySpellUnitId,
): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function battleWithSanctuary(): BattleState {
  const result = startBattle({
    battleId: battleId("sanctuary-selected-identity"),
    combatants: [
      characterCreature(casterId, "Caster", 20, partySide, {
        sourceClassName: "cleric",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [srdSpellRecord(fireBoltUnitId)],
        preparedSpells: [
          srdSpellRecord(sanctuaryUnitId),
          srdSpellRecord(burningHandsUnitId),
          srdSpellRecord(longstriderUnitId),
        ],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 2 }],
      }),
      characterCreature(wardedId, "Warded", 15, partySide),
      characterCreature(attackerId, "Attacker", 10, enemySide),
      characterCreature(replacementId, "Replacement", 9, partySide),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function characterCreature(
  combatantIdValue: CombatantId,
  displayName: string,
  initiative: number,
  side: ReturnType<typeof battleCombatantSide>,
  spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"],
): BattleCreatureInit {
  return {
    combatantId: combatantIdValue,
    displayName,
    initiative: initiativeScore(initiative),
    side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${combatantIdValue}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: "cleric", level: 1 }],
      d20Statistics: testCharacterD20Statistics(),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(initialWardedHp),
      maxHp: Hp(initialWardedHp),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(spellcasting === undefined ? {} : { spellcasting }),
    },
  };
}

function castSanctuary(state: BattleState, targetId: CombatantId): BattleState {
  const act = bonusActionSanctuaryAct(state);
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        sanctuaryTargetListFill(
          requireHole(act.initialHoles, "spellTargetList"),
          targetId,
        ),
      ],
    }),
  );
  return resolved.state;
}

function bonusActionSanctuaryAct(state: BattleState): BonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.procedure ===
        "sanctuaryTargetingInterdiction",
  );
  if (act === undefined) {
    throw new Error("Expected Sanctuary Bonus Action spell act.");
  }
  return act;
}

function actionSpellAct(
  state: BattleState,
  spellId: SanctuarySelectedIdentityActionSpellUnitId,
): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === spellId,
  );
  if (act === undefined) {
    throw new Error(`Expected action spell act for ${spellId}.`);
  }
  return act;
}

function attackAct(state: BattleState, targetId: CombatantId): AttackAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is AttackAct =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      requireHole(candidate.initialHoles, "targetChoice").choices.includes(
        targetId,
      ),
  );
  if (act === undefined) {
    throw new Error("Expected Attack act.");
  }
  return act;
}

function advanceToAttacker(state: BattleState): BattleState {
  return endTurnFor(endTurnFor(state, casterId), wardedId);
}

function advanceRoundToCaster(state: BattleState): BattleState {
  return endTurnFor(
    endTurnFor(endTurnFor(endTurnFor(state, casterId), wardedId), attackerId),
    replacementId,
  );
}

function endTurnFor(state: BattleState, actorId: CombatantId): BattleState {
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
      fills: [],
    }),
  );
  return resolved.state;
}

function sanctuaryTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds: [targetId] },
    spatialFacts: [
      { kind: "spellTarget", casterId, targetId, spellId: sanctuaryUnitId },
    ],
  };
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [attackTargetFact(targetId)],
  };
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: SanctuarySelectedIdentitySpellUnitId,
  casterIdValue: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      { kind: "spellTarget", casterId: casterIdValue, targetId, spellId },
    ],
  };
}

function attackTargetFact(targetId: CombatantId) {
  return {
    kind: "attackTargetInMeleeReach" as const,
    actorId: attackerId,
    targetId,
    attackName: unarmedStrikeAttackName,
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: { readonly total: number; readonly naturalD20: number },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: { total: value.total, naturalD20: DieRollResult(value.naturalD20) },
  };
}

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId: casterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
      },
      outcomes,
    },
  };
}

function sanctuaryOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "sanctuaryInterdictionOutcome" }>,
  value: Extract<
    BattleFill,
    { readonly kind: "sanctuaryInterdictionOutcome" }
  >["value"],
): Extract<BattleFill, { readonly kind: "sanctuaryInterdictionOutcome" }> {
  return { kind: "sanctuaryInterdictionOutcome", holeId: hole.holeId, value };
}

function sanctuaryInterdictionHole(
  result: NeedsHolesBattleResult,
): Extract<BattleHole, { readonly kind: "sanctuaryInterdictionOutcome" }> {
  const hole = requireHole(result.holes, "sanctuaryInterdictionOutcome");
  if (hole.ability !== "wis") {
    throw new Error(`Expected Sanctuary Wisdom save, got ${hole.ability}.`);
  }
  return hole;
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function hasHole(holes: readonly BattleHole[], kind: BattleHole["kind"]) {
  return holes.some((hole) => hole.kind === kind);
}

function requireNeedsHoles(
  result: BattleResolutionResult,
  message: string,
): NeedsHolesBattleResult {
  if (result.tag !== "needsHoles") {
    throw new Error(`${message} Got ${result.tag}.`);
  }
  return result;
}

function requireResolved(result: BattleResolutionResult): ResolvedBattleResult {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved result, got ${result.tag}.`);
  }
  return result;
}

function progressedState(result: BattleResolutionResult): BattleState {
  if (result.tag === "needsHoles" || result.tag === "resolved") {
    return result.state;
  }
  throw new Error(`Expected resolution to progress, got ${result.tag}.`);
}

function combatant(
  state: BattleState,
  combatantIdValue: CombatantId,
): BattleCreatureState {
  const found = state.combatants.get(combatantIdValue);
  if (found === undefined) {
    throw new Error(`Expected combatant ${combatantIdValue}.`);
  }
  return found;
}

function sanctuaryWard(
  state: BattleState,
  combatantIdValue: CombatantId,
): SanctuaryWardEffect | undefined {
  return combatant(state, combatantIdValue).activeEffects.find(
    (effect): effect is SanctuaryWardEffect => effect.kind === "sanctuaryWard",
  );
}
