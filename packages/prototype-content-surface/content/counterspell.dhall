-- Counterspell — SRD 5.2.1 Spell, Level 3, Abjuration.
-- Family: triggered_reaction (unified §C1 — phases shape).
-- Trigger: creature_casts_spell with any V/S/M component within 60 ft.
-- Phase: save_gate (Con), caster slot ≥ triggering spell level auto-
-- succeeds; onFail negates the triggering spell.
--
-- Counterspell's cast is itself a spell (S-component), so another
-- mage's Counterspell can fire against it — the trigger grammar
-- handles the recursion without special casing; action-economy (1
-- reaction/round) is caller-owned.

let counterspell =
      { kind = "spell"
      , id = "counterspell"
      , name = "Counterspell"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Counterspell"
          }
      , description =
          "You attempt to interrupt a creature in the process of casting a spell. The creature makes a Constitution saving throw. On a failed save, the spell dissipates with no effect, and the action, Bonus Action, or Reaction used to cast it is wasted; if a slot was used, the slot isn't expended. Using a Higher-Level Spell Slot: you automatically end a spell on the target if the spell's level is equal to or less than the level of the spell slot you use."
      , mechanics =
          { family = "triggered_reaction"
          , level = 3
          , school = "abjuration"
          , castingTime =
              { kind = "reaction"
              , trigger =
                  { kind = "creature_casts_spell"
                  , spellId = None Text
                  , components = Some [ "V", "S", "M" ]
                  }
              }
          , range = { kind = "point", feet = 60 }
          , components = { v = False, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , interruptsTrigger = True
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , ability = "con"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail = { kind = "negate_triggering_spell" }
                , onSuccess = { kind = "none" }
                , autoSuccessIfCasterSlotGte = "triggering_spell_level"
                }
              ]
          }
      }

in  counterspell
