const $=s=>document.querySelector(s);
const KEY='SHTD:S1:2026-11-28:cases';
const PDF='../../S01_居家感測與穿戴裝置的量測品質_Home_Sensing_and_Wearable_Measurement_Quality.pdf';
const FILES=['S01_量測品質情境練習.csv','S01_三曆日體重練習.csv','S01_裝置重複量測比較.csv','S01_裝置選擇與接手表.csv','S01_練習資料說明.txt'];
export function compareStats(rows){
 if(!rows.length||rows.some(r=>!Number.isFinite(r.measured_kg)||!Number.isFinite(r.reference_kg)))throw Error('Invalid repeat data');
 const errors=rows.map(r=>Math.round((r.measured_kg-r.reference_kg)*1000)/1000),values=rows.map(r=>r.measured_kg);
 return {errors,bias:errors.reduce((a,b)=>a+b,0)/rows.length,mae:errors.reduce((a,b)=>a+Math.abs(b),0)/rows.length,range:Math.max(...values)-Math.min(...values)};
}
export function trendResult(records,date){
 const row=records.find(r=>r.date===date);if(!row)return {status:'invalid',reason:'找不到指定日期。'};
 const day=new Date(date+'T00:00:00Z');day.setUTCDate(day.getUTCDate()-3);const baseDate=day.toISOString().slice(0,10),base=records.find(r=>r.date===baseDate);
 const state={date,baseDate,row,base};
 if(!Number.isFinite(row.kg)||row.kg<=0)return {...state,status:'missing',reason:'今天缺測或數值無效；不補零，也不顯示正常燈號。'};
 if(row.context!=='standard')return {...state,status:'conditions',reason:'今天的量測條件不同；先依計畫確認及補測，暫不計算可比趨勢。'};
 if(!base||!Number.isFinite(base.kg)||base.kg<=0)return {...state,status:'baseline',reason:'恰好三個曆日前沒有有效體重；不能改抓上一筆替代。'};
 if(base.context!=='standard')return {...state,status:'conditions',reason:'三個曆日前的量測條件不同；保留今天原值，暫不比較。'};
 if(row.person!==base.person||row.device!==base.device)return {...state,status:'device',reason:'兩筆的身分或裝置不一致；停止自動比較並人工確認，不直接接續不同裝置的序列。'};
 const delta10=Math.round(row.kg*10)-Math.round(base.kg*10),delta=delta10/10;
 return {...state,status:delta10>20?'red':delta10>=10?'yellow':'green',delta,reason:delta10>20?'紅：依課堂規格及照護計畫聯絡團隊（僅示意）。':delta10>=10?'黃：依照護計畫確認並持續記錄。':'綠：未達本教學增重提醒；不代表臨床安全。'};
}
export function poundsToKg(text){
 const s=String(text).trim();if(!/^\d+(?:\.\d+)?$/.test(s))return null;
 const n=Number(s);if(!Number.isFinite(n)||n<=0||!Number.isFinite(n*.45359237))return null;
 return n*.45359237;
}
function download(name,text,type='text/plain'){
 const blob=new Blob(['\uFEFF'+text],{type:type+';charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},600);
}
const quote=v=>{const s=String(v??'');return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s};
function node(tag,text,attrs={}){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el;}
function result(target,title,text,type=''){
 const el=$(target);el.replaceChildren(node('strong',title),node('span',text));el.className='result '+type;
}
let lesson,answers={};
function drawErrors(){
 const rows=lesson.repeats.filter(r=>r.device===$('#device').value),s=compareStats(rows),svg=$('#error-chart');
 const ns='http://www.w3.org/2000/svg';svg.replaceChildren();const add=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));if(text)el.textContent=text;svg.append(el);return el};
 add('title',{id:'error-chart-title'},'裝置'+$('#device').value+'的五次量測誤差');
 add('desc',{id:'error-chart-desc'},'五次誤差為'+s.errors.join('、')+'公斤；中線為零誤差教學參考。');
 const x=v=>100+(v+2)*140;
 add('line',{x1:x(0),y1:35,x2:x(0),y2:156,stroke:'#57534e','stroke-dasharray':'5 4'});
 for(let t=-2;t<=3;t++){add('line',{x1:x(t),y1:160,x2:x(t),y2:166,stroke:'#57534e'});add('text',{x:x(t),y:190,'text-anchor':'middle',fill:'#57534e','font-size':16},String(t));}
 add('text',{x:25,y:22,fill:'#57534e','font-size':16},'誤差 kg（量測−固定參考）');
 s.errors.forEach((v,i)=>add('circle',{cx:x(v),cy:60+i*17,r:7,fill:$('#device').value==='B'?'#b63c0b':'#1e3a8a'}));
 result('#agreement-result',`平均偏差 ${s.bias.toFixed(2)} kg｜MAE ${s.mae.toFixed(2)} kg`,`本組最大−最小 ${s.range.toFixed(2)} kg。`+({A:'小偏差且集中，仍不能外推真實使用表現。',B:'重複量得集中，但固定偏高；集中不保證準確。',C:'正負誤差抵消，平均偏差為零；單次仍可能差很多。'}[$('#device').value]));
 $('#repeat-table').replaceChildren(...rows.map((r,i)=>{const tr=node('tr');[r.repeat,r.reference_kg.toFixed(1),r.measured_kg.toFixed(1),s.errors[i].toFixed(1)].forEach(v=>tr.append(node('td',String(v))));return tr}));
}
function showTrend(){
 const r=trendResult(lesson.trend,$('#trend-day').value),valid=['red','yellow','green'].includes(r.status);
 result('#trend-result',valid?`${r.date} 對 ${r.baseDate}：${r.delta>=0?'+':''}${r.delta.toFixed(1)} kg`:'暫不可判三日趨勢',`${r.reason} 比較日期：${r.date} 與 ${r.baseDate}。`,valid?(r.status==='green'?'':'warn'):'stop');
}
function convert(){const v=poundsToKg($('#pounds').value);if(v===null){result('#conversion-result','請輸入有效的正數lb','空白、零、負數或非數字不進行換算，舊結果已清除。','stop');return;}result('#conversion-result',`${$('#pounds').value.trim()} lb＝${v.toFixed(2)} kg`,`計算使用係數0.45359237；未取位結果 ${v} kg。保留原值、原單位及轉換紀錄。`);}
function saveAnswers(){try{localStorage.setItem(KEY,JSON.stringify(answers));}catch{/* Continue in memory when storage is unavailable. */}}
function showCase(){
 const q=lesson.cases.find(q=>q.id===$('#case-picker').value),current=answers[q.id];
 $('#case-content').replaceChildren(node('h3',`${q.id}｜${q.topic}｜${q.value}`),node('p',q.context),node('p',q.question));
 $('#case-options').replaceChildren(...Object.entries(lesson.options).map(([code,label])=>{const b=node('button',code+'｜'+label,{type:'button','class':'choice','aria-pressed':String(current===code),'data-answer':code});b.addEventListener('click',()=>{answers[q.id]=code;saveAnswers();showCase()});return b;}));
 if(current){result('#case-feedback',current===q.answer?'主要動作符合本情境':'再看一次優先順序',`建議主要動作：${q.answer}｜${lesson.options[q.answer]}。${q.reason} 其他合理處理須說明條件與接手。`,current===q.answer?'':'warn');}
 else result('#case-feedback','先選主要動作，再寫理由','這是自學回饋，不是正式成績；實際照護依個人計畫與專業判斷。');
 $('#case-progress').textContent=`已思考 ${Object.keys(answers).length}／${lesson.cases.length} 個情境。紀錄僅存自己的瀏覽器。`;
}
async function main(){
 try{
  const response=await fetch('lesson.json',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);lesson=await response.json();
  $('#pdf-link').href=PDF;$('#pdf-link').setAttribute('download','');
  $('#download-links').replaceChildren(...FILES.map(name=>node('a',name,{href:'data/'+encodeURIComponent(name),download:''})));
  try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))answers=Object.fromEntries(Object.entries(saved).filter(([id,v])=>lesson.cases.some(q=>q.id===id)&&Object.hasOwn(lesson.options,v)));}catch{answers={};}
  $('#device').addEventListener('change',drawErrors);drawErrors();
  $('#trend-day').replaceChildren(...lesson.trend.map(r=>node('option',r.date,{value:r.date})));$('#trend-day').value='2026-10-04';
  $('#trend-day').addEventListener('change',showTrend);$('#boundary').addEventListener('click',()=>{$('#trend-day').value='2026-10-04';showTrend()});$('#missing').addEventListener('click',()=>{$('#trend-day').value='2026-10-07';showTrend()});
  $('#trend-table').replaceChildren(...lesson.trend.map(r=>{const tr=node('tr');[r.date,r.kg===null?'缺測':r.kg.toFixed(1),r.device,r.note].forEach(v=>tr.append(node('td',v)));return tr}));showTrend();
  $('#convert').addEventListener('click',convert);$('#pounds').addEventListener('input',()=>result('#conversion-result','輸入已變更，請重新換算','舊換算結果已清除。'));convert();
  $('#case-picker').replaceChildren(...lesson.cases.map(q=>node('option',q.id+' '+q.topic,{value:q.id})));$('#case-picker').addEventListener('change',showCase);showCase();
  $('#next-case').addEventListener('click',()=>{$('#case-picker').selectedIndex=($('#case-picker').selectedIndex+1)%lesson.cases.length;showCase()});
  $('#reset-cases').addEventListener('click',()=>{answers={};try{localStorage.removeItem(KEY)}catch{}showCase()});
  $('#export-cases').addEventListener('click',()=>{const rows=[['版本','情境編號','我的選項','建議主要動作','理由'],...lesson.cases.map(q=>[lesson.version,q.id,answers[q.id]||'未作答',answers[q.id]?q.answer:'',answers[q.id]?q.reason:''])];download('S01_我的情境練習紀錄.csv',rows.map(r=>r.map(quote).join(',')).join('\n')+'\n','text/csv')});
  $('#export-selection').addEventListener('click',()=>{const text=$('#selection-notes').value.trim();if(!text){$('#selection-notes').focus();return;}download('S01_我的裝置選擇草稿.txt','S1教學草稿；非正式病歷或採購核定\n'+text+'\n')});
  $('#clear-selection').addEventListener('click',()=>{$('#selection-notes').value=''});
 }catch(error){$('#load-error').textContent='互動資料讀取失敗，請重新整理；也可先使用完整導讀與PDF。';console.error(error);}
}
if(typeof document!=='undefined')main();
