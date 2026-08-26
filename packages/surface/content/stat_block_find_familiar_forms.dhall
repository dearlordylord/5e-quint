[ { challengeRating = 0.0
  , id = "stat_block_bat"
  , kind = "statBlock"
  , name = "Bat"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:164-185" }
  , statBlock =
    { abilityScores = { cha = 4, con = 8, dex = 15, int = 2, str = 2, wis = 12 }
    , ac.value = { kind = "literal", value = 12 }
    , actions =
      [ { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some
          { ability = None Text
          , attackAbility = Some "dex"
          , attackBonus = Some { kind = "literal", value = 4 }
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
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "attack_roll"
          , name = "Bite"
          , onHit = Some
            [ { amount =
                { expr =
                    None
                      { dice : Natural
                      , dieSize : Natural
                      , flat : Optional Natural
                      }
                , kind = "fixed"
                , static = 1
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            ]
          , reachFeet = Some 5
          }
        , procedureOrdinal = 1
        , reason = None Text
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.string "unaligned"
    , communication =
      { kind = "none", languages = None { kind : Text, languages : List Text } }
    , creatureType = "beast"
    , creatureTypeTags = None (List Text)
    , hp = { kind = "literal", value = 1 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiative = { modifier = 2, score = 12 }
    , passivePerception = 11
    , reactions =
        None
          ( List
              { description : Text
              , kind : Text
              , name : Text
              , procedureOrdinal : Natural
              , reason : Text
              , resourceRefs : { kind : Text, ordinals : List Natural }
              }
          )
    , resistances = None { damageTypes : List Text, kind : Text }
    , resources =
        None
          ( List
              { limit : { kind : Text, uses : Natural }
              , ordinal : Natural
              , ownership : Text
              }
          )
    , senses = Some
      [ { kind = "blindsight", qualifier = None Text, rangeFeet = 60 } ]
    , savingThrowModifiers = None (List { ability : Text, modifier : Natural })
    , size = "tiny"
    , skillModifiers = None (List { modifier : Natural, skill : Text })
    , speeds =
      [ { feet = { kind = "literal", value = 5 }, kind = "walk" }
      , { feet = { kind = "literal", value = 30 }, kind = "fly" }
      ]
    , traits = None (List { description : Text, name : Text })
    }
  }
, { challengeRating = 0.0
  , id = "stat_block_cat"
  , kind = "statBlock"
  , name = "Cat"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:319-344" }
  , statBlock =
    { abilityScores =
      { cha = 7, con = 10, dex = 15, int = 3, str = 3, wis = 12 }
    , ac.value = { kind = "literal", value = 12 }
    , actions =
      [ { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some
          { ability = None Text
          , attackAbility = Some "dex"
          , attackBonus = Some { kind = "literal", value = 4 }
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
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "attack_roll"
          , name = "Scratch"
          , onHit = Some
            [ { amount =
                { expr =
                    None
                      { dice : Natural
                      , dieSize : Natural
                      , flat : Optional Natural
                      }
                , kind = "fixed"
                , static = 1
                }
              , damageType = "slashing"
              , kind = "damage"
              }
            ]
          , reachFeet = Some 5
          }
        , procedureOrdinal = 1
        , reason = None Text
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.string "unaligned"
    , communication =
      { kind = "none", languages = None { kind : Text, languages : List Text } }
    , creatureType = "beast"
    , creatureTypeTags = None (List Text)
    , hp = { kind = "literal", value = 2 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiative = { modifier = 2, score = 12 }
    , passivePerception = 13
    , reactions =
        None
          ( List
              { description : Text
              , kind : Text
              , name : Text
              , procedureOrdinal : Natural
              , reason : Text
              , resourceRefs : { kind : Text, ordinals : List Natural }
              }
          )
    , resistances = None { damageTypes : List Text, kind : Text }
    , resources =
        None
          ( List
              { limit : { kind : Text, uses : Natural }
              , ordinal : Natural
              , ownership : Text
              }
          )
    , senses = Some
      [ { kind = "darkvision", qualifier = None Text, rangeFeet = 60 } ]
    , savingThrowModifiers = Some [ { ability = "dex", modifier = 4 } ]
    , size = "tiny"
    , skillModifiers = Some
      [ { modifier = 3, skill = "perception" }
      , { modifier = 4, skill = "stealth" }
      ]
    , speeds =
      [ { feet = { kind = "literal", value = 40 }, kind = "walk" }
      , { feet = { kind = "literal", value = 40 }, kind = "climb" }
      ]
    , traits = Some
      [ { description =
            "The cat's jump distance is determined using its Dexterity rather than its Strength."
        , name = "Jumper"
        }
      ]
    }
  }
, { challengeRating = 0.0
  , id = "stat_block_frog"
  , kind = "statBlock"
  , name = "Frog"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:612-638" }
  , statBlock =
    { abilityScores = { cha = 3, con = 8, dex = 13, int = 1, str = 1, wis = 8 }
    , ac.value = { kind = "literal", value = 11 }
    , actions =
      [ { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some
          { ability = None Text
          , attackAbility = Some "dex"
          , attackBonus = Some { kind = "literal", value = 3 }
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
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "attack_roll"
          , name = "Bite"
          , onHit = Some
            [ { amount =
                { expr =
                    None
                      { dice : Natural
                      , dieSize : Natural
                      , flat : Optional Natural
                      }
                , kind = "fixed"
                , static = 1
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            ]
          , reachFeet = Some 5
          }
        , procedureOrdinal = 1
        , reason = None Text
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.string "unaligned"
    , communication =
      { kind = "none", languages = None { kind : Text, languages : List Text } }
    , creatureType = "beast"
    , creatureTypeTags = None (List Text)
    , hp = { kind = "literal", value = 1 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiative = { modifier = 1, score = 11 }
    , passivePerception = 11
    , reactions =
        None
          ( List
              { description : Text
              , kind : Text
              , name : Text
              , procedureOrdinal : Natural
              , reason : Text
              , resourceRefs : { kind : Text, ordinals : List Natural }
              }
          )
    , resistances = None { damageTypes : List Text, kind : Text }
    , resources =
        None
          ( List
              { limit : { kind : Text, uses : Natural }
              , ordinal : Natural
              , ownership : Text
              }
          )
    , senses = Some
      [ { kind = "darkvision", qualifier = None Text, rangeFeet = 30 } ]
    , savingThrowModifiers = None (List { ability : Text, modifier : Natural })
    , size = "tiny"
    , skillModifiers = Some
      [ { modifier = 1, skill = "perception" }
      , { modifier = 3, skill = "stealth" }
      ]
    , speeds =
      [ { feet = { kind = "literal", value = 20 }, kind = "walk" }
      , { feet = { kind = "literal", value = 20 }, kind = "swim" }
      ]
    , traits = Some
      [ { description = "The frog can breathe air and water."
        , name = "Amphibious"
        }
      , { description =
            "The frog's Long Jump is up to 10 feet and its High Jump is up to 5 feet with or without a running start."
        , name = "Standing Leap"
        }
      ]
    }
  }
, { challengeRating = 0.0
  , id = "stat_block_hawk"
  , kind = "statBlock"
  , name = "Hawk"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:1454-1475" }
  , statBlock =
    { abilityScores = { cha = 6, con = 8, dex = 16, int = 2, str = 5, wis = 14 }
    , ac.value = { kind = "literal", value = 13 }
    , actions =
      [ { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some
          { ability = None Text
          , attackAbility = Some "dex"
          , attackBonus = Some { kind = "literal", value = 5 }
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
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "attack_roll"
          , name = "Talons"
          , onHit = Some
            [ { amount =
                { expr =
                    None
                      { dice : Natural
                      , dieSize : Natural
                      , flat : Optional Natural
                      }
                , kind = "fixed"
                , static = 1
                }
              , damageType = "slashing"
              , kind = "damage"
              }
            ]
          , reachFeet = Some 5
          }
        , procedureOrdinal = 1
        , reason = None Text
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.string "unaligned"
    , communication =
      { kind = "none", languages = None { kind : Text, languages : List Text } }
    , creatureType = "beast"
    , creatureTypeTags = None (List Text)
    , hp = { kind = "literal", value = 1 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiative = { modifier = 3, score = 13 }
    , passivePerception = 16
    , reactions =
        None
          ( List
              { description : Text
              , kind : Text
              , name : Text
              , procedureOrdinal : Natural
              , reason : Text
              , resourceRefs : { kind : Text, ordinals : List Natural }
              }
          )
    , resistances = None { damageTypes : List Text, kind : Text }
    , resources =
        None
          ( List
              { limit : { kind : Text, uses : Natural }
              , ordinal : Natural
              , ownership : Text
              }
          )
    , senses =
        None
          (List { kind : Text, qualifier : Optional Text, rangeFeet : Natural })
    , savingThrowModifiers = None (List { ability : Text, modifier : Natural })
    , size = "tiny"
    , skillModifiers = Some [ { modifier = 6, skill = "perception" } ]
    , speeds =
      [ { feet = { kind = "literal", value = 10 }, kind = "walk" }
      , { feet = { kind = "literal", value = 60 }, kind = "fly" }
      ]
    , traits = None (List { description : Text, name : Text })
    }
  }
, { challengeRating = 0.0
  , id = "stat_block_lizard"
  , kind = "statBlock"
  , name = "Lizard"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:1650-1676" }
  , statBlock =
    { abilityScores = { cha = 3, con = 10, dex = 11, int = 1, str = 2, wis = 8 }
    , ac.value = { kind = "literal", value = 10 }
    , actions =
      [ { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some
          { ability = None Text
          , attackAbility = Some "dex"
          , attackBonus = Some { kind = "literal", value = 2 }
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
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "attack_roll"
          , name = "Bite"
          , onHit = Some
            [ { amount =
                { expr =
                    None
                      { dice : Natural
                      , dieSize : Natural
                      , flat : Optional Natural
                      }
                , kind = "fixed"
                , static = 1
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            ]
          , reachFeet = Some 5
          }
        , procedureOrdinal = 1
        , reason = None Text
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.string "unaligned"
    , communication =
      { kind = "none", languages = None { kind : Text, languages : List Text } }
    , creatureType = "beast"
    , creatureTypeTags = None (List Text)
    , hp = { kind = "literal", value = 2 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiative = { modifier = 0, score = 10 }
    , passivePerception = 9
    , reactions =
        None
          ( List
              { description : Text
              , kind : Text
              , name : Text
              , procedureOrdinal : Natural
              , reason : Text
              , resourceRefs : { kind : Text, ordinals : List Natural }
              }
          )
    , resistances = None { damageTypes : List Text, kind : Text }
    , resources =
        None
          ( List
              { limit : { kind : Text, uses : Natural }
              , ordinal : Natural
              , ownership : Text
              }
          )
    , senses = Some
      [ { kind = "darkvision", qualifier = None Text, rangeFeet = 30 } ]
    , savingThrowModifiers = None (List { ability : Text, modifier : Natural })
    , size = "tiny"
    , skillModifiers = None (List { modifier : Natural, skill : Text })
    , speeds =
      [ { feet = { kind = "literal", value = 20 }, kind = "walk" }
      , { feet = { kind = "literal", value = 20 }, kind = "climb" }
      ]
    , traits = Some
      [ { description =
            "The lizard can climb difficult surfaces, including along ceilings, without needing to make an ability check."
        , name = "Spider Climb"
        }
      ]
    }
  }
, { challengeRating = 0.0
  , id = "stat_block_octopus"
  , kind = "statBlock"
  , name = "Octopus"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:1757-1788" }
  , statBlock =
    { abilityScores =
      { cha = 4, con = 11, dex = 15, int = 3, str = 4, wis = 10 }
    , ac.value = { kind = "literal", value = 12 }
    , actions =
      [ { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some
          { ability = None Text
          , attackAbility = Some "dex"
          , attackBonus = Some { kind = "literal", value = 4 }
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
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "attack_roll"
          , name = "Tentacles"
          , onHit = Some
            [ { amount =
                { expr =
                    None
                      { dice : Natural
                      , dieSize : Natural
                      , flat : Optional Natural
                      }
                , kind = "fixed"
                , static = 1
                }
              , damageType = "bludgeoning"
              , kind = "damage"
              }
            ]
          , reachFeet = Some 5
          }
        , procedureOrdinal = 1
        , reason = None Text
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.string "unaligned"
    , communication =
      { kind = "none", languages = None { kind : Text, languages : List Text } }
    , creatureType = "beast"
    , creatureTypeTags = None (List Text)
    , hp = { kind = "literal", value = 3 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiative = { modifier = 2, score = 12 }
    , passivePerception = 12
    , reactions = Some
      [ { description =
            "Trigger: A creature ends its turn within 5 feet of the octopus while underwater. Response: The octopus releases ink that fills a 5-foot Cube centered on itself, and the octopus moves up to its Swim Speed. The Cube is Heavily Obscured for 1 minute or until a strong current or similar effect disperses the ink."
        , kind = "textOnly"
        , name = "Ink Cloud"
        , procedureOrdinal = 1
        , reason = "unsupported_procedure_family"
        , resourceRefs = { kind = "some", ordinals = [ 1 ] }
        }
      ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , resources = Some
      [ { limit = { kind = "daily", uses = 1 }
        , ordinal = 1
        , ownership = "shared"
        }
      ]
    , senses = Some
      [ { kind = "darkvision", qualifier = None Text, rangeFeet = 30 } ]
    , savingThrowModifiers = None (List { ability : Text, modifier : Natural })
    , size = "small"
    , skillModifiers = Some
      [ { modifier = 2, skill = "perception" }
      , { modifier = 6, skill = "stealth" }
      ]
    , speeds =
      [ { feet = { kind = "literal", value = 5 }, kind = "walk" }
      , { feet = { kind = "literal", value = 30 }, kind = "swim" }
      ]
    , traits = Some
      [ { description =
            "The octopus can move through a space as narrow as 1 inch without expending extra movement to do so."
        , name = "Compression"
        }
      , { description = "The octopus can breathe only underwater."
        , name = "Water Breathing"
        }
      ]
    }
  }
, { challengeRating = 0.0
  , id = "stat_block_owl"
  , kind = "statBlock"
  , name = "Owl"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:1791-1818" }
  , statBlock =
    { abilityScores = { cha = 7, con = 8, dex = 13, int = 2, str = 3, wis = 12 }
    , ac.value = { kind = "literal", value = 11 }
    , actions =
      [ { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some
          { ability = None Text
          , attackAbility = Some "dex"
          , attackBonus = Some { kind = "literal", value = 3 }
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
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "attack_roll"
          , name = "Talons"
          , onHit = Some
            [ { amount =
                { expr =
                    None
                      { dice : Natural
                      , dieSize : Natural
                      , flat : Optional Natural
                      }
                , kind = "fixed"
                , static = 1
                }
              , damageType = "slashing"
              , kind = "damage"
              }
            ]
          , reachFeet = Some 5
          }
        , procedureOrdinal = 1
        , reason = None Text
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.string "unaligned"
    , communication =
      { kind = "none", languages = None { kind : Text, languages : List Text } }
    , creatureType = "beast"
    , creatureTypeTags = None (List Text)
    , hp = { kind = "literal", value = 1 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiative = { modifier = 1, score = 11 }
    , passivePerception = 15
    , reactions =
        None
          ( List
              { description : Text
              , kind : Text
              , name : Text
              , procedureOrdinal : Natural
              , reason : Text
              , resourceRefs : { kind : Text, ordinals : List Natural }
              }
          )
    , resistances = None { damageTypes : List Text, kind : Text }
    , resources =
        None
          ( List
              { limit : { kind : Text, uses : Natural }
              , ordinal : Natural
              , ownership : Text
              }
          )
    , senses = Some
      [ { kind = "darkvision", qualifier = None Text, rangeFeet = 120 } ]
    , savingThrowModifiers = None (List { ability : Text, modifier : Natural })
    , size = "tiny"
    , skillModifiers = Some
      [ { modifier = 5, skill = "perception" }
      , { modifier = 5, skill = "stealth" }
      ]
    , speeds =
      [ { feet = { kind = "literal", value = 5 }, kind = "walk" }
      , { feet = { kind = "literal", value = 60 }, kind = "fly" }
      ]
    , traits = Some
      [ { description =
            "The owl doesn't provoke an Opportunity Attack when it flies out of an enemy's reach."
        , name = "Flyby"
        }
      ]
    }
  }
, { challengeRating = 0.0
  , id = "stat_block_rat"
  , kind = "statBlock"
  , name = "Rat"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:1980-2005" }
  , statBlock =
    { abilityScores = { cha = 4, con = 9, dex = 11, int = 2, str = 2, wis = 10 }
    , ac.value = { kind = "literal", value = 10 }
    , actions =
      [ { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some
          { ability = None Text
          , attackAbility = Some "dex"
          , attackBonus = Some { kind = "literal", value = 2 }
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
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "attack_roll"
          , name = "Bite"
          , onHit = Some
            [ { amount =
                { expr =
                    None
                      { dice : Natural
                      , dieSize : Natural
                      , flat : Optional Natural
                      }
                , kind = "fixed"
                , static = 1
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            ]
          , reachFeet = Some 5
          }
        , procedureOrdinal = 1
        , reason = None Text
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.string "unaligned"
    , communication =
      { kind = "none", languages = None { kind : Text, languages : List Text } }
    , creatureType = "beast"
    , creatureTypeTags = None (List Text)
    , hp = { kind = "literal", value = 1 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiative = { modifier = 0, score = 10 }
    , passivePerception = 12
    , reactions =
        None
          ( List
              { description : Text
              , kind : Text
              , name : Text
              , procedureOrdinal : Natural
              , reason : Text
              , resourceRefs : { kind : Text, ordinals : List Natural }
              }
          )
    , resistances = None { damageTypes : List Text, kind : Text }
    , resources =
        None
          ( List
              { limit : { kind : Text, uses : Natural }
              , ordinal : Natural
              , ownership : Text
              }
          )
    , senses = Some
      [ { kind = "darkvision", qualifier = None Text, rangeFeet = 30 } ]
    , savingThrowModifiers = None (List { ability : Text, modifier : Natural })
    , size = "tiny"
    , skillModifiers = Some [ { modifier = 2, skill = "perception" } ]
    , speeds =
      [ { feet = { kind = "literal", value = 20 }, kind = "walk" }
      , { feet = { kind = "literal", value = 20 }, kind = "climb" }
      ]
    , traits = Some
      [ { description =
            "The rat doesn't provoke an Opportunity Attack when it moves out of an enemy's reach."
        , name = "Agile"
        }
      ]
    }
  }
, { challengeRating = 0.0
  , id = "stat_block_raven"
  , kind = "statBlock"
  , name = "Raven"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:2008-2035" }
  , statBlock =
    { abilityScores =
      { cha = 6, con = 10, dex = 14, int = 5, str = 2, wis = 13 }
    , ac.value = { kind = "literal", value = 12 }
    , actions =
      [ { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some
          { ability = None Text
          , attackAbility = Some "dex"
          , attackBonus = Some { kind = "literal", value = 4 }
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
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "attack_roll"
          , name = "Beak"
          , onHit = Some
            [ { amount =
                { expr =
                    None
                      { dice : Natural
                      , dieSize : Natural
                      , flat : Optional Natural
                      }
                , kind = "fixed"
                , static = 1
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            ]
          , reachFeet = Some 5
          }
        , procedureOrdinal = 1
        , reason = None Text
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.string "unaligned"
    , communication =
      { kind = "none", languages = None { kind : Text, languages : List Text } }
    , creatureType = "beast"
    , creatureTypeTags = None (List Text)
    , hp = { kind = "literal", value = 2 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiative = { modifier = 2, score = 12 }
    , passivePerception = 13
    , reactions =
        None
          ( List
              { description : Text
              , kind : Text
              , name : Text
              , procedureOrdinal : Natural
              , reason : Text
              , resourceRefs : { kind : Text, ordinals : List Natural }
              }
          )
    , resistances = None { damageTypes : List Text, kind : Text }
    , resources =
        None
          ( List
              { limit : { kind : Text, uses : Natural }
              , ordinal : Natural
              , ownership : Text
              }
          )
    , senses =
        None
          (List { kind : Text, qualifier : Optional Text, rangeFeet : Natural })
    , savingThrowModifiers = None (List { ability : Text, modifier : Natural })
    , size = "tiny"
    , skillModifiers = Some [ { modifier = 3, skill = "perception" } ]
    , speeds =
      [ { feet = { kind = "literal", value = 10 }, kind = "walk" }
      , { feet = { kind = "literal", value = 50 }, kind = "fly" }
      ]
    , traits = Some
      [ { description =
            "The raven can mimic simple sounds it has heard, such as a whisper or chitter. A hearer can discern the sounds are imitations with a successful DC 10 Wisdom (Insight) check."
        , name = "Mimicry"
        }
      ]
    }
  }
, { challengeRating = 0.0
  , id = "stat_block_spider"
  , kind = "statBlock"
  , name = "Spider"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:2197-2223" }
  , statBlock =
    { abilityScores = { cha = 2, con = 8, dex = 14, int = 1, str = 2, wis = 10 }
    , ac.value = { kind = "literal", value = 12 }
    , actions =
      [ { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some
          { ability = None Text
          , attackAbility = Some "dex"
          , attackBonus = Some { kind = "literal", value = 4 }
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
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "attack_roll"
          , name = "Bite"
          , onHit = Some
            [ { amount =
                { expr =
                    None
                      { dice : Natural
                      , dieSize : Natural
                      , flat : Optional Natural
                      }
                , kind = "fixed"
                , static = 1
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            , { amount =
                { expr = Some { dice = 1, dieSize = 4, flat = None Natural }
                , kind = "fixed"
                , static = 2
                }
              , damageType = "poison"
              , kind = "damage"
              }
            ]
          , reachFeet = Some 5
          }
        , procedureOrdinal = 1
        , reason = None Text
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.string "unaligned"
    , communication =
      { kind = "none", languages = None { kind : Text, languages : List Text } }
    , creatureType = "beast"
    , creatureTypeTags = None (List Text)
    , hp = { kind = "literal", value = 1 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiative = { modifier = 2, score = 12 }
    , passivePerception = 10
    , reactions =
        None
          ( List
              { description : Text
              , kind : Text
              , name : Text
              , procedureOrdinal : Natural
              , reason : Text
              , resourceRefs : { kind : Text, ordinals : List Natural }
              }
          )
    , resistances = None { damageTypes : List Text, kind : Text }
    , resources =
        None
          ( List
              { limit : { kind : Text, uses : Natural }
              , ordinal : Natural
              , ownership : Text
              }
          )
    , senses = Some
      [ { kind = "darkvision", qualifier = None Text, rangeFeet = 30 } ]
    , savingThrowModifiers = None (List { ability : Text, modifier : Natural })
    , size = "tiny"
    , skillModifiers = Some [ { modifier = 4, skill = "stealth" } ]
    , speeds =
      [ { feet = { kind = "literal", value = 20 }, kind = "walk" }
      , { feet = { kind = "literal", value = 20 }, kind = "climb" }
      ]
    , traits = Some
      [ { description =
            "The spider can climb difficult surfaces, including along ceilings, without needing to make an ability check."
        , name = "Spider Climb"
        }
      , { description =
            "The spider ignores movement restrictions caused by webs, and the spider knows the location of any other creature in contact with the same web."
        , name = "Web Walker"
        }
      ]
    }
  }
, { challengeRating = 0.0
  , id = "stat_block_weasel"
  , kind = "statBlock"
  , name = "Weasel"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:2563-2583" }
  , statBlock =
    { abilityScores = { cha = 3, con = 8, dex = 16, int = 2, str = 3, wis = 12 }
    , ac.value = { kind = "literal", value = 13 }
    , actions =
      [ { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some
          { ability = None Text
          , attackAbility = Some "dex"
          , attackBonus = Some { kind = "literal", value = 5 }
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
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "attack_roll"
          , name = "Bite"
          , onHit = Some
            [ { amount =
                { expr =
                    None
                      { dice : Natural
                      , dieSize : Natural
                      , flat : Optional Natural
                      }
                , kind = "fixed"
                , static = 1
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            ]
          , reachFeet = Some 5
          }
        , procedureOrdinal = 1
        , reason = None Text
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.string "unaligned"
    , communication =
      { kind = "none", languages = None { kind : Text, languages : List Text } }
    , creatureType = "beast"
    , creatureTypeTags = None (List Text)
    , hp = { kind = "literal", value = 1 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiative = { modifier = 3, score = 13 }
    , passivePerception = 13
    , reactions =
        None
          ( List
              { description : Text
              , kind : Text
              , name : Text
              , procedureOrdinal : Natural
              , reason : Text
              , resourceRefs : { kind : Text, ordinals : List Natural }
              }
          )
    , resistances = None { damageTypes : List Text, kind : Text }
    , resources =
        None
          ( List
              { limit : { kind : Text, uses : Natural }
              , ordinal : Natural
              , ownership : Text
              }
          )
    , senses = Some
      [ { kind = "darkvision", qualifier = None Text, rangeFeet = 60 } ]
    , savingThrowModifiers = None (List { ability : Text, modifier : Natural })
    , size = "tiny"
    , skillModifiers = Some
      [ { modifier = 5, skill = "acrobatics" }
      , { modifier = 3, skill = "perception" }
      , { modifier = 5, skill = "stealth" }
      ]
    , speeds =
      [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
      , { feet = { kind = "literal", value = 30 }, kind = "climb" }
      ]
    , traits = None (List { description : Text, name : Text })
    }
  }
, { challengeRating = 0.125
  , id = "stat_block_venomous_snake"
  , kind = "statBlock"
  , name = "Venomous Snake"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:2489-2510" }
  , statBlock =
    { abilityScores =
      { cha = 3, con = 11, dex = 15, int = 1, str = 2, wis = 10 }
    , ac.value = { kind = "literal", value = 12 }
    , actions =
      [ { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some
          { ability = None Text
          , attackAbility = Some "dex"
          , attackBonus = Some { kind = "literal", value = 4 }
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
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "attack_roll"
          , name = "Bite"
          , onHit = Some
            [ { amount =
                { expr = Some { dice = 1, dieSize = 4, flat = Some 2 }
                , kind = "fixed"
                , static = 4
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            , { amount =
                { expr = Some { dice = 1, dieSize = 6, flat = None Natural }
                , kind = "fixed"
                , static = 3
                }
              , damageType = "poison"
              , kind = "damage"
              }
            ]
          , reachFeet = Some 5
          }
        , procedureOrdinal = 1
        , reason = None Text
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.string "unaligned"
    , communication =
      { kind = "none", languages = None { kind : Text, languages : List Text } }
    , creatureType = "beast"
    , creatureTypeTags = None (List Text)
    , hp = { kind = "literal", value = 5 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiative = { modifier = 2, score = 12 }
    , passivePerception = 10
    , reactions =
        None
          ( List
              { description : Text
              , kind : Text
              , name : Text
              , procedureOrdinal : Natural
              , reason : Text
              , resourceRefs : { kind : Text, ordinals : List Natural }
              }
          )
    , resistances = None { damageTypes : List Text, kind : Text }
    , resources =
        None
          ( List
              { limit : { kind : Text, uses : Natural }
              , ordinal : Natural
              , ownership : Text
              }
          )
    , senses = Some
      [ { kind = "blindsight", qualifier = None Text, rangeFeet = 10 } ]
    , savingThrowModifiers = None (List { ability : Text, modifier : Natural })
    , size = "tiny"
    , skillModifiers = None (List { modifier : Natural, skill : Text })
    , speeds =
      [ { feet = { kind = "literal", value = 30 }, kind = "walk" }
      , { feet = { kind = "literal", value = 30 }, kind = "swim" }
      ]
    , traits = None (List { description : Text, name : Text })
    }
  }
, { challengeRating = 1.0
  , id = "stat_block_imp"
  , kind = "statBlock"
  , name = "Imp"
  , provenance =
    { kind = "srd-5.2.1", section = "Monsters/Monsters-H-L.md:386-415" }
  , statBlock =
    { abilityScores =
      { cha = 14, con = 13, dex = 17, int = 11, str = 6, wis = 12 }
    , ac.value = { kind = "literal", value = 13 }
    , actions =
      [ { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some
          { ability = None Text
          , attackAbility = Some "dex"
          , attackBonus = Some { kind = "literal", value = 5 }
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
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "attack_roll"
          , name = "Sting"
          , onHit = Some
            [ { amount =
                { expr = Some { dice = 1, dieSize = 6, flat = Some 3 }
                , kind = "fixed"
                , static = 6
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            , { amount =
                { expr = Some { dice = 2, dieSize = 6, flat = None Natural }
                , kind = "fixed"
                , static = 7
                }
              , damageType = "poison"
              , kind = "damage"
              }
            ]
          , reachFeet = Some 5
          }
        , procedureOrdinal = 1
        , reason = None Text
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      , { description = Some
            "The imp casts Invisibility on itself, requiring no spell components and using Charisma as the spellcasting ability."
        , kind = "textOnly"
        , name = Some "Invisibility"
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
                        , resourceRefs : { kind : Text }
                        , spells : List { restriction : Text, spellId : Text }
                        }
                    )
              , kind : Text
              , name : Text
              , onHit :
                  Optional
                    ( List
                        { amount :
                            { expr :
                                Optional
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
              , reachFeet : Optional Natural
              }
        , procedureOrdinal = 2
        , reason = Some "unsupported_procedure_family"
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      , { description = Some
            "The imp shape-shifts to resemble a rat (Speed 20 ft.), a raven (20 ft., Fly 60 ft.), or a spider (20 ft., Climb 20 ft.), or it returns to its true form. Its game statistics are the same in each form, except for its Speed. Any equipment it is wearing or carrying isn't transformed."
        , kind = "textOnly"
        , name = Some "Shape-Shift"
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
                        , resourceRefs : { kind : Text }
                        , spells : List { restriction : Text, spellId : Text }
                        }
                    )
              , kind : Text
              , name : Text
              , onHit :
                  Optional
                    ( List
                        { amount :
                            { expr :
                                Optional
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
              , reachFeet : Optional Natural
              }
        , procedureOrdinal = 3
        , reason = Some "unsupported_procedure_family"
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.object
            ( toMap
                { morality = json.string "evil", order = json.string "lawful" }
            )
    , communication =
      { kind = "spoken_and_understood"
      , languages = Some
        { kind = "named", languages = [ "Common", "Infernal" ] }
      }
    , creatureType = "fiend"
    , creatureTypeTags = Some [ "devil" ]
    , hp = { kind = "literal", value = 21 }
    , immunities = Some
      { conditions = [ "poisoned" ], damageTypes = [ "fire", "poison" ] }
    , initiative = { modifier = 3, score = 13 }
    , passivePerception = 11
    , reactions =
        None
          ( List
              { description : Text
              , kind : Text
              , name : Text
              , procedureOrdinal : Natural
              , reason : Text
              , resourceRefs : { kind : Text, ordinals : List Natural }
              }
          )
    , resistances = Some { damageTypes = [ "cold" ], kind = "fixed" }
    , resources =
        None
          ( List
              { limit : { kind : Text, uses : Natural }
              , ordinal : Natural
              , ownership : Text
              }
          )
    , senses = Some
      [ { kind = "darkvision"
        , qualifier = Some "unimpeded_by_magical_darkness"
        , rangeFeet = 120
        }
      ]
    , savingThrowModifiers = None (List { ability : Text, modifier : Natural })
    , size = "tiny"
    , skillModifiers = Some
      [ { modifier = 4, skill = "deception" }
      , { modifier = 3, skill = "insight" }
      , { modifier = 5, skill = "stealth" }
      ]
    , speeds =
      [ { feet = { kind = "literal", value = 20 }, kind = "walk" }
      , { feet = { kind = "literal", value = 40 }, kind = "fly" }
      ]
    , traits = Some
      [ { description =
            "The imp has Advantage on saving throws against spells and other magical effects."
        , name = "Magic Resistance"
        }
      ]
    }
  }
, { challengeRating = 0.25
  , id = "stat_block_pseudodragon"
  , kind = "statBlock"
  , name = "Pseudodragon"
  , provenance =
    { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:292-319" }
  , statBlock =
    { abilityScores =
      { cha = 10, con = 13, dex = 15, int = 10, str = 6, wis = 12 }
    , ac.value = { kind = "literal", value = 14 }
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
            [ { count = { kind = "literal", value = 2 }, procedureOrdinal = 2 }
            ]
          , groups =
              None
                ( List
                    { kind : Text
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "multiattack"
          , name = "Multiattack"
          , onHit =
              None
                ( List
                    { amount :
                        { expr :
                            Optional
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
          , reachFeet = None Natural
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
          , attackAbility = Some "dex"
          , attackBonus = Some { kind = "literal", value = 4 }
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
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "attack_roll"
          , name = "Bite"
          , onHit = Some
            [ { amount =
                { expr = Some { dice = 1, dieSize = 4, flat = Some 2 }
                , kind = "fixed"
                , static = 4
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            ]
          , reachFeet = Some 5
          }
        , procedureOrdinal = 2
        , reason = None Text
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      , { description = Some
            "Constitution Saving Throw: DC 12, one creature the pseudodragon can see within 5 feet. Failure: 5 (2d4) Poison damage, and the target has the Poisoned condition for 1 hour. Failure by 5 or More: While Poisoned, the target also has the Unconscious condition, which ends early if the target takes damage or a creature within 5 feet of it takes an action to wake it."
        , kind = "textOnly"
        , name = Some "Sting"
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
                        , resourceRefs : { kind : Text }
                        , spells : List { restriction : Text, spellId : Text }
                        }
                    )
              , kind : Text
              , name : Text
              , onHit :
                  Optional
                    ( List
                        { amount :
                            { expr :
                                Optional
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
              , reachFeet : Optional Natural
              }
        , procedureOrdinal = 3
        , reason = Some "unsupported_action_shape"
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.object
            ( toMap
                { morality = json.string "good", order = json.string "neutral" }
            )
    , communication =
      { kind = "understood_but_cannot_speak"
      , languages = Some
        { kind = "named", languages = [ "Common", "Draconic" ] }
      }
    , creatureType = "dragon"
    , creatureTypeTags = None (List Text)
    , hp = { kind = "literal", value = 10 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiative = { modifier = 2, score = 12 }
    , passivePerception = 15
    , reactions =
        None
          ( List
              { description : Text
              , kind : Text
              , name : Text
              , procedureOrdinal : Natural
              , reason : Text
              , resourceRefs : { kind : Text, ordinals : List Natural }
              }
          )
    , resistances = None { damageTypes : List Text, kind : Text }
    , resources =
        None
          ( List
              { limit : { kind : Text, uses : Natural }
              , ordinal : Natural
              , ownership : Text
              }
          )
    , senses = Some
      [ { kind = "blindsight", qualifier = None Text, rangeFeet = 10 }
      , { kind = "darkvision", qualifier = None Text, rangeFeet = 60 }
      ]
    , savingThrowModifiers = None (List { ability : Text, modifier : Natural })
    , size = "tiny"
    , skillModifiers = Some
      [ { modifier = 5, skill = "perception" }
      , { modifier = 4, skill = "stealth" }
      ]
    , speeds =
      [ { feet = { kind = "literal", value = 15 }, kind = "walk" }
      , { feet = { kind = "literal", value = 60 }, kind = "fly" }
      ]
    , traits = Some
      [ { description =
            "The pseudodragon has Advantage on saving throws against spells and other magical effects."
        , name = "Magic Resistance"
        }
      ]
    }
  }
, { challengeRating = 1.0
  , id = "stat_block_quasit"
  , kind = "statBlock"
  , name = "Quasit"
  , provenance =
    { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:359-390" }
  , statBlock =
    { abilityScores =
      { cha = 10, con = 10, dex = 17, int = 7, str = 5, wis = 10 }
    , ac.value = { kind = "literal", value = 13 }
    , actions =
      [ { description = Some
            "Melee Attack Roll: +5, reach 5 ft. Hit: 5 (1d4 + 3) Slashing damage, and the target has the Poisoned condition until the start of the quasit's next turn."
        , kind = "textOnly"
        , name = Some "Rend"
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
                        , resourceRefs : { kind : Text }
                        , spells : List { restriction : Text, spellId : Text }
                        }
                    )
              , kind : Text
              , name : Text
              , onHit :
                  Optional
                    ( List
                        { amount :
                            { expr :
                                Optional
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
              , reachFeet : Optional Natural
              }
        , procedureOrdinal = 1
        , reason = Some "unsupported_action_shape"
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      , { description = Some
            "The quasit casts Invisibility on itself, requiring no spell components and using Charisma as the spellcasting ability."
        , kind = "textOnly"
        , name = Some "Invisibility"
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
                        , resourceRefs : { kind : Text }
                        , spells : List { restriction : Text, spellId : Text }
                        }
                    )
              , kind : Text
              , name : Text
              , onHit :
                  Optional
                    ( List
                        { amount :
                            { expr :
                                Optional
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
              , reachFeet : Optional Natural
              }
        , procedureOrdinal = 2
        , reason = Some "unsupported_procedure_family"
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      , { description = Some
            "Wisdom Saving Throw: DC 10, one creature within 20 feet. Failure: The target has the Frightened condition. At the end of each of its turns, the target repeats the save, ending the effect on itself on a success. After 1 minute, it succeeds automatically."
        , kind = "textOnly"
        , name = Some "Scare"
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
                        , resourceRefs : { kind : Text }
                        , spells : List { restriction : Text, spellId : Text }
                        }
                    )
              , kind : Text
              , name : Text
              , onHit :
                  Optional
                    ( List
                        { amount :
                            { expr :
                                Optional
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
              , reachFeet : Optional Natural
              }
        , procedureOrdinal = 3
        , reason = Some "unsupported_action_shape"
        , resourceRefs = { kind = "some", ordinals = Some [ 1 ] }
        }
      , { description = Some
            "The quasit shape-shifts to resemble a bat (Speed 10 ft., Fly 40 ft.), a centipede (40 ft., Climb 40 ft.), or a toad (40 ft., Swim 40 ft.), or it returns to its true form. Its game statistics are the same in each form, except for its Speed. Any equipment it is wearing or carrying isn't transformed."
        , kind = "textOnly"
        , name = Some "Shape-Shift"
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
                        , resourceRefs : { kind : Text }
                        , spells : List { restriction : Text, spellId : Text }
                        }
                    )
              , kind : Text
              , name : Text
              , onHit :
                  Optional
                    ( List
                        { amount :
                            { expr :
                                Optional
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
              , reachFeet : Optional Natural
              }
        , procedureOrdinal = 4
        , reason = Some "unsupported_procedure_family"
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.object
            ( toMap
                { morality = json.string "evil", order = json.string "chaotic" }
            )
    , communication =
      { kind = "spoken_and_understood"
      , languages = Some { kind = "named", languages = [ "Abyssal", "Common" ] }
      }
    , creatureType = "fiend"
    , creatureTypeTags = Some [ "demon" ]
    , hp = { kind = "literal", value = 25 }
    , immunities = Some
      { conditions = [ "poisoned" ], damageTypes = [ "poison" ] }
    , initiative = { modifier = 3, score = 13 }
    , passivePerception = 10
    , reactions =
        None
          ( List
              { description : Text
              , kind : Text
              , name : Text
              , procedureOrdinal : Natural
              , reason : Text
              , resourceRefs : { kind : Text, ordinals : List Natural }
              }
          )
    , resistances = Some
      { damageTypes = [ "cold", "fire", "lightning" ], kind = "fixed" }
    , resources = Some
      [ { limit = { kind = "daily", uses = 1 }
        , ordinal = 1
        , ownership = "shared"
        }
      ]
    , senses = Some
      [ { kind = "darkvision", qualifier = None Text, rangeFeet = 120 } ]
    , savingThrowModifiers = None (List { ability : Text, modifier : Natural })
    , size = "tiny"
    , skillModifiers = Some [ { modifier = 5, skill = "stealth" } ]
    , speeds = [ { feet = { kind = "literal", value = 40 }, kind = "walk" } ]
    , traits = Some
      [ { description =
            "The quasit has Advantage on saving throws against spells and other magical effects."
        , name = "Magic Resistance"
        }
      ]
    }
  }
, { challengeRating = 0.25
  , id = "stat_block_sprite"
  , kind = "statBlock"
  , name = "Sprite"
  , provenance =
    { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:1484-1512" }
  , statBlock =
    { abilityScores =
      { cha = 11, con = 10, dex = 18, int = 14, str = 3, wis = 13 }
    , ac.value = { kind = "literal", value = 15 }
    , actions =
      [ { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some
          { ability = None Text
          , attackAbility = Some "dex"
          , attackBonus = Some { kind = "literal", value = 6 }
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
                    , resourceRefs : { kind : Text }
                    , spells : List { restriction : Text, spellId : Text }
                    }
                )
          , kind = "attack_roll"
          , name = "Needle Sword"
          , onHit = Some
            [ { amount =
                { expr = Some { dice = 1, dieSize = 4, flat = Some 4 }
                , kind = "fixed"
                , static = 6
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            ]
          , reachFeet = Some 5
          }
        , procedureOrdinal = 1
        , reason = None Text
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      , { description = Some
            "Ranged Attack Roll: +6, range 40/160 ft. Hit: 1 Piercing damage, and the target has the Charmed condition until the start of the sprite's next turn."
        , kind = "textOnly"
        , name = Some "Enchanting Bow"
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
                        , resourceRefs : { kind : Text }
                        , spells : List { restriction : Text, spellId : Text }
                        }
                    )
              , kind : Text
              , name : Text
              , onHit :
                  Optional
                    ( List
                        { amount :
                            { expr :
                                Optional
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
              , reachFeet : Optional Natural
              }
        , procedureOrdinal = 2
        , reason = Some "unsupported_action_shape"
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      , { description = Some
            "Charisma Saving Throw: DC 10, one creature within 5 feet the sprite can see (Celestials, Fiends, and Undead automatically fail the save). Failure: The sprite knows the target's emotions and alignment."
        , kind = "textOnly"
        , name = Some "Heart Sight"
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
                        , resourceRefs : { kind : Text }
                        , spells : List { restriction : Text, spellId : Text }
                        }
                    )
              , kind : Text
              , name : Text
              , onHit :
                  Optional
                    ( List
                        { amount :
                            { expr :
                                Optional
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
              , reachFeet : Optional Natural
              }
        , procedureOrdinal = 3
        , reason = Some "unsupported_action_shape"
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      , { description = Some
            "The sprite casts Invisibility on itself, requiring no spell components and using Charisma as the spellcasting ability."
        , kind = "textOnly"
        , name = Some "Invisibility"
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
                        , resourceRefs : { kind : Text }
                        , spells : List { restriction : Text, spellId : Text }
                        }
                    )
              , kind : Text
              , name : Text
              , onHit :
                  Optional
                    ( List
                        { amount :
                            { expr :
                                Optional
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
              , reachFeet : Optional Natural
              }
        , procedureOrdinal = 4
        , reason = Some "unsupported_procedure_family"
        , resourceRefs = { kind = "none", ordinals = None (List Natural) }
        }
      ]
    , alignment =
        λ(JSON : Type) →
        λ ( json
          : { array : List JSON → JSON
            , bool : Bool → JSON
            , double : Double → JSON
            , integer : Integer → JSON
            , null : JSON
            , object : List { mapKey : Text, mapValue : JSON } → JSON
            , string : Text → JSON
            }
          ) →
          json.object
            ( toMap
                { morality = json.string "good", order = json.string "neutral" }
            )
    , communication =
      { kind = "spoken_and_understood"
      , languages = Some
        { kind = "named", languages = [ "Common", "Elvish", "Sylvan" ] }
      }
    , creatureType = "fey"
    , creatureTypeTags = None (List Text)
    , hp = { kind = "literal", value = 10 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiative = { modifier = 4, score = 14 }
    , passivePerception = 13
    , reactions =
        None
          ( List
              { description : Text
              , kind : Text
              , name : Text
              , procedureOrdinal : Natural
              , reason : Text
              , resourceRefs : { kind : Text, ordinals : List Natural }
              }
          )
    , resistances = None { damageTypes : List Text, kind : Text }
    , resources =
        None
          ( List
              { limit : { kind : Text, uses : Natural }
              , ordinal : Natural
              , ownership : Text
              }
          )
    , senses =
        None
          (List { kind : Text, qualifier : Optional Text, rangeFeet : Natural })
    , savingThrowModifiers = None (List { ability : Text, modifier : Natural })
    , size = "tiny"
    , skillModifiers = Some
      [ { modifier = 3, skill = "perception" }
      , { modifier = 8, skill = "stealth" }
      ]
    , speeds =
      [ { feet = { kind = "literal", value = 10 }, kind = "walk" }
      , { feet = { kind = "literal", value = 40 }, kind = "fly" }
      ]
    , traits = None (List { description : Text, name : Text })
    }
  }
]
