// ── State ──
let graph={},positions={},shortestEdges=[],nodeStates={},edgeStates={};
let animSteps=[],animIndex=-1,isAnimating=false,pulsePhase=0,dashOffset=0,animFrameId=null;
const canvas=document.getElementById("canvas"),ctx=canvas.getContext("2d");

// ── Algorithm Info Descriptions ──
const algoDescriptions={
  bfs:{tag:"Unweighted",tagColor:"#00d4ff",text:"Explores nodes level by level using a queue. Guarantees the shortest path in unweighted graphs by visiting all neighbors before moving deeper.",complexity:"Time: O(V + E) · Space: O(V)"},
  dijkstra:{tag:"Weighted",tagColor:"#ffaa00",text:"Greedy algorithm that always expands the closest unvisited node. Finds optimal shortest paths for graphs with non-negative edge weights.",complexity:"Time: O(V² ) · Space: O(V)"},
  bellmanford:{tag:"Negative Weights",tagColor:"#c084fc",text:"Relaxes all edges V−1 times to handle negative weights. Slower than Dijkstra but can detect negative-weight cycles in the graph.",complexity:"Time: O(V · E) · Space: O(V)"},
  floydwarshall:{tag:"All-Pairs",tagColor:"#f472b6",text:"Computes shortest paths between every pair of nodes using dynamic programming. Useful when you need the full distance matrix at once.",complexity:"Time: O(V³) · Space: O(V²)"}
};

// ── Accent helpers ──
const algoColors={
  bfs:{accent:"#00d4ff",glow:"rgba(0,212,255,0.5)",dim:"rgba(0,212,255,0.15)"},
  dijkstra:{accent:"#ffaa00",glow:"rgba(255,170,0,0.5)",dim:"rgba(255,170,0,0.15)"},
  bellmanford:{accent:"#c084fc",glow:"rgba(192,132,252,0.5)",dim:"rgba(192,132,252,0.15)"},
  floydwarshall:{accent:"#f472b6",glow:"rgba(244,114,182,0.5)",dim:"rgba(244,114,182,0.15)"}
};
function getAlgo(){return document.querySelector('input[name="algo"]:checked').value;}
function accentColor(){return algoColors[getAlgo()].accent;}
function accentGlow(){return algoColors[getAlgo()].glow;}
function accentDim(){return algoColors[getAlgo()].dim;}

function updateAccentCSS(){
  const c=algoColors[getAlgo()];
  document.documentElement.style.setProperty('--accent',c.accent);
  document.documentElement.style.setProperty('--accent-glow',c.glow);
  document.documentElement.style.setProperty('--accent-dim',c.dim);
}
function updateAlgoInfo(){
  const info=algoDescriptions[getAlgo()];
  document.getElementById("algoInfo").innerHTML=
    `<span class="algo-info-tag" style="background:${info.tagColor}22;color:${info.tagColor};border:1px solid ${info.tagColor}44">${info.tag}</span>`+
    `<br>${info.text}<span class="complexity">${info.complexity}</span>`;
}
document.querySelectorAll('input[name="algo"]').forEach(r=>r.addEventListener('change',()=>{
  updateAccentCSS();updateAlgoInfo();drawGraph();
}));

// ── Canvas Resize ──
function resizeCanvas(){
  const c=canvas.parentElement;
  canvas.width=c.clientWidth-32;canvas.height=c.clientHeight-32;drawGraph();
}
window.addEventListener('resize',resizeCanvas);
function randomPos(){return{x:Math.random()*(canvas.width-140)+70,y:Math.random()*(canvas.height-140)+70};}

// ── Dropdowns ──
function updateDropdowns(){
  const sn=document.getElementById("startNode"),en=document.getElementById("endNode");
  sn.innerHTML="";en.innerHTML="";
  Object.keys(graph).forEach(n=>{sn.innerHTML+=`<option>${n}</option>`;en.innerHTML+=`<option>${n}</option>`;});
}

