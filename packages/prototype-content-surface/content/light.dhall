-- Light — SRD 5.2.1 Cantrip, Evocation.
--
-- RAW (Spells / Descriptions E-L / Light):
--   "You touch one Large or smaller object that isn't being worn or
--    carried by someone else. Until the spell ends, the object sheds
--    Bright Light in a 20-foot radius and Dim Light for an additional
--    20 feet. The light can be colored as you like."
--   "Covering the object with something opaque blocks the light. The
--    spell ends if you cast it again."
--
-- Family: activation (direct phase), timed 1-hour duration.
-- Modeled after Longstrider: effect applied at cast time, persists
-- for the spell's timed duration.
--
-- SURFACE GAP (surface_widening, partial encode):
--   ObjectFilter has no size field — "Large or smaller" cannot be
--   expressed. Only heldOrWorn = "forbidden" is captured.
--   A new optional `maxSize: StatBlockSize` field on ObjectFilter
--   would close the gap.
--
-- OMITTED (surface_widening):
--   "The spell ends if you cast it again" — no DurationEndTrigger
--   variant for "caster recasts this spell". The v4 lifecycle atom
--   `replace_on_recast` exists but has no surface hook on Duration.
--
-- OMITTED (DM narrative):
--   "The light can be colored as you like" — pure narrative flavor,
--   no mechanical consequence.
--   "Covering the object with something opaque blocks the light" —
--   DM-agenda physical occlusion rule, not a typed trigger.

let light =
      { kind = "spell"
      , id = "light"
      , name = "Light"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-L-P#Light"
          }
      , description =
          "You touch one Large or smaller object that isn't being worn or carried by someone else. Until the spell ends, the object sheds Bright Light in a 20-foot radius and Dim Light for an additional 20 feet. The light can be colored as you like. Covering the object with something opaque blocks the light. The spell ends if you cast it again."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = False
              , m = Some "a firefly or phosphorescent moss"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "object"
                    , count = 1
                    , filter = { heldOrWorn = "forbidden" }
                    }
                , effects =
                    [ { kind = "emit_light"
                      , brightRadiusFeet = 20
                      , dimAdditionalFeet = 20
                      }
                    ]
                }
              ]
          }
      }

in  light
