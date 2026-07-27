let heightenedFocus =
      { kind = "class_feature"
      , id = "monk_heightened_focus"
      , name = "Heightened Focus"
      , className = "monk"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Monk.md:142-150" }
      , description =
          "Your Flurry of Blows, Patient Defense, and Step of the Wind gain benefits. You can expend 1 Focus Point to use Flurry of Blows and make three Unarmed Strikes instead of two. When you expend a Focus Point to use Patient Defense, you gain Temporary Hit Points equal to two rolls of your Martial Arts die. When you expend a Focus Point to use Step of the Wind, you can choose a willing creature within 5 feet of yourself that is Large or smaller. You move the creature with you until the end of your turn. The creature's movement doesn't provoke Opportunity Attacks."
      , mechanics = { family = "passive", grants = [] : List {} }
      }

in  heightenedFocus
