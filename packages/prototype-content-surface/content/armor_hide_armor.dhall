-- Hide Armor — SRD 5.2.1 equipment.
let armor =
      { kind = "armor"
      , id = "armor_hide_armor"
      , name = "Hide Armor"
      , category = "medium"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Armor" }
      , description = "Hide Armor from the SRD armor table."
      , acFormula = { kind = "medium_dex_max_2", base = 12 }
      , weightPounds = 12
      , costGp = 10
      , donDoff = { donMinutes = 5, doffMinutes = 1 }
      }

in  armor
