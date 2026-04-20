import { Schema } from "effect";

const ProvenanceSchema = Schema.Struct({
  kind: Schema.Literal("srd-5.2.1"),
  section: Schema.String,
});

const ComponentsSchema = Schema.Struct({
  m: Schema.Union(Schema.Boolean, Schema.String),
  s: Schema.Boolean,
  v: Schema.Boolean,
});

export const CureWoundsSurfaceSchema = Schema.Struct({
  id: Schema.Literal("cure_wounds"),
  kind: Schema.Literal("spell"),
  name: Schema.String,
  description: Schema.String,
  provenance: ProvenanceSchema,
  mechanics: Schema.Struct({
    family: Schema.Literal("activation"),
    level: Schema.Literal(1),
    school: Schema.Literal("abjuration"),
    castingTime: Schema.Struct({ kind: Schema.Literal("action") }),
    components: ComponentsSchema,
    duration: Schema.Struct({ kind: Schema.Literal("instantaneous") }),
    range: Schema.Struct({ kind: Schema.Literal("touch") }),
    phases: Schema.Tuple(
      Schema.Struct({
        kind: Schema.Literal("direct"),
        attachment: Schema.Struct({
          kind: Schema.Literal("target"),
          selection: Schema.Struct({
            mode: Schema.Literal("one"),
          }),
        }),
        effects: Schema.Tuple(
          Schema.Struct({
            kind: Schema.Literal("heal_hp"),
            target: Schema.Literal("target_creature"),
            amount: Schema.Struct({
              kind: Schema.Literal("linear_per_level"),
              axis: Schema.Literal("slot"),
              startingAtLevel: Schema.Literal(1),
              base: Schema.Struct({
                dice: Schema.Literal(2),
                dieSize: Schema.Literal(8),
                spellcastingMod: Schema.Literal(true),
              }),
              perLevel: Schema.Struct({
                dice: Schema.Literal(2),
              }),
            }),
          }),
        ),
      }),
    ),
  }),
});

export const FireballSurfaceSchema = Schema.Struct({
  id: Schema.Literal("fireball"),
  kind: Schema.Literal("spell"),
  name: Schema.String,
  description: Schema.String,
  provenance: ProvenanceSchema,
  mechanics: Schema.Struct({
    family: Schema.Literal("activation"),
    level: Schema.Literal(3),
    school: Schema.Literal("evocation"),
    castingTime: Schema.Struct({ kind: Schema.Literal("action") }),
    components: ComponentsSchema,
    duration: Schema.Struct({ kind: Schema.Literal("instantaneous") }),
    range: Schema.Struct({
      kind: Schema.Literal("point"),
      feet: Schema.Literal(150),
    }),
    phases: Schema.Tuple(
      Schema.Struct({
        kind: Schema.Literal("save_gate"),
        ability: Schema.Literal("dex"),
        attachment: Schema.Struct({
          kind: Schema.Literal("area"),
          origin: Schema.Struct({
            kind: Schema.Literal("point_within_range"),
          }),
          shape: Schema.Struct({
            kind: Schema.Literal("sphere"),
            radiusFeet: Schema.Literal(20),
          }),
        }),
        dc: Schema.Struct({
          kind: Schema.Literal("caster_spell_save_dc"),
        }),
        onFail: Schema.Struct({
          kind: Schema.Literal("damage"),
          damageType: Schema.Literal("fire"),
          amount: Schema.Struct({
            kind: Schema.Literal("linear_per_level"),
            axis: Schema.Literal("slot"),
            startingAtLevel: Schema.Literal(3),
            base: Schema.Struct({
              dice: Schema.Literal(8),
              dieSize: Schema.Literal(6),
            }),
            perLevel: Schema.Struct({
              dice: Schema.Literal(1),
            }),
          }),
        }),
        onSuccess: Schema.Struct({
          kind: Schema.Literal("half_damage"),
        }),
      }),
    ),
  }),
});

export const ActionSurgeSurfaceSchema = Schema.Struct({
  id: Schema.Literal("fighter_action_surge_l2"),
  kind: Schema.Literal("class_feature"),
  name: Schema.String,
  description: Schema.String,
  provenance: ProvenanceSchema,
  className: Schema.Literal("fighter"),
  acquiredAtLevel: Schema.Literal(2),
  mechanics: Schema.Struct({
    family: Schema.Literal("activation"),
    activationCost: Schema.Struct({
      kind: Schema.Literal("free"),
    }),
    resetCadence: Schema.Struct({
      kind: Schema.Literal("short_or_long_rest"),
    }),
    usageLimit: Schema.Struct({
      kind: Schema.Literal("once_per_turn"),
    }),
    resource: Schema.Struct({
      kind: Schema.Literal("use_count"),
      cap: Schema.Struct({
        kind: Schema.Literal("threshold_tiers"),
        axis: Schema.Literal("class"),
        base: Schema.Literal(1),
        tiers: Schema.Tuple(
          Schema.Struct({
            atLevel: Schema.Literal(17),
            value: Schema.Literal(2),
          }),
        ),
      }),
    }),
    phases: Schema.Tuple(
      Schema.Struct({
        kind: Schema.Literal("direct"),
        attachment: Schema.Struct({
          kind: Schema.Literal("self"),
        }),
        effects: Schema.Tuple(
          Schema.Struct({
            kind: Schema.Literal("grant_extra_action"),
            restriction: Schema.Struct({
              kind: Schema.Literal("exclude"),
              actions: Schema.Tuple(Schema.Literal("magic")),
            }),
          }),
        ),
      }),
    ),
  }),
});

export const ToySurfaceUnitSchema = Schema.Union(
  CureWoundsSurfaceSchema,
  FireballSurfaceSchema,
  ActionSurgeSurfaceSchema,
);

export type CureWoundsSurface = Schema.Schema.Type<typeof CureWoundsSurfaceSchema>;
export type FireballSurface = Schema.Schema.Type<typeof FireballSurfaceSchema>;
export type ActionSurgeSurface = Schema.Schema.Type<typeof ActionSurgeSurfaceSchema>;
export type ToySurfaceUnit = Schema.Schema.Type<typeof ToySurfaceUnitSchema>;
