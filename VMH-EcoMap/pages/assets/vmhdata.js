/* VMH-EcoMap 共用資料層
   資料優先序：① 資料中心匯入（存在您的瀏覽器）→ ② 站上發布版 → ③ 工具內建範例
   匯入的檔案只存在本機瀏覽器，不會上傳到任何伺服器。 */
(function (root) {
  'use strict';

  var DB_NAME = 'vmh-ecomap', STORE = 'files', HSTORE = 'handles', DB_VER = 2;

  /* ── 資料來源註冊表（資料中心與各工具共用同一份定義）── */
  var SOURCES = [
    { key: 't1',  no: '1',  kind: 'xlsx', name: '主工具｜越南醫院生態盤點',
      file: 'VMH-EcoMap-1_主工具_越南醫院生態盤點_v1.0.xlsx',
      used: ['生態導覽器', '聯盟體檢'], sens: false,
      note: '85 門商機 × 60 項能力 × 58 個夥伴的主檔' },
    { key: 't15', no: '15', kind: 'xlsx', name: '標案雷達與資格文件庫',
      file: 'VMH-EcoMap-15_標案雷達與資格文件庫_v1.0.xlsx',
      used: ['標案戰情板'], sens: true,
      note: '標案登錄與資格文件到期日' },
    { key: 't20', no: '20', kind: 'xlsx', name: '商機推進漏斗',
      file: 'VMH-EcoMap-20_商機推進漏斗_v1.0.xlsx',
      used: ['商機推進漏斗'], sens: true,
      note: '案件主檔——填入真實客戶名稱後屬機敏' },
    { key: 't22', no: '22', kind: 'xlsx', name: '聯盟體檢儀表板',
      file: 'VMH-EcoMap-22_聯盟體檢儀表板_v1.0.xlsx',
      used: ['聯盟體檢'], sens: false,
      note: '能力覆蓋與夥伴狀態' },
    { key: 't23', no: '23', kind: 'xlsx', name: '利害關係人地圖',
      file: 'VMH-EcoMap-23_利害關係人地圖_v1.0.xlsx',
      used: ['利害關係人地圖'], sens: true, top: true,
      note: '★★ 機敏等級最高：含真實人物評價，只存本機、永不發布' },
    { key: 't24', no: '24', kind: 'xlsx', name: '交付與收款儀表板',
      file: 'VMH-EcoMap-24_交付與收款儀表板_v1.0.xlsx',
      used: ['交付與收款'], sens: true,
      note: '在執行案件的進度與收款' },
    { key: 't25', no: '25', kind: 'xlsx', name: '風險登錄與情境模擬',
      file: 'VMH-EcoMap-25_風險登錄與情境模擬_v1.0.xlsx',
      used: ['風險登錄與模擬'], sens: true,
      note: '風險登錄冊與三點估計' },
    { key: 'intel', no: '18', kind: 'json', name: '情報站資料檔',
      file: 'intel_data.json',
      used: ['情報站'], sens: false,
      note: '法規時鐘、競合動態、115 家名冊（由情報站「匯出資料檔」產生）' },
    { key: 'map', no: '19', kind: 'json', name: '缺口地圖資料檔',
      file: 'map_data.json',
      used: ['缺口地圖'], sens: false,
      note: '34 省市缺口數據' }
  ];

  function byKey(k) { for (var i = 0; i < SOURCES.length; i++) if (SOURCES[i].key === k) return SOURCES[i]; return null; }

  /* ── IndexedDB 薄封裝 ── */
  function openDB() {
    return new Promise(function (res, rej) {
      if (!root.indexedDB) { rej(new Error('此瀏覽器不支援本機儲存')); return; }
      var rq = root.indexedDB.open(DB_NAME, DB_VER);
      rq.onupgradeneeded = function () {
        var db = rq.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(HSTORE)) db.createObjectStore(HSTORE, { keyPath: 'key' });
      };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error || new Error('無法開啟本機儲存')); };
    });
  }
  function tx(mode, fn, storeName) {
    var st = storeName || STORE;
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(st, mode), s = t.objectStore(st);
        var rq = fn(s), val;
        // 用 onsuccess 取值：查無資料時 request.result 是 undefined，
        // 不能拿 request 物件本身當結果（會被誤判為「有資料」）
        if (rq && typeof rq === 'object' && 'onsuccess' in rq) {
          rq.onsuccess = function () { val = rq.result; };
        }
        t.oncomplete = function () { db.close(); res(val); };
        t.onerror = function () { db.close(); rej(t.error); };
      });
    });
  }

  var API = {
    SOURCES: SOURCES,
    get: byKey,

    /** 存入一個檔案（File 物件）。回傳 meta。 */
    save: function (key, file) {
      var src = byKey(key);
      if (!src) return Promise.reject(new Error('未知的資料來源：' + key));
      return file.arrayBuffer().then(function (buf) {
        var rec = { key: key, name: file.name, buf: buf, size: buf.byteLength,
                    at: new Date().toISOString(), kind: src.kind,
                    // mtime＝來源檔案本身的修改時間，是「有沒有變新」的判斷依據；
                    // at＝匯入到瀏覽器的時間，兩者不同不可混用。
                    mtime: file.lastModified || null };
        return tx('readwrite', function (s) { s.put(rec); }).then(function () {
          return { key: key, name: rec.name, size: rec.size, at: rec.at, mtime: rec.mtime };
        });
      });
    },

    /** 取出原始紀錄（含 ArrayBuffer），沒有則回 null。 */
    raw: function (key) {
      return tx('readonly', function (s) { return s.get(key); })
        .then(function (r) { return r || null; })
        .catch(function () { return null; });
    },

    /** 只取 meta（不含資料本體）。 */
    meta: function (key) {
      return API.raw(key).then(function (r) {
        return r ? { key: r.key, name: r.name, size: r.size, at: r.at, mtime: r.mtime || null } : null;
      });
    },

    clear: function (key) { return tx('readwrite', function (s) { s.delete(key); }); },

    clearAll: function () { return tx('readwrite', function (s) { s.clear(); }); },

    listMeta: function () {
      return Promise.all(SOURCES.map(function (s) {
        return API.meta(s.key).then(function (m) { return { src: s, meta: m }; });
      }));
    },

    /**
     * 解析資料來源並交給工具，依優先序自動挑選。
     * opts: { published: '相對路徑', onData: function(payload, label, origin), onNone: function() }
     * payload：xlsx → SheetJS workbook；json → 已 parse 的物件
     */
    resolve: function (key, opts) {
      // 每頁第一次 resolve 時先靜默比對綁定資料夾；沒綁定或不支援會立刻回傳，
      // 不會擋住工具載入。用 promise 記憶化，同一頁多個 resolve 只比對一次。
      if (!API._sync1) API._sync1 = API.autoSync().catch(function () { return null; });
      return API._sync1.then(function () { return API._resolve(key, opts); });
    },

    _resolve: function (key, opts) {
      var src = byKey(key) || { kind: 'xlsx' };
      function parse(buf) {
        if (src.kind === 'json') {
          return JSON.parse(new TextDecoder('utf-8').decode(new Uint8Array(buf)));
        }
        if (typeof XLSX === 'undefined') throw new Error('XLSX 未載入');
        return XLSX.read(new Uint8Array(buf), { type: 'array' });
      }
      // ① 資料中心
      return API.raw(key).then(function (rec) {
        if (rec && rec.buf) {
          try {
            opts.onData(parse(rec.buf), '資料中心：' + rec.name, 'hub');
            return 'hub';
          } catch (e) { /* 壞檔就往下走 */ }
        }
        // ② 站上發布版
        if (opts.published && location.protocol !== 'file:') {
          return fetch(opts.published).then(function (r) {
            if (!r.ok) throw 0; return r.arrayBuffer();
          }).then(function (buf) {
            opts.onData(parse(buf), '站上發布版', 'published');
            return 'published';
          }).catch(function () {
            if (opts.onNone) opts.onNone();
            return 'none';
          });
        }
        if (opts.onNone) opts.onNone();
        return 'none';
      });
    },


    /* ══════════════════════════════════════════════════════════════
       資料夾綁定與自動比對（File System Access API）

       原理：您指定一次「VMH-EcoMap_資料主檔」資料夾，瀏覽器把這個資料夾的
       存取權把手（handle）存進 IndexedDB。之後每次開頁，網站就能直接讀那個
       資料夾裡的檔案、比對修改時間，比本機這份新就自動重新載入。

       限制（誠實說明，不要在 UI 上誇大）：
       ① 只有 Chrome / Edge 等 Chromium 瀏覽器支援；Firefox、Safari 沒有此 API。
       ② 授權不一定跨分頁保留。權限是 granted 才能靜默同步；退回 prompt 時
          瀏覽器規定必須由使用者點擊才能重新授權，所以要顯示一顆按鈕。
       ③ 檔案只被讀取，不會被修改，也不會離開這台電腦。
       ══════════════════════════════════════════════════════════════ */

    /** 這個瀏覽器支援資料夾綁定嗎？ */
    fsSupported: function () {
      return typeof root.showDirectoryPicker === 'function' && root.isSecureContext !== false;
    },

    /** 取回已綁定的資料夾 handle，沒有則 null。 */
    getFolder: function () {
      return tx('readonly', function (s) { return s.get('root'); }, HSTORE)
        .then(function (r) { return r && r.handle ? r : null; })
        .catch(function () { return null; });
    },

    /** 目前授權狀態：'none'（未綁定）｜'granted'｜'prompt'｜'denied' */
    folderPermission: function () {
      return API.getFolder().then(function (r) {
        if (!r) return 'none';
        if (!r.handle.queryPermission) return 'granted';
        return r.handle.queryPermission({ mode: 'read' });
      }).catch(function () { return 'none'; });
    },

    /** 讓使用者挑資料夾並記住（必須由點擊事件觸發）。 */
    bindFolder: function () {
      if (!API.fsSupported()) return Promise.reject(new Error('此瀏覽器不支援資料夾綁定'));
      return root.showDirectoryPicker({ id: 'vmh-datamaster', mode: 'read' })
        .then(function (handle) {
          var rec = { key: 'root', handle: handle, name: handle.name, at: new Date().toISOString() };
          return tx('readwrite', function (s) { s.put(rec); }, HSTORE).then(function () { return rec; });
        });
    },

    unbindFolder: function () {
      return tx('readwrite', function (s) { s.delete('root'); }, HSTORE);
    },

    /** 重新要求授權（必須由點擊事件觸發）。 */
    requestFolderPermission: function () {
      return API.getFolder().then(function (r) {
        if (!r) return 'none';
        if (!r.handle.requestPermission) return 'granted';
        return r.handle.requestPermission({ mode: 'read' });
      });
    },

    /**
     * 掃描已綁定資料夾（含一層子資料夾，例如「其他版本」），
     * 回傳 { 檔名小寫: File } 的對照表。
     */
    scanFolder: function () {
      return API.getFolder().then(function (r) {
        if (!r) return null;
        var out = {};
        function walk(dir, depth) {
          var it = dir.values(), chain = Promise.resolve();
          function step() {
            return it.next().then(function (res) {
              if (res.done) return null;
              var e = res.value;
              if (e.kind === 'file') {
                return e.getFile().then(function (f) { 
                  var k = f.name.toLowerCase();
                  // 同名以外層（資料夾根目錄）為準，不被子資料夾覆蓋
                  if (!(k in out)) out[k] = f;
                  return step();
                }).catch(function () { return step(); });
              }
              if (e.kind === 'directory' && depth < 1) {
                return walk(e, depth + 1).then(step);
              }
              return step();
            });
          }
          return chain.then(step);
        }
        return walk(r.handle, 0).then(function () { return out; });
      });
    },

    /**
     * 依註冊表挑出每個資料來源對應的檔案。
     * 優先序：① 上次匯入用過的檔名 ② 註冊表指定的檔名 ③ 同編號前綴的檔案
     */
    matchFile: function (src, files, prevName) {
      if (prevName && files[prevName.toLowerCase()]) return files[prevName.toLowerCase()];
      if (files[src.file.toLowerCase()]) return files[src.file.toLowerCase()];
      var prefix = ('VMH-EcoMap-' + src.no + '_').toLowerCase();
      var keys = Object.keys(files).filter(function (k) { return k.indexOf(prefix) === 0; });
      if (keys.length) { keys.sort(); return files[keys[0]]; }
      return null;
    },

    /**
     * 比對並自動更新。silent=true 時遇到未授權就放棄（不彈視窗）。
     * 回傳 { ok, reason, updated:[], same:[], missing:[] }
     */
    syncFolder: function (silent) {
      return API.folderPermission().then(function (perm) {
        if (perm === 'none') return { ok: false, reason: 'unbound' };
        if (perm !== 'granted') {
          if (silent) return { ok: false, reason: 'need-permission' };
          return API.requestFolderPermission().then(function (p) {
            if (p !== 'granted') return { ok: false, reason: 'denied' };
            return API.syncFolder(true);
          });
        }
        return API.scanFolder().then(function (files) {
          if (!files) return { ok: false, reason: 'unbound' };
          var jobs = SOURCES.map(function (src) {
            return API.meta(src.key).then(function (m) {
              var f = API.matchFile(src, files, m && m.name);
              if (!f) return { key: src.key, no: src.no, name: src.name, state: 'missing' };
              // 沒匯入過，或來源檔比記錄的更新 → 重新讀入
              var newer = !m || !m.mtime || (f.lastModified > m.mtime);
              if (!newer) return { key: src.key, no: src.no, name: src.name, state: 'same', file: f.name };
              return API.save(src.key, f).then(function () {
                return { key: src.key, no: src.no, name: src.name, state: 'updated', file: f.name,
                         mtime: f.lastModified };
              });
            }).catch(function () {
              return { key: src.key, no: src.no, name: src.name, state: 'error' };
            });
          });
          return Promise.all(jobs).then(function (rs) {
            return {
              ok: true, reason: 'done',
              updated: rs.filter(function (r) { return r.state === 'updated'; }),
              same:    rs.filter(function (r) { return r.state === 'same'; }),
              missing: rs.filter(function (r) { return r.state === 'missing'; }),
              errors:  rs.filter(function (r) { return r.state === 'error'; })
            };
          });
        });
      }).catch(function (e) { return { ok: false, reason: 'error', message: String(e && e.message || e) }; });
    },

    /**
     * 各工具頁在載入資料前呼叫這一個就好：
     * 有綁定又已授權 → 靜默比對更新；否則直接放行，不擋任何事。
     */
    autoSync: function () {
      if (!API.fsSupported()) return Promise.resolve({ ok: false, reason: 'unsupported' });
      return API.syncFolder(true);
    },

    /** 給各工具在頁首顯示一致的資料來源說明。 */
    originLabel: function (origin, label) {
      if (origin === 'hub') return label + '（本機）';
      if (origin === 'published') return label;
      return '內建範例資料';
    },

    fmtTime: function (iso) {
      if (!iso) return '—';
      var d = new Date(iso);
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    },
    fmtSize: function (b) {
      if (b == null) return '—';
      return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
    },
    daysAgo: function (iso) {
      if (!iso) return null;
      return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    }
  };

  root.VMHData = API;
})(window);
