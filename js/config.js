/* Constants and the data used the first time the app is opened. */
window.App = window.App || {};

(function (App) {
  "use strict";

  App.STORE = "inout_budget_v2";

  App.MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  App.MON3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  App.WD = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  App.EMO = ["💰","🏠","🛒","🍽️","⛽","🎬","🎵","💪","📱","⚡","🌐","☕","🎁","✈️","🚗","🏥","💳","📈","🧾","🐶"];
  App.FREQS = [["weekly","Weekly"],["fortnightly","Every 2 weeks"],["monthly","Monthly"],["yearly","Yearly"]];

  App.DEFAULTS = {
    startBalance:2000, startY:2026, startM:7,
    tags:[
      {name:"Salary",   type:"in",  amount:3200, emoji:"💰"},
      {name:"Rent",     type:"out", amount:740,  emoji:"🏠"},
      {name:"Groceries",type:"out", amount:null, emoji:"🛒"},
      {name:"Gym",      type:"out", amount:null, emoji:"💪"},
      {name:"Spotify",  type:"out", amount:21,   emoji:"🎵"}
    ],
    recurring:[
      {id:"r1", name:"Rent", type:"out", amount:740, emoji:"🏠", start:"2026-7-1", freq:"fortnightly", count:26}
    ],
    entries:{}
  };
})(window.App);
