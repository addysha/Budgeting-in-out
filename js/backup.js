/* Auto-backup to a real file on disk.
   Browsers can't be trusted to keep localStorage forever - clearing site data
   wipes it. So you pick a JSON file once (put it somewhere that syncs, like
   OneDrive) and every change is rewritten to it.

   Two rules this file exists to enforce:
     1. Never overwrite a file that has a budget in it with an empty one.
        Picking a file that already holds data offers to load it instead.
     2. One button. It works out whether you need to connect, reconnect or
        change file, so nobody has to know the difference.

   The handle is kept in IndexedDB because handles survive a reload but can't be
   stringified into localStorage. Needs the File System Access API (Chrome/Edge);
   everywhere else this switches itself off and the manual Backup button remains.

   Nothing here talks to the network. The file is written straight to disk. */
(function (App) {
  "use strict";

  var DB="inout_backup_db", STORE_NAME="handles", HANDLE_KEY="backupFile";
  var META="inout_backup_meta";            // {last:<iso>, name:<filename>}
  var handle=null, granted=false, timer=null, writing=false, pending=false;

  App.backupSupported = (typeof window.showSaveFilePicker === "function");

  // ---- tiny IndexedDB wrapper (one key, one value) ----
  function idb(fn){
    return new Promise(function(resolve,reject){
      var req=indexedDB.open(DB,1);
      req.onupgradeneeded=function(){ req.result.createObjectStore(STORE_NAME); };
      req.onerror=function(){ reject(req.error); };
      req.onsuccess=function(){
        var db=req.result, tx=db.transaction(STORE_NAME,"readwrite"), os=tx.objectStore(STORE_NAME), r=fn(os);
        tx.oncomplete=function(){ db.close(); resolve(r&&r.result); };
        tx.onerror=function(){ db.close(); reject(tx.error); };
      };
    });
  }
  function putHandle(h){ return idb(function(os){ return os.put(h,HANDLE_KEY); }); }
  function getHandle(){ return idb(function(os){ return os.get(HANDLE_KEY); }); }
  function dropHandle(){ return idb(function(os){ return os.delete(HANDLE_KEY); }); }

  function meta(){ try{ return JSON.parse(localStorage.getItem(META))||{}; }catch(e){ return {}; } }
  function setMeta(m){ try{ localStorage.setItem(META, JSON.stringify(m)); }catch(e){} }

  // ---- what counts as a real budget ----
  function looksLikeBudget(o){ return !!(o && o.tags && o.entries && typeof o.entries==="object"); }
  function countEntries(o){ var n=0; for(var k in o.entries) n+=(o.entries[k]||[]).length; return n; }
  // "Nothing worth keeping yet" - a fresh install, or one that's just been wiped.
  function isBlank(o){ return countEntries(o)===0 && (!o.recurring||o.recurring.length===0) && !o.startBalance; }

  function readFile(h){
    return h.getFile().then(function(f){ return f.text(); }).then(function(t){
      if(!t) return null;
      try{ var o=JSON.parse(t); return looksLikeBudget(o)?o:null; }catch(e){ return null; }
    }).catch(function(){ return null; });
  }

  // ---- writing ----
  function writeNow(){
    if(!handle||!granted){ return; }
    if(writing){ pending=true; return; }
    writing=true;
    var text=JSON.stringify(App.state,null,2);
    handle.createWritable().then(function(w){
      return w.write(text).then(function(){ return w.close(); });
    }).then(function(){
      writing=false;
      var m=meta(); m.last=new Date().toISOString(); m.name=handle.name; setMeta(m);
      status();
      if(pending){ pending=false; writeNow(); }
    }).catch(function(err){
      writing=false; pending=false; granted=false;
      status("Backup paused. The file may have moved. Click the button below to fix it.");
    });
  }

  // Saves arrive in bursts while typing, so wait for a pause.
  function schedule(){ if(!handle||!granted) return; clearTimeout(timer); timer=setTimeout(writeNow,800); }

  function verify(h, ask){
    if(!h.queryPermission) return Promise.resolve(true);          // older impl: assume ok
    return h.queryPermission({mode:"readwrite"}).then(function(p){
      if(p==="granted") return true;
      if(!ask) return false;
      return h.requestPermission({mode:"readwrite"}).then(function(p2){ return p2==="granted"; });
    });
  }

  // ---- taking the file's copy instead of ours ----
  function adopt(obj){
    App.state=App.migrate(obj);
    try{ localStorage.setItem(App.STORE, JSON.stringify(App.state)); }catch(e){}
    App.render();
    if(document.getElementById("setScrim").classList.contains("show")) App.openSettings();
    status();
  }

  // ---- the one button ----
  function connect(){
    if(!App.backupSupported) return;

    // A file we already know about, just needing permission again.
    if(handle && !granted){
      verify(handle,true).then(function(ok){
        granted=ok;
        if(!ok){ status("Permission denied, so nothing is being saved to the file."); return; }
        readFile(handle).then(function(existing){
          if(existing && isBlank(App.state) && countEntries(existing)>0) return offerLoad(existing);
          writeNow();
        });
      });
      return;
    }

    window.showSaveFilePicker({
      suggestedName:"inout-backup.json",
      types:[{description:"In & Out backup", accept:{"application/json":[".json"]}}]
    }).then(function(h){
      return verify(h,true).then(function(ok){
        if(!ok){ status("Permission denied, so nothing is being saved to the file."); return; }
        return readFile(h).then(function(existing){
          handle=h; granted=true;
          return putHandle(h).then(function(){
            // The file already holds a budget - never clobber it without asking.
            if(existing && countEntries(existing)>0){
              if(isBlank(App.state)) return offerLoad(existing, true);
              return askWhichWins(existing);
            }
            writeNow();
          });
        });
      });
    }).catch(function(err){
      if(err&&err.name==="AbortError") return;                    // picker closed
      status("Couldn't set up automatic saving here. You can still use Backup (JSON).");
    });
  }

  // App is empty, file has data: loading is almost certainly what's wanted.
  function offerLoad(existing, auto){
    var n=countEntries(existing);
    var msg="That file already has a budget in it ("+n+" entr"+(n===1?"y":"ies")+").\n\n"+
            "This app is currently empty, so it looks like you're restoring after a reset.\n\n"+
            "OK: bring that budget back.\nCancel: start fresh and overwrite the file.";
    if(window.confirm(msg)){ adopt(existing); writeNow(); }
    else { writeNow(); }
    return true;
  }

  // Both sides have data: make the choice explicit, defaulting to the safer one.
  function askWhichWins(existing){
    var mine=countEntries(App.state), theirs=countEntries(existing);
    var msg="That file already has a budget in it.\n\n"+
            "On screen now: "+mine+" entries\nIn that file: "+theirs+" entries\n\n"+
            "OK: use the file's version (what's on screen is replaced).\n"+
            "Cancel: keep what's on screen (the file is overwritten).";
    if(window.confirm(msg)) adopt(existing);
    writeNow();
    return true;
  }

  function turnOff(){
    handle=null; granted=false; clearTimeout(timer);
    dropHandle().catch(function(){});
    setMeta({});
    status();
  }

  // ---- status line ----
  function describe(){
    if(!App.backupSupported)
      return "This browser can't save to a file automatically. Use Backup (JSON) now and then. In Chrome or Edge it happens on its own.";
    if(!handle)
      return "Not on yet. Your budget is only in this browser, so clearing your browsing data would erase it.";
    if(!granted)
      return "Paused. " + handle.name + " needs permission again.";
    var m=meta();
    if(!m.last) return "Saving to " + handle.name + "…";
    return "On, saving to " + handle.name + ". Last saved " +
      new Date(m.last).toLocaleString("en-NZ",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) + ".";
  }
  function status(msg){
    var el=document.getElementById("backupStatus"); if(!el) return;
    el.textContent = msg || describe();
    var btn=document.getElementById("backupBtn");
    if(btn) btn.textContent = !handle ? "Turn on automatic saving" : (!granted ? "Reconnect" : "Change file");
    var off=document.getElementById("backupOff"); if(off) off.style.display = handle ? "" : "none";
  }

  function init(){
    // Ask the browser not to evict us when disk is short. Doesn't stop a manual clear.
    if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(function(){});
    if(!App.backupSupported){ status(); return; }
    getHandle().then(function(h){
      if(!h){ status(); return; }
      handle=h;
      return verify(h,false).then(function(ok){
        granted=ok;
        status();
        if(ok) writeNow();          // catch up on anything changed while disconnected
      });
    }).catch(function(){ status(); });
  }

  // Every App.save() now also queues a backup write.
  var origSave=App.save;
  App.save=function(){ origSave(); schedule(); };

  App.backupConnect=connect; App.backupTurnOff=turnOff; App.backupStatus=status; App.backupInit=init;
  App.backupConnected=function(){ return !!handle && granted; };
})(window.App);
