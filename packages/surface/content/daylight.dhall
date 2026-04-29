-- Daylight — SRD 5.2.1, Level 3 Evocation.
--
-- RAW (Spells/Descriptions-A-D#Daylight):
--   "For the duration, sunlight spreads from a point within range and
--    fills a 60-foot-radius Sphere. The sunlight's area is Bright Light
--    and sheds Dim Light for an additional 60 feet."
--   "Alternatively, you cast the spell on an object that isn't being
--    worn or carried, causing the sunlight to fill a 60-foot Emanation
--    originating from that object. Covering that object with something
--    opaque blocks the sunlight."
--   "If any of this spell's area overlaps with an area of Darkness
--    created by a spell of level 3 or lower, that other spell is
--    dispelled."
--
-- Family: ongoing_effect (Timed, 1 hour, no concentration).
-- Attachment: area (sphere r=60, point_within_range) — primary mode.
-- Operation: passive → emit_light (bright 60 ft + dim 60 ft beyond).
--
-- OMITTED (surface widening, not a blocking failure):
--   1. Object-attachment mode ("Alternatively, cast on an object"):
--      requires a cast-time choice between two Attachment kinds
--      (area/point vs. object/emanation). No cast-time attachment-choice
--      variant exists in the surface. Only the point-origin sphere mode
--      is encoded. The object mode is noted in proposal-daylight.md.
--   2. Overlap-triggered passive dispel of level ≤ 3 darkness spells:
--      "if any of this spell's area overlaps with an area of Darkness
--      created by a spell of level 3 or lower, that other spell is
--      dispelled." The `end_ongoing_spells` atom exists but no
--      OngoingTrigger covers "area overlap with qualifying spell."
--      This passive auto-dispel is omitted; see proposal-daylight.md.

let daylight =
      { kind = "spell"
      , id = "daylight"
      , name = "Daylight"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Daylight"
          }
      , description =
          "For the duration, sunlight spreads from a point within range and fills a 60-foot-radius Sphere. The sunlight's area is Bright Light and sheds Dim Light for an additional 60 feet. Alternatively, you cast the spell on an object that isn't being worn or carried, causing the sunlight to fill a 60-foot Emanation originating from that object. Covering that object with something opaque blocks the sunlight. If any of this spell's area overlaps with an area of Darkness created by a spell of level 3 or lower, that other spell is dispelled."
      , mechanics =
          { family = "ongoing_effect"
          , level = 3
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "daylight_point"
              , label = "spell origin point"
              , value =
                  { kind = "area"
                  , shape = { kind = "sphere", radiusFeet = 60 }
                  , origin = { kind = "point_within_range" }
                  }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "emit_light"
                    , brightRadiusFeet = 60
                    , dimAdditionalFeet = 60
                    }
                }
              ]
          }
      }

in  daylight
