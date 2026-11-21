'use strict';
// 用 Chrome 在隔離站點實走遊戲，測試槽位在載入前指定。網址模式也可驗正式包。
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const [source,out,mode='current',oldSave]=process.argv.slice(2);
if(!source||!out)throw Error('node mobile.cjs <遊戲目錄或遊玩網址> <證據目錄> [current|base|smoke] [舊存檔]');
fs.mkdirSync(out,{recursive:true});
const report={mode,checks:[],screens:[],layout:[]};
const check=(ok,label)=>{assert.ok(ok,label);report.checks.push(label);};

function inspectHint(){
  const rect=e=>e.getBoundingClientRect(),hint=document.querySelector('#hint'),txt=document.querySelector('#hintTxt'),x=document.querySelector('#hintX');
  const range=document.createRange();range.selectNodeContents(txt);
  const lines=Array.from(range.getClientRects()).filter(r=>r.width&&r.height);
  const hit=(el,px,py)=>el.contains(document.elementFromPoint(px,py));
  const close=rect(x),h=rect(hint),hud=rect(document.querySelector('#hud'));
  return {text:txt.textContent,lines:lines.length,readable:lines.length>0&&lines.every(r=>[.1,.5,.9].every(f=>hit(txt,r.x+r.width*f,r.y+r.height/2))),
    close:hit(x,close.x+close.width/2,close.y+close.height/2),target:[close.width,close.height],hud:hud.height,
    above:h.top>=hud.bottom,inside:h.x>=0&&h.right<=innerWidth&&h.bottom<=innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};
}
async function main(){
  let server,url=source;
  if(!/^https?:/.test(source)){
    server=http.createServer((req,res)=>{
      const name=path.posix.basename(new URL(req.url,'http://localhost').pathname)||'index.html';
      const file=path.join(source,name);
      if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
      res.writeHead(200,{'Content-Type':name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'application/javascript':'application/octet-stream'});
      fs.createReadStream(file).pipe(res);
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port+'/';
  }
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
  const pageErrors=[];
  async function load(w,h,flags='',save=null){
    const ctx=await browser.newContext({viewport:{width:w,height:h},hasTouch:w<900,isMobile:w<900,deviceScaleFactor:1,serviceWorkers:'block'});
    await ctx.addInitScript(({flags,save})=>{
      for(const key of ['glimmerville.main.v1','glimmerville.v1']){
        localStorage.setItem(key+'.slot','3');localStorage.setItem(key+'.snd','0');if(save)localStorage.setItem(key+'.s3',save);
      }
      if(flags==='window')window.__noT682=true;
    },{flags,save});
    const p=await ctx.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>pageErrors.push(String(e)));
    await p.goto(url+(flags.startsWith('?')?flags:''),{waitUntil:'domcontentloaded',timeout:120000});
    await p.waitForFunction(()=>window.GV&&window.__boot426?.().ready,null,{timeout:150000});
    await p.locator(save?'#bContinue':'#bNewGame').click();
    await p.waitForFunction(()=>getComputedStyle(document.querySelector('#start')).display==='none');
    await p.evaluate(()=>{GV.setSpeed(0);});return {p,ctx};
  }
  async function snap(p,name){await p.screenshot({path:path.join(out,name+'.png')});report.screens.push(name);}
  const tap=async(p,selector)=>{await p.locator(selector).first().tap();};
  const visible=(p,id)=>p.locator(id).isVisible();
  const menu=(p,id)=>tap(p,'[data-root="'+id+'"]');
  const row=(p,id)=>tap(p,'#list682 [data-route="'+id+'"]');
  const cat=(p,id)=>tap(p,'#toolcats [data-cat="'+id+'"]');
  async function checkHint(p,label){
    const value=await p.evaluate(inspectHint);report.layout.push({label,...value});
    check(value.readable&&value.close&&value.inside&&value.above&&!value.overflow&&Math.min(...value.target)>=44,label+' 教學全文及關閉可觸控');return value;
  }
  async function targets(p,label){
    const tiny=await p.evaluate(()=>Array.from(document.querySelectorAll('#sheet682 button,#dock682 button,#hintX,#bSave,#bSpeed'))
      .filter(b=>b.getClientRects().length&&(!b.closest('#tools')||b.id!=='toolsExp'||b.offsetWidth))
      .filter(b=>{const r=b.getBoundingClientRect();return r.width<43.9||r.height<43.9;}).map(e=>e.textContent));
    check(!tiny.length,label+' 操作至少 44 px '+tiny.join('、'));
  }
  async function road(p,label){
    await menu(p,'build');check(await visible(p,'#body682 #toolcats [data-cat=road]'),label+' 二級分類');
    await cat(p,'road');check(await visible(p,'#body682 #tools [data-tid=road]'),label+' 三級支路');
    await tap(p,'#tools [data-tid=road]');
    check(!await visible(p,'#sheet682')&&await p.locator('#game').evaluate(e=>e.classList.contains('build')),label+' 選完回圖');
    // 對準可建的原生草地，以真正的觸控輸入落地；由同一塊地的 road 值驗證。
    const site=await p.evaluate(()=>{
      const n=GV.mapSize?GV.mapSize():48;
      for(let y=3;y<Math.min(45,Number(n)||45);y++)for(let x=3;x<44;x++){
        const t=GV.tile(x,y);if(t?.t===2&&!t.bld&&!t.road&&!t.rail&&!t.tram&&!t.el){
          GV.setRot(0);GV.setZoom(1);GV.lookAt(x,y);GV.forceDraw();return {x,y};
        }
      }
      return null;
    });check(site,label+' 有可建草地');
    const point=await p.evaluate(()=>({x:innerWidth/2,y:innerHeight/2+16}));
    check(await p.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id==='game',point),label+' 點選位置是地圖');
    await p.touchscreen.tap(point.x,point.y);
    await p.waitForFunction(({x,y})=>!!GV.tile(x,y)?.road,site,{timeout:5000});
    check(await p.evaluate(({x,y})=>!!GV.tile(x,y).road,site),label+' 實際鋪路');
    return site;
  }
  try{
    if(mode==='base'){
      for(const w of [360,390,412,1440]){
        const {p,ctx}=await load(w,w===360?800:w===390?844:w===412?915:900);
        const val=await p.evaluate(inspectHint);report.layout.push({w,...val});
        if(w===390||w===1440)await snap(p,'before-'+w);
        check(w===1440?val.readable:!val.readable,w+' 原版命中結果');await ctx.close();
      }
    }else{
      const sizes=mode==='smoke'?[[390,844]]:[[390,844],[320,740],[360,800],[412,915],[844,390]];
      for(const [w,h] of sizes){
        const key=w+'×'+h,{p,ctx}=await load(w,h);
        await checkHint(p,key);await targets(p,key);await snap(p,'map-'+w);
        if(w===390&&mode!=='smoke'){
          const occluder=await p.addStyleTag({content:'#hint::after{content:"";position:absolute;inset:0;z-index:5;pointer-events:auto}'});
          const blocked=await p.evaluate(inspectHint);check(!blocked.readable&&!blocked.close,'插入遮擋時，文字與關閉命中檢查都報紅');
          await occluder.evaluate(e=>e.remove());
        }
        await menu(p,'build');await checkHint(p,key+' 分類開啟');await targets(p,key+' 二級');if(w===390||w===844)await snap(p,'categories-'+w);
        check(await p.locator('#body682 [data-cat]').count()===9,key+' 九個原生分類');
        await cat(p,'road');await checkHint(p,key+' 工具開啟');await targets(p,key+' 三級');
        if(w===390)await snap(p,'roads-390');
        await tap(p,'#toolsExp');check(await p.locator('body').evaluate(e=>e.classList.contains('toolsExp')),key+' 展開工具');
        const last=p.locator('#tools button.tool').last();await last.scrollIntoViewIfNeeded();await last.tap();
        check(!await visible(p,'#sheet682'),key+' 末項能選');
        const site=await road(p,key);
        if(w===390)await snap(p,'built-390');
        await menu(p,'city');await row(p,'manage');await row(p,'p06-toggle');
        check(await visible(p,'#p06-expanded'),key+' 原港區面板');await checkHint(p,key+' 港區開啟');
        if(w===390)await snap(p,'harbor-390');
        if(mode!=='smoke'){
          const original=await p.locator('#hintTxt').textContent();
          await p.locator('#hintTxt').evaluate(e=>{e.textContent='🚉 城市漸具規模！工具列「大型」分類可鋪「鐵軌＋火車站」，兩站以上會有列車自動巡迴、還能吸引遊客';});
          await p.waitForFunction(()=>parseInt(document.documentElement.style.getPropertyValue('--hint682'))===Math.ceil(document.querySelector('#hint').getBoundingClientRect().height));
          await checkHint(p,key+' 多行提示');
          check(await p.evaluate(()=>document.querySelector('#p06-panel').getBoundingClientRect().top>=document.querySelector('#hint').getBoundingClientRect().bottom),key+' 港區與多行教學不重疊');
          await p.locator('#hintTxt').evaluate((e,v)=>e.textContent=v,original);
        }
        await tap(p,'#p06-collapse');await tap(p,'#hintX');check(!await visible(p,'#hint'),key+' 關閉教學');
        if(w===390&&mode!=='smoke'){
          await menu(p,'city');await row(p,'system');await row(p,'bSave');
          const slot=p.locator('#infoBody .row').filter({hasText:/^槽3/});
          await slot.getByRole('button',{name:'存到此'}).tap();await slot.getByRole('button',{name:'讀取'}).tap();
          check(await p.evaluate(({x,y})=>!!GV.tile(x,y).road,site),'槽 3 原生存讀保留剛鋪的路');
          await menu(p,'map');await row(p,'layers');await row(p,'overview');check(await visible(p,'#mini'),'小地圖顯示');
          await menu(p,'map');await row(p,'layers');await row(p,'overview');check(!await visible(p,'#mini'),'小地圖收起');
          await menu(p,'map');await row(p,'camera');const old=await p.locator('#bRot').textContent();await row(p,'bRot');
          check(old!==await p.locator('#bRot').textContent(),'旋轉路由至原按鈕');
          await menu(p,'city');await row(p,'system');await p.keyboard.press('Escape');
          check(await p.locator(':focus').getAttribute('data-route')==='system','返回二級恢復焦點');
          await p.keyboard.press('Escape');check(await p.locator(':focus').getAttribute('data-root')==='city','關閉回一級焦點');
          await menu(p,'build');
          const outside=await p.locator('#shade682').evaluate(e=>{const r=e.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+4;return document.elementFromPoint(x,y)===e?{x,y}:null;});
          check(outside,'選單上方可點地圖區');await p.touchscreen.tap(outside.x,outside.y);check(!await visible(p,'#sheet682'),'點地圖外層收合');
          await menu(p,'build');await cat(p,'terra');const was=await p.locator('#brush682').textContent();await tap(p,'#brush682');
          check(was!==await p.locator('#brush682').textContent(),'地形筆刷');
          await p.setViewportSize({width:1024,height:768});await p.waitForFunction(()=>!document.documentElement.classList.contains('ui682'));
          check(await visible(p,'#tools')&&await visible(p,'#bStats')&&!await visible(p,'#dock682'),'切到桌面恢復控制');
          await p.setViewportSize({width:390,height:844});await p.waitForFunction(()=>document.documentElement.classList.contains('ui682'));
          check(!await visible(p,'#sheet682')&&await visible(p,'#nav682'),'切回手機無殘留彈層');
        }
        await ctx.close();console.log('OK',key);
      }
      if(mode!=='smoke'){
        for(const [w,flag] of [[1024,''],[1440,''],[390,'?noT682=1'],[390,'window'],[390,'?noT679=1'],[390,'?noT680=1']]){
          const {p,ctx}=await load(w,w===390?844:900,flag);
          check(!await visible(p,'#dock682')&&await visible(p,'#tools')&&await visible(p,'#toolcats'),w+' '+flag+' 原工具列');
          if(w===1440)await snap(p,'desktop-1440');await ctx.close();
        }
        if(oldSave){
          const fixture=JSON.parse(fs.readFileSync(oldSave,'utf8'));
          const {p,ctx}=await load(390,844,'',fixture.raw||JSON.stringify(fixture));
          const v=await p.evaluate(()=>{const prev=JSON.parse(localStorage.getItem('glimmerville.v1.s3'));GV.save();const next=JSON.parse(localStorage.getItem('glimmerville.v1.s3'));
            const fields=['n','seed','ter','rd','rl','rb','tr','zn','bl'];
            return {same:fields.every(k=>k in prev&&JSON.stringify(prev[k])===JSON.stringify(next[k])),slot:localStorage.getItem('glimmerville.v1.slot')};});
          check(v.same&&v.slot==='3','先前版本存檔讀回保留地格與槽位');await ctx.close();
        }
      }
    }
    check(pageErrors.length===0,'無瀏覽器例外');console.log('PASS',report.checks.length);
  }finally{
    report.pageErrors=pageErrors;fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2));
    await browser.close();if(server)server.close();
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
