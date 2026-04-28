-- Leather Armor — SRD 5.2.1 equipment.

let leather =
      { kind = "armor"
      , id = "armor_leather"
      , name = "Leather Armor"
      , category = "light"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Equipment#Armor"
          }
      , description =
          "Leather Armor gives a base Armor Class of 11 plus your Dexterity modifier."
      , acFormula =
          { kind = "light_dex"
          , base = 11
          }
      , weightPounds = 10
      , costGp = 10
      , donDoff = { donMinutes = 1, doffMinutes = 1 }
      }

in  leather
