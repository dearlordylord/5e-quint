-- Cloak of Protection — SRD 5.2.1 magic item.
-- The cloak grants +1 AC and +1 to all saving throws while worn (attuned).
--
-- DHALL NOTE:
--   Both grants share the homogeneous row shape used in
--   magic_item_ring_of_protection.dhall:
--     { kind : Text, delta : DiceDelta, on : Optional (List Text) }
--   `on` is None for modify_ac and Some ["saving_throw"] for
--   modify_roll_numeric. dhall-to-json --omit-empty strips the None so
--   the runtime JSON matches the TS discriminated union exactly.

let cloak =
      { kind = "magic_item"
      , id = "magic_item_cloak_of_protection"
      , name = "Cloak of Protection"
      , rarity = "uncommon"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Cloak of Protection"
          }
      , description =
          "You gain a +1 bonus to Armor Class and saving throws while you wear this cloak."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "modify_ac"
                , delta =
                    { kind = "fixed_dice"
                    , dice = 1
                    , dieSize = 1
                    , sign = "+"
                    }
                , on = None (List Text)
                }
              , { kind = "modify_roll_numeric"
                , delta =
                    { kind = "fixed_dice"
                    , dice = 1
                    , dieSize = 1
                    , sign = "+"
                    }
                , on = Some [ "saving_throw" ]
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  cloak
