-- Prayer of Healing — SRD 5.2.1 Spell, level 2, Abjuration.
--
-- RAW (Spells / Descriptions M-P / Prayer of Healing):
--   "Up to five creatures of your choice who remain within range for
--    the spell's entire casting gain the benefits of a Short Rest and
--    also regain 2d8 Hit Points. A creature can't be affected by this
--    spell again until that creature finishes a Long Rest."
--   "Using a Higher-Level Spell Slot. The healing increases by 1d8
--    for each spell slot level above 2."
--
-- Casting Time: 10 minutes. Range: 30 ft. Duration: Instantaneous.
-- Components: V.
--
-- Encodes the SRD 5.2.1 spell shell and full recipient-facing effect:
--   • CastingTime.minutes with amount=10, ritual=False (second
--     instance after Alarm — confirms the 10-minute-cast shape
--     generalizes to non-ritual spells).
--   • TargetSelection.choose_up_to with fixed numeric count 5 (no
--     SlotScaling — the cap doesn't widen per slot; the per-target
--     heal does), creature targets, and the SRD requirement that each
--     recipient remain within range for the spell's entire casting.
--   • heal_hp with linear_per_level DiceAmount (2d8, +1d8 per slot
--     above 2; no spellcasting ability modifier in SRD 5.2.1).
--   • grant_rest_benefit(short_rest) and spell_recipient_rest_lockout
--     as executable source facts. Character Sheet rest application,
--     Spell Slot spend timing, and lockout state remain runtime-owner
--     follow-up work.

let DiceExpr : Type = { dice : Natural, dieSize : Natural }

let DiceExprDelta : Type = { dice : Natural, dieSize : Optional Natural }

let DiceAmount : Type =
      { kind : Text
      , axis : Optional Text
      , base : Optional DiceExpr
      , perLevel : Optional DiceExprDelta
      , startingAtLevel : Optional Natural
      }

let Effect : Type =
      { kind : Text
      , amount : Optional DiceAmount
      , target : Optional Text
      , benefit : Optional Text
      , resetBy : Optional Text
      }

let healingAmount : DiceAmount =
      { kind = "linear_per_level"
      , axis = Some "slot"
      , base = Some { dice = 2, dieSize = 8 }
      , perLevel = Some { dice = 1, dieSize = None Natural }
      , startingAtLevel = Some 2
      }

let healing : Effect =
      { kind = "heal_hp"
      , amount = Some healingAmount
      , target = Some "target_creature"
      , benefit = None Text
      , resetBy = None Text
      }

let shortRestBenefit : Effect =
      { kind = "grant_rest_benefit"
      , amount = None DiceAmount
      , target = Some "target_creature"
      , benefit = Some "short_rest"
      , resetBy = None Text
      }

let recipientLockout : Effect =
      { kind = "spell_recipient_rest_lockout"
      , amount = None DiceAmount
      , target = Some "target_creature"
      , benefit = None Text
      , resetBy = Some "target_finishes_long_rest"
      }

let prayerOfHealing =
      { kind = "spell"
      , id = "prayer_of_healing"
      , name = "Prayer of Healing"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Prayer of Healing"
          }
      , description =
          "Up to five creatures of your choice who remain within range for the spell's entire casting gain the benefits of a Short Rest and also regain 2d8 Hit Points. A creature can't be affected by this spell again until that creature finishes a Long Rest. Using a Higher-Level Spell Slot. The healing increases by 1d8 for each spell slot level above 2."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "abjuration"
          , castingTime =
              { kind = "minutes"
              , amount = 10
              , ritual = False
              }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = False, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "prayer_of_healing_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count = 5
                            , targetKinds = [ "creature" ]
                            , castingRequirement =
                                { kind =
                                    "remain_within_spell_range_for_entire_casting"
                                }
                            }
                        }
                    }
                , effects = [ healing, shortRestBenefit, recipientLockout ]
                }
              ]
          }
      }

in  prayerOfHealing
