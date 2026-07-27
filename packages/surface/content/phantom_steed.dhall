-- Phantom Steed - SRD 5.2.1 Spell, level 3, Illusion.
--
-- Surface owns the Spell Definition, the spell-created mount source facts,
-- the existing Riding Horse catalog reference, the spell-specific Speed
-- override, and the table travel/equipment facts needed by a future mount
-- owner. Battle runtime support is intentionally not claimed here: placement,
-- rider selection/control, travel pace, damage-triggered spell end, and the
-- one-minute fade/dismount grace need a promoted mount lifecycle owner.

let phantomSteed =
      { kind = "spell"
      , id = "phantom_steed"
      , name = "Phantom Steed"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Phantom Steed"
          }

      , mechanics =
          { family = "spawned_creature"
          , level = 3
          , school = "illusion"
          , castingTime = { kind = "minutes", amount = 1, ritual = True }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , creature =
              { kind = "catalog_ref"
              , monsterId = "stat_block_riding_horse"
              , displayName = "Riding Horse"
              , overrides =
                  { speeds =
                      [ { kind = "walk"
                        , feet = { kind = "literal", value = 100 }
                        , requiresSlotLevel = None Natural
                        }
                      ]
                  }
              }
          , mount =
              { riderPermission = "caster_or_chosen_creature"
              , hourlyTravelMiles = 13
              , createdEquipment =
                  { items = [ "saddle", "bit", "bridle" ]
                  , vanishesIfCarriedMoreThanFeetFromCreature = 10
                  }
              }
          , dismissal =
              { onSpellEnd =
                  { kind = "gradual_fade"
                  , riderDismountGrace = { unit = "minute", amount = 1 }
                  }
              , onSpawnedCreatureDamage = "spell_ends"
              }
          }
      }

in  phantomSteed
