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
          , section = "Spells/Descriptions-M#Major Image"
          }
      , description =
          "You create the image of an object, a creature, or some other visible phenomenon that is no larger than a 20-foot Cube. The image appears at a spot that you can see within range and lasts for the duration. It seems real, including sounds, smells, and temperature appropriate to the thing depicted, but it can't deal damage or cause conditions. If you are within range of the illusion, you can take a Magic action to cause the image to move to any other spot within range. Physical interaction with the image reveals it to be an illusion. A creature that takes a Study action to examine the image can determine that it is an illusion with a successful Intelligence (Investigation) check against your spell save DC. If a creature discerns the illusion for what it is, the creature can see through the image, and its other sensory qualities become faint to the creature. Using a Higher-Level Spell Slot (4+): The spell lasts until dispelled, without requiring Concentration."
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
              { kind = "area"
              , shape = { kind = "cube", sideFeet = 20 }
              , origin = { kind = "point_within_range" }
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
