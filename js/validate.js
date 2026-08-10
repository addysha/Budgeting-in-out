/* One place that decides whether something is filled in properly.
   Every screen asks these, so a tag typed in the day sheet and a tag typed in
   the settings sheet are held to exactly the same rules.

   Each problem comes back as {field, msg}, where msg says what to do about it
   rather than just naming what is wrong. */
(function (App) {
  "use strict";

  // Repeating an item more than this is almost certainly a typo, and a huge
  // number would make the calendar crawl, so it is capped.
  var MAX_TIMES = 520;         // 10 years of weekly
  var MAX_AMOUNT = 100000000;

  function isBlank(v){ return v===undefined || v===null || String(v).trim()===""; }

  // Accepts "12", "12.50", " 12 ". Rejects text, negatives, zero and silly sizes.
  function checkAmount(raw, label, allowBlank){
    if(isBlank(raw)) return allowBlank ? null : {field:"amount", msg:"Type how much "+label+" is, for example 25."};
    var n = typeof raw==="number" ? raw : parseFloat(String(raw).trim());
    if(isNaN(n)) return {field:"amount", msg:"That amount is not a number. Type digits only, like 25 or 25.50."};
    if(n<0) return {field:"amount", msg:"Amounts are always positive. Use the In or Out setting to say which way the money goes."};
    if(n===0) return {field:"amount", msg:"Zero would not change anything. Type the real amount, or leave it blank if it varies."};
    if(n>MAX_AMOUNT) return {field:"amount", msg:"That amount looks too big. Check for an extra digit."};
    return null;
  }

  function checkName(raw){
    if(isBlank(raw)) return {field:"name", msg:"Give this a name so you can recognise it later, like Rent or Petrol."};
    if(String(raw).trim().length>60) return {field:"name", msg:"That name is very long. Shorten it so it fits on the calendar."};
    return null;
  }

  // A tag may leave the amount blank, which means "it varies".
  function tag(t){
    var problems=[], e;
    if((e=checkName(t.name))) problems.push(e);
    if((e=checkAmount(t.amount, "this", true))) problems.push(e);
    return problems;
  }

  // A repeating item needs everything: it fills the calendar on its own.
  function recurring(r){
    var problems=[], e;
    if((e=checkName(r.name))) problems.push(e);
    if((e=checkAmount(r.amount, "this", false))) problems.push(e);

    if(isBlank(r.start) || !App.validDayKey(r.start)){
      problems.push({field:"start", msg:"Pick the date of the first one, then it repeats from there."});
    }
    var freqs=App.FREQS.map(function(f){ return f[0]; });
    if(isBlank(r.freq) || freqs.indexOf(r.freq)===-1){
      problems.push({field:"freq", msg:"Choose how often this comes back, such as monthly."});
    }
    var c = parseInt(r.count,10);
    if(isBlank(r.count) || isNaN(c) || c<1){
      problems.push({field:"count", msg:"Say how many times it happens. For a year of monthly rent, that is 12."});
    } else if(c>MAX_TIMES){
      problems.push({field:"count", msg:"That is more than "+MAX_TIMES+" times, which is longer than most people plan for. Try a smaller number."});
    }
    return problems;
  }

  // A row nobody has touched yet. Safe to drop rather than nag about.
  function untouchedTag(t){ return isBlank(t.name) && isBlank(t.amount) && isBlank(t.emoji); }
  function untouchedRec(r){ return isBlank(r.name) && (isBlank(r.amount)||Number(r.amount)===0) && isBlank(r.emoji); }

  App.validate = {
    tag:tag, recurring:recurring, amount:checkAmount, name:checkName,
    untouchedTag:untouchedTag, untouchedRec:untouchedRec,
    MAX_TIMES:MAX_TIMES
  };
})(window.App);
