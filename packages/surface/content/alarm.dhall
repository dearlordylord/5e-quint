-- Alarm — SRD 5.2.1 Spell, Level 1, Abjuration.
-- Family: anchored_trigger (designed for this spell).
-- Plants a trigger on an anchor that fires when a creature touches or
-- enters the warded area; releases an audible or mental signal.
--
-- CAST-TIME CHOICE — anchor:
--   The spell allows "Choose a door, a window, OR an area within range
--   that is no larger than a 20-foot Cube." The surface field `anchor` is
--   singular (one AnchorTarget per record). Only the `area` variant
--   (maxSideFeet=20) is encoded here; the `location` (door_or_window)
--   option is not representable alongside it. This is the surface_widening:
--   the surface needs a way to express "pick one anchor type at cast time."
--
-- CAST-TIME CHOICE — signals:
--   The spell offers audible (handbell, 10 s, 60-ft radius) OR mental
--   (1-mile range, awakens if asleep). Both variants are included in the
--   `signals` array using Optional fields (Dhall homogeneous-array trick:
--   None T → field omitted in JSON, preserving TypeScript discriminated-
--   union compatibility). The `signals` array semantically represents the
--   menu of available cast-time choices, not simultaneous firing.

let alarm =
      { kind = "spell"
      , id = "alarm"
      , name = "Alarm"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Alarm"
          }
      , description =
          "You set an alarm against intrusion. Choose a door, a window, or an area within range that is no larger than a 20-foot Cube. Until the spell ends, an alarm alerts you whenever a creature touches or enters the warded area. When you cast the spell, you can designate creatures that won't set off the alarm. You also choose whether the alarm is audible or mental: Audible Alarm — the alarm produces the sound of a handbell for 10 seconds within 60 feet of the warded area. Mental Alarm — you are alerted by a mental ping if you are within 1 mile of the warded area. This ping awakens you if you're asleep."
      , mechanics =
          { family = "anchored_trigger"
          , level = 1
          , school = "abjuration"
          , castingTime =
              { kind = "minutes"
              , amount = 1
              , ritual = True
              }
          , range =
              { kind = "point"
              , feet = 30
              }
          , components = { v = True, s = True, m = Some "a bell and silver wire" }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 8 }
              }
          , anchor =
              { kind = "area"
              , shape = { kind = "cube", maxSideFeet = 20 }
              }
          , events =
              [ { kind = "physical_contact" }
              , { kind = "enters_area" }
              ]
          , filters =
              [ { kind = "creature_exemption_list"
                , chosenAtCast = True
                }
              ]
          , signals =
              [ { kind = "audible"
                , sound = Some "handbell"
                , durationSeconds = Some 10
                , audibleRadiusFeet = Some 60
                , rangeFeet = None Natural
                , awakensIfAsleep = None Bool
                }
              , { kind = "mental"
                , sound = None Text
                , durationSeconds = None Natural
                , audibleRadiusFeet = None Natural
                , rangeFeet = Some 5280
                , awakensIfAsleep = Some True
                }
              ]
          }
      }

in  alarm
