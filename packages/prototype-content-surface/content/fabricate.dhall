-- Fabricate — SRD 5.2.1 Spell, Level 4, Transmutation.
--
-- RAW (Spells/Descriptions-E-F#Fabricate):
--   "You convert raw materials into products of the same material."
--   Duration: Instantaneous. Casting time: 10 minutes.
--   Range: 120 ft. Components: V, S.
--
-- Family: activation (instantaneous, no save/attack).
-- Phase: direct, attachment = object (raw materials), effect = create_object.
--
-- OMITTED (no surface atoms):
--   - Material-dependent size cap: Large for most materials, Medium for
--     metal/stone/minerals. Only one maxSize field on create_object;
--     material-conditional sizing is not expressible. Encoding uses the
--     general-case maxSize = "large".
--   - Proficiency gate: can't create high-skill items without Artisan's Tools
--     proficiency. No proficiency-check gate exists on create_object.
--   - Quality derived from raw material quality — DM-resolved.
--   - Cannot create creatures or magic items — exclusion constraint, not
--     expressible in the current surface.

let fabricate =
      { kind = "spell"
      , id = "fabricate"
      , name = "Fabricate"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-F#Fabricate"
          }
      , description =
          "You convert raw materials into products of the same material. For example, you can fabricate a wooden bridge from a clump of trees, a rope from a patch of hemp, or clothes from flax or wool. Choose raw materials that you can see within range. You can fabricate a Large or smaller object (contained within a 10-foot Cube or eight connected 5-foot Cubes) given a sufficient quantity of material. If you're working with metal, stone, or another mineral substance, however, the fabricated object can be no larger than Medium (contained within a 5-foot Cube). The quality of any fabricated objects is based on the quality of the raw materials. Creatures and magic items can't be created by this spell. You also can't use it to create items that require a high degree of skill—such as weapons and armor—unless you have proficiency with the type of Artisan's Tools used to craft such objects."
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "transmutation"
          , castingTime = { kind = "minutes", amount = 10, ritual = False }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "hole"
                               , holeId = "fabricate_object"
                               , label = "target object"
                               , value =
                                   { kind = "object", count = 1 }
                               }
                , effects =
                    [ { kind = "create_object"
                      , maxSize = "large"
                      }
                    ]
                }
              ]
          }
      }

in  fabricate
