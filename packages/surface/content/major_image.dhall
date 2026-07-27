-- Major Image — SRD 5.2.1 level-3 Illusion spell.
--
-- Core: creates a persistent sensory illusion (visual, sound, smell,
-- temperature) up to a 20-ft Cube at a spot within range.
--
-- Two mechanics NOT encoded (see proposal-major_image.md):
--   1. Magic action to move the illusion to another spot within range —
--      on_caster_spends_action trigger exists but there is no
--      `reposition_attachment` atom (same gap as Dancing Lights).
--   2. Upcast at slot 4+: concentration is removed and the spell lasts
--      until dispelled — DurationUpcastTier supports only amount changes,
--      not a change in duration kind (concentration → permanent).

let majorImage =
      { kind = "spell"
      , id = "major_image"
      , name = "Major Image"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P.md#Major Image"
          }

      , mechanics =
          { family = "ongoing_effect"
          , level = 3
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = Some "a bit of fleece" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "major_image_point"
              , label = "spell origin point"
              , value =
                  { kind = "area"
                  , shape = { kind = "cube", sideFeet = 20 }
                  , origin = { kind = "point_within_range" }
                  }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "create_illusion"
                    , maxSize = "gargantuan"
                    , channels =
                        [ "visual", "sound", "smell", "temperature" ]
                    }
                }
              ]
          }
      }

in  majorImage
