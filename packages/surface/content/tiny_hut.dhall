-- Tiny Hut - SRD 5.2.1 Spell, level 3, Evocation.
--
-- RAW (Spells/Descriptions-S-Z#Tiny Hut):
--   "A 10-foot Emanation springs into existence around you and remains
--    stationary for the duration."
--   "Creatures and objects within the Emanation when you cast the spell can
--    move through it freely. All other creatures and objects are barred from
--    passing through it."
--   "Spells of level 3 or lower can't be cast through it, and the effects of
--    such spells can't extend into it."
--   "The atmosphere inside the Emanation is comfortable and dry, regardless
--    of the weather outside."
--   "The spell ends early if you leave the Emanation or if you cast it again."
--
-- Tiny Hut's shelter is a stationary table/spatial/environment fact. This
-- Spell Definition records the authored 10-foot Emanation, duration, creature
-- and object passage boundary, and level-capped spell boundary without
-- promoting a battle-runtime map, shelter-occupancy, weather, atmosphere,
-- one-way visibility, color, or interior-light command owner.
-- The Duration uses the typed recast early-end trigger; leaving the Emanation
-- requires the same table/spatial owner as stationary area membership.

let Effect : Type =
      { kind : Text, scope : Optional Text }

let blockTravel =
      \(scope : Text) -> { kind = "block_travel", scope = Some scope }

let nonInitialCreatureObjectBoundary : Effect =
      blockTravel "non_initial_creatures_and_objects_through_emanation"

let lowerLevelSpellBoundary : Effect =
      blockTravel
        "level_3_or_lower_spell_casting_through_or_effects_extending_into_emanation"

let hutArea =
      { kind = "hole"
      , holeId = "tiny_hut_emanation"
      , label = "stationary 10-foot Emanation"
      , value =
          { kind = "area"
          , shape = { kind = "emanation", radiusFeet = 10 }
          , origin = { kind = "self" }
          }
      }

let Operation : Type = { trigger : { kind : Text }, effect : Effect }

let passiveOperation =
      \(effect : Effect) -> { trigger = { kind = "passive" }, effect }

let tinyHut =
      { kind = "spell"
      , id = "tiny_hut"
      , name = "Tiny Hut"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Tiny Hut"
          }
      , description =
          "A 10-foot Emanation springs into existence around you and remains stationary for the duration. The spell fails when you cast it if the Emanation isn't big enough to fully encapsulate all creatures in its area. Creatures and objects within the Emanation when you cast the spell can move through it freely. All other creatures and objects are barred from passing through it. Spells of level 3 or lower can't be cast through it, and the effects of such spells can't extend into it. The atmosphere inside the Emanation is comfortable and dry, regardless of the weather outside. Until the spell ends, you can command the interior to have Dim Light or Darkness, no action required. The Emanation is opaque from the outside and of any color you choose, but transparent from the inside. The spell ends early if you leave the Emanation or if you cast it again."
      , mechanics =
          { family = "ongoing_effect"
          , level = 3
          , school = "evocation"
          , castingTime = { kind = "minutes", amount = 1, ritual = True }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = Some "a crystal bead"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 8 }
              , earlyEnd = [ { kind = "caster_recasts_spell" } ]
              }
          , attachment = hutArea
          , operations =
              [ passiveOperation nonInitialCreatureObjectBoundary
              , passiveOperation lowerLevelSpellBoundary
              ] : List Operation
          }
      }

in  tinyHut
