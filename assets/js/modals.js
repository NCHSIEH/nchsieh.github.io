/* ==========================================================================
   學生入口 Modal 標記
   由 JS 注入，必須在 initUI() 之前呼叫。
   管理功能已獨立為 admin.html，不再以彈窗形式存在。
   ========================================================================== */

const STUDENT_MODAL = `
<div class="modal-overlay" id="modalStudent" aria-labelledby="studentModalTitle">
  <div class="modal-card narrow">
    <button class="modal-close" type="button" data-close-modal aria-label="關閉">&times;</button>
    <h2 class="modal-title" id="studentModalTitle">修課學生登入</h2>
    <p class="modal-sub" id="studentModalSub">請使用已通過審核的帳號登入。</p>

    <div id="authBanner" class="banner"></div>

    <div id="authSignedInBox" hidden></div>

    <div id="authFormBox">
      <form id="authForm" novalidate>
        <div class="form-group">
          <label for="stEmail">Email</label>
          <input type="email" id="stEmail" autocomplete="username" placeholder="student@ntunhs.edu.tw" required>
          <div class="help">建議使用學校信箱，方便老師確認你的修課身分。</div>
        </div>
        <div class="form-group">
          <label for="stPassword">密碼</label>
          <input type="password" id="stPassword" autocomplete="current-password" placeholder="至少 6 個字元" required>
        </div>

        <div id="regOnlyFields" hidden>
          <div class="form-row">
            <div class="form-group">
              <label for="stName">姓名</label>
              <input type="text" id="stName" autocomplete="name" placeholder="王小明">
            </div>
            <div class="form-group">
              <label for="stStudentId">學號</label>
              <input type="text" id="stStudentId" placeholder="選填">
            </div>
          </div>
          <div class="form-group">
            <label for="stClass">班級</label>
            <input type="text" id="stClass" placeholder="例如：護理系四年甲班">
          </div>
          <div class="form-group">
            <label for="stNote">備註</label>
            <input type="text" id="stNote" placeholder="選填">
          </div>
        </div>

        <button class="btn btn-primary btn-block btn-rect" type="submit" id="btnPrimaryAuth">登入</button>
      </form>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap;font-size:13px;color:var(--faint)">
        <span>
          <span id="authSwitchText">還沒有帳號？</span>
          <button type="button" id="btnSwitchMode" class="btn btn-quiet btn-sm btn-rect">申請新帳號</button>
        </span>
        <button type="button" id="btnForgotPass" class="btn btn-quiet btn-sm btn-rect">忘記密碼</button>
      </div>

      <p style="margin-top:16px;font-size:12.5px;color:var(--faint);line-height:1.7">
        申請流程：註冊 → 收驗證信並點擊連結 → 任課教師核准 → 取得講義存取權限。
      </p>
    </div>
  </div>
</div>`;

export function injectModals() {
  const host = document.createElement('div');
  host.id = 'modalHost';
  host.innerHTML = STUDENT_MODAL;
  document.body.append(host);
}
