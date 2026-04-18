-- Silent Image — SRD 5.2.1 level-1 Illusion spell.
--
-- Core: creates a persistent visual-only illusion up to a 15-ft Cube
-- at a spot within range for concentration up to 10 minutes.
--
-- Two mechanics NOT encoded (see proposal-silent_image.md):
--   1. Magic action to move the illusion to another spot within range —
--      on_caster_spends_action trigger exists but there is no
--      `reposition_attachment` atom (same gap as Major Image /
--      Dancing Lights).
--   2. Investigation disbelief — "creature takes Study action →
--      Intelligence (Investigation) check vs spell save DC" — no
--      OngoingTrigger variant for a creature spending a specific action
--      to examine the illusion.

let silentImage =
      { kind = "spell"
      , id = "silent_image"
      , name = "Silent Image"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-R#Silent Image"
          }
      , description =
          "You create the image of an object, a creature, or some other visible phenomenon that is no larger than a 15-foot Cube. The image appears at a spot within range and lasts for the duration. The image is purely visual; it isn't accompanied by sound, smell, or other sensory effects. As a Magic action, you can cause the image to move to any spot within range. Physical interaction with the image reveals it to be an illusion, since things can pass through it. A creature that takes a Study action to examine the image can determine that it is an illusion with a successful Intelligence (Investigation) check against your spell save DC. If a creature discerns the illusion for what it is, the creature can see through the image."
      , mechanics =
          { family = "ongoing_effect"
          , level = 1
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = Some "a bit of fleece" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment =
              { kind = "area"
              , shape = { kind = "cube", sideFeet = 15 }
              , origin = { kind = "point_within_range" }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "create_illusion"
                    , maxSize = "huge"
                    , channels = [ "visual" ]
                    }
                }
              ]
          }
      }

in  silentImage
