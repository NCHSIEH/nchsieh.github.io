'use strict';
const $ = id => document.getElementById(id);
const slots = window.S02_SHIFTS;
const byTime = new Map(slots.map(s=>[Date.parse(s.shift_start),s]));
const testing = slots.filter(s=>s.week>=13);
const labelTime = iso=>iso.slice(5,16).replace('T',' ');
const fmt = n=>n===null?'—':n.toFixed(2);
const weekMs = 7*24*60*60*1000;

function history(s) {
  const at=Date.parse(s.shift_start), issue=Date.parse(s.issue);
  return Array.from({length:8},(_,i)=>{
    const prior=byTime.get(at-(i+1)*weekMs);
    const eligible=prior && prior.y!==null && Date.parse(prior.finalized_at)<=issue;
    return {lag:i+1,prior,eligible};
  });
}
function predict(s, minimum) {
  const usable=history(s).filter(h=>h.eligible);
  const recent=usable.filter(h=>h.lag<=4).map(h=>h.prior.y).sort((a,b)=>a-b);
  let base=null,trend=null;
  if(recent.length>=minimum){
    const i=Math.floor(recent.length/2);
    base=recent.length%2?recent[i]:(recent[i-1]+recent[i])/2;
  }
  if(usable.length>=4){
    const x=usable.reduce((v,h)=>v+h.lag,0)/usable.length;
    const y=usable.reduce((v,h)=>v+h.prior.y,0)/usable.length;
    const b=usable.reduce((v,h)=>v+(h.lag-x)*(h.prior.y-y),0)/usable.reduce((v,h)=>v+(h.lag-x)**2,0);
    trend=Math.max(0,y-b*x);
  }
  return {base,trend};
}
function row(parent,values){
  const tr=parent.insertRow();for(const v of values)tr.insertCell().textContent=v;
}
function selected(){return testing[Number($('shift').value)];}
function minimum(){return Number($('minimum').value);}
function paintShift(){
  const s=selected();
  $('issue').textContent='發報時間 '+labelTime(s.issue)+'。時間均為 UTC+8；歷史班完成且結案時間在發報前或當下才可使用。';
  $('history').replaceChildren();
  for(const h of history(s)){
    const p=h.prior;
    const reason=h.eligible?String(p.y): Date.parse(p.finalized_at)>Date.parse(s.issue)?'當時尚未結案':p.status==='partial'?'部分觀測':'停傳';
    row($('history'),[h.lag,labelTime(p.shift_start),labelTime(p.finalized_at),reason]);
  }
  $('guess').value='';$('answer').textContent='';$('feedback').textContent='';
}
function grade(abstain){
  const base=predict(selected(),minimum()).base;
  const input=$('guess');
  if(!abstain && (input.value.trim()===''||!input.validity.valid)){
    $('feedback').textContent='請輸入非負整數或半整數，或選擇無法發報。';return;
  }
  const correct=abstain?base===null:base!==null && Number(input.value)===base;
  $('feedback').textContent=(correct?'判讀正確。':'再看最近四個週距。')+(base===null?' 可用歷史不足，基準暫無預報。':' 合格值排序後，中位數為 '+base+' 人次。');
}
function reveal(){
  const s=selected(),{base,trend}=predict(s,minimum());
  const text=(v)=>v===null?'未發布':fmt(v)+' 人次';
  $('answer').textContent='四週中位數 '+text(base)+'；八週趨勢 '+text(trend)+'。'+
    (s.y===null?'該班觀測不完整，實際人次未知。':'結案後實際 '+s.y+' 人次。')+
    (s.y!==null && base!==null && trend!==null?' 兩模型的絕對誤差分別為 '+fmt(Math.abs(base-s.y))+' 與 '+fmt(Math.abs(trend-s.y))+' 人次。':' 本班未進入兩模型共同評分。');
}
function score(){
  const group=testing.filter(s=>$('week').value==='all'||s.week===Number($('week').value)).map(s=>({...predict(s,minimum()),y:s.y}));
  const common=group.filter(r=>r.y!==null&&r.base!==null&&r.trend!==null);
  const peaks=common.filter(r=>r.y>=28);
  $('denom').textContent='預定 '+group.length+' 班｜結局完整 '+group.filter(r=>r.y!==null).length+' 班｜共同可評 '+common.length+' 班';
  $('metrics').replaceChildren();
  const maes={};
  for(const [method,name] of [['base','四週中位數'],['trend','八週趨勢']]){
    const errors=common.map(r=>r[method]-r.y);
    const mean=a=>a.length?a.reduce((v,n)=>v+n,0)/a.length:null;
    maes[method]=mean(errors.map(Math.abs));
    row($('metrics'),[name,group.filter(r=>r[method]!==null).length+'/'+group.length,fmt(maes[method]),fmt(mean(errors)),peaks.filter(r=>r[method]<r.y).length+'/'+peaks.length]);
  }
  $('delta').textContent='ΔMAE（趨勢減基準）＝ '+(common.length?fmt(maes.trend-maes.base):'—')+' 人次／班。尖峰分母為零時，該期間沒有可比較的尖峰班。';
}
testing.forEach((s,i)=>$('shift').add(new Option(labelTime(s.shift_start),i)));
for(let i=13;i<=20;i++)$('week').add(new Option('研究第 '+i+' 週',i));
$('shift').value='1';$('shift').onchange=paintShift;
$('minimum').onchange=()=>{paintShift();score();};$('week').onchange=score;
$('check').onclick=()=>grade(false);$('abstain').onclick=()=>grade(true);$('reveal').onclick=reveal;
paintShift();score();

