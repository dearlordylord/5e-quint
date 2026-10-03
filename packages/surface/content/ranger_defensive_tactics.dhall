{ kind = "class_feature"
, id = "ranger_defensive_tactics"
, name = "Defensive Tactics"
, className = "ranger"
, acquiredAtLevel = 7
, provenance = { kind = "srd-5.2.1", section = "classes.md:6825-6832" }
, mechanics =
    { family = "attack_roll_defense_choice"
    , choice = { kind = "choose_one", replaceOn = "short_or_long_rest" }
    , options =
        [ { id = "escape_the_horde"
          , trigger = { kind = "opportunity_attack" }
          , attackRoll = { mode = "disadvantage", appliesTo = None Text, until = None Text }
          }
        , { id = "multiattack_defense"
          , trigger = { kind = "hit_by_attack_roll" }
          , attackRoll = { mode = "disadvantage", appliesTo = Some "same_attacker_against_self", until = Some "end_of_current_turn" }
          }
        ]
    }
}
