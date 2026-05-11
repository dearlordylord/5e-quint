import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  attackRollIsCriticalHit,
  maybeOpenReactionWindow,
  openAfterDamageSequenceReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleAfterDamageEvent,
  type BattleConcentrationSavingThrowHole,
  type BattleObjectDamageOutcome,
  type BattleResolutionResult,
  type BattleSpellDamageReductionRollHole,
  type SpellDamageReductionRoll,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import type { CombatantId } from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import {
  attackRollModeMatches,
  consumeHelpAttackForAttackRoll,
  consumeSelfAttackRollEffects,
  recordAttackRollOngoingFeatures,
  requiredAttackRollMode,
  requiredObjectTargetAttackRollMode,
} from "./attack-roll.ts";
import { activeEffectArmorClass } from "./creature-state.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  activeMarkedDamageRiders,
  applyAvailableSpellDamageReduction,
  damageAmountByTypeAfterTargetAdjustments,
  spellDamageReductionRollHole,
} from "./damage-helpers.ts";
import { concentrationSavingThrowHole } from "./damage-apply.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import {
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackRollMissToHitReplacement,
} from "./statblock-attacks.ts";
import { spellAttackKindForRedirect } from "./spells-profiles.ts";
import {
  applySpellDamage,
  spellBeamAttackRollHole,
  spellBeamDamageHole,
  spellDamageByTypeForTarget,
  spellDamageTypes,
  spellBeamTargetHole,
  spellBeamObjectTargetHole,
  spellObjectDamageOutcome,
  spellObjectTargetFact,
  spellTargetIsLegal,
  validateSpellBeamDamageFill,
} from "./spells-holes-fills.ts";
import type {
  SpellFillSet,
  SpellBeamFillSet,
} from "./spells-resolve-fill-set.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";

export function resolveSpellAttackBeamSequenceAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackBeamSequence" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Eldritch Blast beams must use beam-indexed target, attack-roll, and damage fills.",
    );
  }

  const missingTargetIndex = input.fillSet.beamFills.findIndex(
    (beam) => beam.target === undefined,
  );
  if (missingTargetIndex >= 0) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellBeamTargetHole(
        input.input.state,
        input.actorId,
        input.invocation,
        missingTargetIndex,
      ),
      spellBeamObjectTargetHole(input.invocation, missingTargetIndex),
    ]);
  }

  const targetIds = input.fillSet.beamFills.flatMap((beam) =>
    beam.target?.kind === "combatant" ? [beam.target.targetId] : [],
  );
  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: [...new Set(targetIds)],
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  let state = input.input.state;
  const objectDamages: BattleObjectDamageOutcome[] = [];
  const afterDamageEvents: BattleAfterDamageEvent[] = [];
  const usedExtraFillHoleIds = new Set<string>();
  for (const [beamIndex, beam] of input.fillSet.beamFills.entries()) {
    const resolved = resolveEldritchBlastBeam({
      state,
      input: input.input,
      actorId: input.actorId,
      invocation: input.invocation,
      fillSet: input.fillSet,
      beam,
      beamIndex,
    });
    if (resolved.tag !== "resolved") {
      return resolved;
    }
    state = resolved.state;
    objectDamages.push(...resolved.objectDamages);
    afterDamageEvents.push(...resolved.afterDamageEvents);
    for (const holeId of resolved.usedExtraFillHoleIds) {
      usedExtraFillHoleIds.add(holeId);
    }
  }
  const unusedExtraFill = [
    ...input.fillSet.spellDamageReductionRolls,
    ...input.fillSet.concentrationSavingThrows,
    ...input.fillSet.damageDispositions,
  ].find((fill) => !usedExtraFillHoleIds.has(fill.holeId));
  if (unusedExtraFill !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell beam damage lifecycle fill does not match a beam that currently needs it.",
    );
  }

  const spent = spendSpellCastResources({
    state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (spent.tag !== "resolved") {
    return spent;
  }
  const afterDamageReactionWindow = openAfterDamageSequenceReactionWindow({
    state: spent.state,
    subject: input.input.subject,
    events: afterDamageEvents,
    suppressedReactionTrigger: input.input.suppressedReactionTrigger,
  });
  if (afterDamageReactionWindow.tag !== "resolved") {
    return afterDamageReactionWindow;
  }
  return {
    tag: "resolved",
    state: afterDamageReactionWindow.state,
    snapshot: snapshotBattle(afterDamageReactionWindow.state),
    ...(objectDamages.length === 0
      ? {}
      : { objectDamages }),
  };
}

function resolveEldritchBlastBeam(input: {
  readonly state: ActionSpellBattleResolutionInput["state"];
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackBeamSequence" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly beam: SpellBeamFillSet;
  readonly beamIndex: number;
}):
  | {
      readonly tag: "resolved";
      readonly state: ActionSpellBattleResolutionInput["state"];
      readonly objectDamages: readonly BattleObjectDamageOutcome[];
      readonly afterDamageEvents: readonly BattleAfterDamageEvent[];
      readonly usedExtraFillHoleIds: readonly string[];
    }
  | Exclude<BattleResolutionResult, { readonly tag: "resolved" }> {
  const target = input.beam.target;
  if (target === undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Eldritch Blast beam target was not filled.",
    );
  }
  return target.kind === "combatant"
    ? resolveEldritchBlastCreatureBeam({ ...input, target })
    : resolveEldritchBlastObjectBeam({ ...input, target });
}

