let frightenedSaveAdvantage =
      { kind = "modify_roll_advantage"
      , mode = "advantage"
      , on = [ "saving_throw" ]
      , conditionFilter = [ "frightened" ]
      }

let brave =
      { description =
          "You have Advantage on saving throws you make to avoid or end the Frightened condition."
      , id = "species_halfling_brave"
      , kind = "species_trait"
      , mechanics =
        { family = "passive"
        , grants = [ frightenedSaveAdvantage ]
        }
      , name = "Brave"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Character-Origins/Halfling#Brave"
        }
      , species = "halfling"
      }

in  brave
