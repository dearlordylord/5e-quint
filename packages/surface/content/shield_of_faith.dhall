-- Shield of Faith — SRD 5.2.1 Spell, level 1, Abjuration.
--
-- RAW (Spells / Descriptions S-Z / Shield of Faith):
--   "A shimmering field surrounds a creature of your choice within
--    range, granting it a +2 bonus to AC for the duration."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Uses EffectAtom.modify_ac with
-- a fixed +2 delta (dice=2, dieSize=1, sign=+). Contrasts with Mage
-- Armor's modify_ac_set_base (AC formula replacement) and Barkskin's
-- modify_ac_set_floor (AC floor). Three AC-modifier shapes exercised
-- across three spells.

let shieldOfFaith =
      { kind = "spell"
      , id = "shield_of_faith"
      , name = "Shield of Faith"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Shield of Faith"
          }
      , description =
          "A shimmering field surrounds a creature of your choice within range, granting it a +2 bonus to AC for the duration."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "abjuration"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True
              , s = True
              , m = Some "a prayer scroll"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "shield_of_faith_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , effects =
                    [ { kind = "modify_ac"
                      , delta =
                          { kind = "fixed_dice"
                          , dice = 2
                          , dieSize = 1
                          , sign = "+"
                          }
                      }
                    ]
                }
              ]
          }
      }

in  shieldOfFaith
