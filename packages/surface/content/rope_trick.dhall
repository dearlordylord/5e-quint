-- Rope Trick - SRD 5.2.1 Spell, level 2, Transmutation.
--
-- RAW (Spells/Descriptions-Q-R#Rope Trick):
--   "You touch a rope. One end of it hovers upward until the rope hangs
--    perpendicular to the ground or the rope reaches a ceiling."
--   "At the rope's upper end, an Invisible 3-foot-by-5-foot portal opens
--    to an extradimensional space that lasts until the spell ends."
--   "The space can hold up to eight Medium or smaller creatures."
--   "Attacks, spells, and other effects can't pass into or out of the space,
--    but creatures inside it can see through the portal."
--   "Anything inside the space drops out when the spell ends."
--
-- The Surface record preserves the spell-created extradimensional refuge.
-- The Unit claim closes runtime support because rope/object attachment,
-- portal occupancy, entry/exit climbing, boundary blocking, one-way sight,
-- and drop-out placement are table/spatial/presentation facts outside the
-- promoted battle runtime.

let ropeTrickSpace =
      { kind = "create_extradimensional_space"
      , anchor =
          { kind = "touched_rope"
          , topEndMotion = "hovers_until_perpendicular_or_ceiling"
          }
      , entry =
          { visibility = "invisible"
          , widthFeet = 3
          , heightFeet = 5
          , location = "anchor_upper_end"
          }
      , access =
          { kind = "climb_anchor"
          , anchorMovement = "can_be_pulled_into_or_dropped_out"
          }
      , capacity =
          { creatureCount = 8
          , maxCreatureSize = "medium"
          }
      , boundary =
          { attacksSpellsAndEffects = "blocked_bidirectionally"
          , occupantPerception = "can_see_out_through_portal"
          }
      , onEnd = { kind = "drop_contents_out" }
      }

let ropeTrick =
      { kind = "spell"
      , id = "rope_trick"
      , name = "Rope Trick"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-Q-R#Rope Trick"
          }
      , description =
          "You touch a rope. One end of it hovers upward until the rope hangs perpendicular to the ground or the rope reaches a ceiling. At the rope's upper end, an Invisible 3-foot-by-5-foot portal opens to an extradimensional space that lasts until the spell ends. That space can be reached by climbing the rope, which can be pulled into or dropped out of it. The space can hold up to eight Medium or smaller creatures. Attacks, spells, and other effects can't pass into or out of the space, but creatures inside it can see through the portal. Anything inside the space drops out when the spell ends."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "a segment of rope"
              }
          , duration =
              { kind = "timed"
              , value = { amount = 1, unit = "hour" }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "rope_trick_rope"
                    , label = "touched rope"
                    , value = { kind = "object", count = 1 }
                    }
                , effects = [ ropeTrickSpace ]
                }
              ]
          }
      }

in  ropeTrick
