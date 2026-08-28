let T = ./_stat_block_types.dhall

in  { challengeRating = 0.5
    , id = "stat_block_dust_mephit"
    , kind = "statBlock"
    , name = "Dust Mephit"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:239-271" }
    , statBlock =
      { abilityScores =
        { str = 5, dex = 14, con = 10, int = 9, wis = 11, cha = 10 }
      , ac.value = { kind = "literal", value = 12 }
      , actions =
        [ T.executable
            { procedureOrdinal = 1
            , procedure =
                T.meleeAttack
                  { name = "Claw"
                  , attackAbility = "dex"
                  , attackBonus = +4
                  , reachFeet = 5
                  , onHit =
                    { first =
                        T.damage
                          { damageType = "slashing"
                          , dice = 1
                          , dieSize = 4
                          , flat = Some +2
                          , static = 4
                          }
                    , rest = [] : List T.Effect
                    }
                  }
            }
        , T.resourceTextOnly
            { procedureOrdinal = 2
            , name = "Blinding Breath (Recharge 6)"
            , description =
                "Dexterity Saving Throw: DC 10, each creature in a 15-foot Cone. Failure: The target has the Blinded condition until the end of the mephit's next turn."
            , reason = "unsupported_action_shape"
            , resourceOrdinals = { first = 1, rest = [] : List Natural }
            }
        , T.executable
            { procedureOrdinal = 3
            , procedure =
                T.spellcasting
                  { name = "Sleep (1/Day)"
                  , ability = "cha"
                  , spellSaveDc = Some { kind = "fixed", dc = 10 }
                  , spellAttackBonus = None { kind : Text, value : Integer }
                  , components = T.noComponents
                  , groups =
                    { first =
                        T.limited
                          { resourceOrdinals =
                            { first = 2, rest = [] : List Natural }
                          , spells =
                            { first =
                                T.spellRef
                                  { spellId = "sleep"
                                  , count = None Natural
                                  , castAtLevel = None Natural
                                  , restriction = None Text
                                  }
                            , rest = [] : List T.SpellRef
                            }
                          }
                    , rest = [] : List T.Group
                    }
                  }
            }
        ]
      , traits =
        [ T.trait
            { name = "Death Burst"
            , description =
                "The mephit explodes when it dies. Dexterity Saving Throw: DC 10, each creature in a 5-foot Emanation originating from the mephit. Failure: 5 (2d4) Bludgeoning damage. Success: Half damage."
            , effectKind = None Text
            }
        ]
      , alignment = { order = "neutral", morality = "evil" }
      , communication =
        { kind = "spoken_and_understood"
        , languages =
          { kind = "named", languages = [ "Primordial (Auran, Terran)" ] }
        }
      , creatureType = "elemental"
      , hp = { kind = "literal", value = 17 }
      , initiative = { modifier = +2, score = 12 }
      , passivePerception = 12
      , savingThrowModifiers =
        [ { ability = "cha", modifier = +0 }
        , { ability = "con", modifier = +0 }
        , { ability = "dex", modifier = +2 }
        , { ability = "int", modifier = -1 }
        , { ability = "str", modifier = -3 }
        , { ability = "wis", modifier = +0 }
        ]
      , skillModifiers =
        [ { skill = "perception", modifier = +2 }
        , { skill = "stealth", modifier = +4 }
        ]
      , vulnerabilities = { kind = "fixed", damageTypes = [ "fire" ] }
      , immunities =
        { conditions = Some [ "exhaustion", "poisoned" ]
        , damageTypes = Some [ "poison" ]
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
        , T.resource
            { ordinal = 2, ownership = "shared", limit = T.daily { uses = 1 } }
        ]
      }
    }
