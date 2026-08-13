/* ==========================================================================
   app.js — VMH-EcoMap 專案協作區

   四個畫面：動態 / 檔案 / 訊息 / 成員（成員只有顧問看得到）
   路由用 hash，訊息與文件都有自己的網址，可以直接貼給對方。
   ========================================================================== */

import * as api from './db.js';

const $ = sel => document.querySelector(sel);

/* --------------------------------------------------------------------------
   小工具
   -------------------------------------------------------------------------- */
function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function extOf(name) {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : 'file';
}

function note(kind, html) {
  return `<div class="note note--${kind}">${html}</div>`;
}

let toastTimer;
function toast(message, kind = 'ok') {
  const box = $('#toast');
  box.className = `note note--${kind}`;
  box.innerHTML = esc(message);
  box.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.style.display = 'none'; }, 4000);
}

/* --------------------------------------------------------------------------
   主題
   -------------------------------------------------------------------------- */
const THEME_KEY = 'vmh-theme';
function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
  else document.documentElement.removeAttribute('data-theme');
  const btn = $('#themeBtn');
  if (!btn) return;
  const dark = theme === 'dark' || (!theme && matchMedia('(prefers-color-scheme: dark)').matches);
  btn.textContent = dark ? '☀' : '☾';
}
applyTheme(localStorage.getItem(THEME_KEY) || '');

/* --------------------------------------------------------------------------
   對話框
   -------------------------------------------------------------------------- */
function openModal({ title, body, confirmText = '確定', onConfirm, danger }) {
  const modal = $('#modal');
  modal.innerHTML = `<div class="modal__box">
    <div class="modal__head"><h2>${esc(title)}</h2>
      <button class="close" data-close aria-label="關閉">×</button></div>
    <div class="modal__body">${body}</div>
    <div class="modal__foot">
      <button class="btn btn--ghost" data-close>取消</button>
      <button class="btn${danger ? ' btn--danger' : ''}" id="modalOk">${esc(confirmText)}</button>
    </div>
  </div>`;
  modal.classList.add('is-open');

  const close = () => modal.classList.remove('is-open');
  modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  $('#modalOk').addEventListener('click', async () => {
    const ok = $('#modalOk');
    ok.disabled = true;
    try { await onConfirm(close); }
    catch (error) { toast(api.friendlyError(error), 'error'); }
    finally { ok.disabled = false; }
  });
  return close;
}

/* --------------------------------------------------------------------------
   登入 / 註冊
   -------------------------------------------------------------------------- */
