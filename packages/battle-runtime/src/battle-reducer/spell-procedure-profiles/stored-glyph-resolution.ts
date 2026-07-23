import type { BattleResolutionResult } from "../../battle-state-execution.ts";
import type { BattleSpellProcedureExecution } from "../../character-execution.ts";
import {
  GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_PROCEDURES,
  type GlyphStoredConcentrationSingleCreatureActiveEffectInvocation,
} from "../../glyph-stored-spell-invocation.ts";
import { Match } from "effect";
import { invalidResult } from "../result-helpers.ts";
import {
  isGlyphStoredAreaOngoingSpellInvocation,
  resolveStoredGlyphAreaOngoingSpellRelease,
} from "../spells-resolve-area-effects.ts";
import {
  resolveGreaseGroundHazardSpellAct,
  resolveSaveGateConditionSpellAct,
  resolveSaveGateDamageSpellRelease,
} from "../spells-resolve-save-gates.ts";
import { resolveSpellRelease } from "../spells-resolve.ts";
import {
  isGlyphStoredAreaControlSpellInvocation,
  resolveStoredGlyphAreaControlSpellRelease,
} from "./hypnotic-pattern.ts";
import { resolveStoredGlyphSelfTransformationModeSpellRelease } from "./self-transformation-mode.ts";
import type { StoredGlyphSpellProcedureResolution } from "./resolution-contract.ts";
import {
  spellProcedureExecutionFor,
  type SpellProcedureExecutionRegistry,
} from "./execution-registry.ts";

const byProcedure = Match.discriminator("procedure");
type StoredGlyphSingleCreatureActiveEffectExecution =
  BattleSpellProcedureExecution<GlyphStoredConcentrationSingleCreatureActiveEffectInvocation>;

function isStoredGlyphSingleCreatureActiveEffectExecution(
  invocation: StoredGlyphSpellProcedureResolution["invocation"],
): invocation is StoredGlyphSingleCreatureActiveEffectExecution {
  return GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_PROCEDURES.some(
    (procedure) => procedure === invocation.procedure,
  );
}

function storedGlyphReleaseTargetMismatch(
  resolution: StoredGlyphSpellProcedureResolution,
  expectedTarget: "areaCenteredOnTriggeringCreature" | "triggeringCreature",
): BattleResolutionResult {
  return invalidResult(
    resolution.input.state,
    "invalidFill",
    expectedTarget === "areaCenteredOnTriggeringCreature"
      ? "Stored glyph area release must be centered on the triggering creature."
      : "Stored glyph single-creature release must target the triggering creature.",
  );
}

