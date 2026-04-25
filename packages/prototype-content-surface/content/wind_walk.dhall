-- Wind Walk — SRD 5.2.1 Spell, level 6, Transmutation.
--
-- RAW (Spells / Descriptions S-Z / Wind Walk):
--   "You and up to ten willing creatures of your choice within range
--    assume gaseous forms for the duration, appearing as wisps of cloud.
--    While in this cloud form, a target has a Fly Speed of 300 feet and
--    can hover; it has Immunity to the Prone condition; and it has
--    Resistance to Bludgeoning, Piercing, and Slashing damage. The only
--    actions a target can take in this form are the Dash action or a
--    Magic action to begin reverting to its normal form. Reverting takes
--    1 minute, during which the target has the Stunned condition. Until
--    the spell ends, the target can revert to cloud form, which also
--    requires a Magic action followed by a 1-minute transformation.
--    If a target is in cloud form and flying when the effect ends, the
--    target descends 60 feet per round for 1 minute until it lands,
--    which it does safely. If it can't land after 1 minute, it falls
--    the remaining distance."
--
-- PARTIAL. Encoded:
--   • composite { grant_speed fly 300 hover,
--                 grant_condition_immunity prone,
--                 grant_resistance bludgeoning,
--                 grant_resistance piercing,
--                 grant_resistance slashing }
--   • TargetSelection.choose_up_to 11 (caster + up to 10 others;
--     no "self_plus_N" attachment mode exists; count = 11 approximates
--     the RAW wording "you and up to ten").
--
-- DEFERRED (atom_widening):
--   • "The only actions a target can take are the Dash action or a
--     Magic action" — requires a standalone restrict_action_set
--     EffectAtom. The existing ActionRestriction type only appears on
--     grant_extra_action; no direct-grant variant exists.
--   • Reversion mechanic: "Magic action to begin reverting; reverting
--     takes 1 minute, during which the target has the Stunned condition"
--     — requires a timed mode-switch shape with a condition applied
--     during the transition. No surface model exists (CastTimeEffectModeChoice
--     allows instant switches only).
--   • Re-entry into cloud form via another Magic action + 1-minute
--     transformation — same gap as reversion.
--   • Fall-safe clause: "descends 60 feet per round for 1 minute" at
--     spell end in cloud form — requires fall_on_end atom (present in
--     v4 taxonomy but absent from current types.ts EffectAtom).

let windWalk =
      { kind = "spell"
      , id = "wind_walk"
      , name = "Wind Walk"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Wind Walk"
          }
      , description =
          "You and up to ten willing creatures of your choice within range assume gaseous forms for the duration, appearing as wisps of cloud. While in this cloud form, a target has a Fly Speed of 300 feet and can hover; it has Immunity to the Prone condition; and it has Resistance to Bludgeoning, Piercing, and Slashing damage. The only actions a target can take in this form are the Dash action or a Magic action to begin reverting to its normal form. Reverting takes 1 minute, during which the target has the Stunned condition. Until the spell ends, the target can revert to cloud form, which also requires a Magic action followed by a 1-minute transformation. If a target is in cloud form and flying when the effect ends, the target descends 60 feet per round for 1 minute until it lands, which it does safely. If it can't land after 1 minute, it falls the remaining distance."
      , mechanics =
          { family = "activation"
          , level = 6
          , school = "transmutation"
          , castingTime = { kind = "minutes", amount = 1, ritual = False }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = Some "a candle" }
          , duration = { kind = "timed", value = { unit = "hour", amount = 8 } }
          , phases =
              -- Supertype that can represent all three EffectAtom variants
              -- used in the composite list (Dhall requires homogeneous lists).
              -- dhall-to-json --omit-empty drops None fields, leaving only the
              -- relevant JSON discriminant fields for each variant.
              let Effect
                    : Type
                    = { kind : Text
                      , speedKind : Optional Text
                      , feet : Optional Natural
                      , hover : Optional Bool
                      , condition : Optional Text
                      , damageType : Optional Text
                      }
              let grantFly
                    : Effect
                    = { kind = "grant_speed"
                      , speedKind = Some "fly"
                      , feet = Some 300
                      , hover = Some True
                      , condition = None Text
                      , damageType = None Text
                      }
              let grantProne
                    : Effect
                    = { kind = "grant_condition_immunity"
                      , speedKind = None Text
                      , feet = None Natural
                      , hover = None Bool
                      , condition = Some "prone"
                      , damageType = None Text
                      }
              let grantBludgeoning
                    : Effect
                    = { kind = "grant_resistance"
                      , speedKind = None Text
                      , feet = None Natural
                      , hover = None Bool
                      , condition = None Text
                      , damageType = Some "bludgeoning"
                      }
              let grantPiercing
                    : Effect
                    = { kind = "grant_resistance"
                      , speedKind = None Text
                      , feet = None Natural
                      , hover = None Bool
                      , condition = None Text
                      , damageType = Some "piercing"
                      }
              let grantSlashing
                    : Effect
                    = { kind = "grant_resistance"
                      , speedKind = None Text
                      , feet = None Natural
                      , hover = None Bool
                      , condition = None Text
                      , damageType = Some "slashing"
                      }
              in  [ { kind = "direct"
                    , attachment =
                        { kind = "hole"
                        , holeId = "wind_walk_target"
                        , label = "target"
                        , value =
                            { kind = "target"
                            , selection = { mode = "choose_up_to", count = 11 }
                            }
                        }
                    , effects =
                        [ { kind = "composite"
                          , effects =
                              [ grantFly
                              , grantProne
                              , grantBludgeoning
                              , grantPiercing
                              , grantSlashing
                              ]
                          }
                        ]
                    }
                  ]
          }
      }

in  windWalk
