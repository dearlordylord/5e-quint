-- Silent Image — SRD 5.2.1 level-1 Illusion spell.
--
-- Core: creates a persistent visual-only illusion up to a 15-ft Cube
-- at a spot within range for concentration up to 10 minutes.
--
-- Three operations:
--   1. passive → create_illusion (visual only, max huge — 15ft cube)
--   2. on_caster_spends_action (Magic action) → reposition_attachment
--      (no maxMoveFeet cap; just "any spot within range")
--   3. on_creature_studies → ability_check_gate (Int vs spell DC)
--      onPass: { kind = "none" } — atom gap for "creature sees through"
--      (see proposal-silent_image.md)
--
-- OMITTED mechanic (atom gap):
--   The result of passing the Investigation check — "the creature can
--   see through the image" — has no EffectAtom. { kind = "none" } is
--   used for onPass to record the check gate without fabricating an atom.
--
-- earlyEnd: caster_recasts_spell — listed in types.ts DurationEndTrigger
--   comment as "Silent Image" but not present in the provided source
--   entries text; omitted pending confirmation of SRD passage.
--
-- DHALL HOMOGENEITY: 3 operations with 3 structurally different effects
-- and 3 trigger shapes. Unified via Optional-field superset; None fields
-- stripped by dhall-to-json --omit-empty.

let silentImage =
      let Trigger : Type =
            { kind : Text
            , cost : Optional { kind : Text, action : Text }
            }

      let passiveTrigger : Trigger =
            { kind = "passive"
            , cost = None { kind : Text, action : Text }
            }

      let magicActionTrigger : Trigger =
            { kind = "on_caster_spends_action"
            , cost = Some { kind = "standard_action", action = "magic" }
            }

      let studyTrigger : Trigger =
            { kind = "on_creature_studies"
            , cost = None { kind : Text, action : Text }
            }

      let Effect : Type =
            { kind : Text
            , maxSize : Optional Text
            , channels : Optional (List Text)
            , maxMoveFeet : Optional Natural
            , ability : Optional Text
            , dc : Optional { kind : Text }
            , onPass : Optional { kind : Text }
            }

      let createIllusion : Effect =
            { kind = "create_illusion"
            , maxSize = Some "huge"
            , channels = Some [ "visual" ]
            , maxMoveFeet = None Natural
            , ability = None Text
            , dc = None { kind : Text }
            , onPass = None { kind : Text }
            }

      let repositionAttachment : Effect =
            { kind = "reposition_attachment"
            , maxSize = None Text
            , channels = None (List Text)
            , maxMoveFeet = None Natural
            , ability = None Text
            , dc = None { kind : Text }
            , onPass = None { kind : Text }
            }

      let abilityCheckGate : Effect =
            { kind = "ability_check_gate"
            , maxSize = None Text
            , channels = None (List Text)
            , maxMoveFeet = None Natural
            , ability = Some "int"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onPass = Some { kind = "none" }
            }

      let Operation : Type = { trigger : Trigger, effect : Effect }

      in  { kind = "spell"
          , id = "silent_image"
          , name = "Silent Image"
          , provenance =
              { kind = "srd-5.2.1"
              , section = "Spells/Descriptions-S-Z.md#Silent Image"
              }

          , mechanics =
              { family = "ongoing_effect"
              , level = 1
              , school = "illusion"
              , castingTime = { kind = "action" }
              , range = { kind = "point", feet = 60 }
              , components = { v = True, s = True, m = Some "a bit of fleece" }
              , duration =
                  { kind = "concentration"
                  , upTo = { unit = "minute", amount = 10 }
                  }
              , attachment =
                  { kind = "hole"
                  , holeId = "silent_image_point"
                  , label = "spell origin point"
                  , value =
                      { kind = "area"
                      , shape = { kind = "cube", sideFeet = 15 }
                      , origin = { kind = "point_within_range" }
                      }
                  }
              , operations =
                  ( [ { trigger = passiveTrigger, effect = createIllusion }
                    , { trigger = magicActionTrigger
                      , effect = repositionAttachment
                      }
                    , { trigger = studyTrigger, effect = abilityCheckGate }
                    ]
                    : List Operation
                  )
              }
          }

in  silentImage
