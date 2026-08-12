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

  // What a brand-new user starts with. Amounts are left blank on purpose so
  // nobody inherits someone else's figures - tracking starts this month.
  var now = new Date();
  App.DEFAULTS = {
    startBalance:0, startY:now.getFullYear(), startM:now.getMonth(),
    tags:[
      {name:"Salary",       type:"in",  amount:null, emoji:"💰"},
      {name:"Rent",         type:"out", amount:null, emoji:"🏠"},
      {name:"Groceries",    type:"out", amount:null, emoji:"🛒"},
      {name:"Power",        type:"out", amount:null, emoji:"⚡"},
      {name:"Subscription", type:"out", amount:null, emoji:"🎵"}
    ],
    recurring:[],
    entries:{},
    // Your own calls on what's essential vs. cuttable, keyed by lower-cased name.
    // Empty to start: the savings view guesses from keywords until you say otherwise.
    spendClass:{}
  };
})(window.App);
