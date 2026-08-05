/* Downloading the data: CSV for sharing, JSON for a full backup. */
(function (App) {
  "use strict";

  function download(blob,name){ var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.click(); }

  function exportCSV(){
    var state=App.state;
    var rows=[["Date","Emoji","Name","Type","Amount"]];
    var all=[];
    for(var key in state.entries){ var d=App.pk(key), l=state.entries[key]; l.forEach(function(e){ all.push({d:d,e:e}); }); }
    state.recurring.forEach(function(r){ App.ruleOcc(r).forEach(function(d){ all.push({d:d,e:{name:r.name,type:r.type,amount:r.amount,emoji:r.emoji}}); }); });
    all.sort(function(a,b){ return App.T(a.d)-App.T(b.d); });
    all.forEach(function(x){
      var iso=x.d.getFullYear()+"-"+("0"+(x.d.getMonth()+1)).slice(-2)+"-"+("0"+x.d.getDate()).slice(-2);
      rows.push([iso, x.e.emoji||"", x.e.name, x.e.type==="in"?"In":"Out", x.e.amount]);
    });
    var csv=rows.map(function(r){ return r.map(function(f){ f=String(f); return /[",\n]/.test(f)?'"'+f.replace(/"/g,'""')+'"':f; }).join(","); }).join("\n");
    download(new Blob([csv],{type:"text/csv"}), "ins-and-outs-"+App.today()+".csv");
  }

  function exportJSON(){ download(new Blob([JSON.stringify(App.state,null,2)],{type:"application/json"}), "inout-backup-"+App.today()+".json"); }

  App.download=download; App.exportCSV=exportCSV; App.exportJSON=exportJSON;
})(window.App);
