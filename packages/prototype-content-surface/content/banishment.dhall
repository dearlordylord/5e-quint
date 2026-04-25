-- Banishment — SRD 5.2.1 Spell, level 4, Abjuration.
--
-- RAW (Spells / Descriptions A-D / Banishment):
--   "One creature that you can see within range must succeed on a
--    Charisma saving throw or be transported to a harmless demiplane
--    for the duration. While there, the target has the Incapacitated
--    condition. When the spell ends, the target reappears in the space
--    it left or in the nearest unoccupied space if that space is
--    occupied."
--   "If the target is an Aberration, a Celestial, an Elemental, a Fey,
--    or a Fiend, the target doesn't return if the spell lasts for 1
--    minute. The target is instead transported to a random location on
--    a plane (GM's choice) associated with its creature type."
--   "Using a Higher-Level Spell Slot. You can target one additional
--    creature for each spell slot level above 4."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Save gate → apply_condition
-- incapacitated + concentration 1 minute + slot-scaled target count
-- all compose with the current surface after the prior digest's
-- widenings (apply_condition atom, Incapacitated in CONDITIONS,
-- SlotScaling on choose_up_to.count).
--
-- DM AGENDA / spatial. The "transport to a harmless demiplane" is
-- spatial/narrative (ARCHITECTURE.md §1): location changes are
-- caller-owned. The mechanical state while there — Incapacitated
-- for the concentration window — is the deterministic core and is
-- what we encode. "Reappears in the space it left or in the nearest
-- unoccupied space" is likewise spatial (positioning resolved by
-- session). The creature-type permanent-exile clause (Aberration /
-- Celestial / Elemental / Fey / Fiend → "transported to a random
-- location on a plane, GM's choice") is explicitly GM-owned per
-- RAW and omitted.

let banishment =
      { kind = "spell"
      , id = "banishment"
      , name = "Banishment"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Banishment"
          }
      , description =
          "One creature that you can see within range must succeed on a Charisma saving throw or be transported to a harmless demiplane for the duration. While there, the target has the Incapacitated condition. When the spell ends, the target reappears in the space it left or in the nearest unoccupied space if that space is occupied. If the target is an Aberration, a Celestial, an Elemental, a Fey, or a Fiend, the target doesn't return if the spell lasts for 1 minute. The target is instead transported to a random location on a plane (GM's choice) associated with its creature type. Using a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 4."
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components =
              { v = True
              , s = True
              , m = Some "a pentacle"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "banishment_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count =
                                { kind = "linear"
                                , base = 1
                                , perSlotAboveBase = 1
                                , baseLevel = 4
                                }
                            }
                        }
                    }
                , ability = "cha"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition = "incapacitated"
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  banishment
