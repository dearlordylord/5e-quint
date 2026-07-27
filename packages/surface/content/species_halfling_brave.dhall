let frightenedSaveAdvantage =
      { kind = "modify_roll_advantage"
      , mode = "advantage"
      , on = [ "saving_throw" ]
      , conditionFilter = [ "frightened" ]
      }

let brave =
      {  id = "species_halfling_brave"
      , kind = "species_trait"
      , mechanics =
        { family = "passive"
        , grants = [ frightenedSaveAdvantage ]
        }
      , name = "Brave"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Character-Origins.md:1,67,97,215,223-224"
        }
      , species = "halfling"
      }

in  brave
