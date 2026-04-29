-- Eyes of Minute Seeing — SRD 5.2.1 magic item.
--
-- RAW (MagicItems#EyesOfMinuteSeeing):
--   "While wearing them, your vision improves significantly out to a
--    range of 1 foot, granting you Darkvision within that range and
--    Advantage on Intelligence (Investigation) checks made to examine
--    something within that range."

let Grant
    : Type
    = { kind : Text
      , sense : Optional Text
      , rangeFeet : Optional Natural
      , mode : Optional Text
      , on : Optional (List Text)
      , skillFilter : Optional { kind : Text, skills : List Text }
      , contextRangeFeet : Optional Natural
      }

let darkvision
    : Grant
    = { kind = "grant_sense"
      , sense = Some "darkvision"
      , rangeFeet = Some 1
      , mode = None Text
      , on = None (List Text)
      , skillFilter = None { kind : Text, skills : List Text }
      , contextRangeFeet = None Natural
      }

let investigationAdvantage
    : Grant
    = { kind = "modify_roll_advantage"
      , sense = None Text
      , rangeFeet = None Natural
      , mode = Some "advantage"
      , on = Some [ "ability_check" ]
      , skillFilter = Some { kind = "fixed", skills = [ "investigation" ] }
      , contextRangeFeet = Some 1
      }

let eyes =
      { kind = "magic_item"
      , id = "magic_item_eyes_of_minute_seeing"
      , name = "Eyes of Minute Seeing"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#EyesOfMinuteSeeing"
          }
      , description =
          "These crystal lenses fit over the eyes. While wearing them, your vision improves significantly out to a range of 1 foot, granting you Darkvision within that range and Advantage on Intelligence (Investigation) checks made to examine something within that range."
      , mechanics =
          { family = "passive"
          , condition = { kind = "wearing_item" }
          , grants = [ darkvision, investigationAdvantage ]
          }
      , destruction = { kind = "none" }
      }

in  eyes
