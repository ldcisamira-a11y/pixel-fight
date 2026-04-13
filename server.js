const WebSocket = require('ws');

const PORT = process.env.PORT || 5000;
const wss = new WebSocket.Server({ port: PORT });

let players = {};

const platforms = [
  {x:0,y:360,w:800,h:40},
  {x:150,y:280,w:120,h:10},
  {x:400,y:220,w:120,h:10},
  {x:600,y:300,w:120,h:10}
];

function spawnAI(){
  const id = "AI_" + Date.now();
  players[id] = {
    x:200,y:0,vx:0,vy:0,hp:100,score:0,name:"AI",isAI:true
  };
}
spawnAI();

wss.on('connection', (ws) => {
  const id = Date.now();

  players[id] = {
    x:100,y:0,vx:0,vy:0,hp:100,score:0,name:"玩家"+id
  };

  ws.on('message', (msg) => {
    const data = JSON.parse(msg);
    let p = players[id];
    if(!p) return;

    if(data.name) p.name=data.name;

    if(data.left) p.vx=-5;
    else if(data.right) p.vx=5;
    else p.vx=0;

    if(data.jump && p.onGround) p.vy=-10;

    if(data.skill){
      for(let pid in players){
        if(pid!=id){
          let e=players[pid];
          if(Math.abs(p.x-e.x)<120) e.hp-=10;
        }
      }
    }

    for(let pid in players){
      if(pid!=id){
        let e=players[pid];
        if(Math.abs(p.x-e.x)<50 && Math.abs(p.y-e.y)<50 && data.attack){
          e.hp-=3;
          if(e.hp<=0){
            e.hp=100;
            e.x=100;
            e.y=0;
            p.score++;
          }
        }
      }
    }
  });

  ws.on('close', ()=> delete players[id]);
});

function physics(p){
  p.vy+=0.5;
  p.x+=p.vx;
  p.y+=p.vy;

  p.onGround=false;

  for(let plat of platforms){
    if(p.x+30>plat.x && p.x<plat.x+plat.w &&
       p.y+50>plat.y && p.y+50<plat.y+plat.h && p.vy>=0){
      p.y=plat.y-50;
      p.vy=0;
      p.onGround=true;
    }
  }
}

setInterval(()=>{
  for(let id in players){
    let p=players[id];

    if(p.isAI){
      p.vx=Math.random()>0.5?2:-2;
      if(Math.random()>0.98 && p.onGround) p.vy=-10;

      for(let pid in players){
        if(pid!=id){
          let e=players[pid];
          if(Math.abs(p.x-e.x)<50) e.hp-=1;
        }
      }
    }

    physics(p);
  }
},16);

function getLeaderboard(){
  return Object.values(players)
    .map(p=>({name:p.name||"玩家",score:p.score}))
    .sort((a,b)=>b.score-a.score)
    .slice(0,5);
}

setInterval(()=>{
  const state = JSON.stringify({
    players,
    leaderboard:getLeaderboard(),
    platforms
  });
  wss.clients.forEach(c=>c.send(state));
},1000/60);

console.log("服务器运行端口:", PORT);