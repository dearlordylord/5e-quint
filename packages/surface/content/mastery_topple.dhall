-- Topple — SRD 5.2.1 Mastery Property.
-- On-hit rider: target makes a CON save (DC 8 + ability mod + PB);
-- on fail, the target has the Prone condition.
-- Topple is optional (wielder chooses) with no once-per-turn limit.

let topple =
      { kind = "mastery"
      , id = "mastery_topple"
      , name = "Topple"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Equipment#Topple"
          }
      , description =
          "If you hit a creature with this weapon, you can force the creature to make a Constitution saving throw (DC 8 plus the ability modifier used to make the attack roll and your Proficiency Bonus). On a failed save, the creature has the Prone condition."
      , mechanics =
          { family = "on_hit_trigger"
          , trigger = { kind = "weapon_hit" }
          , optional = True
          , effect =
              { kind = "save_gate"
              , ability = "con"
              , dc = { kind = "weapon_attack_dc", base = 8 }
              , onFail = { kind = "apply_condition", condition = "prone" }
              , onSuccess = { kind = "none" }
              }
          }
      }

in  topple
