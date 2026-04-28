-- Breastplate — SRD 5.2.1 equipment.

let breastplate =
      { kind = "armor"
      , id = "armor_breastplate"
      , name = "Breastplate"
      , category = "medium"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Equipment#Armor"
          }
      , description =
          "A Breastplate gives a base Armor Class of 14 plus your Dexterity modifier, to a maximum Dexterity bonus of 2."
      , acFormula =
          { kind = "medium_dex_max_2"
          , base = 14
          }
      , weightPounds = 20
      , costGp = 400
      , donDoff = { donMinutes = 5, doffMinutes = 1 }
      }

in  breastplate
