-- Ray of Sickness — SRD 5.2.1 Spell, level 1, Necromancy.
--
-- RAW (Spells / Descriptions Q-R / Ray of Sickness):
--   "You shoot a greenish ray at a creature within range. Make a
--    ranged spell attack against the target. On a hit, the target
--    takes 2d8 Poison damage and has the Poisoned condition until
--    the end of your next turn."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d8
--    for each spell slot level above 1."
--
-- ZERO-WIDENING VALIDATION REFERENCE. attack_roll phase onHit as an
-- array of EffectAtoms layering damage + apply_condition (parallel
-- to Shocking Grasp's damage + deny_opportunity_attack pattern;
-- uses the Dhall Optional-fields-unified record type trick for the
-- homogeneous-list constraint).
--
-- Condition-expiry modeling note. RAW says Poisoned lasts "until the
-- end of your next turn" — a turn-scoped rider. `apply_condition`
-- has no per-atom expiry field. Per the CLAUDE.md encoding rule for
-- turn-scoped riders on attack-roll phases, the spell's Duration is
-- modeled as `timed, 1 round` so the spell (and thus the condition
-- it applied) ends approximately one round after cast, matching
-- "until the end of your next turn" in the SRD's 1-round /
-- end-of-caster-next-turn overlap. RAW header reads "Instantaneous";
-- the 1-round modeling is the minimal-widening faithful encoding
-- that bounds the condition to its SRD expiry.

let AmountRec
    : Type
    = { kind : Text
      , axis : Text
      , base : { dice : Natural, dieSize : Natural }
      , perLevel : { dice : Natural }
      , startingAtLevel : Natural
      }

let HitRider
    : Type
    = { kind : Text
      , damageType : Optional Text
      , amount : Optional AmountRec
      , condition : Optional Text
      }

let damageRider
    : HitRider
    = { kind = "damage"
      , damageType = Some "poison"
      , amount =
          Some
            { kind = "linear_per_level"
            , axis = "slot"
            , base = { dice = 2, dieSize = 8 }
            , perLevel = { dice = 1 }
            , startingAtLevel = 1
            }
      , condition = None Text
      }

let poisonedRider
    : HitRider
    = { kind = "apply_condition"
      , damageType = None Text
      , amount = None AmountRec
      , condition = Some "poisoned"
      }

let rayOfSickness =
      { kind = "spell"
      , id = "ray_of_sickness"
      , name = "Ray of Sickness"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-Q-R#Ray of Sickness"
          }
      , description =
          "You shoot a greenish ray at a creature within range. Make a ranged spell attack against the target. On a hit, the target takes 2d8 Poison damage and has the Poisoned condition until the end of your next turn. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "round", amount = 1 }
              }
          , phases =
              [ { kind = "attack_roll"
                , attachment =
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , attackKind = "ranged_spell_attack"
                , onHit = [ damageRider, poisonedRider ]
                , onMiss = [ { kind = "none" } ]
                }
              ]
          }
      }

in  rayOfSickness
