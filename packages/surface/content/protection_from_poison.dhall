-- Protection from Poison — SRD 5.2.1 Spell, level 2, Abjuration.
--
-- RAW (Spells / Descriptions M-P / Protection from Poison):
--   "You touch a creature and end the Poisoned condition on it. For
--    the duration, the target has Advantage on saving throws to
--    avoid or end the Poisoned condition, and it has Resistance to
--    Poison damage."
--
-- Consolidated validation reference for:
--   • Composite effect bundling remove_condition (cast-time),
--     condition-scoped modify_roll_advantage (ongoing), and
--     grant_resistance (ongoing). Uses the composite EffectAtom
--     landed for Hypnotic Pattern.

let protectionFromPoison =
      { kind = "spell"
      , id = "protection_from_poison"
      , name = "Protection from Poison"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Protection from Poison"
          }
      , description =
          "You touch a creature and end the Poisoned condition on it. For the duration, the target has Advantage on saving throws to avoid or end the Poisoned condition, and it has Resistance to Poison damage."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , phases =
              let CompEffect
                    : Type
                    = { kind : Text
                      , condition : Optional Text
                      , damageType : Optional Text
                      , mode : Optional Text
                      , on : Optional (List Text)
                      , conditionFilter : Optional (List Text)
                      }
              let cleanse
                    : CompEffect
                    = { kind = "remove_condition"
                      , condition = Some "poisoned"
                      , damageType = None Text
                      , mode = None Text
                      , on = None (List Text)
                      , conditionFilter = None (List Text)
                      }
              let saveAdvantage
                    : CompEffect
                    = { kind = "modify_roll_advantage"
                      , condition = None Text
                      , damageType = None Text
                      , mode = Some "advantage"
                      , on = Some [ "saving_throw" ]
                      , conditionFilter = Some [ "poisoned" ]
                      }
              let resist
                    : CompEffect
                    = { kind = "grant_resistance"
                      , condition = None Text
                      , damageType = Some "poison"
                      , mode = None Text
                      , on = None (List Text)
                      , conditionFilter = None (List Text)
                      }
              in  [ { kind = "direct"
                    , attachment =
                        { kind = "hole"
                        , holeId = "protection_from_poison_target"
                        , label = "target"
                        , value =
                            { kind = "target"
                            , selection = { mode = "one" }
                            }
                        }
                    , effects =
                        [ { kind = "composite"
                          , effects = [ cleanse, saveAdvantage, resist ]
                          }
                        ]
                    }
                  ]
          }
      }

in  protectionFromPoison
