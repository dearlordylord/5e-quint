let SkillModifier = { modifier : Integer, skill : Text }

let SpecialAction =
      { description : Text
      , limitedUse : Optional { kind : Text, uses : Natural }
      , name : Text
      }

let SaveAction =
      { ability : Text
      , dc : { dc : Natural, kind : Text }
      , description : Optional Text
      , limitedUse : Optional { kind : Text, uses : Natural }
      , multiattackCount : Optional { kind : Text, value : Natural }
      , name : Text
      , onFail :
          { amount :
              { expr : { dice : Natural, dieSize : Natural, flat : Optional Natural }
              , kind : Text
              }
          , damageType : Text
          , kind : Text
          }
      , onSuccess : { kind : Text }
      , target : { kind : Text, rangeFeet : Natural }
      }

in  [ { challengeRating = 0.25
  , id = "stat_block_riding_horse"
  , kind = "statBlock"
  , name = "Riding Horse"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:2089-2128" }
  , statBlock =
    { abilityScores =
      { cha = 7, con = 12, dex = 13, int = 2, str = 16, wis = 11 }
    , ac = { kind = "literal", value = 11 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 5 }
          , attackType = "melee"
          , description = None Text
          , name = "Hooves"
          , onHit =
            [ { amount =
                { expr = { dice = 1, dieSize = 8, flat = Some 3 }
                , kind = "fixed"
                }
              , damageType = "bludgeoning"
              , kind = "damage"
              }
            ]
          , rangeFeet = None { long : Natural, normal : Natural }
          , reachFeet = Some 5
          }
        ]
      , multiattacks =
          None
            ( List
                { dispatches :
                    List
                      { count : { kind : Text, value : Natural }, name : Text }
                , name : Text
                }
            )
      , saves = None (List SaveAction)
      , specials = None (List SpecialAction)
      }
    , creatureType = "beast"
    , displayName = "Riding Horse"
    , hp = { kind = "literal", value = 13 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 1
    , skillModifiers = None (List SkillModifier)
    , languages = [ "None" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = None (List { kind : Text, rangeFeet : Natural })
    , size = "large"
    , speeds = [ { feet = { kind = "literal", value = 60 }, kind = "walk" } ]
    , traits = None (List { description : Text, name : Text })
    }
  }
, { challengeRating = 0.25
  , id = "stat_block_wolf"
  , kind = "statBlock"
  , name = "Wolf"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:2587-2611" }
  , statBlock =
    { abilityScores =
      { cha = 6, con = 12, dex = 15, int = 3, str = 14, wis = 12 }
    , ac = { kind = "literal", value = 12 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 4 }
          , attackType = "melee"
          , description =
              Some
                "If the target is a Medium or smaller creature, it has the Prone condition."
          , name = "Bite"
          , onHit =
            [ { amount =
                { expr = { dice = 1, dieSize = 6, flat = Some 2 }
                , kind = "fixed"
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            ]
          , rangeFeet = None { long : Natural, normal : Natural }
          , reachFeet = Some 5
          }
        ]
      , multiattacks =
          None
            ( List
                { dispatches :
                    List
                      { count : { kind : Text, value : Natural }, name : Text }
                , name : Text
                }
            )
      , saves = None (List SaveAction)
      , specials = None (List SpecialAction)
      }
    , creatureType = "beast"
    , displayName = "Wolf"
    , hp = { kind = "literal", value = 11 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 2
    , skillModifiers = Some
      [ { modifier = +5, skill = "perception" }
      , { modifier = +4, skill = "stealth" }
      ]
    , languages = [ "None" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = Some [ { kind = "darkvision", rangeFeet = 60 } ]
    , size = "medium"
    , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
    , traits = Some
      [ { description =
            "The wolf has Advantage on attack rolls against a creature if at least one of the wolf's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition."
        , name = "Pack Tactics"
        }
      ]
    }
  }
]
