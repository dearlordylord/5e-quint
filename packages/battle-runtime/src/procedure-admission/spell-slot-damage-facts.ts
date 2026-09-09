import type { SpellSlotLevel } from "@dnd/shared/types";
import type {
  DiceAmount as SurfaceDiceAmount,
  DiceExpr,
  SpellLevel,
} from "@dnd/surface/surface/types";

import { supportedDamageAmountExpr } from "../battle-reducer/spells-execution-facts.ts";
import type { SpellAdmissionCastOption } from "../battle-reducer/spell-procedure-profiles/profile.ts";

export function supportedSpellSlotDamageFacts(input: {
  readonly slots: readonly SpellAdmissionCastOption[];
  readonly amount: SurfaceDiceAmount;
  readonly spellLevel: SpellLevel;
}): readonly {
  readonly slotLevel: SpellSlotLevel;
  readonly damageExpr: DiceExpr;
  readonly payment: SpellAdmissionCastOption["payment"];
}[] {
  return input.slots.flatMap(({ spellLevel: slotLevel, payment }) => {
    if (Number(slotLevel) < input.spellLevel) return [];
    const damageExpr = supportedDamageAmountExpr({
      amount: input.amount,
      spellLevel: input.spellLevel,
      slotLevel,
    });
    return damageExpr === null ? [] : [{ slotLevel, damageExpr, payment }];
  });
}
