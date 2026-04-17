-- Charm Person — SRD 5.2.1 Spell, level 1, Enchantment.
--
-- RAW (Spells / Descriptions A-D / Charm Person):
--   "One Humanoid you can see within range makes a Wisdom saving
--    throw. It does so with Advantage if you or your allies are
--    fighting it. On a failed save, the target has the Charmed
--    condition until the spell ends or until you or your allies
--    damage it. The Charmed creature is Friendly to you. When the
--    spell ends, the target knows it was Charmed by you."
--   "Using a Higher-Level Spell Slot. You can target one additional
--    creature for each spell slot level above 1."
--
-- Consolidated validation reference for:
--   • TargetSelection.choose_up_to.typeFilter = [ "humanoid" ]
--     (second instance after Hold Person; confirms the target-side
--     creature-type filter generalizes across spells.)
--   • Duration.timed.earlyEnd = [ target_damaged_by_caster_or_ally ]
--     (new trigger variant added for the "or until you or your allies
--     damage it" RAW clause; the "ally" side is DM agenda.)
--   • save_gate onFail apply_condition charmed.
--
-- DM AGENDA. "It does so with Advantage if you or your allies are
-- fighting it" — the "fighting" predicate is situational and
-- session-resolved; not modeled. "Friendly to you" and "knows it was
-- Charmed by you when the spell ends" are narrative consequences of
-- the Charmed condition, already implied by RAW.

let charmPerson =
      { kind = "spell"
      , id = "charm_person"
      , name = "Charm Person"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Charm Person"
          }
      , description =
          "One Humanoid you can see within range makes a Wisdom saving throw. It does so with Advantage if you or your allies are fighting it. On a failed save, the target has the Charmed condition until the spell ends or until you or your allies damage it. The Charmed creature is Friendly to you. When the spell ends, the target knows it was Charmed by you. Using a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              , earlyEnd =
                  [ { kind = "target_damaged_by_caster_or_ally" } ]
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "target"
                    , selection =
                        { mode = "choose_up_to"
                        , count =
                            { kind = "linear"
                            , base = 1
                            , perSlotAboveBase = 1
                            , baseLevel = 1
                            }
                        , typeFilter = [ "humanoid" ]
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

in  charmPerson
