-- Glyph of Warding - SRD 5.2.1 Spell, Level 3, Abjuration.
--
-- RAW (Spells/Descriptions-E-L#Glyph of Warding):
--   "You inscribe it either on a surface ... or within an object that can be
--    closed ... to conceal the glyph."
--   "The glyph can cover an area no larger than 10 feet in diameter."
--   "If the surface or object is moved more than 10 feet from where you cast
--    this spell, the glyph is broken, and the spell ends without being
--    triggered."
--   "You decide what triggers the glyph when you cast the spell."
--   "You can refine the trigger so that only creatures of certain types
--    activate it ... You can also set conditions for creatures that don't
--    trigger the glyph, such as those who say a certain password."
--   "Explosive Rune" releases a Dexterity save over a 20-foot-radius Sphere
--    centered on the glyph, with caster-chosen Acid, Cold, Fire, Lightning, or
--    Thunder damage and +1d8 per slot level above 3.
--   "Spell Glyph" stores a prepared spell, has no immediate effect at storage
--    time, retargets to or around the triggering creature, places hostile
--    summons/objects/traps as close as possible, and lets stored Concentration
--    spells last their full duration.
--
-- Surface ownership: this record owns the Spell Definition, durable glyph
-- occurrence, trigger grammar, movement invalidation, and release branch facts.
-- Table object/location and future battle-runtime owners must consume these
-- typed facts rather than branch on spell id or name.

let allCreatureTypes =
      [ "aberration"
      , "beast"
      , "celestial"
      , "construct"
      , "dragon"
      , "elemental"
      , "fey"
      , "fiend"
      , "giant"
      , "humanoid"
      , "monstrosity"
      , "ooze"
      , "plant"
      , "undead"
      ]

let casterSpellSaveDc = { kind = "caster_spell_save_dc" }

let glyphOfWarding =
      { kind = "spell"
      , id = "glyph_of_warding"
      , name = "Glyph of Warding"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Glyph of Warding"
          }
      , description =
          "You inscribe a glyph that later unleashes a magical effect. You inscribe it either on a surface or within an object that can be closed to conceal the glyph. The glyph can cover an area no larger than 10 feet in diameter. If the surface or object is moved more than 10 feet from where you cast this spell, the glyph is broken, and the spell ends without being triggered. The glyph is nearly imperceptible and requires a successful Wisdom (Perception) check against your spell save DC to notice. When you inscribe the glyph, you set its trigger and choose whether it's an explosive rune or a spell glyph. You can refine the trigger so that only creatures of certain types activate it, and you can set conditions for creatures that don't trigger it, such as a password. An explosive rune releases a 20-foot-radius Sphere of caster-chosen Acid, Cold, Fire, Lightning, or Thunder damage with a Dexterity saving throw for half damage. A spell glyph stores a prepared spell, has no immediate effect when stored, and releases the stored spell against or around the triggering creature; hostile summons, objects, or traps appear as close as possible to the triggering creature, and stored Concentration spells last their full duration. Using a Higher-Level Spell Slot increases explosive rune damage by 1d8 per slot level above 3 or lets a spell glyph store a spell up to the slot level used."
      , mechanics =
          { family = "glyph_warding"
          , level = 3
          , school = "abjuration"
          , castingTime = { kind = "hours", amount = 1, ritual = False }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m =
                  Some
                    "powdered diamond worth 200+ GP, which the spell consumes"
              , materialCostGp = Some 200
              , materialConsumed = Some True
              }
          , duration = { kind = "permanent", endsOn = Some [ "dispel" ] }
          , occurrence =
              { kind = "durable_glyph_occurrence"
              , inscriptionAnchor =
                  { chooser = "caster"
                  , surface =
                      { kind = "surface", inscriptionSite = "on_surface" }
                  , closeableObject =
                      { kind = "closeable_object"
                      , inscriptionSite = "within_object"
                      , concealmentMethod = "object_can_be_closed"
                      }
                  }
              , coverage =
                  { maxDiameterFeet = 10
                  , placement =
                      { kind =
                          "table_witnessed_covered_area_on_inscribed_anchor"
                      , constraint = "within_max_diameter"
                      }
                  }
              , castLocation = { kind = "table_witnessed_cast_location" }
              , movementInvalidation =
                  { movedSubject = "inscribed_surface_or_object"
                  , distanceFrom = "cast_location"
                  , moreThanFeet = 10
                  , outcome = "glyph_breaks_spell_ends_without_triggering"
                  }
              , concealment =
                  { visibility = "nearly_imperceptible"
                  , notice =
                      { kind = "wisdom_perception_check"
                      , ability = "wis"
                      , skill = "perception"
                      , dc = casterSpellSaveDc
                      , owner = "table_witnessed_glyph_notice"
                      }
                  }
              }
          , trigger =
              { kind = "caster_defined_glyph_trigger"
              , setWhen = "glyph_inscribed"
              , triggerOccurrence =
                  { kind = "table_witnessed_trigger_occurrence" }
              , commonEvents =
                  { surface =
                      [ "touching_glyph"
                      , "stepping_on_glyph"
                      , "removing_covering_object"
                      , "approaching_within_caster_set_distance"
                      ]
                  , closeableObject = [ "opening_object", "seeing_glyph" ]
                  }
              , refinement =
                  { activationFilter =
                      { kind = "creature_type"
                      , chooser = "caster"
                      , typeChoice =
                          { kind = "choice"
                          , label = "triggering creature types"
                          , options = allCreatureTypes
                          }
                      }
                  , nonTriggerExclusion =
                      { kind = "password_or_other_condition"
                      , chooser = "caster"
                      }
                  }
              , onTriggered = "spell_ends"
              }
          , release =
              { chooser = "caster"
              , explosiveRune =
                  { kind = "explosive_rune"
                  , area = { kind = "sphere", radiusFeet = 20, origin = "glyph" }
                  , save =
                      { ability = "dex"
                      , dc = casterSpellSaveDc
                      , onSuccess = { kind = "half_damage" }
                      }
                  , damage =
                      { damageType =
                          { kind = "hole"
                          , holeId =
                              "glyph_of_warding_explosive_rune_damage_type"
                          , label = "explosive rune damage type"
                          , value =
                              { kind = "choice"
                              , label = "explosive rune damage type"
                              , options =
                                  [ "acid"
                                  , "cold"
                                  , "fire"
                                  , "lightning"
                                  , "thunder"
                                  ]
                              }
                          }
                      , amount =
                          { kind = "linear_per_level"
                          , axis = "slot"
                          , base = { dice = 5, dieSize = 8 }
                          , perLevel = { dice = 1 }
                          , startingAtLevel = 3
                          }
                      }
                  }
              , spellGlyph =
                  { kind = "spell_glyph"
                  , storage =
                      { spellAccess = "prepared_spell"
                      , castAsPartOfCreatingGlyph = True
                      , immediateEffect = "none"
                      , maxStoredSpellLevel =
                          { baseMaxLevel = 3
                          , upcastMaxLevel = "same_as_cast_slot_level"
                          }
                      , targetShape =
                          [ { kind = "single_creature_target" }
                          , { kind = "area_target" }
                          ]
                      }
                  , release =
                      { when = "glyph_triggered"
                      , retargeting =
                          { singleCreatureSpellTarget = "triggering_creature"
                          , areaSpellOrigin =
                              "centered_on_triggering_creature"
                          }
                      , hostilePlacement =
                          { appliesTo =
                              [ "summoned_hostile_creatures"
                              , "harmful_objects"
                              , "traps"
                              ]
                          , placement =
                              "as_close_as_possible_to_triggering_creature"
                          , attackTarget = "triggering_creature"
                          }
                      , concentration =
                          { ifStoredSpellRequiresConcentration =
                              "lasts_full_duration"
                          }
                      }
                  }
              }
          }
      }

in  glyphOfWarding
