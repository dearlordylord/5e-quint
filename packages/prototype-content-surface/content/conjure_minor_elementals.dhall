-- Conjure Minor Elementals — SRD 5.2.1 Spell, Level 4, Conjuration.
-- Family: ongoing_effect (concentration 10 min).
--
-- RAW: "You conjure spirits from the Elemental Planes that flit around
-- you in a 15-foot Emanation for the duration. Until the spell ends,
-- any attack you make deals an extra 2d8 damage when you hit a creature
-- in the Emanation. This damage is Acid, Cold, Fire, or Lightning (your
-- choice when you make the attack)."
-- Upcast: +1d8 per slot above 4 (linear_per_level, axis=slot).
--
-- SURFACE WIDENING.
--   `on_caster_attack_hit` + `area` attachment is a novel scope combination.
--   Documented examples only cover `self` (Divine Favor: any attack hit)
--   and `mark` (Hunter's Mark: attack against marked target). This spell
--   needs "attack hit against creature in the 15-ft emanation" which
--   requires area-scoped attack-hit triggering. The grammar's
--   "scope derived from attachment" is intended to be generic, but no
--   prior encoding exercises the area case.
--
-- OMITTED.
--   "the ground in the Emanation is Difficult Terrain for your enemies"
--   Omitted per spike_growth / grease precedent: difficult terrain is
--   treated as DM-agenda spatial geometry. Additionally `area_is_difficult_terrain`
--   carries no dispositionFilter parameter, so "for enemies only" is
--   inexpressible. Both gaps block honest encoding of this clause.
--
-- DAMAGE TYPE CHOICE.
--   The choice is made "when you make the attack" (per-attack, not
--   once at cast time). The surface's CastTimeChoice<DamageType> is
--   structurally correct (closed option set picked from a menu) but
--   semantically labeled as "cast-time" — the per-attack timing is
--   a refinement not captured by the label.

let conjureMinorElementals =
      { kind = "spell"
      , id = "conjure_minor_elementals"
      , name = "Conjure Minor Elementals"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Conjure Minor Elementals"
          }
      , description =
          "You conjure spirits from the Elemental Planes that flit around you in a 15-foot Emanation for the duration. Until the spell ends, any attack you make deals an extra 2d8 damage when you hit a creature in the Emanation. This damage is Acid, Cold, Fire, or Lightning (your choice when you make the attack). In addition, the ground in the Emanation is Difficult Terrain for your enemies."
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
              , shape = { kind = "emanation", radiusFeet = 15 }
              , origin = { kind = "self" }
              }
          , operations =
              [ { trigger = { kind = "on_caster_attack_hit" }
                , effect =
                    { kind = "damage"
                    , damageType =
                        { kind = "choice"
                        , label = "elemental damage type (chosen per attack)"
                        , options = [ "acid", "cold", "fire", "lightning" ]
                        }
                    , amount =
                        { kind = "linear_per_level"
                        , axis = "slot"
                        , base = { dice = 2, dieSize = 8 }
                        , perLevel = { dice = 1 }
                        , startingAtLevel = 4
                        }
                    }
                }
              ]
          }
      }

in  conjureMinorElementals