// ── Drawing ──
function drawGraph(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const accent=accentColor(),glow=accentGlow(),pathColor="#00ff88";
  let drawnEdges=new Set();
  for(let n in graph){for(let m in graph[n]){
    let eKey1=n+'-'+m,eKey2=m+'-'+n;
    if(drawnEdges.has(eKey2))continue;drawnEdges.add(eKey1);
    let p1=positions[n],p2=positions[m];if(!p1||!p2)continue;
    let isPath=shortestEdges.includes(n+m)||shortestEdges.includes(m+n);
    let estate=edgeStates[eKey1]||edgeStates[eKey2]||'default';
    ctx.save();ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);
    if(isPath||estate==='path'){ctx.strokeStyle=pathColor;ctx.lineWidth=3.5;ctx.shadowBlur=12;ctx.shadowColor=pathColor;}
    else if(estate==='exploring'){ctx.strokeStyle=accent;ctx.lineWidth=2.5;ctx.setLineDash([8,6]);ctx.lineDashOffset=dashOffset;ctx.shadowBlur=8;ctx.shadowColor=glow;}
    else{ctx.strokeStyle='#2a2d3e';ctx.lineWidth=1.5;}
    ctx.stroke();ctx.restore();
    let mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2;
    ctx.save();ctx.font='500 11px JetBrains Mono';let txt=String(graph[n][m]);let tw=ctx.measureText(txt).width;
    ctx.fillStyle='#0f1117';ctx.beginPath();ctx.roundRect(mx-tw/2-6,my-8,tw+12,16,4);ctx.fill();
    ctx.strokeStyle='#2a2d3e';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle=(isPath||estate==='path')?pathColor:'#8b90a0';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,mx,my);ctx.restore();
  }}
  for(let n in positions){
    let p=positions[n],state=nodeStates[n]||'unvisited',r=22;
    ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,r,0,2*Math.PI);
    if(state==='visiting'){let pv=Math.sin(pulsePhase)*0.4+0.6;ctx.shadowBlur=18+pv*14;ctx.shadowColor=accent;ctx.fillStyle=accent;}
    else if(state==='visited'){ctx.shadowBlur=10;ctx.shadowColor=glow;ctx.fillStyle=accentDim();}
    else if(state==='path'){ctx.shadowBlur=22;ctx.shadowColor=pathColor;ctx.fillStyle=pathColor;}
    else{ctx.fillStyle='#1c1f2e';}
    ctx.fill();
    ctx.beginPath();ctx.arc(p.x,p.y,r,0,2*Math.PI);
    if(state==='visiting'){ctx.strokeStyle=accent;ctx.lineWidth=3;}
    else if(state==='visited'){ctx.strokeStyle=accent;ctx.lineWidth=2;}
    else if(state==='path'){ctx.strokeStyle=pathColor;ctx.lineWidth=3;}
    else{ctx.strokeStyle='#3a3f52';ctx.lineWidth=1.5;}
    ctx.stroke();
    ctx.shadowBlur=0;ctx.fillStyle=(state==='unvisited')?'#8b90a0':(state==='path'?'#0f1117':'#fff');
    ctx.font='600 13px JetBrains Mono';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n,p.x,p.y);ctx.restore();
  }
}

// ── Animation Loop ──
function startAnimLoop(){if(animFrameId)return;(function loop(){pulsePhase+=0.06;dashOffset-=0.8;drawGraph();animFrameId=requestAnimationFrame(loop);})();}
function stopAnimLoop(){if(animFrameId){cancelAnimationFrame(animFrameId);animFrameId=null;}}

// ── Status Bar ──
function setStatus(msg,detail,active){
  document.getElementById("statusText").textContent=msg;
  document.getElementById("statusDetail").textContent=detail||'';
  document.querySelector(".status-dot").className='status-dot'+(active==='active'?' active':active==='done'?' done':'');
}

// ── Add Edge ──
function addEdge(){
  let a=document.getElementById("nodeA").value.trim(),b=document.getElementById("nodeB").value.trim(),w=parseInt(document.getElementById("weight").value);
  if(!a||!b||isNaN(w)){alert("Please enter valid nodes and distance");return;}
  if(!graph[a]){graph[a]={};positions[a]=randomPos();}
  if(!graph[b]){graph[b]={};positions[b]=randomPos();}
  graph[a][b]=w;graph[b][a]=w;updateDropdowns();shortestEdges=[];clearVisualState();drawGraph();
  document.getElementById("nodeA").value='';document.getElementById("nodeB").value='';document.getElementById("weight").value='';
}
function add(a,b,w){if(!graph[a]){graph[a]={};positions[a]=randomPos();}if(!graph[b]){graph[b]={};positions[b]=randomPos();}graph[a][b]=w;graph[b][a]=w;}

