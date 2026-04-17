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
-- FULL AUTHOR (after §A13 landed). save_gate onFail = composite of
-- damage (character-axis threshold-tiered 1d6 → 4d6 psychic) +
-- modify_roll_advantage disadvantage on attack_roll with count=1 and
-- expiresOn=end_of_next_turn. The count=1 captures "the next attack
-- roll it makes" (one-shot); the expiresOn bounds it to "before the
-- end of its next turn". Spell Duration is bent from "Instantaneous"
-- to timed 1 round per the Ray of Sickness convention so the rider
-- has a host window to live in.

let AmountRec
    : Type
    = { kind : Text
      , axis : Text
      , base : { dice : Natural, dieSize : Natural }
      , tiers : List { atLevel : Natural, override : { dice : Natural } }
      }

let OnRolls
    : Type
    = List Text

let ExpiryRec
    : Type
    = { kind : Text }

let Rider
    : Type
    = { kind : Text
      , damageType : Optional Text
      , amount : Optional AmountRec
      , mode : Optional Text
      , on : Optional OnRolls
      , count : Optional Natural
      , expiresOn : Optional ExpiryRec
      }

let amount
    : AmountRec
    = { kind = "threshold_tiers"
      , axis = "character"
      , base = { dice = 1, dieSize = 6 }
      , tiers =
          [ { atLevel = 5, override = { dice = 2 } }
          , { atLevel = 11, override = { dice = 3 } }
          , { atLevel = 17, override = { dice = 4 } }
          ]
      }

let damageRider
    : Rider
    = { kind = "damage"
      , damageType = Some "psychic"
      , amount = Some amount
      , mode = None Text
      , on = None OnRolls
      , count = None Natural
      , expiresOn = None ExpiryRec
      }

let disadvRider
    : Rider
    = { kind = "modify_roll_advantage"
      , damageType = None Text
      , amount = None AmountRec
      , mode = Some "disadvantage"
      , on = Some [ "attack_roll" ]
      , count = Some 1
      , expiresOn = Some { kind = "end_of_next_turn" }
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
          , duration =
              { kind = "timed"
              , value = { unit = "round", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "composite"
                    , effects = [ damageRider, disadvRider ]
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  viciousMockery
