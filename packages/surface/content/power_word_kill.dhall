-- Power Word Kill — SRD 5.2.1 Spell, level 9, Enchantment.
--
-- RAW (Spells/Descriptions-M-P#Power Word Kill):
--   "If the target has 100 Hit Points or fewer, it dies. Otherwise,
--    it takes 12d12 Psychic damage."

let psychicDamage =
      { kind = "damage"
      , damageType = "psychic"
      , amount =
          { kind = "fixed"
          , expr = { dice = 12, dieSize = 12 }
          }
      }

let powerWordKill =
      { kind = "spell"
      , id = "power_word_kill"
      , name = "Power Word Kill"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Power Word Kill"
          }
      , description =
          "You compel one creature you can see within range to die. If the target has 100 Hit Points or fewer, it dies. Otherwise, it takes 12d12 Psychic damage."
      , mechanics =
          { family = "activation"
          , level = 9
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = False, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "power_word_kill_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , effects =
                    [ { kind = "conditional_by_current_hp"
                      , threshold = 100
                      , comparison = "lte"
                      , onMatch = { kind = "kill_target" }
                      , otherwise = psychicDamage
                      }
                    ]
                }
              ]
          }
      }

in  powerWordKill
