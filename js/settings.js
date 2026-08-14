/* The "ins & outs" sheet: your reusable tags and your repeating items.
   Tags are a compact table (four short fields). Repeating items have seven
   fields, which is too many for one line to stay readable, so each one is a
   small card with its fields labelled.

   Anything half filled in is called out in red underneath the row it belongs
   to, with a note on how to fix it, and Done will not close until it is sorted. */
(function (App) {
  "use strict";

  function openSettings(){
    var state=App.state;
    document.getElementById("startBal").value=state.startBalance;
    var msel=document.getElementById("startMonth"); msel.innerHTML=""; App.MONTHS.forEach(function(m,i){ var o=document.createElement("option"); o.value=String(i); o.textContent=m; msel.appendChild(o); }); msel.value=String(state.startM);
    document.getElementById("startYear").value=state.startY;
    renderTagsTable(); renderRecTable(); App.backupStatus(); App.show("setScrim");
  }

  function typeOptions(sel){
    return '<option value="in"'+(sel==="in"?" selected":"")+'>In</option>'+
           '<option value="out"'+(sel==="out"?" selected":"")+'>Out</option>';
  }
  function f(row,name){ return row.querySelector('[data-f="'+name+'"]'); }

  // Paint the problems onto a row: red outline on the guilty fields, and one
  // line of advice per problem underneath.
  function showProblems(row, problems, fields){
    fields.forEach(function(name){ var el=f(row,name); if(el) el.classList.remove("invalid"); });
    var box=row.querySelector(".row-errors");

    // Nothing wrong: take the box away entirely, or an empty red bar is left behind.
    if(!problems.length){
      if(box) box.parentNode.removeChild(box);
      row.classList.remove("has-error");
      return false;
    }

    if(!box){ box=document.createElement("div"); box.className="row-errors"; row.appendChild(box); }
    box.innerHTML="";
    row.classList.add("has-error");
    problems.forEach(function(p){
      var el=f(row,p.field); if(el) el.classList.add("invalid");
      var line=document.createElement("p"); line.className="err"; line.textContent=p.msg; box.appendChild(line);
    });
    return true;
  }

  var TAG_FIELDS=["name","amount"], REC_FIELDS=["name","amount","start","freq","count"];

  // ---- drag to reorder the tags ----
  // The row being dragged carries a "dragging" class; the container handler
  // slides it above whichever row the pointer is over, and the new on-screen
  // order is written back to the tags array when the drag ends.
  function getDragAfterElement(container, y){
    var els=Array.prototype.slice.call(container.querySelectorAll('.row-wrap:not(.dragging)'));
    var best=null, bestOff=-Infinity;
    for(var i=0;i<els.length;i++){
      var b=els[i].getBoundingClientRect(), off=y-b.top-b.height/2;
      if(off<0 && off>bestOff){ bestOff=off; best=els[i]; }
    }
    return best;
  }
  function onTagsDragOver(e){
    var box=e.currentTarget, dragging=box.querySelector('.row-wrap.dragging');
    if(!dragging) return;
    e.preventDefault();
    var after=getDragAfterElement(box, e.clientY);
    if(after==null) box.appendChild(dragging); else box.insertBefore(dragging, after);
  }
  function commitTagOrder(){
    var box=document.getElementById("tagsTable");
    var order=Array.prototype.slice.call(box.querySelectorAll('.row-wrap')).map(function(el){ return parseInt(el.getAttribute("data-idx"),10); });
    if(!order.some(function(v,i){ return v!==i; })) return; // nothing actually moved
    App.state.tags=order.map(function(i){ return App.state.tags[i]; });
    App.save(); renderTagsTable(); App.render();
  }

  // ---- tags ----
  function renderTagsTable(){
    var state=App.state, esc=App.esc, box=document.getElementById("tagsTable");
    box.innerHTML="";

    if(state.tags.length===0){
      box.innerHTML='<p class="empty-note">No tags yet. Add the things you spend on or earn from, so you can pick them from a list instead of typing them out.</p>';
      return;
    }

    var head=document.createElement("div");
    head.className="tag-row head";
    head.innerHTML='<div></div><div class="colhead">Emoji</div><div class="colhead">Name</div><div class="colhead">In or out</div><div class="colhead">Usual amount</div><div></div>';
    box.appendChild(head);

    // Wire drag-reordering onto the container once; it survives re-renders.
    if(!box._dndWired){ box._dndWired=true;
      box.addEventListener("dragover", onTagsDragOver);
      box.addEventListener("drop", function(e){ if(box.querySelector(".row-wrap.dragging")) e.preventDefault(); });
    }

    state.tags.forEach(function(t,idx){
      var wrap=document.createElement("div"); wrap.className="row-wrap"; wrap.setAttribute("data-idx", idx);
      var row=document.createElement("div"); row.className="tag-row";
      row.innerHTML='<button type="button" data-f="grip" class="grip" draggable="true" aria-label="Drag to reorder" title="Drag to reorder">⠿</button>'+
        '<input data-f="emoji" class="mini emoji-input" maxlength="4" value="'+esc(t.emoji||"")+'" aria-label="Emoji" />'+
        '<input data-f="name" class="mini" type="text" value="'+esc(t.name)+'" placeholder="Name" aria-label="Name" />'+
        '<select data-f="type" class="mini" aria-label="In or out">'+typeOptions(t.type)+'</select>'+
        '<input data-f="amount" class="mini" type="number" step="0.01" min="0" value="'+(t.amount!=null?t.amount:"")+'" placeholder="Varies" aria-label="Usual amount" />'+
        '<button data-f="del" class="del" aria-label="Remove this one">×</button>';
      wrap.appendChild(row);

      function recheck(){ showProblems(wrap, App.validate.tag(state.tags[idx]), TAG_FIELDS); }
      f(row,"emoji").addEventListener("input",function(){ state.tags[idx].emoji=this.value; App.save(); });
      f(row,"name").addEventListener("input",function(){ state.tags[idx].name=this.value; App.save(); recheck(); });
      f(row,"type").addEventListener("change",function(){ state.tags[idx].type=this.value; App.save(); });
      f(row,"amount").addEventListener("input",function(){
        var v=this.value; state.tags[idx].amount = v===""?null:parseFloat(v);
        App.save(); recheck();
      });
      f(row,"del").addEventListener("click",function(){ state.tags.splice(idx,1); App.save(); renderTagsTable(); App.render(); });

      var grip=f(row,"grip");
      grip.addEventListener("dragstart",function(e){
        wrap.classList.add("dragging");
        e.dataTransfer.effectAllowed="move";
        try{ e.dataTransfer.setData("text/plain", String(idx)); }catch(_){}
        if(e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(wrap, 16, 16);
      });
      grip.addEventListener("dragend",function(){ wrap.classList.remove("dragging"); commitTagOrder(); });
      grip.addEventListener("click",function(e){ e.preventDefault(); });

      // Only nag about a row already worked on, not one just added.
      if(!App.validate.untouchedTag(t)) recheck();
      box.appendChild(wrap);
    });
  }

  // ---- repeating items ----
  function renderRecTable(){
    var state=App.state, esc=App.esc, box=document.getElementById("recTable");
    box.innerHTML="";

    if(state.recurring.length===0){
      box.innerHTML='<p class="empty-note">Nothing repeating yet. Add your pay, rent or a subscription and it will fill itself in on the calendar.</p>';
      return;
    }

    state.recurring.forEach(function(r,idx){
      var card=document.createElement("div"); card.className="rec-card";
      var freqOpts=App.FREQS.map(function(x){ return '<option value="'+x[0]+'"'+(r.freq===x[0]?" selected":"")+'>'+x[1]+'</option>'; }).join("");
      card.innerHTML=
        '<div class="rec-line">'+
          '<label class="minifield emoji-col">Emoji<input data-f="emoji" class="mini emoji-input" maxlength="4" value="'+esc(r.emoji||"")+'" /></label>'+
          '<label class="minifield grow">Name<input data-f="name" class="mini" type="text" value="'+esc(r.name)+'" placeholder="e.g. Rent" /></label>'+
          '<label class="minifield">In or out<select data-f="type" class="mini">'+typeOptions(r.type)+'</select></label>'+
          '<label class="minifield">Amount<input data-f="amount" class="mini" type="number" step="0.01" min="0" value="'+(r.amount!=null&&r.amount!==0?r.amount:"")+'" /></label>'+
        '</div>'+
        '<div class="rec-line">'+
          '<label class="minifield grow">First one on<input data-f="start" class="mini" type="date" value="'+App.isoOf(r.start)+'" /></label>'+
          '<label class="minifield grow">How often<select data-f="freq" class="mini">'+freqOpts+'</select></label>'+
          '<label class="minifield">How many<input data-f="count" class="mini" type="number" step="1" min="1" value="'+(r.count||"")+'" /></label>'+
          '<button data-f="del" class="del rec-del" aria-label="Remove this one">×</button>'+
        '</div>'+
        '<p class="rec-summary" data-f="summary"></p>';

      function after(){ App.save(); summarise(card,r); showProblems(card, App.validate.recurring(r), REC_FIELDS); App.render(); }
      f(card,"emoji").addEventListener("input",function(){ r.emoji=this.value; App.save(); });
      f(card,"name").addEventListener("input",function(){ r.name=this.value; after(); });
      f(card,"type").addEventListener("change",function(){ r.type=this.value; after(); });
      f(card,"amount").addEventListener("input",function(){ r.amount=this.value===""?null:parseFloat(this.value); after(); });
      f(card,"start").addEventListener("change",function(){
        if(this.value){ var p=this.value.split("-"); r.start=(+p[0])+"-"+(p[1]-1)+"-"+(+p[2]); } else { r.start=""; }
        after();
      });
      f(card,"freq").addEventListener("change",function(){ r.freq=this.value; after(); });
      f(card,"count").addEventListener("input",function(){ r.count=this.value===""?"":parseInt(this.value,10); after(); });
      f(card,"del").addEventListener("click",function(){ state.recurring.splice(idx,1); App.save(); renderRecTable(); App.render(); });

      summarise(card,r);
      if(!App.validate.untouchedRec(r)) showProblems(card, App.validate.recurring(r), REC_FIELDS);
      box.appendChild(card);
    });
  }

  // A plain-English restatement of the row, so you can see what you just set up.
  function summarise(card,r){
    var el=card.querySelector('[data-f="summary"]'); if(!el) return;
    var occ=App.ruleOcc(r);
    if(!r.name || !occ.length){ el.textContent=""; return; }
    var last=occ[occ.length-1];
    var freq=(App.FREQS.filter(function(x){ return x[0]===r.freq; })[0]||["","every so often"])[1].toLowerCase();
    var when=function(d){ return d.getDate()+" "+App.MON3[d.getMonth()]+" "+d.getFullYear(); };
    el.textContent = App.fmtMoney(r.amount||0) + (r.type==="in"?" in":" out") + ", " + freq +
      ", " + occ.length + (occ.length===1?" time":" times") +
      ", from " + when(occ[0]) + " to " + when(last) + ".";
  }

  // ---- adding rows ----
  // Refuse to stack up a second blank row while the first is still unfinished.
  function addTagRow(){
    var state=App.state;
    var unfinished=firstProblemIndex(state.tags, App.validate.tag);
    if(unfinished>-1) return focusProblem("#tagsTable .row-wrap", unfinished, "Finish this one first, then you can add another.");
    state.tags.push({name:"",type:"out",amount:null,emoji:""}); App.save(); renderTagsTable();
    focusLast("#tagsTable .row-wrap", "name");
  }
  function addRecRow(){
    var state=App.state;
    var unfinished=firstProblemIndex(state.recurring, App.validate.recurring);
    if(unfinished>-1) return focusProblem("#recTable .rec-card", unfinished, "Finish this one first, then you can add another.");
    state.recurring.push({id:"r"+Date.now(), name:"", type:"out", amount:null, emoji:"", start:App.dk(new Date()), freq:"monthly", count:12});
    App.save(); renderRecTable();
    focusLast("#recTable .rec-card", "name");
  }
  function firstProblemIndex(list, check){
    for(var i=0;i<list.length;i++){ if(check(list[i]).length) return i; }
    return -1;
  }
  function focusProblem(sel, idx, note){
    var rows=document.querySelectorAll(sel), row=rows[idx];
    if(!row) return;
    row.scrollIntoView({block:"center"});
    row.classList.add("flash");
    setTimeout(function(){ row.classList.remove("flash"); }, 900);
    var box=row.querySelector(".row-errors");
    if(box && note && !box.querySelector(".err-note")){
      var p=document.createElement("p"); p.className="err err-note"; p.textContent=note; box.appendChild(p);
      setTimeout(function(){ if(p.parentNode) p.parentNode.removeChild(p); }, 4000);
    }
    var bad=row.querySelector(".invalid"); if(bad) bad.focus();
  }
  function focusLast(sel, field){
    var rows=document.querySelectorAll(sel), row=rows[rows.length-1];
    if(!row) return;
    row.scrollIntoView({block:"center"});
    var el=row.querySelector('[data-f="'+field+'"]'); if(el) el.focus();
  }

  // ---- closing ----
  // Untouched rows are dropped quietly. Half finished ones are held back.
  function tryClose(){
    var state=App.state, dropped=false;
    state.tags=state.tags.filter(function(t){ if(App.validate.untouchedTag(t)){ dropped=true; return false; } return true; });
    state.recurring=state.recurring.filter(function(r){ if(App.validate.untouchedRec(r)){ dropped=true; return false; } return true; });
    if(dropped){ App.save(); renderTagsTable(); renderRecTable(); }

    var badTag=firstProblemIndex(state.tags, App.validate.tag);
    var badRec=firstProblemIndex(state.recurring, App.validate.recurring);
    if(badTag>-1){ focusProblem("#tagsTable .row-wrap", badTag, "Fix this to close, or press × to remove the row."); return false; }
    if(badRec>-1){ focusProblem("#recTable .rec-card", badRec, "Fix this to close, or press × to remove the row."); return false; }

    App.hide("setScrim"); App.render();
    return true;
  }

  App.openSettings=openSettings; App.renderTagsTable=renderTagsTable; App.renderRecTable=renderRecTable;
  App.addTagRow=addTagRow; App.addRecRow=addRecRow; App.trySettingsClose=tryClose;
})(window.App);
