-- Ring of Protection — SRD 5.2.1 magic item (rare, requires attunement).
-- Rules: "You gain a +1 bonus to AC and saving throws while you wear
-- this ring."
--
-- Reference encoding for a MULTI-GRANT PassiveMechanics list — the
-- case that motivated unifying modify_ac.delta into a DiceDelta record
-- (matching modify_roll_numeric.delta). Both grants share the same
-- on-disk row shape in the homogeneous Dhall list:
--
--   { kind : Text, delta : DiceDelta, on : Optional (List Text) }
--
-- `on` is None for modify_ac and Some [ "saving_throw" ] for
-- modify_roll_numeric. dhall-to-json --omit-empty strips the None so
-- the runtime JSON matches the TS discriminated union exactly.

let ring =
      { kind = "magic_item"
      , id = "magic_item_ring_of_protection"
      , name = "Ring of Protection"
      , rarity = "rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#RingOfProtection"
          }
      , description =
          "You gain a +1 bonus to AC and saving throws while you wear this ring."
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

in  ring
