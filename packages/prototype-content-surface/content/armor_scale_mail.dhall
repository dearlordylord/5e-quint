-- Scale Mail — SRD 5.2.1 equipment.
let armor =
      { kind = "armor"
      , id = "armor_scale_mail"
      , name = "Scale Mail"
      , category = "medium"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Armor" }
      , description = "Scale Mail from the SRD armor table."
      , acFormula = { kind = "medium_dex_max_2", base = 14 }
      , stealthDisadvantage = True
      , weightPounds = 45
      , costGp = 50
      , donDoff = { donMinutes = 5, doffMinutes = 1 }
      }

in  armor
