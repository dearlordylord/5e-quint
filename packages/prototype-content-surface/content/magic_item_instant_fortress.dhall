-- Instant Fortress — SRD 5.2.1 magic item.
--
-- RAW (Magic-Items/Items-I-P#Instant Fortress):
--   Magic action → place 1-inch statuette + command word → grows into a
--   20×30 ft adamantine tower. Repeating command word reverts (if empty).
--   Creatures in the area where the tower appears are pushed to unoccupied
--   space outside but next to it. Objects not worn/carried are pushed clear.
--   Tower stats: AC 20; HP 100 per section (roof/door/walls); Immunity to
--   B/P/S except siege equipment; Resistance to all other damage.
--   Door opens via Bonus Action command; immune to Knock and similar magic.
--   Magic prevents tipping. Only Wish can repair; restores all HP per cast.
--
-- Family: activation (magic item) — Magic action deploys the tower.
--
-- ENCODED:
--   • create_object with maxSize gargantuan, shape cube 20 ft (see gap 1)
--   • durability: AC 20, HP 100/section, immunity to bludgeoning/piercing/
--     slashing (see gaps 2 & 3 for resistance and siege exception omissions)
--   • permanent duration (tower persists until manually reverted)
--
-- SURFACE GAPS (all surface_widening — see proposal-magic_item_instant_fortress.md):
--   1. Shape: tower is 20×20×30 ft (rectangular prism); no AreaShapeSpec
--      variant for this. Using cube {sideFeet=20} covers the base footprint
--      but loses the 30 ft height.
--   2. CreatedObjectDurability lacks a `damageResistances` field; the tower's
--      "Resistance to all other damage" is omitted.
--   3. Conditional immunity exception: "except that which is dealt by siege
--      equipment" — no mechanism to express immunity exceptions. Encoded as
--      unconditional B/P/S immunity.
--   4. Reset cadence: item can be redeployed after reverting; no cadence
--      variant for "refills when created object is dismissed/reverted."
--      Using `never` as a placeholder (semantically wrong — see proposal).
--   5. Duration end trigger: the revert is triggered by the owner's command
--      word (a separate Magic action); `permanent.endsOn` only accepts
--      "dispel" | "damage". Revert mechanic is omitted entirely.
--   6. Force-push on creation: "pushed to an unoccupied space outside but
--      next to the tower" is not a fixed-distance push; current `force_move`
--      requires a specific distanceFeet. Omitted.
--   7. Door control: opening/closing the door via Bonus Action — no atom
--      for commanding features of a created object. Omitted.
--   8. Door immunity to Knock: `negate_named_effect` exists but can only
--      attach to a creature or ongoing spell effect, not to a created object's
--      structural property. Omitted.
--   9. "Magic prevents tipping" — DM-owned structural guarantee; no atom.
--  10. "Only Wish can repair" — narrative repair constraint; no atom.

let instantFortress =
      { kind = "magic_item"
      , id = "magic_item_instant_fortress"
      , name = "Instant Fortress"
      , rarity = "rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Magic-Items/Items-I-P#Instant Fortress"
          }
      , description =
          "As a Magic action, you can place this 1-inch adamantine statuette on the ground and, using a command word, cause it to grow rapidly into a square adamantine tower. Repeating the command word causes the tower to revert to statuette form, which works only if the tower is empty. Each creature in the area where the tower appears is pushed to an unoccupied space outside but next to the tower. Objects in the area that aren't being worn or carried are also pushed clear of the tower. The tower is 20 feet on a side and 30 feet high, with arrow slits on all sides and a battlement atop it. When created, the tower has a single door at ground level on the side facing you. The door opens only at your command, which you can issue as a Bonus Action. It is immune to the Knock spell and similar magic. Magic prevents the tower from being tipped over. The roof, the door, and the walls each have AC 20; HP 100; Immunity to Bludgeoning, Piercing, and Slashing damage except that which is dealt by siege equipment; and Resistance to all other damage. Only a Wish spell can repair the tower."
      , mechanics =
          { family = "activation"
          , activationCost =
              { kind = "standard_action"
              , action = "magic"
              }
          , resource =
              { kind = "use_count"
              , cap = { kind = "fixed", uses = 1 }
              }
          -- SURFACE GAP: no "refills when reverted" reset cadence.
          -- `never` is a placeholder; in practice the item redeploys freely
          -- after the tower is reverted to statuette form.
          , resetCadence = { kind = "never" }
          , duration = { kind = "permanent" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "create_object"
                      , maxSize = "gargantuan"
                      -- SURFACE GAP: rectangular prism (20×20×30 ft) not in
                      -- AreaShapeSpec; cube covers the base footprint only.
                      , shape = { kind = "cube", sideFeet = 20 }
                      , durability =
                          { acValue = 20
                          , hpPerSection = 100
                          -- SURFACE GAP: immunity exception for siege
                          -- equipment cannot be expressed; encoded as
                          -- unconditional.
                          , damageImmunities =
                              [ "bludgeoning"
                              , "piercing"
                              , "slashing"
                              ]
                          -- SURFACE GAP: damageResistances field missing
                          -- from CreatedObjectDurability; tower's
                          -- "Resistance to all other damage" is omitted.
                          }
                      }
                    ]
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  instantFortress
