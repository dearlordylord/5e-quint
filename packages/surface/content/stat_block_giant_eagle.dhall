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

in  { challengeRating = 1
    , id = "stat_block_giant_eagle"
    , kind = "statBlock"
    , name = "Giant Eagle"
    , provenance = { kind = "srd-5.2.1", section = "Animals.md:860-883" }
    , statBlock =
      { abilityScores =
        { cha = 10, con = 13, dex = 17, int = 8, str = 16, wis = 14 }
      , ac.value = { kind = "literal", value = 13 }
      , actions =
        [     defaultAction
          //  { description = None Text
              , kind = "executable"
              , name = None Text
              , procedure = Some
                  (     defaultProcedure
                    //  { dispatches = Some
                          [ { count = { kind = "literal", value = +2 }
                            , procedureOrdinal = 2
                            }
                          ]
                        , kind = "multiattack"
                        , name = "Multiattack"
                        }
                  )
              , procedureOrdinal = 1
              }
        ,     defaultAction
          //  { description = None Text
              , kind = "executable"
              , name = None Text
              , procedure = Some
                  (     defaultProcedure
                    //  { description = Some
                            "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 5 (1d4 + 3) Slashing damage plus 3 (1d6) Radiant damage."
                        , attackAbility = Some "str"
                        , attackBonus = Some { kind = "literal", value = +5 }
                        , attackType = Some "melee"
                        , kind = "attack_roll"
                        , name = "Rend"
                        , onHit = Some
                          [     defaultEffect
                            //  { amount =
                                  { expr = Some
                                    { dice = 1, dieSize = 4, flat = Some +3 }
                                  , kind = "fixed"
                                  , static = 5
                                  }
                                , damageType = "slashing"
                                }
                          ,     defaultEffect
                            //  { amount =
                                  { expr = Some
                                    { dice = 1
                                    , dieSize = 6
                                    , flat = None Integer
                                    }
                                  , kind = "fixed"
                                  , static = 3
                                  }
                                , damageType = "radiant"
                                }
                          ]
                        , reachFeet = Some 5
                        }
                  )
              , procedureOrdinal = 2
              }
        ]
      , alignment = { morality = "good", order = "neutral" }
      , communication =
        { kind = "understood_but_cannot_speak"
        , languages =
          { kind = "named"
          , languages = [ "Celestial", "Common", "Primordial (Auran)" ]
          }
        }
      , creatureType = "celestial"
      , hp = { kind = "literal", value = 26 }
      , initiative = { modifier = +3, score = 13 }
      , passivePerception = 16
      , resistances =
        { damageTypes = [ "necrotic", "radiant" ], kind = "fixed" }
      , savingThrowModifiers =
        [ { ability = "str", modifier = +3 }
        , { ability = "dex", modifier = +3 }
        , { ability = "con", modifier = +1 }
        , { ability = "int", modifier = -1 }
        , { ability = "wis", modifier = +2 }
        , { ability = "cha", modifier = +0 }
        ]
      , size = "large"
      , skillModifiers = [ { modifier = +6, skill = "perception" } ]
      , speeds =
        [ { feet = { kind = "literal", value = 10 }, kind = "walk" }
        , { feet = { kind = "literal", value = 80 }, kind = "fly" }
        ]
      }
    }
