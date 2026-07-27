let MaximumSpellLevel = < fixed : Natural | available : { kind : Text } >

let LearningGrant =
      { choiceCount : Natural
      , eligibility :
          { className : Text
          , maximumSpellLevel : MaximumSpellLevel
          , school : Text
          }
      , timing : { kind : Text, className : Optional Text }
      }

let defaultLearningGrant : LearningGrant =
      { choiceCount = 1
      , eligibility =
          { className = ""
          , maximumSpellLevel = MaximumSpellLevel.fixed 1
          , school = ""
          }
      , timing = { kind = "", className = None Text }
      }

let evocationSavant =
      { acquiredAtLevel = 3
      , className = "wizard"

      , id = "wizard_evocation_savant"
      , kind = "class_feature"
      , mechanics =
          { family = "wizard_spellbook_learning"
          , grants =
            [ defaultLearningGrant // { choiceCount = 2
              , eligibility =
                  { className = "wizard"
                  , maximumSpellLevel = MaximumSpellLevel.fixed 2
                  , school = "evocation"
                  }
              , timing = { kind = "class_feature_acquisition", className = None Text }
              }
            , defaultLearningGrant // { choiceCount = 1
              , eligibility =
                  { className = "wizard"
                  , maximumSpellLevel =
                      MaximumSpellLevel.available { kind = "available_spell_slot_level" }
                  , school = "evocation"
                  }
              , timing =
                  { className = Some "wizard"
                  , kind = "new_spell_slot_level_access"
                  }
              }
            ]
          , spellbookSource =
              { className = "wizard", kind = "class_spellcasting_spellbook" }
          }
      , name = "Evocation Savant"
      , provenance = { kind = "srd-5.2.1", section = "Classes/Wizard.md:411-415" }
      }

in  evocationSavant
