import { NonNegativeInteger } from "@dnd/shared/types";
import { Option, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  battleExecutionScopeOrdinal,
  battleId,
  combatantId,
  battleStatBlockExecutionScopeRef,
  battleStatBlockProcedureExecutionRef,
  statBlockSpellcastingGroupOrdinal,
  statBlockSpellcastingInvocationOrdinal,
} from "../identity.ts";
import {
  LeveledSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  SpellEffectSpellAccessSchema,
} from "../battle-reducer/codec-building-blocks.ts";
import { NoSpellInvocationResourceSchema } from "./spell-invocation-codecs.ts";
import { SpellRuleExecutionFactsSchema } from "./spell-rule-facts.ts";
import {
  spellProcedureExecutionSchema,
  spellEffectProcedureExecutionSchema,
} from "../battle-reducer/spell-procedure-profiles/execution-profile.ts";
import { isSpellInvocationCastingFacts } from "./spell-invocation-casting-facts.ts";

const ref = {
  procedureRef: battleStatBlockProcedureExecutionRef(
    battleStatBlockExecutionScopeRef(
      battleId("casting-facts"),
      combatantId("caster"),
      battleExecutionScopeOrdinal(0),
    ),
    NonNegativeInteger(0),
  ),
  groupOrdinal: statBlockSpellcastingGroupOrdinal(0),
  invocationOrdinal: statBlockSpellcastingInvocationOrdinal(0),
};
const definition = {
  level: 1,
  range: { kind: "self" },
  duration: { kind: "instantaneous" },
  components: {
    verbal: true,
    somatic: true,
    hasMaterial: false,
    hasPricedOrConsumedMaterial: false,
  },
  twinnedTargetCount: null,
};
const source = {
  tag: "statBlock",
  castingTime: { kind: "action" },
  actionCost: "bonusAction",
  invocationRef: ref,
  abilityModifier: 3,
  spellSaveDc: Option.none(),
  spellAttackBonus: Option.none(),
};
const casting = {
  spellRuleFacts: { ...definition, castingSource: source },
  access: { tag: "statBlockLeveled", invocationRef: ref },
  resource: { tag: "statBlockAtWill", castLevel: 1 },
};
const initialSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    procedure: Schema.Literal("syntheticCast"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    actionCost: Schema.Literal("magicAction"),
  }),
);
const isInitial = Schema.is(initialSchema);

describe("correlated caster admission facts", () => {
  it("admits a Stat Block source with its own access and capacity", () => {
    expect(isSpellInvocationCastingFacts(casting)).toBe(true);
  });
  it("rejects character slots on a Stat Block source", () => {
    expect(
      isSpellInvocationCastingFacts({
        ...casting,
        resource: { tag: "spellSlot", slotLevel: 1 },
      }),
    ).toBe(false);
  });
  it("rejects a character access marker on a Stat Block source", () => {
    expect(
      isSpellInvocationCastingFacts({
        ...casting,
        access: { tag: "prepared" },
      }),
    ).toBe(false);
  });
  it("rejects access referring to another canonical invocation", () => {
    expect(
      isSpellInvocationCastingFacts({
        ...casting,
        access: {
          tag: "statBlockLeveled",
          invocationRef: {
            ...ref,
            invocationOrdinal: statBlockSpellcastingInvocationOrdinal(1),
          },
        },
      }),
    ).toBe(false);
  });
  it("rejects cantrip capacity for a leveled definition", () => {
    expect(
      isSpellInvocationCastingFacts({
        ...casting,
        access: { tag: "statBlockCantrip", invocationRef: ref },
        resource: { tag: "statBlockAtWill", castLevel: 0 },
      }),
    ).toBe(false);
  });
  it("rejects a casting level below the definition's level", () => {
    expect(
      isSpellInvocationCastingFacts({
        ...casting,
        spellRuleFacts: { ...casting.spellRuleFacts, level: 2 },
      }),
    ).toBe(false);
  });
  it("uses the source section cost for an initial Stat Block cast", () => {
    expect(
      isInitial({
        ...casting,
        procedure: "syntheticCast",
        actionCost: "bonusAction",
      }),
    ).toBe(true);
    expect(
      isInitial({
        ...casting,
        procedure: "syntheticCast",
        actionCost: "magicAction",
      }),
    ).toBe(false);
  });
  it("keeps a character initial cast's declared native cost", () => {
    const character = {
      ...casting,
      spellRuleFacts: {
        ...definition,
        castingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: 3,
        },
      },
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: 1 },
      procedure: "syntheticCast",
    };
    expect(isInitial({ ...character, actionCost: "magicAction" })).toBe(true);
    expect(isInitial({ ...character, actionCost: "bonusAction" })).toBe(false);
  });
  it("keeps effect procedure costs independent of the original casting source", () => {
    const effect = spellEffectProcedureExecutionSchema(
      Schema.Struct({
        spellRuleFacts: SpellRuleExecutionFactsSchema,
        access: SpellEffectSpellAccessSchema,
        resource: NoSpellInvocationResourceSchema,
        actionCost: Schema.Literal("magicAction"),
      }),
    );
    const facts = {
      ...casting,
      access: { tag: "spellEffect", sourceCombatantId: combatantId("caster") },
      resource: { tag: "none" },
    };
    expect(Schema.is(effect)({ ...facts, actionCost: "magicAction" })).toBe(
      true,
    );
    expect(Schema.is(effect)({ ...facts, actionCost: "bonusAction" })).toBe(
      false,
    );
  });
});
