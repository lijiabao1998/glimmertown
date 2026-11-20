'use strict';
// 小圖使用遊戲原函式。期望值來自手列的軌形、對稱性、四分之一圓方程與實際車輛的連續軌跡。
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../../index.html'),'utf8');
const functions=['railOption707','t681On','t706On','t707On','railDirs706','railDirs','parallelRung707','spawnDir706',
  'listBldK','streetHash','stationSides707','slipJunction707','branch707','canDepart707','releaseHold707','dir707','trailFill707',
  'trainPath707','trainCar707','pathPoint707','tramTrail707','tramPath707','tramPorts707','reverse707','occupancy707','hold707',
  'stationNear707','speed707','arrive707','updTrains','updTrams','trackSection681','routePose681','railPaths681',
  'warningBlocks681','crossingAxis681','trackMask681','crossingLimit681'];
function original(text,name){
  const start=text.indexOf('\nfunction '+name+'(');assert(start>=0,name);
  let i=text.indexOf('{',start),depth=0;
  do{if(text[i]==='{')depth++;else if(text[i]==='}')depth--;i++;}while(depth&&i<text.length);
  return text.slice(start+1,i);
}
function scene(text){
  const N=24,tiles=Array.from({length:N*N},()=>({t:2,rail:0,tram:0,bld:null})),idx=(x,y)=>x+y*N;
  const c={N,tiles,idx,T:i=>tiles[i],inMap:(x,y)=>x>=0&&y>=0&&x<N&&y<N,window:{},location:{search:''},
    DIRV:[[0,-1],[1,0],[0,1],[-1,0]],trains:[],tramCars:[],vri:()=>0,lotPorts574:()=>null,actualLot574:()=>1};
  vm.createContext(c);
  vm.runInContext(text.match(/^const SP707=[^\n]+/m)[0]+'\n'+functions.map(n=>original(text,n)).join('\n'),c);
  c.put=(x,y,key='rail')=>{tiles[idx(x,y)][key]=1;};
  c.station=(x,y,k)=>{tiles[idx(x,y)].bld={k};};
  c.mask=(x,y,key='rail')=>Array.from(c.railDirs706(x,y,key)).reduce((m,d)=>m|1<<d,0);
  return c;
}
const close=(a,b)=>Math.abs(a-b)<1e-8;
function check(text){
  for(const key of ['rail','tram'])for(const vertical of [false,true]){
    const c=scene(text),xy=(u,v)=>vertical?[v,u]:[u,v];
    const put=(u,v)=>c.put(...xy(u,v),key),mask=(u,v)=>c.mask(...xy(u,v),key);
    const track=vertical?5:10,cross=vertical?10:5;
    for(let u=1;u<=9;u++)for(const v of [0,1])put(u,v);
    for(let u=1;u<=9;u++)for(const v of [0,1])assert.equal(mask(u,v)&cross,0,'並排線不橫連');
    assert.equal(mask(4,0),track,'中段可沿線走');
    put(5,2);assert(mask(5,0)&cross,'明確外接支線能換線');assert.equal(mask(5,1),15,'交叉接到四邊');
    assert(c.slipJunction707(...xy(5,1),key),'雙線橫渡可轉轍');
    c.station(22,20,key==='rail'?17:21);c.station(22,22,key==='rail'?17:21);c.vri=n=>n-1;
    const fleet=key==='rail'?c.trains:c.tramCars,update=key==='rail'?c.updTrains:c.updTrams;
    for(const start of [0,1]){
      let traversed=false;
      for(let phase=0;phase<6&&!traversed;phase++){
        const [x,y]=xy(4,start),car={x,y,d:vertical?2:1,p:.97,switchPass:phase};fleet.splice(0,fleet.length,car);
        for(let step=0;step<140;step++){
          update(1/30);
          const [u,v]=vertical?[car.y,car.x]:[car.x,car.y];
          if(v<0||v>1||u<3||u>7)break;
          if(v===1-start&&u!==5){traversed=true;break;}
        }
      }
      assert(traversed,'列車從一股確實經道岔駛入另一股');
    }
    const [rx,ry]=xy(5,2);c.T(c.idx(rx,ry))[key]=0;assert.equal(mask(5,1),track,'拆除支線恢復雙線');
    const [mx,my]=xy(4,2);c.put(mx,my,key==='tram'?'rail':'tram');assert.equal(mask(4,1),track,'軌別分流');
    for(let y=0;y<4;y++)for(let x=0;x<12;x++)for(const d of c.railDirs706(x,y,key)){
      const [ex,ey]=c.DIRV[d];assert(c.mask(x+ex,y+ey,key)&(1<<((d+2)&3)),'雙向接通');
    }
    const [px,py]=xy(3,1);c.station(...xy(3,2),key==='tram'?21:17);
    assert(c.stationSides707(px,py,key)>0,'同類站體有月台');assert.equal(c.stationSides707(px,py,key==='tram'?'rail':'tram'),0);
  }
  const c=scene(text),r=.40;
  for(let x=5;x<14;x++)c.put(x,7);
  Object.assign(c.T(c.idx(10,7)),{road:1,mask:5});
  c.trains.push({x:9,y:7,d:1,p:.3,trail:[[8,7],[7,7]]});
  assert.equal(c.crossingLimit681(10,6,10,7,.32,.60),.40,'平交道車輛停在線前');
  assert.equal(c.crossingLimit681(10,6,10,7,.8,.92),.92,'路口內車輛放行');
  c.trains[0]={x:12,y:7,d:1,p:.1,trail:[[11,7],[10,7]]};
  assert.equal(c.crossingLimit681(10,6,10,7,.40,.51),.40,'車尾仍占平交道');
  c.trains.length=0;assert.equal(c.crossingLimit681(10,6,10,7,.40,.51),.51,'列車離開即放行');
  for(const enter of [0,1,2,3])for(const turn of [-1,1]){
    const exit=(enter+turn+4)%4,a=c.DIRV[enter],b=c.DIRV[exit];
    for(const t of [-.4,-.3,-.1,0,.2,.35,.4]){
      const p=c.trackSection681(enter,exit,t);
      assert(close(Math.hypot(p.x+r*a[0]-r*b[0],p.y+r*a[1]-r*b[1]),r),'彎道圓心半徑');
      assert(close(Math.hypot(p.vx,p.vy),1),'切線長度');
      if(t===0)assert(close(p.vx,(a[0]+b[0])*Math.SQRT1_2)&&close(p.vy,(a[1]+b[1])*Math.SQRT1_2),'彎道中點的切線平分轉角');
    }
    const car={x:10,y:10,d:exit,p:.16},before=[10-a[0],10-a[1]],older=[10-2*a[0],10-2*a[1]];
    const q=c.routePose681(car,0,[before,older],'rail'),p=c.trackSection681(enter,exit,.16);
    assert(close(q.fx,10+p.x)&&close(q.fy,10+p.y),'車頭落在實際圓弧');
  }
  for(let m=0;m<16;m++){
    const paths=c.railPaths681(m),edges=new Set();
    for(const [a,b,lo,hi] of paths){if(lo===-.5)edges.add((a+2)&3);if(hi===.5)edges.add(b);}
    assert.equal([...edges].reduce((v,d)=>v|1<<d,0),m,'每個格邊有相接鋼軌');
    if(m===15)assert(paths.every(([a,b])=>a===b),'十字正交直通');
  }
  assert.equal(c.railPaths681(15,true).length,6,'橫渡交叉畫出四條彎軌及兩條直軌');
  {const d=scene(text);for(let a=4;a<13;a++){d.put(8,a);d.put(a,8);}
    assert.equal(d.slipJunction707(8,8,'rail'),false);
    assert.equal(d.branch707({switchPass:2},[0,1,2],1,8,8,'rail'),1,'普通菱形只可直行');}
  for(const key of ['rail','tram']){
    const c=scene(text),tram=key==='tram',fleet=tram?c.tramCars:c.trains,update=tram?c.updTrams:c.updTrains;
    for(let x=2;x<=17;x++)c.put(x,6,key);
    c.station(8,5,tram?21:17);c.station(22,21,tram?21:17);
    c.vri=n=>n-1;const car={x:4,y:6,d:1,p:0};fleet.push(car);
    let dwell=0,flips=0,previous=false;const dt=1/30;
    for(let n=0;n<1800;n++){
      update(dt);assert(fleet.includes(car),'正常服務保有原車');
      if(car.x===8&&car.wait>0)dwell+=dt;
      if(!!car.flip!==previous){flips++;previous=!!car.flip;}
    }
    assert(flips>=1,'線尾推拉');assert(dwell>=1.4,'停站等待');
    for(let n=0;n<1800&&!car.rev707;n++)update(dt);assert(car.rev707,'到達線尾');
    c.window[tram?'__noT681':'__noT707']=true;
    for(let n=0;n<75;n++)update(dt);
    assert(fleet.includes(car)&&c.T(c.idx(car.x,car.y))[key],'關閉時保有同一列車');
  }
  // 隔離既有站點避免生成第三列，量兩輛車的最近一節。四條格線交會時要守住同一個閉塞區。
  {const c=scene(text);for(let x=1;x<22;x++)c.put(x,8,'tram');for(let i=0;i<2;i++)c.station(22,20+i,21);
    const east={x:3,y:8,d:1,p:0},west={x:17,y:8,d:3,p:0};c.tramCars.push(east,west);
    let min=99,blocked=false;
    for(let n=0;n<900;n++){c.updTrams(1/30);const pos=t=>[0,.52].map(back=>c.routePose681(t,back,t.trail||c.tramTrail707(t),'tram').fx);
      min=Math.min(min,Math.min(...pos(west))-Math.max(...pos(east)));blocked||=east.blk707>0||west.blk707>0;}
    assert(min>.80&&blocked,'兩列輕軌對向等待');
  }
}
check(source);
for(const [old,replacement,error] of [
  ['ds.filter(d=>!parallelRung707(x,y,d,key))','ds',/並排線/],
  ['choices.length===3&&!slipJunction707(x,y,key)','choices.length===3',/確實經道岔/],
  ['angle=(t+r)*Math.PI/(4*r)','angle=Math.PI*t',/彎道中點的切線/],
  ['if(c.rev707)c.d=(c.d+2)&3;','if(false)c.d=(c.d+2)&3;',/關閉時保有同一列車/],
  ['===axis&&warningBlocks681','===axis&&false&&warningBlocks681',/平交道車輛停在線前/],
]){
  assert(source.includes(old),old);
  assert.throws(()=>check(source.replace(old,replacement)),error);
}
console.log('T681 OK — 雙線、道岔、格邊、真弧、停站、閉塞及運行中切換');
