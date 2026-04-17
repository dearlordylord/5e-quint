-- Compulsion — SRD 5.2.1 Spell, level 4, Enchantment.
--
-- RAW (Spells / Descriptions A-D / Compulsion):
--   "Each creature of your choice that you can see within range must
--    succeed on a Wisdom saving throw or have the Charmed condition
--    until the spell ends."
--   "For the duration, you can take a Bonus Action to designate a
--    direction that is horizontal to you. Each Charmed target must
--    use as much of its movement as possible to move in that
--    direction on its next turn, taking the safest route. After
--    moving in this way, a target repeats the save, ending the spell
--    on itself on a success."
--
-- VALIDATION REFERENCE (landed: TargetSelection.any_number). First
-- pressure case for the new `any_number` target-selection mode —
-- "each creature of your choice within range" with no numeric cap.
-- Shared widening with Beacon of Hope and Divine Word.
--
-- Core shape encoded: WIS save → Charmed + concentration 1 minute
-- over an any_number target selection. Exercises the save_gate phase
-- with apply_condition EffectAtom.
--
-- DEFERRED. The ongoing Bonus-Action-directed-movement rider is not
-- encoded. It needs:
--   1. An activated-on-turn ongoing operation atom (caster BA during
--      concentration triggers forced movement on each charmed target).
--   2. A post-movement repeat-save cadence ("after moving in this way,
--      a target repeats the save") — new cadence variant beyond the
--      current `end_of_target_turn` in RepeatSaveSpec. See DEFERRED.md
--      §A9 (on-damage cadence) for the sibling case.
--   3. Spatial resolution ("safest route", "horizontal direction",
--      "as much of its movement as possible") is DM/caller agenda
--      per ARCHITECTURE.md §1.
--
-- "That you can see" — perception predicate, caller/DM agenda.

let compulsion =
      { kind = "spell"
      , id = "compulsion"
      , name = "Compulsion"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Compulsion"
          }
      , description =
          "Each creature of your choice that you can see within range must succeed on a Wisdom saving throw or have the Charmed condition until the spell ends. For the duration, you can take a Bonus Action to designate a direction that is horizontal to you. Each Charmed target must use as much of its movement as possible to move in that direction on its next turn, taking the safest route. After moving in this way, a target repeats the save, ending the spell on itself on a success."
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "target"
                    , selection = { mode = "any_number" }
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

in  compulsion
