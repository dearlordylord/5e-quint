-- Silence - SRD 5.2.1 Spell, level 2, Illusion.
--
-- RAW (Spells/Descriptions-S-Z#Silence):
--   "For the duration, no sound can be created within or pass through a
--    20-foot-radius Sphere centered on a point you choose within range."
--   "Any creature or object entirely inside the Sphere has Immunity to Thunder
--    damage, and creatures have the Deafened condition while entirely inside
--    it."
--   "Casting a spell that includes a Verbal component is impossible there."
--
-- Runtime boundary: promoted battle runtime does not infer audio geometry or
-- area membership automatically. This Surface atom records the authored
-- silence-area rule as one coupled fact; runtime support remains closed unless
-- a table-supplied area/membership owner admits the sound, Thunder-immunity,
-- Deafened, and Verbal-component facts together.

let silence =
      { kind = "spell"
      , id = "silence"
      , name = "Silence"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Silence"
          }
      , description =
          "For the duration, no sound can be created within or pass through a 20-foot-radius Sphere centered on a point you choose within range. Any creature or object entirely inside the Sphere has Immunity to Thunder damage, and creatures have the Deafened condition while entirely inside it. Casting a spell that includes a Verbal component is impossible there."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "illusion"
          , castingTime = { kind = "action", ritual = True }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "silence_point"
              , label = "spell origin point"
              , value =
                  { kind = "area"
                  , shape = { kind = "sphere", radiusFeet = 20 }
                  , origin = { kind = "point_within_range" }
                  }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "area_of_silence"
                    , soundBoundary = "blocks_creation_and_passage"
                    , appliesWhen = "entirely_inside_area"
                    , grantsDamageImmunity = "thunder"
                    , imposesCondition = "deafened"
                    , preventsSpellComponent = "verbal"
                    }
                }
              ]
          }
      }

in  silence
