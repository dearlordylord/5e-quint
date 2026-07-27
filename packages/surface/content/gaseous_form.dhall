-- Gaseous Form - SRD 5.2.1 Spell, level 3, Transmutation.
--
-- RAW (Spells / Descriptions E-L / Gaseous Form):
--   A willing touched creature and its worn/carried objects become a misty
--   cloud. The form's only movement method is Fly Speed 10 ft with hover. It
--   can occupy another creature's space, pass through narrow openings, and
--   treats liquids as solid surfaces. It has B/P/S Resistance, Prone Immunity,
--   and STR/DEX/CON Saving Throw Advantage. It cannot talk, manipulate/drop/
--   use/interact with objects, attack, or cast spells. The target can take a
--   Magic action to end the spell on itself, and the spell ends for a target at
--   0 Hit Points.
--
-- The mist cloud is not a catalog Stat Block and not a known-form roster
-- choice. The spell_effect_mist_cloud source keeps the form facts together so
-- table/spatial follow-up owners and future battle-runtime form support consume
-- typed facts instead of spell id/name/provenance.

let RevertTrigger
    : Type
    = { kind : Text, action : Optional Text }

let zeroHp
    : RevertTrigger
    = { kind = "zero_hp", action = None Text }

let dismissedByTargetMagicAction
    : RevertTrigger
    = { kind = "dismissed_by_target", action = Some "magic_action" }

let spellEnds
    : RevertTrigger
    = { kind = "spell_ends", action = None Text }

let gaseousForm =
      { kind = "spell"
      , id = "gaseous_form"
      , name = "Gaseous Form"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Gaseous Form"
          }

      , mechanics =
          { family = "ongoing_effect"
          , level = 3
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = Some "a bit of gauze" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "gaseous_form_target"
              , label = "target"
              , value =
                  { kind = "target"
                  , selection =
                      { mode = "choose_up_to"
                      , count =
                          { kind = "linear"
                          , base = 1
                          , perSlotAboveBase = 1
                          , baseLevel = 3
                          }
                      , targetKinds = [ "creature" ]
                      , disposition = "willing"
                      }
                  }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "transform_target"
                    , newForm =
                        { kind = "spell_effect_mist_cloud"
                        , transformedObjects = "worn_and_carried"
                        , movement =
                            { kind = "replace_all_movement_methods"
                            , speedKind = "fly"
                            , feet = 10
                            , hover = True
                            }
                        , tableSpatial =
                            { creatureSpace =
                                "can_enter_and_occupy_other_creature_space"
                            , narrowOpenings = "can_pass_through"
                            , liquids = "treat_as_solid_surfaces"
                            }
                        , passive =
                            { damageResistances =
                                [ "bludgeoning", "piercing", "slashing" ]
                            , conditionImmunities = [ "prone" ]
                            , savingThrowAdvantage = [ "str", "dex", "con" ]
                            }
                        , activityLimits =
                            { communication = "cannot_talk"
                            , objectManipulation = "cannot_manipulate_objects"
                            , carriedOrHeldObjects =
                                "cannot_be_dropped_used_or_interacted_with"
                            , prohibitedActivities =
                                [ "attack", "spellcasting" ]
                            }
                        }
                    , revertTriggers =
                        [ zeroHp, dismissedByTargetMagicAction, spellEnds ]
                    }
                }
              ]
          }
      }

in  gaseousForm
