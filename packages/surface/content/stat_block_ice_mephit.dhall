let T = ./_stat_block_types.dhall

in  { challengeRating = 0.5
    , id = "stat_block_ice_mephit"
    , kind = "statBlock"
    , name = "Ice Mephit"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:275-305" }
    , statBlock =
      { abilityScores =
        { str = 7, dex = 13, con = 10, int = 9, wis = 11, cha = 12 }
      , ac.value = { kind = "literal", value = 11 }
      , actions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Claw"
            , description =
                "Melee Attack Roll: +3, reach 5 ft. Hit: 3 (1d4 + 1) Slashing damage plus 2 (1d4) Cold damage."
            , reason = "unsupported_action_shape"
            }
        , T.executable
            { procedureOrdinal = 2
            , procedure =
                T.spellcasting
                  { name = "Fog Cloud (1/Day)"
                  , ability = "cha"
                  , spellSaveDc = None { kind : Text, dc : Natural }
                  , spellAttackBonus = None { kind : Text, value : Integer }
                  , components = T.noComponents
                  , groups =
                    { first =
                        T.limited
                          { resourceOrdinals =
                            { first = 1, rest = [] : List Natural }
                          , spells =
                            { first =
                                T.spellRef
                                  { spellId = "fog_cloud"
                                  , count = None Natural
                                  , castAtLevel = None Natural

                                  }
                            , rest = [] : List T.SpellRef
                            }
                          }
                    , rest = [] : List T.Group
                    }
                  }
            }
        , T.resourceExecutable
            { procedureOrdinal = 3
            , procedure =
                T.NonSpellProcedure.saveArea
                  { name = "Frost Breath (Recharge 6)"
                  , ability = "con"
                  , dc = 10
                  , area = T.cone { lengthFeet = 15 }
                  , onFail =
                      T.damage
                        { damageType = "cold"
                        , dice = 3
                        , dieSize = 4
                        , flat = None Integer
                        , static = 7
                        }
                  , onSuccess.kind = "half_damage"
                  }
            , resourceOrdinals = { first = 2, rest = [] : List Natural }
            }
        ]
      , traits =
        [ T.trait
            { name = "Death Burst"
            , description =
                "The mephit explodes when it dies. Constitution Saving Throw: DC 10, each creature in a 5-foot Emanation originating from the mephit. Failure: 5 (2d4) Cold damage. Success: Half damage."
            , effectKind = None Text
            }
        ]
      , alignment = { order = "neutral", morality = "evil" }
      , communication =
        { kind = "spoken_and_understood"
        , languages =
          { kind = "named", languages = [ "Primordial (Aquan, Auran)" ] }
        }
      , creatureType = "elemental"
      , hp = { kind = "literal", value = 21 }
      , initiative = { modifier = +1, score = 11 }
      , passivePerception = 12
      , skillModifiers =
        [ { skill = "perception", modifier = +2 }
        , { skill = "stealth", modifier = +3 }
        ]
      , vulnerabilities = { kind = "fixed", damageTypes = [ "fire" ] }
      , immunities =
        { conditions = Some [ "exhaustion", "poisoned" ]
        , damageTypes = Some [ "cold", "poison" ]
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
            { ordinal = 1, ownership = "shared", limit = T.daily { uses = 1 } }
        , T.resource
            { ordinal = 2
            , ownership = "shared"
            , limit = T.recharge { minimumRoll = 6 }
            }
        ]
      }
    }
