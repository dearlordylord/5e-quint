-- Harm — SRD 5.2.1 Spell, level 6, Necromancy (Cleric).
--
-- RAW (Spells / Descriptions E-L / Harm):
--   "You unleash virulent magic on a creature you can see within
--    range. The target makes a Constitution saving throw. On a failed
--    save, it takes 14d6 Necrotic damage, and its Hit Point maximum
--    is reduced by an amount equal to the Necrotic damage it took.
--    On a successful save, it takes half as much damage only. This
--    spell can't reduce a target's Hit Point maximum below 1."
--
-- §A14 VALIDATION REFERENCE. Exercises DiceAmount.linked on
-- modify_max_hp: the max-HP reduction is equal in magnitude to the
-- Necrotic damage the target just took in this same save_gate phase.
-- Also exercises the modify_max_hp `direction = "decrease"` +
-- `floor = 1` widening — first SRD unit that reduces (rather than
-- increases) maximum HP.
--
-- The "only" in "half as much damage only" caps the onSuccess
-- branch: on success the target takes half damage AND the max-HP
-- reduction does not apply. Encoded as the standard half_damage
-- sentinel on onSuccess while modify_max_hp lives in the onFail
-- composite.

let harm =
      { kind = "spell"
      , id = "harm"
      , name = "Harm"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Harm"
          }
      , description =
          "You unleash virulent magic on a creature you can see within range. The target makes a Constitution saving throw. On a failed save, it takes 14d6 Necrotic damage, and its Hit Point maximum is reduced by an amount equal to the Necrotic damage it took. On a successful save, it takes half as much damage only. This spell can't reduce a target's Hit Point maximum below 1."
      , mechanics =
          { family = "activation"
          , level = 6
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              let DamageAmount
                    : Type
                    = { kind : Text
                      , expr :
                          { dice : Natural
                          , dieSize : Natural
                          , flat : Natural
                          }
                      }
              let LinkedDelta
                    : Type
                    = { kind : Text
                      , link : { kind : Text, scale : Text }
                      }
              let CompEffect
                    : Type
                    = { kind : Text
                      , damageType : Optional Text
                      , amount : Optional DamageAmount
                      , delta : Optional LinkedDelta
                      , direction : Optional Text
                      , floor : Optional Natural
                      }
              let dmg
                    : CompEffect
                    = { kind = "damage"
                      , damageType = Some "necrotic"
                      , amount =
                          Some
                            { kind = "fixed"
                            , expr = { dice = 14, dieSize = 6, flat = 0 }
                            }
                      , delta = None LinkedDelta
                      , direction = None Text
                      , floor = None Natural
                      }
              let maxHpDrop
                    : CompEffect
                    = { kind = "modify_max_hp"
                      , damageType = None Text
                      , amount = None DamageAmount
                      , delta =
                          Some
                            { kind = "linked"
                            , link =
                                { kind = "damage_taken"
                                , scale = "full"
                                }
                            }
                      , direction = Some "decrease"
                      , floor = Some 1
                      }
              in  [ { kind = "save_gate"
                    , attachment =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    , ability = "con"
                    , dc = { kind = "caster_spell_save_dc" }
                    , onFail =
                        { kind = "composite"
                        , effects = [ dmg, maxHpDrop ]
                        }
                    , onSuccess = { kind = "half_damage" }
                    }
                  ]
          }
      }

in  harm
