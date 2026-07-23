import type { BattleResolutionResult } from "../../battle-state-execution.ts";
import { Match } from "effect";
import { resolveStoredGlyphAreaOngoingSpellRelease } from "../spells-resolve-area-effects.ts";
import {
  resolveGreaseGroundHazardSpellAct,
  resolveSaveGateConditionSpellAct,
  resolveSaveGateDamageSpellRelease,
} from "../spells-resolve-save-gates.ts";
import { resolveSpellRelease } from "../spells-resolve.ts";
import {
  spellProcedureExecutionFor,
  type SpellProcedureExecutionRegistry,
} from "./execution-registry.ts";
import { resolveStoredGlyphAreaControlSpellRelease } from "./hypnotic-pattern.ts";
import type { StoredGlyphSpellProcedureResolution } from "./resolution-contract.ts";
import { resolveStoredGlyphSelfTransformationModeSpellRelease } from "./self-transformation-mode.ts";

const byReleaseKind = Match.discriminator("kind");
const byProcedure = Match.discriminator("procedure");

export function executeStoredGlyphSpellProcedure(
  resolution: StoredGlyphSpellProcedureResolution,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  const { input, actorId, fillSet } = resolution;
  return Match.value(resolution.release).pipe(
    byReleaseKind("areaOngoing", (release) =>
      resolveStoredGlyphAreaOngoingSpellRelease({
        input,
        actorId,
        invocation: release.invocation,
        fillSet,
        selfOriginAreaAnchorId: release.anchorId,
      }),
    ),
    byReleaseKind("areaControl", (release) =>
      resolveStoredGlyphAreaControlSpellRelease({
        input: {
          ...input,
          glyphStoredSpellReleaseReplay: release.replayContext,
        },
        actorId,
        invocation: release.invocation,
        fillSet,
        selfOriginAreaAnchorId: release.anchorId,
      }),
    ),
    byReleaseKind("greaseGroundHazard", (release) =>
      resolveGreaseGroundHazardSpellAct({
        input,
        actorId,
        invocation: release.invocation,
        fillSet,
        spendsCastResources: false,
      }),
    ),
    byReleaseKind("saveGatedCondition", (release) =>
      resolveSaveGateConditionSpellAct({
        input,
        actorId,
        invocation: release.invocation,
        fillSet,
        spendsCastResources: false,
      }),
    ),
    byReleaseKind("fullDurationSaveGatedDamage", (release) =>
      resolveSaveGateDamageSpellRelease({
        input,
        actorId,
        invocation: release.invocation,
        fillSet,
        opensSpellCastReactionWindow: false,
        startsOrdinaryConcentration: false,
      }),
    ),
    byReleaseKind("singleCreatureActiveEffect", (release) => {
      const releaseInput = {
        input,
        actorId,
        fillSet,
        storedGlyphRelease: { kind: "storedGlyphSpellRelease" },
      } as const;
      return Match.value(release.invocation).pipe(
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
    }),
    byReleaseKind("selfTransformation", (release) =>
      resolveStoredGlyphSelfTransformationModeSpellRelease({
        state: input.state,
        subject: input.subject,
        targetId: release.targetId,
        sourceCombatantId: actorId,
        invocation: release.invocation,
        fillSet,
      }),
    ),
    byReleaseKind("ordinaryArea", (release) =>
      resolveSpellRelease(input, release.invocation, {
        selfOriginAreaAnchorId: release.anchorId,
        opensSpellCastReactionWindow: false,
      }),
    ),
    byReleaseKind("ordinaryTriggeringCreature", (release) =>
      resolveSpellRelease(input, release.invocation, {
        storedGlyphTriggeringCreatureTargetId: release.targetId,
        opensSpellCastReactionWindow: false,
      }),
    ),
    Match.exhaustive,
  );
}
