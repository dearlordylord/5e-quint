-- Aid — SRD 5.2.1 Spell, level 2, Abjuration.
--
-- RAW (Spells / Descriptions A-D / Aid):
--   "Choose up to three creatures within range. Each target's Hit
--    Point maximum and current Hit Points increase by 5 for the
--    duration."
--   "Using a Higher-Level Spell Slot. Each target's Hit Points
--    increase by 5 for each spell slot level above 2."
--
-- Consolidated validation reference for:
--   • EffectAtom.modify_max_hp { delta: DiceAmount } (new widening —
--     increases max HP and also heals current HP by the same amount.
--     Distinct from grant_temp_hp, heal_hp, modify_ac.)
--   • TargetSelection.choose_up_to.count as a bare `number` (fixed
--     count with no upcast on count — Aid's 3 targets are fixed; the
--     upcast scales the HP bonus per target, not the target count).
--
-- SRD header Duration = 8 hours; modeled as Duration.timed with
-- appropriate DurationValue. The +5 per slot above 2 is a
-- linear_per_level DiceAmount on the modify_max_hp delta.

let aid =
      { kind = "spell"
      , id = "aid"
      , name = "Aid"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Aid"
          }
      , description =
          "Choose up to three creatures within range. Each target's Hit Point maximum and current Hit Points increase by 5 for the duration. Using a Higher-Level Spell Slot. Each target's Hit Points increase by 5 for each spell slot level above 2."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components =
              { v = True
              , s = True
              , m = Some "a strip of white cloth"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 8 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "target"
                    , selection =
                        { mode = "choose_up_to"
                        , count = 3
                        }
                    }
                , effects =
                    [ { kind = "modify_max_hp"
                      , direction = "increase"
                      , delta =
                          { kind = "linear_per_level"
                          , axis = "slot"
                          , base = { dice = 0, dieSize = 1, flat = 5 }
                          , perLevel = { flat = 5 }
                          , startingAtLevel = 2
                          }
                      }
                    ]
                }
              ]
          }
      }

in  aid
