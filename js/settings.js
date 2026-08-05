/* The "ins & outs" sheet: editable tables of tags and repeating items. */
(function (App) {
  "use strict";

  function openSettings(){
    var state=App.state;
    document.getElementById("startBal").value=state.startBalance;
    var msel=document.getElementById("startMonth"); msel.innerHTML=""; App.MONTHS.forEach(function(m,i){ var o=document.createElement("option"); o.value=String(i); o.textContent=m; msel.appendChild(o); }); msel.value=String(state.startM);
    document.getElementById("startYear").value=state.startY;
    renderTagsTable(); renderRecTable(); App.show("setScrim");
  }

  function renderTagsTable(){
    var state=App.state, esc=App.esc;
    var box=document.getElementById("tagsTable"); box.innerHTML='<div class="colhead">Emoji</div><div class="colhead">Name</div><div class="colhead">Type</div><div class="colhead">Amount</div><div></div>';
    state.tags.forEach(function(t,idx){
      var row=document.createElement("div"); row.className="tag-row";
      row.innerHTML='<input class="mini emoji-input" maxlength="4" value="'+esc(t.emoji||"")+'" />'+
        '<input class="mini" type="text" value="'+esc(t.name)+'" placeholder="Name" />'+
        '<select class="mini"><option value="in"'+(t.type==="in"?" selected":"")+'>In</option><option value="out"'+(t.type==="out"?" selected":"")+'>Out</option></select>'+
        '<input class="mini" type="number" step="0.01" value="'+(t.amount!=null?t.amount:"")+'" placeholder="blank = variable" />'+
        '<button class="del">×</button>';
      var em=row.children[0], nm=row.children[1], ty=row.children[2], am=row.children[3], del=row.children[4];
      em.addEventListener("input",function(){state.tags[idx].emoji=em.value;App.save();});
      nm.addEventListener("input",function(){state.tags[idx].name=nm.value;App.save();});
      ty.addEventListener("change",function(){state.tags[idx].type=ty.value;App.save();});
      am.addEventListener("input",function(){state.tags[idx].amount=am.value===""?null:parseFloat(am.value);App.save();});
      del.addEventListener("click",function(){state.tags.splice(idx,1);App.save();renderTagsTable();});
      box.appendChild(row);
    });
  }

  function renderRecTable(){
    var state=App.state, esc=App.esc;
    var box=document.getElementById("recTable"); box.innerHTML='<div class="rec-row"><div class="colhead">Emoji</div><div class="colhead">Name</div><div class="colhead">Type</div><div class="colhead">Amount</div><div class="colhead">Starts</div><div class="colhead">Repeats</div><div class="colhead">Times</div><div></div></div>';
    state.recurring.forEach(function(r,idx){
      var row=document.createElement("div"); row.className="rec-row";
      var startISO=App.isoOf(r.start);
      var freqOpts=App.FREQS.map(function(f){return '<option value="'+f[0]+'"'+(r.freq===f[0]?" selected":"")+'>'+f[1]+'</option>';}).join("");
      row.innerHTML='<input class="mini emoji-input" maxlength="4" value="'+esc(r.emoji||"")+'" />'+
        '<input class="mini" type="text" value="'+esc(r.name)+'" />'+
        '<select class="mini"><option value="in"'+(r.type==="in"?" selected":"")+'>In</option><option value="out"'+(r.type==="out"?" selected":"")+'>Out</option></select>'+
        '<input class="mini" type="number" step="0.01" value="'+(r.amount!=null?r.amount:"")+'" />'+
        '<input class="mini" type="date" value="'+startISO+'" />'+
        '<select class="mini">'+freqOpts+'</select>'+
        '<input class="mini" type="number" step="1" value="'+(r.count||0)+'" />'+
        '<button class="del">×</button>';
      var c=row.children;
      c[0].addEventListener("input",function(){r.emoji=c[0].value;App.save();});
      c[1].addEventListener("input",function(){r.name=c[1].value;App.save();});
      c[2].addEventListener("change",function(){r.type=c[2].value;App.save();});
      c[3].addEventListener("input",function(){r.amount=c[3].value===""?0:parseFloat(c[3].value);App.save();});
      c[4].addEventListener("change",function(){ if(c[4].value){ var p=c[4].value.split("-"); r.start=(+p[0])+"-"+(p[1]-1)+"-"+(+p[2]); App.save(); } });
      c[5].addEventListener("change",function(){r.freq=c[5].value;App.save();});
      c[6].addEventListener("input",function(){r.count=parseInt(c[6].value,10)||0;App.save();});
      c[7].addEventListener("click",function(){state.recurring.splice(idx,1);App.save();renderRecTable();});
      box.appendChild(row);
    });
  }

  App.openSettings=openSettings; App.renderTagsTable=renderTagsTable; App.renderRecTable=renderRecTable;
})(window.App);
