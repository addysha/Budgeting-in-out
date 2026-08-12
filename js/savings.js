/* The "Where your money goes" sheet: it groups the current view's spending by
   name, splits it into essentials and nice-to-haves, and works out what you
   could save by trimming the cuttable ones. All of it is plain arithmetic on
   figures you already typed - nothing leaves this browser.

   How something is judged, in order: your own call wins (kept in state.spendClass);
   then the name is checked against the keywords below; then the emoji, which is
   brand- and language-proof ("Woolworths 🛒" and "Meridian Energy ⚡" read as
   essentials from the emoji when the name means nothing to a keyword list);
   and anything still unrecognised is offered up as a candidate to cut. A guess
   you disagree with is one tap to flip, and the flip is remembered. */
(function (App) {
  "use strict";

  // Roughly-fixed costs of living. Matched as substrings of the lower-cased name.
  var ESSENTIAL_KW = ["rent","mortgage","power","electric","energy","hydro","water",
    "gas","utilit","insurance","tax","loan","repay","council","rates","landlord",
    "medical","health","doctor","dentist","chemist","clinic","pharmac","vet",
    "childcare","daycare","school","tuition","fuel","petrol","diesel","transport",
    "bus fare","train","parking","toll","internet","broadband","phone","mobile",
    "grocer","supermarket","food shop"];
  // Things people can usually dial back. Only consulted after the essentials miss.
  var DISCRETIONARY_KW = ["coffee","cafe","café","restaurant","dining","dine",
    "takeaway","takeout","take-out","eat out","snack","fast food","bar","pub",
    "alcohol","beer","wine","drinks","entertain","movie","cinema","netflix",
    "spotify","disney","prime","subscri","stream","game","gaming","shopping",
    "clothes","clothing","fashion","shoes","gift","holiday","travel","vacation",
    "hobby","beauty","salon","makeup","gym"];

  // Emoji hints, used when the name tells a keyword list nothing. These carry
  // meaning across brands and languages, so a grocery run named after any shop
  // still reads as essential from its 🛒.
  var ESSENTIAL_EMO = ["🏠","🏡","🛒","🥦","⛽","⚡","💡","🔌","🔥","💧","🚰","📱",
    "☎️","🌐","📶","🚗","🚙","🚌","🚆","🚇","🏥","💊","🩺","🦷","🧾","👶","🅿️"];
  var DISCRETIONARY_EMO = ["☕","🍽️","🍔","🍕","🍟","🍺","🍷","🍸","🎬","🎞️","🎵",
    "🎧","🎮","🕹️","🎁","✈️","🏖️","👗","👟","👜","💄","💅","💈","💪","🏋️","🎨",
    "🛍️","🎰","🚬"];

  // Slider position (percent to trim). Not saved - it's a what-if, not a setting.
  var trimPct = 30;

  function keyOf(name){ return (name||"").toLowerCase().trim(); }

  function guess(key, emoji){
    for(var i=0;i<ESSENTIAL_KW.length;i++) if(key.indexOf(ESSENTIAL_KW[i])!==-1) return "essential";
    for(var j=0;j<DISCRETIONARY_KW.length;j++) if(key.indexOf(DISCRETIONARY_KW[j])!==-1) return "discretionary";
    if(emoji){
      if(ESSENTIAL_EMO.indexOf(emoji)!==-1) return "essential";
      if(DISCRETIONARY_EMO.indexOf(emoji)!==-1) return "discretionary";
    }
    // Anything still unrecognised is offered up as a candidate; one tap marks it essential.
    return "discretionary";
  }

  // Your override if you've made one, otherwise the keyword/emoji guess.
  function classOf(name, emoji){
    var key=keyOf(name), own=App.state.spendClass[key];
    return own==="essential"||own==="discretionary" ? own : guess(key, emoji);
  }

  // Sum this view's "out" items by name, keeping an emoji and whether the
  // classification was your call or just a guess.
  function collect(){
    var rg=App.rangeFor(), groups={};
    App.eachItemInRange(rg.s, rg.e, function(it, kind){
      if(!it || it.type!=="out") return;
      var amt=parseFloat(it.amount); if(!isFinite(amt) || amt<=0) return;
      var key=keyOf(it.name); if(!key) key="(unnamed)";
      if(!groups[key]) groups[key]={key:key, name:it.name||"Unnamed", emoji:it.emoji||"", total:0, count:0, recurring:false};
      groups[key].total+=amt;
      groups[key].count+=1;
      if(kind==="recurring") groups[key].recurring=true;
      if(!groups[key].emoji && it.emoji) groups[key].emoji=it.emoji;
    });
    var list=[];
    for(var k in groups){
      var g=groups[k];
      g.cls=classOf(g.name, g.emoji);
      g.owned=(App.state.spendClass[g.key]==="essential"||App.state.spendClass[g.key]==="discretionary");
      // "Regular" means it looks like a habit worth annualising: it comes from a
      // repeat rule, or it turned up more than once in this stretch. Something
      // seen just once is treated as a one-off and kept out of the yearly maths.
      g.regular = g.recurring || g.count>=2;
      list.push(g);
    }
    list.sort(function(a,b){ return b.total-a.total; });
    return list;
  }

  // How many days the current view spans, so any period annualises the same way.
  function periodDays(){
    var rg=App.rangeFor();
    return Math.max(1, Math.round((App.T(rg.e)-App.T(rg.s))/86400000)+1);
  }
  function perYear(amount){ return amount * (365/periodDays()); }

  function periodLabel(){
    var v=App.view, rg=App.rangeFor();
    if(v.mode==="day") return rg.s.toLocaleDateString("en-NZ",{day:"numeric",month:"long",year:"numeric"});
    if(v.mode==="week") return "the week of "+rg.s.getDate()+" "+App.MON3[rg.s.getMonth()];
    if(v.mode==="month") return App.MONTHS[v.anchor.getMonth()]+" "+v.anchor.getFullYear();
    return String(v.anchor.getFullYear());
  }

  function openSavings(){ renderSavings(); App.show("savScrim"); }

  function renderSavings(){
    var body=document.getElementById("savBody");
    var sub=document.getElementById("savSub");
    var f=App.fmtMoney, esc=App.esc;
    var list=collect();
    var when=periodLabel();

    sub.textContent="Based on what you spent in "+when+". Change the view behind this to look at a different stretch.";
    body.innerHTML="";

    if(!list.length){
      body.innerHTML='<p class="empty-note">No spending recorded for '+esc(when)+' yet. Add a few "out" entries, then come back and I\'ll show you where it\'s going.</p>';
      return;
    }

    // Cuttable spending splits two ways: regular habits (safe to project over a
    // year) and one-offs (counted for this stretch only, never annualised).
    var outTotal=0, cutRegular=0, cutOneOff=0, oneOffs=[];
    list.forEach(function(g){
      outTotal+=g.total;
      if(g.cls!=="discretionary") return;
      if(g.regular) cutRegular+=g.total; else { cutOneOff+=g.total; oneOffs.push(g); }
    });
    var maxCat=list[0].total || 1;

    // ---- headline ----
    var head=document.createElement("p"); head.className="sav-lead";
    var lead="You spent <strong>"+f(outTotal)+"</strong> in "+esc(when)+". ";
    lead += cutRegular>0
      ? "About <strong>"+f(cutRegular)+"</strong> of that is regular spending you could trim"
      : "Nothing regular stands out as easy to trim";
    if(cutOneOff>0) lead += ", plus <strong>"+f(cutOneOff)+"</strong> on one-off buys that don't repeat";
    lead += ".";
    head.innerHTML=lead;
    body.appendChild(head);

    // ---- spending, biggest first ----
    var h1=document.createElement("div"); h1.className="section-h"; h1.textContent="Your spending, biggest first"; body.appendChild(h1);
    var p1=document.createElement("p"); p1.className="hint"; p1.textContent="Tap the tag on the right to switch anything between essential and cuttable. I'll remember your choice."; body.appendChild(p1);

    var rows=document.createElement("div"); rows.className="spend-list";
    list.forEach(function(g){
      var cut=(g.cls==="discretionary");
      var once=(cut && !g.regular);
      var row=document.createElement("div"); row.className="spend-row"+(cut?" cut":" ess");
      var pctW=Math.max(4, Math.round((g.total/maxCat)*100));
      var times=(g.count===1?"once":g.count+" times");
      row.innerHTML=
        '<span class="sp-lead">'+(g.emoji?esc(g.emoji):'<span class="sp-dot"></span>')+'</span>'+
        '<span class="sp-nm">'+esc(g.name)+(once?' <span class="sp-once">one-off</span>':'')+'</span>'+
        '<span class="sp-amt">'+f(g.total)+'</span>'+
        '<div class="sp-meta">'+
          '<div class="sp-bar"><i style="width:'+pctW+'%"></i></div>'+
          '<span class="sp-count">'+times+'</span>'+
        '</div>';
      var chip=document.createElement("button");
      chip.className="sp-chip "+(cut?"is-cut":"is-ess");
      chip.type="button";
      chip.textContent=cut?"Cuttable":"Essential";
      chip.title=(g.owned?"You set this":"Guessed")+" - tap to change";
      chip.setAttribute("aria-label", esc(g.name)+" is "+(cut?"cuttable":"essential")+", tap to change");
      chip.addEventListener("click", function(){
        App.state.spendClass[g.key] = cut ? "essential" : "discretionary";
        App.save(); renderSavings();
      });
      row.appendChild(chip);
      rows.appendChild(row);
    });
    body.appendChild(rows);

    // ---- ideas (regular habits only, so nothing gets a made-up yearly figure) ----
    var ideas=list.filter(function(g){ return g.cls==="discretionary" && g.regular && g.total>0; }).slice(0,4);
    if(ideas.length){
      var h2=document.createElement("div"); h2.className="section-h"; h2.textContent="Ideas to save"; body.appendChild(h2);
      var ul=document.createElement("div"); ul.className="idea-list";
      ideas.forEach(function(g){
        var yr=perYear(g.total);
        var card=document.createElement("div"); card.className="idea";
        card.innerHTML='<span class="idea-emoji">'+(g.emoji?esc(g.emoji):"💡")+'</span>'+
          '<span class="idea-text"><strong>'+esc(g.name)+'</strong> came to '+f(g.total)+' in '+esc(when)+
          ' - about <strong>'+f(yr)+'</strong> a year if it stays regular. Spending '+
          '<strong class="trim-word">'+trimPct+'%</strong> less would save about '+
          '<strong class="idea-save" data-year="'+yr+'">'+f(yr*(trimPct/100))+'</strong> a year.</span>';
        ul.appendChild(card);
      });
      body.appendChild(ul);
    }

    // ---- max saving what-if (regular cuttable spending only) ----
    var h3=document.createElement("div"); h3.className="section-h"; h3.textContent="Your biggest possible saving"; body.appendChild(h3);
    var box=document.createElement("div"); box.className="sav-max";
    if(cutRegular>0){
      box.innerHTML=
        '<div class="sav-slider-line">'+
          '<label for="trimRange">Spend <output id="trimOut">'+trimPct+'%</output> less on your regular cuttable items</label>'+
        '</div>'+
        '<input type="range" id="trimRange" min="0" max="100" step="5" value="'+trimPct+'" />'+
        '<div class="sav-figs">'+
          '<div class="sav-fig"><div class="lab">Saved in '+esc(when)+'</div><div class="val pos" id="savePeriod"></div></div>'+
          '<div class="sav-fig"><div class="lab">Saved over a year</div><div class="val pos" id="saveYear"></div></div>'+
        '</div>';
      body.appendChild(box);
    } else {
      box.innerHTML='<p class="hint" style="margin:0">Nothing regular is marked cuttable, so there\'s no ongoing saving to add up. Mark a repeating item as cuttable above and it\'ll show here.</p>';
      body.appendChild(box);
    }

    // ---- one-off buys: acknowledged, but kept out of the yearly figures ----
    if(cutOneOff>0){
      var names=oneOffs.slice(0,3).map(function(g){ return esc(g.name); }).join(", ") + (oneOffs.length>3?" and more":"");
      var note=document.createElement("p"); note.className="hint oneoff-note";
      note.innerHTML="On top of that you spent <strong>"+f(cutOneOff)+"</strong> on one-off buys ("+names+
        "). They only turned up once, so they're left out of the yearly estimate - skipping them is a one-time saving, not a repeating one.";
      body.appendChild(note);
    }

    // Recompute every figure that depends on the trim slider, in place.
    function paint(){
      var frac=trimPct/100;
      var to=document.getElementById("trimOut"); if(to) to.textContent=trimPct+"%";
      var sp=document.getElementById("savePeriod"); if(sp) sp.textContent=f(cutRegular*frac);
      var sy=document.getElementById("saveYear"); if(sy) sy.textContent=f(perYear(cutRegular)*frac);
      Array.prototype.forEach.call(document.querySelectorAll(".trim-word"), function(el){ el.textContent=trimPct+"%"; });
      Array.prototype.forEach.call(document.querySelectorAll(".idea-save"), function(el){
        el.textContent=f((parseFloat(el.getAttribute("data-year"))||0)*frac);
      });
    }
    var range=document.getElementById("trimRange");
    if(range) range.addEventListener("input", function(){ trimPct=parseInt(this.value,10)||0; paint(); });
    paint();
  }

  App.openSavings=openSavings; App.renderSavings=renderSavings;
})(window.App);
