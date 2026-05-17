let ProficiencyGrant =
      { kind : Text, proficiency : Optional { kind : Text, proficiencies : List { kind : Text, category : Text } }, count : Optional Natural, mode : Optional Text, spellLevel : Optional Natural, spellList : Optional Text, delta : Optional { kind : Text, ability : Text, minimum : Natural, sign : Text }, on : Optional (List Text), skillFilter : Optional { kind : Text, skills : List Text } }

let protectorGrant =
      { kind = "grant_proficiency"
      , proficiency =
          Some
            { kind = "fixed"
            , proficiencies =
                [ { kind = "weapon_category", category = "martial" }
                , { kind = "armor_category", category = "heavy" }
                ]
            }
      , count = None Natural
      , mode = None Text
      , spellLevel = None Natural
      , spellList = None Text
      , delta = None { kind : Text, ability : Text, minimum : Natural, sign : Text }
      , on = None (List Text)
      , skillFilter = None { kind : Text, skills : List Text }
      } : ProficiencyGrant

let clericCantripGrant =
      { kind = "grant_spell_access_choice"
      , proficiency = None { kind : Text, proficiencies : List { kind : Text, category : Text } }
      , count = Some 1
      , mode = Some "known"
      , spellLevel = Some 0
      , spellList = Some "cleric"
      , delta = None { kind : Text, ability : Text, minimum : Natural, sign : Text }
      , on = None (List Text)
      , skillFilter = None { kind : Text, skills : List Text }
      } : ProficiencyGrant

let divineSkillBonus =
      { kind = "modify_roll_numeric"
      , proficiency = None { kind : Text, proficiencies : List { kind : Text, category : Text } }
      , count = None Natural
      , mode = None Text
      , spellLevel = None Natural
      , spellList = None Text
      , delta = Some { kind = "ability_modifier", ability = "wis", minimum = 1, sign = "+" }
      , on = Some [ "ability_check" ]
      , skillFilter = Some { kind = "fixed", skills = [ "arcana", "religion" ] }
      } : ProficiencyGrant

let divineOrder =
      { kind = "class_feature"
      , id = "cleric_divine_order"
      , name = "Divine Order"
      , className = "cleric"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Cleric#Divine Order" }
      , description =
          "Choose Protector for Martial weapon proficiency and Heavy armor training, or Thaumaturge for one Cleric cantrip and a Wisdom-modifier bonus to Arcana or Religion checks."
      , mechanics =
          { family = "class_feature_acquisition_choice"
          , choiceKey = "divine_order"
          , timing = "class_feature_acquisition"
          , options =
              [ { id = "protector"
                , displayName = "Protector"
                , mechanics = { family = "passive", grants = [ protectorGrant ] }
                }
              , { id = "thaumaturge"
                , displayName = "Thaumaturge"
                , mechanics =
                    { family = "passive"
                    , grants = [ clericCantripGrant, divineSkillBonus ]
                    }
                }
              ]
          }
      }

in  divineOrder
