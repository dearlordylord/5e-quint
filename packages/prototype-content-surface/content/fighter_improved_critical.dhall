-- Improved Critical — SRD 5.2.1 Fighter Champion subclass (level 3).
--
-- RAW (Classes / Fighter / Champion / Improved Critical):
--   "Your attack rolls with weapons and Unarmed Strikes can score a
--    Critical Hit on a roll of 19 or 20 on the d20."
--
-- Consolidated validation reference for:
--   • ClassFeatureMechanics.passive (no activation, no resource, no
--     reset — always-on)
--   • modify_crit_range atom (lowers crit threshold from 20 to N)
--
-- Improved Critical is Champion-subclass specific (Fighter L3). The
-- `className` field is set to "fighter" and the prototype's current
-- class-feature shape does not yet differentiate subclass features;
-- this matches how other subclass-gated features have been encoded so
-- far in the prototype.

let improvedCritical =
      { kind = "class_feature"
      , id = "fighter_improved_critical"
      , name = "Improved Critical"
      , className = "fighter"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Fighter/Champion#ImprovedCritical"
          }
      , description =
          "Your attack rolls with weapons and Unarmed Strikes can score a Critical Hit on a roll of 19 or 20 on the d20."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "modify_crit_range", threshold = 19 } ]
          }
      }

in  improvedCritical
