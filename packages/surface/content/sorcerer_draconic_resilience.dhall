-- Draconic Resilience — SRD 5.2.1 Sorcerer level 3.

let DiceAmount : Type =
      { kind : Optional Text
      , axis : Optional Text
      , base : Optional { dice : Natural, dieSize : Natural, flat : Natural }
      , perLevel : Optional { flat : Natural }
      , startingAtLevel : Optional Natural
      }

let Formula : Type = { kind : Text, base : Natural }

let Grant : Type =
      { kind : Text
      , direction : Optional Text
      , delta : Optional DiceAmount
      , formula : Optional Formula
      }

let Condition : Type = { kind : Text }

let Part : Type =
      { family : Text
      , condition : Optional Condition
      , grants : List Grant
      }

let draconicResilience =
      { kind = "class_feature"
      , id = "sorcerer_draconic_resilience"
      , name = "Draconic Resilience"
      , className = "sorcerer"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Sorcerer#Draconic Resilience"
          }
      , description =
          "Your Hit Point maximum increases by 3, and it increases by 1 again whenever you gain another Sorcerer level. While you aren't wearing armor, your base Armor Class equals 10 plus your Dexterity and Charisma modifiers."
      , mechanics =
          { family = "composite"
          , parts =
              [ { family = "passive"
                , condition = None Condition
                , grants =
                    [ { kind = "modify_max_hp"
                      , direction = Some "increase"
                      , delta = Some
                          { kind = Some "linear_per_level"
                          , axis = Some "class"
                          , base = Some { dice = 0, dieSize = 1, flat = 3 }
                          , perLevel = Some { flat = 1 }
                          , startingAtLevel = Some 3
                          }
                      , formula = None Formula
                      }
                    ] : List Grant
                }
              , { family = "passive"
                , condition = Some { kind = "unarmored" }
                , grants =
                    [ { kind = "modify_ac_set_base"
                      , direction = None Text
                      , delta = None DiceAmount
                      , formula = Some
                          { kind = "base_plus_dex_cha"
                          , base = 10
                          }
                      }
                    ] : List Grant
                }
              ] : List Part
          }
      }

in  draconicResilience
