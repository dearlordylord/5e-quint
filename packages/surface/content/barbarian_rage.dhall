-- Rage — SRD 5.2.1 Barbarian level 1.
-- Bonus Action: enter Rage, spending one use.
-- Active benefits: Bludgeoning/Piercing/Slashing Resistance, Strength weapon
-- or Unarmed Strike damage bonus,
-- Concentration break/prevention, and spellcasting restriction.
-- Duration: end of next turn, extended by attack roll against an enemy,
-- forcing an enemy Saving Throw, or Bonus Action, up to 10 minutes.
-- Level 15 Persistent Rage changes this to fixed 10 minutes and Unconscious-only condition end.

let Effect =
      { kind : Text
      , damageType : Optional Text
      , delta :
          Optional
            { kind : Text
            , axis : Text
            , base : Natural
            , tiers : List { atLevel : Natural, value : Natural }
            , sign : Text
            }
      , abilityFilter : Optional (List Text)
      }

let resistance = \(damageType : Text) ->
      { kind = "grant_resistance"
      , damageType = Some damageType
      , delta =
          None
            { kind : Text
            , axis : Text
            , base : Natural
            , tiers : List { atLevel : Natural, value : Natural }
            , sign : Text
            }
      , abilityFilter = None (List Text)
      } : Effect

let rageDamage =
      { kind = "modify_damage_numeric"
      , damageType = None Text
      , delta =
          Some
            { kind = "threshold_tiers"
            , axis = "class"
            , base = 2
            , tiers =
                [ { atLevel = 9, value = 3 }
                , { atLevel = 16, value = 4 }
                ]
            , sign = "+"
            }
      , abilityFilter = Some [ "str" ]
      } : Effect

let rage =
      { kind = "class_feature"
      , id = "barbarian_rage"
      , name = "Rage"
      , className = "barbarian"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Barbarian#Rage"
          }
      , description =
          "Enter a Rage as a Bonus Action, gaining Bludgeoning, Piercing, and Slashing Resistance and bonus damage for Strength weapon or Unarmed Strike attacks."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "bonus_action" }
          , resource =
              { kind = "use_count"
              , cap =
                  { kind = "threshold_tiers"
                  , axis = "class"
                  , base = 2
                  , tiers =
                      [ { atLevel = 3, value = 3 }
                      , { atLevel = 6, value = 4 }
                      , { atLevel = 12, value = 5 }
                      , { atLevel = 17, value = 6 }
                      ]
                  }
              }
          , resetCadence =
              { kind = "partial_short_full_long"
              , shortRestRefill = 1
              }
          , ongoingFeature =
              { activationTiming = "activation_cost"
              , lifecycle =
                  { kind = "round_extended"
                  , initialExpiration = "end_of_next_turn"
                  , earlyEndConditions = [ "incapacitated" ]
                  , earlyEndArmorCategories = [ "heavy" ]
                  , extensionTriggers =
                      [ "attack_roll_against_enemy"
                      , "bonus_action"
                      , "enemy_saving_throw"
                      ]
                  , maximumDuration = { unit = "minute", amount = 10 }
                  }
              , concentrationEffect = "break_and_prevent"
              , actionRestrictions = [ "spellcasting" ]
              , levelOverrides =
                  [ { atClassLevel = 15
                    , lifecycle =
                        { kind = "fixed_duration"
                        , duration = { unit = "minute", amount = 10 }
                        , earlyEndConditions = [ "unconscious" ]
                        , earlyEndArmorCategories = [ "heavy" ]
                        }
                    }
                  ]
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ resistance "bludgeoning"
                    , resistance "piercing"
                    , resistance "slashing"
                    , rageDamage
                    ]
                }
              ]
          }
      }

in  rage