function loadSampleGraph(){
  resetGraph();let cx=canvas.width/2,cy=canvas.height/2;
  add("A","B",4);add("A","C",2);add("C","B",1);add("B","D",5);add("C","D",8);add("D","E",6);add("C","E",10);
  positions["A"]={x:cx-280,y:cy-60};positions["B"]={x:cx-60,y:cy-140};positions["C"]={x:cx-60,y:cy+80};
  positions["D"]={x:cx+160,y:cy-60};positions["E"]={x:cx+340,y:cy+20};
  updateDropdowns();shortestEdges=[];drawGraph();
}

function resetGraph(){
  graph={};positions={};shortestEdges=[];clearVisualState();stopAnimLoop();
  animSteps=[];animIndex=-1;isAnimating=false;updateDropdowns();drawGraph();
  document.getElementById("result").innerHTML='';
  document.getElementById("distanceTable").innerHTML='<tr><th>Node</th><th>Distance</th><th>Previous</th></tr>';
  setStatus("Idle","","");setBtnsEnabled(true);
}
function clearVisualState(){nodeStates={};edgeStates={};Object.keys(graph).forEach(n=>nodeStates[n]='unvisited');}
function setBtnsEnabled(en){document.querySelectorAll('.btn-accent').forEach(b=>b.disabled=!en);}

// ── Collect Steps: Dijkstra ──
function collectDijkstraSteps(){
  let start=document.getElementById("startNode").value,end=document.getElementById("endNode").value;
  let dist={},prev={},visited={};Object.keys(graph).forEach(n=>dist[n]=Infinity);
  if(!start||!end)return[];dist[start]=0;let steps=[];
  steps.push({type:'init',dist:{...dist},prev:{...prev},visited:{...visited},node:null,edge:null,msg:`Init: start=${start}, end=${end}`});
  while(true){
    let closest=null;for(let n in dist){if(!visited[n]&&(closest===null||dist[n]<dist[closest]))closest=n;}
    if(closest===null)break;visited[closest]=true;
    steps.push({type:'visit',dist:{...dist},prev:{...prev},visited:{...visited},node:closest,edge:null,msg:`Visit ${closest} (dist: ${dist[closest]})`});
    for(let neigh in graph[closest]){
      let nd=dist[closest]+graph[closest][neigh],relaxed=nd<dist[neigh];
      steps.push({type:'explore',dist:{...dist},prev:{...prev},visited:{...visited},node:closest,edge:[closest,neigh],relaxed,msg:`Edge ${closest}→${neigh}: ${nd} ${relaxed?'< '+(dist[neigh]===Infinity?'∞':dist[neigh])+' ✓':'>= '+dist[neigh]+' ✗'}`});
      if(relaxed){dist[neigh]=nd;prev[neigh]=closest;}
    }
  }
  steps.push({type:'done',dist:{...dist},prev:{...prev},visited:{...visited},node:null,edge:null,msg:'Dijkstra Complete!'});return steps;
}

// ── Collect Steps: BFS ──
function collectBFSSteps(){
  let start=document.getElementById("startNode").value,end=document.getElementById("endNode").value;
  if(!start||!end)return[];
  let queue=[start],visited={[start]:true},dist={[start]:0},prev={},steps=[];
  steps.push({type:'init',dist:{...dist},prev:{...prev},visited:{...visited},node:null,edge:null,msg:`Init BFS: start=${start}`,queue:[...queue]});
  while(queue.length){
    let node=queue.shift();
    steps.push({type:'visit',dist:{...dist},prev:{...prev},visited:{...visited},node,edge:null,msg:`Dequeue: ${node}`,queue:[...queue]});
    for(let neigh in graph[node]){
      if(!visited[neigh]){
        visited[neigh]=true;queue.push(neigh);dist[neigh]=dist[node]+1;prev[neigh]=node;
        steps.push({type:'explore',dist:{...dist},prev:{...prev},visited:{...visited},node,edge:[node,neigh],relaxed:true,msg:`Enqueue: ${neigh} (from ${node})`,queue:[...queue]});
      }
    }
  }
  steps.push({type:'done',dist:{...dist},prev:{...prev},visited:{...visited},node:null,edge:null,msg:'BFS Complete!',queue:[]});return steps;
}

