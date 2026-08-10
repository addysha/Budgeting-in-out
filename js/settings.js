/* The "ins & outs" sheet: your reusable tags and your repeating items.
   Tags are a compact table (four short fields). Repeating items have seven
   fields, which is too many for one line to stay readable, so each one is a
   small card with its fields labelled. */
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
    head.innerHTML='<div class="colhead">Emoji</div><div class="colhead">Name</div><div class="colhead">In or out</div><div class="colhead">Usual amount</div><div></div>';
    box.appendChild(head);

    state.tags.forEach(function(t,idx){
      var row=document.createElement("div"); row.className="tag-row";
      row.innerHTML='<input data-f="emoji" class="mini emoji-input" maxlength="4" value="'+esc(t.emoji||"")+'" aria-label="Emoji" />'+
        '<input data-f="name" class="mini" type="text" value="'+esc(t.name)+'" placeholder="Name" aria-label="Name" />'+
        '<select data-f="type" class="mini" aria-label="In or out">'+typeOptions(t.type)+'</select>'+
        '<input data-f="amount" class="mini" type="number" step="0.01" value="'+(t.amount!=null?t.amount:"")+'" placeholder="Varies" aria-label="Usual amount" />'+
        '<button data-f="del" class="del" aria-label="Remove '+esc(t.name)+'">×</button>';
      f(row,"emoji").addEventListener("input",function(){ state.tags[idx].emoji=this.value; App.save(); });
      f(row,"name").addEventListener("input",function(){ state.tags[idx].name=this.value; App.save(); });
      f(row,"type").addEventListener("change",function(){ state.tags[idx].type=this.value; App.save(); });
      f(row,"amount").addEventListener("input",function(){ state.tags[idx].amount=this.value===""?null:parseFloat(this.value); App.save(); });
      f(row,"del").addEventListener("click",function(){ state.tags.splice(idx,1); App.save(); renderTagsTable(); });
      box.appendChild(row);
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
          '<label class="minifield">Amount<input data-f="amount" class="mini" type="number" step="0.01" value="'+(r.amount!=null?r.amount:"")+'" /></label>'+
        '</div>'+
        '<div class="rec-line">'+
          '<label class="minifield grow">First one on<input data-f="start" class="mini" type="date" value="'+App.isoOf(r.start)+'" /></label>'+
          '<label class="minifield grow">How often<select data-f="freq" class="mini">'+freqOpts+'</select></label>'+
          '<label class="minifield">How many<input data-f="count" class="mini" type="number" step="1" min="0" value="'+(r.count||0)+'" /></label>'+
          '<button data-f="del" class="del rec-del" aria-label="Remove '+esc(r.name)+'">×</button>'+
        '</div>'+
        '<p class="rec-summary" data-f="summary"></p>';

      f(card,"emoji").addEventListener("input",function(){ r.emoji=this.value; App.save(); });
      f(card,"name").addEventListener("input",function(){ r.name=this.value; App.save(); summarise(card,r); });
      f(card,"type").addEventListener("change",function(){ r.type=this.value; App.save(); summarise(card,r); });
      f(card,"amount").addEventListener("input",function(){ r.amount=this.value===""?0:parseFloat(this.value); App.save(); summarise(card,r); });
      f(card,"start").addEventListener("change",function(){ if(this.value){ var p=this.value.split("-"); r.start=(+p[0])+"-"+(p[1]-1)+"-"+(+p[2]); App.save(); summarise(card,r); } });
      f(card,"freq").addEventListener("change",function(){ r.freq=this.value; App.save(); summarise(card,r); });
      f(card,"count").addEventListener("input",function(){ r.count=parseInt(this.value,10)||0; App.save(); summarise(card,r); });
      f(card,"del").addEventListener("click",function(){ state.recurring.splice(idx,1); App.save(); renderRecTable(); App.render(); });

      summarise(card,r);
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
      " — " + when(occ[0]) + " to " + when(last) + ".";
  }

  App.openSettings=openSettings; App.renderTagsTable=renderTagsTable; App.renderRecTable=renderRecTable;
})(window.App);
