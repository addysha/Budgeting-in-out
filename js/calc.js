/* Working out what falls on a day and what the totals come to. */
(function (App) {
  "use strict";

  // Every date a repeating rule lands on.
  function ruleOcc(rule){
    // Half-finished or nonsense rules must not reach the calendar: an unparsable
    // start date would make every day Invalid Date, and a huge count would hang
    // the browser, so both are refused here as well as in the form.
    if(!rule || !App.validDayKey(rule.start)) return [];
    var n=parseInt(rule.count,10);
    if(!isFinite(n) || n<1) return [];
    if(n>App.validate.MAX_TIMES) n=App.validate.MAX_TIMES;
    if(!isFinite(parseFloat(rule.amount))) return [];
    var base=App.pk(rule.start), out=[];
    for(var k=0;k<n;k++){
      var d;
      if(rule.freq==="weekly") d=App.addDays(base,7*k);
      else if(rule.freq==="fortnightly") d=App.addDays(base,14*k);
      else if(rule.freq==="monthly") d=App.addMonths(base,k);
      else if(rule.freq==="yearly") d=App.addYears(base,k);
      else d=App.addDays(base,7*k);
      out.push(d);
    }
    return out;
  }

  // Hand-added entries first, then anything a repeating rule puts on this day.
  function itemsForDay(d){
    var state=App.state, out=[];
    var manual=state.entries[App.dk(d)]||[];
    for(var i=0;i<manual.length;i++){ var e=manual[i]; out.push({name:e.name,type:e.type,amount:e.amount,emoji:e.emoji||"",manual:true,idx:i,key:App.dk(d)}); }
    for(var r=0;r<state.recurring.length;r++){
      var rule=state.recurring[r], occ=ruleOcc(rule);
      for(var j=0;j<occ.length;j++){ if(App.sameDay(occ[j],d)){ out.push({name:rule.name,type:rule.type,amount:rule.amount,emoji:rule.emoji||"",recurring:true}); } }
    }
    return out;
  }

  function eachItemInRange(s,e,cb){
    var state=App.state, ts=App.T(s), te=App.T(e);
    for(var key in state.entries){ var d=App.pk(key), t=App.T(d); if(t>=ts&&t<=te){ var l=state.entries[key]; for(var i=0;i<l.length;i++) cb(l[i]); } }
    for(var r=0;r<state.recurring.length;r++){ var occ=ruleOcc(state.recurring[r]), rule=state.recurring[r]; for(var j=0;j<occ.length;j++){ var t2=App.T(occ[j]); if(t2>=ts&&t2<=te) cb(rule); } }
  }

  function totals(s,e){ var inS=0,outS=0; eachItemInRange(s,e,function(it){ if(it.type==="in") inS+=it.amount; else outS+=it.amount; }); return {inS:inS,outS:outS}; }

  function balanceBefore(date){
    var ts=App.trackingStart(), before=App.addDays(date,-1);
    var t=totals(ts, before);
    // if date is on/before trackingStart, no prior nets
    if(App.T(date)<=App.T(ts)) return App.state.startBalance;
    return App.state.startBalance + (t.inS - t.outS);
  }

  // The date span the current view covers.
  function rangeFor(){
    var view=App.view, a=App.midnight(view.anchor);
    if(view.mode==="day"){ return {s:a, e:a}; }
    if(view.mode==="week"){ var off=(a.getDay()+6)%7; var s=App.addDays(a,-off); return {s:s, e:App.addDays(s,6)}; }
    if(view.mode==="month"){ return {s:new Date(a.getFullYear(),a.getMonth(),1), e:new Date(a.getFullYear(),a.getMonth()+1,0)}; }
    return {s:new Date(a.getFullYear(),0,1), e:new Date(a.getFullYear(),11,31)};
  }

  App.ruleOcc=ruleOcc; App.itemsForDay=itemsForDay; App.eachItemInRange=eachItemInRange;
  App.totals=totals; App.balanceBefore=balanceBefore; App.rangeFor=rangeFor;
})(window.App);
