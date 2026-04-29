-- Chain Mail — SRD 5.2.1 equipment.
let armor =
      { kind = "armor"
      , id = "armor_chain_mail"
      , name = "Chain Mail"
      , category = "heavy"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Armor" }
      , description = "Chain Mail from the SRD armor table."
      , acFormula = { kind = "heavy_fixed", ac = 16 }
      , strengthRequirement = 13
      , stealthDisadvantage = True
      , weightPounds = 55
      , costGp = 75
      , donDoff = { donMinutes = 10, doffMinutes = 5 }
      }

in  armor
