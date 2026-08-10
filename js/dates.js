/* Date helpers, plus the small formatting/escaping helpers used everywhere.
   Day keys look like "2026-7-1" (month is 0-based, matching Date). */
(function (App) {
  "use strict";

  function midnight(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function pk(key){ var p=key.split("-"); return new Date(+p[0], +p[1], +p[2]); }
  function dk(d){ return d.getFullYear()+"-"+d.getMonth()+"-"+d.getDate(); }
  function addDays(d,n){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()+n); }
  function addMonths(d,n){ return new Date(d.getFullYear(), d.getMonth()+n, d.getDate()); }
  function addYears(d,n){ return new Date(d.getFullYear()+n, d.getMonth(), d.getDate()); }
  function sameDay(a,b){ return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
  function T(d){ return midnight(d).getTime(); }
  function trackingStart(){ return new Date(App.state.startY, App.state.startM, 1); }
  function isoOf(key){
    if(!validDayKey(key)) return "";
    var p=key.split("-"); var y=p[0], m=("0"+(+p[1]+1)).slice(-2), d=("0"+(+p[2])).slice(-2); return y+"-"+m+"-"+d;
  }
  // "2026-7-1" with a real year, a month 0-11 and a day that exists.
  function validDayKey(key){
    if(typeof key!=="string") return false;
    var p=key.split("-"); if(p.length!==3) return false;
    var y=+p[0], m=+p[1], d=+p[2];
    if(!isFinite(y)||!isFinite(m)||!isFinite(d)) return false;
    if(y<1900||y>3000||m<0||m>11||d<1||d>31) return false;
    var dt=new Date(y,m,d);
    return dt.getFullYear()===y && dt.getMonth()===m && dt.getDate()===d;
  }
  function today(){ return (new Date()).toISOString().slice(0,10); }

  function fmtMoney(n){ var neg=n<0; n=Math.abs(Math.round(n)); var s="$"+n.toLocaleString("en-US"); return neg?"-"+s:s; }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }

  App.midnight=midnight; App.pk=pk; App.dk=dk;
  App.addDays=addDays; App.addMonths=addMonths; App.addYears=addYears;
  App.sameDay=sameDay; App.T=T; App.trackingStart=trackingStart;
  App.isoOf=isoOf; App.validDayKey=validDayKey; App.today=today;
  App.fmtMoney=fmtMoney; App.esc=esc;
})(window.App);
