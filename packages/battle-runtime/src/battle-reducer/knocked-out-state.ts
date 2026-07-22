import type { ConditionState } from "@dnd/shared-algebras/conditions-algebra";
import type { Hp } from "@dnd/shared/types";
import { Brand } from "effect";

export type KnockedOutOneHp = Hp & Brand.Brand<"KnockedOutOneHp">;
export const KnockedOutOneHp = Brand.nominal<KnockedOutOneHp>();

export type KnockedOutConditionState = ConditionState &
  Brand.Brand<"KnockedOutConditionState">;
export const KnockedOutConditionState =
  Brand.nominal<KnockedOutConditionState>();
