-- Amulet of Health — SRD 5.2.1 Magic Item (rare, requires attunement).
-- Rules: "Your Constitution score is 19 while you wear this amulet.
-- This amulet has no effect on you if your Constitution score is
-- already 19 or higher without it."
--
-- Reference encoding for set_ability_score with floor semantics. The
-- "no effect if already ≥ 19" clause is exactly the `floor` mode:
-- raises the score to 19 but never lowers it. Paired with attunement
-- slot consumption (as with cloak_of_protection).

let amulet =
      { kind = "magic_item"
      , id = "magic_item_amulet_of_health"
      , name = "Amulet of Health"
      , rarity = "rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#AmuletOfHealth"
          }
      , description =
          "Your Constitution score is 19 while you wear this amulet. This amulet has no effect on you if your Constitution score is already 19 or higher without it."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "set_ability_score"
                , ability = "con"
                , value = +19
                , mode = "floor"
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  amulet
