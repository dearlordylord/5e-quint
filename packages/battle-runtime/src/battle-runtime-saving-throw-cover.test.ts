// KERNEL-COVERAGE: parity-witness BATTLE.SAVE.DEXTERITY_COVER
// SRD 5.2.1 "Cover": Half Cover gives +2 and Three-Quarters Cover +5 to a
// target's Dexterity saving throws. The table rules each target's degree for
// the effect, either on its spellTarget fact or on its save outcome, and the
// runtime derives the bonus. Sacred Flame: "The target gains no benefit from
// Half Cover or Three-Quarters Cover for this save."
import type { BonusCoverType, RuledCoverType } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import {
  savingThrowCoverRuling,
  savingThrowFillsCoverIssue,
  spellTargetCoverFlatBonuses,
} from "./battle-reducer/saving-throw-cover.ts";
import { admitRegisteredSpellProcedureMechanics } from "./battle-reducer/spell-procedure-profiles/admission-registry.ts";
import type { BattleHole, BattleSubject } from "./index.ts";
import {
  battleId,
  cantripSpellInvocationRef,
  characterSeed,
  requireCharacterSpellProcedureRefForTest,
  requireHole,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  secondSkeletonId,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  spellSlotInvocationRef,
  startBattleSessionRight,
  statBlockCatalog,
  statBlockCreatureInit,
  targetFill,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
} from "./unit-profile-admission-spell-record.test-support.ts";
import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import { statBlockId } from "@dnd/shared/game-facts";

type SaveFill = ReturnType<typeof savingThrowOutcomeFill>;

function withOutcomeCover(
  fill: SaveFill,
  covers: ReadonlyMap<string, BonusCoverType>,
): SaveFill {
  return {
    ...fill,
    value: {
      ...fill.value,
      outcomes: fill.value.outcomes.map((outcome) => {
        const cover = covers.get(outcome.targetId);
        return cover === undefined || outcome.withoutRoll === true
          ? outcome
          : { ...outcome, cover };
      }),
    },
  };
}

function rolled(targetId: typeof skeletonId, succeeded: boolean) {
  return { targetId, succeeded, naturalD20: 12 };
}

function wizardWith(input: {
  readonly name: string;
  readonly cantrips?: readonly SpellRecord[];
  readonly preparedSpells?: readonly string[];
  readonly spellSlots?: readonly { spellLevel: 1; count: number }[];
}) {
  return startBattleSessionRight({
    battleId: battleId(`battle-save-cover-${input.name}`),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          cantrips: input.cantrips ?? [],
          preparedSpells: (input.preparedSpells ?? []).map((id) =>
            spellRecord(id),
          ),
          ...(input.spellSlots === undefined
            ? {}
            : { spellSlots: input.spellSlots }),
        }),
      }),
      skeletonCreatureInit({ initiative: 10 }),
      statBlockCreatureInit({
        combatantId: secondSkeletonId,
        statBlockName: "Second Skeleton",
        initiative: 8,
        statBlock: assertStatBlockForTest(
          statBlockCatalog,
          statBlockId("stat_block_skeleton"),
        ),
      }),
    ],
  });
}

function burningHands() {
  const session = wizardWith({
    name: "burning-hands",
    preparedSpells: ["burning_hands"],
    spellSlots: [{ spellLevel: 1, count: 1 }],
  });
  const subject: BattleSubject = {
    tag: "actionSpell",
    actorId: wizardId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      spellSlotInvocationRef("burning_hands", 1, "saveGatedDamage"),
    ),
    mode: { tag: "cast" },
  };
  const state = session.state;
  const hole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "savingThrowOutcome",
  );
  const save = (covers: ReadonlyMap<string, BonusCoverType>) =>
    resolveBattleSubject({
      state,
      subject,
      fills: [
        withOutcomeCover(
          savingThrowOutcomeFill(hole, [
            rolled(skeletonId, true),
            rolled(secondSkeletonId, false),
          ]),
          covers,
        ),
      ],
    });
  return { hole, save };
}

const SYNTHETIC_TARGETED_DEX_CANTRIP_ID = "synthetic_radiant_descent";

