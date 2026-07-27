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
          , section = "Spells/Descriptions-E-L.md#Fabricate"
          }

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
