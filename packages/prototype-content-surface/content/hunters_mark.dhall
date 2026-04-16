-- Hunter's Mark — SRD 5.2.1 Spell, level 1, Divination.
-- Primary mechanic: mark one creature; +1d6 Force on attack-roll hits against it.
-- Mark transfer: if target drops to 0 HP, Bonus Action to move mark to a new creature.
--
-- OMITTED (surface_widening):
--   "You also have Advantage on any Wisdom (Perception or Survival) check you
--    make to find it." — no OngoingOperation variant exists for skill-check
--    advantage; the operation field is also singular (no array support).
--
-- OMITTED (surface_widening):
--   Upcast duration scaling: slot 3-4 → up to 8 hours; slot 5+ → up to 24 hours.
--   Duration type has no slot-scaling variant.

let huntersMark =
      { kind = "spell"
      , id = "hunters_mark"
      , name = "Hunter's Mark"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-G-P#Hunter's Mark"
          }
      , description =
          "You magically mark one creature you can see within range as your quarry. Until the spell ends, you deal an extra 1d6 Force damage to the target whenever you hit it with an attack roll. You also have Advantage on any Wisdom (Perception or Survival) check you make to find it. If the target drops to 0 Hit Points before this spell ends, you can take a Bonus Action to move the mark to a new creature you can see within range."
      , mechanics =
          { family = "ongoing_effect"
          , level = 1
          , school = "divination"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "point", feet = 90 }
          , components = { v = True, s = False, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , attachment =
              { kind = "mark"
              , selection = { mode = "one" }
              , transfer =
                  Some
                    { onEvent = { kind = "target_drops_to_0_hp" }
                    , cost = { kind = "bonus_action" }
                    }
              }
          , operation =
              { kind = "damage_on_hit"
              , damageType = "force"
              , amount =
                  { kind = "fixed"
                  , expr = { dice = 1, dieSize = 6 }
                  }
              }
          }
      }

in  huntersMark
