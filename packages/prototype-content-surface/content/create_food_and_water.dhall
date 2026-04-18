-- Create Food and Water — SRD 5.2.1 Level-3 Conjuration spell.
--
-- RAW (Spells/Descriptions-A-D#Create Food and Water):
--   "You create 45 pounds of food and 30 gallons of fresh water on the
--    ground or in containers within range—both useful in fending off the
--    hazards of malnutrition and dehydration. The food is bland but
--    nourishing and looks like a food of your choice, and the water is
--    clean. The food spoils after 24 hours if uneaten."
--
-- Family: activation, direct phase — instantaneous unconditional
-- creation, no resolution gate (no attack roll, no saving throw).
--
-- Two create_object effects in the same direct phase:
--   1. Food (medium, consumable=true — spoils after 24h per RAW)
--   2. Water (large, no consumable flag — water does not expire)
--
-- The `consumable` flag is documented in types.ts as "flags output
-- that expires on its own SRD timer (food at 24h)" — exact match.
--
-- DHALL HOMOGENEITY NOTE: Both effects are `create_object`. To unify
-- them in a homogeneous list, `consumable` is typed as Optional Bool
-- in both records; `None Bool` is stripped by dhall-to-json --omit-empty.
--
-- ATTACHMENT NOTE: The spell places items "on the ground or in
-- containers within range." There is no "point within range" attachment
-- variant for object placement; attachment = self is the closest honest
-- approximation (caster conjures provisions in their vicinity). The 30-
-- foot placement radius is not mechanically captured on this surface.

let createFoodAndWater =
      { kind = "spell"
      , id = "create_food_and_water"
      , name = "Create Food and Water"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Create Food and Water"
          }
      , description =
          "You create 45 pounds of food and 30 gallons of fresh water on the ground or in containers within range—both useful in fending off the hazards of malnutrition and dehydration. The food is bland but nourishing and looks like a food of your choice, and the water is clean. The food spoils after 24 hours if uneaten."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    -- Homogeneous list via Optional superset on `consumable`.
                    [ { kind = "create_object"
                      , maxSize = "medium"
                      , consumable = Some True
                      }
                    , { kind = "create_object"
                      , maxSize = "large"
                      , consumable = None Bool
                      }
                    ]
                }
              ]
          }
      }

in  createFoodAndWater
