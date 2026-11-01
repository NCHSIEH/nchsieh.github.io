/* Pure teaching logic, shared by the page and validation checks. */
(function(root){
  'use strict';
  const caps={2:10020,3:15460,4:18580,5:24100,6:28070,7:32090,8:36180};
  function parseAssessment(raw){
    const cleaned=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
    let d;try{d=JSON.parse(cleaned)}catch(e){throw Error('JSON 無法解析：請檢查引號、逗號、括號，或輸出是否被截斷。')}
    if(!d||Array.isArray(d)||typeof d!=='object')throw Error('需要 JSON 物件。');
    if(typeof d.cms_level==='string'&&/^[2-8]$/.test(d.cms_level))d.cms_level=Number(d.cms_level);
    if(!Number.isInteger(d.cms_level)||d.cms_level<2||d.cms_level>8)throw Error('cms_level 必須是 2–8 的整數；停止試算並交人工覆核。');
    if(typeof d.adl_score!=='number'||!Number.isFinite(d.adl_score)||d.adl_score<0||d.adl_score>100)throw Error('adl_score 必須是 0–100 的數值。');
    if(typeof d.is_dementia!=='boolean')throw Error('is_dementia 必須是布林值 true / false。');
    for(const key of ['major_problems','suggested_needs'])if(!Array.isArray(d[key])||!d[key].length||d[key].some(x=>typeof x!=='string'||!x.trim()))throw Error(key+' 必須是非空的文字陣列。');
    return d;
  }
  function budget(level,income){if(!Number.isInteger(level)||!caps[level])throw Error('無效 CMS 等級。');const rates={'一般戶':16,'中低收':5,'低收':0};if(!(income in rates))throw Error('未知福利身分別。');return {cms_level:level,monthly_budget:caps[level],copay_rate:rates[income]};}
  function plan(level,income,foreign,rows){const b=budget(level,income);let monthly=0,separate=0;const blocked=[];for(const r of rows){if(!Number.isFinite(r.price)||r.price<0||!Number.isInteger(r.qty)||r.qty<0)throw Error('單價須為非負數；次數須為非負整數。');if(foreign&&r.allowed===false&&r.qty>0){blocked.push(r.code);continue}if(r.group==='EF')separate+=r.price*r.qty;else monthly+=r.price*r.qty;}return {...b,monthly,separate,blocked,over:Math.max(0,monthly-b.monthly_budget),copay:Math.round(Math.min(monthly,b.monthly_budget)*b.copay_rate/100),excess:Math.max(0,monthly-b.monthly_budget)};}
  function rank(rows,mode,weight,k,threshold){return rows.map(r=>({...r,score:mode==='vector'?r.v:mode==='full'?r.f:weight*r.v+(1-weight)*r.f})).filter(r=>r.score>=threshold).sort((a,b)=>b.score-a.score).slice(0,k);}
  const api={caps,parseAssessment,budget,plan,rank};root.HB=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
