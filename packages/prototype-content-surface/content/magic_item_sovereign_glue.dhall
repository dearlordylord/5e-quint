-- Sovereign Glue — SRD 5.2.1 magic item (wondrous, legendary).
--
-- RAW (MagicItems / Descriptions):
--   "This viscous, milky-white substance can form a permanent adhesive
--    bond between any two objects. It must be stored in a jar or flask
--    that has been coated inside with Oil of Slipperiness. When found,
--    a container contains 1d6 + 1 ounces."
--   "One ounce of the glue can cover a 1-foot square surface. Applying
--    an ounce of Sovereign Glue takes a Utilize action, and the applied
--    glue takes 1 minute to set. Once it has done so, the bond it creates
--    can be broken only by the application of Universal Solvent or Oil of
--    Etherealness, or with a Wish spell."
--
-- Mechanics:
--   • activation family — each ounce is one activation (Utilize action).
--   • charge_pool resource: 1d6+1 ounces found; cap = 7 (max of 1d6+1).
--   • resetCadence = never (spent ounces are gone permanently).
--   • destruction = permanent_on_empty (empty container is inert).
--   • direct phase: object attachment (count=2), bond_objects atom.
--
-- Omissions:
--   • The 1-minute set delay before the bond becomes permanent has no
--     surface encoding (no delayed-effect timing for non-damage atoms).
--     Noted in proposal-magic_item_sovereign_glue.md.
--   • The storage requirement (jar coated with Oil of Slipperiness) is
--     narrative/DM-agenda — no surface field.
--   • "broken only by Universal Solvent / Oil of Etherealness / Wish" —
--     the bond_objects atom comment explicitly notes these counter-items
--     carry the dispelling semantics in their own content.

let sovereignGlue =
      { kind = "magic_item"
      , id = "magic_item_sovereign_glue"
      , name = "Sovereign Glue"
      , rarity = "legendary"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#SovereignGlue"
          }
      , description =
          "This viscous, milky-white substance can form a permanent adhesive bond between any two objects. It must be stored in a jar or flask that has been coated inside with Oil of Slipperiness. When found, a container contains 1d6 + 1 ounces. One ounce of the glue can cover a 1-foot square surface. Applying an ounce of Sovereign Glue takes a Utilize action, and the applied glue takes 1 minute to set. Once it has done so, the bond it creates can be broken only by the application of Universal Solvent or Oil of Etherealness, or with a Wish spell."
      , mechanics =
          { family = "activation"
          , activationCost =
              { kind = "standard_action"
              , action = "utilize"
              }
          , resource =
              { kind = "charge_pool"
              , cap = { kind = "fixed", uses = 7 }
              , initialCount =
                  Some
                    { kind = "fixed"
                    , expr = { dice = 1, dieSize = 6, flat = 1 }
                    }
              }
          , resetCadence = { kind = "never" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "magic_item_sovereign_glue_object"
                    , label = "target object"
                    , value =
                        { kind = "object"
                        , count = 2
                        }
                    }
                , effects =
                    [ { kind = "bond_objects" }
                    ]
                }
              ]
          }
      , destruction = { kind = "permanent_on_empty" }
      }

in  sovereignGlue
