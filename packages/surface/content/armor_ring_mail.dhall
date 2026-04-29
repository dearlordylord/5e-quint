-- Ring Mail — SRD 5.2.1 equipment.
let armor =
      { kind = "armor"
      , id = "armor_ring_mail"
      , name = "Ring Mail"
      , category = "heavy"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Armor" }
      , description = "Ring Mail from the SRD armor table."
      , acFormula = { kind = "heavy_fixed", ac = 14 }
      , stealthDisadvantage = True
      , weightPounds = 40
      , costGp = 30
      , donDoff = { donMinutes = 10, doffMinutes = 5 }
      }

in  armor
