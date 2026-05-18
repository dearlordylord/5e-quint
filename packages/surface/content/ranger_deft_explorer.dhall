let ChoiceCount = { kind : Text, levels : List { atLevel : Natural, total : Natural } }

let SkillSource = { kind : Text }

let DeftExplorerGrant =
      { kind : Text
      , choiceCount : Optional ChoiceCount
      , skills : Optional SkillSource
      , count : Optional Natural
      , source : Optional Text
      }

let deftExplorer =
      { kind = "class_feature"
      , id = "ranger_deft_explorer"
      , name = "Deft Explorer"
      , className = "ranger"
      , acquiredAtLevel = 2
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Ranger.md:88-94" }
      , description =
          "Choose one of your skill proficiencies with which you lack Expertise; you gain Expertise in that skill. You also know two languages of your choice from the Character Creation language tables."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_expertise"
                , choiceCount =
                    Some
                      { kind = "class_level_total_choices"
                      , levels = [ { atLevel = 2, total = 1 } ]
                      }
                , skills =
                    Some { kind = "owned_skill_proficiencies_without_expertise" }
                , count = None Natural
                , source = None Text
                }
              , { kind = "grant_language_choice"
                , choiceCount = None ChoiceCount
                , skills = None SkillSource
                , count = Some 2
                , source = Some "character_creation_language_tables"
                }
              ] : List DeftExplorerGrant
          }
      }

in  deftExplorer