/** Sacred Flame's save gate without its cover denial, as a synthetic cantrip. */
function syntheticTargetedDexCantrip(): SpellRecord {
  const base = spellRecord("sacred_flame");
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected Sacred Flame activation mechanics.");
  }
  const phase = base.mechanics.phases[0];
  if (phase?.kind !== "save_gate" || phase.saveCoverBenefit !== "denied") {
    throw new Error("Expected Sacred Flame's cover-denying save gate.");
  }
  const { saveCoverBenefit: _denied, ...coverPhase } = phase;
  return decodeSpellRecordForTest({
    ...base,
    id: SYNTHETIC_TARGETED_DEX_CANTRIP_ID,
    name: "Synthetic Radiant Descent",
    provenance: {
      kind: "synthetic-test",
      section: "battle-runtime/saving-throw-cover",
    },
    mechanics: { ...base.mechanics, phases: [coverPhase] },
  });
}

function targetedSave(spell: SpellRecord) {
  const session = wizardWith({ name: spell.id, cantrips: [spell] });
  const state = session.state;
  const subject: BattleSubject = {
    tag: "actionSpell",
    actorId: wizardId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      cantripSpellInvocationRef(spell.id, "saveGatedDamage"),
    ),
    mode: { tag: "cast" },
  };
  const targetHole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const target = (cover: RuledCoverType | undefined) => {
    const fill = targetFill(targetHole, skeletonId);
    return {
      ...fill,
      spatialFacts: (fill.spatialFacts ?? []).map((fact) =>
        fact.kind === "spellTarget" && cover !== undefined
          ? { ...fact, cover }
          : fact,
      ),
    };
  };
  const saveHole = (cover: RuledCoverType | undefined) => {
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [target(cover)] }),
      "savingThrowOutcome",
    );
    if (hole.kind !== "savingThrowOutcome") throw new Error("Expected a save.");
    return hole;
  };
  const save = (
    cover: RuledCoverType | undefined,
    outcomeCover: BonusCoverType | undefined,
  ) =>
    resolveBattleSubject({
      state,
      subject,
      fills: [
        target(cover),
        withOutcomeCover(
          savingThrowOutcomeFill(saveHole(cover), [rolled(skeletonId, true)]),
          new Map(
            outcomeCover === undefined ? [] : [[skeletonId, outcomeCover]],
          ),
        ),
      ],
    });
  return { state, subject, saveHole, save };
}

/** Grease with its initial save gate denying the benefit of cover. */
function greaseDenyingCover(): SpellRecord {
  const base = spellRecord("grease");
  if (
    base.mechanics.family !== "ongoing_effect" ||
    base.mechanics.initialPhase?.kind !== "save_gate"
  ) {
    throw new Error("Expected Grease's initial save gate.");
  }
  return decodeSpellRecordForTest({
    ...base,
    id: "synthetic_grease_denying_cover",
    name: "Synthetic Grease Denying Cover",
    provenance: {
      kind: "synthetic-test",
      section: "battle-runtime/saving-throw-cover",
    },
    mechanics: {
      ...base.mechanics,
      initialPhase: {
        ...base.mechanics.initialPhase,
        saveCoverBenefit: "denied",
      },
    },
  });
}

function procedureAdmission(spell: SpellRecord) {
  const source = spellAdmissionSource(spell);
  return admitRegisteredSpellProcedureMechanics({
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  });
}

function coverBonuses(hole: BattleHole) {
  if (hole.kind !== "savingThrowOutcome") throw new Error("Expected a save.");
  return hole.targetFlatBonuses.filter((bonus) => bonus.kind === "cover");
}

