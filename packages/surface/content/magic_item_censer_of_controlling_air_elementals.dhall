-- Censer of Controlling Air Elementals — SRD 5.2.1 magic item
-- (wondrous, rare).
--
-- Honest fit: magic_item + spawned_creature.
--
-- Surface gaps carried in description / proposal rather than invented:
--   • Spawn placement is "in an unoccupied space as close to the
--     censer as possible". The current spawned-creature surface only
--     carries a coarse Range header, not a nearest-valid-space
--     placement rule rooted on the item.
--   • The catalog-ref creature payload cannot express
--     "understands your languages".
--   • The item says the elemental obeys your commands and acts
--     immediately after you, but does not state a command range or an
--     explicit fallback behavior when uncommanded. The current
--     CreatureControl record requires both fields, so the encoding uses
--     conservative placeholders: commandRangeFeet = 0 and
--     defaultBehavior = "dodge_and_avoid".

let censer =
      { kind = "magic_item"
      , id = "magic_item_censer_of_controlling_air_elementals"
      , name = "Censer of Controlling Air Elementals"
      , rarity = "rare"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#CenserOfControllingAirElementals"
          }
      , description =
          "While gently swinging this censer, you can take a Magic action to summon an Air Elemental. The elemental appears in an unoccupied space as close to the censer as possible, understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count. The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action. The censer can't be used this way again until the next dawn."
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
          , range = { kind = "self" }
          , creature =
              { kind = "catalog_ref"
              , monsterId = "air_elemental"
              , displayName = "Air Elemental"
              }
          , control =
              { initiative = "shared_with_caster"
              , turnOrder = "immediately_after_caster"
              , commandCost = { kind = "no_action_required" }
              , commandRangeFeet = 0
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

in  censer
