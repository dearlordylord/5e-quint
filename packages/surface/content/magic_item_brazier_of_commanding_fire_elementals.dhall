-- Brazier of Commanding Fire Elementals — SRD 5.2.1 magic item
-- (wondrous, rare).
--
-- Honest fit: magic_item + spawned_creature.
--
-- Surface gaps carried in description / proposal rather than invented:
--   • Activation requires being within 5 feet of the brazier. The
--     current activation gate vocabulary can express holding/wearing
--     predicates, but not proximity to a placed item.
--   • Spawn placement is "in an unoccupied space as close to the
--     brazier as possible". The current spawned-creature surface only
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

let brazier =
      { kind = "magic_item"
      , id = "magic_item_brazier_of_commanding_fire_elementals"
      , name = "Brazier of Commanding Fire Elementals"
      , rarity = "rare"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#BrazierOfCommandingFireElementals"
          }
      , description =
          "While you are within 5 feet of this brazier, you can take a Magic action to summon a Fire Elemental. The elemental appears in an unoccupied space as close to the brazier as possible, understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count. The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action. The brazier can't be used this way again until the next dawn."
      , mechanics =
          { family = "spawned_creature"
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
              , monsterId = "fire_elemental"
              , displayName = "Fire Elemental"
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

in  brazier
