-- Disciple of Life — SRD 5.2.1 Cleric Life Domain level 3.
--
-- RAW (Classes / Cleric / Level 3: Disciple of Life):
--   When a spell you cast with a spell slot restores Hit Points to a
--   creature, that creature regains additional Hit Points on the turn
--   you cast the spell. The additional Hit Points equal 2 plus the
--   spell slot's level.
--
-- This is a passive spell-healing modifier, not a standalone heal and
-- not a class-owned resource. The executable trigger is the typed spell
-- invocation fact that the Cleric cast a Hit Point restoring spell with
-- a Spell Slot.

let discipleOfLife =
      { kind = "class_feature"
      , id = "cleric_disciple_of_life"
      , name = "Disciple of Life"
      , className = "cleric"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Cleric#Level 3: Disciple of Life"
          }
      , description =
          "When a spell you cast with a spell slot restores Hit Points to a creature, that creature regains additional Hit Points on the turn you cast the spell. The additional Hit Points equal 2 plus the spell slot's level."
      , mechanics =
          { family = "spell_slot_healing_modifier"
          , trigger =
              { kind = "caster_spell_slot_restores_hit_points"
              , timing = "turn_spell_is_cast"
              }
          , appliesTo = "each_creature_healed_by_spell"
          , bonus = { kind = "flat_plus_spell_slot_level", flat = 2 }
          }
      }

in  discipleOfLife
