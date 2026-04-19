-- Conjure Woodland Beings — SRD 5.2.1 Spell, Level 4, Conjuration.
-- Family: ongoing_effect, area emanation (self), Wisdom save_gate on
-- creature entry. §A15 partial.
--
-- PARTIAL.
--   • Three triggers in RAW: (1) Emanation enters creature's space
--     (caster movement), (2) creature enters Emanation, (3) creature
--     ends its turn there. Triggers (1) and (2) collapse to
--     on_creature_enters_area; (3) maps to on_creature_ends_turn_in_area.
--     Encoding uses on_creature_enters_area only — the
--     on_creature_ends_turn_in_area sibling is deferred because there
--     is no "once per turn per creature" dedup predicate on
--     OngoingOperation (the same gap as Spirit Guardians and Web).
--     Including both triggers without the dedup would misrepresent RAW
--     by implying two independent saves are possible per turn.
--   • "You CAN force that creature to make" — save is optional at
--     caster's choice per triggering event. No optional flag exists on
--     OngoingEffect.save_gate; encoded as mandatory. This is a
--     surface_widening gap (not modeled).
--   • "In addition, you can take the Disengage action as a Bonus
--     Action for the spell's duration." — This changes the action
--     economy of a standard action to a bonus action. No v4 atom
--     covers this. deny_opportunity_attack is not equivalent: Disengage
--     prevents triggering opportunity attacks when leaving threatened
--     squares, which is distinct from merely suppressing OAs against the
--     bearer. atom_widening required — see proposal.
--   • "A creature makes this save only once per turn." — dedup
--     predicate not modeled (see above).

let conjureWoodlandBeings =
      { kind = "spell"
      , id = "conjure_woodland_beings"
      , name = "Conjure Woodland Beings"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-C#Conjure Woodland Beings"
          }
      , description =
          "You conjure nature spirits that flit around you in a 10-foot Emanation for the duration. Whenever the Emanation enters the space of a creature you can see and whenever a creature you can see enters the Emanation or ends its turn there, you can force that creature to make a Wisdom saving throw. The creature takes 5d8 Force damage on a failed save or half as much damage on a successful one. A creature makes this save only once per turn. In addition, you can take the Disengage action as a Bonus Action for the spell's duration."
      , mechanics =
          { family = "ongoing_effect"
          , level = 4
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment =
              { kind = "area"
              , shape = { kind = "emanation", radiusFeet = 10 }
              , origin = { kind = "self" }
              }
          , operations =
              [ { trigger = { kind = "on_creature_enters_area" }
                , effect =
                    { kind = "save_gate"
                    , ability = "wis"
                    , dc = { kind = "caster_spell_save_dc" }
                    , onFail =
                        { kind = "damage"
                        , damageType = "force"
                        , amount =
                            { kind = "linear_per_level"
                            , axis = "slot"
                            , base = { dice = 5, dieSize = 8 }
                            , perLevel = { dice = 1 }
                            , startingAtLevel = 5
                            }
                        }
                    , onSuccess = { kind = "half_damage" }
                    }
                }
              ]
          }
      }

in  conjureWoodlandBeings