function resolveEldritchBlastCreatureBeam(input: {
  readonly state: ActionSpellBattleResolutionInput["state"];
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackBeamSequence" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly beam: SpellBeamFillSet;
  readonly beamIndex: number;
  readonly target: Extract<
    NonNullable<SpellBeamFillSet["target"]>,
    { readonly kind: "combatant" }
  >;
}):
  | {
      readonly tag: "resolved";
      readonly state: ActionSpellBattleResolutionInput["state"];
      readonly objectDamages: readonly BattleObjectDamageOutcome[];
      readonly afterDamageEvents: readonly BattleAfterDamageEvent[];
      readonly usedExtraFillHoleIds: readonly string[];
    }
  | Exclude<BattleResolutionResult, { readonly tag: "resolved" }> {
  const target = input.state.combatants.get(input.target.targetId);
  if (
    target === undefined ||
    !spellTargetIsLegal(
      input.state,
      input.actorId,
      input.target.targetId,
      input.invocation,
      input.target.spatialFacts,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Eldritch Blast beam target must be a combatant within the selected spell's supported range.",
    );
  }
  const requiredRollMode = requiredAttackRollMode(
    input.state,
    input.actorId,
    target.combatantId,
  );
  if (input.beam.attackRoll === undefined) {
    return needsHolesResult(input.state, input.input.subject, [
      spellBeamAttackRollHole(
        input.invocation,
        input.beamIndex,
        requiredRollMode,
      ),
    ]);
  }
  const attackRollError = validateBeamAttackRoll(
    input.beam.attackRoll,
    requiredRollMode,
  );
  if (attackRollError !== null) {
    return invalidResult(input.input.state, "invalidFill", attackRollError);
  }
  const ordinaryHit = attackRollHits(
    input.beam.attackRoll,
    currentArmorClass(activeEffectArmorClass(target)),
  );
  const missToHitReplacement = selectedAttackRollMissToHitReplacement({
    state: input.state,
    subject: input.input.subject,
    attackerId: input.actorId,
    targetId: target.combatantId,
    attackRoll: input.beam.attackRoll,
    ordinaryHit,
  });
  if (
    input.beam.attackRoll.missToHitReplacementUnitId !== undefined &&
    missToHitReplacement === null
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      ordinaryHit
        ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
        : "Attack-roll miss-to-hit replacement is not available for this spell attack roll.",
    );
  }
  const hit = ordinaryHit || missToHitReplacement !== null;
  const critical = attackRollIsCriticalHit(input.beam.attackRoll);
  const attackRolledState = recordAttackRollMissToHitReplacementUsed(
    consumeHelpAttackForAttackRoll(
      recordAttackRollOngoingFeatures(
        input.state,
        input.actorId,
        target.combatantId,
        null,
      ),
      input.actorId,
      target.combatantId,
    ),
    input.actorId,
    missToHitReplacement,
    {
      subject: input.input.subject,
      targetId: target.combatantId,
      attackRoll: input.beam.attackRoll,
    },
  );
  const spellMarkedDamageRiders = hit
    ? activeMarkedDamageRiders(
        attackRolledState.combatants.get(input.actorId),
        target.combatantId,
      )
    : [];
  if (hit && input.input.suppressedReactionTrigger !== "attackHit") {
    const reactionWindow = maybeOpenReactionWindow(
      attackRolledState,
      {
        trigger: "attackHit",
        attackerId: input.actorId,
        targetId: target.combatantId,
        attackRoll: input.beam.attackRoll,
        attackKind: spellAttackKindForRedirect(input.invocation.attackKind),
        attackHitTriggerKind: "otherAttack",
        damageTypes: [
          ...new Set([
            ...spellDamageTypes(input.invocation),
            ...spellMarkedDamageRiders.map(
              (rider) => rider.damage.damageType,
            ),
          ]),
        ],
        continuation: {
          kind: "replay",
          subject: input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }
  if (!hit && input.beam.damageRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Eldritch Blast beam damage can only be filled after a hit.",
    );
  }
  if (!hit) {
    return {
      tag: "resolved",
      state: attackRolledState,
      objectDamages: [],
      afterDamageEvents: [],
      usedExtraFillHoleIds: [],
    };
  }
  if (input.beam.damageRoll === undefined) {
    return needsHolesResult(attackRolledState, input.input.subject, [
      spellBeamDamageHole(
        input.invocation,
        input.beamIndex,
        critical,
        spellMarkedDamageRiders,
      ),
    ]);
  }
  const damageValidation = validateSpellBeamDamageFill(
    input.beam.damageRoll,
    input.invocation,
    input.beamIndex,
    critical,
    spellMarkedDamageRiders,
  );
  if (damageValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }
  const spellDamageByType = spellDamageByTypeForTarget(
    target,
    input.invocation,
    input.beam.damageRoll,
    "full",
    spellMarkedDamageRiders,
    critical,
  );
  const spellReductionRollHoleForBeam = (
    reduction: SpellDamageReductionRoll,
  ) =>
    spellBeamDamageReductionRollHole(
      input.invocation,
      input.beamIndex,
      reduction,
    );
  const spellReductionCandidate = applyAvailableSpellDamageReduction(
    target,
    spellDamageByType,
    undefined,
    spellReductionRollHoleForBeam,
  );
  const spellReductionRoll =
    spellReductionCandidate.tag === "needsHoles"
      ? input.fillSet.spellDamageReductionRolls.find(
          (roll) => roll.holeId === spellReductionCandidate.holes[0]?.holeId,
        )
      : undefined;
  const spellReduction = applyAvailableSpellDamageReduction(
    target,
    spellDamageByType,
    spellReductionRoll,
    spellReductionRollHoleForBeam,
  );
  if (spellReduction.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
    );
  }
  if (spellReduction.tag === "needsHoles") {
    return needsHolesResult(attackRolledState, input.input.subject, [
      ...spellReduction.holes,
    ]);
  }
  const spellDamageAmount = damageAmountByTypeAfterTargetAdjustments(
    spellReduction.target,
    spellReduction.damageByType,
  );
  const concentrationSaveBase = concentrationSavingThrowHole(
    spellReduction.target,
    spellDamageAmount,
  );
  const concentrationSave =
    concentrationSaveBase === null
      ? null
      : spellBeamConcentrationSavingThrowHole(
          input.invocation,
          input.beamIndex,
          concentrationSaveBase,
        );
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : concentrationSavingThrowFillFor(
          input.fillSet.concentrationSavingThrows,
          concentrationSave,
        );
  if (concentrationSave !== null && concentrationFill === undefined) {
    return needsHolesResult(attackRolledState, input.input.subject, [
      concentrationSave,
    ]);
  }
  const damageDispositionHole = zeroHitPointReplacementDispositionHole({
    damageSourceId: input.actorId,
    target: spellReduction.target,
    damageAmount: spellDamageAmount,
    holeKey: spellBeamDamageDispositionHoleKey(
      input.invocation,
      input.beamIndex,
      spellReduction.target.combatantId,
    ),
  });
  const damageDispositionFills = input.fillSet.damageDispositions;
  const relevantDamageDispositionFills =
    damageDispositionHole === null
      ? []
      : damageDispositionFills.filter(
          (fill) => fill.holeId === damageDispositionHole.holeId,
        );
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHole === null ? [] : [damageDispositionHole],
    fills: relevantDamageDispositionFills,
  });
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  if (
    damageDispositionHole !== null &&
    damageDispositionFillFor(
      relevantDamageDispositionFills,
      damageDispositionHole,
    ) === undefined
  ) {
    return needsHolesResult(attackRolledState, input.input.subject, [
      damageDispositionHole,
    ]);
  }
  const damaged = applySpellDamage(
    attackRolledState,
    target.combatantId,
    input.invocation,
    input.beam.damageRoll,
    critical,
    {
      concentrationSavingThrow: concentrationFill,
      damageDisposition: damageDispositionForTarget(
        damageDispositionHole === null ? [] : [damageDispositionHole],
        relevantDamageDispositionFills,
        target.combatantId,
      ),
      spellMarkedDamageRiders,
      spellDamageReductionRoll: spellReductionRoll,
      spellDamageReductionRollHoleForReduction: spellReductionRollHoleForBeam,
      damageSourceId: input.actorId,
    },
  );
  const usedExtraFillHoleIds = [
    ...(spellReductionRoll === undefined ? [] : [spellReductionRoll.holeId]),
    ...(concentrationFill === undefined ? [] : [concentrationFill.holeId]),
    ...relevantDamageDispositionFills.map((fill) => fill.holeId),
  ];
  return {
    tag: "resolved",
    state: damaged,
    objectDamages: [],
    afterDamageEvents:
      spellDamageAmount <= 0
        ? []
        : [
            {
              damageSourceId: input.actorId,
              damagedId: target.combatantId,
              damageAmount: toDamageAmount(spellDamageAmount),
              reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage(
                {
                  facts: input.target.spatialFacts,
                  damagedId: target.combatantId,
                  damageSourceId: input.actorId,
                },
              ),
            },
          ],
    usedExtraFillHoleIds,
  };
}

