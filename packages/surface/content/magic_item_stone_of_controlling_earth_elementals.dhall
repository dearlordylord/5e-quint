-- Stone of Controlling Earth Elementals — SRD 5.2.1 magic item
-- (wondrous, rare).
--
-- Honest fit: magic_item + spawned_creature.
--
-- Surface gaps carried in description / proposal rather than invented:
--   • Activation requires touching the stone to the ground; the current
--     activation gate vocabulary can express holding/wearing predicates
--     but not ground-contact while activating.
--   • The item says the elemental obeys your commands and acts
--     immediately after you, but does not state a command range or an
--     explicit fallback behavior when uncommanded. The current
--     CreatureControl record requires both fields, so the encoding uses
--     conservative placeholders: commandRangeFeet = 30 (the only range
--     named in the text) and defaultBehavior = "dodge_and_avoid".

let stone =
      { kind = "magic_item"
      , id = "magic_item_stone_of_controlling_earth_elementals"
      , name = "Stone of Controlling Earth Elementals"
      , rarity = "rare"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#StoneOfControllingEarthElementals"
          }
      , description =
          "While touching this 5-pound stone to the ground, you can take a Magic action to summon an Earth Elemental. The elemental appears in an unoccupied space you choose within 30 feet of yourself, obeys your commands, and takes its turn immediately after you on your Initiative count. The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action. The stone can't be used this way again until the next dawn."
      , mechanics =
          { family = "spawned_creature"
          , condition = { kind = "holding_item" }
          , activationCost =
              { kind = "standard_action"
              , action = "magic"
              }
          , resource =
              { kind = "use_count"
              , cap = { kind = "fixed", uses = 1 }
              }
          , resetCadence = { kind = "dawn" }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , range = { kind = "point", feet = 30 }
          , creature =
              { kind = "catalog_ref"
              , monsterId = "earth_elemental"
              , displayName = "Earth Elemental"
              }
          , control =
              { initiative = "shared_with_caster"
              , turnOrder = "immediately_after_caster"
              , commandCost = { kind = "no_action_required" }
              , commandRangeFeet = 30
              , defaultBehavior = "dodge_and_avoid"
              }
          , dismissal =
              { onZeroHp = "disappears"
              , onSpellEnd = "disappears"
              , manualDismiss = "bonus_action"
              }
          }
      , destruction = { kind = "none" }
      }

in  stone
