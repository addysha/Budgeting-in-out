/* Drawing the calendar: title, summary tiles, and the day/week/month/year views. */
(function (App) {
  "use strict";

  function titleFor(){
    var view=App.view, a=view.anchor;
    if(view.mode==="day") return a.toLocaleDateString("en-NZ",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    if(view.mode==="week"){ var rg=App.rangeFor(); var s=rg.s,e=rg.e; return s.getDate()+" "+App.MON3[s.getMonth()]+" to "+e.getDate()+" "+App.MON3[e.getMonth()]+" "+e.getFullYear(); }
    if(view.mode==="month") return App.MONTHS[a.getMonth()]+' <span>'+a.getFullYear()+'</span>';
    return '<span style="color:var(--ink);font-weight:800">'+a.getFullYear()+'</span>';
  }

  function render(){
    Array.prototype.forEach.call(document.querySelectorAll("#seg button"), function(b){ b.classList.toggle("active", b.getAttribute("data-mode")===App.view.mode); });
    document.getElementById("title").innerHTML=titleFor();
    renderSummary();
    renderWeekdays();
    renderMain();
  }

  function renderSummary(){
    var rg=App.rangeFor(), t=App.totals(rg.s,rg.e), opening=App.balanceBefore(rg.s), net=t.inS-t.outS, closing=opening+net;
    var f=App.fmtMoney;
    var tiles=[["Opening",f(opening),""],["In",f(t.inS),"in"],["Out",f(t.outS),"out"],["Net (Saved)",f(net),net>=0?"pos":"neg"],["Closing",f(closing),""]];
    var h=""; tiles.forEach(function(x){ h+='<div class="tile"><div class="lab">'+x[0]+'</div><div class="val '+x[2]+'">'+x[1]+'</div></div>'; });
    document.getElementById("summary").innerHTML=h;
  }

  function renderWeekdays(){
    var el=document.getElementById("weekdays"), mode=App.view.mode;
    if(mode==="month"||mode==="week"){ el.className="weekdays"; el.innerHTML=App.WD.map(function(w){return "<div>"+w+"</div>";}).join(""); }
    else { el.className="weekdays hidden"; el.innerHTML=""; }
  }

  function renderMain(){
    if(App.view.mode==="month") return renderMonth();
    if(App.view.mode==="week") return renderWeek();
    if(App.view.mode==="day") return renderDay();
    return renderYear();
  }

  function pillEl(it){
    var p=document.createElement("div"); p.className="pill "+it.type;
    var lead=document.createElement("span");
    if(it.emoji){ lead.className="lead"; lead.textContent=it.emoji; } else { lead.className="lead dot"; }
    var nm=document.createElement("span"); nm.className="nm"; nm.textContent=it.name;
    var amt=document.createElement("span"); amt.className="amt"; amt.textContent=App.fmtMoney(it.amount);
    p.appendChild(lead); p.appendChild(nm);
    if(it.recurring){ var r=document.createElement("span"); r.className="rep"; r.textContent="↻"; p.appendChild(r); }
    p.appendChild(amt);
    return p;
  }

  function dayCell(d, dim, maxPills){
    var cell=document.createElement("div");
    cell.className="cell"+(dim?" dim":"")+(App.sameDay(d,new Date())?" today":"");
    cell.addEventListener("click", function(){ App.openDay(d); });
    var num=document.createElement("div"); num.className="num"; num.textContent=d.getDate(); cell.appendChild(num);
    var items=App.itemsForDay(d);
    var pills=document.createElement("div"); pills.className="pills";
    var m=maxPills||99;
    for(var i=0;i<Math.min(items.length,m);i++) pills.appendChild(pillEl(items[i]));
    if(items.length>m){ var more=document.createElement("div"); more.className="more"; more.textContent="+"+(items.length-m)+" more"; pills.appendChild(more); }
    cell.appendChild(pills);
    return cell;
  }

  function renderMonth(){
    var main=document.getElementById("main"); main.innerHTML="";
    var grid=document.createElement("div"); grid.className="grid";
    var a=App.view.anchor, first=new Date(a.getFullYear(),a.getMonth(),1);
    var offset=(first.getDay()+6)%7, start=App.addDays(first,-offset);
    for(var i=0;i<42;i++){ var d=App.addDays(start,i); grid.appendChild(dayCell(d, d.getMonth()!==a.getMonth(), 3)); }
    main.appendChild(grid);
  }

  function renderWeek(){
    var main=document.getElementById("main"); main.innerHTML="";
    var grid=document.createElement("div"); grid.className="grid week";
    var rg=App.rangeFor();
    for(var i=0;i<7;i++){ var d=App.addDays(rg.s,i); grid.appendChild(dayCell(d, false, 99)); }
    main.appendChild(grid);
  }

  function renderDay(){
    var main=document.getElementById("main"); main.innerHTML="";
    var wrap=document.createElement("div"); wrap.className="dayview";
    var items=App.itemsForDay(App.midnight(App.view.anchor));
    if(items.length===0){ var e=document.createElement("div"); e.className="empty"; e.textContent="Nothing on this day yet."; wrap.appendChild(e); }
    items.forEach(function(it){
      var row=document.createElement("div"); row.className="entry-row "+it.type;
      var lead=document.createElement("span"); if(it.emoji){lead.className="lead";lead.textContent=it.emoji;} else {lead.className="lead dot";}
      var nm=document.createElement("span"); nm.className="nm"; nm.textContent=it.name+(it.recurring?"  ↻":"");
      var amt=document.createElement("span"); amt.className="amt"; amt.textContent=(it.type==="in"?"+":"−")+App.fmtMoney(it.amount).replace("-","");
      row.appendChild(lead); row.appendChild(nm); row.appendChild(amt);
      wrap.appendChild(row);
    });
    var add=document.createElement("button"); add.className="btn primary big-add"; add.textContent="＋ Add to this day";
    add.addEventListener("click", function(){ App.openDay(App.midnight(App.view.anchor)); });
    wrap.appendChild(add);
    main.appendChild(wrap);
  }

  function renderYear(){
    var main=document.getElementById("main"); main.innerHTML="";
    var grid=document.createElement("div"); grid.className="yeargrid";
    var y=App.view.anchor.getFullYear();
    for(var m=0;m<12;m++){
      (function(mm){
        var s=new Date(y,mm,1), e=new Date(y,mm+1,0), t=App.totals(s,e), net=t.inS-t.outS, f=App.fmtMoney;
        var card=document.createElement("div"); card.className="ycard";
        card.innerHTML='<h3>'+App.MONTHS[mm]+'</h3>'+
          '<div class="yr"><span class="k">In</span><span class="yin">'+f(t.inS)+'</span></div>'+
          '<div class="yr"><span class="k">Out</span><span class="yout">'+f(t.outS)+'</span></div>'+
          '<div class="yr ynet"><span class="k">Net</span><span class="'+(net>=0?"yin":"yout")+'">'+f(net)+'</span></div>';
        card.addEventListener("click", function(){ App.view.mode="month"; App.view.anchor=new Date(y,mm,1); render(); });
        grid.appendChild(card);
      })(m);
    }
    main.appendChild(grid);
  }

  App.titleFor=titleFor; App.render=render; App.pillEl=pillEl;
})(window.App);
