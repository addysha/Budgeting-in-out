/* Loaded last: hooks every button up to the functions above, then draws. */
(function (App) {
  "use strict";

  function show(id){ document.getElementById(id).classList.add("show"); }
  function hide(id){ document.getElementById(id).classList.remove("show"); }
  App.show=show; App.hide=hide;

  function step(dir){
    var view=App.view;
    if(view.mode==="day") view.anchor=App.addDays(view.anchor,dir);
    else if(view.mode==="week") view.anchor=App.addDays(view.anchor,7*dir);
    else if(view.mode==="month") view.anchor=App.addMonths(view.anchor,dir);
    else view.anchor=App.addYears(view.anchor,dir);
    App.render();
  }

  // ---- view switching & navigation ----
  document.getElementById("seg").addEventListener("click", function(e){ var b=e.target.closest("button[data-mode]"); if(!b) return; App.view.mode=b.getAttribute("data-mode"); App.render(); });
  document.getElementById("prev").addEventListener("click", function(){ step(-1); });
  document.getElementById("next").addEventListener("click", function(){ step(1); });
  document.getElementById("today").addEventListener("click", function(){ App.view.anchor=new Date(); App.render(); });
  document.getElementById("settingsBtn").addEventListener("click", App.openSettings);

  // ---- day sheet ----
  document.getElementById("tagSelect").addEventListener("change", App.onTagChange);
  document.getElementById("addBtn").addEventListener("click", App.addEntry);
  document.getElementById("amtInput").addEventListener("keydown", function(e){ if(e.key==="Enter"){ e.preventDefault(); App.addEntry(); } });
  document.getElementById("dayClose").addEventListener("click", function(){ hide("dayScrim"); });
  Array.prototype.forEach.call(document.querySelectorAll("#customType button"), function(b){
    b.addEventListener("click", function(){ App.setCustomType(b.getAttribute("data-t")); Array.prototype.forEach.call(document.querySelectorAll("#customType button"), function(x){x.classList.remove("on");}); b.classList.add("on"); });
  });

  // ---- settings sheet ----
  document.getElementById("addTagRow").addEventListener("click", function(){ App.state.tags.push({name:"",type:"out",amount:null,emoji:""}); App.save(); App.renderTagsTable(); });
  document.getElementById("addRecRow").addEventListener("click", function(){ App.state.recurring.push({id:"r"+Date.now(), name:"", type:"out", amount:0, emoji:"", start:App.dk(new Date()), freq:"monthly", count:12}); App.save(); App.renderRecTable(); });
  document.getElementById("startBal").addEventListener("input", function(e){ App.state.startBalance=parseFloat(e.target.value)||0; App.save(); App.render(); });
  document.getElementById("startMonth").addEventListener("change", function(e){ App.state.startM=+e.target.value; App.save(); App.render(); });
  document.getElementById("startYear").addEventListener("input", function(e){ App.state.startY=+e.target.value||App.state.startY; App.save(); App.render(); });
  document.getElementById("setClose").addEventListener("click", function(){ hide("setScrim"); App.render(); });

  // ---- automatic backup ----
  document.getElementById("backupBtn").addEventListener("click", App.backupChoose);
  document.getElementById("backupOff").addEventListener("click", App.backupDisconnect);

  // ---- export / restore ----
  document.getElementById("csvBtn").addEventListener("click", App.exportCSV);
  document.getElementById("exportBtn").addEventListener("click", App.exportJSON);
  document.getElementById("importBtn").addEventListener("click", function(){ document.getElementById("importFile").click(); });
  document.getElementById("importFile").addEventListener("change", function(e){
    var f=e.target.files[0]; if(!f) return; var r=new FileReader();
    r.onload=function(){ try{ var obj=JSON.parse(r.result); if(obj&&obj.tags&&obj.entries){ App.state=App.migrate(obj); App.save(); App.openSettings(); App.render(); } }catch(err){ alert("That file couldn't be read as a backup."); } };
    r.readAsText(f);
  });

  // ---- dismissing sheets ----
  Array.prototype.forEach.call(document.querySelectorAll(".scrim"), function(s){ s.addEventListener("click", function(e){ if(e.target===s) s.classList.remove("show"); }); });
  document.addEventListener("keydown", function(e){ if(e.key==="Escape"){ hide("dayScrim"); hide("setScrim"); } });

  App.backupInit();
  App.render();
})(window.App);
