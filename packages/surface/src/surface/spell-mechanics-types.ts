import type { Schema } from "effect";

import type {
  ActivationMechanicsSchema,
  AnchoredTriggerMechanicsSchema,
  GlyphWardingMechanicsSchema,
  MagicCircleWardMechanicsSchema,
  MinorMagicEffectMenuMechanicsSchema,
  ModalActivationMechanicsSchema,
  ModalOngoingEffectMechanicsSchema,
  ObjectRepairMechanicsSchema,
  OngoingEffectMechanicsSchema,
  PassiveHitInterceptMechanicsSchema,
  ReanimatedCreatureMechanicsSchema,
  SpawnedCreatureMechanicsSchema,
  StoneMergeMechanicsSchema,
  TemplatedMultiSpawnMechanicsSchema,
  TriggeredReactionMechanicsSchema,
} from "./schema-spell.ts";

type SpellMechanicsCodec =
  | typeof OngoingEffectMechanicsSchema
  | typeof ModalOngoingEffectMechanicsSchema
  | typeof ActivationMechanicsSchema
  | typeof ModalActivationMechanicsSchema
  | typeof TriggeredReactionMechanicsSchema
  | typeof PassiveHitInterceptMechanicsSchema
  | typeof AnchoredTriggerMechanicsSchema
  | typeof MagicCircleWardMechanicsSchema
  | typeof StoneMergeMechanicsSchema
  | typeof GlyphWardingMechanicsSchema
  | typeof SpawnedCreatureMechanicsSchema
  | typeof ReanimatedCreatureMechanicsSchema
  | typeof TemplatedMultiSpawnMechanicsSchema
  | typeof ObjectRepairMechanicsSchema
  | typeof MinorMagicEffectMenuMechanicsSchema;

export type SpellMechanics = Schema.Schema.Type<SpellMechanicsCodec>;
export type SpellMechanicsEncoded = Schema.Codec.Encoded<SpellMechanicsCodec>;
