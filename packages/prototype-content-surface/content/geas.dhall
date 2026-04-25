-- Geas — SRD 5.2.1 Spell, level 5, Enchantment.
--
-- RAW (Spells / Descriptions E-L / Geas):
--   "You give a verbal command to a creature that you can see within
--    range, ordering it to carry out some service or refrain from an
--    action or a course of activity as you decide. The target must
--    succeed on a Wisdom saving throw or have the Charmed condition
--    for the duration. The target automatically succeeds if it can't
--    understand your command."
--   "While Charmed, the creature takes 5d10 Psychic damage if it acts
--    in a manner directly counter to your command. It takes this
--    damage no more than once each day."
--   "You can issue any command you choose, short of an activity that
--    would result in certain death. Should you issue a suicidal
--    command, the spell ends."
--   "A Remove Curse, Greater Restoration, or Wish spell ends this
--    spell."
--   "Using a Higher-Level Spell Slot. If you use a level 7 or 8 spell
--    slot, the duration is 365 days. If you use a level 9 spell slot,
--    the spell lasts until it is ended by one of the spells mentioned
--    above."
--
-- ZERO-WIDENING VALIDATION REFERENCE for the save-gate + apply
-- Charmed core with a timed multi-day duration. Exercises
-- DurationValue.upcastTiers across day units (base 30 days; tier at
-- slot 7 switches to 365 days — applies at slot 7 and above).
--
-- DM AGENDA. The 5d10-once-per-day-if-counter-command compliance
-- damage is behavior-judgment-gated ("acts in a manner directly
-- counter to your command") and per ARCHITECTURE.md §1 is DM agenda
-- (same class as Charm Person's "fighting" predicate and Suggestion's
-- commanded behavior). Not encoded. "Automatically succeeds if it
-- can't understand your command" is a language/comprehension
-- predicate, also DM agenda.
--
-- DEFERRED. "If you use a level 9 spell slot, the spell lasts until
-- it is ended by one of the spells mentioned above" — a
-- permanent/until-dispelled Duration variant does not yet exist (see
-- ties to sequester / telekinesis's pressure for that widening).
-- The upcastTier at slot 7 extends to slot 8 and would incorrectly
-- apply at slot 9 in our model (365 days instead of until-dispelled);
-- noted here, deferred to the `permanent`/`until_dispelled` Duration
-- widening. The "spell ends if you issue a suicidal command" is a
-- DM-adjudicated termination trigger (what counts as suicidal is
-- session-resolved). The "Remove Curse / Greater Restoration / Wish
-- ends this spell" is named-spell dispel; those spells' mechanics are
-- authored separately and the caller wires the termination.

let geas =
      { kind = "spell"
      , id = "geas"
      , name = "Geas"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Geas"
          }
      , description =
          "You give a verbal command to a creature that you can see within range, ordering it to carry out some service or refrain from an action or a course of activity as you decide. The target must succeed on a Wisdom saving throw or have the Charmed condition for the duration. The target automatically succeeds if it can't understand your command. While Charmed, the creature takes 5d10 Psychic damage if it acts in a manner directly counter to your command. It takes this damage no more than once each day. You can issue any command you choose, short of an activity that would result in certain death. Should you issue a suicidal command, the spell ends. A Remove Curse, Greater Restoration, or Wish spell ends this spell. Using a Higher-Level Spell Slot. If you use a level 7 or 8 spell slot, the duration is 365 days. If you use a level 9 spell slot, the spell lasts until it is ended by one of the spells mentioned above."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "enchantment"
          , castingTime =
              { kind = "minutes", amount = 1, ritual = False }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = False, m = False }
          , duration =
              { kind = "timed"
              , value =
                  { unit = "day"
                  , amount = 30
                  , upcastTiers = [ { atSlot = 7, amount = 365 } ]
                  }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "geas_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition = "charmed"
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  geas
