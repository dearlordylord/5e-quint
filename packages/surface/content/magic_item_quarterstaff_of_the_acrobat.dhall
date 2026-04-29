-- Quarterstaff of the Acrobat — SRD 5.2.1 magic item (very rare,
-- requires attunement).
--
-- Honest authored subset:
--   • passive held-item +2 bonus to attack rolls made with the weapon
--   • passive held-item +2 bonus to damage rolls made with the weapon
--
-- Omitted / proposal-backed gaps:
--   • form-changing activation (quarterstaff / 10-foot pole / 6-inch rod)
--     needs an item/object attachment on activation phases so
--     `alter_item_kind` can target the held item rather than `self`
--   • Acrobatic Assist, Attack Deflection, and Ranged Weapon are gated
--     by the item's current form; the surface has no item-form predicate
--     or item-mode state gate for passive / reaction parts
--   • the green dim-light rider needs a light-emission atom not present
--     in the current surface / v4 taxonomy
--   • the thrown-weapon "flies back to your hand" rider needs item-motion
--     support on the authored surface

let SpecificItemFilter = { kind : Text, itemId : Text }

let PassiveEffect =
      { kind : Text
      , delta : { kind : Text, dice : Natural, dieSize : Natural, sign : Text }
      , on : Optional (List Text)
      , weaponFilter : Optional SpecificItemFilter
      }

let quarterstaffOfTheAcrobat =
      { kind = "magic_item"
      , id = "magic_item_quarterstaff_of_the_acrobat"
      , name = "Quarterstaff of the Acrobat"
      , rarity = "very_rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#QuarterstaffOfTheAcrobat"
          }
      , description =
          "You have a +2 bonus to attack rolls and damage rolls made with this magic weapon. While holding this weapon, you can cause it to emit green Dim Light out to 10 feet, either as a Bonus Action or after you roll Initiative, or you can extinguish the light as a Bonus Action. While holding this weapon, you can take a Bonus Action to alter its form, turning it into a 6-inch rod, a 10-foot pole, or reverting it to a Quarterstaff. Additional properties are form-gated: Acrobatic Assist (Quarterstaff and 10-Foot Pole forms), Attack Deflection (Quarterstaff form), and a thrown-property return rider (Quarterstaff form). This authored subset keeps only the unconditional +2 weapon bonus; omitted riders are recorded in proposal-magic_item_quarterstaff_of_the_acrobat.md."
      , mechanics =
          { family = "passive"
          , condition = { kind = "holding_item" }
          , grants =
              [ { kind = "modify_roll_numeric"
                , delta =
                    { kind = "fixed_dice"
                    , dice = 2
                    , dieSize = 1
                    , sign = "+"
                    }
                , on = Some ["attack_roll"]
                , weaponFilter =
                    Some
                      { kind = "specific_item"
                      , itemId = "magic_item_quarterstaff_of_the_acrobat"
                      }
                }
              , { kind = "modify_damage_numeric"
                , delta =
                    { kind = "fixed_dice"
                    , dice = 2
                    , dieSize = 1
                    , sign = "+"
                    }
                , on = None (List Text)
                , weaponFilter =
                    Some
                      { kind = "specific_item"
                      , itemId = "magic_item_quarterstaff_of_the_acrobat"
                      }
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  quarterstaffOfTheAcrobat
