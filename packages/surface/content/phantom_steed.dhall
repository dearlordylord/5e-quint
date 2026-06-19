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
      , description =
          "A Large, quasi-real, horselike creature appears on the ground in an unoccupied space of your choice within range. You decide its appearance, and it is equipped with a saddle, bit, and bridle; that equipment vanishes if carried more than 10 feet from the steed. For the duration, you or a creature you choose can ride the steed. The steed uses the Riding Horse stat block, except it has a Speed of 100 feet and can travel 13 miles in an hour. When the spell ends, the steed gradually fades, giving the rider 1 minute to dismount. The spell ends early if the steed takes any damage."
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
              }
          }
      }

in  phantomSteed