function renderAuth() {
  $('#tabs').innerHTML = '';
  $('#app').innerHTML = `
    <div class="wrap wrap--narrow">
      <div class="card" style="margin-top:6vh">
        <div class="card__head"><h2 id="authTitle">登入專案協作區</h2></div>
        <div class="card__body">
          <div id="authMsg"></div>
          <form id="authForm">
            <div class="field">
              <label for="email">Email <span class="req">*</span></label>
              <input class="input" type="email" id="email" required autocomplete="email">
            </div>
            <div class="field">
              <label for="password">密碼 <span class="req">*</span></label>
              <input class="input" type="password" id="password" required autocomplete="current-password" minlength="6">
            </div>
            <div id="regFields" style="display:none">
              <div class="field">
                <label for="name">姓名 <span class="req">*</span></label>
                <input class="input" type="text" id="name" autocomplete="name">
              </div>
              <div class="field">
                <label for="org">單位／公司</label>
                <input class="input" type="text" id="org" placeholder="例：群晶科技">
                <div class="hint">送出後由顧問核准才能進入，核准前看不到任何檔案。</div>
              </div>
            </div>
            <button class="btn btn--block" type="submit" id="authSubmit">登入</button>
          </form>
          <div class="row" style="margin-top:14px;justify-content:space-between">
            <button class="btn btn--ghost btn--sm" id="toggleMode">還沒有帳號？註冊</button>
            <button class="btn btn--ghost btn--sm" id="forgot">忘記密碼</button>
          </div>
        </div>
      </div>
      <p style="text-align:center;font-size:12.5px;color:var(--faint);margin-top:16px">
        VMH-EcoMap 越南現代醫院生態計畫 · 專案協作區<br>本區內容僅限受邀成員檢視
      </p>
    </div>`;

  let mode = 'login';
  const setMode = next => {
    mode = next;
    const isReg = mode === 'register';
    $('#authTitle').textContent = isReg ? '註冊協作區帳號' : '登入專案協作區';
    $('#regFields').style.display = isReg ? '' : 'none';
    $('#name').required = isReg;
    $('#authSubmit').textContent = isReg ? '送出註冊申請' : '登入';
    $('#toggleMode').textContent = isReg ? '已經有帳號？登入' : '還沒有帳號？註冊';
    $('#password').autocomplete = isReg ? 'new-password' : 'current-password';
    $('#authMsg').innerHTML = '';
  };

  $('#toggleMode').addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));

  $('#forgot').addEventListener('click', async () => {
    const email = $('#email').value.trim();
    if (!email) { $('#authMsg').innerHTML = note('warn', '請先填入 Email，再按「忘記密碼」。'); return; }
    try {
      await api.resetPassword(email);
      $('#authMsg').innerHTML = note('ok', `重設密碼的信已寄到 <b>${esc(email)}</b>，請到信箱收信。`);
    } catch (error) {
      $('#authMsg').innerHTML = note('error', esc(api.friendlyError(error)));
    }
  });

  $('#authForm').addEventListener('submit', async event => {
    event.preventDefault();
    const btn = $('#authSubmit');
    btn.disabled = true;
    $('#authMsg').innerHTML = '';
    try {
      if (mode === 'register') {
        await api.register({
          email: $('#email').value, password: $('#password').value,
          name: $('#name').value, org: $('#org').value
        });
      } else {
        await api.login($('#email').value, $('#password').value);
      }
    } catch (error) {
      $('#authMsg').innerHTML = note('error', esc(api.friendlyError(error)));
      btn.disabled = false;
    }
  });
}

function renderPending() {
  $('#tabs').innerHTML = '';
  $('#app').innerHTML = `
    <div class="wrap wrap--narrow">
      <div class="card" style="margin-top:6vh">
        <div class="card__head"><h2>帳號審核中</h2></div>
        <div class="card__body">
          ${note('warn', '你的申請已送出，等顧問核准後就能看到檔案與訊息。核准通常很快，之後用同一組 Email 與密碼登入即可。')}
          <p style="font-size:13.5px;color:var(--muted)">
            登入身分：<b>${esc(api.me.user?.email || '')}</b>
          </p>
          <button class="btn btn--ghost btn--block" id="logout2">登出</button>
        </div>
      </div>
    </div>`;
  $('#logout2').addEventListener('click', () => api.logout());
}

/* --------------------------------------------------------------------------
   動態
   -------------------------------------------------------------------------- */
