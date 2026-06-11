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

in  [ { challengeRating = 0.0
  , id = "stat_block_bat"
  , kind = "statBlock"
  , name = "Bat"
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:164-185" }
  , statBlock =
    { abilityScores = { cha = 4, con = 8, dex = 15, int = 2, str = 2, wis = 12 }
    , ac = { kind = "literal", value = 12 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 4 }
          , attackType = "melee"
          , description = None Text
          , name = "Bite"
          , onHit =
            [ { amount =
                { expr = { dice = 0, dieSize = 1, flat = Some 1 }
                , kind = "fixed"
                , static = Some 1
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
    , displayName = "Bat"
    , hp = { kind = "literal", value = 1 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 2
    , skillModifiers = None (List SkillModifier)
    , languages = [ "None" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = Some [ { kind = "blindsight", rangeFeet = 60 } ]
    , size = "tiny"
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
    , ac = { kind = "literal", value = 12 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 4 }
          , attackType = "melee"
          , description = None Text
          , name = "Scratch"
          , onHit =
            [ { amount =
                { expr = { dice = 0, dieSize = 1, flat = Some 1 }
                , kind = "fixed"
                , static = Some 1
                }
              , damageType = "slashing"
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
    , displayName = "Cat"
    , hp = { kind = "literal", value = 2 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 2
    , skillModifiers = Some
      [ { modifier = +3, skill = "perception" }
      , { modifier = +4, skill = "stealth" }
      ]
    , languages = [ "None" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = Some [ { kind = "darkvision", rangeFeet = 60 } ]
    , size = "tiny"
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
    , ac = { kind = "literal", value = 11 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 3 }
          , attackType = "melee"
          , description = None Text
          , name = "Bite"
          , onHit =
            [ { amount =
                { expr = { dice = 0, dieSize = 1, flat = Some 1 }
                , kind = "fixed"
                , static = Some 1
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
    , displayName = "Frog"
    , hp = { kind = "literal", value = 1 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 1
    , skillModifiers = Some
      [ { modifier = +1, skill = "perception" }
      , { modifier = +3, skill = "stealth" }
      ]
    , languages = [ "None" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = Some [ { kind = "darkvision", rangeFeet = 30 } ]
    , size = "tiny"
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
    , ac = { kind = "literal", value = 13 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 5 }
          , attackType = "melee"
          , description = None Text
          , name = "Talons"
          , onHit =
            [ { amount =
                { expr = { dice = 0, dieSize = 1, flat = Some 1 }
                , kind = "fixed"
                , static = Some 1
                }
              , damageType = "slashing"
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
    , displayName = "Hawk"
    , hp = { kind = "literal", value = 1 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 3
    , skillModifiers = Some [ { modifier = +6, skill = "perception" } ]
    , languages = [ "None" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = None (List { kind : Text, rangeFeet : Natural })
    , size = "tiny"
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
    , ac = { kind = "literal", value = 10 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 2 }
          , attackType = "melee"
          , description = None Text
          , name = "Bite"
          , onHit =
            [ { amount =
                { expr = { dice = 0, dieSize = 1, flat = Some 1 }
                , kind = "fixed"
                , static = Some 1
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
    , displayName = "Lizard"
    , hp = { kind = "literal", value = 2 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 0
    , skillModifiers = None (List SkillModifier)
    , languages = [ "None" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = Some [ { kind = "darkvision", rangeFeet = 30 } ]
    , size = "tiny"
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
    , ac = { kind = "literal", value = 12 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 4 }
          , attackType = "melee"
          , description = None Text
          , name = "Tentacles"
          , onHit =
            [ { amount =
                { expr = { dice = 0, dieSize = 1, flat = Some 1 }
                , kind = "fixed"
                , static = Some 1
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
    , displayName = "Octopus"
    , hp = { kind = "literal", value = 3 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 2
    , skillModifiers = Some
      [ { modifier = +2, skill = "perception" }
      , { modifier = +6, skill = "stealth" }
      ]
    , languages = [ "None" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = Some [ { kind = "darkvision", rangeFeet = 30 } ]
    , size = "small"
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
    , ac = { kind = "literal", value = 11 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 3 }
          , attackType = "melee"
          , description = None Text
          , name = "Talons"
          , onHit =
            [ { amount =
                { expr = { dice = 0, dieSize = 1, flat = Some 1 }
                , kind = "fixed"
                , static = Some 1
                }
              , damageType = "slashing"
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
    , displayName = "Owl"
    , hp = { kind = "literal", value = 1 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 1
    , skillModifiers = Some
      [ { modifier = +5, skill = "perception" }
      , { modifier = +5, skill = "stealth" }
      ]
    , languages = [ "None" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = Some [ { kind = "darkvision", rangeFeet = 120 } ]
    , size = "tiny"
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
    , ac = { kind = "literal", value = 10 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 2 }
          , attackType = "melee"
          , description = None Text
          , name = "Bite"
          , onHit =
            [ { amount =
                { expr = { dice = 0, dieSize = 1, flat = Some 1 }
                , kind = "fixed"
                , static = Some 1
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
    , displayName = "Rat"
    , hp = { kind = "literal", value = 1 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 0
    , skillModifiers = Some [ { modifier = +2, skill = "perception" } ]
    , languages = [ "None" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = Some [ { kind = "darkvision", rangeFeet = 30 } ]
    , size = "tiny"
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
    , ac = { kind = "literal", value = 12 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 4 }
          , attackType = "melee"
          , description = None Text
          , name = "Beak"
          , onHit =
            [ { amount =
                { expr = { dice = 0, dieSize = 1, flat = Some 1 }
                , kind = "fixed"
                , static = Some 1
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
    , displayName = "Raven"
    , hp = { kind = "literal", value = 2 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 2
    , skillModifiers = Some [ { modifier = +3, skill = "perception" } ]
    , languages = [ "None" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = None (List { kind : Text, rangeFeet : Natural })
    , size = "tiny"
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
    , ac = { kind = "literal", value = 12 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 4 }
          , attackType = "melee"
          , description = None Text
          , name = "Bite"
          , onHit =
            [ { amount =
                { expr = { dice = 0, dieSize = 1, flat = Some 1 }
                , kind = "fixed"
                , static = Some 1
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            , { amount =
                { expr = { dice = 1, dieSize = 4, flat = None Natural }
                , kind = "fixed"
                , static = Some 2
                }
              , damageType = "poison"
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
    , displayName = "Spider"
    , hp = { kind = "literal", value = 1 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 2
    , skillModifiers = Some [ { modifier = +4, skill = "stealth" } ]
    , languages = [ "None" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = Some [ { kind = "darkvision", rangeFeet = 30 } ]
    , size = "tiny"
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
  , provenance = { kind = "srd-5.2.1", section = "Animals.md:2563-2587" }
  , statBlock =
    { abilityScores = { cha = 3, con = 8, dex = 16, int = 2, str = 3, wis = 12 }
    , ac = { kind = "literal", value = 13 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 5 }
          , attackType = "melee"
          , description = None Text
          , name = "Bite"
          , onHit =
            [ { amount =
                { expr = { dice = 0, dieSize = 1, flat = Some 1 }
                , kind = "fixed"
                , static = Some 1
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
    , displayName = "Weasel"
    , hp = { kind = "literal", value = 1 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 3
    , skillModifiers = Some
      [ { modifier = +5, skill = "acrobatics" }
      , { modifier = +3, skill = "perception" }
      , { modifier = +5, skill = "stealth" }
      ]
    , languages = [ "None" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = Some [ { kind = "darkvision", rangeFeet = 60 } ]
    , size = "tiny"
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
    , ac = { kind = "literal", value = 12 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 4 }
          , attackType = "melee"
          , description = None Text
          , name = "Bite"
          , onHit =
            [ { amount =
                { expr = { dice = 1, dieSize = 4, flat = Some 2 }
                , kind = "fixed"
                , static = Some 4
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            , { amount =
                { expr = { dice = 1, dieSize = 6, flat = None Natural }
                , kind = "fixed"
                , static = Some 3
                }
              , damageType = "poison"
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
    , displayName = "Venomous Snake"
    , hp = { kind = "literal", value = 5 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 2
    , skillModifiers = None (List SkillModifier)
    , languages = [ "None" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = Some [ { kind = "blindsight", rangeFeet = 10 } ]
    , size = "tiny"
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
    { kind = "srd-5.2.1", section = "Monsters/Monsters-H-L.md:386-413" }
  , statBlock =
    { abilityScores =
      { cha = 14, con = 13, dex = 17, int = 11, str = 6, wis = 12 }
    , ac = { kind = "literal", value = 13 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 5 }
          , attackType = "melee"
          , description = None Text
          , name = "Sting"
          , onHit =
            [ { amount =
                { expr = { dice = 1, dieSize = 6, flat = Some 3 }
                , kind = "fixed"
                , static = Some 6
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            , { amount =
                { expr = { dice = 2, dieSize = 6, flat = None Natural }
                , kind = "fixed"
                , static = Some 7
                }
              , damageType = "poison"
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
      , specials = Some
        [ { description =
              "The imp casts Invisibility on itself, requiring no spell components and using Charisma as the spellcasting ability."
          , limitedUse = None { kind : Text, uses : Natural }
          , name = "Invisibility"
          }
        , { description =
              "The imp shape-shifts to resemble a rat (Speed 20 ft.), a raven (20 ft., Fly 60 ft.), or a spider (20 ft., Climb 20 ft.), or it returns to its true form. Its game statistics are the same in each form, except for its Speed. Any equipment it is wearing or carrying isn't transformed."
          , limitedUse = None { kind : Text, uses : Natural }
          , name = "Shape-Shift"
          }
        ]
      }
    , creatureType = "fiend"
    , displayName = "Imp"
    , hp = { kind = "literal", value = 21 }
    , immunities = Some
      { conditions = [ "poisoned" ], damageTypes = [ "fire", "poison" ] }
    , initiativeModifier = 3
    , skillModifiers = Some
      [ { modifier = +4, skill = "deception" }
      , { modifier = +3, skill = "insight" }
      , { modifier = +5, skill = "stealth" }
      ]
    , languages = [ "Common", "Infernal" ]
    , resistances = Some { damageTypes = [ "cold" ], kind = "fixed" }
    , senses = Some [ { kind = "darkvision", rangeFeet = 120 } ]
    , size = "tiny"
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
    { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:292-323" }
  , statBlock =
    { abilityScores =
      { cha = 10, con = 13, dex = 15, int = 10, str = 6, wis = 12 }
    , ac = { kind = "literal", value = 14 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 4 }
          , attackType = "melee"
          , description = None Text
          , name = "Bite"
          , onHit =
            [ { amount =
                { expr = { dice = 1, dieSize = 4, flat = Some 2 }
                , kind = "fixed"
                , static = Some 4
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            ]
          , rangeFeet = None { long : Natural, normal : Natural }
          , reachFeet = Some 5
          }
        ]
      , multiattacks = Some
        [ { dispatches =
            [ { count = { kind = "literal", value = 2 }, name = "Bite" } ]
          , name = "Multiattack"
          }
        ]
      , saves = Some
        [ { ability = "con"
          , dc = { dc = 12, kind = "fixed" }
          , description =
              Some
                "Failure: 5 (2d4) Poison damage, and the target has the Poisoned condition for 1 hour. Failure by 5 or More: While Poisoned, the target also has the Unconscious condition, which ends early if the target takes damage or a creature within 5 feet of it takes an action to wake it."
          , limitedUse = None { kind : Text, uses : Natural }
          , multiattackCount = None { kind : Text, value : Natural }
          , name = "Sting"
          , onFail =
              { amount =
                  { expr = { dice = 2, dieSize = 4, flat = None Natural }
                  , kind = "fixed"
                  }
              , damageType = "poison"
              , kind = "damage"
              }
          , onSuccess = { kind = "none" }
          , target = { kind = "one_creature_in_range", rangeFeet = 5 }
          }
        ]
      , specials = None (List SpecialAction)
      }
    , creatureType = "dragon"
    , displayName = "Pseudodragon"
    , hp = { kind = "literal", value = 10 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 2
    , skillModifiers = Some
      [ { modifier = +5, skill = "perception" }
      , { modifier = +4, skill = "stealth" }
      ]
    , languages = [ "Understands Common and Draconic but can't speak" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = Some
      [ { kind = "blindsight", rangeFeet = 10 }
      , { kind = "darkvision", rangeFeet = 60 }
      ]
    , size = "tiny"
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
    , ac = { kind = "literal", value = 13 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 5 }
          , attackType = "melee"
          , description =
              Some
                "Hit: 5 (1d4 + 3) Slashing damage, and the target has the Poisoned condition until the start of the quasit's next turn."
          , name = "Rend"
          , onHit =
            [ { amount =
                { expr = { dice = 1, dieSize = 4, flat = Some 3 }
                , kind = "fixed"
                , static = Some 5
                }
              , damageType = "slashing"
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
      , specials = Some
        [ { description =
              "The quasit casts Invisibility on itself, requiring no spell components and using Charisma as the spellcasting ability."
          , limitedUse = None { kind : Text, uses : Natural }
          , name = "Invisibility"
          }
        , { description =
              "Wisdom Saving Throw: DC 10, one creature within 20 feet. Failure: The target has the Frightened condition. At the end of each of its turns, the target repeats the save, ending the effect on itself on a success. After 1 minute, it succeeds automatically."
          , limitedUse = Some { kind = "daily", uses = 1 }
          , name = "Scare"
          }
        , { description =
              "The quasit shape-shifts to resemble a bat (Speed 10 ft., Fly 40 ft.), a centipede (40 ft., Climb 40 ft.), or a toad (40 ft., Swim 40 ft.), or it returns to its true form. Its game statistics are the same in each form, except for its Speed. Any equipment it is wearing or carrying isn't transformed."
          , limitedUse = None { kind : Text, uses : Natural }
          , name = "Shape-Shift"
          }
        ]
      }
    , creatureType = "fiend"
    , displayName = "Quasit"
    , hp = { kind = "literal", value = 25 }
    , immunities = Some
      { conditions = [ "poisoned" ], damageTypes = [ "poison" ] }
    , initiativeModifier = 3
    , skillModifiers = Some [ { modifier = +5, skill = "stealth" } ]
    , languages = [ "Abyssal", "Common" ]
    , resistances = Some
      { damageTypes = [ "cold", "fire", "lightning" ], kind = "fixed" }
    , senses = Some [ { kind = "darkvision", rangeFeet = 120 } ]
    , size = "tiny"
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
    , ac = { kind = "literal", value = 15 }
    , actions =
      { attacks =
        [ { attackBonus = { kind = "literal", value = 6 }
          , attackType = "melee"
          , description = None Text
          , name = "Needle Sword"
          , onHit =
            [ { amount =
                { expr = { dice = 1, dieSize = 4, flat = Some 4 }
                , kind = "fixed"
                , static = Some 6
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            ]
          , rangeFeet = None { long : Natural, normal : Natural }
          , reachFeet = Some 5
          }
        , { attackBonus = { kind = "literal", value = 6 }
          , attackType = "ranged"
          , description =
              Some
                "Hit: 1 Piercing damage, and the target has the Charmed condition until the start of the sprite's next turn."
          , name = "Enchanting Bow"
          , onHit =
            [ { amount =
                { expr = { dice = 0, dieSize = 1, flat = Some 1 }
                , kind = "fixed"
                , static = Some 1
                }
              , damageType = "piercing"
              , kind = "damage"
              }
            ]
          , rangeFeet = Some { long = 160, normal = 40 }
          , reachFeet = None Natural
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
      , specials = Some
        [ { description =
              "Charisma Saving Throw: DC 10, one creature within 5 feet the sprite can see (Celestials, Fiends, and Undead automatically fail the save). Failure: The sprite knows the target's emotions and alignment."
          , limitedUse = None { kind : Text, uses : Natural }
          , name = "Heart Sight"
          }
        , { description =
              "The sprite casts Invisibility on itself, requiring no spell components and using Charisma as the spellcasting ability."
          , limitedUse = None { kind : Text, uses : Natural }
          , name = "Invisibility"
          }
        ]
      }
    , creatureType = "fey"
    , displayName = "Sprite"
    , hp = { kind = "literal", value = 10 }
    , immunities = None { conditions : List Text, damageTypes : List Text }
    , initiativeModifier = 4
    , skillModifiers = Some
      [ { modifier = +3, skill = "perception" }
      , { modifier = +8, skill = "stealth" }
      ]
    , languages = [ "Common", "Elvish", "Sylvan" ]
    , resistances = None { damageTypes : List Text, kind : Text }
    , senses = None (List { kind : Text, rangeFeet : Natural })
    , size = "tiny"
    , speeds =
      [ { feet = { kind = "literal", value = 10 }, kind = "walk" }
      , { feet = { kind = "literal", value = 40 }, kind = "fly" }
      ]
    , traits = None (List { description : Text, name : Text })
    }
  }
]
