let DruidicGrant =
      { kind : Text, languageId : Optional Text, mode : Optional Text, spellId : Optional Text, message : Optional { kind : Text }, spotting : Optional { languageKnowers : Text, others : { ability : Text, skill : Text, dc : Natural } }, deciphering : Optional { withoutLanguageRequires : Text } }

let druidic =
      { kind = "class_feature"
      , id = "druid_druidic"
      , name = "Druidic"
      , className = "druid"
      , acquiredAtLevel = 1
      , provenance = { kind = "srd-5.2.1", section = "Classes/Druid#Druidic" }
      , description =
          "You know Druidic, always have Speak with Animals prepared, and can use Druidic to leave hidden messages."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_language"
                , languageId = Some "druidic"
                , mode = None Text
                , spellId = None Text
                , message = None { kind : Text }
                , spotting = None { languageKnowers : Text, others : { ability : Text, skill : Text, dc : Natural } }
                , deciphering = None { withoutLanguageRequires : Text }
                }
              , { kind = "grant_spell_access"
                , languageId = None Text
                , mode = Some "prepared"
                , spellId = Some "speak_with_animals"
                , message = None { kind : Text }
                , spotting = None { languageKnowers : Text, others : { ability : Text, skill : Text, dc : Natural } }
                , deciphering = None { withoutLanguageRequires : Text }
                }
              , { kind = "grant_hidden_language_messages"
                , languageId = Some "druidic"
                , mode = None Text
                , spellId = None Text
                , message = Some { kind = "hidden_language_message" }
                , spotting =
                    Some
                      { languageKnowers = "automatic"
                      , others = { ability = "int", skill = "investigation", dc = 15 }
                      }
                , deciphering = Some { withoutLanguageRequires = "magic" }
                }
              ] : List DruidicGrant
          }
      }

in  druidic