async function viewFeed() {
  const [activity, docs, messages] = await Promise.all([
    api.listActivity(50), api.listDocs(), api.listMessages()
  ]);

  const feed = activity.length ? `<ul class="feed">${activity.map(a => {
    const isMsg = a.kind === 'message';
    const href = isMsg ? `#/msg/${a.msgId}` : `#/doc/${a.docId}`;
    return `<li class="${isMsg ? 'is-message' : ''}">
      <div class="feed__title"><a href="${href}">${esc(a.title || '')}</a></div>
      <div class="feed__meta">${isMsg ? '發布訊息' : '上傳新版本'} · ${esc(a.byName || '')} · ${esc(api.fmtAgo(a.at))}</div>
      ${a.note ? `<div class="feed__note">${esc(a.note)}</div>` : ''}
    </li>`;
  }).join('')}</ul>` : `<div class="empty">還沒有任何動態。上傳第一份檔案或發第一則訊息吧。</div>`;

  $('#app').innerHTML = `<div class="wrap">
    <div class="page-head">
      <h1>動態</h1>
      <p>這裡按時間順序記下每一次檔案更新與每一則訊息。<strong>誰、什麼時候、改了什麼</strong>，都留在這裡。</p>
    </div>
    <div class="grid grid--stats" style="margin-bottom:18px">
      <div class="stat"><span class="stat__label">文件</span><div class="stat__value">${docs.length}</div>
        <div class="stat__note">共 ${docs.reduce((n, d) => n + (d.latestVersion || 0), 0)} 個版本</div></div>
      <div class="stat"><span class="stat__label">訊息</span><div class="stat__value">${messages.length}</div>
        <div class="stat__note">${messages.filter(m => m.important).length} 則標為重要</div></div>
      <div class="stat"><span class="stat__label">最近更新</span>
        <div class="stat__value" style="font-size:19px">${esc(api.fmtAgo(activity[0]?.at) || '—')}</div></div>
    </div>
    ${feed}
  </div>`;
}

/* --------------------------------------------------------------------------
   檔案
   -------------------------------------------------------------------------- */
async function viewDocs() {
  const docs = await api.listDocs();

  const list = docs.length ? `<div class="items">${docs.map(d => `
    <a class="item" href="#/doc/${d.id}">
      <div class="item__top">
        <span class="item__title">${esc(d.title)}</span>
        <span class="vbadge">${d.latestVersion ? `v${d.latestVersion}` : '尚無版本'}</span>
        <span class="tag">${esc(d.category || '其他')}</span>
      </div>
      ${d.latestNote ? `<div class="item__body">最新版說明：${esc(d.latestNote)}</div>` : ''}
      <div class="item__meta">
        ${d.latestFileName ? `${esc(d.latestFileName)} · ` : ''}更新於 ${esc(api.fmtTime(d.latestAt || d.updatedAt))}
      </div>
    </a>`).join('')}</div>`
    : `<div class="empty">還沒有任何文件。按右上角「新增文件」開始。</div>`;

  $('#app').innerHTML = `<div class="wrap">
    <div class="page-head" style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:240px">
        <h1>檔案</h1>
        <p>每份文件都保留完整版本歷程。上傳新版時<strong>一定要寫「這一版改了什麼」</strong>——舊版永遠留著，隨時可以下載回去。</p>
      </div>
      <button class="btn" id="newDoc">＋ 新增文件</button>
    </div>
    ${list}
  </div>`;

  $('#newDoc').addEventListener('click', promptNewDoc);
}

function promptNewDoc() {
  openModal({
    title: '新增文件',
    confirmText: '建立',
    body: `
      <div class="field">
        <label for="dTitle">文件名稱 <span class="req">*</span></label>
        <input class="input" id="dTitle" placeholder="例：越南醫院可行性評估報告">
        <div class="hint">用這份文件「是什麼」來命名，不要放版號——版號由系統管理。</div>
      </div>
      <div class="field">
        <label for="dCat">分類</label>
        <select class="select" id="dCat">
          ${api.DOC_CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="dDesc">說明</label>
        <textarea class="textarea" id="dDesc" style="min-height:70px" placeholder="這份文件的用途、給誰看的"></textarea>
      </div>`,
    onConfirm: async close => {
      const title = $('#dTitle').value.trim();
      if (!title) { toast('請填文件名稱', 'warn'); return; }
      const id = await api.createDocument({
        title, category: $('#dCat').value, description: $('#dDesc').value
      });
      close();
      location.hash = `#/doc/${id}`;
    }
  });
}

