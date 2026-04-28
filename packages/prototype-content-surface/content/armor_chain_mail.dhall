-- Chain Mail — SRD 5.2.1 equipment.

let chainMail =
      { kind = "armor"
      , id = "armor_chain_mail"
      , name = "Chain Mail"
      , category = "heavy"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Equipment#Armor"
          }
      , description =
          "Chain Mail gives a base Armor Class of 16. It requires Strength 13 and imposes Disadvantage on Dexterity (Stealth) checks."
      , acFormula =
          { kind = "fixed"
          , ac = 16
          }
      , strengthRequirement = 13
      , stealthDisadvantage = True
      , weightPounds = 55
      , costGp = 75
      , donDoff = { donMinutes = 10, doffMinutes = 5 }
      }

in  chainMail
