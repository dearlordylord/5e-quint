let Effect
    : Type
    = { amount :
          { expr :
              Optional
                { dice : Natural, dieSize : Natural, flat : Optional Integer }
          , kind : Text
          , static : Natural
          }
      , damageType : Text
      , kind : Text
      }

let Procedure
    : Type
    = { ability : Optional Text
      , attackAbility : Optional Text
      , attackBonus : Optional { kind : Text, value : Integer }
      , attackType : Optional Text
      , description : Optional Text
      , components : Optional { m : Bool, s : Bool, v : Bool }
      , dispatches :
          Optional
            ( List
                { count : { kind : Text, value : Integer }
                , procedureOrdinal : Natural
                }
            )
      , groups :
          Optional
            ( List
                { kind : Text
                , resourceRefs : { kind : Text, ordinals : List Natural }
                , spells : List { restriction : Text, spellId : Text }
                }
            )
      , kind : Text
      , name : Text
      , onHit : Optional (List Effect)
      , rangeFeet : Optional { long : Natural, normal : Natural }
      , reachFeet : Optional Natural
      }

let defaultProcedure
    : Procedure
    = { ability = None Text
      , attackAbility = None Text
      , attackBonus = None { kind : Text, value : Integer }
      , attackType = None Text
      , description = None Text
      , components = None { m : Bool, s : Bool, v : Bool }
      , dispatches =
          None
            ( List
                { count : { kind : Text, value : Integer }
                , procedureOrdinal : Natural
                }
            )
      , groups =
          None
            ( List
                { kind : Text
                , resourceRefs : { kind : Text, ordinals : List Natural }
                , spells : List { restriction : Text, spellId : Text }
                }
            )
      , kind = ""
      , name = ""
      , onHit = None (List Effect)
      , rangeFeet = None { long : Natural, normal : Natural }
      , reachFeet = None Natural
      }

let Action
    : Type
    = { description : Optional Text
      , kind : Text
      , name : Optional Text
      , procedure : Optional Procedure
      , procedureOrdinal : Natural
      , reason : Optional Text
      , resourceRefs : { kind : Text, ordinals : Optional (List Natural) }
      }

let defaultAction
    : Action
    = { description = None Text
      , kind = ""
      , name = None Text
      , procedure = None Procedure
      , procedureOrdinal = 0
      , reason = None Text
      , resourceRefs = { kind = "none", ordinals = None (List Natural) }
      }

let defaultEffect
    : Effect
    = { amount =
        { expr =
            None { dice : Natural, dieSize : Natural, flat : Optional Integer }
        , kind = "fixed"
        , static = 1
        }
      , damageType = "bludgeoning"
      , kind = "damage"
      }

in  { challengeRating = 0
    , id = "stat_block_crab"
    , kind = "statBlock"
    , name = "Crab"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:373-397" }
    , statBlock =
      { abilityScores =
        { cha = 2, con = 12, dex = 11, int = 1, str = 6, wis = 8 }
      , ac.value = { kind = "literal", value = 11 }
      , actions =
        [     defaultAction
          //  { kind = "executable"
              , procedure = Some
                  (     defaultProcedure
                    //  { attackAbility = Some "str"
                        , attackBonus = Some { kind = "literal", value = +2 }
                        , attackType = Some "melee"
                        , description = Some
                            "*Melee Attack Roll:* +2, reach 5 ft. *Hit:* 1 Bludgeoning damage."
                        , kind = "attack_roll"
                        , name = "Claw"
                        , onHit = Some
                          [ defaultEffect // { damageType = "bludgeoning" } ]
                        , reachFeet = Some 5
                        }
                  )
              , procedureOrdinal = 1
              }
        ]
      , alignment = "unaligned"
      , communication.kind = "none"
      , creatureType = "beast"
      , hp = { kind = "literal", value = 3 }
      , initiative = { modifier = +0, score = 10 }
      , passivePerception = 9
      , savingThrowModifiers =
        [ { ability = "str", modifier = -2 }
        , { ability = "dex", modifier = +0 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -5 }
        , { ability = "wis", modifier = -1 }
        , { ability = "cha", modifier = -4 }
        ]
      , senses = [ { kind = "blindsight", rangeFeet = 30 } ]
      , size = "tiny"
      , skillModifiers = [ { modifier = +2, skill = "stealth" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 20 }, kind = "walk" }
        , { feet = { kind = "literal", value = 20 }, kind = "swim" }
        ]
      , traits =
        [ { description = "The crab can breathe air and water."
          , name = "Amphibious"
          }
        ]
      }
    }
