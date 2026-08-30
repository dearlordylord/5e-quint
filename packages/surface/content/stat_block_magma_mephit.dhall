let T = ./_stat_block_types.dhall

in  { challengeRating = 0.5
    , id = "stat_block_magma_mephit"
    , kind = "statBlock"
    , name = "Magma Mephit"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:309-337" }
    , statBlock =
      { abilityScores =
        { str = 8, dex = 12, con = 12, int = 7, wis = 10, cha = 10 }
      , ac.value = { kind = "literal", value = 11 }
      , actions =
        [ T.executable
            { procedureOrdinal = 1
            , procedure =
                T.meleeAttack
                  { name = "Claw"
                  , attackAbility = "dex"
                  , attackBonus = +3
                  , reachFeet = 5
                  , onHit =
                    { first =
                        T.damage
                          { damageType = "slashing"
                          , dice = 1
                          , dieSize = 4
                          , flat = Some +1
                          , static = 3
                          }
                    , rest =
                          [ T.damage
                              { damageType = "fire"
                              , dice = 1
                              , dieSize = 6
                              , flat = None Integer
                              , static = 3
                              }
                          ]
                        : List T.Effect
                    }
                  }
            }
        , T.resourceExecutable
            { procedureOrdinal = 2
            , procedure =
                T.NonSpellProcedure.saveArea
                  { name = "Fire Breath (Recharge 6)"
                  , ability = "dex"
                  , dc = 11
                  , area = T.cone { lengthFeet = 15 }
                  , onFail =
                      T.damage
                        { damageType = "fire"
                        , dice = 2
                        , dieSize = 6
                        , flat = None Integer
                        , static = 7
                        }
                  , onSuccess.kind = "half_damage"
                  }
            , resourceOrdinals = { first = 1, rest = [] : List Natural }
            }
        ]
      , traits =
        [ T.trait
            { name = "Death Burst"
            , description =
                "The mephit explodes when it dies. Dexterity Saving Throw: DC 11, each creature in a 5-foot Emanation originating from the mephit. Failure: 7 (2d6) Fire damage. Success: Half damage."
            , effectKind = None Text
            }
        ]
      , alignment = { order = "neutral", morality = "evil" }
      , communication =
        { kind = "spoken_and_understood"
        , languages =
          { kind = "named", languages = [ "Primordial (Ignan, Terran)" ] }
        }
      , creatureType = "elemental"
      , hp = { kind = "literal", value = 18 }
      , initiative = { modifier = +1, score = 11 }
      , passivePerception = 10
      , skillModifiers = [ { skill = "stealth", modifier = +3 } ]
      , vulnerabilities = { kind = "fixed", damageTypes = [ "cold" ] }
      , immunities =
        { conditions = Some [ "exhaustion", "poisoned" ]
        , damageTypes = Some [ "fire", "poison" ]
        }
      , senses =
        [ { kind = "darkvision", rangeFeet = 60, qualifier = None Text } ]
      , size = "small"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 30 }
          , hover = None Bool
          }
        , { kind = "fly"
          , feet = { kind = "literal", value = 30 }
          , hover = None Bool
          }
        ]
      , resources =
        [ T.resource
            { ordinal = 1
            , ownership = "shared"
            , limit = T.recharge { minimumRoll = 6 }
            }
        ]
      }
    }
