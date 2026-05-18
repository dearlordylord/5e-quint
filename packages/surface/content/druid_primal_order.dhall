let PrimalOrderGrant =
      { kind : Text, proficiency : Optional { kind : Text, proficiencies : List { kind : Text, category : Text } }, count : Optional Natural, mode : Optional Text, spellLevel : Optional Natural, spellList : Optional Text, delta : Optional { kind : Text, ability : Text, minimum : Natural, sign : Text }, on : Optional (List Text), skillFilter : Optional { kind : Text, skills : List Text } }

let druidCantripGrant =
      { kind = "grant_spell_access_choice"
      , proficiency = None { kind : Text, proficiencies : List { kind : Text, category : Text } }
      , count = Some 1
      , mode = Some "known"
      , spellLevel = Some 0
      , spellList = Some "druid"
      , delta = None { kind : Text, ability : Text, minimum : Natural, sign : Text }
      , on = None (List Text)
      , skillFilter = None { kind : Text, skills : List Text }
      } : PrimalOrderGrant

let natureSkillBonus =
      { kind = "modify_roll_numeric"
      , proficiency = None { kind : Text, proficiencies : List { kind : Text, category : Text } }
      , count = None Natural
      , mode = None Text
      , spellLevel = None Natural
      , spellList = None Text
      , delta = Some { kind = "ability_modifier", ability = "wis", minimum = 1, sign = "+" }
      , on = Some [ "ability_check" ]
      , skillFilter = Some { kind = "fixed", skills = [ "arcana", "nature" ] }
      } : PrimalOrderGrant

let wardenGrant =
      { kind = "grant_proficiency"
      , proficiency =
          Some
            { kind = "fixed"
            , proficiencies =
                [ { kind = "weapon_category", category = "martial" }
                , { kind = "armor_category", category = "medium" }
                ]
            }
      , count = None Natural
      , mode = None Text
      , spellLevel = None Natural
      , spellList = None Text
      , delta = None { kind : Text, ability : Text, minimum : Natural, sign : Text }
      , on = None (List Text)
      , skillFilter = None { kind : Text, skills : List Text }
      } : PrimalOrderGrant

let primalOrder =
      { kind = "class_feature"
      , id = "druid_primal_order"
      , name = "Primal Order"
      , className = "druid"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Druid#Primal Order" }
      , description =
          "Choose Magician for one Druid cantrip and a Wisdom-modifier bonus to Arcana or Nature checks, or Warden for Martial weapon proficiency and Medium armor training."
      , mechanics =
          { family = "class_feature_acquisition_choice"
          , choiceKey = "primal_order"
          , timing = "class_feature_acquisition"
          , options =
              [ { id = "magician"
                , displayName = "Magician"
                , mechanics =
                    { family = "passive"
                    , grants = [ druidCantripGrant, natureSkillBonus ]
                    }
                }
              , { id = "warden"
                , displayName = "Warden"
                , mechanics = { family = "passive", grants = [ wardenGrant ] }
                }
              ]
          }
      }

in  primalOrder
