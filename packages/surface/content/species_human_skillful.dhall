let ProficiencySubject : Type =
      { kind : Text
      , skill : Optional Text
      }

let skill =
      \(skillId : Text) ->
        { kind = "skill"
        , skill = Some skillId
        }

let skillOptions =
      [ skill "acrobatics"
      , skill "animal_handling"
      , skill "arcana"
      , skill "athletics"
      , skill "deception"
      , skill "history"
      , skill "insight"
      , skill "intimidation"
      , skill "investigation"
      , skill "medicine"
      , skill "nature"
      , skill "perception"
      , skill "performance"
      , skill "persuasion"
      , skill "religion"
      , skill "sleight_of_hand"
      , skill "stealth"
      , skill "survival"
      ] : List ProficiencySubject

let skillful =
      { description = "You gain proficiency in one skill of your choice."
      , id = "species_human_skillful"
      , kind = "species_trait"
      , mechanics =
        { family = "passive"
        , grants =
          [ { kind = "grant_proficiency"
            , proficiency =
              { kind = "choice"
              , count = 1
              , options = skillOptions
              }
            }
          ]
        }
      , name = "Skillful"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Character-Origins/Human#Skillful"
        }
      , species = "human"
      }

in  skillful