function resolveEldritchBlastObjectBeam(input: {
  readonly state: ActionSpellBattleResolutionInput["state"];
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackBeamSequence" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly beam: SpellBeamFillSet;
  readonly beamIndex: number;
  readonly target: Extract<
    NonNullable<SpellBeamFillSet["target"]>,
    { readonly kind: "object" }
  >;
}):
  | {
      readonly tag: "resolved";
      readonly state: ActionSpellBattleResolutionInput["state"];
      readonly objectDamages: readonly BattleObjectDamageOutcome[];
      readonly afterDamageEvents: readonly BattleAfterDamageEvent[];
      readonly usedExtraFillHoleIds: readonly string[];
    }
  | Exclude<BattleResolutionResult, { readonly tag: "resolved" }> {
  const objectFact = spellObjectTargetFact(
    input.target.spatialFacts,
    input.actorId,
    input.target.objectId,
    input.invocation,
  );
  if (objectFact === null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Eldritch Blast object beam must include a matching table-supplied range and object Armor Class fact.",
    );
  }
  const requiredRollMode = requiredObjectTargetAttackRollMode(
    input.state,
    input.actorId,
  );
  if (input.beam.attackRoll === undefined) {
    return needsHolesResult(input.state, input.input.subject, [
      spellBeamAttackRollHole(
        input.invocation,
        input.beamIndex,
        requiredRollMode,
      ),
    ]);
  }
  const attackRollError = validateBeamAttackRoll(
    input.beam.attackRoll,
    requiredRollMode,
  );
  if (attackRollError !== null) {
    return invalidResult(input.input.state, "invalidFill", attackRollError);
  }
  if (
    input.beam.attackRoll.activatedOngoingFeatureUnitId !== undefined ||
    input.beam.attackRoll.missToHitReplacementUnitId !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Object-target spell attacks do not use combatant attack-roll feature selections.",
    );
  }
  const hit = attackRollHits(input.beam.attackRoll, objectFact.armorClass);
  const critical = attackRollIsCriticalHit(input.beam.attackRoll);
  const attackRolledState = consumeSelfAttackRollEffects(
    {
      ...input.state,
      currentTurnResources: {
        ...input.state.currentTurnResources,
        attackRollMadeThisTurn: true,
      },
    },
    input.actorId,
  );
  if (!hit && input.beam.damageRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Eldritch Blast beam damage can only be filled after a hit.",
    );
  }
  if (!hit) {
    return {
      tag: "resolved",
      state: attackRolledState,
      objectDamages: [],
      afterDamageEvents: [],
      usedExtraFillHoleIds: [],
    };
  }
  if (input.beam.damageRoll === undefined) {
    return needsHolesResult(attackRolledState, input.input.subject, [
      spellBeamDamageHole(input.invocation, input.beamIndex, critical),
    ]);
  }
  const damageValidation = validateSpellBeamDamageFill(
    input.beam.damageRoll,
    input.invocation,
    input.beamIndex,
    critical,
  );
  if (damageValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }
  return {
    tag: "resolved",
    state: attackRolledState,
    objectDamages: [
      spellObjectDamageOutcome({
        objectId: input.target.objectId,
        invocation: input.invocation,
        damageRoll: input.beam.damageRoll,
        critical,
        disposition: objectFact.damageDisposition,
      }),
    ],
    afterDamageEvents: [],
    usedExtraFillHoleIds: [],
  };
}

