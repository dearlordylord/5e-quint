-- Goggles of Night — SRD 5.2.1 magic item.
--
-- RAW (MagicItems#GogglesOfNight):
--   "While wearing these dark lenses, you have Darkvision out to 60
--    feet. If you already have Darkvision, wearing the goggles increases
--    its range by 60 feet."
--
-- This is not plain grant_sense: the second sentence is additive when
-- Darkvision already exists. Encode the conditional range math directly.

let goggles =
      { kind = "magic_item"
      , id = "magic_item_goggles_of_night"
      , name = "Goggles of Night"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#GogglesOfNight"
          }
      , description =
          "While wearing these dark lenses, you have Darkvision out to 60 feet. If you already have Darkvision, wearing the goggles increases its range by 60 feet."
      , mechanics =
          { family = "passive"
          , condition = { kind = "wearing_item" }
          , grants =
              [ { kind = "modify_sense_range"
                , sense = "darkvision"
                , grantIfAbsentFeet = 60
                , increaseIfPresentFeet = 60
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  goggles
