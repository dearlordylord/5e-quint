{ challengeRating = 5
, id = "stat_block_night_hag"
, kind = "statBlock"
, name = "Night Hag"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:12158-12252" }
, statBlock =
  { abilityScores =
    { cha = 16, con = 16, dex = 15, int = 16, str = 18, wis = 14 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = None Text
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = None { m : Bool, s : Bool, v : Bool }
        , dispatches = Some
          [ { count = { kind = "literal", value = 2 }, procedureOrdinal = 2 } ]
        , groups =
            None
              ( List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells :
                      List
                        { castAtLevel : Optional Natural
                        , restriction :
                            Optional
                              { authoredExpression : Text
                              , deltas : List { kind : Text, target : Text }
                              }
                        , spellId : Text
                        }
                  }
              )
        , kind = "multiattack"
        , name = "Multiattack"
        , onHit =
            None
              ( List
                  { amount :
                      { expr :
                          { dice : Natural, dieSize : Natural, flat : Natural }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
              )
        , reachFeet = None Natural
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 1
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = None Text
        , attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 7 }
        , attackType = Some "melee"
        , components = None { m : Bool, s : Bool, v : Bool }
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , groups =
            None
              ( List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells :
                      List
                        { castAtLevel : Optional Natural
                        , restriction :
                            Optional
                              { authoredExpression : Text
                              , deltas : List { kind : Text, target : Text }
                              }
                        , spellId : Text
                        }
                  }
              )
        , kind = "attack_roll"
        , name = "Claw"
        , onHit = Some
          [ { amount =
              { expr = { dice = 2, dieSize = 8, flat = 4 }
              , kind = "fixed"
              , static = 13
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          ]
        , reachFeet = Some 5
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    , { description = Some
          "While on the Ethereal Plane, the hag casts Dream, using the same spellcasting ability as Spellcasting. Only the hag can serve as the spell's messenger, and the target must be a creature the hag can see on the Material Plane. The spell fails and is wasted if the target is under the effect of the Protection from Evil and Good spell or within a Magic Circle spell. If the target takes damage from the Dream spell, the target's Hit Point maximum decreases by an amount equal to that damage. If the spell kills the target, its soul is trapped in the hag's soul bag, and the target can't be raised from the dead until its soul is released."
      , kind = "textOnly"
      , name = Some "Nightmare Haunting (1/Day; Requires Soul Bag)"
      , procedure =
          None
            { ability : Optional Text
            , attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , components : Optional { m : Bool, s : Bool, v : Bool }
            , dispatches :
                Optional
                  ( List
                      { count : { kind : Text, value : Natural }
                      , procedureOrdinal : Natural
                      }
                  )
            , groups :
                Optional
                  ( List
                      { kind : Text
                      , resourceRefs :
                          { kind : Text, ordinals : Optional (List Natural) }
                      , spells :
                          List
                            { castAtLevel : Optional Natural
                            , restriction :
                                Optional
                                  { authoredExpression : Text
                                  , deltas : List { kind : Text, target : Text }
                                  }
                            , spellId : Text
                            }
                      }
                  )
            , kind : Text
            , name : Text
            , onHit :
                Optional
                  ( List
                      { amount :
                          { expr :
                              { dice : Natural
                              , dieSize : Natural
                              , flat : Natural
                              }
                          , kind : Text
                          , static : Natural
                          }
                      , damageType : Text
                      , kind : Text
                      }
                  )
            , reachFeet : Optional Natural
            , spellSaveDc : Optional { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 3
      , reason = Some "unsupported_action_shape"
      , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = Some "int"
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = Some { m = False, s = True, v = True }
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , groups = Some
          [ { kind = "at_will"
            , resourceRefs = { kind = "none", ordinals = None (List Natural) }
            , spells =
              [ { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas : List { kind : Text, target : Text }
                      }
                , spellId = "detect_magic"
                }
              , { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas : List { kind : Text, target : Text }
                      }
                , spellId = "etherealness"
                }
              , { castAtLevel = Some 4
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas : List { kind : Text, target : Text }
                      }
                , spellId = "magic_missile"
                }
              ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 2 ] }
            , spells =
              [ { castAtLevel = None Natural
                , restriction =
                    None
                      { authoredExpression : Text
                      , deltas : List { kind : Text, target : Text }
                      }
                , spellId = "phantasmal_killer"
                }
              , { castAtLevel = None Natural
                , restriction = Some
                  { authoredExpression = "self only"
                  , deltas = [ { kind = "target_limit", target = "self" } ]
                  }
                , spellId = "plane_shift"
                }
              ]
            }
          ]
        , kind = "spellcasting"
        , name = "Spellcasting"
        , onHit =
            None
              ( List
                  { amount :
                      { expr :
                          { dice : Natural, dieSize : Natural, flat : Natural }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
              )
        , reachFeet = None Natural
        , spellSaveDc = Some { dc = 14, kind = "fixed" }
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }
    ]
  , alignment = { morality = "evil", order = "neutral" }
  , bonusActions =
    [ { description =
          "The hag shape-shifts into a Small or Medium Humanoid, or it returns to its true form. Other than its size, its game statistics are the same in each form. Any equipment it is wearing or carrying isn't transformed."
      , kind = "textOnly"
      , name = "Shape-Shift"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { kind = "named"
      , languages = [ "Abyssal", "Common", "Infernal", "Primordial" ]
      }
    }
  , creatureType = "fiend"
  , hp = { kind = "literal", value = 112 }
  , immunities.conditions = [ "charmed" ]
  , initiative = { modifier = 5, score = 15 }
  , passivePerception = 15
  , resistances = { damageTypes = [ "cold", "fire" ], kind = "fixed" }
  , resources =
    [ { limit = { kind = "daily", uses = 1 }
      , ordinal = 1
      , ownership = "shared"
      }
    , { limit = { kind = "daily", uses = 2 }, ordinal = 2, ownership = "each" }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 4 }
    , { ability = "dex", modifier = 2 }
    , { ability = "con", modifier = 3 }
    , { ability = "int", modifier = 3 }
    , { ability = "wis", modifier = 2 }
    , { ability = "cha", modifier = 3 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 120 } ]
  , size = "medium"
  , skillModifiers =
    [ { modifier = 6, skill = "deception" }
    , { modifier = 5, skill = "insight" }
    , { modifier = 5, skill = "perception" }
    , { modifier = 5, skill = "stealth" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  , traits =
    [ { description =
          "While within 30 feet of at least two hag allies, the hag can cast one of the following spells, requiring no Material components, using the spell's normal casting time, and using Intelligence as the spellcasting ability (spell save DC 14): Augury, Find Familiar, Identify, Locate Object, Scrying, or Unseen Servant. The hag must finish a Long Rest before using this trait to cast that spell again."
      , name = "Coven Magic"
      }
    , { description =
          "The hag has Advantage on saving throws against spells and other magical effects."
      , name = "Magic Resistance"
      }
    , { description =
          "The hag has a soul bag. While holding or carrying the bag, the hag can use its Nightmare Haunting action. The bag has AC 15, HP 20, and Resistance to all damage. The bag turns to dust if reduced to 0 Hit Points. If the bag is destroyed, any souls the bag is holding are released. The hag can create a new bag after 7 days."
      , name = "Soul Bag"
      }
    ]
  }
}
