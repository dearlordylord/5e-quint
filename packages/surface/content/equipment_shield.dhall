-- Shield — SRD 5.2.1 equipment.

let shield =
      { kind = "shield"
      , id = "equipment_shield"
      , name = "Shield"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Equipment#Armor"
          }

      , armorClassProjection =
          { kind = "trained_shield_bonus"
          , handUse = "shield"
          , trainingRequired = "shield"
          , bonus = 2
          }
      , weightPounds = 6
      , costGp = 10
      , donDoff = { action = "utilize" }
      }

in  shield
