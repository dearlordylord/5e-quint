let MartialArtsGrant =
      { kind : Text, attack : Optional Text, scope : Optional Text, die : Optional { kind : Text, axis : Text, base : { dice : Natural, dieSize : Natural }, tiers : List { atLevel : Natural, override : { dieSize : Natural } } }, on : Optional (List Text), replaces : Optional Text, use : Optional Text }

let Predicate = { kind : Text, categories : Optional (List Text) }

let martialArts =
      { kind = "class_feature"
      , id = "monk_martial_arts"
      , name = "Martial Arts"
      , className = "monk"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Monk#Martial Arts" }
      , description =
          "While unarmed or wielding Monk weapons and not wearing armor or wielding a Shield, you gain a Bonus Action Unarmed Strike, the Martial Arts die, and Dexterous Attacks."
      , mechanics =
          { family = "passive"
          , condition =
              { kind = "all_of"
              , predicates =
                  [ { kind = "unarmed_or_monk_weapons_only", categories = None (List Text) }
                  , { kind = "not_wearing_armor", categories = Some [ "light", "medium", "heavy" ] }
                  , { kind = "not_wielding_shield", categories = None (List Text) }
                  ] : List Predicate
              }
          , grants =
              [ { kind = "grant_bonus_action_attack"
                , attack = Some "unarmed_strike"
                , scope = None Text
                , die = None { kind : Text, axis : Text, base : { dice : Natural, dieSize : Natural }, tiers : List { atLevel : Natural, override : { dieSize : Natural } } }
                , on = None (List Text)
                , replaces = None Text
                , use = None Text
                }
              , { kind = "replace_damage_die"
                , attack = None Text
                , scope = Some "unarmed_or_monk_weapon"
                , die =
                    Some
                      { kind = "threshold_tiers"
                      , axis = "class"
                      , base = { dice = 1, dieSize = 6 }
                      , tiers =
                          [ { atLevel = 5, override = { dieSize = 8 } }
                          , { atLevel = 11, override = { dieSize = 10 } }
                          , { atLevel = 17, override = { dieSize = 12 } }
                          ]
                      }
                , on = None (List Text)
                , replaces = None Text
                , use = None Text
                }
              , { kind = "substitute_ability_for_rolls"
                , attack = None Text
                , scope = Some "unarmed_or_monk_weapon"
                , die = None { kind : Text, axis : Text, base : { dice : Natural, dieSize : Natural }, tiers : List { atLevel : Natural, override : { dieSize : Natural } } }
                , on = Some [ "attack_roll", "damage_roll", "unarmed_strike_save_dc" ]
                , replaces = Some "str"
                , use = Some "dex"
                }
              ] : List MartialArtsGrant
          }
      }

in  martialArts
