{ challengeRating = 11
, id = "stat_block_efreeti"
, kind = "statBlock"
, name = "Efreeti"
, provenance = { kind = "srd-5.2.1", section = "monsters-A-Z.md:5706-5790" }
, statBlock =
  { abilityScores =
    { cha = 19, con = 24, dex = 12, int = 16, str = 22, wis = 15 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { description = Some
          "The efreeti makes three attacks, using Heated Blade or Hurl Flame in any combination."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { ability : Optional Text
            , attackAbility : Optional Text
            , attackBonus : Optional { kind : Text, value : Natural }
            , attackType : Optional Text
            , components : Optional { m : Bool, s : Bool, v : Bool }
            , groups :
                Optional
                  ( List
                      { kind : Text
                      , resourceRefs :
                          { kind : Text, ordinals : Optional (List Natural) }
                      , spells :
                          List
                            { castAtLevel : Optional Natural, spellId : Text }
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
                              , flat : Optional Natural
                              }
                          , kind : Text
                          , static : Natural
                          }
                      , damageType : Text
                      , kind : Text
                      }
                  )
            , rangeFeet : Optional { long : Natural, normal : Natural }
            , reachFeet : Optional Natural
            , spellSaveDc : Optional { dc : Natural, kind : Text }
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = None Text
        , attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 10 }
        , attackType = Some "melee"
        , components = None { m : Bool, s : Bool, v : Bool }
        , groups =
            None
              ( List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells :
                      List { castAtLevel : Optional Natural, spellId : Text }
                  }
              )
        , kind = "attack_roll"
        , name = "Heated Blade"
        , onHit = Some
          [ { amount =
              { expr = { dice = 2, dieSize = 6, flat = Some 6 }
              , kind = "fixed"
              , static = 13
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 2, dieSize = 12, flat = None Natural }
              , kind = "fixed"
              , static = 13
              }
            , damageType = "fire"
            , kind = "damage"
            }
          ]
        , rangeFeet = None { long : Natural, normal : Natural }
        , reachFeet = Some 5
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = None Text
        , attackAbility = Some "cha"
        , attackBonus = Some { kind = "literal", value = 8 }
        , attackType = Some "ranged"
        , components = None { m : Bool, s : Bool, v : Bool }
        , groups =
            None
              ( List
                  { kind : Text
                  , resourceRefs :
                      { kind : Text, ordinals : Optional (List Natural) }
                  , spells :
                      List { castAtLevel : Optional Natural, spellId : Text }
                  }
              )
        , kind = "attack_roll"
        , name = "Hurl Flame"
        , onHit = Some
          [ { amount =
              { expr = { dice = 7, dieSize = 6, flat = None Natural }
              , kind = "fixed"
              , static = 24
              }
            , damageType = "fire"
            , kind = "damage"
            }
          ]
        , rangeFeet = Some { long = 120, normal = 120 }
        , reachFeet = None Natural
        , spellSaveDc = None { dc : Natural, kind : Text }
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ability = Some "cha"
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = Some { m = False, s = True, v = True }
        , groups = Some
          [ { kind = "at_will"
            , resourceRefs = { kind = "none", ordinals = None (List Natural) }
            , spells =
              [ { castAtLevel = None Natural, spellId = "detect_magic" }
              , { castAtLevel = None Natural, spellId = "elementalism" }
              ]
            }
          , { kind = "limited"
            , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
            , spells =
              [ { castAtLevel = None Natural, spellId = "gaseous_form" }
              , { castAtLevel = None Natural, spellId = "invisibility" }
              , { castAtLevel = None Natural, spellId = "major_image" }
              , { castAtLevel = None Natural, spellId = "plane_shift" }
              , { castAtLevel = None Natural, spellId = "tongues" }
              , { castAtLevel = Some 7, spellId = "wall_of_fire" }
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
                          { dice : Natural
                          , dieSize : Natural
                          , flat : Optional Natural
                          }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
              )
        , rangeFeet = None { long : Natural, normal : Natural }
        , reachFeet = None Natural
        , spellSaveDc = Some { dc = 16, kind = "fixed" }
        }
      , procedureOrdinal = 4
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages = { kind = "named", languages = [ "Primordial (Ignan)" ] }
    }
  , creatureType = "elemental"
  , creatureTypeTags = [ "genie" ]
  , hp = { kind = "literal", value = 212 }
  , immunities.damageTypes = [ "fire" ]
  , initiative = { modifier = 1, score = 11 }
  , passivePerception = 12
  , resources =
    [ { limit = { kind = "daily", uses = 1 }, ordinal = 1, ownership = "each" }
    ]
  , savingThrowModifiers =
    [ { ability = "str", modifier = 6 }
    , { ability = "dex", modifier = 1 }
    , { ability = "con", modifier = 7 }
    , { ability = "int", modifier = 3 }
    , { ability = "wis", modifier = 6 }
    , { ability = "cha", modifier = 8 }
    ]
  , senses = [ { kind = "darkvision", rangeFeet = 120 } ]
  , size = "large"
  , speeds =
    [ { feet = { kind = "literal", value = 40 }
      , hover = None Bool
      , kind = "walk"
      }
    , { feet = { kind = "literal", value = 60 }
      , hover = Some True
      , kind = "fly"
      }
    ]
  , traits =
    [ { description =
          "If the efreeti dies outside the Elemental Plane of Fire, its body dissolves into ash, and it gains a new body in 1d4 days, reviving with all its Hit Points somewhere on the Plane of Fire."
      , name = "Elemental Restoration"
      }
    , { description =
          "The efreeti has Advantage on saving throws against spells and other magical effects."
      , name = "Magic Resistance"
      }
    , { description =
          "The efreeti has a 30 percent chance of knowing the Wish spell. If the efreeti knows it, the efreeti can cast it only on behalf of a non-genie creature who communicates a wish in a way the efreeti can understand. If the efreeti casts the spell for the creature, the efreeti suffers none of the spell's stress. Once the efreeti has cast it three times, the efreeti can't do so again for 365 days."
      , name = "Wishes"
      }
    ]
  }
}
