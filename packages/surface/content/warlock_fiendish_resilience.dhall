let DamageChoice =
      { kind : Text
      , holeId : Text
      , label : Text
      , value : { kind : Text, label : Text, options : List Text }
      }

let fiendishResistanceDamageType : DamageChoice =
      { kind = "hole"
      , holeId = "warlock_fiendish_resilience_damage_type"
      , label = "Fiendish Resilience damage type"
      , value =
          { kind = "choice"
          , label = "Fiendish Resilience damage type"
          , options =
              [ "acid"
              , "bludgeoning"
              , "cold"
              , "fire"
              , "lightning"
              , "necrotic"
              , "piercing"
              , "poison"
              , "psychic"
              , "radiant"
              , "slashing"
              , "thunder"
              ]
          }
      }

let fiendishResilience =
      { kind = "class_feature"
      , id = "warlock_fiendish_resilience"
      , name = "Fiendish Resilience"
      , className = "warlock"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Warlock.md:483-485" }
      , description =
          "Choose one damage type, other than Force, whenever you finish a Short or Long Rest. You have Resistance to that damage type until you choose a different one with this feature."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_resistance"
                , damageType = fiendishResistanceDamageType
                }
              ]
          }
      }

in  fiendishResilience
