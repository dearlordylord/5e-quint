-- Prayer of Healing — SRD 5.2.1 Spell, level 2, Abjuration.
--
-- RAW (Spells / Descriptions M-P / Prayer of Healing):
--   "Up to five creatures of your choice who remain within range for
--    the spell's entire casting gain the benefits of a Short Rest and
--    also regain 2d8 Hit Points. A creature can't be affected by this
--    spell again until that creature finishes a Long Rest."
--   "Using a Higher-Level Spell Slot. The healing increases by 1d8
--    for each spell slot level above 2."
--
-- Casting Time: 10 minutes. Range: 30 ft. Duration: Instantaneous.
-- Components: V.
--
-- PARTIAL VALIDATION REFERENCE. Encodes the SRD 5.2.1 spell shell and
-- fixed healing dice that fit the existing surface:
--   • CastingTime.minutes with amount=10, ritual=False (second
--     instance after Alarm — confirms the 10-minute-cast shape
--     generalizes to non-ritual spells).
--   • TargetSelection.choose_up_to with fixed numeric count 5 (no
--     SlotScaling — the cap doesn't widen per slot; the per-target
--     heal does). Validation reference for TargetSelection.count's
--     `number | SlotScaling<number>` union (fixed-count branch).
--   • heal_hp with linear_per_level DiceAmount (2d8, +1d8 per slot
--     above 2; no spellcasting ability modifier in SRD 5.2.1).
--
-- DEFERRED / omitted. This Surface schema has no lossless spell effect
-- atom for granting Short Rest benefits, nor a per-recipient "can't be
-- affected again until Long Rest" lockout. "Who remain within range for
-- the spell's entire casting" is spatial/session-owned positioning.

let prayerOfHealing =
      { kind = "spell"
      , id = "prayer_of_healing"
      , name = "Prayer of Healing"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Prayer of Healing"
          }
      , description =
          "Up to five creatures of your choice who remain within range for the spell's entire casting gain the benefits of a Short Rest and also regain 2d8 Hit Points. A creature can't be affected by this spell again until that creature finishes a Long Rest. Using a Higher-Level Spell Slot. The healing increases by 1d8 for each spell slot level above 2."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "abjuration"
          , castingTime =
              { kind = "minutes"
              , amount = 10
              , ritual = False
              }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = False, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "prayer_of_healing_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count = 5
                            }
                        }
                    }
                , effects =
                    [ { kind = "heal_hp"
                      , amount =
                          { kind = "linear_per_level"
                          , axis = "slot"
                          , base =
                              { dice = 2
                              , dieSize = 8
                              }
                          , perLevel = { dice = 1 }
                          , startingAtLevel = 2
                          }
                      , target = "target_creature"
                      }
                    ]
                }
              ]
          }
      }

in  prayerOfHealing
