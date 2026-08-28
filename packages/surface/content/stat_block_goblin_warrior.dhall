let T = ./_stat_block_types.dhall

in  { challengeRating = 0.25
    , id = "stat_block_goblin_warrior"
    , kind = "statBlock"
    , name = "Goblin Warrior"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-E-G.md:721-748" }
    , statBlock =
      { abilityScores =
        { cha = 8, con = 10, dex = 15, int = 10, str = 8, wis = 8 }
      , ac.value = { kind = "literal", value = 15 }
      , actions =
        [ T.executable
            { procedureOrdinal = 1
            , procedure =
                T.meleeAttack
                  { name = "Scimitar"
                  , attackAbility = "dex"
                  , attackBonus = +4
                  , reachFeet = 5
                  , onHit =
                    { first =
                        T.damage
                          { damageType = "slashing"
                          , dice = 1
                          , dieSize = 6
                          , flat = Some +2
                          , static = 5
                          }
                    , rest =
                          [ T.advantageDamage
                              { damageType = "slashing"
                              , dice = 1
                              , dieSize = 4
                              , flat = None Integer
                              , static = 2
                              }
                          ]
                        : List T.Effect
                    }
                  }
            }
        , T.executable
            { procedureOrdinal = 2
            , procedure =
                T.rangedAttack
                  { name = "Shortbow"
                  , attackAbility = "dex"
                  , attackBonus = +4
                  , rangeFeet = { normal = 80, long = 320 }
                  , ammunition = Some "arrow"
                  , onHit =
                    { first =
                        T.damage
                          { damageType = "piercing"
                          , dice = 1
                          , dieSize = 6
                          , flat = Some +2
                          , static = 5
                          }
                    , rest =
                          [ T.advantageDamage
                              { damageType = "piercing"
                              , dice = 1
                              , dieSize = 4
                              , flat = None Integer
                              , static = 2
                              }
                          ]
                        : List T.Effect
                    }
                  }
            }
        ]
      , alignment = { morality = "neutral", order = "chaotic" }
      , bonusActions =
        [ T.executable
            { procedureOrdinal = 1
            , procedure =
                T.actionOption
                  { name = "Nimble Escape"
                  , options = { first = "disengage", rest = [ "hide" ] }
                  }
            }
        ]
      , communication =
        { kind = "spoken_and_understood"
        , languages = { kind = "named", languages = [ "Common", "Goblin" ] }
        }
      , creatureType = "fey"
      , creatureTypeTags = [ "goblinoid" ]
      , gear =
        [ { item = "Leather Armor" }
        , { item = "Scimitar" }
        , { item = "Shield" }
        , { item = "Shortbow" }
        ]
      , hp = { kind = "literal", value = 10 }
      , initiative = { modifier = 2, score = 12 }
      , passivePerception = 9
      , savingThrowModifiers = [ { ability = "dex", modifier = 2 } ]
      , senses = [ { kind = "darkvision", rangeFeet = 60 } ]
      , size = "small"
      , skillModifiers = [ { modifier = 6, skill = "stealth" } ]
      , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
      }
    }
