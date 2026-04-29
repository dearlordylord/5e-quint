-- Splint Armor — SRD 5.2.1 equipment.
let armor =
      { kind = "armor"
      , id = "armor_splint_armor"
      , name = "Splint Armor"
      , category = "heavy"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Armor" }
      , description = "Splint Armor from the SRD armor table."
      , acFormula = { kind = "heavy_fixed", ac = 17 }
      , strengthRequirement = 15
      , stealthDisadvantage = True
      , weightPounds = 60
      , costGp = 200
      , donDoff = { donMinutes = 10, doffMinutes = 5 }
      }

in  armor