function validateBeamAttackRoll(
  attackRoll: NonNullable<SpellBeamFillSet["attackRoll"]>,
  requiredRollMode: Parameters<typeof attackRollModeMatches>[1],
): string | null {
  if (!attackRollResultIsValid(attackRoll)) {
    return "Spell attack roll result is outside the d20 attack-roll protocol.";
  }
  if (!attackRollModeMatches(attackRoll, requiredRollMode)) {
    return "Spell attack roll mode does not match the current attack-roll rule.";
  }
  return null;
}

function spellBeamDamageReductionRollHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackBeamSequence" }
  >,
  beamIndex: number,
  reduction: SpellDamageReductionRoll,
): BattleSpellDamageReductionRollHole {
  const base = spellDamageReductionRollHole(reduction);
  const protocolId = [
    "battle:spell:beam-damage-reduction-roll",
    invocation.spell.id,
    beamIndex,
    reduction.sourceSpellId,
    reduction.sourceCombatantId,
    reduction.targetId,
    reduction.damageType,
  ].join(":");
  return {
    ...base,
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${invocation.spell.name} beam ${beamIndex + 1} damage reduction`,
  };
}

function spellBeamConcentrationSavingThrowHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackBeamSequence" }
  >,
  beamIndex: number,
  base: BattleConcentrationSavingThrowHole,
): BattleConcentrationSavingThrowHole {
  const protocolId = [
    "battle:spell:beam-concentration-save",
    invocation.spell.id,
    beamIndex,
    base.combatantId,
  ].join(":");
  return {
    ...base,
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${invocation.spell.name} beam ${beamIndex + 1} Concentration Constitution Saving Throw`,
  };
}

function spellBeamDamageDispositionHoleKey(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackBeamSequence" }
  >,
  beamIndex: number,
  targetId: CombatantId,
) {
  const protocolId = [
    "battle:spell:beam-damage-disposition",
    invocation.spell.id,
    beamIndex,
    targetId,
  ].join(":");
  return {
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${invocation.spell.name} beam ${beamIndex + 1} damage disposition`,
  };
}
