// RAW: SRD 5.2.1 classes.md:10221-10228;11522-11526.
module characterCreationWizardSpellcastingGains {
 var qState: {bookAdditions: int, preparationGrown: bool, sourceRetained: bool, accepted: bool, phase: int}
 action init = qState' = {bookAdditions:0,preparationGrown:false,sourceRetained:true,accepted:true,phase:0}
 action rejectMissing = all {qState.phase==0,qState'={...qState,accepted:false,phase:1}}
 action gain = all {qState.phase==2,qState'={...qState,bookAdditions:2,preparationGrown:true,accepted:true,phase:3}}
 action rejectDuplicate = all {qState.phase==1,qState'={...qState,accepted:false,phase:2}}
 action gainBonus = all {qState.phase==6,qState'={...qState,bookAdditions:3,preparationGrown:true,accepted:true,phase:7}}
 action resetBonus = all {qState.phase==3,qState'={bookAdditions:0,preparationGrown:false,sourceRetained:true,accepted:true,phase:4}}
 action rejectMissingBonus = all {qState.phase==4,qState'={...qState,accepted:false,phase:5}}
 action rejectDuplicateBonus = all {qState.phase==5,qState'={...qState,accepted:false,phase:6}}
 action step = any {rejectMissing,gain,rejectDuplicate,resetBonus,rejectMissingBonus,rejectDuplicateBonus,gainBonus}
}
