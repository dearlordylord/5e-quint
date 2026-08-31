{ challengeRating = 3
, id = "stat_block_warrior_veteran"
, kind = "statBlock"
, name = "Warrior Veteran"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-T-Z.md:656-686" }
, statBlock =
  { abilityScores =
    { cha = 10, con = 14, dex = 13, int = 10, str = 16, wis = 11 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { description = Some
          "The warrior makes two Greatsword or Heavy Crossbow attacks."
      , kind = "textOnly"
      , name = Some "Multiattack"
      , procedure =
          None
            { ammunition : Optional Text
            , attackAbility : Text
            , attackBonus : { kind : Text, value : Natural }
            , attackType : Text
            , kind : Text
            , name : Text
            , onHit :
                List
                  { amount :
                      { expr :
                          { dice : Natural, dieSize : Natural, flat : Natural }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
            , rangeFeet : Optional { long : Natural, normal : Natural }
            , reachFeet : Optional Natural
            }
      , procedureOrdinal = 1
      , reason = Some "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ammunition = None Text
        , attackAbility = "str"
        , attackBonus = { kind = "literal", value = 5 }
        , attackType = "melee"
        , kind = "attack_roll"
        , name = "Greatsword"
        , onHit =
          [ { amount =
              { expr = { dice = 2, dieSize = 6, flat = 3 }
              , kind = "fixed"
              , static = 10
              }
            , damageType = "slashing"
            , kind = "damage"
            }
          ]
        , rangeFeet = None { long : Natural, normal : Natural }
        , reachFeet = Some 5
        }
      , procedureOrdinal = 2
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    , { description = None Text
      , kind = "executable"
      , name = None Text
      , procedure = Some
        { ammunition = Some "bolt"
        , attackAbility = "dex"
        , attackBonus = { kind = "literal", value = 3 }
        , attackType = "ranged"
        , kind = "attack_roll"
        , name = "Heavy Crossbow"
        , onHit =
          [ { amount =
              { expr = { dice = 2, dieSize = 10, flat = 1 }
              , kind = "fixed"
              , static = 12
              }
            , damageType = "piercing"
            , kind = "damage"
            }
          ]
        , rangeFeet = Some { long = 400, normal = 100 }
        , reachFeet = None Natural
        }
      , procedureOrdinal = 3
      , reason = None Text
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = { morality = "neutral", order = "neutral" }
  , communication =
    { kind = "spoken_and_understood"
    , languages =
      { additionalLanguages = 1
      , kind = "named_plus_other_languages"
      , languages = [ "Common" ]
      }
    }
  , creatureType = "humanoid"
  , gear =
    [ { item = "Greatsword", quantity = 1 }
    , { item = "Heavy Crossbow", quantity = 1 }
    , { item = "Splint Armor", quantity = 1 }
    ]
  , hp = { kind = "literal", value = 65 }
  , initiative = { modifier = 3, score = 13 }
  , passivePerception = 12
  , reactions =
    [ { description =
          "Trigger: The warrior is hit by a melee attack roll while holding a weapon. Response: The warrior adds 2 to its AC against that attack, possibly causing it to miss."
      , kind = "textOnly"
      , name = "Parry"
      , procedureOrdinal = 1
      , reason = "unsupported_action_shape"
      , resourceRefs.kind = "none"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = 0 }
    , { ability = "con", modifier = 2 }
    , { ability = "dex", modifier = 1 }
    , { ability = "int", modifier = 0 }
    , { ability = "str", modifier = 3 }
    , { ability = "wis", modifier = 0 }
    ]
  , size = { kind = "alternatives", options = [ "medium", "small" ] }
  , skillModifiers =
    [ { modifier = 5, skill = "athletics" }
    , { modifier = 2, skill = "perception" }
    ]
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  }
}
