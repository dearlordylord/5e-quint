-- Mirror Image — SRD 5.2.1 Spell, level 2, Illusion.
--
-- RAW (Spells / Descriptions M-P / Mirror Image):
--   Three illusory duplicates appear. Each time a creature hits you with an
--   attack roll, roll 1d6 for each remaining duplicate; any 3+ redirects the
--   hit to one duplicate and destroys it. Duplicates ignore all other damage
--   and effects. The spell ends when all three duplicates are destroyed. The
--   spell has no effect if the attacker has Blinded or perceives you with
--   Blindsight or Truesight.
--
-- Runtime consumes Blindsight/Truesight as caller-supplied attack-target
-- witness facts, matching the existing sight-boundary convention.

let mirrorImage =
      { kind = "spell"
      , id = "mirror_image"
      , name = "Mirror Image"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Mirror Image"
          }
      , description =
          "Three illusory duplicates appear in your space. Each time a creature hits you with an attack roll during the duration, roll 1d6 for each remaining duplicate. If any die is a 3 or higher, one duplicate is hit instead of you and destroyed. Duplicates ignore all other damage and effects. The spell ends when all three duplicates are destroyed. A creature is unaffected if it has the Blinded condition or perceives you with Blindsight or Truesight."
      , mechanics =
          { family = "passive_hit_intercept"
          , level = 2
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "timed", value = { unit = "minute", amount = 1 } }
          , attachment = { kind = "self" }
          , duplicatePool =
              { count = 3
              , dicePerRemainingDuplicate = 1
              , dieSize = 6
              , successAtLeast = 3
              , onHit = "duplicate_hit_instead_and_destroyed"
              , onFailure = "caster_hit_normally"
              , ignoresOtherDamageAndEffects = True
              , endsWhen = "all_duplicates_destroyed"
              , unaffectedBy = [ "blinded", "blindsight", "truesight" ]
              }
          }
      }

in  mirrorImage
