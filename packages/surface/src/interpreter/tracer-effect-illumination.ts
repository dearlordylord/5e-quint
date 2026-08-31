import type { AreaDirectEffectAtom } from "../surface/types.ts";

const ILLUMINATION_EFFECT_ATOM_KINDS = [
  "emit_bright_and_dim_illumination",
  "emit_bright_illumination",
  "emit_dim_illumination",
  "emit_dim_illumination_until_end_of_caster_next_turn",
] as const;

type IlluminationEffectAtomKind =
  (typeof ILLUMINATION_EFFECT_ATOM_KINDS)[number];

export type IlluminationEffectAtom = Extract<
  AreaDirectEffectAtom,
  { readonly kind: IlluminationEffectAtomKind }
>;

export function isIlluminationEffectAtom(
  effect: AreaDirectEffectAtom,
): effect is IlluminationEffectAtom {
  return ILLUMINATION_EFFECT_ATOM_KINDS.some((kind) => kind === effect.kind);
}
