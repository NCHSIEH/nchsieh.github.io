import { watchAuth, resolveIdentity, listCourses, loadCourseDetail, firebaseReady } from '/assets/js/data.js';
const $=s=>document.querySelector(s);
const WEEK=document.body.dataset.week||'';
const TITLES={"01": "智慧醫療的範疇與價值框架", "02": "智慧醫療科技演進與國際趨勢", "03": "醫療資料互通與數位成熟度", "04": "使用者中心設計與健康行為改變", "05": "醫療 AI 方法論與模型生命週期", "06": "生成式 AI 與大型語言模型的臨床應用", "07": "AI Agent 與臨床流程自動化", "08": "臨床決策支援與預警系統", "10": "遠距病人監測與數位療法", "11": "智慧醫院、數位孿生與居家醫院", "12": "醫療 AI 實證評估", "13": "醫療 AI 法規、倫理與資料治理", "14": "數位健康經濟評估與導入策略", "15": "智慧醫療的組織治理與變革管理", "16": "技術成熟度與產業化路徑", "17": "前瞻科技趨勢"};
function msg(h){$('#app').innerHTML=`<div class="callout">${h}</div>`}
function b64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function decrypt(keyB64,buf){
  const key=await crypto.subtle.importKey('raw',b64(keyB64),'AES-GCM',false,['decrypt']);
  const u=new Uint8Array(buf);const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:u.slice(0,12)},key,u.slice(12));
  return JSON.parse(new TextDecoder().decode(pt));
}
function download(name,text){
  const type=name.endsWith('.json')?'application/json':name.endsWith('.csv')?'text/csv':'text/plain';
  const blob=new Blob([name.endsWith('.json')?text:'﻿'+text],{type:type+';charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
async function main(){
  if(!firebaseReady){msg('系統暫時無法連線，請稍後再試。');return}
  watchAuth(async user=>{
    if(!user){msg('補充教材僅限修課學生。請先到<a href="/courses.html">課程頁</a>登入，再回到這一頁。');return}
    const id=await resolveIdentity(user);
    if(id.role!=='student'&&id.role!=='admin'){msg('你的帳號尚未通過修課審核，通過後即可閱讀。<a href="/courses.html">回課程頁</a>');return}
    try{
      const cs=await listCourses();const c=cs.find(x=>x.code==='SHTD'||/智慧醫療與科技發展/.test(x.title||x.name||''));
      const det=await loadCourseDetail(c.id);
      if(!det.allowed){msg('這門課不在你的修課範圍內。<a href="/courses.html">回課程頁</a>');return}
      const mats=det.materials.filter(m=>m.kind==='supplement');
      if(!WEEK){
        $('#app').innerHTML='<h1>每週導讀、延伸閱讀與練習資料</h1><p class="lead">每週一頁：白話導讀、可下載的練習資料（教學合成資料）與 4 篇延伸閱讀。已依新版講義及互動頁校對（2026-11-28），附主檔／學生 PDF 雙頁碼。先讀導讀，再做練習並核對本週互動頁；課內繳交及評分依講義。W9、W18 為評量週，不提供。</p>'+
          '<div class="callout"><b>獨立補充單元</b>：<a href="../interactive/s01/">S1 居家感測與穿戴裝置的量測品質</a>，附導讀、學生PDF、練習資料與互動頁；<a href="../interactive/s02/">S2 急診到診量預估</a> 附合成資料、研究計畫與時間回測；<a href="../interactive/s03/">S3 緊急醫療資源最佳化</a> 附 119 駐點與災難調度實作；<a href="../interactive/s04/">S4 CNN 影像判別與校準</a> 附捷徑稽核與決策曲線；<a href="../interactive/s05/">S5 正念減壓試驗與 ANCOVA</a> 附 ITT／PP 敏感度分析。原有18週及配分不變，不另計分。</div>'+
          mats.sort((a,b)=>a.week.localeCompare(b.week)).map(m=>`<div class="read"><a href="w${m.week}.html"><b>W${+m.week}　${TITLES[m.week]||''}</b></a></div>`).join('');
        return;
      }
      const m=mats.find(x=>x.week===WEEK);
      if(!m){msg('找不到本週補充教材。');return}
      const r=await fetch(`enc/w${WEEK}.bin`,{cache:'no-store'});
      if(!r.ok)throw new Error(`教材讀取失敗：HTTP ${r.status}`);
      const data=await decrypt(m.k,await r.arrayBuffer());
      document.title=data.title;
      $('#app').innerHTML=`<p class="meta top noprint"><a href="index.html">← 補充教材總覽</a>　｜　<a href="../interactive/w${WEEK}/">W${+WEEK} 互動學習頁</a></p>`+data.html;
      document.querySelectorAll('a.dl[data-file]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();download(a.dataset.file,data.files[a.dataset.file])}));
    }catch(e){console.error(e);msg('讀取失敗，請重新整理；若持續發生請通知老師。')}
  });
}
main();
