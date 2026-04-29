-- Padded Armor — SRD 5.2.1 equipment.
let armor =
      { kind = "armor"
      , id = "armor_padded_armor"
      , name = "Padded Armor"
      , category = "light"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Armor" }
      , description = "Padded Armor from the SRD armor table."
      , acFormula = { kind = "light_dex", base = 11 }
      , stealthDisadvantage = True
      , weightPounds = 8
      , costGp = 5
      , donDoff = { donMinutes = 1, doffMinutes = 1 }
      }

in  armor