export function executeStoredGlyphSpellProcedure(
  resolution: StoredGlyphSpellProcedureResolution,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  const { input, actorId, invocation, fillSet, storedGlyphRelease } =
    resolution;
  const target = storedGlyphRelease.target;

  if (isGlyphStoredAreaOngoingSpellInvocation(invocation)) {
    if (target.kind !== "areaCenteredOnTriggeringCreature") {
      return storedGlyphReleaseTargetMismatch(
        resolution,
        "areaCenteredOnTriggeringCreature",
      );
    }
    return resolveStoredGlyphAreaOngoingSpellRelease({
      input,
      actorId,
      invocation,
      fillSet,
      selfOriginAreaAnchorId: target.anchorId,
    });
  }

  if (isGlyphStoredAreaControlSpellInvocation(invocation)) {
    if (target.kind !== "areaCenteredOnTriggeringCreature") {
      return storedGlyphReleaseTargetMismatch(
        resolution,
        "areaCenteredOnTriggeringCreature",
      );
    }
    return resolveStoredGlyphAreaControlSpellRelease({
      input: {
        ...input,
        glyphStoredSpellReleaseReplay: target.replayContext,
      },
      actorId,
      invocation,
      fillSet,
      selfOriginAreaAnchorId: target.anchorId,
    });
  }

  if (invocation.procedure === "greaseGroundHazard") {
    return resolveGreaseGroundHazardSpellAct({
      input,
      actorId,
      invocation,
      fillSet,
      spendsCastResources: false,
    });
  }

  if (invocation.procedure === "saveGatedCondition") {
    return resolveSaveGateConditionSpellAct({
      input,
      actorId,
      invocation,
      fillSet,
      spendsCastResources: false,
    });
  }

  if (
    invocation.procedure === "saveGatedDamage" &&
    invocation.spellRuleFacts.duration.kind === "concentration"
  ) {
    return resolveSaveGateDamageSpellRelease({
      input,
      actorId,
      invocation,
      fillSet,
      opensSpellCastReactionWindow: false,
      startsOrdinaryConcentration: false,
    });
  }

  if (isStoredGlyphSingleCreatureActiveEffectExecution(invocation)) {
    if (target.kind !== "triggeringCreature") {
      return storedGlyphReleaseTargetMismatch(resolution, "triggeringCreature");
    }
    const releaseInput = {
      input,
      actorId,
      fillSet,
      storedGlyphRelease: { kind: "storedGlyphSpellRelease" },
    } as const;
    return Match.value(invocation).pipe(
      byProcedure("scalarBuff", (invocation) =>
        spellProcedureExecutionFor(
          executionRegistry,
          invocation.procedure,
        ).resolve({ ...releaseInput, invocation }),
      ),
      byProcedure("rollModifier", (invocation) =>
        spellProcedureExecutionFor(
          executionRegistry,
          invocation.procedure,
        ).resolve({ ...releaseInput, invocation }),
      ),
      byProcedure("creatureSizeIncrease", (invocation) =>
        spellProcedureExecutionFor(
          executionRegistry,
          invocation.procedure,
        ).resolve({ ...releaseInput, invocation }),
      ),
      byProcedure("creatureSizeDecrease", (invocation) =>
        spellProcedureExecutionFor(
          executionRegistry,
          invocation.procedure,
        ).resolve({ ...releaseInput, invocation }),
      ),
      byProcedure("levitatedCreature", (invocation) =>
        spellProcedureExecutionFor(
          executionRegistry,
          invocation.procedure,
        ).resolve({ ...releaseInput, invocation }),
      ),
      byProcedure("directCondition", (invocation) =>
        spellProcedureExecutionFor(
          executionRegistry,
          invocation.procedure,
        ).resolve({ ...releaseInput, invocation }),
      ),
      byProcedure("hastePositive", (invocation) =>
        spellProcedureExecutionFor(
          executionRegistry,
          invocation.procedure,
        ).resolve({ ...releaseInput, invocation }),
      ),
      byProcedure("creatureTypeProtection", (invocation) =>
        spellProcedureExecutionFor(
          executionRegistry,
          invocation.procedure,
        ).resolve({ ...releaseInput, invocation }),
      ),
      byProcedure(
        "conditionImmunityAndTurnStartTemporaryHitPoints",
        (invocation) =>
          spellProcedureExecutionFor(
            executionRegistry,
            invocation.procedure,
          ).resolve({ ...releaseInput, invocation }),
      ),
      Match.exhaustive,
    );
  }

  if (invocation.procedure === "selfTransformationMode") {
    if (target.kind !== "triggeringCreature") {
      return storedGlyphReleaseTargetMismatch(resolution, "triggeringCreature");
    }
    return resolveStoredGlyphSelfTransformationModeSpellRelease({
      state: input.state,
      subject: input.subject,
      targetId: target.targetId,
      sourceCombatantId: actorId,
      invocation,
      fillSet,
    });
  }

  return resolveSpellRelease(
    input,
    invocation,
    target.kind === "areaCenteredOnTriggeringCreature"
      ? {
          selfOriginAreaAnchorId: target.anchorId,
          opensSpellCastReactionWindow: false,
        }
      : {
          storedGlyphTriggeringCreatureTargetId: target.targetId,
          opensSpellCastReactionWindow: false,
        },
  );
}
