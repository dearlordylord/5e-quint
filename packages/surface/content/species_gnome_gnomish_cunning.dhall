let AdvantageGrant
    : Type
    = { kind : Text
      , mode : Text
      , on : List Text
      , saveAbilityFilter : List Text
      }

let savingThrowAdvantage
    : AdvantageGrant
    = { kind = "modify_roll_advantage"
      , mode = "advantage"
      , on = [ "saving_throw" ]
      , saveAbilityFilter = [ "int", "wis", "cha" ]
      }

let gnomishCunning =
      { description =
          "You have Advantage on Intelligence, Wisdom, and Charisma saving throws."
      , id = "species_gnome_gnomish_cunning"
      , kind = "species_trait"
      , mechanics =
        { family = "passive"
        , grants = [ savingThrowAdvantage ]
        }
      , name = "Gnomish Cunning"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Character-Origins/Gnome#Gnomish Cunning"
        }
      , species = "gnome"
      }

in  gnomishCunning
