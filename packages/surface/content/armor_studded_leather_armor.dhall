-- Studded Leather Armor — SRD 5.2.1 equipment.
let armor =
      { kind = "armor"
      , id = "armor_studded_leather_armor"
      , name = "Studded Leather Armor"
      , category = "light"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Armor" }

      , acFormula = { kind = "light_dex", base = 12 }
      , weightPounds = 13
      , costGp = 45
      , donDoff = { donMinutes = 1, doffMinutes = 1 }
      }

in  armor
