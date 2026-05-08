let ThievesCantGrant =
      { kind : Text, languageId : Optional Text, count : Optional Natural, source : Optional Text }

let thievesCant =
      { kind = "class_feature"
      , id = "rogue_thieves_cant"
      , name = "Thieves' Cant"
      , className = "rogue"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Rogue#Thieves' Cant" }
      , description =
          "You know Thieves' Cant and one other language of your choice from the Character Creation language tables."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_language"
                , languageId = Some "thieves_cant"
                , count = None Natural
                , source = None Text
                }
              , { kind = "grant_language_choice"
                , languageId = None Text
                , count = Some 1
                , source = Some "character_creation_language_tables"
                }
              ] : List ThievesCantGrant
          }
      }

in  thievesCant
