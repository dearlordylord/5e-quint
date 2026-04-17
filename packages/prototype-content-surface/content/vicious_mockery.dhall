-- Vicious Mockery — SRD 5.2.1 Cantrip, Enchantment (Bard).
--
-- RAW (Spells / Descriptions S-Z / Vicious Mockery):
--   "You unleash a string of insults laced with subtle enchantments
--    at one creature you can see or hear within range. The target
--    must succeed on a Wisdom saving throw or take 1d6 Psychic damage
--    and have Disadvantage on the next attack roll it makes before
--    the end of its next turn."
--   "Cantrip Upgrade. The damage increases by 1d6 when you reach
--    levels 5 (2d6), 11 (3d6), and 17 (4d6)."
--
-- PARTIAL AUTHOR. Core damage branch encoded via save_gate phase
-- with WIS save, onFail = psychic damage (character-level threshold
-- tiers), onSuccess = none.
--
-- DEFERRED. The "Disadvantage on the next attack roll it makes
-- before the end of its next turn" rider is NOT encoded. Blocker:
-- `EffectAtom.modify_roll_advantage` has no `count` field and no
-- `expiresOn` field — so it cannot express "the NEXT attack roll
-- only" with a turn-scoped expiry. The mastery-side
-- `ModifyRollAdvantageRider` (used for Sap) does carry these fields,
-- but is not reachable from a save_gate's onFail EffectAtom slot.
--
-- Authoring this rider without those fields would over-apply — it
-- would impose disadvantage on all attack rolls for the spell's
-- duration, which diverges from RAW ("next attack roll it makes").
-- Honest omission per CLAUDE.md SRD-feature-parity rule.
--
-- Proposed future widening: extend `EffectAtom.modify_roll_advantage`
-- with optional `count: number` + `expiresOn: RiderExpiry` fields,
-- unifying the spell-Effect path with the mastery rider shape. Once
-- landed, add a composite onFail bundling damage + this rider, and
-- bend Duration to `timed, 1 round` to bound the rider expiry
-- (matching the Ray of Sickness convention).

let amount =
      { kind = "threshold_tiers"
      , axis = "character"
      , base = { dice = 1, dieSize = 6 }
      , tiers =
          [ { atLevel = 5, override = { dice = 2 } }
          , { atLevel = 11, override = { dice = 3 } }
          , { atLevel = 17, override = { dice = 4 } }
          ]
      }

let viciousMockery =
      { kind = "spell"
      , id = "vicious_mockery"
      , name = "Vicious Mockery"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Vicious Mockery"
          }
      , description =
          "You unleash a string of insults laced with subtle enchantments at one creature you can see or hear within range. The target must succeed on a Wisdom saving throw or take 1d6 Psychic damage and have Disadvantage on the next attack roll it makes before the end of its next turn. Cantrip Upgrade. The damage increases by 1d6 when you reach levels 5 (2d6), 11 (3d6), and 17 (4d6)."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = False, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "damage"
                    , damageType = "psychic"
                    , amount = amount
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  viciousMockery
