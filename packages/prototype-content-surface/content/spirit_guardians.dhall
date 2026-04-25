-- Spirit Guardians — SRD 5.2.1 Spell, Level 3, Conjuration.
-- Family: ongoing_effect, per-turn save_gate inside a 15-ft
-- emanation. §A15-unlocked partial.
--
-- PARTIAL.
--   • "good or neutral → Radiant, evil → Necrotic" — damage type
--     picks by caster alignment, which is DM-agenda allegiance-
--     adjacent metadata. Encoded as a CastTimeChoice<DamageType>
--     over [radiant, necrotic]; the alignment coupling is caller-
--     resolved.
--   • "designate creatures to be unaffected" — cast-time allegiance
--     narrowing, DM agenda.
--   • "whenever the Emanation enters a creature's space" is area
--     movement — caller-owned per ARCHITECTURE.md. The remaining
--     two triggers in RAW ("creature enters Emanation", "ends its
--     turn there") both collapse to on_attached_turn_start /
--     on_creature_enters_area; only on_attached_turn_start encoded
--     (the entry-trigger sibling needs the second op slot, but
--     pressures a "once per turn" dedup predicate that isn't yet
--     modeled).

let spiritGuardians =
      { kind = "spell"
      , id = "spirit_guardians"
      , name = "Spirit Guardians"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Spirit Guardians"
          }
      , description =
          "Protective spirits flit around you in a 15-foot Emanation for the duration. Any other creature's Speed is halved in the Emanation, and whenever the Emanation enters a creature's space and whenever a creature enters the Emanation or ends its turn there, the creature must make a Wisdom saving throw. On a failed save, the creature takes 3d8 Radiant damage (if you are good or neutral) or 3d8 Necrotic damage (if you are evil). On a successful save, the creature takes half as much damage. A creature makes this save only once per turn."
      , mechanics =
          { family = "ongoing_effect"
          , level = 3
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = Some "a prayer scroll" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment =
              { kind = "area"
              , shape = { kind = "emanation", radiusFeet = 15 }
              , origin = { kind = "self" }
              }
          -- Two heterogeneous ops (passive speed ratio + per-turn
          -- save_gate). Dhall homogeneity — Optional-field trick.
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "set_speed_ratio"
                    , numerator = Some 1
                    , denominator = Some 2
                    , ability = None Text
                    , dc = None { kind : Text }
                    , onFail =
                        None
                          { kind : Text
                          , damageType :
                              { kind : Text
                              , holeId : Text
                              , label : Text
                              , value :
                                  { kind : Text
                                  , label : Text
                                  , options : List Text
                                  }
                              }
                          , amount :
                              { kind : Text
                              , axis : Text
                              , base : { dice : Natural, dieSize : Natural }
                              , perLevel : { dice : Natural }
                              , startingAtLevel : Natural
                              }
                          }
                    , onSuccess = None { kind : Text }
                    }
                }
              , { trigger = { kind = "on_attached_turn_start" }
                , effect =
                    { kind = "save_gate"
                    , numerator = None Natural
                    , denominator = None Natural
                    , ability = Some "wis"
                    , dc = Some { kind = "caster_spell_save_dc" }
                    , onFail =
                        Some
                          { kind = "damage"
                          , damageType =
                              { kind = "hole"
                              , holeId = "spirit_guardians_damage_type"
                              , label = "radiant (good/neutral caster) or necrotic (evil caster)"
                              , value =
                                  { kind = "choice"
                                  , label = "radiant (good/neutral caster) or necrotic (evil caster)"
                                  , options = [ "radiant", "necrotic" ]
                                  }
                              }
                          , amount =
                              { kind = "linear_per_level"
                              , axis = "slot"
                              , base = { dice = 3, dieSize = 8 }
                              , perLevel = { dice = 1 }
                              , startingAtLevel = 3
                              }
                          }
                    , onSuccess = Some { kind = "half_damage" }
                    }
                }
              ]
          }
      }

in  spiritGuardians
