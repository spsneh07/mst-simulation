import React, { useEffect, useRef, useState, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';

const initEdges = [
  { id:'AB', src:'A', tgt:'B', w:4 },
  { id:'AC', src:'A', tgt:'C', w:2 },
  { id:'BC', src:'B', tgt:'C', w:3 },
  { id:'BD', src:'B', tgt:'D', w:5 },
  { id:'CD', src:'C', tgt:'D', w:6 },
  { id:'CE', src:'C', tgt:'E', w:1 },
  { id:'DE', src:'D', tgt:'E', w:7 },
  { id:'EF', src:'E', tgt:'F', w:5 },
];
const initNodes = ['A','B','C','D','E','F'];
const PRESET_POS = { A:{x:100,y:150}, B:{x:280,y:60}, C:{x:230,y:240}, D:{x:400,y:160}, E:{x:370,y:300}, F:{x:520,y:300} };
const SPEEDS = { slow:1200, med:600, fast:200 };

function makeParent(nodes) { const p={}; nodes.forEach(x=>p[x]=x); return p; }
function find(p,x){ return p[x]===x?x:(p[x]=find(p,p[x])); }
function union(p,a,b){ p[find(p,a)]=find(p,b); }

function kruskal(nodes, edges) {
  const sorted=[...edges].sort((a,b)=>a.w-b.w);
  const parent=makeParent(nodes);
  const steps=[];
  steps.push({ edge:null, action:'info', info:'sortEdges() complete', state:{ parent:{...parent} }, line:2, w:0 });
  
  for (const e of sorted) {
    const pu = find(parent, e.src);
    const pv = find(parent, e.tgt);
    if (pu !== pv) {
      union(parent, e.src, e.tgt);
      steps.push({ 
        edge:e.id, action:'accept', 
        info:`find(${e.src})=${pu}, find(${e.tgt})=${pv} → different\nunion(${e.src}, ${e.tgt}) → edge added`, 
        state:{ parent:{...parent} }, line:5, w:e.w 
      });
    } else {
      steps.push({ 
        edge:e.id, action:'reject', 
        info:`find(${e.src})=${pu}, find(${e.tgt})=${pv} → same\ncycle detected, skipping edge`, 
        state:{ parent:{...parent} }, line:4, w:0 
      });
    }
  }
  return steps;
}

function prim(nodes, edges) {
  if (!nodes.length) return [];
  const visited=new Set([nodes[0]]);
  const steps=[];
  steps.push({ 
    edge:null, action:'info', 
    info:`pq.push({0, ${nodes[0]}})`, 
    state:{ visited:Array.from(visited) }, line:2, w:0 
  });
  
  while (visited.size<nodes.length) {
    let best=null;
    for (const e of edges) {
      const inA=visited.has(e.src), inB=visited.has(e.tgt);
      if ((inA&&!inB)||(!inA&&inB)) { if (!best||e.w<best.w) best=e; }
    }
    if (!best) break;
    const newNode=visited.has(best.src)?best.tgt:best.src;
    visited.add(newNode);
    steps.push({ 
      edge:best.id, action:'accept', 
      info:`Select min edge (${best.src}–${best.tgt}, ${best.w})\nAdd ${newNode} to MST\nUpdate adjacent edges`, 
      state:{ visited:Array.from(visited) }, line:6, w:best.w 
    });
  }
  return steps;
}

const stylesheet = [
  { selector:'node', style:{ label:'data(id)', 'background-color':'#1e293b', color:'#f1f5f9', 'text-valign':'center', 'font-size':13, 'font-weight':'bold', width:36, height:36, 'border-width':2, 'border-color':'#475569' } },
  { selector:'edge', style:{ label:'data(label)', width:2, 'line-color':'#475569', 'font-size':11, color:'#94a3b8', 'text-background-color':'#080f1e', 'text-background-opacity':1, 'text-background-padding':'2px', 'curve-style':'bezier' } },
  { selector:'.accepted', style:{ 'line-color':'#22c55e', width:4, color:'#22c55e' } },
  { selector:'.rejected', style:{ 'line-color':'#ef4444', width:3, 'line-style':'dashed', color:'#ef4444' } },
  { selector:'.current', style:{ 'line-color':'#eab308', width:4, color:'#eab308' } },
  { selector:'.mst-node', style:{ 'background-color':'#16a34a', 'border-color':'#22c55e' } },
  { selector:'.sel-edge', style:{ 'line-color':'#3b82f6', width:4, color:'#3b82f6' } },
];

const S = (extra={}) => ({ padding:'6px 13px', background:'#1e293b', color:'#f1f5f9', border:'1px solid #334155', borderRadius:5, cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:'bold', ...extra });
const INP = (w='44px') => ({ style:{ width:w, padding:'3px 5px', background:'#0f172a', border:'1px solid #334155', color:'#f1f5f9', borderRadius:3, fontFamily:'inherit', fontSize:11 } });

const KRUSKAL_LINES = [
  "// C Simulation (Kruskal)",
  "void kruskal() {",
  "  sortEdges();",
  "  for(int i=0; i<E; i++) {",
  "    if(find(u) != find(v))",
  "      union_set(u, v);",
  "  }",
  "}"
];

const PRIM_LINES = [
  "// C++ Simulation (Prim)",
  "void prim() {",
  "  pq.push({0, start});",
  "  while(!pq.empty()) {",
  "    auto [w, u] = pq.top(); pq.pop();",
  "    if(!visited[u]) continue;",
  "    visit(u);",
  "  }",
  "}"
];

export default function App() {
  const cyRef=useRef(null), timerRef=useRef(null), logEndRef=useRef(null);
  const [nodes,setNodes]=useState(initNodes);
  const [edges,setEdges]=useState(initEdges);
  const [elements,setElements]=useState([]);
  const [steps,setSteps]=useState([]);
  const [stepIdx,setStepIdx]=useState(-1);
  const [algo,setAlgo]=useState('');
  const [compareMode,setCompareMode]=useState(false);
  const [kSteps,setKSteps]=useState([]);
  const [pSteps,setPSteps]=useState([]);
  const [playing,setPlaying]=useState(false);
  const [speed,setSpeed]=useState('med');
  const [showWhy,setShowWhy]=useState(true);
  const [log,setLog]=useState([]);
  const [runCost,setRunCost]=useState(0);
  const [mstEdges,setMstEdges]=useState([]);
  const [newEdge,setNewEdge]=useState({ src:'', tgt:'', w:'' });
  const [edgeErr,setEdgeErr]=useState('');
  const [editingEdge,setEditingEdge]=useState(null);
  const [editVal,setEditVal]=useState({});
  const [selEdgeInfo,setSelEdgeInfo]=useState(null);
  const [curState,setCurState]=useState(null);
  const [curLine,setCurLine]=useState(-1);

  useEffect(()=>{
    const nodeSet=new Set(nodes);
    edges.forEach(e=>{ nodeSet.add(e.src); nodeSet.add(e.tgt); });
    const els=[
      ...[...nodeSet].map(id=>({ data:{ id }, position: PRESET_POS[id]||{ x:200+Math.random()*200, y:150+Math.random()*150 } })),
      ...edges.map(e=>({ data:{ id:e.id, source:e.src, target:e.tgt, label:`${e.w}` } })),
    ];
    setElements(els);
  },[nodes,edges]);

  useEffect(()=>{
    if (!cyRef.current) return;
    const cy=cyRef.current;
    cy.removeListener('tap');
    cy.on('tap','edge',evt=>{
      cy.edges().removeClass('sel-edge');
      evt.target.addClass('sel-edge');
      setSelEdgeInfo(`${evt.target.data('source')} – ${evt.target.data('target')}  |  weight: ${evt.target.data('label')}`);
    });
    cy.on('tap',evt=>{ if(evt.target===cy){ cy.edges().removeClass('sel-edge'); setSelEdgeInfo(null); } });
  },[elements]);

  const resetSim=useCallback(()=>{
    clearInterval(timerRef.current);
    if(cyRef.current) cyRef.current.elements().removeClass('accepted rejected current mst-node sel-edge');
    setSteps([]); setStepIdx(-1); setAlgo(''); setPlaying(false);
    setLog([]); setRunCost(0); setMstEdges([]); setSelEdgeInfo(null);
    setKSteps([]); setPSteps([]); setCurState(null); setCurLine(-1);
  },[]);

  const applyStep=useCallback((cy,step,mst,cost)=>{
    cy.elements().removeClass('current');
    if (step.edge) {
      const edge=cy.getElementById(step.edge);
      if (step.action!=='info') edge.addClass(step.action==='accept'?'accepted':'rejected');
    }
    const newMst=step.action==='accept'?[...mst,step.edge]:mst;
    const newCost=cost+(step.action==='accept'?step.w:0);
    if(step.action==='accept' && step.edge){
      const e=edges.find(e=>e.id===step.edge);
      if(e){ cy.getElementById(e.src).addClass('mst-node'); cy.getElementById(e.tgt).addClass('mst-node'); }
    }
    return {newMst,newCost};
  },[edges]);

  const doStep=useCallback((idx,stepsArr,mst,cost)=>{
    if(!cyRef.current||idx>=stepsArr.length){ setPlaying(false); return; }
    const step=stepsArr[idx];
    if (step.edge) cy_highlight(step.edge);
    else if (cyRef.current) cyRef.current.elements().removeClass('current');
    
    setTimeout(()=>{
      if(!cyRef.current) return;
      const {newMst,newCost}=applyStep(cyRef.current,step,mst,cost);
      setStepIdx(idx); setMstEdges(newMst); setRunCost(newCost);
      setCurState(step.state); setCurLine(step.line);
      const outputLines = step.info.split('\n');
      outputLines.forEach((l, i) => {
        setLog(prev=>[...prev, showWhy?`${l}`:`${step.action==='accept'?'✓':'✗'} ${step.edge} (w=${step.w})`]);
      });
    },80);
  },[applyStep,showWhy]);

  function cy_highlight(edgeId){
    if(!cyRef.current) return;
    cyRef.current.elements().removeClass('current');
    cyRef.current.getElementById(edgeId).addClass('current');
  }

  const stepOnce=useCallback(()=>{
    if(!steps.length||stepIdx>=steps.length-1) return;
    const ni=stepIdx+1;
    doStep(ni,steps,mstEdges,runCost);
  },[steps,stepIdx,mstEdges,runCost,doStep]);

  const stepsRef=useRef(steps);
  const mstRef=useRef(mstEdges);
  const costRef=useRef(runCost);
  const idxRef=useRef(stepIdx);
  useEffect(()=>{ stepsRef.current=steps; },[steps]);
  useEffect(()=>{ mstRef.current=mstEdges; },[mstEdges]);
  useEffect(()=>{ costRef.current=runCost; },[runCost]);
  useEffect(()=>{ idxRef.current=stepIdx; },[stepIdx]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [log]);

  useEffect(()=>{
    if(!playing) return;
    timerRef.current=setInterval(()=>{
      const ni=idxRef.current+1;
      if(ni>=stepsRef.current.length){ setPlaying(false); clearInterval(timerRef.current); return; }
      doStep(ni,stepsRef.current,mstRef.current,costRef.current);
    },SPEEDS[speed]);
    return ()=>clearInterval(timerRef.current);
  },[playing,speed,doStep]);

  const runAlgo=useCallback((type)=>{
    resetSim();
    setTimeout(()=>{
      if(compareMode){
        const ks=kruskal(nodes,edges), ps=prim(nodes,edges);
        setKSteps(ks); setPSteps(ps); setAlgo('compare');
        setLog([`Kruskal: ${ks.length} steps | Prim: ${ps.length} steps`]);
        return;
      }
      const s=type==='kruskal'?kruskal(nodes,edges):prim(nodes,edges);
      setSteps(s); setAlgo(type);
      setCurState(null); setCurLine(-1);
      setLog([`[${type==='kruskal'?"C Simulation":"C++ Simulation"}] Started — ${s.length} steps queued`]);
    },30);
  },[resetSim,compareMode,nodes,edges]);

  const deleteEdge=id=>{ setEdges(prev=>prev.filter(e=>e.id!==id)); resetSim(); };

  const saveEdit=id=>{
    const w=parseInt(editVal.w);
    const s=editVal.src.toUpperCase(), t=editVal.tgt.toUpperCase();
    if(!s||!t||isNaN(w)||s===t) return;
    setEdges(prev=>prev.map(e=>e.id===id?{ id:`${s}${t}`,src:s,tgt:t,w }:e));
    setEditingEdge(null); resetSim();
  };

  const addEdge=()=>{
    setEdgeErr('');
    const w=parseInt(newEdge.w);
    const s=newEdge.src.toUpperCase(), t=newEdge.tgt.toUpperCase();
    if(!s||!t||isNaN(w)||w<=0) return setEdgeErr('Invalid input');
    if(s===t) return setEdgeErr('No self-loops');
    if(edges.find(e=>(e.src===s&&e.tgt===t)||(e.src===t&&e.tgt===s))) return setEdgeErr('Already exists');
    if(!nodes.includes(s)) setNodes(prev=>[...prev,s]);
    if(!nodes.includes(t)) setNodes(prev=>[...prev,t]);
    setEdges(prev=>[...prev,{ id:`${s}${t}`,src:s,tgt:t,w }]);
    setNewEdge({ src:'',tgt:'',w:'' }); resetSim();
  };

  const done=steps.length&&stepIdx===steps.length-1;

  const codeSnippetLines = algo === 'kruskal' ? KRUSKAL_LINES : PRIM_LINES;

  return (
    <div style={{ height:'100vh', background:'#0f172a', color:'#f1f5f9', fontFamily:"'JetBrains Mono',monospace", display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'8px 16px', borderBottom:'1px solid #1e293b', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
        <span style={{ fontSize:14, fontWeight:'bold', letterSpacing:1 }}>MST Visualizer</span>
        <span style={{ fontSize:10, color:'#475569' }}>Kruskal · Prim · Interactive</span>
        <span style={{ fontSize:10, color:'#f59e0b', background:'#78350f', padding:'2px 8px', borderRadius:12 }}>Simulation based on actual C/C++ algorithm logic</span>
        {selEdgeInfo&&<span style={{ marginLeft:'auto', fontSize:10, color:'#60a5fa', background:'#1e293b', padding:'2px 10px', borderRadius:4 }}>● {selEdgeInfo}</span>}
      </div>

      {/* Body */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* Left: Graph + Edge Table */}
        <div style={{ flex:'1 1 0', minWidth:0, display:'flex', flexDirection:'column', padding:10, gap:8, overflow:'hidden' }}>
          <div style={{ flex:1, border:'1px solid #1e293b', borderRadius:8, overflow:'hidden', background:'#080f1e' }}>
            <CytoscapeComponent elements={elements} stylesheet={stylesheet} style={{ width:'100%', height:'100%' }}
              cy={cy=>{ cyRef.current=cy; }} layout={{ name:'preset' }} />
          </div>
          {/* Edge table */}
          <div style={{ background:'#0d1b2a', border:'1px solid #1e293b', borderRadius:6, padding:'7px 10px', maxHeight:190, overflowY:'auto', flexShrink:0 }}>
            <div style={{ fontSize:10, color:'#475569', marginBottom:5, letterSpacing:1 }}>EDGES</div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead><tr style={{ color:'#475569' }}><th style={{ textAlign:'left',paddingBottom:3,fontWeight:'normal' }}>From</th><th style={{ textAlign:'left',fontWeight:'normal' }}>To</th><th style={{ textAlign:'left',fontWeight:'normal' }}>W</th><th/><th/></tr></thead>
              <tbody>
                {edges.map(e=>(
                  <tr key={e.id} style={{ borderTop:'1px solid #1e293b' }}>
                    {editingEdge===e.id?<>
                      <td><input {...INP()} value={editVal.src} onChange={ev=>setEditVal(v=>({...v,src:ev.target.value}))} /></td>
                      <td><input {...INP()} value={editVal.tgt} onChange={ev=>setEditVal(v=>({...v,tgt:ev.target.value}))} /></td>
                      <td><input {...INP('36px')} value={editVal.w} onChange={ev=>setEditVal(v=>({...v,w:ev.target.value}))} /></td>
                      <td><button style={S({ fontSize:10,padding:'2px 7px',color:'#22c55e',borderColor:'#16a34a' })} onClick={()=>saveEdit(e.id)}>✓</button></td>
                      <td><button style={S({ fontSize:10,padding:'2px 7px' })} onClick={()=>setEditingEdge(null)}>✕</button></td>
                    </>:<>
                      <td style={{ padding:'3px 0',color:'#cbd5e1' }}>{e.src}</td>
                      <td style={{ color:'#cbd5e1' }}>{e.tgt}</td>
                      <td style={{ color:'#eab308' }}>{e.w}</td>
                      <td><button style={S({ fontSize:10,padding:'2px 7px' })} onClick={()=>{ setEditingEdge(e.id); setEditVal({ src:e.src,tgt:e.tgt,w:e.w }); }}>✎</button></td>
                      <td><button style={S({ fontSize:10,padding:'2px 7px',color:'#f87171',borderColor:'#ef4444' })} onClick={()=>deleteEdge(e.id)}>✕</button></td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display:'flex', gap:4, marginTop:7, alignItems:'center', flexWrap:'wrap' }}>
              {['src','tgt','w'].map(k=>(
                <input key={k} {...INP(k==='w'?'36px':'44px')} placeholder={k==='w'?'wt':k} value={newEdge[k]} onChange={ev=>setNewEdge(v=>({...v,[k]:ev.target.value}))}
                  onKeyDown={ev=>ev.key==='Enter'&&addEdge()} />
              ))}
              <button style={S({ fontSize:11,padding:'3px 10px',background:'#16a34a',borderColor:'#16a34a' })} onClick={addEdge}>+ Add</button>
              {edgeErr&&<span style={{ color:'#f87171',fontSize:10 }}>{edgeErr}</span>}
            </div>
          </div>
        </div>

        {/* Right: Controls + Log */}
        <div style={{ width:310, borderLeft:'1px solid #1e293b', display:'flex', flexDirection:'column', padding:10, gap:9, overflowY:'auto' }}>
          {/* Algo select */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {[['kruskal',"C Sim (Kruskal)"],['prim',"C++ Sim (Prim)"]].map(([k,lbl])=>(
              <button key={k} style={S({ flex:1, background:algo===k&&!compareMode?'#2563eb':'#1e293b', borderColor:algo===k&&!compareMode?'#3b82f6':'#334155' })}
                onClick={()=>{ setCompareMode(false); runAlgo(k); }}>{lbl}</button>
            ))}
            <button style={S({ width:'100%', background:compareMode?'#6d28d9':'#1e293b', borderColor:compareMode?'#7c3aed':'#334155' })}
              onClick={()=>{ const next=!compareMode; setCompareMode(next); if(next) setTimeout(()=>{ const ks=kruskal(nodes,edges),ps=prim(nodes,edges); setKSteps(ks);setPSteps(ps);setAlgo('compare');setLog([`Kruskal: ${ks.length} steps | Prim: ${ps.length} steps`]); },30); else resetSim(); }}>
              {compareMode?'✓ ':''} Compare Algorithms
            </button>
          </div>

          {/* Code Snippet Dynamic */}
          {algo && !compareMode && (
            <div style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:5, padding:'7px 10px', fontSize:10, color:'#94a3b8', whiteSpace:'pre', overflowX:'auto', fontFamily:"'JetBrains Mono', monospace" }}>
              {codeSnippetLines.map((line, i) => (
                <div key={i} style={{ color: curLine === i ? '#eab308' : (i===0?'#475569':'#cbd5e1'), background: curLine === i ? '#334155' : 'transparent', padding: '1px 4px', borderRadius: 2 }}>
                  {line}
                </div>
              ))}
            </div>
          )}

          {/* DSU / Internal State */}
          {algo && !compareMode && curState && (
            <div style={{ background:'#172554', border:'1px solid #1e40af', borderRadius:5, padding:'7px 10px', fontSize:10, fontFamily:"'Courier New', monospace" }}>
              <div style={{ color:'#93c5fd', marginBottom:3, letterSpacing:1, fontWeight:'bold' }}>INTERNAL STATE</div>
              {algo === 'kruskal' && curState.parent && (
                <div style={{ color:'#bfdbfe' }}>
                  Parent: [{Object.entries(curState.parent).map(([k,v]) => `${k}→${v}`).join(', ')}]
                </div>
              )}
              {algo === 'prim' && curState.visited && (
                <div style={{ color:'#bfdbfe' }}>
                  Visited: {curState.visited.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          {(steps.length>0||compareMode)&&(
            <div style={{ background:'#1e293b', borderRadius:5, padding:'7px 10px', fontSize:11 }}>
              {!compareMode?<>
                <div style={{ color:'#475569', marginBottom:3, letterSpacing:1, fontSize:10 }}>PROGRESS</div>
                <div>Step: <span style={{ color:'#eab308' }}>{stepIdx+1}/{steps.length}</span></div>
                <div>Running cost: <span style={{ color:'#22c55e', fontWeight:'bold' }}>{runCost}</span></div>
                <div style={{ marginTop:3 }}>MST: <span style={{ color:'#22c55e', wordBreak:'break-all' }}>{mstEdges.join(' ')||'—'}</span></div>
                {done&&<div style={{ color:'#22c55e', marginTop:4, fontWeight:'bold' }}>✓ MST Complete — Cost: {runCost}</div>}
              </>:<>
                <div style={{ color:'#475569', marginBottom:3, letterSpacing:1, fontSize:10 }}>COMPARISON</div>
                <div><span style={{ color:'#3b82f6' }}>Kruskal</span> — {kSteps.length} steps, cost: <span style={{ color:'#22c55e' }}>{kSteps.filter(s=>s.action==='accept').reduce((a,s)=>a+s.w,0)}</span></div>
                <div><span style={{ color:'#a855f7' }}>Prim</span> — {pSteps.length} steps, cost: <span style={{ color:'#22c55e' }}>{pSteps.filter(s=>s.action==='accept').reduce((a,s)=>a+s.w,0)}</span></div>
                <div style={{ color:'#475569', fontSize:10, marginTop:3 }}>Both algorithms yield the same MST cost.</div>
              </>}
            </div>
          )}

          {/* Log */}
          <div style={{ flex:1, background:'#000000', border:'1px solid #1e293b', borderRadius:5, padding:'7px 10px', overflowY:'auto', minHeight:100, fontFamily:"'Courier New', monospace" }}>
            <div style={{ fontSize:10, color:'#475569', marginBottom:5, letterSpacing:1 }}>TERMINAL OUTPUT</div>
            {compareMode&&kSteps.length>0?(
              <div style={{ fontSize:10, color:'#94a3b8' }}>
                <div style={{ color:'#3b82f6', fontWeight:'bold', marginBottom:3 }}>KRUSKAL</div>
                {kSteps.map((s,i)=><div key={i} style={{ color:s.action==='accept'?'#22c55e':'#ef4444', marginBottom:2 }}>{`> ${s.info}`}</div>)}
                <div style={{ color:'#a855f7', fontWeight:'bold', margin:'6px 0 3px' }}>PRIM</div>
                {pSteps.map((s,i)=><div key={i} style={{ color:s.action==='accept'?'#22c55e':'#ef4444', marginBottom:2 }}>{`> ${s.info}`}</div>)}
                <div ref={logEndRef} />
              </div>
            ):log.length?(
              <div style={{ fontSize:10 }}>
                {log.map((l,i)=>{
                  const ok=l.includes('Added') || l.includes('union') || l.includes('MST');
                  const no=l.includes('Reject') || l.includes('cycle');
                  const def=!(ok||no);
                  return <div key={i} style={{ color:def?'#94a3b8':ok?'#22c55e':'#ef4444', marginBottom:3 }}>{`> ${l}`}</div>;
                })}
                <div ref={logEndRef} />
              </div>
            ):<div style={{ fontSize:10, color:'#334155' }}>$ waiting for execution...</div>}
          </div>

          {/* Playback Controls */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            <button style={S({ flex:1, background:playing?'#92400e':'#15803d', borderColor:playing?'#b45309':'#16a34a', opacity:!steps.length||done?0.4:1 })}
              disabled={!steps.length||done} onClick={()=>setPlaying(p=>!p)}>
              {playing?'⏸ Pause':'▶ Play'}
            </button>
            <button style={S({ flex:1, opacity:!steps.length||done||playing?0.4:1 })} disabled={!steps.length||done||playing} onClick={stepOnce}>⏭ Step</button>
            <button style={S({ color:'#f87171',borderColor:'#ef4444',padding:'6px 10px' })} onClick={resetSim}>↺</button>
          </div>
          
          <div style={{ display:'flex', gap:4, alignItems:'center', fontSize:11 }}>
            <span style={{ color:'#64748b',marginRight:2 }}>Speed:</span>
            {['slow','med','fast'].map(s=>(
              <button key={s} style={S({ fontSize:10,padding:'3px 9px', background:speed===s?'#1d4ed8':'#1e293b', borderColor:speed===s?'#3b82f6':'#334155' })} onClick={()=>setSpeed(s)}>{s}</button>
            ))}
          </div>
          
        </div>
      </div>
    </div>
  );
}