'use strict';
// 以真正的 HUD、觸控與鍵盤操作。所有頁面在載入前指定獨立的存檔槽 3。
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const [source,out,mode='current']=process.argv.slice(2);
if(!source||!out)throw Error('node mayor.cjs <遊戲目錄或網址> <證據目錄> [current|base|live]');
fs.mkdirSync(out,{recursive:true});
function layout(longNumbers=false){
  const by=id=>document.getElementById(id),rect=e=>e.getBoundingClientRect();
  if(longNumbers){
    by('money').querySelector('b').textContent='999,999,999';
    by('pop').querySelector('b').textContent='888,888';
    by('date').textContent='🍂 ☀️ 第99年 第360天';
  }
  const a=by('bAI'),s=by('bSpeed'),ar=rect(a),sr=rect(s);
  const hit=e=>{const r=rect(e);return r.width>0&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));};
  const d=by('date'),dr=rect(d),range=document.createRange();range.selectNodeContents(d);
  return {width:innerWidth,hud:rect(by('hud')).height,visible:hit(a),speed:hit(s),save:hit(by('bSave')),date:hit(d),
    textFits:[...range.getClientRects()].every(r=>r.x>=dr.x-1&&r.right<=dr.right+1),sameRow:Math.abs(ar.y+ar.height/2-sr.y-sr.height/2)<2,
    adjacent:a.nextElementSibling===s,gap:sr.x-ar.right,targets:[ar.width,ar.height,sr.width,sr.height],overflow:document.documentElement.scrollWidth>innerWidth,
    count:document.querySelectorAll('#bAI').length,pressed:a.getAttribute('aria-pressed'),on:GV.aiInfo().on,
    hudRects:['money','pop','date','bAI','bSpeed','bSave'].map(id=>{const r=rect(by(id));return [id,r.left,r.right];}),docWidth:document.documentElement.scrollWidth};
}
async function main(){
  let srv,url=source;
  if(!/^https?:/.test(source)){
    srv=http.createServer((q,r)=>{const n=path.basename(new URL(q.url,'http://localhost').pathname)||'index.html',f=path.join(source,n);
      if(!fs.existsSync(f)){r.writeHead(404).end();return;}r.setHeader('Content-Type',n.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');fs.createReadStream(f).pipe(r);});
    await new Promise(ok=>srv.listen(0,'127.0.0.1',ok));url='http://127.0.0.1:'+srv.address().port+'/';
  }
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true}),errors=[],rows=[],checks=[];
  function check(test,msg){assert.ok(test,msg);checks.push(msg);}
  async function open(width,touch,flag=''){
    const ctx=await browser.newContext({viewport:{width,height:820},hasTouch:touch,isMobile:touch,serviceWorkers:'block'});
    await ctx.addInitScript(flag=>{for(const ns of ['glimmerville.v1','glimmerville.main.v1']){localStorage.setItem(ns+'.slot','3');localStorage.setItem(ns+'.snd','0');}if(flag==='window')window.__noT683=true;},flag);
    const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000);
    await p.goto(url+(flag.startsWith('?')?flag:''),{waitUntil:'domcontentloaded',timeout:90000});
    await p.waitForFunction(()=>window.GV&&window.__boot426?.().ready,null,{timeout:150000});
    await p.locator('#bNewGame').click();await p.waitForFunction(()=>document.querySelector('#start').style.display==='none');return {ctx,p};
  }
  async function size(p,width,height){await p.setViewportSize({width,height});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
  async function state(p,expected,msg){const v=await p.evaluate(layout);check(v.on===expected&&v.pressed===String(expected),msg);}
  async function valid(p,label,longNumbers=false){
    const v=await p.evaluate(layout,longNumbers);rows.push({label,...v});
    check(v.visible&&v.speed&&v.date&&v.save&&v.count===1,label+' 原控制項可點');
    check(v.adjacent&&v.sameRow&&v.gap>=3.95&&v.gap<=8.05,label+' 市長緊鄰速度左側');
    check(Math.min(...v.targets)>=43.99&&!v.overflow&&v.textFits,label+' 點擊區與日期可讀');
    if(v.width<=899){
      check(v.hud===52,label+' 頂欄維持 52 px');
      check(await p.locator('#bSave').evaluate(e=>getComputedStyle(e,'::before').whiteSpace==='nowrap'),label+' 存檔標籤單行');
    }
  }
  try{
    const {ctx,p}=await open(390,true);
    if(mode==='base'){
      for(const [w,h] of [[320,740],[390,844],[712,735],[1024,768]]){
        await size(p,w,h);const v=await p.evaluate(layout);rows.push(v);
        check(w<900?!v.visible:v.visible&&!v.adjacent,'舊版 '+w);
        if(w===712)await p.locator('#hud').screenshot({path:path.join(out,'before-712.png')});
      }
    }else{
      for(const [w,h] of [[320,740],[390,844],[712,735],[844,390],[1024,768]]){
        await size(p,w,h);await valid(p,w+'×'+h);
        if(w===390||w===712)await p.locator('#hud').screenshot({path:path.join(out,'hud-'+w+'.png')});
      }
      await size(p,390,844);
      const ai=p.getByRole('button',{name:'AI 市長',exact:true}),speed=p.locator('#bSpeed'),initial=await speed.textContent();
      await ai.tap();await state(p,true,'頂欄開啟 AI');check(await speed.textContent()===initial,'開 AI 不改速度');
      await speed.tap();check(await speed.textContent()!==initial,'速度鍵可獨立切換');await state(p,true,'速度不改 AI');
      await ai.focus();await p.keyboard.press('Tab');check(await speed.evaluate(e=>e===document.activeElement),'Tab 從市長移至速度');
      const beforeKey=await speed.textContent();await ai.press('Space');await state(p,false,'空白鍵關閉 AI');check(await speed.textContent()===beforeKey,'空白鍵不加速');
      await ai.press('Enter');await state(p,true,'Enter 啟用 AI');
      await p.locator('[data-root=city]').tap();await p.locator('[data-route=manage]').tap();
      const menu=p.locator('[data-route=bAI]');check((await menu.textContent()).includes('已啟用'),'城市選單顯示相同狀態');await menu.tap();await state(p,false,'城市選單關閉頂欄 AI');
      await ai.tap();await speed.tap();await speed.tap();check(/5x/.test(await speed.textContent()),'加速到 5x');await state(p,true,'5x 與市長同時開啟');
      await size(p,712,735);await p.locator('#hud').screenshot({path:path.join(out,'hud-on-712.png')});
      await p.evaluate(()=>GV.save());await ai.tap();await p.evaluate(()=>GV.load(3));await state(p,true,'槽 3 還原已啟用的市長');
      await p.evaluate(()=>{const key=['glimmerville.main.v1.s3','glimmerville.v1.s3'].find(k=>localStorage.getItem(k));const save=JSON.parse(localStorage.getItem(key));delete save.aim;localStorage.setItem(key,JSON.stringify(save));GV.load(3);});await state(p,false,'舊檔缺少 aim 時關閉');
      await ai.tap();await p.evaluate(()=>GV.newWorldSeeded(683));await state(p,false,'新城關閉 AI');
      await size(p,320,740);
      await p.evaluate(()=>{GV.setSpeed(0);});
      await p.waitForTimeout(450);
      await ai.tap();await state(p,true,'最窄手機可開啟市長');
      check(await p.locator('#toasts .toast').evaluateAll(items=>items.length>0&&items.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})),'最窄手機的市長通知完整可見');
      await valid(p,'320 長數字',true);
      if(mode!=='live'){
        const desktop=await open(1440,false),dp=desktop.p;
        const defaultOrder=()=>dp.evaluate(()=>document.querySelector('#bSpeed').nextElementSibling===document.querySelector('#bAI'));
        check(await defaultOrder(),'桌面沿用速度在前');await size(dp,390,844);await valid(dp,'桌面縮為手機大小');
        await size(dp,1440,900);check(await defaultOrder(),'放大後復原桌面按鈕順序');await desktop.ctx.close();
        for(const flag of ['?noT683=1','window','?noT682=1']){
          const other=await open(390,true,flag),v=await other.p.evaluate(layout);check(!v.adjacent&&(flag==='?noT682=1'?v.visible:!v.visible),flag+' 回退原版');await other.ctx.close();
        }
      }
    }
    await ctx.close();check(!errors.length,'無瀏覽器例外');console.log('PASS',checks.length);
  }finally{fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({checks,rows,errors},null,2));await browser.close();if(srv)srv.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
