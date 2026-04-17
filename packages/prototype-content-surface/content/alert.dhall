-- Alert — SRD 5.2.1 Origin feat.
-- Reference encoding for FeatRecord with a PassiveMechanics family.
--
-- SRD 5.2.1 text:
--   Initiative Proficiency. When you roll Initiative, you can add your
--     Proficiency Bonus to the roll.
--   Initiative Swap. Immediately after you roll Initiative, you can swap
--     your Initiative with the Initiative of one willing ally in the
--     same combat. You can't make this swap if you or the ally has the
--     Incapacitated condition.
--
-- The Initiative Proficiency half encodes cleanly as a passive
-- modify_roll_numeric grant on ability_check (Initiative is a Dex
-- ability check per Rules-Glossary). We encode the PB bonus as a flat
-- +2 placeholder — the actual PB is runtime state and belongs to
-- character advancement, not to the unit; a proper encoding would
-- eventually carry a `proficiency_bonus` delta kind.
--
-- The Initiative Swap half has NO v4 atom match (creature-to-creature
-- initiative-value exchange). It is deliberately omitted; see
-- `proposal-feat_alert.md` for the widening proposal.

let alert =
      { kind = "feat"
      , id = "alert"
      , name = "Alert"
      , category = "origin"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Feats#Alert"
          }
      , description =
          "Initiative Proficiency. When you roll Initiative, you can add your Proficiency Bonus to the roll. Initiative Swap. Immediately after you roll Initiative, you can swap your Initiative with the Initiative of one willing ally in the same combat. You can't make this swap if you or the ally has the Incapacitated condition."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "modify_roll_numeric"
                , on = [ "ability_check" ]
                , delta = { dice = 2, dieSize = 1, sign = "+" }
                }
              ]
          }
      }

in  alert
