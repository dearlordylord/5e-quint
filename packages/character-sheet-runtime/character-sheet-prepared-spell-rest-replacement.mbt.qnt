// RAW: SRD 5.2.1 classes.md:10269-10272.
// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_ACCESS.SHORT_REST_PREPARED_REPLACEMENT
module characterSheetPreparedSpellRestReplacement {
 var qState: {oldPrepared: bool, newPrepared: bool, bookIntact: bool, slotsIntact: bool, accepted: bool, phase: int}
 action init = qState' = {oldPrepared:true,newPrepared:false,bookIntact:true,slotsIntact:true,accepted:true,phase:0}
 action replace = all {qState.phase == 0, qState' = {...qState,oldPrepared:false,newPrepared:true,phase:1}}
 action rejectCantrip = all {qState.phase == 1,qState' = {...qState,accepted:false,phase:2}}
 action rejectAbsentBook = all {qState.phase == 2,qState' = {...qState,accepted:false,phase:3}}
 action rejectForgedSource = all {qState.phase == 3,qState' = {...qState,accepted:false,phase:4}}
 action step = any {replace,rejectCantrip,rejectAbsentBook,rejectForgedSource}
}
