'use strict';
// Playwright + 本機 Chrome。用獨立 origin、槽 3 和遊戲的建造入口；只把造境橋注入測試回應。
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const [root,out,tag='after']=process.argv.slice(2);
if(!root||!out)throw Error('node browser.cjs <遊戲資料夾> <輸出資料夾> [before|after]');
function fixture(){
  window.railQA={
    setup(){
      GV.setMapSize(48);GV.newWorldSeeded(681);GV.ai(false);GV.setSpeed(0);running=false;speed=0;money=1e9;
      for(const ar of [cars,trains,tramCars,cargoShips,citizens,smokes,rain,buses,rbuses,lifeShips,fxParts,confetti])ar.length=0;
      for(const t of tiles)Object.assign(t,{t:2,tree:0,gv:0,road:0,rc:0,mask:0,bridge:0,zone:0,bld:null,deco:0,rail:0,tram:0,dock:0,el:0});
      tool='pan';selTile=null;hover.x=hover.y=-1;quality=1;weather=0;rainDays=0;shakeT=0;
      for(let x=20;x<=22;x++)for(let y=9;y<=18;y++)T(idx(x,y)).t=0;
      const line=(k,x,y,ex,ey)=>{for(;;){GV.place(k,x,y);if(x===ex&&y===ey)break;x+=Math.sign(ex-x);y+=Math.sign(ey-y);}};
      line('rail',9,14,27,14);line('rail',9,15,24,15);line('rail',27,14,27,19);line('rail',27,19,23,19);
      line('rail',17,12,17,14);
      line('road',18,11,18,18);
      line('tram',9,20,18,20);line('tram',18,20,18,26);line('tram',18,26,23,26);
      for(const [kind,x,y] of [['station',11,11],['tramStation',13,18]]){
        if(!GV.place(kind,x,y))throw Error(kind+' '+canPlace(kind,x,y));}
      for(const t of tiles)if(t.bld&&!t.bld.ref)Object.assign(t.bld,{age:60,pw:true,wa:true});
      recalcAllMasks();recalcAllRailMasks();computeFoam();computePower();computeWater();rebuildCov();groundDirty=true;
      trains.length=0;tramCars.length=0;
      trains.push({x:27,y:14,d:2,p:.18,pt:0,trail:[[26,14],[25,14],[24,14]]},{x:17,y:15,d:1,p:.56,pt:1,trail:[[16,15],[15,15]]});
      tramCars.push({x:18,y:20,d:2,p:.16,trail:[[17,20],[16,20]],tram681:true});
      return {rails:tiles.filter(t=>t.rail).length,trams:tiles.filter(t=>t.tram).length,
        crossings:tiles.filter(t=>t.road&&t.rail).length,bridges:tiles.filter(t=>t.railBridge).length};
    },
    shot({cx,cy,z,rot,sea,night}){
      GV.setRot(rot);GV.setSeason(sea);GV.setZoom(z);GV.lookAt(cx,cy);visT=night?5:55;trafClock=12;waterT=waterF=0;
      groundDirty=true;ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';draw(0);
      const c=document.createElement('canvas');c.width=Math.min(780,cvs.width);c.height=Math.min(440,cvs.height);
      c.getContext('2d').drawImage(cvs,Math.round((cvs.width-c.width)/2),Math.round((cvs.height-c.height)/2),c.width,c.height,0,0,c.width,c.height);
      return c.toDataURL('image/png').split(',')[1];
    },
    edit(){
      const mask=()=>railDirs706(17,15,'rail').reduce((m,d)=>m|1<<d,0);
      const linked=mask();openUndo();GV.place('doze',17,13);closeUndo();const removed=mask();GV.undo();const restored=mask();
      GV.save();GV.load();const loaded=mask();
      return {linked,removed,restored,loaded,slot:localStorage.getItem('glimmerville.v1.slot')};
    },
    toggle(disabled){window.__noT681=disabled;},
    canvasWidth(){return cvs.width;},
    crossing(){
      const start=idx(18,16),finish=idx(18,11);
      GV.place('bus',18,16);GV.place('bus',18,11);busRoutes[0].stops=[start,finish];
      const car={x:18,y:16,d:0,p:.38,spd:1};
      const trip={x:18,y:16,d:0,p:.38,wait:0,pi:0,path:[[18,16],[18,15],[18,14],[18,13],[18,12],[18,11]]};
      const bus={...trip,stop:finish},scheduled={...trip,r:0,si:0,dir:1,nsi:1};
      cars.splice(0,cars.length,car);buses.splice(0,buses.length,bus);rbuses.splice(0,rbuses.length,scheduled);
      const advance=()=>{for(let i=0;i<5;i++){updCars(1/30);updBuses(1/30);updRouteBuses(1/30);}return [car.p,bus.p,scheduled.p];};
      const held=advance();trains.length=0;const released=advance();
      return {held,released};
    },
    sample(){
      return typeof t681On==='function'?{on:t681On(),platform:stationSides707(11,14,'rail'),signals:crossingTiles681.length}:null;
    }
  };
}
async function main(){
  fs.mkdirSync(out,{recursive:true});
  const source=fs.readFileSync(path.join(root,'index.html'),'utf8').replace('window.GV={',()=> '('+fixture.toString()+')();window.GV={');
  const server=http.createServer((req,res)=>{
    const u=new URL(req.url,'http://localhost');
    if(u.pathname==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');return res.end(source);}
    const name=path.basename(u.pathname);
    if(/^[a-zA-Z0-9.-]+$/.test(name)&&fs.existsSync(path.join(root,name))){
      res.setHeader('Content-Type',name.endsWith('.png')?'image/png':'application/json');return res.end(fs.readFileSync(path.join(root,name)));}
    res.writeHead(204);res.end();
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
    const context=await browser.newContext({viewport:{width:1200,height:760},deviceScaleFactor:1,serviceWorkers:'block'});
    await context.addInitScript(()=>{localStorage.setItem('glimmerville.v1.slot','3');localStorage.setItem('glimmerville.v1.snd','0');
      let s=681;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const origin='http://127.0.0.1:'+server.address().port;
    await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
    await page.goto(origin+(tag==='url-off'?'/?noT681=1':'/'));
    await page.waitForFunction(()=>window.GV&&window.__boot426&&__boot426().ready,null,{timeout:120000});
    await page.locator('#bNewGame').click();
    await page.waitForFunction(()=>getComputedStyle(document.getElementById('start')).display==='none');
    const setup=await page.evaluate(()=>railQA.setup());assert(setup.rails>=30&&setup.trams>=15&&setup.crossings>=2&&setup.bridges>=6);
    const overview={cx:18,cy:16,z:1.4,rot:0,sea:1,night:false};
    const saveShot=async(label,cfg)=>fs.writeFileSync(path.join(out,tag+'-'+label+'.png'),Buffer.from(await page.evaluate(c=>railQA.shot(c),cfg),'base64'));
    await saveShot('overview',overview);
    const state=await page.evaluate(()=>railQA.sample());
    if(tag==='after'){assert(state.on,'預設啟用');assert(state.signals>=2,'有路軌平交設施');assert(state.platform,'站旁月台');}
    for(let rot=0;rot<4;rot++)for(const night of [false,true]){
      const cfg={...overview,rot,sea:rot,night,z:2.1,cx:23,cy:15};
      await saveShot('rail-r'+rot+(night?'-night':'-day'),cfg);
    }
    await saveShot('tram',{...overview,cx:16,cy:20,z:2.25});
    await saveShot('turnout',{...overview,cx:17,cy:14,z:2.1});
    await saveShot('distant',{...overview,sea:3,z:.65});
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>railQA.canvasWidth()===390);
    await saveShot('mobile',{...overview,cx:18,cy:14,z:1.6});
    await page.screenshot({path:path.join(out,tag+'-mobile-ui.png')});
    await page.setViewportSize({width:1200,height:760});
    await page.waitForFunction(()=>railQA.canvasWidth()>=780);
    await page.evaluate(()=>railQA.toggle(true));await saveShot('runtime-off',overview);
    await page.evaluate(()=>railQA.toggle(false));
    let crossing;
    if(tag==='after'){
      crossing=await page.evaluate(()=>railQA.crossing());
      assert.deepEqual(crossing.held,[.40,.40,.40],'汽車、公車、路線公車停在平交道前');
      assert(crossing.released.every(p=>p>.40),'柵欄開啟後三種車輛都繼續行駛');
    }
    const edit=await page.evaluate(()=>railQA.edit());
    if(tag==='after'){assert.notEqual(edit.linked,edit.removed,'拆除道岔');assert.equal(edit.linked,edit.restored,'復原道岔');assert.equal(edit.restored,edit.loaded,'存檔重載道岔');}
    assert.equal(edit.slot,'3');assert.deepEqual(errors,[]);
    console.log(JSON.stringify({title:await page.title(),setup,state,edit,crossing,errors},null,2));
  }finally{if(browser)await browser.close();server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
