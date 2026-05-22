-- Darkness — SRD 5.2.1, Level 2 Evocation.
--
-- RAW (Spells/Descriptions-A-D#Darkness):
--   "For the duration, magical Darkness spreads from a point within range
--    and fills a 15-foot-radius Sphere. Darkvision can't see through it,
--    and nonmagical light can't illuminate it."
--   "Alternatively, you cast the spell on an object that isn't being
--    worn or carried, causing the Darkness to fill a 15-foot Emanation
--    originating from that object. Covering that object with something
--    opaque ... blocks the Darkness."
--   "If any of this spell's area overlaps with an area of Bright Light
--    or Dim Light created by a spell of level 2 or lower, that other
--    spell is dispelled."
--
-- Family: ongoing_effect (Concentration, up to 10 minutes).
-- Attachment: area (sphere r=15, point_within_range) — primary mode.
-- Operations:
--   1. passive → area_is_magical_darkness.
--   2. passive → end_overlapping_spell_created_bright_or_dim_light
--      (max spell level 2).
--
-- OMITTED (separate owner/follow-up work):
--   1. Object-attachment mode and opaque-cover blocking require a cast-time
--      attachment choice plus an object-origin Emanation/cover witness.
--   2. Nonmagical-light denial is a light/visibility witness consequence,
--      not a Darkness-local duplicate light state.

let darkness =
      { kind = "spell"
      , id = "darkness"
      , name = "Darkness"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Darkness"
          }
      , description =
          "For the duration, magical Darkness spreads from a point within range and fills a 15-foot-radius Sphere. Darkvision can't see through it, and nonmagical light can't illuminate it. Alternatively, you cast the spell on an object that isn't being worn or carried, causing the Darkness to fill a 15-foot Emanation originating from that object. Covering that object with something opaque blocks the Darkness. If any of this spell's area overlaps with an area of Bright Light or Dim Light created by a spell of level 2 or lower, that other spell is dispelled."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True
              , s = False
              , m = Some "bat fur and a piece of coal"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "darkness_point"
              , label = "spell origin point"
              , value =
                  { kind = "area"
                  , shape = { kind = "sphere", radiusFeet = 15 }
                  , origin = { kind = "point_within_range" }
                  }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect = { kind = "area_is_magical_darkness" }
                }
              , { trigger = { kind = "passive" }
                , effect =
                    { kind =
                        "end_overlapping_spell_created_bright_or_dim_light"
                    , maxSpellLevel = 2
                    }
                }
              ]
          }
      }

in  darkness
