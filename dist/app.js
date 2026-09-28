'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let active='all',query='',selectedSegment=null,scoreMode=false;const scores=Array(17).fill(null);
const shortNames={views:'标准切面',lv:'左心室',segments:'17节段',walls:'室壁对应',diastolic:'舒张功能',atria:'心房',rv:'右心室',ph:'肺高压',as:'AS',ar:'AR',ms:'MS',mr:'MR',tv:'三尖瓣',pv:'肺动脉瓣',prosthesis:'人工瓣',aorta:'主动脉',pericardium:'心包',hcm:'心肌病',formulas:'公式',calculators:'计算器',report:'报告模板',refs:'参考文献'};
function table(b){return `<div class="tablewrap"><table><thead><tr>${b.heads.map(x=>`<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(row=>`<tr>${row.map((v,i)=>{let cl=/重度/.test(b.heads[i])?'severe':/中度/.test(b.heads[i])?'moderate':/正常|轻度/.test(b.heads[i])?'normal':'';return `<td data-label="${esc(b.heads[i])}"><span${cl?` class="cell ${cl}"`:''}>${esc(v)}</span></td>`}).join('')}</tr>`).join('')}</tbody></table></div>`}
function block(b){if(b.type==='table')return table(b);if(b.type==='p')return `<p>${esc(b.text)}</p>`;if(b.type==='note')return `<div class="note">${esc(b.text)}</div>`;if(b.type==='h')return `<h3>${esc(b.text)}</h3>`;if(b.type==='formula')return `<div class="formula">${esc(b.text).replace(/\n/g,'<br>')}</div>`;if(b.type==='segments')return '<div id="segmentApp"></div>';if(b.type==='walls')return '<div id="wallApp"></div>';if(b.type==='calculators')return '<div id="calcApp"></div>';if(b.type==='report')return `<button class="copy" id="copyReport">复制模板</button><pre id="reportText">${esc(REPORT)}</pre><span id="copyStatus" role="status"></span>`;if(b.type==='links')return `<div class="refs">${b.links.map(x=>`<p><a href="${esc(x[1])}" target="_blank" rel="noopener noreferrer">${esc(x[0])} ↗</a></p>`).join('')}</div>`;return ''}
function render(){ $('nav').innerHTML=[['all','全部'],...SECTIONS.map(s=>[s.id,shortNames[s.id]||s.title])].map(([id,label])=>`<button data-nav="${id}" class="${active===id?'active':''}" aria-pressed="${active===id}">${label}</button>`).join('');$('content').innerHTML=SECTIONS.map(s=>`<section class="section" id="${s.id}" data-section="${s.id}"><h2>${s.title}</h2><p class="meta">${s.source}</p>${s.blocks.map(block).join('')}</section>`).join(''); renderSegments();renderWalls();renderCalcs(); $('copyReport').onclick=async()=>{try{await navigator.clipboard.writeText(REPORT);$('copyStatus').textContent='已复制，可粘贴到报告中。'}catch{const r=document.createRange();r.selectNodeContents($('reportText'));getSelection().removeAllRanges();getSelection().addRange(r);$('copyStatus').textContent='请长按或使用复制命令复制选中的模板。'}};filter();}
function filter(){let count=0;const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);SECTIONS.forEach(s=>{const el=$(s.id),hay=(s.title+' '+s.source+' '+el.textContent).toLowerCase();const visible=(active==='all'||active===s.id)&&terms.every(term=>hay.includes(term));el.hidden=!visible;if(visible)count++});$('result').textContent=query?`找到 ${count} 个相关栏目`:`${active==='all'?'全部栏目':shortNames[active]} · ${count} 项`;$('empty').hidden=count!==0;$('clear').hidden=!query;document.querySelectorAll('[data-nav]').forEach(b=>{b.classList.toggle('active',b.dataset.nav===active);b.setAttribute('aria-pressed',b.dataset.nav===active)});}
function navigate(id){active=SECTIONS.some(s=>s.id===id)?id:'all';query='';$('search').value='';filter();window.scrollTo({top:0,behavior:'smooth'});history.replaceState(null,'',active==='all'?location.pathname:'#'+active);document.querySelector(`[data-nav="${active}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'});}
$('nav').onclick=e=>{const b=e.target.closest('[data-nav]');if(b)navigate(b.dataset.nav)};$('search').oninput=e=>{query=e.target.value;active='all';filter()};$('clear').onclick=$('reset').onclick=()=>{query='';$('search').value='';filter();$('search').focus()};$('all').onclick=()=>navigate('all');$('back').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});$('refjump').onclick=e=>{e.preventDefault();navigate('refs')};document.querySelector('.brand').onclick=e=>{e.preventDefault();navigate('all')};
try{if(localStorage.getItem('echo-theme')==='dark')document.documentElement.classList.add('dark')}catch{}$('theme').onclick=()=>{const on=document.documentElement.classList.toggle('dark');$('theme').setAttribute('aria-label',on?'切换浅色模式':'切换深色模式');try{localStorage.setItem('echo-theme',on?'dark':'light')}catch{}};
const segNames=['基底前壁','基底前间隔','基底下间隔','基底下壁','基底下外侧壁','基底前外侧壁','中段前壁','中段前间隔','中段下间隔','中段下壁','中段下外侧壁','中段前外侧壁','心尖前壁','心尖间隔','心尖下壁','心尖侧壁','心尖帽'];
const terr=i=>[1,2,7,8,13,14,17].includes(i)?'LAD':[3,4,9,10,15].includes(i)?'RCA':'LCx';
const segColors={LAD:'#387ff5',RCA:'#12a04b',LCx:'#f3a000'};
const viewMap={PLAX:[2,8,5,11],A4C:[3,9,14,17,16,12,6],A2C:[4,10,15,17,13,7,1],A3C:[5,11,17,2,8],'PSAX 基底':[1,2,3,4,5,6],'PSAX 中段':[7,8,9,10,11,12],'PSAX 心尖':[13,14,15,16]};
function point(r,a){return [200+r*Math.cos(a*Math.PI/180),200+r*Math.sin(a*Math.PI/180)]}function wedge(ri,ro,a,b){const p1=point(ro,a),p2=point(ro,b),p3=point(ri,b),p4=point(ri,a);return `M${p1} A${ro},${ro} 0 0 1 ${p2} L${p3} A${ri},${ri} 0 0 0 ${p4} Z`}
function bull(){let paths='';for(let i=1;i<=17;i++){let ri,ro,a,b,c;if(i<=12){ri=i<=6?128:80;ro=i<=6?180:128;const j=(i-1)%6;c=-90-j*60;a=c-30;b=c+30}else if(i<=16){ri=36;ro=80;c=-90-(i-13)*90;a=c-45;b=c+45}else{ri=0;ro=36;c=0}const col=scoreMode?({1:'#357a52',2:'#a87714',3:'#be523d',4:'#853956'}[scores[i-1]]||'#788492'):segColors[terr(i)],pos=i===17?[200,200]:point((ri+ro)/2,c),label=scoreMode?(scores[i-1]||'—'):i;paths+=`<g role="button" tabindex="0" data-seg="${i}" aria-label="${i} ${segNames[i-1]}，${terr(i)}${scoreMode?'，评分'+(scores[i-1]||'未评'):''}">${i===17?`<circle cx="200" cy="200" r="36"`:`<path d="${wedge(ri,ro,a,b)}"`} fill="${col}" stroke="${selectedSegment===i?'#171d2b':'white'}" stroke-width="${selectedSegment===i?5:2}"/><text x="${pos[0]}" y="${pos[1]+5}" text-anchor="middle" fill="white" font-size="16" font-weight="600" pointer-events="none">${label}</text></g>`}return `<svg class="bull" viewBox="0 0 400 400" aria-label="可点击的左室17节段牛眼图">${paths}</svg>`}
function segInfo(){if(!selectedSegment)return '点击一个节段，查看中文名称、典型供血及对应切面。';return `${selectedSegment} · ${segNames[selectedSegment-1]} ｜ ${terr(selectedSegment)} ｜ ${Object.entries(viewMap).filter(([,v])=>v.includes(selectedSegment)).map(([k])=>k).join('、')}`}
function renderSegments(){const el=$('segmentApp');if(!el)return;const valid=scores.filter(x=>x!==null);el.innerHTML=`<div class="segtools"><button id="territories" aria-pressed="${!scoreMode}">冠脉分区</button><button id="scoreMode" aria-pressed="${scoreMode}">室壁评分</button><button id="resetScores">重置评分</button></div><div class="segment-layout">${bull()}<div><p><span style="color:#357bd5">■ LAD</span>　<span style="color:#128853">■ RCA</span>　<span style="color:#ba7610">■ LCx</span></p><p>上：前壁 · 左：间隔<br>右：侧壁 · 下：下壁</p><p class="note" aria-live="polite">${esc(segInfo())}</p>${scoreMode?`<p>点击依次切换：未评 → 1 → 2 → 3 → 4 → 未评。</p><p><b>WMSI ${valid.length?(valid.reduce((a,b)=>a+b,0)/valid.length).toFixed(2):'—'}</b> · 已评分 ${valid.length} 节段</p><p class="meta">17号心尖帽默认不评分；未评节段不参与分母。</p>`:''}</div></div>`;$('territories').onclick=()=>{scoreMode=false;renderSegments()};$('scoreMode').onclick=()=>{scoreMode=true;renderSegments()};$('resetScores').onclick=()=>{scores.fill(null);selectedSegment=null;renderSegments();renderWalls()};el.querySelectorAll('[data-seg]').forEach(g=>{const act=()=>{const i=Number(g.dataset.seg);selectedSegment=selectedSegment===i&&!scoreMode?null:i;if(scoreMode&&i!==17)scores[i-1]=scores[i-1]===4?null:(scores[i-1]||0)+1;renderSegments();renderWalls()};g.onclick=act;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();act()}}});}
const wallDetails={
'PLAX':{title:'PLAX · 胸骨旁长轴',sub:'主要显示基底段与中段；心尖通常在画面左侧之外。',groups:[['上壁 · 前间隔',[2,8]],['下壁 · 下外侧壁',[5,11]]]},
'PSAX 基底':{title:'PSAX · 基底段（二尖瓣水平）',sub:'鱼口状二尖瓣 · 节段 1–6',groups:[['前壁 → 前间隔 → 下间隔 → 下壁 → 下外侧壁 → 前外侧壁',[1,2,3,4,5,6]]]},
'PSAX 中段':{title:'PSAX · 中段（乳头肌水平）',sub:'节段 7–12 · 显示前外侧、后内侧乳头肌',groups:[['前壁 → 前间隔 → 下间隔 → 下壁 → 下外侧壁 → 前外侧壁',[7,8,9,10,11,12]]]},
'PSAX 心尖':{title:'PSAX · 心尖段',sub:'乳头肌以下 · 节段 13–16',groups:[['前壁 · 间隔 · 下壁 · 侧壁',[13,14,15,16]]]},
'A4C':{title:'A4C · 心尖四腔心',sub:'心尖朝上；屏幕左侧为右心，右侧为左心。',groups:[['左侧室壁 · 下间隔 → 心尖间隔',[3,9,14]],['右侧室壁 · 前外侧壁 → 心尖侧壁',[6,12,16]]]},
'A2C':{title:'A2C · 心尖两腔心',sub:'由四腔心切面旋转获得；右室消失，可见左心耳。',groups:[['左侧室壁 · 下壁',[4,10,15]],['右侧室壁 · 前壁',[1,7,13]]]},
'A3C':{title:'A3C · 心尖三腔心（长轴）',sub:'继续旋转至左室长轴；右下方显示流出道及主动脉。',groups:[['左侧室壁 · 下外侧壁',[5,11]],['右侧室壁 · 前间隔',[2,8]]],note:'灰色心尖侧壁位于四个心尖节段的交界，结合四腔心及两腔心切面确定归属。'}
};
let showApicalPlanes=false;
function wallDiagram(name,ids){
const label=(x,y,t,size=18)=>`<text x="${x}" y="${y}" class="anatomy-label" text-anchor="middle" font-size="${size}" font-weight="600" fill="var(--muted)">${t}</text>`;
const chamber=d=>`<path d="${d}" fill="var(--soft)" stroke="var(--muted)" stroke-width="2"/>`;
const oval=(x,y,rx,ry)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="var(--soft)" stroke="var(--muted)" stroke-width="2"/>`;
const seg=(i,d,x,y)=>`<g data-wallseg="${i}" role="button" tabindex="0" aria-pressed="${selectedSegment===i}" aria-label="${i}号 ${segNames[i-1]}，${terr(i)}" class="wall-segment ${selectedSegment===i?'selected':''}"><title>${i} · ${segNames[i-1]}</title><path class="myocardium" d="${d}" fill="${segColors[terr(i)]}" stroke="${selectedSegment===i?'var(--text)':'var(--bg)'}" stroke-width="${selectedSegment===i?4:2}"/><text x="${x}" y="${y}" fill="white" text-anchor="middle" font-size="17" font-weight="700" pointer-events="none">${i}</text></g>`;
const xy=(cx,cy,rx,ry,a)=>[cx+rx*Math.cos(a*Math.PI/180),cy+ry*Math.sin(a*Math.PI/180)];
const band=(cx,cy,rx,ry,ix,iy,a,b)=>`M${xy(cx,cy,rx,ry,a)} A${rx},${ry} 0 ${b-a>180?1:0} 1 ${xy(cx,cy,rx,ry,b)} L${xy(cx,cy,ix,iy,b)} A${ix},${iy} 0 ${b-a>180?1:0} 0 ${xy(cx,cy,ix,iy,a)} Z`;
const svg=(content,box)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" class="wallsvg" role="group" aria-label="${wallDetails[name].title}解剖与室壁节段示意图">${content}</svg>`;
let nodes='';
if(name==='PLAX'){
 nodes+=chamber('M120 87 Q275 22 451 87 L448 127 Q274 74 130 123 Z');
 nodes+=label(280,85,'RV');
 nodes+=chamber('M446 150 L552 140 L552 199 L446 195 Z');
 nodes+=label(501,179,'Ao');
 nodes+=oval(497,275,54,44)+label(497,281,'LA');
 // Basal segments are on the valve side (right), mid segments towards the apex (left).
 for(const [i,a,b] of [[8,212,269],[2,271,328],[5,32,89],[11,91,148]]){
 const pos=xy(265,210,209,85,(a+b)/2);
 nodes+=seg(i,band(265,210,220,98,198,72,a,b),pos[0],pos[1]+6);
 }
 for(let a=151;a<=209;a+=7){const p=xy(265,210,220,98,a),q=xy(265,210,198,72,a);nodes+=`<path d="M${p} L${q}" stroke="var(--muted)" stroke-width="5" opacity=".6"/>`;}
 nodes+=label(265,216,'LV',20)+label(30,216,'心尖',15);
 return svg(nodes,'0 0 570 355');
}
if(name.startsWith('PSAX')){
 const cx=240,cy=235,count=ids.length,outer=count===4?136:150,inner=outer-44;
 nodes+=chamber(band(cx,cy,outer+61,outer+61,outer+8,outer+8,111,261));
 nodes+=label(cx-outer-32,cy+6,'RV');
 ids.forEach((i,j)=>{const a=-90-j*360/count,pos=xy(cx,cy,outer-22,outer-22,a);nodes+=seg(i,band(cx,cy,outer,outer,inner,inner,a-180/count,a+180/count),pos[0],pos[1]+6)});
 if(name.includes('基底'))nodes+=`<path d="M175 235 Q240 183 305 235 Q240 277 175 235 Z" fill="none" stroke="var(--muted)" stroke-width="2"/>`+label(240,240,'MV');
 else if(name.includes('中段'))nodes+=oval(195,284,15,15)+oval(300,272,15,15)+label(190,318,'PM-PM',16)+label(305,306,'AL-PM',16);
 else nodes+=label(240,241,'LV');
 if(showApicalPlanes){
 for(const [angle,t]of [[count===4?0:-30,'A4C'],[90,'A2C'],[count===4?45:30,'A3C']]){const p=xy(cx,cy,outer+21,outer+21,angle),q=xy(cx,cy,outer+21,outer+21,angle+180);nodes+=`<path d="M${p} L${q}" stroke="var(--text)" stroke-width="1.5" stroke-dasharray="6 5" opacity=".6"/>`+label(p[0]+(angle===0?18:0),p[1]+(angle===0?6:20),t,14);}
 }
 return svg(nodes,'0 0 480 470');
}
const cx=name==='A4C'?310:240,cy=262,rx=100,ry=194;
const apicalBand=(a,b)=>band(cx,cy,rx,ry,rx-24,ry-24,a-90,b-90);
const put=(i,a,b)=>{const pos=xy(cx,cy,rx-12,ry-12,(a+b)/2-90);nodes+=seg(i,apicalBand(a,b),pos[0],pos[1]+6)};
if(name==='A4C'){
 nodes+=chamber('M105 418 C55 359 60 203 100 161 C148 105 207 189 207 294 C207 349 197 393 183 418 Z');
 nodes+=label(140,302,'RV',20)+oval(137,482,73,45)+label(137,488,'RA',20);
 nodes+=oval(cx,482,84,45)+label(cx,488,'LA',20)+label(197,432,'TV',15)+label(cx,432,'MV',15);
}else if(name==='A2C'){
 nodes+=oval(cx,482,88,44)+label(cx,488,'LA',20)+oval(362,438,25,16)+label(405,444,'LAA',17)+label(cx,432,'MV',15);
}else{
 nodes+=oval(201,482,72,42)+label(201,488,'LA',20);
 nodes+=chamber('M288 414 L412 479 L391 516 L268 449 Z');
 nodes+=label(346,481,'Ao',18)+label(317,439,'LVOT',14)+label(237,432,'MV',15);
}
const pairs=name==='A4C'?[[3,-151,-108],[9,-105,-48],[14,-45,-20],[16,20,45],[12,48,105],[6,108,151]]:name==='A2C'?[[4,-151,-108],[10,-105,-48],[15,-45,-20],[13,20,45],[7,48,105],[1,108,151]]:[[5,-151,-108],[11,-105,-48],[8,48,105],[2,108,151]];
pairs.forEach(([i,a,b])=>put(i,a,b));put(17,-18,18);
if(name==='A3C')for(const side of [-1,1])for(let a=22;a<=45;a+=4){const p=xy(cx,cy,rx,ry,side*a-90),q=xy(cx,cy,rx-24,ry-24,side*a-90);nodes+=`<path d="M${p} L${q}" stroke="var(--muted)" stroke-width="5" opacity=".6"/>`;}
nodes+=label(cx,306,'LV',20);
return svg(nodes,'0 0 480 550');
}
function renderWalls(){
const el=$('wallApp');if(!el)return;
const order=['PLAX','PSAX 基底','PSAX 中段','PSAX 心尖','A4C','A2C','A3C'];
el.innerHTML=`<div class="wall-intro">点击任一彩色节段，它会在所有对应切面及牛眼图中同步高亮；再次点击取消。<div class="territory-key"><span class="lad">LAD · 前降支</span><span class="rca">RCA · 右冠</span><span class="lcx">LCx · 回旋支</span></div></div><p class="meta">解剖示意图 · 按标准屏幕方位显示；冠脉供血分区存在个体差异。</p><div class="wallgrid">${order.map(name=>{const d=wallDetails[name],ids=viewMap[name];return `<div class="wallcard" data-wallview="${name}"><h3>${d.title}</h3><p class="wall-subtitle">${d.sub}</p>${name.startsWith('PSAX')?`<label class="plane-toggle"><input type="checkbox" data-planes ${showApicalPlanes?'checked':''}>显示心尖切面方向</label>`:''}${wallDiagram(name,ids)}<div class="wallnodes">${d.groups.map(([t,arr])=>`<div class="wall-line"><span>${t}</span><span class="wall-links">${arr.map(i=>`<button data-wallseg="${i}" style="--seg:${segColors[terr(i)]}" class="${selectedSegment===i?'chosen':''}" aria-label="${i}号 ${segNames[i-1]}" aria-pressed="${selectedSegment===i}" title="${segNames[i-1]}">${i}</button>`).join('')}</span></div>`).join('')}</div>${d.note?`<p class="wall-subtitle wall-footnote">${d.note}</p>`:''}${name==='PSAX 中段'?'<p class="wall-subtitle wall-footnote">AL-PM：前外侧乳头肌；PM-PM：后内侧乳头肌。</p>':''}</div>`}).join('')}</div><p class="note" aria-live="polite">${esc(segInfo())}</p><p class="meta anatomy-key">LV 左室 · RV 右室 · LA 左房 · RA 右房 · Ao 主动脉 · MV 二尖瓣 · TV 三尖瓣 · LAA 左心耳 · LVOT 左室流出道</p>`;
el.querySelectorAll('[data-wallseg]').forEach(b=>{const act=keyboard=>{const i=Number(b.dataset.wallseg),view=b.closest('[data-wallview]').dataset.wallview;selectedSegment=selectedSegment===i?null:i;renderWalls();renderSegments();if(keyboard)el.querySelector(`[data-wallview="${view}"] [data-wallseg="${i}"]`)?.focus({preventScroll:true})};b.onclick=()=>act(false);b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();act(true)}}});
el.querySelectorAll('[data-planes]').forEach(b=>{b.onchange=()=>{const view=b.closest('[data-wallview]').dataset.wallview;showApicalPlanes=b.checked;renderWalls();el.querySelector(`[data-wallview="${view}"] [data-planes]`)?.focus({preventScroll:true})}});
}
const calcGroups=[
['basic','体表面积与基础信息',[['height','身高','cm',30,250],['weight','体重','kg',1,350],['hr','心率','次/min',10,300]],'BSA = √(身高 × 体重 / 3600)'],
['flow','LVOT · 每搏量与心排量',[['ld','LVOT 直径','cm',0.1,6],['lvti','LVOT VTI','cm',0.1,100]],'SV = πd²/4 × VTI；CO = SV × HR / 1000。输入cm，不自动猜测单位。'],
['shunt','Qp/Qs · 肺体循环血流比',[['rd','RVOT 直径','cm',0.1,6],['rvti','RVOT VTI','cm',0.1,100]],'使用上方 LVOT 数据。瓣膜反流、多处梗阻和取样误差会影响结果。'],
['bernoulli','伯努利压差',[['v2','远端峰速 V₂','m/s',0.01,10],['v1','近端峰速 V₁（可选）','m/s',0,10]],'近端速度不可忽略时采用 4(V₂² − V₁²)；缺省 V₁ 按0处理。'],
['ava','主动脉瓣口面积',[['avmax','AV Vmax（可选）','m/s',0.01,10],['avti','AV VTI','cm',0.1,300],['mg','平均压差（记录用）','mmHg',0,200],['lvmax','LVOT Vmax（可选）','m/s',0.01,8],['stj','STJ直径（ELI，可选）','cm',0.1,10]],'使用 LVOT 直径和VTI；ELI 为能量损失指数，不替代综合AS分级。'],
['mva','二尖瓣口面积',[['pht','PHT','ms',1,2000],['mvti','二尖瓣流入 VTI（可选）','cm',0.1,300]],'MVA = 220 / PHT。连续方程法在明显MR、AR或分流时不可靠。人工二尖瓣不用PHT算面积。'],
['pisa','PISA · EROA与反流量',[['radius','PISA 半径','cm',0.01,5],['alias','混叠速度 Va','cm/s',1,150],['regv','反流峰速','m/s',0.01,10],['regvti','反流 VTI','cm',0.1,400]],'采用半球形假设。m/s 在计算时转换为cm/s。偏心、多束、非圆形反流口需谨慎。'],
['volume','容积法反流量 / 反流分数',[['md','二尖瓣环直径','cm',0.1,8],['mavti','瓣环取样 VTI','cm',0.1,200]],'仅孤立MR或AR、无分流且测量可靠时适用。二尖瓣环非圆形会带来误差。'],
['mass','左室质量、RWT与FS',[['ivs','IVSd','mm',1,50],['lvidd','LVIDd','mm',1,120],['pw','PWd','mm',1,50],['lvids','LVIDs（可选）','mm',0,120]],'输入mm，计算左室质量时换算为cm。'],
['ef','左室射血分数',[['edv','EDV','mL',1,1000],['esv','ESV','mL',0,1000]],'EF = (EDV − ESV) / EDV × 100%。'],
['dpdt','MR频谱 dP/dt',[['dt','MR速度1→3 m/s所需时间','ms',1,1000]],'dP/dt = 32000 / Δt（ms）。'],
['dias','舒张功能 · ASE 2025流程辅助',[['e','E峰','cm/s',0.1,300],['a','A峰','cm/s',0.1,300],['es','间隔 e′','cm/s',0.1,40],['el','侧壁 e′','cm/s',0.1,40],['dtr','TR峰速（RAP未知时）','m/s',0.01,8],['dpasp','PASP（若可可靠估测，优先）','mmHg',1,200],['lavi','LAVI（补充）','mL/m²',1,200],['lasr','LASr（补充）','%',0,100],['sd','肺静脉 S/D（补充）','比值',0,10],['ivrt','IVRT（替代补充）','ms',1,300]],'仅适用指南规定的窦性心律普通人群；特殊人群需独立流程。留空表示未测，绝不按正常处理。'],
['atrial','心房容积指数',[['lav','左房容积','mL',1,500],['rav','右房容积','mL',1,500]],'容积 / BSA；右房正常值要匹配测量方法。'],
['pressure','右心压力与PH概率',[['tr','TR峰速','m/s',0.01,8],['ivc','IVC直径','mm',1,60],['tapse','TAPSE','mm',0,60],['act','RVOT AcT','ms',1,300],['prend','PR舒张末速度','m/s',0.01,8]],'RAP估算仅适用于自主呼吸；PASP估算要求无RVOT/肺动脉瓣梗阻。PH概率采用ESC/ERS 2022，非确诊。'],
['rvcalc','右室FAC与纵向功能',[['eda','RV舒张末面积','cm²',0.1,100],['esa','RV收缩末面积','cm²',0,100],['rvs','右室 S′','cm/s',0,50]],'FAC = (EDA − ESA) / EDA ×100%；正常边界按ASE 2025。']
];
function field(x){const [id,label,unit,min,max]=x;return `<label class="field" for="c-${id}"><span>${label} <small>${unit}</small></span><input id="c-${id}" data-input="${id}" type="number" inputmode="decimal" step="any" min="${min}" max="${max}" placeholder="未填写"></label>`}
function renderCalcs(){const el=$('calcApp');el.innerHTML=`<div class="note">数据只用于本页运算，不上传，不自动填入报告。请严格按每格单位输入；清空或刷新即移除。医学流程输出为辅助提示，需核对适用条件。</div><button id="clearCalc" style="margin:16px 0">清空全部输入</button><div class="calcgrid">${calcGroups.map(([id,title,fields,note])=>`<section class="calc" id="calc-${id}"><h3>${title}</h3><div class="fields">${fields.map(field).join('')}</div>${id==='volume'?'<label>病变 <select id="lesion"><option value="mr">孤立MR</option><option value="ar">孤立AR</option></select></label>':''}${id==='dias'?'<label class="check"><input type="checkbox" id="diasOK">已确认符合ASE 2025普通窦性心律算法适用条件</label>':''}${id==='pressure'?'<label class="check"><input type="checkbox" id="vent">机械通气 / 非自主呼吸</label><label>快速吸气塌陷 <select id="collapse"><option value="">未知</option><option value="yes">>50%</option><option value="no">≤50%</option></select></label><label>至少两类PH支持征象 <select id="phsigns"><option value="">未评估</option><option value="no">无</option><option value="yes">有</option></select></label>':''}<p class="meta">${note}</p><output id="out-${id}" aria-live="polite">等待输入</output></section>`).join('')}</div>`;el.addEventListener('input',updateCalcs);el.addEventListener('change',updateCalcs);$('clearCalc').onclick=()=>{el.querySelectorAll('input').forEach(i=>{i.value='';i.checked=false});el.querySelectorAll('select').forEach(s=>s.selectedIndex=0);updateCalcs()};}
function values(){const v={};document.querySelectorAll('[data-input]').forEach(el=>{const n=el.value===''?null:Number(el.value);const ok=n===null||Number.isFinite(n)&&n>=Number(el.min)&&n<=Number(el.max);el.setAttribute('aria-invalid',!ok);v[el.dataset.input]=ok?n:null;});return v}
const valid=(...x)=>x.every(n=>n!==null&&Number.isFinite(n));
const fmt=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):'—';
function calculate(v,opts={}){const out={},bsa=valid(v.height,v.weight)?Math.sqrt(v.height*v.weight/3600):null,area=valid(v.ld)?Math.PI*v.ld*v.ld/4:null,sv=valid(area,v.lvti)?area*v.lvti:null,co=valid(sv,v.hr)?sv*v.hr/1000:null;out.basic=bsa?`BSA ${fmt(bsa)} m²`:'';out.flow=[area!==null?`CSA ${fmt(area)} cm²`:'',sv!==null?`SV ${fmt(sv)} mL`:'',co!==null?`CO ${fmt(co)} L/min`:'',valid(sv,bsa)?`SVi ${fmt(sv/bsa)} mL/m²`:'',valid(co,bsa)?`CI ${fmt(co/bsa)} L/min/m²`:''].filter(Boolean).join('；');if(valid(v.rd,v.rvti,sv)&&sv>0)out.shunt=`Qp/Qs ${fmt(Math.PI*v.rd*v.rd/4*v.rvti/sv)}`;
if(valid(v.v2)){const v1=v.v1??0;out.bernoulli=v1>v.v2?'近端速度不能大于远端速度，请核对取样位置。':`ΔP ${fmt(4*(v.v2*v.v2-v1*v1))} mmHg`}
if(valid(sv,v.avti)){const ava=sv/v.avti;out.ava=`AVA ${fmt(ava)} cm²；DVI ${fmt(v.lvti/v.avti)}`;if(bsa)out.ava+=`；AVAi ${fmt(ava/bsa)} cm²/m²`;if(valid(v.stj,bsa)){const aa=Math.PI*v.stj*v.stj/4;out.ava+=aa>ava?`；ELI ${fmt(ava*aa/(aa-ava)/bsa)} cm²/m²`:'；ELI条件不满足（STJ面积须>AVA）'}}if(valid(area,v.avmax,v.lvmax)){out.ava=(out.ava||'')+`；峰速法AVA ${fmt(area*v.lvmax/v.avmax)} cm²`}
if(valid(v.pht))out.mva=`PHT法 MVA ${fmt(220/v.pht)} cm²`;if(valid(sv,v.mvti))out.mva=(out.mva||'')+`；连续方程 MVA ${fmt(sv/v.mvti)} cm²`;
if(valid(v.radius,v.alias,v.regv)){const flow=2*Math.PI*v.radius*v.radius*v.alias,eroa=flow/(v.regv*100);out.pisa=`流量 ${fmt(flow)} mL/s；EROA ${fmt(eroa)} cm²`+(valid(v.regvti)?`；RVol ${fmt(eroa*v.regvti)} mL`:'')}
if(valid(v.md,v.mavti,sv)){const msv=Math.PI*v.md*v.md/4*v.mavti,rv=opts.lesion==='ar'?sv-msv:msv-sv,den=opts.lesion==='ar'?sv:msv;out.volume=rv<0?'计算得到负反流量，请核对病变类型、内径与VTI，不能解释为无反流。':`RVol ${fmt(rv)} mL；RF ${fmt(rv/den*100)}%`}
if(valid(v.ivs,v.lvidd,v.pw)){const mass=.8*1.04*(Math.pow((v.ivs+v.lvidd+v.pw)/10,3)-Math.pow(v.lvidd/10,3))+.6;out.mass=`LV质量 ${fmt(mass,1)} g；RWT ${fmt(2*v.pw/v.lvidd)}`+(bsa?`；LVMi ${fmt(mass/bsa,1)} g/m²`:'');if(valid(v.lvids))out.mass+=v.lvids>v.lvidd?'；LVIDs不可大于LVIDd':`；FS ${fmt((v.lvidd-v.lvids)/v.lvidd*100,1)}%`}
if(valid(v.edv,v.esv))out.ef=v.esv>v.edv?'ESV不可大于EDV，请核对。':`LVEF ${fmt((v.edv-v.esv)/v.edv*100,1)}%`+(bsa?`；EDVi ${fmt(v.edv/bsa)}；ESVi ${fmt(v.esv/bsa)} mL/m²`:'');if(valid(v.dt))out.dpdt=`dP/dt ${fmt(32000/v.dt,0)} mmHg/s`;
if(bsa)out.atrial=[valid(v.lav)?`LAVI ${fmt(v.lav/bsa)} mL/m²`:'',valid(v.rav)?`RAVI ${fmt(v.rav/bsa)} mL/m²`:''].filter(Boolean).join('；');
const pressure=[];let rap=null,pasp=null;if(opts.vent)pressure.push('机械通气：不使用IVC法估算RAP/PASP');else if(valid(v.ivc)&&opts.collapse){rap=v.ivc<=21&&opts.collapse==='yes'?3:v.ivc>21&&opts.collapse==='no'?15:8;pressure.push(`RAP估计 ${rap} mmHg`)}if(valid(v.tr,rap)){pasp=4*v.tr*v.tr+rap;pressure.push(`PASP≈ ${fmt(pasp,1)} mmHg（无RVOT/肺动脉瓣梗阻前提）`)}if(valid(pasp,v.tapse)&&pasp>0)pressure.push(`TAPSE/PASP ${fmt(v.tapse/pasp)}`);if(valid(v.prend,rap))pressure.push(`PADP≈ ${fmt(4*v.prend*v.prend+rap,1)} mmHg`);if(valid(v.tr,v.rvti))pressure.push(`PVR经验估算 ${fmt(10*v.tr/v.rvti+.16)} WU`);if(valid(v.tr)){let pr=v.tr>3.4?'高':opts.phsigns?(v.tr>2.8?(opts.phsigns==='yes'?'高':'中'):(opts.phsigns==='yes'?'中':'低')):'待补充至少两类支持征象';pressure.push(`PH超声概率：${pr}`)}out.pressure=pressure.join('；');
if(valid(v.eda,v.esa)){out.rvcalc=v.esa>v.eda?'ESA不可大于EDA':`FAC ${fmt((v.eda-v.esa)/v.eda*100,1)}%（正常 >35%）`}if(valid(v.rvs))out.rvcalc=(out.rvcalc||'')+`；S′ ${fmt(v.rvs,1)} cm/s（正常 >9.5）`;
out.dias=diastolic(v,opts.diasOK);return out;}
function diastolic(v,ok){const parts=[];let ea=valid(v.e,v.a)?v.e/v.a:null,ep=valid(v.es,v.el)?(v.es+v.el)/2:null,ee=valid(v.e,ep)?v.e/ep:null;if(ea!==null)parts.push(`E/A ${fmt(ea)}`);if(ee!==null)parts.push(`平均E/e′ ${fmt(ee)}`);if(!ok)return parts.join('；')+(parts.length?'。':'')+'先确认算法适用条件。';if(!valid(v.es,v.el,v.e)||!valid(v.dpasp)&&!valid(v.dtr))return parts.join('；')+'。首轮资料不完整：需E、两侧e′及PASP或TR。';const reduced=v.es<=6||v.el<=7||ep<=6.5,raised=ee>=14,ph=valid(v.dpasp)?v.dpasp>=35:v.dtr>=2.8,count=[reduced,raised,ph].filter(Boolean).length;let result;if(count===0)result='左房压正常，舒张功能正常（普通算法）';else if(count===3)result=ea===null?'支持左房压升高；需E/A分级':ea>=2?'支持Ⅲ级，左房压升高':'支持Ⅱ级，左房压升高';else if(count===1&&reduced&&ea!==null&&ea<=.8)result='支持Ⅰ级，左房压正常';else{const supp=[valid(v.lasr)?v.lasr<=18:null,valid(v.lavi)?v.lavi>34:null,valid(v.sd)?v.sd<=.67:null];if(supp.some(x=>x===true)||valid(v.ivrt)&&v.ivrt<=70)result=ea===null?'补充指标支持左房压升高，需E/A分级':ea>=2?'补充指标支持Ⅲ级，左房压升高':'补充指标支持Ⅱ级，左房压升高';else if(supp.every(x=>x===false)||valid(v.ivrt)&&supp.every(x=>x===null)&&v.ivrt>70)result='补充指标倾向左房压正常；结合松弛及临床判断分级，有症状考虑负荷评估';else result='需补充可靠的LASr、LAVI、肺静脉S/D或IVRT；现有数据不足以定级'}return parts.join('；')+'。'+result+'。肺静脉指标需核对EF和适用条件。'}
function updateCalcs(){const v=values(),o=calculate(v,{lesion:$('lesion').value,vent:$('vent').checked,collapse:$('collapse').value,phsigns:$('phsigns').value,diasOK:$('diasOK').checked});for(const [id]of calcGroups){const el=$('out-'+id),invalid=$('calc-'+id).querySelector('[aria-invalid="true"]');el.textContent=invalid?'输入超出有效范围，请核对单位及数值。':o[id]||'等待输入';}if($('calcApp').querySelector('[aria-invalid="true"]')){for(const id of ['flow','shunt','ava','mva','volume','pressure','atrial'])$('out-'+id).textContent='有输入超出范围；请先修正，再使用关联结果。';}}
render();if(location.hash)navigate(location.hash.slice(1));
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'search_echo_reference',description:'搜索中文心超速查并在页面显示匹配栏目。',inputSchema:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||typeof input.query!=='string'||input.query.length>200)throw new Error('query需为不超过200字的字符串');query=input.query;active='all';$('search').value=query;filter();return {sections:SECTIONS.filter(s=>!$(s.id).hidden).map(s=>({id:s.id,title:s.title}))}}})).catch(()=>{})}catch{}}
