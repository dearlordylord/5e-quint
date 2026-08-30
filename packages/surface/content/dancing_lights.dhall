-- Dancing Lights — SRD 5.2.1 Cantrip, Illusion.
--
-- RAW (Spells/Descriptions-A-D#Dancing Lights):
--   "You create up to four torch-size lights within range, making them
--    appear as torches, lanterns, or glowing orbs that hover for the
--    duration. Alternatively, you combine the four lights into one
--    glowing Medium form that is vaguely humanlike. Whichever form you
--    choose, each light sheds Dim Light in a 10-foot radius."
--   "As a Bonus Action, you can move the lights up to 60 feet to a
--    space within range. A light must be within 20 feet of another
--    light created by this spell, and a light vanishes if it exceeds
--    the spell's range."
--
-- Family: ongoing_effect (Concentration, 1 minute).
-- Attachment: area (sphere r=10, point_within_range) — models the
--   initial placement of the lights.
-- Three operations:
--   1. passive → create_illusion (visual, medium — covers both the
--      four-light and humanoid-form options; mechanically identical)
--   2. passive → emit_dim_illumination (radiusFeet=10 — dim-only per RAW)
--   3. on_caster_spends_action (bonus_action) → reposition_attachment
--      (maxMoveFeet=60 — the 60-ft per-hop cap from RAW)
--
-- OMITTED (surface limitation, not a blocking widening):
--   • Cast-time choice (4 torch-size lights vs 1 Medium humanoid form)
--     — both modes produce identical mechanical effects (visual illusion
--     + dim light in 10-ft radius). Modeled as a single create_illusion
--     with maxSize="medium". The narrative distinction lives in the
--     description.
--   • 20-ft proximity constraint between individual lights — no surface
--     support for multi-instance attachment positioning.
--   • 4-light count cap — single area attachment approximates the group.
--   • "earlyEnd: caster_recasts_spell" — not present in the provided
--     XPHB source text entries.
--
-- DHALL HOMOGENEITY: 3 operations with 3 structurally different effect
-- types (create_illusion, emit_dim_illumination, reposition_attachment) and 2
-- trigger types (passive, on_caster_spends_action). Unified via
-- Optional-field superset — None fields stripped by
-- dhall-to-json --omit-empty.

let dancingLights =
      -- Effect superset covers create_illusion, emit_dim_illumination, and
      -- reposition_attachment variant fields.
      let Effect
          : Type
          = { kind : Text
            , maxSize : Optional Text
            , channels : Optional (List Text)
            , radiusFeet : Optional Natural
            , maxMoveFeet : Optional Natural
            }

      let createIllusion
          : Effect
          = { kind = "create_illusion"
            , maxSize = Some "medium"
            , channels = Some [ "visual" ]
            , radiusFeet = None Natural
            , maxMoveFeet = None Natural
            }

      let emitDimIllumination
          : Effect
          = { kind = "emit_dim_illumination"
            , maxSize = None Text
            , channels = None (List Text)
            , radiusFeet = Some 10
            , maxMoveFeet = None Natural
            }

      let repositionAttachment
          : Effect
          = { kind = "reposition_attachment"
            , maxSize = None Text
            , channels = None (List Text)
            , radiusFeet = None Natural
            , maxMoveFeet = Some 60
            }

      -- Trigger superset: passive has no cost; on_caster_spends_action
      -- carries bonus_action cost { kind : Text }.
      let Trigger
          : Type
          = { kind : Text, cost : Optional { kind : Text } }

      let passiveTrigger
          : Trigger
          = { kind = "passive", cost = None { kind : Text } }

      let bonusActionTrigger
          : Trigger
          = { kind = "on_caster_spends_action"
            , cost = Some { kind = "bonus_action" }
            }

      in  { kind = "spell"
          , id = "dancing_lights"
          , name = "Dancing Lights"
          , provenance =
              { kind = "srd-5.2.1"
              , section = "Spells/Descriptions-A-D#Dancing Lights"
              }

          , mechanics =
              { family = "ongoing_effect"
              , level = 0
              , school = "illusion"
              , castingTime = { kind = "action" }
              , range = { kind = "point", feet = 120 }
              , components =
                  { v = True, s = True, m = Some "a bit of phosphorus" }
              , duration =
                  { kind = "concentration"
                  , upTo = { unit = "minute", amount = 1 }
                  }
              , attachment =
                  { kind = "hole"
                  , holeId = "dancing_lights_point"
                  , label = "spell origin point"
                  , value =
                      { kind = "area"
                      , shape = { kind = "sphere", radiusFeet = 10 }
                      , origin = { kind = "point_within_range" }
                      }
                  }
              , operations =
                  [ { trigger = passiveTrigger, effect = createIllusion }
                  , { trigger = passiveTrigger, effect = emitDimIllumination }
                  , { trigger = bonusActionTrigger
                    , effect = repositionAttachment
                    }
                  ]
              }
          }

in  dancingLights
