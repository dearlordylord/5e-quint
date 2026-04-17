-- Cloak of Protection — SRD 5.2.1 magic item.
-- Reference encoding for MagicItemRecord with a PassiveMechanics family
-- gated by attunement. The cloak grants +1 AC and +1 to saving throws;
-- the multi-grant (AC + saves) variant lives in
-- magic_item_ring_of_protection.dhall where both grants use a single
-- homogeneous-shape row. Here we keep just the AC grant for the
-- minimal single-atom reference.

let cloak =
      { kind = "magic_item"
      , id = "cloak_of_protection"
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
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  cloak
