/* Loading, saving and shape-fixing of the data held in localStorage.
   The live data lives on App.state; the current view lives on App.view. */
(function (App) {
  "use strict";

  function migrate(o){ if(!o.recurring) o.recurring=[]; if(!o.tags) o.tags=[]; o.tags.forEach(function(t){ if(t.emoji===undefined) t.emoji=""; }); if(!o.spendClass) o.spendClass={}; return o; }
  function load(){ try{ var s=localStorage.getItem(App.STORE); if(s) return migrate(JSON.parse(s)); }catch(e){} return JSON.parse(JSON.stringify(App.DEFAULTS)); }
  function save(){ try{ localStorage.setItem(App.STORE, JSON.stringify(App.state)); }catch(e){} }

  App.migrate = migrate;
  App.load = load;
  App.save = save;

  App.state = load();
  App.view = {mode:"month", anchor:new Date()};
})(window.App);