describe("battle runtime: Cover on Dexterity saving throws", () => {
  test("an area's Dexterity save takes each target's cover on its outcome", () => {
    const { hole, save } = burningHands();
    if (hole.kind !== "savingThrowOutcome") throw new Error("Expected a save.");
    expect(savingThrowCoverRuling(hole)).toBe("coverBenefit");
    expect(coverBonuses(hole)).toEqual([]);
    for (const cover of ["half", "threeQuarters"] as const) {
      expect(
        requireHole(save(new Map([[skeletonId, cover]])), "rolledDice"),
      ).toMatchObject({ kind: "rolledDice" });
    }
    expect(requireHole(save(new Map()), "rolledDice")).toMatchObject({
      kind: "rolledDice",
    });
  });

  test("cover on the outcomes of a save that isn't a Dexterity save is refused", () => {
    const session = wizardWith({
      name: "inflict-wounds",
      preparedSpells: ["inflict_wounds"],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        wizardId,
        spellSlotInvocationRef("inflict_wounds", 1, "saveGatedDamage"),
      ),
      mode: { tag: "cast" },
    };
    const state = session.state;
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const target = targetFill(targetHole, skeletonId);
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [target] }),
      "savingThrowOutcome",
    );
    if (hole.kind !== "savingThrowOutcome") throw new Error("Expected a save.");
    expect(hole.ability).toBe("con");
    expect(savingThrowCoverRuling(hole)).toBe("noCoverBenefit");
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          target,
          withOutcomeCover(
            savingThrowOutcomeFill(hole, [rolled(skeletonId, true)]),
            new Map([[skeletonId, "half"]]),
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Cover adds nothing to this saving throw; omit cover on its outcomes.",
    });
  });

  test("a targeted spell's Dexterity save shows the cover ruled on its spellTarget fact and refuses it again on the outcome", () => {
    const { saveHole, save } = targetedSave(syntheticTargetedDexCantrip());
    expect(savingThrowCoverRuling(saveHole(undefined))).toBe("coverBenefit");
    expect(coverBonuses(saveHole(undefined))).toEqual([]);
    expect(coverBonuses(saveHole("half"))).toEqual([
      { kind: "cover", targetId: skeletonId, cover: "half", bonus: 2 },
    ]);
    expect(coverBonuses(saveHole("threeQuarters"))).toEqual([
      { kind: "cover", targetId: skeletonId, cover: "threeQuarters", bonus: 5 },
    ]);
    expect(save("half", "half")).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "This target's cover already counts in the save's targetFlatBonuses; omit cover on its outcome.",
    });
    expect(save("half", undefined).tag).not.toBe("invalid");
  });

  test("a spell's save counts one cover bonus per target, from that caster's spellTarget fact", () => {
    const { saveHole } = targetedSave(syntheticTargetedDexCantrip());
    const hole = saveHole(undefined);
    if (!("sourceProcedureRef" in hole)) {
      throw new Error("Expected a spell's save hole.");
    }
    const { sourceProcedureRef } = hole;
    const fact = {
      kind: "spellTarget",
      casterId: wizardId,
      targetId: skeletonId,
      sourceProcedureRef,
      cover: "half",
    } as const;
    expect(
      spellTargetCoverFlatBonuses({
        ruling: "coverBenefit",
        casterId: wizardId,
        sourceProcedureRef,
        spellTargetFacts: [
          fact,
          { ...fact, cover: "threeQuarters" },
          { ...fact, casterId: secondSkeletonId, targetId: secondSkeletonId },
          { ...fact, targetId: secondSkeletonId, cover: "total" },
        ],
      }),
    ).toEqual([
      { kind: "cover", targetId: skeletonId, cover: "half", bonus: 2 },
    ]);
  });

  test("a covered save fill that answers no open hole is left to the resolution to refuse", () => {
    const { state, subject, saveHole } = targetedSave(
      syntheticTargetedDexCantrip(),
    );
    const fill = withOutcomeCover(
      savingThrowOutcomeFill(saveHole(undefined), [rolled(skeletonId, true)]),
      new Map([[skeletonId, "half"]]),
    );
    // Without its target fill first, the save hole isn't open yet.
    expect(
      savingThrowFillsCoverIssue([fill], (fills) =>
        resolveBattleSubject({ state, subject, fills }),
      ),
    ).toBeNull();
  });

  test("Sacred Flame's target gains no benefit from its cover for the save", () => {
    const { saveHole, save } = targetedSave(spellRecord("sacred_flame"));
    for (const cover of [undefined, "half", "threeQuarters"] as const) {
      const hole = saveHole(cover);
      expect(hole.ability).toBe("dex");
      expect(hole).toMatchObject({ deniesCoverBenefit: true });
      expect(savingThrowCoverRuling(hole)).toBe("noCoverBenefit");
      expect(coverBonuses(hole)).toEqual([]);
    }
    expect(save("half", undefined).tag).not.toBe("invalid");
    expect(save(undefined, "half")).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Cover adds nothing to this saving throw; omit cover on its outcomes.",
    });
  });

  test("a spell whose save gate denies cover has a Battle owner only through a procedure that carries the denial", () => {
    const sacredFlame = procedureAdmission(spellRecord("sacred_flame"));
    expect(sacredFlame.tag).toBe("admitted");
    if (sacredFlame.tag !== "admitted") return;
    expect(sacredFlame.procedures.map(({ procedure }) => procedure)).toEqual([
      "saveGatedDamage",
    ]);
    expect(procedureAdmission(spellRecord("grease")).tag).toBe("admitted");
    expect(procedureAdmission(greaseDenyingCover())).toEqual({
      tag: "notBattleOwned",
      reason: { kind: "unownedMechanicsFacet", facet: "saveCoverBenefit" },
    });
  });
});
