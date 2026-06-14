const DATA = window.DASH_DATA || {};
const nf = new Intl.NumberFormat('pt-BR');
const cf = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const pf = new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1});
const $id = (id)=>document.getElementById(id);
let activeRoute = 'command';
let charts = [];
let currentExportRows = [];

const routes = [
  ['command','Centro de Comando','layout-dashboard'],
  ['population','Gestão Populacional','users'],
  ['hiper','Hiperutilizadores','activity'],
  ['ps','Frequentadores PS','hospital'],
  ['risk','Risco Crescente','trending-up'],
  ['groups','Grupos de Cuidado','radar'],
  ['oncology','Oncologia','cross'],
  ['imuno','Imunobiológicos','siren'],
  ['tea','TEA','brain'],
  ['avoidable','Custo Evitável','shield-alert'],
  ['priority','Beneficiários Prioritários','list-checks'],
  ['opportunities','Oportunidades Financeiras','landmark'],
  ['quality','Qualidade dos Dados','database-zap']
];
function init(){
  renderNav();
  attachActions();
  renderRoute(location.hash?.replace('#','') || 'command');
  window.addEventListener('hashchange',()=>renderRoute(location.hash.replace('#','')||'command'));
}
function renderNav(){
  const nav=$id('nav');
  nav.innerHTML = routes.map(([id,label,icon])=>`<button class="nav-btn" data-route="${id}"><i data-lucide="${icon}"></i><span>${label}</span></button>`).join('');
  nav.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{ location.hash=btn.dataset.route; }));
  refreshIcons();
}
function setActive(route){
  document.querySelectorAll('.nav-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.route===route));
  const label = routes.find(r=>r[0]===route)?.[1] || 'Centro de Comando';
  $id('page-title').textContent = label;
}
function refreshIcons(){ if(window.lucide){ lucide.createIcons(); } }
function destroyCharts(){ charts.forEach(c=>{ try{c.destroy()}catch(e){} }); charts=[]; }
function mount(html){ $id('content').innerHTML = html; refreshIcons(); }
function safeMoney(v){ return cf.format(Number(v||0)); }
function fmt(v){ return nf.format(Number(v||0)); }
function pct(v){ return `${pf.format(Number(v||0))}%`; }
function truncate(s,n=32){ s = String(s??''); return s.length>n ? s.slice(0,n-1)+'…' : s; }
function priorityClass(p){ return String(p||'BAIXA').replace('É','E').replace('Í','I').toUpperCase(); }
function pageIntro(title, text, pills=[]){
  return `<section class="hero"><h2>${title}</h2><p>${text}</p><div class="hero-metrics">${pills.map(p=>`<span class="pill">${p}</span>`).join('')}</div></section>`;
}
function kpiCard(label,value,sub,icon='gauge'){
  return `<div class="cardx kpi-card"><div class="kpi-top"><div><div class="kpi-label">${label}</div></div><div class="kpi-icon"><i data-lucide="${icon}"></i></div></div><div><div class="kpi-value">${value}</div><div class="kpi-sub">${sub||''}</div></div></div>`;
}
function chartBox(id,title,sub='',cls=''){
  return `<div class="cardx chart-card ${cls}"><div class="chart-title"><h3>${title}</h3><span>${sub}</span></div><div id="${id}" class="chart"></div></div>`;
}
function empty(msg){ return `<div class="empty"><i data-lucide="circle-alert"></i><p>${msg}</p></div>`; }
function apex(id, options){
  const el = $id(id); if(!el) return;
  if(!window.ApexCharts){ el.innerHTML = '<div class="empty">Biblioteca de gráficos indisponível.</div>'; return; }
  const chart = new ApexCharts(el, Object.assign({
    chart:{fontFamily:'Inter, system-ui, sans-serif',foreColor:'#dceaf6',toolbar:{show:false},animations:{enabled:true,easing:'easeinout',speed:650}},
    theme:{mode:'dark'},
    grid:{borderColor:'rgba(255,255,255,.08)'},
    tooltip:{theme:'light'},
    legend:{labels:{colors:'#dceaf6'}},
    dataLabels:{style:{fontWeight:700}},
    noData:{text:'Sem dados consolidados para exibir'}
  }, options));
  chart.render(); charts.push(chart);
}
function chartLineCost(id){
  const arr=DATA.charts.custo_mes||[];
  apex(id,{chart:{type:'area',height:310,toolbar:{show:false}},series:[{name:'Custo',data:arr.map(x=>Number(x.custo||0))},{name:'Contas',data:arr.map(x=>Number(x.contas||0))}],xaxis:{categories:arr.map(x=>x.mes_ref),labels:{rotate:0}},yaxis:[{labels:{formatter:v=>cf.format(v).replace(',00','')}},{opposite:true,labels:{formatter:v=>fmt(v)}}],stroke:{curve:'smooth',width:3},fill:{type:'gradient',gradient:{opacityFrom:.36,opacityTo:.02}},dataLabels:{enabled:false},colors:['#08d47a','#38bdf8']});
}
function chartTreemap(id){
  const data=(DATA.charts.where_money||[]).map(x=>({x:x.x,y:Number(x.y||0),meta:x}));
  apex(id,{chart:{type:'treemap',height:320},series:[{data}],plotOptions:{treemap:{distributed:true,enableShades:false}},dataLabels:{enabled:true,formatter:(text,opts)=>`${truncate(text,18)}\n${cf.format(opts.value)}`},tooltip:{y:{formatter:v=>cf.format(v)}}});
}
function chartPareto(id){
  const arr=DATA.charts.pareto||[];
  apex(id,{chart:{type:'bar',height:320},series:[{name:'% do custo',data:arr.map(x=>Number(x.pct_custo||0))}],xaxis:{categories:arr.map(x=>x.percentil),max:100,labels:{formatter:v=>`${v}%`}},plotOptions:{bar:{horizontal:true,borderRadius:8,barHeight:'62%'}},dataLabels:{enabled:true,formatter:v=>`${pf.format(v)}%`},tooltip:{y:{formatter:v=>`${pf.format(v)}% do custo`}},colors:['#08d47a']});
}
function chartHorizontal(id, rows, labelKey, valueKey, title='Custo'){
  const arr=(rows||[]).slice(0,12).reverse();
  apex(id,{chart:{type:'bar',height:330},series:[{name:title,data:arr.map(x=>Number(x[valueKey]||x.value||0))}],xaxis:{labels:{formatter:v=>cf.format(v).replace(',00','')}},yaxis:{categories:arr.map(x=>truncate(x[labelKey]||x.label||'',38)),labels:{style:{fontSize:'11px'}}},plotOptions:{bar:{horizontal:true,borderRadius:6,barHeight:'58%'}},dataLabels:{enabled:false},tooltip:{y:{formatter:v=>cf.format(v)},x:{formatter:(v,opts)=>String(arr[opts.dataPointIndex]?.[labelKey]||arr[opts.dataPointIndex]?.label||v)}},colors:['#38bdf8']});
}
function chartDonut(id, rows, label='label', value='beneficiarios'){
  const arr=(rows||[]).slice(0,8);
  apex(id,{chart:{type:'donut',height:295},labels:arr.map(x=>truncate(x[label],24)),series:arr.map(x=>Number(x[value]||0)),plotOptions:{pie:{donut:{size:'68%',labels:{show:true,total:{show:true,label:'Total',formatter:w=>fmt(w.globals.seriesTotals.reduce((a,b)=>a+b,0))}}}}},dataLabels:{enabled:false},legend:{position:'bottom'},tooltip:{y:{formatter:v=>fmt(v)}}});
}
function chartRadarGroups(id){
  const arr=DATA.charts.grupos?.bubble || [];
  apex(id,{chart:{type:'radar',height:320},series:[{name:'Maturidade',data:arr.map(x=>Number(x.maturidade||0))},{name:'PS',data:arr.map(x=>Number(x.pct_com_ps||0))},{name:'Internação',data:arr.map(x=>Number(x.pct_com_internacao||0))}],xaxis:{categories:arr.map(x=>truncate(x.grupo,14))},yaxis:{show:false,min:0,max:100},markers:{size:4},stroke:{width:2},fill:{opacity:.08},colors:['#08d47a','#f7c948','#ff5d73']});
}
function renderRoute(route){
  activeRoute = route || 'command';
  setActive(activeRoute);
  destroyCharts();
  const handlers = {command, population, hiper, ps:psPage, risk, groups, oncology, imuno, tea, avoidable, priority, opportunities, quality};
  (handlers[activeRoute]||command)();
  refreshIcons();
}
function command(){
  const k=DATA.kpis||{};
  currentExportRows = DATA.charts.pareto || [];
  mount(`${pageIntro('Centro de Comando Assistencial','Cockpit executivo para responder onde está o custo, onde existe risco, desperdício, oportunidade e quem deve ser abordado amanhã.',[`Período ${DATA.metadata.periodo}`,`${fmt(k.n_linhas_processadas)} linhas`,`${fmt(k.n_meses)} meses`])}
  <div class="grid kpi-grid">
    ${kpiCard('Beneficiários',fmt(k.n_beneficiarios),'vidas únicas classificadas','users')}
    ${kpiCard('Custo Total',safeMoney(k.custo_total),'sinistralidade analisada','landmark')}
    ${kpiCard('Ticket Médio',safeMoney(k.custo_medio_beneficiario),'por beneficiário','receipt')}
    ${kpiCard('Hiperutilizadores',fmt(k.n_hiperutilizadores),'fila de alto uso','activity')}
    ${kpiCard('PS Recorrente',fmt(k.n_frequentadores_ps),'beneficiários frequentes','hospital')}
    ${kpiCard('Risco Crescente',fmt(k.n_risco_crescente),'trajetória de custo em alta','trending-up')}
  </div>
  <div class="grid grid-2">
    ${chartBox('moneyTree','Onde Está o Dinheiro?','Treemap por eixo assistencial')}
    ${chartBox('paretoChart','Pareto Financeiro','Concentração de custo por percentil')}
  </div>
  <div class="grid grid-2">
    ${chartBox('costTrend','Tendência Mensal','Custo e volume de contas')}
    <div class="cardx chart-card"><div class="chart-title"><h3>Principais Achados</h3><span>insights_executivos consolidados</span></div><div class="grid">${(DATA.insights||[]).map((t,i)=>`<div class="insight-card"><div class="insight-num">${i+1}</div><p>${t}</p></div>`).join('')}</div></div>
  </div>
  <div class="section-title"><h2>Economia Potencial</h2><p>Simulação executiva sobre o custo total analisado.</p></div>
  <div class="grid grid-4">${(DATA.charts.reduction_cards||[]).map(x=>`<div class="cardx economy-card"><div class="pct">${x.label}</div><div class="money">${safeMoney(x.valor)}</div><div class="micro">redução potencial sobre o custo total</div></div>`).join('')}</div>
  <div class="grid grid-2">
    ${chartBox('topProc','Top Procedimentos por Custo','Rótulos truncados; tooltip completo')}
    ${chartBox('topLoc','Top Locais por Custo','Ranking assistencial')}
  </div>`);
  chartTreemap('moneyTree'); chartPareto('paretoChart'); chartLineCost('costTrend'); chartHorizontal('topProc', DATA.charts.top20_proc||[], 'proced','custo'); chartHorizontal('topLoc', DATA.charts.top20_loc||[], 'loc','custo'); animateCounters();
}
function population(){
  const p=DATA.charts.population||{}; currentExportRows=DATA.lists.beneficiarios_prioritarios||[];
  mount(`${pageIntro('Gestão Populacional','Visão executiva dos grupos priorizados, orientações de cuidado, perfil etário e concentração assistencial.',[`Top 5% = ${pct(DATA.kpis.pct_custo_top5)} do custo`,`CID ${pct(DATA.kpis.cid_pct_depois)}`])}
  <div class="grid grid-4">
    ${kpiCard('Top 1%',pct(DATA.kpis.pct_custo_top1),'do custo total','badge-percent')}
    ${kpiCard('Top 5%',pct(DATA.kpis.pct_custo_top5),'do custo total','badge-percent')}
    ${kpiCard('Beneficiários',fmt(DATA.kpis.n_beneficiarios),'população analisada','users')}
    ${kpiCard('Linhas',fmt(DATA.kpis.n_linhas_processadas),'eventos assistenciais','database')}
  </div>
  <div class="grid grid-2">
    ${chartBox('popAge','Custo por Faixa Etária','Distribuição populacional')}
    ${chartBox('popOrient','Orientação de Cuidado','Fila operacional estratégica')}
  </div>
  <div class="grid grid-2">
    ${chartBox('popPriority','Beneficiários por Prioridade','Alta, média, baixa')}
    ${chartBox('popReading','Leituras Executivas','Custo por padrão clínico')}
  </div>`);
  chartHorizontal('popAge', p.by_age||[], 'label','custo'); chartDonut('popOrient', p.by_orientation||[], 'label','beneficiarios'); chartDonut('popPriority', p.by_priority||[], 'label','beneficiarios'); chartHorizontal('popReading', p.by_reading||[], 'label','custo'); animateCounters();
}
function cardPerson(r, type='hiper'){
  const id = r.pseudo_id || 'NI';
  const action = r.proxima_acao || r.motivo || r.motivo_inclusao || 'Abrir painel lateral para leitura executiva.';
  const reading = r.leitura_executiva || r.sub || r.seg || r.tendencia || 'Beneficiário priorizado';
  const score = r.score ?? r.display_score ?? 0;
  return `<article class="person-card" data-person='${encodeURIComponent(JSON.stringify(r))}'><div class="person-head"><div style="display:flex;gap:10px"><div class="avatar">${String(id).slice(1,3)}</div><div><div class="person-id">${id}</div><div class="micro">${r.idade ?? '-'} anos · ${r.sexo ?? '-'}</div></div></div><span class="tag ${priorityClass(r.prioridade||r.prioridade_view)}">${r.prioridade||r.prioridade_view||'Fila'}</span></div><div class="mini-metrics"><div class="mini"><small>Score</small><strong>${pf.format(score||0)}</strong></div><div class="mini"><small>Custo</small><strong>${safeMoney(r.custo_total||r.custo_ps||r.custo)}</strong></div><div class="mini"><small>Eventos</small><strong>${fmt(r.n_contas||r.n_ps||r.sessoes||r.n||0)}</strong></div></div><h4>${reading}</h4><p>${action}</p></article>`;
}
function attachPersonClicks(){ document.querySelectorAll('.person-card').forEach(el=>el.addEventListener('click',()=>openDrawer(JSON.parse(decodeURIComponent(el.dataset.person))))); }
function hiper(){
  const h=DATA.charts.hiper||{}; const list=DATA.lists.hiperutilizadores||[]; currentExportRows=list;
  mount(`${pageIntro('CRM Executivo de Hiperutilizadores','Cada card traz score, custo, eventos, motivo, próxima ação e oportunidade de intervenção. Clique para abrir o painel lateral.',[`Total ${fmt(DATA.kpis.n_hiperutilizadores)}`,`Custo concentrado`,`${list.length} cards carregados`])}
  <div class="grid grid-2">${chartBox('hiperSub','Subgrupos por Custo','Cluster executivo')}${chartBox('hiperPrio','Prioridade da Fila','Distribuição')}</div>
  <div class="section-title"><h2>Fila de Abordagem</h2><p>Cards visuais substituem tabela operacional.</p></div><div class="crm-grid">${list.slice(0,36).map(r=>cardPerson(r)).join('')}</div>`);
  chartHorizontal('hiperSub', h.by_sub||[], 'label','custo'); chartDonut('hiperPrio', h.by_priority||[], 'label','beneficiarios'); attachPersonClicks();
}
function psPage(){
  const c=DATA.charts.ps||{}; const list=DATA.lists.frequentadores_ps||[]; currentExportRows=list;
  mount(`${pageIntro('Frequentadores de Pronto-Socorro','Ranking, recorrência, retorno em 72h/30d e conversão para rede ambulatorial.',[`Total ${fmt(DATA.kpis.n_frequentadores_ps)}`,`PS por mês`, `Heatmap semanal`])}
  <div class="grid grid-3">${kpiCard('Beneficiários PS',fmt(DATA.kpis.n_frequentadores_ps),'frequentadores recorrentes','hospital')}${kpiCard('Custo PS',safeMoney(list.reduce((a,b)=>a+(+b.custo_ps||0),0)),'amostra priorizada','wallet')}${kpiCard('Retornos 30d',fmt(list.reduce((a,b)=>a+(+b.retorno_30d||0),0)),'recorrência de curto prazo','rotate-ccw')}</div>
  <div class="grid grid-2">${chartBox('psMes','PS por Mês','Volume e custo')}${chartBox('psSeg','Segmentação PS','Com/sem ambulatório')}</div>
  <div class="grid grid-2">${chartBox('psDow','Heatmap Semanal','Dia da semana')}${chartBox('psAge','Perfil Etário','Custo por idade')}</div>
  <div class="section-title"><h2>Ranking Executivo</h2><p>Clique em um beneficiário para o drill-down.</p></div><div class="crm-grid">${list.slice(0,30).map(r=>cardPerson(r)).join('')}</div>`);
  chartPsMes('psMes'); chartHorizontal('psSeg', c.by_segment||[], 'label','custo_ps'); chartDow('psDow'); chartHorizontal('psAge', c.by_age||[], 'label','custo_ps'); attachPersonClicks();
}
function chartPsMes(id){ const arr=DATA.charts.ps_mes||[]; apex(id,{chart:{type:'line',height:310},series:[{name:'Atendimentos PS',data:arr.map(x=>+x.n_ps||0)},{name:'Custo PS',data:arr.map(x=>+x.custo_ps||0)}],xaxis:{categories:arr.map(x=>x.mes_ref)},stroke:{curve:'smooth',width:3},dataLabels:{enabled:false},yaxis:[{labels:{formatter:v=>fmt(v)}},{opposite:true,labels:{formatter:v=>cf.format(v).replace(',00','')}}],colors:['#38bdf8','#08d47a']}); }
function chartDow(id){ const arr=DATA.charts.ps?.dow||DATA.charts.ps_dow||[]; apex(id,{chart:{type:'bar',height:300},series:[{name:'Atendimentos',data:arr.map(x=>+x.n||0)}],xaxis:{categories:arr.map(x=>x.dia)},plotOptions:{bar:{borderRadius:8,columnWidth:'48%'}},dataLabels:{enabled:true},colors:['#a78bfa']}); }
function risk(){
  const list=DATA.lists.risco_crescente||[]; currentExportRows=list;
  mount(`${pageIntro('Risco Crescente','Scatter plot executivo: custo atual no eixo X, velocidade de crescimento no eixo Y, bolha por score e cor por prioridade.',[`Total ${fmt(DATA.kpis.n_risco_crescente)}`,`Amostra visual ${fmt(list.length)}`])}
  <div class="grid grid-2">${chartBox('riskScatter','Custo Atual x Velocidade de Crescimento','Bolha = score')}${chartBox('riskAge','Risco por Faixa Etária','Custo total por faixa')}</div>
  <div class="section-title"><h2>Maiores Acelerações</h2><p>Beneficiários com trajetória ascendente.</p></div><div class="crm-grid">${list.slice(0,30).map(r=>cardPerson(r)).join('')}</div>`);
  chartRiskScatter('riskScatter'); chartHorizontal('riskAge', DATA.charts.risco?.by_age||[], 'label','custo'); attachPersonClicks();
}
function chartRiskScatter(id){
  const list=DATA.lists.risco_crescente||[];
  const series=['ALTA','MEDIA','BAIXA'].map(pr=>({name:pr,data:list.filter(x=>(x.prioridade_view||'')===pr).map(x=>({x:+x.custo_total||0,y:+x.slope_c||0,z:+x.display_score||10,meta:x}))}));
  apex(id,{chart:{type:'bubble',height:360,zoom:{enabled:true}},series, xaxis:{title:{text:'Custo atual'},labels:{formatter:v=>cf.format(v).replace(',00','')}}, yaxis:{title:{text:'Velocidade de crescimento'},labels:{formatter:v=>cf.format(v).replace(',00','')}},dataLabels:{enabled:false},colors:['#ff5d73','#f7c948','#08d47a'],tooltip:{custom:({seriesIndex,dataPointIndex,w})=>{const m=w.config.series[seriesIndex].data[dataPointIndex].meta;return `<div style="padding:10px;color:#081827"><b>${m.pseudo_id}</b><br>Custo: ${cf.format(m.custo_total)}<br>Crescimento: ${cf.format(m.slope_c)}<br>Score: ${pf.format(m.display_score)}</div>`}}});
}
function groups(){
  currentExportRows=DATA.lists.grupos_cuidado||[];
  mount(`${pageIntro('Grupos de Cuidado','Radar, bubble chart, benchmark interno, maturidade do cuidado e oportunidade financeira por grupo.',[`Oncologia`,`Saúde mental`,`Renal · Respiratório · Gestação`])}
  <div class="grid grid-2">${chartBox('groupRadar','Radar de Maturidade','Maturidade x PS x internação')}${chartBox('groupBubble','Bubble Chart de Oportunidade','X = custo médio · Y = maturidade')}</div>
  <div class="grid grid-2">${chartBox('groupSummary','Benchmark Interno','Custo por grupo')}${tableBox('Tabela de Grupos', DATA.charts.grupos?.detail_summary||[], ['label','beneficiarios','custo','ps','internacao'])}</div>`);
  chartRadarGroups('groupRadar'); chartGroupBubble('groupBubble'); chartHorizontal('groupSummary', DATA.charts.grupos?.detail_summary||[], 'label','custo');
}
function chartGroupBubble(id){ const arr=DATA.charts.grupos?.bubble||[]; apex(id,{chart:{type:'bubble',height:330},series:[{name:'Grupos',data:arr.map(x=>({x:+x.custo_medio||0,y:+x.maturidade||0,z:Math.max(10,Math.sqrt(+x.custo_total||0)/70),meta:x}))}],xaxis:{title:{text:'Custo médio'},labels:{formatter:v=>cf.format(v).replace(',00','')}},yaxis:{title:{text:'Maturidade do cuidado'},max:100},dataLabels:{enabled:true,formatter:(v,opts)=>truncate(arr[opts.dataPointIndex]?.grupo,10)},tooltip:{custom:({dataPointIndex})=>{const x=arr[dataPointIndex];return `<div style="padding:10px;color:#081827"><b>${x.grupo}</b><br>Custo total: ${cf.format(x.custo_total)}<br>Custo médio: ${cf.format(x.custo_medio)}<br>Maturidade: ${pf.format(x.maturidade)}%</div>`}},colors:['#08d47a']}); }
function oncology(){
  currentExportRows=DATA.lists.quimioterapia||[];
  mount(`${pageIntro('Torre de Controle Oncológica','Pacientes, protocolos, terapias, medicamentos e custo em visão executiva de alta complexidade.',[`Quimioterapia ${fmt((DATA.lists.quimioterapia||[]).length)} registros`,`Ranking visual`,`Sem tabelas extensas`])}
  <div class="grid grid-4">${kpiCard('Registros Quimio',fmt((DATA.lists.quimioterapia||[]).length),'consolidado','cross')}${kpiCard('Custo Quimio',safeMoney((DATA.lists.quimioterapia||[]).reduce((a,b)=>a+(+b.custo||0),0)),'amostra detalhe','wallet')}${kpiCard('Top 5% Custo',pct(DATA.kpis.pct_custo_top5),'concentração geral','badge-percent')}${kpiCard('CID Cobertura',pct(DATA.kpis.cid_pct_depois),'limitação diagnóstica','database-zap')}</div>
  <div class="grid grid-2">${chartBox('oncoTop','Medicamentos/Procedimentos Oncológicos','Top custo')}${chartBox('quimioClasse','Terapias por Classe','Custo e eventos')}</div>
  <div class="section-title"><h2>Ranking Visual de Terapias</h2><p>Drill-down clínico-financeiro.</p></div>${tableBox('Detalhe Quimioterapia', DATA.lists.quimioterapia||[], ['pseudo_id','idade','sexo','classe','custo','n','cid','proced'])}`);
  chartHorizontal('oncoTop', DATA.charts.top20_onco||[], 'proced','custo'); chartHorizontal('quimioClasse', DATA.charts.oncologia?.quimio_classe||[], 'label','custo');
}
function imuno(){
  currentExportRows=[{nota:DATA.quality.imunobiologicos}];
  mount(`${pageIntro('Painel de Alertas — Imunobiológicos','Semáforos executivos para status de localização, cobertura de busca e confiabilidade da base.',[`Busca por nome + TUSS`,`Alerta consolidado`])}
  <div class="semaphore"><div class="sem"><div class="light green"></div><h3>🟢 Adequado</h3><p class="muted">DS_TIPO_ATENDIMENTO preenchido em 100% das linhas, viabilizando inferência operacional.</p></div><div class="sem"><div class="light yellow"></div><h3>🟡 Atenção</h3><p class="muted">CID em ${pct(DATA.kpis.cid_pct_depois)} das linhas; análises por diagnóstico são conservadoras.</p></div><div class="sem"><div class="light red"></div><h3>🔴 Crítico</h3><p class="muted">${DATA.quality.imunobiologicos}</p></div></div>
  <div class="cardx"><h3>Interpretação Executiva</h3><p class="muted">A ausência de imunobiológicos localizados pode representar inexistência real no período, falha de cadastro por nome/TUSS ou necessidade de ampliar o dicionário de princípios ativos.</p></div>`);
}
function tea(){
  const s=DATA.charts.tea?.summary||{}; const list=DATA.lists.tea||[]; currentExportRows=list;
  mount(`${pageIntro('Mapa de Utilização — TEA','Sessões, custo, fora da curva e padrão de utilização por faixa etária.',[`Pacientes ${fmt(s.pacientes)}`,`Sessões ${fmt(s.sessoes)}`,`Fora da curva ${fmt(s.fora_curva)}`])}
  <div class="grid grid-4">${kpiCard('Pacientes TEA',fmt(s.pacientes),'beneficiários','brain')}${kpiCard('Sessões',fmt(s.sessoes),'volume total','repeat')}${kpiCard('Custo',safeMoney(s.custo),'total TEA','wallet')}${kpiCard('Fora da Curva',fmt(s.fora_curva),'prioridade de auditoria','siren')}</div>
  <div class="grid grid-2">${chartBox('teaAge','Mapa por Faixa Etária','Custo e volume')}${chartBox('teaSessions','Sessões x Custo','Top fora da curva')}</div>
  <div class="section-title"><h2>Cards Fora da Curva</h2><p>Fila executiva para revisão de plano terapêutico.</p></div><div class="crm-grid">${list.slice(0,24).map(r=>cardPerson({...r, prioridade:r.fora_curva?'ALTA':'MEDIA', leitura_executiva:r.fora_curva?'TEA fora da curva':'TEA em acompanhamento', n_contas:r.sessoes, motivo:`${r.sessoes} sessões · ${pf.format(r.sessoes_mes)} sessões/mês · ${safeMoney(r.custo_total)}`})).join('')}</div>`);
  chartHorizontal('teaAge', DATA.charts.tea?.by_age||[], 'label','custo'); chartTeaScatter('teaSessions'); attachPersonClicks();
}
function chartTeaScatter(id){ const arr=DATA.lists.tea||[]; apex(id,{chart:{type:'scatter',height:310,zoom:{enabled:true}},series:[{name:'TEA',data:arr.map(x=>({x:+x.sessoes_mes||0,y:+x.custo_mes||0,meta:x}))}],xaxis:{title:{text:'Sessões/mês'}},yaxis:{title:{text:'Custo/mês'},labels:{formatter:v=>cf.format(v).replace(',00','')}},dataLabels:{enabled:false},colors:['#a78bfa'],tooltip:{custom:({dataPointIndex,w})=>{const x=w.config.series[0].data[dataPointIndex].meta;return `<div style="padding:10px;color:#081827"><b>${x.pseudo_id}</b><br>${pf.format(x.sessoes_mes)} sessões/mês<br>${cf.format(x.custo_mes)}/mês<br>Fora curva: ${x.fora_curva?'sim':'não'}</div>`}}}); }
function avoidable(){
  const list=DATA.lists.custo_evitavel||[]; currentExportRows=list;
  mount(`${pageIntro('Custo Evitável','Exames repetidos, PS evitável, falta APS e ACSC transformados em economia potencial.',[`Exames repetidos ${safeMoney(DATA.kpis.custo_exames_repetidos)}`,`ACSC ${safeMoney(DATA.kpis.custo_acsc)}`])}
  <div class="grid grid-4">${kpiCard('Exames Repetidos',safeMoney(DATA.kpis.custo_exames_repetidos),'<=30 dias','scan-search')}${kpiCard('ACSC',safeMoney(DATA.kpis.custo_acsc),'piso por CID baixo','shield-alert')}${kpiCard('Registros',fmt(list.length),'detalhes priorizados','list')}${kpiCard('Potencial 10%',safeMoney(DATA.kpis.custo_exames_repetidos*.10),'captura simulada','piggy-bank')}</div>
  <div class="grid grid-2">${chartBox('avoidType','Tipos de Custo Evitável','Economia potencial')}${chartBox('avoidTop','Maiores Casos','Top individual')}</div>
  ${tableBox('Drill-down de Custo Evitável', list, ['pseudo_id','tipo','custo','detalhe','cid','idade','sexo'])}`);
  chartHorizontal('avoidType', DATA.charts.custo_evitavel?.by_type||[], 'label','custo'); chartHorizontal('avoidTop', list||[], 'pseudo_id','custo');
}
function priority(){
  const list=DATA.lists.beneficiarios_prioritarios||[]; currentExportRows=list;
  const alta=list.filter(x=>x.prioridade==='ALTA').length, media=list.filter(x=>x.prioridade==='MEDIA'||x.prioridade==='MÉDIA').length, baixa=list.filter(x=>x.prioridade==='BAIXA').length;
  mount(`${pageIntro('Fila Executiva de Beneficiários Prioritários','Cards por prioridade com abertura de painel lateral completo para decisão de abordagem amanhã.',[`ALTA ${fmt(alta)}`,`MÉDIA ${fmt(media)}`,`BAIXA ${fmt(baixa)}`])}
  <div class="grid grid-3">${kpiCard('Alta',fmt(alta),'abordagem imediata','siren')}${kpiCard('Média',fmt(media),'monitoramento dirigido','alert-triangle')}${kpiCard('Baixa',fmt(baixa),'acompanhamento populacional','check-circle')}</div>
  <div class="section-title"><h2>Cards Prioritários</h2><p>Clique para motivo, ação e orientação de cuidado.</p></div><div class="crm-grid">${list.slice(0,48).map(r=>cardPerson(r)).join('')}</div>`);
  attachPersonClicks(); animateCounters();
}
function opportunities(){
  const ops=DATA.opportunities||[]; currentExportRows=ops;
  mount(`${pageIntro('Oportunidades Financeiras','Roadmap executivo, matriz impacto x esforço e pipeline de economia para decisão da Diretoria.',[`Tela crítica`,`Quick Wins`,`90 dias · Estrutural`])}
  <div class="grid grid-4">${kpiCard('Pipeline Total',safeMoney(ops.reduce((a,b)=>a+(+b.economia_potencial||0),0)),'economia potencial mapeada','landmark')}${kpiCard('Quick Wins',safeMoney(ops.filter(o=>o.tipo==='Quick Win').reduce((a,b)=>a+(+b.economia_potencial||0),0)),'baixo esforço','zap')}${kpiCard('90 dias',safeMoney(ops.filter(o=>o.tipo==='90 dias').reduce((a,b)=>a+(+b.economia_potencial||0),0)),'captura tática','calendar-clock')}${kpiCard('Estrutural',safeMoney(ops.filter(o=>o.tipo==='Estrutural').reduce((a,b)=>a+(+b.economia_potencial||0),0)),'sustentável','building-2')}</div>
  <div class="grid grid-2"><div class="cardx chart-card"><div class="chart-title"><h3>Matriz Impacto x Esforço</h3><span>Quadrantes executivos</span></div>${matrix(ops)}</div>${roadmap(ops)}</div>
  <div class="section-title"><h2>Pipeline de Economia</h2><p>Quick Win, 90 dias e estrutural.</p></div>${pipeline(ops)}
  ${tableBox('Roadmap Executivo', ops, ['iniciativa','eixo','economia_potencial','esforco','impacto','prazo','quadrante'])}`);
}
function matrix(ops){ return `<div class="matrix"><span class="quad-label q1">Projetos Estratégicos</span><span class="quad-label q2">Ganhos Rápidos</span><span class="quad-label q3">Baixa Prioridade</span><span class="quad-label q4">Reavaliar</span>${ops.map(o=>{const left=Math.max(8,Math.min(92,o.esforco_score));const bottom=Math.max(8,Math.min(88,o.impacto_score));return `<div class="bubble" style="left:${left}%;bottom:${bottom}%;"><strong title="${o.iniciativa}">${truncate(o.iniciativa,24)}</strong><small>${safeMoney(o.economia_potencial)} · ${o.esforco}</small></div>`}).join('')}</div>`; }
function roadmap(ops){ return `<div class="cardx chart-card"><div class="chart-title"><h3>Roadmap Executivo</h3><span>Iniciativa · esforço · impacto · prazo</span></div><div class="grid">${ops.map(o=>`<div class="pipe-item"><span class="tag ${o.impacto==='Muito alto'||o.impacto==='Alto'?'ALTA':'MEDIA'}">${o.impacto}</span><strong style="display:block;margin-top:8px">${o.iniciativa}</strong><div class="micro">${o.eixo} · esforço ${o.esforco} · prazo ${o.prazo}</div><div class="money">${safeMoney(o.economia_potencial)}</div></div>`).join('')}</div></div>`; }
function pipeline(ops){ const cols=['Quick Win','90 dias','Estrutural']; return `<div class="pipeline">${cols.map(c=>`<div class="pipe-col"><h4>${c}</h4>${ops.filter(o=>o.tipo===c).map(o=>`<div class="pipe-item"><strong>${o.iniciativa}</strong><div class="money">${safeMoney(o.economia_potencial)}</div><div class="micro">${o.descricao}</div></div>`).join('')||'<div class="micro">Sem itens.</div>'}</div>`).join('')}</div>`; }
function quality(){
  currentExportRows=[...(DATA.quality.alertas||[]).map(x=>({alerta:x})),...(DATA.quality.log||[]).map(x=>({log:x}))];
  mount(`${pageIntro('Qualidade dos Dados','Painel executivo de cobertura CID, campos faltantes, limitações e inconsistências que impactam a leitura assistencial.',[`CID ${pct(DATA.kpis.cid_pct_depois)}`,`Tipo atendimento 100%`,`Linhas ${fmt(DATA.kpis.n_linhas_processadas)}`])}
  <div class="grid grid-4">${kpiCard('Cobertura CID',pct(DATA.kpis.cid_pct_depois),'diagnóstico disponível','database-zap')}${kpiCard('DS Tipo Atend.',pct(DATA.quality.tipo_atendimento),'preenchimento','check-circle')}${kpiCard('Meses Lidos',fmt(DATA.kpis.n_meses),'período processado','calendar')}${kpiCard('Imunobiológicos','0','localizados no dicionário','siren')}</div>
  <div class="semaphore"><div class="sem"><div class="light green"></div><h3>🟢 Adequado</h3><p class="muted">Tipo de atendimento preenchido e volume processado consistente.</p></div><div class="sem"><div class="light yellow"></div><h3>🟡 Atenção</h3><p class="muted">Mês 202509 parcial e CID baixo afetam tendências e diagnósticos.</p></div><div class="sem"><div class="light red"></div><h3>🔴 Crítico</h3><p class="muted">ACSC, grupos e oncologia por CID são pisos conservadores.</p></div></div>
  <div class="grid grid-2"><div class="cardx"><h3>Alertas</h3>${(DATA.quality.alertas||[]).map(x=>`<div class="insight-card"><div class="insight-num">!</div><p>${x}</p></div>`).join('')}</div><div class="cardx"><h3>Log de Execução</h3><pre style="white-space:pre-wrap;color:#b9ccdd;font-size:12px">${(DATA.quality.log||[]).join('\n')}</pre></div></div>`);
}
function tableBox(title, rows, cols){ rows=rows||[]; cols=cols||Object.keys(rows[0]||{}); return `<div class="cardx"><div class="chart-title"><h3>${title}</h3><span>${fmt(rows.length)} registros</span></div><div class="table-wrap"><table class="exec-table"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,300).map(r=>`<tr>${cols.map(c=>`<td class="${String(r[c]??'').length>40?'truncate':''}" title="${String(r[c]??'').replace(/"/g,'&quot;')}">${formatCell(c,r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`; }
function formatCell(k,v){ if(v==null) return '-'; if(['custo','custo_total','custo_ps','economia_potencial','valor_base'].some(x=>String(k).includes(x))) return safeMoney(v); if(typeof v==='number') return Number.isInteger(v)?fmt(v):pf.format(v); return String(v); }
function openDrawer(r){
  const keys=['pseudo_id','idade','sexo','prioridade','score','display_score','custo_total','custo_ps','custo','n_contas','n_ps','n_int','sessoes','tendencia','cids_presentes','orientacao_cuidado','leitura_executiva','sub','seg'];
  const metrics=keys.filter(k=>r[k]!=null).map(k=>`<div class="mini"><small>${k}</small><strong>${formatCell(k,r[k])}</strong></div>`).join('');
  $id('drawerContent').innerHTML = `<div class="drawer-title">${r.pseudo_id||'Detalhe'}</div><span class="tag ${priorityClass(r.prioridade||r.prioridade_view)}">${r.prioridade||r.prioridade_view||'Drill-down'}</span><div class="mini-metrics" style="grid-template-columns:repeat(2,1fr)">${metrics}</div><div class="drawer-section"><h4>Leitura executiva</h4><p>${r.leitura_executiva||r.sub||r.seg||r.tendencia||'Registro priorizado.'}</p></div><div class="drawer-section"><h4>Motivo</h4><p>${r.motivo||r.motivo_inclusao||r.detalhe||'Não informado no consolidado.'}</p></div><div class="drawer-section"><h4>Próxima ação</h4><p>${r.proxima_acao||'Definir abordagem com equipe de cuidado conforme prioridade.'}</p></div><div class="drawer-section"><h4>Registro completo</h4><pre style="white-space:pre-wrap;color:#b9ccdd;font-size:12px">${JSON.stringify(r,null,2)}</pre></div>`;
  $id('detailDrawer').classList.add('open'); $id('drawerBackdrop').classList.add('open'); refreshIcons();
}
function closeDrawer(){ $id('detailDrawer').classList.remove('open'); $id('drawerBackdrop').classList.remove('open'); }
function attachActions(){
  $id('drawerClose').addEventListener('click',closeDrawer); $id('drawerBackdrop').addEventListener('click',closeDrawer);
  $id('btnPrint').addEventListener('click',()=>window.print());
  $id('btnPdf').addEventListener('click',()=>window.print());
  $id('btnCsv').addEventListener('click',()=>downloadCSV(`${activeRoute}.csv`, currentExportRows));
  $id('btnExcel').addEventListener('click',()=>downloadExcel(`${activeRoute}.xlsx`, currentExportRows));
}
function downloadCSV(filename, rows){ rows=rows&&rows.length?rows:[{mensagem:'Sem linhas na visão atual'}]; const cols=[...new Set(rows.flatMap(r=>Object.keys(r)))]; const csv=[cols.join(';'),...rows.map(r=>cols.map(c=>`"${String(r[c]??'').replace(/"/g,'""')}"`).join(';'))].join('\n'); const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); URL.revokeObjectURL(a.href); }
function downloadExcel(filename, rows){ rows=rows&&rows.length?rows:[{mensagem:'Sem linhas na visão atual'}]; if(!window.XLSX){ downloadCSV(filename.replace('.xlsx','.csv'),rows); return; } const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'dados'); XLSX.writeFile(wb,filename); }
function animateCounters(){ document.querySelectorAll('.kpi-value,.money').forEach(el=>{ el.animate([{opacity:.4,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'ease-out'}); }); }
window.addEventListener('DOMContentLoaded', init);