async function viewDoc(docId) {
  const [document_, versions] = await Promise.all([
    api.getDocument(docId), api.listVersions(docId)
  ]);
  if (!document_) {
    $('#app').innerHTML = `<div class="wrap"><div class="empty">找不到這份文件，它可能已被刪除。<br>
      <a href="#/docs">← 回檔案列表</a></div></div>`;
    return;
  }

  const rows = versions.length ? versions.map((v, i) => `
    <div class="version${i === 0 ? ' version--latest' : ''}">
      <div class="version__no"><span class="vbadge${i === 0 ? '' : ' vbadge--old'}">v${v.version}</span></div>
      <div>
        <div class="version__note">${esc(v.note || '（未填寫變更說明）')}</div>
        <div class="version__file">
          <span class="filetype">${esc(extOf(v.fileName))}</span>
          <span>${esc(v.fileName)}</span>
          <span style="color:var(--faint)">${esc(api.humanSize(v.size))}</span>
        </div>
        <div class="version__who">${esc(v.uploadedByName || '')} · ${esc(api.fmtTime(v.uploadedAt))}</div>
      </div>
      <div><a class="btn btn--ghost btn--sm" href="${esc(v.url)}" target="_blank" rel="noopener" download>下載</a></div>
    </div>`).join('')
    : `<div class="empty">這份文件還沒有任何版本。按「上傳新版本」加入第一版。</div>`;

  const canDelete = api.me.role === 'admin';

  $('#app').innerHTML = `<div class="wrap">
    <nav class="crumb"><a href="#/docs">檔案</a> › ${esc(document_.title)}</nav>
    <div class="page-head" style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:240px">
        <h1>${esc(document_.title)}</h1>
        <p>${esc(document_.description || '')}</p>
        <div class="row" style="margin-top:8px">
          <span class="tag">${esc(document_.category || '其他')}</span>
          <span class="tag tag--info">${versions.length} 個版本</span>
          <span class="tag">建立者 ${esc(document_.createdByName || '')}</span>
        </div>
      </div>
      <button class="btn" id="upBtn">↑ 上傳新版本</button>
    </div>

    <section class="card">
      <div class="card__head"><h2>版本歷程</h2><p>最新的在最上面，舊版永遠保留</p></div>
      <div class="card__body"><div class="versions">${rows}</div></div>
    </section>

    ${canDelete ? `<div class="row row--end" style="margin-top:18px">
      <button class="btn btn--ghost btn--sm" id="delDoc" style="color:var(--danger-fg)">刪除整份文件</button>
    </div>` : ''}
  </div>`;

  $('#upBtn').addEventListener('click', () => promptUpload(docId, versions[0]?.version || 0));

  $('#delDoc')?.addEventListener('click', () => {
    openModal({
      title: '刪除整份文件？',
      danger: true,
      confirmText: '確定刪除',
      body: note('error', `<strong>這個動作不可復原。</strong>
        「${esc(document_.title)}」與它的 ${versions.length} 個版本檔案都會被永久刪除。`),
      onConfirm: async close => {
        await api.deleteDocument(docId);
        close();
        location.hash = '#/docs';
        toast('文件已刪除');
      }
    });
  });
}

