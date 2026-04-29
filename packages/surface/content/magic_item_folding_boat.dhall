-- Folding Boat — SRD 5.2.1 magic item (Rare, no attunement).
--
-- RAW (Magic-Items#Folding Boat):
--   Three command words, each requiring a Magic action:
--     1st: box → Rowboat
--     2nd: box → Keelboat
--     3rd: vessel → box (only if no creatures aboard; cargo sorts itself)
--   If either vessel is reduced to 0 HP, the item is destroyed.
--
-- Encoding:
--   Composite of three unlimited-use activation mechanics, each applying
--   alter_item_kind. The `alter_item_kind` atom is named in types.ts for
--   exactly this item ("Folding Boat switches between box/rowboat/keelboat").
--
-- SURFACE GAP: ItemDestructionPolicy has no `zero_hp_vessel` variant.
--   Using `none` as placeholder. The real mechanic ("destroyed when vessel
--   HP reaches 0") is not expressible without a new policy variant.
--   See proposal-magic_item_folding_boat.md.
--
-- OMITTED (DM-agenda):
--   "only if no creatures are aboard" precondition on the third command word.
--   No EquipmentPredicate or ActivatedAbilityHeader.condition variant exists
--   for occupant checks; this is resolved at the table.
--
--   Cargo handling ("objects that fit do so; objects that can't remain outside")
--   is purely narrative/DM-adjudicated with no mechanical atom equivalent.

let ActivationPart =
      { family : Text
      , activationCost : { kind : Text, action : Text }
      , resource : { kind : Text, cap : { kind : Text } }
      , resetCadence : { kind : Text }
      , phases :
          List
            { kind : Text
            , attachment : { kind : Text }
            , effects : List { kind : Text, newKind : Text }
            }
      }

let folding_boat =
      { kind = "magic_item"
      , id = "magic_item_folding_boat"
      , name = "Folding Boat"
      , rarity = "rare"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Folding Boat"
          }
      , description =
          "This object appears as a wooden box that measures 12 inches long, 6 inches wide, and 6 inches deep. It weighs 4 pounds and floats. It can be opened to store items inside. This item also has three command words, each requiring a Magic action to use. First Command Word. The box unfolds into a Rowboat. Second Command Word. The box unfolds into a Keelboat. Third Command Word. The Folding Boat folds back into a box if no creatures are aboard. Any objects in the vessel that can't fit inside the box remain outside the box as it folds. Any objects in the vessel that can fit inside the box do so. When the box becomes a vessel, its weight becomes that of a normal vessel its size, and anything that was stored in the box remains in the boat. Statistics for the Rowboat and Keelboat appear in Equipment. If either vessel is reduced to 0 Hit Points, the Folding Boat is destroyed."
      , mechanics =
          { family = "composite"
          , parts =
              [ { family = "activation"
                , activationCost = { kind = "standard_action", action = "magic" }
                , resource =
                    { kind = "use_count", cap = { kind = "unlimited" } }
                , resetCadence = { kind = "never" }
                , phases =
                    [ { kind = "direct"
                      , attachment = { kind = "self" }
                      , effects =
                          [ { kind = "alter_item_kind", newKind = "rowboat" } ]
                      }
                    ]
                } : ActivationPart
              , { family = "activation"
                , activationCost = { kind = "standard_action", action = "magic" }
                , resource =
                    { kind = "use_count", cap = { kind = "unlimited" } }
                , resetCadence = { kind = "never" }
                , phases =
                    [ { kind = "direct"
                      , attachment = { kind = "self" }
                      , effects =
                          [ { kind = "alter_item_kind", newKind = "keelboat" } ]
                      }
                    ]
                } : ActivationPart
              , { family = "activation"
                , activationCost = { kind = "standard_action", action = "magic" }
                , resource =
                    { kind = "use_count", cap = { kind = "unlimited" } }
                , resetCadence = { kind = "never" }
                , phases =
                    [ { kind = "direct"
                      , attachment = { kind = "self" }
                      , effects =
                          [ { kind = "alter_item_kind", newKind = "box" } ]
                      }
                    ]
                } : ActivationPart
              ]
          }
      , destruction = { kind = "none" }
      }

in  folding_boat
