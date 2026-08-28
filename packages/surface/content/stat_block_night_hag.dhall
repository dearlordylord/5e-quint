let T = ./_stat_block_types.dhall

in  { challengeRating = 5
    , id = "stat_block_night_hag"
    , kind = "statBlock"
    , name = "Night Hag"
    , provenance =
      { kind = "srd-5.2.1", section = "Monsters/Monsters-M-O.md:636-685" }
    , statBlock =
      { abilityScores =
        { str = 18, dex = 15, con = 16, int = 16, wis = 14, cha = 16 }
      , ac.value = { kind = "literal", value = 17 }
      , actions =
        [ T.executable
            { procedureOrdinal = 1
            , procedure =
                T.multiattack
                  { name = "Multiattack"
                  , dispatches =
                    { first =
                      { procedureOrdinal = 2
                      , count = { kind = "literal", value = +2 }
                      }
                    , rest = [] : List T.Dispatch
                    }
                  }
            }
        , T.executable
            { procedureOrdinal = 2
            , procedure =
                T.meleeAttack
                  { name = "Claw"
                  , attackAbility = "str"
                  , attackBonus = +7
                  , reachFeet = 5
                  , onHit =
                    { first =
                        T.damage
                          { damageType = "slashing"
                          , dice = 2
                          , dieSize = 8
                          , flat = Some +4
                          , static = 13
                          }
                    , rest = [] : List T.Effect
                    }
                  }
            }
        , T.resourceTextOnly
            { procedureOrdinal = 3
            , name = "Nightmare Haunting (1/Day; Requires Soul Bag)"
            , description =
                "While on the Ethereal Plane, the hag casts Dream, using the same spellcasting ability as Spellcasting. Only the hag can serve as the spell's messenger, and the target must be a creature the hag can see on the Material Plane. The spell fails and is wasted if the target is under the effect of the Protection from Evil and Good spell or within a Magic Circle spell. If the target takes damage from the Dream spell, the target's Hit Point maximum decreases by an amount equal to that damage. If the spell kills the target, its soul is trapped in the hag's soul bag, and the target can't be raised from the dead until its soul is released."
            , reason = "unsupported_action_shape"
            , resourceOrdinals = { first = 1, rest = [] : List Natural }
            }
        , T.executable
            { procedureOrdinal = 4
            , procedure =
                T.spellcasting
                  { name = "Spellcasting"
                  , ability = "int"
                  , spellSaveDc = Some { kind = "fixed", dc = 14 }
                  , spellAttackBonus = None { kind : Text, value : Integer }
                  , components = Some { v = True, s = True, m = False }
                  , groups =
                    { first =
                        T.atWill
                          { spells =
                            { first =
                                T.spellRef
                                  { spellId = "detect_magic"
                                  , count = None Natural
                                  , castAtLevel = None Natural
                                  , restriction = None Text
                                  }
                            , rest =
                                  [ T.spellRef
                                      { spellId = "etherealness"
                                      , count = None Natural
                                      , castAtLevel = None Natural
                                      , restriction = None Text
                                      }
                                  , T.spellRef
                                      { spellId = "magic_missile"
                                      , count = None Natural
                                      , castAtLevel = Some 4
                                      , restriction = None Text
                                      }
                                  ]
                                : List T.SpellRef
                            }
                          }
                    , rest =
                          [ T.limited
                              { resourceOrdinals =
                                { first = 2, rest = [] : List Natural }
                              , spells =
                                { first =
                                    T.spellRef
                                      { spellId = "phantasmal_killer"
                                      , count = None Natural
                                      , castAtLevel = None Natural
                                      , restriction = None Text
                                      }
                                , rest =
                                      [ T.spellRef
                                          { spellId = "plane_shift"
                                          , count = None Natural
                                          , castAtLevel = None Natural
                                          , restriction = Some "self only"
                                          }
                                      ]
                                    : List T.SpellRef
                                }
                              }
                          ]
                        : List T.Group
                    }
                  }
            }
        ]
      , bonusActions =
        [ T.textOnly
            { procedureOrdinal = 1
            , name = "Shape-Shift"
            , description =
                "The hag shape-shifts into a Small or Medium Humanoid, or it returns to its true form. Other than its size, its game statistics are the same in each form. Any equipment it is wearing or carrying isn't transformed."
            , reason = "unsupported_action_shape"
            }
        ]
      , traits =
        [ T.trait
            { name = "Coven Magic"
            , description =
                "While within 30 feet of at least two hag allies, the hag can cast one of the following spells, requiring no Material components, using the spell's normal casting time, and using Intelligence as the spellcasting ability (spell save DC 14): Augury, Find Familiar, Identify, Locate Object, Scrying, or Unseen Servant. The hag must finish a Long Rest before using this trait to cast that spell again."
            , effectKind = None Text
            }
        , T.trait
            { name = "Magic Resistance"
            , description =
                "The hag has Advantage on saving throws against spells and other magical effects."
            , effectKind = None Text
            }
        , T.trait
            { name = "Soul Bag"
            , description =
                "The hag has a soul bag. While holding or carrying the bag, the hag can use its Nightmare Haunting action. The bag has AC 15, HP 20, and Resistance to all damage. The bag turns to dust if reduced to 0 Hit Points. If the bag is destroyed, any souls the bag is holding are released. The hag can create a new bag after 7 days."
            , effectKind = None Text
            }
        ]
      , alignment = { order = "neutral", morality = "evil" }
      , communication =
        { kind = "spoken_and_understood"
        , languages =
          { kind = "named"
          , languages = [ "Abyssal", "Common", "Infernal", "Primordial" ]
          }
        }
      , creatureType = "fiend"
      , hp = { kind = "literal", value = 112 }
      , initiative = { modifier = +5, score = 15 }
      , passivePerception = 15
      , savingThrowModifiers =
        [ { ability = "cha", modifier = +3 }
        , { ability = "con", modifier = +3 }
        , { ability = "dex", modifier = +2 }
        , { ability = "int", modifier = +3 }
        , { ability = "str", modifier = +4 }
        , { ability = "wis", modifier = +2 }
        ]
      , skillModifiers =
        [ { skill = "deception", modifier = +5 }
        , { skill = "insight", modifier = +5 }
        , { skill = "perception", modifier = +5 }
        , { skill = "stealth", modifier = +5 }
        ]
      , resistances = { kind = "fixed", damageTypes = [ "cold", "fire" ] }
      , immunities =
        { conditions = Some [ "charmed" ], damageTypes = None (List Text) }
      , senses =
        [ { kind = "darkvision", rangeFeet = 120, qualifier = None Text } ]
      , size = "medium"
      , speeds =
        [ { kind = "walk"
          , feet = { kind = "literal", value = 30 }
          , hover = None Bool
          }
        ]
      , resources =
        [ T.resource
            { ordinal = 1, ownership = "shared", limit = T.daily { uses = 1 } }
        , T.resource
            { ordinal = 2, ownership = "each", limit = T.daily { uses = 2 } }
        ]
      }
    }