function promptUpload(docId, currentVersion) {
  let picked = null;

  const close = openModal({
    title: `上傳 v${currentVersion + 1}`,
    confirmText: '上傳',
    body: `
      <div class="drop" id="drop">
        <b>把檔案拖到這裡</b>
        或點一下選擇檔案
        <small>單檔最大 100 MB</small>
      </div>
      <input type="file" id="file" hidden>
      <div id="pickedBox"></div>
      <div class="field" style="margin-top:14px">
        <label for="vNote">這一版改了什麼？ <span class="req">*</span></label>
        <textarea class="textarea" id="vNote" style="min-height:80px"
          placeholder="例：補上 9 個缺口的候選夥伴；法規門檻更新 PDPL 91/2025"></textarea>
        <div class="hint">寫清楚才有歷程可讀。三個月後你自己也會需要這句話。</div>
      </div>
      <div class="progress" id="prog" style="display:none"><span class="progress__bar" id="progBar"></span></div>`,
    onConfirm: async doClose => {
      if (!picked) { toast('請先選擇檔案', 'warn'); return; }
      const noteText = $('#vNote').value.trim();
      if (!noteText) { toast('請填寫「這一版改了什麼」', 'warn'); return; }

      $('#prog').style.display = 'block';
      await api.uploadVersion(docId, picked, noteText, pct => {
        $('#progBar').style.width = `${pct}%`;
      });
      doClose();
      toast(`v${currentVersion + 1} 上傳完成`);
      route();
    }
  });

  const showPicked = file => {
    picked = file;
    $('#pickedBox').innerHTML = `<div class="picked">
      <span class="filetype">${esc(extOf(file.name))}</span>
      <b>${esc(file.name)}</b>
      <span style="color:var(--faint)">${esc(api.humanSize(file.size))}</span>
    </div>`;
  };

  const input = $('#file');
  const drop = $('#drop');
  drop.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { if (input.files[0]) showPicked(input.files[0]); });
  ['dragenter', 'dragover'].forEach(type =>
    drop.addEventListener(type, e => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach(type =>
    drop.addEventListener(type, e => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', e => {
    const file = e.dataTransfer?.files?.[0];
    if (file) showPicked(file);
  });

  return close;
}

/* --------------------------------------------------------------------------
   訊息
   -------------------------------------------------------------------------- */
async function viewMessages() {
  const messages = await api.listMessages();

  const list = messages.length ? `<div class="items">${messages.map(m => `
    <a class="item${m.important ? ' item--important' : ''}" href="#/msg/${m.id}">
      <div class="item__top">
        <span class="item__title">${esc(m.title)}</span>
        ${m.important ? '<span class="tag tag--danger">重要</span>' : ''}
        ${m.replyCount ? `<span class="tag tag--info">${m.replyCount} 則回覆</span>` : ''}
      </div>
      <div class="item__body">${esc(m.body)}</div>
      <div class="item__meta">${esc(m.createdByName || '')} · ${esc(api.fmtTime(m.createdAt))}</div>
    </a>`).join('')}</div>`
    : `<div class="empty">還沒有訊息。按「發布訊息」寫第一則。</div>`;

  $('#app').innerHTML = `<div class="wrap">
    <div class="page-head" style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:240px">
        <h1>訊息</h1>
        <p>取代 LINE 的地方。重要的事寫在這裡，<strong>永遠找得回來</strong>，而且可以直接接著討論。</p>
      </div>
      <button class="btn" id="newMsg">＋ 發布訊息</button>
    </div>
    ${list}
  </div>`;

  $('#newMsg').addEventListener('click', () => {
    openModal({
      title: '發布訊息',
      confirmText: '發布',
      body: `
        <div class="field">
          <label for="mTitle">標題 <span class="req">*</span></label>
          <input class="input" id="mTitle" placeholder="例：本週進度與待確認事項">
        </div>
        <div class="field">
          <label for="mBody">內容 <span class="req">*</span></label>
          <textarea class="textarea" id="mBody" placeholder="要傳達的重點…"></textarea>
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:13.5px">
          <input type="checkbox" id="mImportant"> 標為重要
        </label>`,
      onConfirm: async close => {
        const title = $('#mTitle').value.trim();
        const body = $('#mBody').value.trim();
        if (!title || !body) { toast('標題與內容都要填', 'warn'); return; }
        await api.postMessage({ title, body, important: $('#mImportant').checked });
        close();
        toast('訊息已發布');
        route();
      }
    });
  });
}

async function viewMessage(msgId) {
  const [message, replies] = await Promise.all([api.getMessage(msgId), api.listReplies(msgId)]);
  if (!message) {
    $('#app').innerHTML = `<div class="wrap"><div class="empty">找不到這則訊息。<br>
      <a href="#/msgs">← 回訊息列表</a></div></div>`;
    return;
  }

  const thread = replies.length ? `<div class="replies">${replies.map(r => `
    <div class="reply${r.createdBy === api.me.user?.uid ? ' reply--mine' : ''}">
      <div class="reply__who"><b>${esc(r.createdByName || '')}</b> · ${esc(api.fmtTime(r.createdAt))}</div>
      <div class="reply__body">${esc(r.body)}</div>
    </div>`).join('')}</div>`
    : `<p style="color:var(--faint);font-size:13.5px;margin:0">還沒有人回覆。</p>`;

  $('#app').innerHTML = `<div class="wrap">
    <nav class="crumb"><a href="#/msgs">訊息</a> › ${esc(message.title)}</nav>
    <div class="page-head">
      <h1>${esc(message.title)}</h1>
      <p>${esc(message.createdByName || '')} · ${esc(api.fmtTime(message.createdAt))}
        ${message.important ? '<span class="tag tag--danger" style="margin-left:6px">重要</span>' : ''}</p>
    </div>

    <section class="card" style="margin-bottom:18px">
      <div class="card__body"><div class="msgbody">${esc(message.body)}</div></div>
    </section>

    <section class="card">
      <div class="card__head"><h2>討論（${replies.length}）</h2></div>
      <div class="card__body">
        ${thread}
        <div class="field" style="margin-top:18px">
          <label for="rBody">回覆</label>
          <textarea class="textarea" id="rBody" style="min-height:80px" placeholder="寫下你的回覆…"></textarea>
        </div>
        <div class="row row--end"><button class="btn" id="sendReply">送出回覆</button></div>
      </div>
    </section>

    ${api.me.role === 'admin' ? `<div class="row row--end" style="margin-top:18px">
      <button class="btn btn--ghost btn--sm" id="delMsg" style="color:var(--danger-fg)">刪除這則訊息</button>
    </div>` : ''}
  </div>`;

  $('#sendReply').addEventListener('click', async () => {
    const body = $('#rBody').value.trim();
    if (!body) { toast('請先寫點什麼', 'warn'); return; }
    const btn = $('#sendReply');
    btn.disabled = true;
    try { await api.postReply(msgId, body); route(); }
    catch (error) { toast(api.friendlyError(error), 'error'); btn.disabled = false; }
  });

  $('#delMsg')?.addEventListener('click', () => {
    openModal({
      title: '刪除這則訊息？', danger: true, confirmText: '確定刪除',
      body: note('error', '<strong>不可復原。</strong>訊息與所有回覆都會消失。'),
      onConfirm: async close => {
        await api.deleteMessage(msgId);
        close(); location.hash = '#/msgs'; toast('訊息已刪除');
      }
    });
  });
}

/* --------------------------------------------------------------------------
   成員（只有顧問看得到）
   -------------------------------------------------------------------------- */
async function viewMembers() {
  if (api.me.role !== 'admin') {
    $('#app').innerHTML = `<div class="wrap"><div class="empty">這一頁只有顧問看得到。</div></div>`;
    return;
  }
  const members = await api.listMembers();
  const STATUS = {
    approved:  ['ok', '已核准'],
    pending:   ['warn', '待審核'],
    suspended: ['danger', '已暫停']
  };

  const rows = members.map(m => {
    const [kind, label] = STATUS[m.status] || ['neutral', m.status || '未知'];
    const isSelf = m.id === api.me.user?.uid;
    return `<tr>
      <td><b>${esc(m.name || '')}</b>${isSelf ? ' <span class="tag">你</span>' : ''}
        <span class="sub">${esc(m.email || '')}</span></td>
      <td>${esc(m.org || '—')}</td>
      <td><span class="tag tag--${kind}">${esc(label)}</span></td>
      <td>${esc(api.fmtTime(m.createdAt))}</td>
      <td>${isSelf ? '' : `<div class="row">
        ${m.status !== 'approved' ? `<button class="btn btn--sm" data-approve="${m.id}">核准</button>` : ''}
        ${m.status === 'approved' ? `<button class="btn btn--ghost btn--sm" data-suspend="${m.id}">暫停</button>` : ''}
      </div>`}</td>
    </tr>`;
  }).join('');

  $('#app').innerHTML = `<div class="wrap">
    <div class="page-head">
      <h1>成員</h1>
      <p>新註冊的人預設是「待審核」，<strong>核准之前看不到任何檔案與訊息</strong>。
        不再合作時按「暫停」即可，資料會留著但立刻失去存取權。</p>
    </div>
    ${members.some(m => m.status === 'pending')
      ? note('warn', `有 <b>${members.filter(m => m.status === 'pending').length}</b> 個帳號等待核准。`)
      : ''}
    <section class="card">
      <div class="card__body card__body--flush">
        <div class="tablewrap"><table class="data">
          <thead><tr><th>成員</th><th>單位</th><th>狀態</th><th>申請時間</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>
    </section>
  </div>`;

  $('#app').addEventListener('click', async event => {
    const approve = event.target.closest('[data-approve]');
    const suspend = event.target.closest('[data-suspend]');
    if (!approve && !suspend) return;
    event.target.disabled = true;
    try {
      await api.setMemberStatus(
        (approve || suspend).dataset.approve || (approve || suspend).dataset.suspend,
        approve ? 'approved' : 'suspended'
      );
      toast(approve ? '已核准' : '已暫停');
      route();
    } catch (error) { toast(api.friendlyError(error), 'error'); }
  });
}

/* --------------------------------------------------------------------------
   路由
   -------------------------------------------------------------------------- */
const TABS = [
  { hash: '#/feed', label: '動態',  key: 'feed' },
  { hash: '#/docs', label: '檔案',  key: 'docs' },
  { hash: '#/msgs', label: '訊息',  key: 'msgs' },
  { hash: '#/members', label: '成員', key: 'members', adminOnly: true }
];

function renderTabs(active) {
  $('#tabs').innerHTML = TABS
    .filter(t => !t.adminOnly || api.me.role === 'admin')
    .map(t => `<a href="${t.hash}" class="${t.key === active ? 'is-active' : ''}">${esc(t.label)}</a>`)
    .join('');
}

async function route() {
  if (!api.me.ready) return;

  if (!api.me.user) { renderAuth(); return; }
  if (api.me.role === 'pending') { renderPending(); return; }

  const path = location.hash.replace(/^#/, '') || '/feed';
  $('#app').innerHTML = `<div class="wrap"><div class="empty">載入中…</div></div>`;

  try {
    if (/^\/doc\/(.+)$/.test(path)) { renderTabs('docs'); await viewDoc(path.match(/^\/doc\/(.+)$/)[1]); }
    else if (/^\/msg\/(.+)$/.test(path)) { renderTabs('msgs'); await viewMessage(path.match(/^\/msg\/(.+)$/)[1]); }
    else if (path === '/docs') { renderTabs('docs'); await viewDocs(); }
    else if (path === '/msgs') { renderTabs('msgs'); await viewMessages(); }
    else if (path === '/members') { renderTabs('members'); await viewMembers(); }
    else { renderTabs('feed'); await viewFeed(); }
  } catch (error) {
    $('#app').innerHTML = `<div class="wrap">${note('error',
      `<strong>載入失敗</strong>${esc(api.friendlyError(error))}`)}
      <p style="font-size:13px;color:var(--faint)">若訊息提到權限不足，通常是 Firestore／Storage 規則還沒發布。
      設定步驟見專案的 <code>workspace/SETUP.md</code>。</p></div>`;
  }
  window.scrollTo({ top: 0 });
}

/* --------------------------------------------------------------------------
   啟動
   -------------------------------------------------------------------------- */
function renderHeader() {
  const who = $('#who');
  if (api.me.user) {
    who.innerHTML = `<b>${esc(api.displayName())}</b>${esc(
      api.me.role === 'admin' ? '顧問' : api.me.profile?.org || '成員')}`;
    $('#logoutBtn').style.display = '';
  } else {
    who.innerHTML = '';
    $('#logoutBtn').style.display = 'none';
  }
}

function boot() {
  if (!api.firebaseReady()) {
    $('#app').innerHTML = `<div class="wrap">${note('error',
      `<strong>Firebase 初始化失敗</strong>${esc(api.firebaseError)}`)}</div>`;
    return;
  }

  $('#themeBtn').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const dark = current === 'dark' || (!current && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = dark ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  $('#logoutBtn').addEventListener('click', () => api.logout());

  api.onIdentity(() => { renderHeader(); route(); });
  api.watchAuth();
  window.addEventListener('hashchange', route);
}

boot();