// ── Collect Steps: Bellman-Ford ──
function collectBellmanFordSteps(){
  let start=document.getElementById("startNode").value,end=document.getElementById("endNode").value;
  if(!start||!end)return[];
  let nodes=Object.keys(graph),dist={},prev={},visited={};
  nodes.forEach(n=>dist[n]=Infinity);dist[start]=0;
  let steps=[];
  steps.push({type:'init',dist:{...dist},prev:{...prev},visited:{},node:null,edge:null,msg:`Init Bellman-Ford: start=${start}`});
  let edges=[];
  for(let u in graph)for(let v in graph[u])edges.push([u,v,graph[u][v]]);
  for(let i=0;i<nodes.length-1;i++){
    let anyRelaxed=false;
    for(let[u,v,w]of edges){
      let nd=dist[u]+w,relaxed=dist[u]!==Infinity&&nd<dist[v];
      steps.push({type:'explore',dist:{...dist},prev:{...prev},visited:{...visited},node:u,edge:[u,v],relaxed,msg:`Pass ${i+1}: ${u}→${v} cost ${nd} ${relaxed?'< '+(dist[v]===Infinity?'∞':dist[v])+' ✓ relax':'>= '+(dist[v]===Infinity?'∞':dist[v])+' ✗'}`});
      if(relaxed){dist[v]=nd;prev[v]=u;visited[v]=true;anyRelaxed=true;}
    }
    visited[start]=true;
    if(!anyRelaxed)break;
  }
  steps.push({type:'done',dist:{...dist},prev:{...prev},visited:{...visited},node:null,edge:null,msg:'Bellman-Ford Complete!'});return steps;
}

// ── Collect Steps: Floyd-Warshall ──
function collectFloydWarshallSteps(){
  let start=document.getElementById("startNode").value,end=document.getElementById("endNode").value;
  if(!start||!end)return[];
  let nodes=Object.keys(graph).sort(),n=nodes.length,idx={};
  nodes.forEach((nd,i)=>idx[nd]=i);
  let d=Array.from({length:n},()=>Array(n).fill(Infinity));
  let next=Array.from({length:n},()=>Array(n).fill(null));
  for(let i=0;i<n;i++)d[i][i]=0;
  for(let u in graph)for(let v in graph[u]){d[idx[u]][idx[v]]=graph[u][v];next[idx[u]][idx[v]]=v;}
  let steps=[],visited={},prev={},dist={};
  nodes.forEach(nd=>dist[nd]=d[idx[start]][idx[nd]]);
  steps.push({type:'init',dist:{...dist},prev:{...prev},visited:{},node:null,edge:null,msg:`Init Floyd-Warshall: ${n} nodes`});
  for(let k=0;k<n;k++){
    let kn=nodes[k];visited[kn]=true;
    steps.push({type:'visit',dist:{...dist},prev:{...prev},visited:{...visited},node:kn,edge:null,msg:`Intermediate node: ${kn}`});
    for(let i=0;i<n;i++){for(let j=0;j<n;j++){
      if(d[i][k]+d[k][j]<d[i][j]){
        d[i][j]=d[i][k]+d[k][j];next[i][j]=next[i][k];
        if(i===idx[start]){
          dist[nodes[j]]=d[i][j];
          // reconstruct prev for start->j
          let cur=idx[start],target=j;
          if(next[cur][target]!==null)prev[nodes[target]]=nodes[k]; // simplified
        }
      }
    }}
    nodes.forEach(nd=>dist[nd]=d[idx[start]][idx[nd]]);
  }
  // Rebuild accurate prev from next matrix
  prev={};
  for(let j=0;j<n;j++){
    if(j===idx[start]||d[idx[start]][j]===Infinity)continue;
    // trace path to find predecessor
    let path=[nodes[idx[start]]],ci=idx[start];
    while(ci!==j&&next[ci][j]!==null){ci=idx[next[ci][j]];path.push(nodes[ci]);}
    if(path.length>=2)prev[nodes[j]]=path[path.length-2];
  }
  nodes.forEach(nd=>dist[nd]=d[idx[start]][idx[nd]]);
  steps.push({type:'done',dist:{...dist},prev:{...prev},visited:{...visited},node:null,edge:null,msg:'Floyd-Warshall Complete!'});
  return steps;
}

