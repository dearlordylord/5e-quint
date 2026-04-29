-- Chain Shirt — SRD 5.2.1 equipment.
let armor =
      { kind = "armor"
      , id = "armor_chain_shirt"
      , name = "Chain Shirt"
      , category = "medium"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Armor" }
      , description = "Chain Shirt from the SRD armor table."
      , acFormula = { kind = "medium_dex_max_2", base = 13 }
      , weightPounds = 20
      , costGp = 50
      , donDoff = { donMinutes = 5, doffMinutes = 1 }
      }

in  armor
