/* The "one day" sheet: what's on that day, and the form for adding to it. */
(function (App) {
  "use strict";

  var curDay=new Date(), customType="out";
  // While a row is being edited this holds {key, idx}; null the rest of the time.
  var editing=null;

  function openDay(d){
    curDay=App.midnight(d); editing=null;
    document.getElementById("dayTitle").textContent=curDay.toLocaleDateString("en-NZ",{weekday:"long"});
    document.getElementById("daySub").textContent=curDay.toLocaleDateString("en-NZ",{day:"numeric",month:"long",year:"numeric"});
    buildTagSelect(); onTagChange(); renderEntryList(); buildEmojiQuick();
    App.show("dayScrim"); setTimeout(function(){ document.getElementById("tagSelect").focus(); },30);
  }

  function renderEntryList(){
    var items=App.itemsForDay(curDay), box=document.getElementById("entryList"); box.innerHTML="";
    if(items.length===0){ box.innerHTML='<div class="empty">No entries yet. Add your first below.</div>'; return; }
    items.forEach(function(it){
      if(it.manual && editing && editing.key===it.key && editing.idx===it.idx){ box.appendChild(editRow(it)); return; }
      var row=document.createElement("div"); row.className="entry-row "+it.type;
      var lead=document.createElement("span"); if(it.emoji){lead.className="lead";lead.textContent=it.emoji;} else {lead.className="lead dot";}
      var nm=document.createElement("span"); nm.className="nm"; nm.textContent=it.name;
      row.appendChild(lead); row.appendChild(nm);
      if(it.recurring){ var rep=document.createElement("span"); rep.className="rep"; rep.textContent="↻ repeating"; nm.appendChild(rep); }
      var amt=document.createElement("span"); amt.className="amt"; amt.textContent=(it.type==="in"?"+":"−")+App.fmtMoney(it.amount).replace("-",""); row.appendChild(amt);
      // Repeating items come from a rule, so they're changed in the ins & outs sheet, not here.
      if(it.manual){
        var ed=document.createElement("button"); ed.className="iconbtn"; ed.textContent="✎"; ed.title="Edit"; ed.setAttribute("aria-label","Edit "+it.name);
        ed.addEventListener("click", function(ev){ ev.stopPropagation(); editing={key:it.key, idx:it.idx}; renderEntryList(); });
        row.appendChild(ed);
        var del=document.createElement("button"); del.className="del"; del.textContent="×"; del.setAttribute("aria-label","Delete "+it.name);
        del.addEventListener("click", function(ev){ ev.stopPropagation(); deleteEntry(it.key,it.idx); }); row.appendChild(del);
      }
      box.appendChild(row);
    });
  }

  // The same row, swapped into editable fields. Enter saves, Escape cancels.
  function editRow(it){
    var row=document.createElement("div"); row.className="entry-row editing "+it.type;
    row.innerHTML='<input class="mini emoji-input" maxlength="4" value="'+App.esc(it.emoji||"")+'" aria-label="Emoji" />'+
      '<input class="mini nm-edit" type="text" value="'+App.esc(it.name)+'" placeholder="Name" aria-label="Name" />'+
      '<select class="mini ty-edit" aria-label="Type"><option value="in"'+(it.type==="in"?" selected":"")+'>In</option><option value="out"'+(it.type==="out"?" selected":"")+'>Out</option></select>'+
      '<input class="mini amt-edit" type="number" step="0.01" value="'+it.amount+'" aria-label="Amount" />'+
      '<button class="iconbtn ok" title="Save">✓</button>'+
      '<button class="iconbtn" title="Cancel">×</button>';
    var em=row.children[0], nm=row.children[1], ty=row.children[2], am=row.children[3], ok=row.children[4], cancel=row.children[5];

    // The row is a grid, so the error lines live in a wrapper beneath it.
    var wrap=document.createElement("div"); wrap.className="edit-wrap";
    var errBox=document.createElement("div"); errBox.className="row-errors"; errBox.style.display="none";
    wrap.appendChild(row); wrap.appendChild(errBox);

    function commit(){
      var name=(nm.value||"").trim(), problems=[], e;
      if((e=App.validate.name(name))) problems.push(e);
      if((e=App.validate.amount(am.value, "this", false))) problems.push(e);
      nm.classList.remove("invalid"); am.classList.remove("invalid");
      errBox.innerHTML="";
      if(problems.length){
        errBox.style.display="";
        problems.forEach(function(p){
          (p.field==="name"?nm:am).classList.add("invalid");
          var line=document.createElement("p"); line.className="err"; line.textContent=p.msg; errBox.appendChild(line);
        });
        (problems[0].field==="name"?nm:am).focus();
        return;
      }
      errBox.style.display="none";
      updateEntry(it.key, it.idx, {name:name, type:ty.value, amount:parseFloat(am.value), emoji:em.value.trim()});
    }
    function cancelEdit(){ editing=null; renderEntryList(); }

    ok.addEventListener("click", function(ev){ ev.stopPropagation(); commit(); });
    cancel.addEventListener("click", function(ev){ ev.stopPropagation(); cancelEdit(); });
    row.addEventListener("keydown", function(e){
      if(e.key==="Enter"){ e.preventDefault(); commit(); }
      // Stop Escape here so it closes the edit, not the whole sheet.
      else if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); cancelEdit(); }
    });
    setTimeout(function(){ nm.focus(); nm.select(); },0);
    return wrap;
  }

  function updateEntry(key,idx,patch){
    var list=App.state.entries[key];
    if(!list||!list[idx]) { editing=null; renderEntryList(); return; }
    list[idx]={name:patch.name, type:patch.type, amount:patch.amount, emoji:patch.emoji};
    App.save(); editing=null; renderEntryList(); App.render();
  }

  function buildTagSelect(){
    var sel=document.getElementById("tagSelect"); sel.innerHTML="";
    App.state.tags.forEach(function(t,i){ var o=document.createElement("option"); o.value=String(i); o.textContent=(t.emoji?t.emoji+" ":"")+t.name+"  ·  "+(t.type==="in"?"In":"Out")+(t.amount!=null?("  $"+t.amount):"  (variable)"); sel.appendChild(o); });
    var oc=document.createElement("option"); oc.value="custom"; oc.textContent="＋ Custom…"; sel.appendChild(oc);
  }

  function buildEmojiQuick(){
    var q=document.getElementById("emojiQuick"); q.innerHTML="";
    App.EMO.forEach(function(em){ var b=document.createElement("button"); b.type="button"; b.textContent=em; b.addEventListener("click", function(){ document.getElementById("emojiInput").value=em; }); q.appendChild(b); });
  }

  function onTagChange(){
    var v=document.getElementById("tagSelect").value, custom=document.getElementById("customFields"),
        saveLine=document.getElementById("saveTagLine"), amt=document.getElementById("amtInput"), emo=document.getElementById("emojiInput");
    if(v==="custom"){ custom.style.display="flex"; saveLine.style.display="flex"; amt.value=""; amt.placeholder="Amount"; emo.value=""; }
    else { custom.style.display="none"; saveLine.style.display="none"; var t=App.state.tags[+v]; emo.value=t.emoji||"";
      if(t.amount!=null){ amt.value=t.amount; amt.placeholder=""; } else { amt.value=""; amt.placeholder="Type the amount"; } }
  }

  // Show a red line under the add form and point at the field that needs work.
  function formError(problems){
    var box=document.getElementById("addError");
    ["customName","amtInput"].forEach(function(id){ document.getElementById(id).classList.remove("invalid"); });
    box.innerHTML="";
    if(!problems || !problems.length){ box.style.display="none"; return; }
    box.style.display="";
    problems.forEach(function(p){
      var id = p.field==="name" ? "customName" : "amtInput";
      var el=document.getElementById(id); if(el) el.classList.add("invalid");
      var line=document.createElement("p"); line.className="err"; line.textContent=p.msg; box.appendChild(line);
    });
    var first=problems[0], focusId = first.field==="name" ? "customName" : "amtInput";
    var el=document.getElementById(focusId); if(el) el.focus();
  }

  function addEntry(){
    var state=App.state;
    var v=document.getElementById("tagSelect").value, amtRaw=document.getElementById("amtInput").value, emo=document.getElementById("emojiInput").value.trim();
    var name,type,amount,problems=[],e;

    if(v==="custom"){
      name=(document.getElementById("customName").value||"").trim(); type=customType;
      if((e=App.validate.name(name))) problems.push(e);
      if((e=App.validate.amount(amtRaw, "this", false))) problems.push(e);
      if(problems.length) return formError(problems);
      amount=parseFloat(amtRaw);
      if(document.getElementById("saveTag").checked) state.tags.push({name:name,type:type,amount:null,emoji:emo});
    } else {
      var t=state.tags[+v];
      if(!t){ return formError([{field:"name", msg:"Choose something from the list first."}]); }
      name=t.name; type=t.type;
      var usingTagAmount = (t.amount!=null && amtRaw==="");
      if(!usingTagAmount && (e=App.validate.amount(amtRaw, "this", false))) return formError([e]);
      amount = usingTagAmount ? t.amount : parseFloat(amtRaw);
    }
    formError(null);
    editing=null;
    var key=App.dk(curDay); if(!state.entries[key]) state.entries[key]=[];
    state.entries[key].push({name:name,type:type,amount:amount,emoji:emo});
    App.save();
    document.getElementById("customName").value=""; document.getElementById("saveTag").checked=false;
    buildTagSelect(); document.getElementById("tagSelect").value=v; onTagChange();
    renderEntryList(); App.render();
  }

  function deleteEntry(key,idx){
    var state=App.state;
    editing=null;
    if(state.entries[key]){ state.entries[key].splice(idx,1); if(state.entries[key].length===0) delete state.entries[key]; App.save(); renderEntryList(); App.render(); }
  }

  function setCustomType(t){ customType=t; }

  App.openDay=openDay; App.renderEntryList=renderEntryList; App.onTagChange=onTagChange;
  App.addEntry=addEntry; App.deleteEntry=deleteEntry; App.updateEntry=updateEntry; App.setCustomType=setCustomType;
})(window.App);