// ── Run algorithms (instant, for final result) ──
function runDijkstra(){
  let start=document.getElementById("startNode").value,end=document.getElementById("endNode").value;
  let dist={},prev={},visited={};Object.keys(graph).forEach(n=>dist[n]=Infinity);
  if(!start||!end)return;dist[start]=0;
  while(true){let closest=null;for(let n in dist){if(!visited[n]&&(closest===null||dist[n]<dist[closest]))closest=n;}if(closest===null)break;visited[closest]=true;for(let neigh in graph[closest]){let nd=dist[closest]+graph[closest][neigh];if(nd<dist[neigh]){dist[neigh]=nd;prev[neigh]=closest;}}}
  showResult(dist,prev,start,end,"Dijkstra");
}
function runBFS(){
  let start=document.getElementById("startNode").value,end=document.getElementById("endNode").value;
  if(!start||!end)return;let queue=[start],visited={[start]:true},dist={[start]:0},prev={};
  while(queue.length){let node=queue.shift();for(let neigh in graph[node]){if(!visited[neigh]){visited[neigh]=true;queue.push(neigh);dist[neigh]=dist[node]+1;prev[neigh]=node;}}}
  showResult(dist,prev,start,end,"BFS");
}
function runBellmanFord(){
  let start=document.getElementById("startNode").value,end=document.getElementById("endNode").value;
  if(!start||!end)return;let nodes=Object.keys(graph),dist={},prev={};
  nodes.forEach(n=>dist[n]=Infinity);dist[start]=0;
  let edges=[];for(let u in graph)for(let v in graph[u])edges.push([u,v,graph[u][v]]);
  for(let i=0;i<nodes.length-1;i++)for(let[u,v,w]of edges){if(dist[u]!==Infinity&&dist[u]+w<dist[v]){dist[v]=dist[u]+w;prev[v]=u;}}
  showResult(dist,prev,start,end,"Bellman-Ford");
}
function runFloydWarshall(){
  let start=document.getElementById("startNode").value,end=document.getElementById("endNode").value;
  if(!start||!end)return;
  let nodes=Object.keys(graph).sort(),n=nodes.length,idx={};
  nodes.forEach((nd,i)=>idx[nd]=i);
  let d=Array.from({length:n},()=>Array(n).fill(Infinity));
  let nxt=Array.from({length:n},()=>Array(n).fill(null));
  for(let i=0;i<n;i++)d[i][i]=0;
  for(let u in graph)for(let v in graph[u]){d[idx[u]][idx[v]]=graph[u][v];nxt[idx[u]][idx[v]]=v;}
  for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++){if(d[i][k]+d[k][j]<d[i][j]){d[i][j]=d[i][k]+d[k][j];nxt[i][j]=nxt[i][k];}}
  let dist={},prev={};
  nodes.forEach(nd=>dist[nd]=d[idx[start]][idx[nd]]);
  for(let j=0;j<n;j++){
    if(j===idx[start]||d[idx[start]][j]===Infinity)continue;
    let path=[nodes[idx[start]]],ci=idx[start];
    while(ci!==j&&nxt[ci][j]!==null){ci=idx[nxt[ci][j]];path.push(nodes[ci]);}
    if(path.length>=2)prev[nodes[j]]=path[path.length-2];
  }
  showResult(dist,prev,start,end,"Floyd-Warshall");
}

// ── Update Table ──
function updateTable(dist,prev){
  let html='<tr><th>Node</th><th>Distance from Start</th><th>Reached From</th></tr>';
  for(let n in dist){let dv=dist[n]===Infinity?"∞":dist[n];let pv=prev[n]?("From "+prev[n]):(dist[n]===0?"Start Node":"—");
    html+=`<tr><td><b>${n}</b></td><td>${dv}</td><td>${pv}</td></tr>`;}
  document.getElementById("distanceTable").innerHTML=html;
}

