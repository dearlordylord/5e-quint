-- Arcanist's Magic Aura - SRD 5.2.1 Spell, level 2, Illusion.
--
-- RAW (Spells/Descriptions-A-D#Arcanist's Magic Aura):
--   "With a touch, you place an illusion on a willing creature or an
--    object that isn't being worn or carried."
--   "A creature gains the Mask effect below, and an object gains the
--    False Aura effect below."
--   "If you cast the spell on the same target every day for 30 days,
--    the illusion lasts until dispelled."
--   Mask makes spells and other magical effects treat the target as a
--   caster-chosen creature type other than the target's actual type.
--   False Aura changes how the object appears to magical-aura detection:
--   nonmagical as magical, magic item as nonmagical, or a chosen school.
--
-- The Surface record owns the Spell Definition and the source facts for the
-- magical identity mask. Detection interpretation, magic-item aura
-- presentation, and generic effective-creature-type override wiring are
-- runtime-detached table/knowledge adjudication until a promoted owner exists.

let arcanistsMagicAura =
      { kind = "spell"
      , id = "arcanists_magic_aura"
      , name = "Arcanist's Magic Aura"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Arcanist's Magic Aura"
          }
      , description =
          "With a touch, you place an illusion on a willing creature or an object that isn't being worn or carried. A creature gains the Mask effect: choose a creature type other than the target's actual type, and spells and other magical effects treat the target as if it were a creature of the chosen type. An object gains the False Aura effect: you change the way the target appears to spells and magical effects that detect magical auras, such as Detect Magic. You can make a nonmagical object appear magical, make a magic item appear nonmagical, or change the object's aura so that it appears to belong to a school of magic you choose. If you cast the spell on the same target every day for 30 days, the illusion lasts until dispelled."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "a small square of silk"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 24 }
              , permanentAfter =
                  { kind = "repeated_casts"
                  , cadence = "daily"
                  , count = 30
                  , target = "same_target"
                  , endsOn = [ "dispel" ]
                  }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "arcanists_magic_aura_target"
                    , label = "willing creature or object"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , targetKinds = [ "creature", "object" ]
                            , creatureDisposition = "willing"
                            , objectFilter =
                                { targetRelation = "not_worn_or_carried" }
                            }
                        }
                    }
                , effects =
                    [ { kind = "magical_identity_mask"
                      , creatureBranch =
                          { chosenCreatureType = "other_than_actual_type"
                          , treatedAsBy = "spells_and_magical_effects"
                          }
                      , objectBranch =
                          { auraAppearance =
                              "nonmagical_magical_or_chosen_school"
                          , observedBy =
                              "spells_and_magical_effects_detecting_magical_auras"
                          }
                      }
                    ]
                }
              ]
          }
      }

in  arcanistsMagicAura
