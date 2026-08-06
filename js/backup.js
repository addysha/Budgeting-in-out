/* Auto-backup to a real file on disk.
   Browsers can't be trusted to keep localStorage forever — clearing browsing data
   wipes it. So we let you pick a JSON file once (put it in OneDrive) and rewrite it
   after every change. The file handle is kept in IndexedDB because handles survive
   a reload but can't be stringified into localStorage.
   Needs the File System Access API (Chrome/Edge). Everywhere else this quietly
   switches itself off and the manual Backup button remains the way out. */
(function (App) {
  "use strict";

  var DB="inout_backup_db", STORE_NAME="handles", HANDLE_KEY="backupFile";
  var META="inout_backup_meta";           // {last:<iso>, name:<filename>} in localStorage
  var handle=null, timer=null, writing=false, pending=false;

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
  function clearHandle(){ return idb(function(os){ return os.delete(HANDLE_KEY); }); }

  // ---- meta (what the status line shows) ----
  function meta(){ try{ return JSON.parse(localStorage.getItem(META))||{}; }catch(e){ return {}; } }
  function setMeta(m){ try{ localStorage.setItem(META, JSON.stringify(m)); }catch(e){} }

  // ---- writing ----
  function writeNow(){
    if(!handle||writing) { if(handle) pending=true; return; }
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
      writing=false; pending=false;
      // Usually the file was moved/deleted or permission lapsed. Keep the app usable.
      status("Couldn't write the backup file — click Reconnect. ("+err.name+")");
    });
  }

  // Saves come in bursts while typing, so wait for a pause before writing.
  function schedule(){
    if(!handle) return;
    clearTimeout(timer);
    timer=setTimeout(writeNow, 800);
  }

  // ---- permission / connecting ----
  function verify(h, requestIt){
    var opts={mode:"readwrite"};
    if(!h.queryPermission) return Promise.resolve(true);   // older impl: assume ok
    return h.queryPermission(opts).then(function(p){
      if(p==="granted") return true;
      if(!requestIt) return false;
      return h.requestPermission(opts).then(function(p2){ return p2==="granted"; });
    });
  }

  function choose(){
    if(!App.backupSupported) return;
    var name="inout-backup.json";
    window.showSaveFilePicker({
      suggestedName:name,
      types:[{description:"In & Out backup", accept:{"application/json":[".json"]}}]
    }).then(function(h){
      handle=h;
      return putHandle(h).then(function(){ writeNow(); });
    }).catch(function(err){
      if(err.name==="AbortError") return;                  // user closed the picker
      status("Couldn't set up auto-backup here ("+err.name+"). The Backup button still works.");
    });
  }

  function reconnect(){
    if(!handle) return choose();
    verify(handle,true).then(function(ok){ if(ok) writeNow(); else status("Permission denied — auto-backup is paused."); });
  }

  function disconnect(){
    handle=null; clearTimeout(timer);
    clearHandle().catch(function(){});
    setMeta({});
    status();
  }

  // ---- status line in the settings sheet ----
  function describe(){
    if(!App.backupSupported) return "This browser can't auto-save to a file. Use Backup (JSON) now and then. (Chrome or Edge can do it automatically.)";
    if(!handle) return "Off — your data lives only in this browser. Pick a file to have every change saved automatically.";
    var m=meta();
    if(!m.last) return "Saving to " + handle.name + "…";
    var d=new Date(m.last);
    return "Saving to " + handle.name + " · last saved " + d.toLocaleString("en-NZ",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  }
  function status(msg){
    var el=document.getElementById("backupStatus"); if(!el) return;
    el.textContent = msg || describe();
    var btn=document.getElementById("backupBtn"); if(btn) btn.textContent = handle ? "Change file" : "Choose backup file";
    var off=document.getElementById("backupOff"); if(off) off.style.display = handle ? "" : "none";
  }

  // ---- startup ----
  function init(){
    // Ask the browser not to evict our data. Doesn't stop a manual "clear browsing data".
    if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(function(){});
    if(!App.backupSupported) return;
    getHandle().then(function(h){
      if(!h) return;
      return verify(h,false).then(function(ok){
        handle=h;
        status(ok ? null : "Auto-backup needs permission again — click Reconnect.");
        if(ok) writeNow();   // catch up on anything changed while it was disconnected
      });
    }).catch(function(){});
  }

  // Every App.save() now also queues a backup write.
  var origSave=App.save;
  App.save=function(){ origSave(); schedule(); };

  App.backupChoose=choose; App.backupReconnect=reconnect; App.backupDisconnect=disconnect;
  App.backupStatus=status; App.backupInit=init;
  App.backupConnected=function(){ return !!handle; };
})(window.App);
