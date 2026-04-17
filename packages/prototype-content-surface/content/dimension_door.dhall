-- Dimension Door — SRD 5.2.1 Spell, level 4, Conjuration.
--
-- RAW (Spells / Descriptions A-D / Dimension Door):
--   "You teleport yourself from your current location to any other
--    spot within range. You arrive at exactly the spot desired. It
--    can be a place you can see, one you can visualize, or one you
--    can describe by stating distance and direction."
--   "You can bring along objects as long as their weight doesn't
--    exceed what you can carry. You can also bring one willing
--    creature of your size or smaller who is carrying gear up to
--    its carrying capacity. The creature must be within 5 feet of
--    you when you cast this spell."
--   "If you would arrive in a place already occupied by an object
--    or a creature, you and any creature traveling with you each
--    take 4d6 Force damage, and the spell fails to teleport you."
--
-- PARTIAL validation reference. Encodes:
--   • EffectAtom.teleport with maxFeet = 500 — the large-range
--     sibling to misty_step (30 ft) and thunder_step; reuses the
--     existing unoccupied_visible_space destination.
--   • direct phase with self-attachment (no roll, no save).
--
-- DEFERRED widenings (do not block authoring the core; SRD survey
-- result-dimension_door.json enumerates the gaps):
--   • Willing-passenger grammar — Attachment has no "self + one
--     adjacent willing creature" variant. No other SRD unit pressures
--     this shape yet (Thunder Step brings different passenger rules);
--     defer until a second unit coalesces it.
--   • Occupancy-failure branch — "arrive in an occupied space → 4d6
--     Force to everyone teleporting, teleport fails". This is a
--     destination-check rider with no current shape. Deferred.
--   • Visualize / distance-and-direction destination variants are
--     DM agenda (spatial / visualization-dependent targeting).

let dimensionDoor =
      { kind = "spell"
      , id = "dimension_door"
      , name = "Dimension Door"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Dimension Door"
          }
      , description =
          "You teleport yourself from your current location to any other spot within range. You arrive at exactly the spot desired. It can be a place you can see, one you can visualize, or one you can describe by stating distance and direction. You can bring along objects as long as their weight doesn't exceed what you can carry. You can also bring one willing creature of your size or smaller who is carrying gear up to its carrying capacity. The creature must be within 5 feet of you when you cast this spell. If you would arrive in a place already occupied by an object or a creature, you and any creature traveling with you each take 4d6 Force damage, and the spell fails to teleport you."
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = False, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "teleport"
                      , maxFeet = 500
                      , destination = "unoccupied_visible_space"
                      }
                    ]
                }
              ]
          }
      }

in  dimensionDoor
