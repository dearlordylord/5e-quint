-- Hypnotic Pattern — SRD 5.2.1 Spell, level 3, Illusion.
--
-- RAW (Spells / Descriptions E-L / Hypnotic Pattern):
--   "You create a twisting pattern of colors in a 30-foot Cube within
--    range. The pattern appears for a moment and vanishes. Each
--    creature in the area who can see the pattern must succeed on a
--    Wisdom saving throw or have the Charmed condition for the
--    duration. While Charmed, the creature has the Incapacitated
--    condition and a Speed of 0."
--   "The spell ends for an affected creature if it takes any damage
--    or if someone else uses an action to shake the creature out of
--    its stupor."
--
-- Consolidated validation reference for:
--   • EffectAtom.composite (new widening — bundles several effects
--     into a single slot so save_gate.onFail can apply Charmed AND
--     Incapacitated AND Speed 0 without widening onFail to an array).
--   • DurationEndTrigger.target_takes_damage (closed enum addition —
--     separate from target_deals_damage; this is "damage received"
--     from any source).
--
-- Table/presentation witnesses:
--   Cube membership, Total Cover, point-of-origin inclusion, and whether a
--   creature can see the momentary area effect are supplied by the caller/table.
--   The spell Surface still carries the sight predicate and the target-specific
--   action-spend escape as typed facts so runtime admission never recovers them
--   from prose or spell identity.

let hypnoticPattern =
      { kind = "spell"
      , id = "hypnotic_pattern"
      , name = "Hypnotic Pattern"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Hypnotic Pattern"
          }
      , description =
          "You create a twisting pattern of colors in a 30-foot Cube within range. The pattern appears for a moment and vanishes. Each creature in the area who can see the pattern must succeed on a Wisdom saving throw or have the Charmed condition for the duration. While Charmed, the creature has the Incapacitated condition and a Speed of 0. The spell ends for an affected creature if it takes any damage or if someone else uses an action to shake the creature out of its stupor."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components =
              { v = False
              , s = True
              , m = Some "a pinch of confetti"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              , earlyEnd = [ { kind = "target_takes_damage" } ]
              }
          , phases =
              let HypnoticPatternEffect
                    : Type
                      = { kind : Text
                      , condition : Optional Text
                      , feet : Optional Natural
                      , actor : Optional Text
                      , cost : Optional Text
                      , method : Optional Text
                      , outcome : Optional Text
                      }
              let charmed
                    : HypnoticPatternEffect
                    = { kind = "apply_condition"
                      , condition = Some "charmed"
                      , feet = None Natural
                      , actor = None Text
                      , cost = None Text
                      , method = None Text
                      , outcome = None Text
                      }
              let incapacitated
                    : HypnoticPatternEffect
                    = { kind = "apply_condition"
                      , condition = Some "incapacitated"
                      , feet = None Natural
                      , actor = None Text
                      , cost = None Text
                      , method = None Text
                      , outcome = None Text
                      }
              let speedZero
                    : HypnoticPatternEffect
                    = { kind = "set_speed"
                      , condition = None Text
                      , feet = Some 0
                      , actor = None Text
                      , cost = None Text
                      , method = None Text
                      , outcome = None Text
                      }
              let shakeAwake
                    : HypnoticPatternEffect
                    = { kind = "target_effect_escape_action"
                      , condition = None Text
                      , feet = None Natural
                      , actor = Some "another_creature"
                      , cost = Some "action"
                      , method = Some "shake_awake"
                      , outcome = Some "end_current_effect"
                      }
              in  [ { kind = "save_gate"
                    , attachment =
                        { kind = "hole"
                        , holeId = "hypnotic_pattern_point"
                        , label = "spell origin point"
                        , value =
                            { kind = "area"
                            , shape = { kind = "cube", sideFeet = 30 }
                            , origin = { kind = "point_within_range" }
                            , occupantPerceptionFilter =
                                "can_see_area_effect"
                            }
                        }
                    , ability = "wis"
                    , dc = { kind = "caster_spell_save_dc" }
                    , onFail =
                        { kind = "composite"
                        , effects =
                            [ charmed, incapacitated, speedZero, shakeAwake ]
                        }
                    , onSuccess = { kind = "none" }
                    }
                  ]
          }
      }

in  hypnoticPattern