// ── Show Result ──
function showResult(dist,prev,start,end,name){
  let path=[];let curr=end;while(curr){path.unshift(curr);curr=prev[curr];}
  shortestEdges=[];for(let i=0;i<path.length-1;i++)shortestEdges.push(path[i]+path[i+1]);
  clearVisualState();
  for(let n in dist){if(dist[n]!==Infinity&&dist[n]!==undefined)nodeStates[n]='visited';}
  path.forEach(n=>nodeStates[n]='path');
  for(let i=0;i<path.length-1;i++)edgeStates[path[i]+'-'+path[i+1]]='path';
  let resultEl=document.getElementById("result");
  if(dist[end]===undefined||dist[end]===Infinity){
    resultEl.innerHTML=`<div class="result-path"><span class="label">Result</span><br>No path found from ${start} to ${end}</div>`;
  }else{
    let unit=name==="BFS"?" hops":"";
    resultEl.innerHTML=`<div class="result-path"><span class="label">${name} Result</span><br><span style="color:var(--text-primary)">Path:</span> ${path.join(' → ')}<br><span style="color:var(--text-primary)">Cost:</span> ${dist[end]}${unit}</div>`;
  }
  updateTable(dist,prev);drawGraph();
}

// ── Get the right step collector and runner ──
function getStepCollector(){
  const a=getAlgo();
  if(a==='dijkstra')return collectDijkstraSteps;
  if(a==='bfs')return collectBFSSteps;
  if(a==='bellmanford')return collectBellmanFordSteps;
  return collectFloydWarshallSteps;
}
function getRunner(){
  const a=getAlgo();
  if(a==='dijkstra')return runDijkstra;
  if(a==='bfs')return runBFS;
  if(a==='bellmanford')return runBellmanFord;
  return runFloydWarshall;
}

// ── Animated Run ──
function runAnimated(){
  if(isAnimating)return;
  animSteps=getStepCollector()();if(!animSteps.length)return;
  isAnimating=true;animIndex=0;clearVisualState();shortestEdges=[];setBtnsEnabled(false);startAnimLoop();
  function playStep(){
    if(animIndex>=animSteps.length){stopAnimLoop();getRunner()();isAnimating=false;setBtnsEnabled(true);setStatus("Complete",`${animSteps.length} steps`,"done");drawGraph();return;}
    let s=animSteps[animIndex];applyStepVisuals(s);
    setStatus(s.msg,s.queue?`Queue: [${s.queue.join(', ')}]`:`Step ${animIndex+1}/${animSteps.length}`,'active');
    updateTable(s.dist,s.prev);animIndex++;setTimeout(playStep,420);
  }
  playStep();
}

// ── Step-by-step ──
function stepAlgorithm(){
  if(isAnimating)return;
  if(animSteps.length===0||animIndex<0){
    animSteps=getStepCollector()();if(!animSteps.length)return;
    animIndex=0;clearVisualState();shortestEdges=[];startAnimLoop();
  }
  if(animIndex>=animSteps.length){stopAnimLoop();getRunner()();setStatus("Complete",`${animSteps.length} steps`,"done");animSteps=[];animIndex=-1;drawGraph();return;}
  let s=animSteps[animIndex];applyStepVisuals(s);
  setStatus(s.msg,s.queue?`Queue: [${s.queue.join(', ')}]`:`Step ${animIndex+1}/${animSteps.length}`,'active');
  updateTable(s.dist,s.prev);animIndex++;
}

function applyStepVisuals(step){
  edgeStates={};
  for(let n in graph)nodeStates[n]=step.visited[n]?'visited':'unvisited';
  if(step.node)nodeStates[step.node]='visiting';
  if(step.edge)edgeStates[step.edge[0]+'-'+step.edge[1]]='exploring';
}

// ── Init ──
window.addEventListener('DOMContentLoaded',()=>{updateAccentCSS();updateAlgoInfo();resizeCanvas();setStatus("Idle — add edges or load sample graph","","");});
