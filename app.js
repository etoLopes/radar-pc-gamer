'use strict';
const $=id=>document.getElementById(id);
const labels={cpu:'Processador',gpu:'Placa de vídeo',motherboard:'Placa-mãe',ram:'Memória RAM',ssd:'SSD',psu:'Fonte',case:'Gabinete',cooler:'Cooler'};
const number=v=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
const brl=v=>number(v)==null?'—':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const note=v=>number(v)==null?'—':Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const date=v=>new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
const scoreTone=v=>number(v)==null?'unknown':Number(v)>=9?'black':Number(v)>=8?'green':'orange';
function scoreBadge(value,label='Nota técnica'){const badge=el('div',null,'grade-badge grade-'+scoreTone(value));badge.append(el('span',label),el('strong',note(value)));return badge;}
const day=v=>v.split('-').reverse().join('/');
const relation={exact:'Modelo de referência',equivalent:'Similar à referência',superior:'Avaliado como superior',inferior:'Avaliado como inferior',unknown:'Comparação pendente'};
const compat={compatible:'Compatível com o perfil avaliado',incompatible:'Incompatível com o perfil',requires_bundle_change:'Exige trocar outras peças',pending:'Compatibilidade pendente'};
const missingLabels={cooling_power:'teste de refrigeração e consumo',benchmark_comparavel:'benchmark comparável',identidade_exata:'modelo exato',gaming:'desempenho em jogos',memory:'impacto da memória de vídeo',cooling_variant:'refrigeração da versão',power_connectors:'conectores de energia'};
const statuses={approved:'Aprovada individualmente',pending:'Validação pendente',rejected:'Não recomendada'};
let data={offers:[],queue:{},coverage:[],series:{},combo:{}},filtered=[],page=0;
const pageSize=12;
function el(tag,text,cls){const element=document.createElement(tag);if(text!=null)element.textContent=text;if(cls)element.className=cls;return element;}
function safeLink(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function anchor(text,url){const a=el('a',text);a.href=safeLink(url)||'#';a.target='_blank';a.rel='noopener noreferrer';return a;}
function pill(text,kind=''){return el('span',text,'pill '+kind);}
function statusLabel(o){
 if(o.review_status==='approved')return 'Aprovada individualmente';
 if(o.review_status==='rejected')return 'Não recomendada';
 if(o.research_status==='awaiting_research')return 'Aguardando pesquisa técnica';
 if(o.technical_status==='supported')return o.compatibility==='requires_bundle_change'?'Exige outro combo':o.offer_status==='incomplete'?'Confirmar condições da oferta':'Confirmar compatibilidade';
 return 'Evidência técnica insuficiente';
}
function verdict(o){if(o.verdict==='expired_window')return ['Oferta antiga',''];if(o.review_status!=='approved')return [statusLabel(o),'warning'];if(!o.sufficient_history)return ['Histórico insuficiente',''];if(number(o.difference_pct)<0)return ['Abaixo da média','green'];return ['Na média ou acima',''];}
function renderOverview(){
 $('budget').textContent=brl(data.budget_brl);$('ceiling').textContent='Teto '+brl(data.hard_budget_brl)+' · incluindo frete e cooler';
 $('campaign').textContent=data.campaign_end?'Campanha até '+day(data.campaign_end):'Data final não informada';
 $('updated').textContent='Exportado em '+date(data.generated_at);
 $('stale').hidden=Date.now()-Date.parse(data.generated_at)<86400000;
 $('offer-count').textContent=data.offers.length;$('coverage-count').textContent=(data.priced_categories||0)+' / 7';
 $('approved-count').textContent=data.offers.filter(o=>o.review_status==='approved').length;$('pending-count').textContent=data.queue.pending||0;
 const eligible=data.combo.eligible||[];
 $('combo-status').replaceChildren(el('strong',eligible.length?'Há '+eligible.length+' combo(s) com validação registrada.':'Ainda não há um PC completo aprovado.'),el('span',eligible.length?'Confira os preços, condições e data da validação antes de comprar.':'A média do conjunto e a validação de compra são etapas separadas.'));
 $('coverage').replaceChildren();
 for(const c of data.coverage){const card=el('article',null,'part-card '+(c.status==='missing'?'missing':''));card.append(el('span',c.label,'part-label'));const text={missing:'Nenhum candidato técnico validado',no_price:'Preço não identificado',review:'Candidato técnico; compra pendente',candidate:'Candidato encontrado',included_pending:'Cooler incluso a confirmar'}[c.status]||'Pendente';card.append(pill(text,c.status==='candidate'?'green':c.status==='review'?'warning':''),el('span','Referência: '+c.reference,'reference'),el('span','Menor preço entre candidatos técnicos ≥ 8','small muted'),el('strong',brl(c.lowest_brl)));if(c.count)card.append(el('span',c.count+' oferta(s) recente(s)','small muted'));card.append(anchor('Pesquisar manualmente ↗','https://www.google.com/search?q='+encodeURIComponent(c.reference+' preço')));$('coverage').append(card);}
 $('subtotal').textContent=brl(data.observed_subtotal);$('subtotal-note').textContent=(data.priced_categories||0)+' de 7 categorias com preço. Soma exploratória dos candidatos; a montagem completa ainda exige validação. Frete/cooler adicional não incluídos.';
 const missing=data.coverage.filter(c=>['missing','no_price'].includes(c.status));$('missing-summary').textContent=missing.length?'Para sua pesquisa: '+missing.map(c=>c.label).join(', ')+'.':'Todas as categorias têm candidatos. Ainda é necessário confirmar os bloqueios técnicos e comerciais.';
 $('combo-blockers').replaceChildren();const blocks=Object.keys(data.combo.blockers||{});for(const name of blocks)$('combo-blockers').append(el('li',name));for(const key of data.combo.missing||[])$('combo-blockers').append(el('li','Falta candidato para '+(labels[key]||key)));if(!blocks.length&&!(data.combo.missing||[]).length)$('combo-blockers').append(el('li','Consulte os detalhes de cada oferta. A avaliação final não presume informações ausentes.'));
 $('combos').replaceChildren();for(const combo of eligible){const details=el('details'),summary=el('summary','Combo validado · '+brl(combo.total_brl)+' · média técnica '+note(combo.average_quality));details.append(summary);const list=el('ul');for(const [category,name] of Object.entries(combo.parts))list.append(el('li',(labels[category]||category)+': '+name));details.append(list);$('combos').append(details);}
 $('processing').replaceChildren();for(const [key,name] of [['pending','Aguardando análise'],['review','Mensagens aguardando validação'],['done','Mensagens com oferta aprovada'],['discarded','Descartadas / sem oferta válida']]){const row=el('div',null,'process-row');row.append(el('span',name),el('strong',data.queue[key]||0));$('processing').append(row);}
 if(data.operations){const op=data.operations;const labels={completed:'Concluída',backlog:'Há pendências',needs_attention:'Falhas isoladas',interrupted:'Interrompida; retomada solicitada',failed:'Falhou',budget_blocked:'Orçamento atingido',api_blocked:'API indisponível ou sem autorização',running:'Em execução ou interrompida'};
 const append=(label,value)=>{const row=el('div',null,'process-row');row.append(el('span',label),el('strong',value));$('processing').append(row);};
 append('Pendência mais antiga',op.pending?Math.ceil(op.oldest_pending_seconds/3600)+' h':'Sem fila');
 append('Falhas isoladas / aguardando nova tentativa',op.isolated_failures+' / '+op.retry_waiting);
 for(const [kind,label] of [['collection','Última coleta'],['analysis','Última análise']]){const run=op.runs.find(r=>r.kind===kind);if(run)append(label,date(run.started_at)+' · '+(labels[run.outcome]||run.outcome));}
 const last=op.runs.find(r=>r.kind==='analysis');if(last)append('Reutilizações / pesquisas técnicas (última execução)',(last.metrics.technical_cache_hits||0)+' / '+(last.metrics.technical_researches||0));
 }

 $('cost').replaceChildren();if(data.api_budget){$('cost').append(el('strong','US$ '+note(data.api_budget.reserved_usd)+' / '+note(data.api_budget.limit_usd)),el('p','Reserva conservadora de orçamento. Não é o valor efetivamente cobrado pela API.'));}else $('cost').append(el('p','Orçamento da API não exibido nesta versão do painel.'));
}
function renderPromising(){
 const list=$('promising-list');list.replaceChildren();
 const candidates=data.promising||[];
 if(!candidates.length){list.append(el('p','Nenhum candidato com evidência parcial suficiente nesta exportação.','rank-empty'));return;}
 for(const c of candidates){
  const card=el('article',null,'part-card');card.append(el('h3',c.product),el('strong',brl(c.price_brl)),pill('Investigação pendente','warning'));
  card.append(el('p',c.signal,'small'),el('p','Falta confirmar: '+(c.missing?.map(key=>missingLabels[key]||key.replaceAll('_',' ')).join(', ')||'critérios técnicos e condições da oferta')+'.','small'));
  if(c.required_changes?.length)card.append(el('p','Mudanças a avaliar: '+c.required_changes.join('; '),'small'));
  card.append(el('p','Preço anunciado, sem frete confirmado. Não é indicação de compra.','small muted'));
  if(safeLink(c.post_url))card.append(anchor('Ver postagem ↗',c.post_url));
  for(const proof of c.evidence||[])if(safeLink(proof.url))card.append(anchor(' Fonte técnica ↗',proof.url));
  list.append(card);
 }
}
function renderShortlist(){
 const container=$('top-three');container.replaceChildren();
 for(const [category,label] of Object.entries(labels)){
  const group=el('section',null,'rank-group');group.append(el('h3',label));
  const offers=data.top_three?.[category]||[];
  if(!offers.length){group.append(el('p','Nenhum candidato com nota técnica ≥ 8 e evidências suficientes.','rank-empty'));container.append(group);continue;}
  const grid=el('div',null,'rank-grid');
  offers.forEach((o,index)=>{
   const card=el('article',null,'rank-card tone-'+scoreTone(o.performance_score));
   card.append(el('span','#'+(index+1)+' · '+(o.combined_score?'Ranking com histórico':'Ranking provisório'),'rank-position'),el('h4',o.product),el('strong',brl(o.price_brl),'rank-price'));
   card.append(scoreBadge(o.performance_score));
   const scores=el('dl',null,'rank-scores');
   for(const [name,value] of [['Técnica',o.performance_score],['Preço',o.price_score],['Média ponderada',o.combined_score]]){const part=el('div');part.append(el('dt',name),el('dd',note(value)));scores.append(part);}card.append(scores);
   card.append(el('p',o.price_basis,'small muted'),el('p',o.purchase_ready?'Oferta aprovada individualmente; confirme o combo.':'Boa candidata técnica; compra condicionada às verificações abaixo.','rank-warning'));
   const tip=el('div',null,'fit-tip'),button=el('button','É boa para mim? ⓘ','quiet'),explanation=el('span',o.observation||'Consulte as evidências e os critérios da análise.','fit-tooltip');
   const tipId='fit-'+category+'-'+index;explanation.id=tipId;explanation.setAttribute('role','tooltip');button.setAttribute('aria-describedby',tipId);button.type='button';tip.append(button,explanation);card.append(tip);
   const concerns=[...(o.required_changes||[]),...(o.offer_reasons||[])];
   if(o.compatibility!=='compatible')concerns.unshift(compat[o.compatibility]||'Compatibilidade do conjunto pendente');
   if(concerns.length){const ul=el('ul',null,'small');for(const reason of concerns)ul.append(el('li',reason));card.append(ul);}
   const details=el('button','Ver critérios e fontes','outline');details.type='button';details.addEventListener('click',()=>showDetail(o));card.append(details);grid.append(card);
  });group.append(grid);container.append(group);
 }
}
function renderOffers(){
 const query=$('search').value.trim().toLocaleLowerCase('pt-BR'),category=$('category').value,status=$('status').value,sort=$('sort').value;
 filtered=data.offers.filter(o=>(category==='all'||o.category===category)&&(!query||[o.product,o.store,o.channel].join(' ').toLocaleLowerCase('pt-BR').includes(query))&&(status==='all'||(status==='below'?o.sufficient_history&&number(o.difference_pct)<0:o.review_status===status)));
 function ascending(a,b,key){return (number(a[key])??Infinity)-(number(b[key])??Infinity);}function descending(a,b,key){return (number(b[key])??-Infinity)-(number(a[key])??-Infinity);}
 filtered.sort((a,b)=>sort==='price'?ascending(a,b,'price_brl'):sort==='quality'?descending(a,b,'quality_score'):sort==='discount'?ascending(a,b,'difference_pct'):Date.parse(b.posted_at)-Date.parse(a.posted_at));
 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,totalPages-1);
 $('result-count').textContent=filtered.length+' oferta(s) · preços anunciados, sem frete';$('empty').hidden=filtered.length>0;$('offer-rows').replaceChildren();
 for(const o of filtered.slice(page*pageSize,(page+1)*pageSize)){const row=el('tr');const title=el('td');title.append(el('strong',o.product),pill(statusLabel(o),o.review_status==='approved'?'green':o.review_status==='rejected'?'red':'warning'),el('span',(labels[o.category]||o.category)+' · '+date(o.posted_at),'table-sub'));row.append(title);
 const price=el('td');price.append(el('span',brl(o.price_brl),'price'),el('span',o.payment_terms||'Pagamento não informado','table-sub'),el('span',o.store||'Loja não identificada','table-sub'));row.append(price);
 const quality=el('td');quality.append(el('span',note(o.quality_score),'score'),el('span',number(o.quality_score)==null?'Evidência insuficiente':'Referência = 8','table-sub'));row.append(quality);
 const value=el('td');value.append(el('span',note(o.value_score),'score'),el('span',number(o.value_score)==null?'Sem base comparável':'Índice relativo','table-sub'));row.append(value);
 const average=el('td');average.append(el('span',brl(o.historical_mean)),el('span',o.history_days?o.history_days+' dia(s) anterior(es)':'Sem histórico comparável','table-sub'));if(o.history_days&&!o.sufficient_history)average.append(el('span','Amostra pequena','table-sub'));row.append(average);
 const interpretation=el('td'),[text,kind]=verdict(o);interpretation.append(pill(text,kind));if(o.sufficient_history&&number(o.difference_pct)!=null)interpretation.append(el('span',(number(o.difference_pct)>0?'+':'')+note(o.difference_pct)+'% vs. média','table-sub '+(number(o.difference_pct)<0?'down':'up')));
 if(o.compatibility==='requires_bundle_change')interpretation.append(el('span','Alternativa exige avaliar outro conjunto','table-sub'));if(o.offer_reasons?.length)interpretation.append(el('span',o.offer_reasons.join(' '),'table-sub'));
 if(o.price_comparison?.status==='lower')interpretation.append(el('span','Menor que a oferta anterior comparável','table-sub down'));row.append(interpretation);
 const actions=el('td'),button=el('button','Ver análise','quiet');button.type='button';button.addEventListener('click',()=>showDetail(o));actions.append(button);row.append(actions);$('offer-rows').append(row);}
 $('page-number').textContent='Página '+(page+1)+' de '+totalPages;$('prev').disabled=page===0;$('next').disabled=page>=totalPages-1;
}
function showDetail(o){const target=$('detail-content');target.replaceChildren(el('h2',o.product),pill(statusLabel(o),o.review_status==='approved'?'green':'warning'));
 const grid=el('div',null,'detail-grid');for(const [name,value] of [['Preço anunciado',brl(o.price_brl)],['Qualidade técnica',note(o.quality_score)],['Custo-benefício',note(o.value_score)],['Oportunidade',note(o.opportunity_score)],['Média anterior',brl(o.historical_mean)],['Mediana anterior',brl(o.historical_median)],['Mínimo anterior',brl(o.historical_min)],['Dias comparáveis',o.history_days]]){const cell=el('div',name);cell.append(el('strong',value));grid.append(cell);}target.append(grid);
 target.append(el('p',(relation[o.relation]||'Comparação pendente')+' · '+(o.review_status==='approved'?(compat[o.compatibility]||'Compatibilidade pendente'):'Compatibilidade ainda não confirmada'),'small'));
 if(o.observation){target.append(el('h3','Observação da análise'),el('p',o.observation,'small'),el('p','Afirmação gerada pela análise; as fontes abaixo não garantem, sozinhas, toda a interpretação.','small muted'));}
 target.append(el('h3','Condições do anúncio'));const terms=el('ul',null,'small');for(const [name,value] of [['Pagamento',o.payment_terms],['Condição',o.product_condition],['Cupom',o.coupon],['Loja',o.store],['Frete',null]])terms.append(el('li',name+': '+(value||'não identificado')));target.append(terms);
 if(o.reasons?.length){target.append(el('h3','O que falta confirmar'));const reasons=el('ul',null,'small');for(const reason of o.reasons)reasons.append(el('li',reason));target.append(reasons);}
 target.append(el('h3','Comparação com ofertas anteriores'));const comparison=o.price_comparison||{};target.append(el('p',comparison.previous_best_brl?'Menor preço anterior: '+brl(comparison.previous_best_brl)+'. Diferença desta oferta: '+brl(comparison.difference_brl)+'.':'Ainda não há uma comparação de preço anterior com condições suficientes.','small'));
 if(o.criteria?.length){target.append(el('h3','Critérios da avaliação'));const list=el('ul',null,'small');for(const c of o.criteria)list.append(el('li',({"gaming": "Desempenho em jogos", "memory": "Memória", "cooling_variant": "Refrigeração da variante", "power_connectors": "Potência e conectores", "platform": "Plataforma", "cooling_power": "Refrigeração e consumo", "cpu_bios": "CPU e BIOS", "vrm": "Alimentação da placa-mãe", "expansion": "Expansão", "capacity_kit": "Capacidade e kit", "latency_bandwidth": "Latência e frequência", "capacity_interface": "Capacidade e interface", "real_workloads": "Desempenho em uso real", "endurance": "Durabilidade", "warranty_revision": "Garantia e revisão", "electrical_tests": "Testes elétricos", "protections": "Proteções", "warranty": "Garantia", "airflow": "Ventilação", "clearances": "Espaço para componentes", "fans_cost": "Ventoinhas e custo adicional", "build_io": "Construção e conexões", "thermal_noise": "Temperatura e ruído", "mounting": "Montagem", "clearance": "Espaço disponível"}[c.id]||c.id)+': '+({meets:'atende à referência',exceeds:'supera a referência',below:'abaixo da referência',unknown:'não comprovado'}[c.level]||c.level)+' — '+c.reason));target.append(list,el('p',o.score_basis||'','small muted'));}
 const value=o.value_comparison||{};if(value.previous_product)target.append(el('p','Custo-benefício em relação a '+value.previous_product+': '+({better:'melhor',equal:'igual',worse:'pior'}[value.status]||'pendente')+'. Preço anunciado por ponto técnico, sem frete.','small'));
 if(!o.sufficient_history)target.append(el('p','Não há cinco dias de histórico comparável para classificar esta oferta como oportunidade.','notice'));
 if(o.evidence?.length){target.append(el('h3','Evidências da avaliação'));for(const source of o.evidence){if(safeLink(source.url))target.append(anchor('Abrir fonte técnica ↗',source.url));if(source.quote)target.append(el('blockquote',source.quote));}}
 const links=el('div',null,'detail-links');if(safeLink(o.offer_url))links.append(anchor('Abrir oferta ↗',o.offer_url));if(safeLink(o.post_url))links.append(anchor('Ver postagem no Telegram ↗',o.post_url));target.append(links,el('p','Publicado em '+date(o.posted_at)+' · '+o.channel,'small muted'));$('detail').showModal();
}
function renderHistory(){const group=data.series[$('history-product').value];$('history-empty').hidden=!!group;$('history-content').hidden=!group;if(!group)return;
 const points=group.points;const prices=points.map(p=>Number(p.price));const sorted=[...prices].sort((a,b)=>a-b);const mean=prices.reduce((a,b)=>a+b,0)/prices.length;const mid=Math.floor(sorted.length/2),median=sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
 $('history-min').textContent=brl(sorted[0]);$('history-mean').textContent=brl(mean);$('history-median').textContent=brl(median);$('history-days').textContent=points.length;
 $('history-note').textContent='Mesmo modelo e condições: '+group.terms+'. Um mínimo por dia, últimos 30 dias. '+(points.length<5?'Amostra pequena: ainda não permite concluir que uma oferta está barata.':'Este resumo inclui o último dia; a média usada para avaliar cada oferta considera somente dias anteriores.');
 $('history-rows').replaceChildren();for(const p of points){const tr=el('tr');tr.append(el('td',day(p.date)),el('td',brl(p.price)));$('history-rows').append(tr);}
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 900 250');svg.setAttribute('role','img');svg.setAttribute('aria-label','Menor preço por dia de '+group.product+'. Valores disponíveis na tabela abaixo.');
 function node(tag,attrs,text){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;svg.append(n);return n;}
 const low=Math.min(...prices)*.96,high=Math.max(...prices)*1.04,range=high-low||1;const y=v=>195-(v-low)/range*160,x=i=>95+i*770/Math.max(points.length-1,1);
 for(let i=0;i<4;i++){const value=low+range*i/3;node('line',{x1:95,x2:865,y1:y(value),y2:y(value),stroke:'#e4eade','stroke-dasharray':'3 5'});node('text',{x:0,y:y(value)+4,fill:'#768677','font-size':11},brl(value));}
 node('line',{x1:95,x2:865,y1:y(mean),y2:y(mean),stroke:'#ba954e','stroke-dasharray':'5 4'});node('text',{x:95,y:15,fill:'#927033','font-size':11},'Linha tracejada: média do período exibido');
 node('polyline',{points:points.map((p,i)=>x(i)+','+y(Number(p.price))).join(' '),fill:'none',stroke:'#377d5d','stroke-width':3});points.forEach((p,i)=>{const circle=node('circle',{cx:x(i),cy:y(Number(p.price)),r:5,fill:'#377d5d',stroke:'white','stroke-width':2});const title=document.createElementNS(ns,'title');title.textContent=day(p.date)+': '+brl(p.price);circle.append(title);if(i===0||i===points.length-1)node('text',{x:x(i),y:230,'text-anchor':i===0?'start':'end',fill:'#768677','font-size':11},day(p.date));});$('chart').replaceChildren(svg);
}
function download(content,name,type){const a=el('a');const url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('copy-missing').addEventListener('click',async()=>{const list=data.coverage.filter(c=>data.manual_review?.messages?!(data.manual_review.shortlist[c.category]||[]).length:!['candidate'].includes(c.status));const text='Peças para pesquisar ou confirmar\n\n'+list.map(c=>c.label+': '+c.reference+' — '+(c.status==='missing'?'não encontrada':c.status==='no_price'?'sem preço identificado':'aguarda validação')).join('\n');try{await navigator.clipboard.writeText(text);$('copy-status').textContent='Lista copiada. Inclui peças ausentes e peças ainda pendentes.';}catch{download(text,'pecas-para-pesquisar.txt','text/plain;charset=utf-8');$('copy-status').textContent='Lista salva como arquivo de texto.';}});
$('export-csv').addEventListener('click',()=>{const rows=[['Produto','Categoria','Preço BRL','Nota técnica','Custo-benefício','Média anterior BRL','Dias de histórico','Situação','Postagem'],...filtered.map(o=>[o.product,labels[o.category],o.price_brl,o.quality_score,o.value_score,o.historical_mean,o.history_days,statuses[o.review_status],o.post_url])];const csv=rows.map(row=>row.map(value=>{let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}).join(';')).join('\r\n');download('\ufeff'+csv,'ofertas-radar-pc.csv','text/csv;charset=utf-8');});
async function load(){try{let loaded;try{const response=await fetch('data.json',{cache:'no-store'});if(!response.ok)throw Error();loaded=await response.json();}catch{loaded=window.RADAR_DATA;}if(!loaded||loaded.schema_version!==2||!Array.isArray(loaded.offers))throw Error();data=loaded;$('error').hidden=true;renderOverview();renderDailySummary();renderManual();renderPromising();renderShortlist();renderOffers();const old=$('history-product').value;$('history-product').replaceChildren();for(const [id,group] of Object.entries(data.series))$('history-product').append(new Option(group.product+' · '+group.terms,id));if(data.series[old])$('history-product').value=old;if(!Object.keys(data.series).length)$('history-product').append(new Option('Sem condições suficientes para comparar',''));renderHistory();}catch{$('error').hidden=false;$('error').textContent='Não foi possível carregar a exportação. Tente atualizar ou use a cópia mais recente disponibilizada pelo monitor.';$('updated').textContent='Dados indisponíveis';}}
for(const [key,label] of Object.entries(labels))$('category').append(new Option(label,key));
for(const id of ['search','category','status','sort'])$(id).addEventListener('input',()=>{page=0;renderOffers();});
$('prev').addEventListener('click',()=>{page--;renderOffers();});$('next').addEventListener('click',()=>{page++;renderOffers();});$('history-product').addEventListener('change',renderHistory);$('refresh').addEventListener('click',load);$('close-detail').addEventListener('click',()=>$('detail').close());for(const a of document.querySelectorAll('.sidebar nav a'))a.setAttribute('aria-label',a.querySelector('span').textContent);

const manualDecisions={shortlist:'Selecionada para comparar',not_selected:'Não selecionada',insufficient_evidence:'Analisada · informação insuficiente',outside_scope:'Fora do perfil',announcement:'Comunicado'};
let manualLimit=25;
function renderDailySummary(){
 const root=$('daily-summary-content');root.replaceChildren();const summary=data.daily_summary;
 if(!summary){root.append(el('p','A orientação aguarda uma revisão editorial neste chat.','muted'));return;}
 $('daily-summary-date').textContent='Resumo de '+day(summary.date)+' · '+date(summary.generated_at);
 root.append(el('p',summary.headline,'daily-verdict'),el('p',summary.composition));
 const list=el('ul',null,'daily-picks');
 for(const pick of summary.picks||[]){const row=el('li');row.append(el('strong',labels[pick.category]+': '+pick.product),el('p',brl(pick.price_brl)+' · Nota '+note(pick.score)+' · '+pick.price_signal));
 const details=el('details');details.append(el('summary','Por que considerar'),el('p',pick.observation),anchor('Ver postagem',pick.post_url));row.append(details);list.append(row);}
 if(summary.sources?.length){const sources=el('details');sources.append(el('summary','Fontes da orientação'));for(const source of summary.sources)sources.append(anchor(source.title,source.url),el('br'));root.append(sources);}
 root.append(list,el('p',summary.method+' Consulte os cards para os dados mais recentes.','small muted'));
}
function renderManualAudit(){
 const entries=(data.manual_review?.items||[]).filter(e=>!$('manual-search').value||[e.product,e.observation,e.category].join(' ').toLocaleLowerCase().includes($('manual-search').value.toLocaleLowerCase()));
 $('manual-audit-count').textContent=entries.length+' ofertas de peças encontradas. Repetições preservadas na auditoria; não multiplicam os cards.';
 $('manual-audit').replaceChildren();
 for(const e of entries.slice(0,manualLimit)){
  const details=el('details');details.append(el('summary',e.product+' · '+brl(e.price_brl)+' · '+manualDecisions[e.decision]));
  details.append(el('p',e.observation),el('p','Nota editorial: '+note(e.editorial_score)+' · '+date(e.posted_at),'small'));
  if(e.missing?.length)details.append(el('p','Falta confirmar: '+e.missing.join('; '),'small'));
  details.append(anchor('Mensagem original ↗',e.post_url));$('manual-audit').append(details);
 }
 $('manual-more').hidden=entries.length<=manualLimit;
}
function renderManual(){
 const m=data.manual_review;$('manual-review').hidden=!m?.messages;if(!m?.messages)return;
 const selected=Object.values(m.shortlist).flat();
 $('manual-summary').textContent=m.messages+' mensagens analisadas · '+(m.decisions.shortlist||0)+' mensagens com peças selecionadas · '+(m.decisions.not_selected||0)+' não selecionadas · '+(m.decisions.insufficient_evidence||0)+' com informação insuficiente · '+((m.decisions.outside_scope||0)+(m.decisions.announcement||0))+' fora do perfil/comunicados. Revisão em '+date(m.last_reviewed_at)+'.';
 $('manual-method').textContent=m.methodology;$('manual-price').textContent=m.price_methodology;
 $('offer-count').textContent=selected.length;$('offer-count').previousElementSibling.textContent='Modelos na seleção editorial';$('offer-count').nextElementSibling.textContent='Até 3 por categoria · nota editorial ≥ 8';
 $('coverage-count').textContent=Object.keys(m.shortlist).filter(k=>k!=='cooler'&&labels[k]&&m.shortlist[k].length).length+' / 7';
 $('manual-results').replaceChildren();
 for(const [cat,label] of Object.entries(labels)){
  const group=el('section',null,'rank-group');group.append(el('h3',label));const entries=m.shortlist[cat]||[];
  if(!entries.length){group.append(el('p','Nenhuma oferta selecionada com evidência suficiente nesta revisão. Pesquise um modelo com especificações e garantia identificáveis.','rank-empty'));}
  const grid=el('div',null,'rank-grid');
  for(const e of entries){const card=el('article',null,'manual-card manual-'+scoreTone(e.editorial_score));
   card.append(el('p',e.origin==='deepseek'?'Análise DeepSeek':e.origin==='rules'?'Filtro de compatibilidade':'Revisão manual','small muted'),el('h4',e.product),el('strong',brl(e.price_brl),'manual-price'),scoreBadge(e.editorial_score,'Nota editorial'),el('p',e.observation));
   card.append(el('p','Preço: '+note(e.price_score)+' · Média das notas: '+note(e.combined_score),'small'),el('p',e.price_note||'Histórico insuficiente','small muted'));if(e.historical_mean)card.append(el('p','Média observada: '+brl(e.historical_mean)+' · '+e.history_days+' dia(s) comparáveis','small'));
   if(e.purchase_context){const pc=e.purchase_context;card.append(el('p',pc.reason,'small'));if(pc.budget_share_pct)card.append(el('p','Esta peça usa '+Number(pc.budget_share_pct).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'% do orçamento-alvo','small muted'));}
   if(e.calibration_note)card.append(el('p',e.calibration_note,'small muted'));
   const why=el('abbr','Por que serve para mim?');why.title=e.observation;card.append(why);
   card.append(el('p','Pagamento: '+(e.payment_terms||'não identificado')+' · Cupom: '+(e.coupon||'não identificado'),'small'));
   card.append(el('p','Confirmar: '+(e.missing||[]).join('; '),'small muted'));
   card.append(el('p','PC completo ainda não aprovado','small muted'),el('p','Anúncio de '+date(e.posted_at),'small muted'));
   card.append(anchor('Ver oferta ↗',e.offer_url),document.createTextNode(' · '),anchor('Postagem ↗',e.post_url));
   const sources=el('details');sources.append(el('summary','Evidências técnicas'));for(const source of e.sources||[])sources.append(anchor(source.title+' ↗',source.url),el('br'));card.append(sources);grid.append(card);
  }
  group.append(grid);$('manual-results').append(group);
 }
 const am4=(m.shortlist.cpu||[]).filter(e=>['ryzen5600x','ryzen5700x'].includes(e.model_key));
 const partial=[am4[0],(m.shortlist.motherboard||[]).find(e=>/B550/i.test(e.product)),...['gpu','psu','case','cooler'].map(k=>m.shortlist[k]?.[0])].filter(Boolean);
 const sum=partial.reduce((n,e)=>n+Number(e.price_brl),0);const absent=Object.keys(labels).filter(k=>!partial.some(e=>e.category===k)).map(k=>labels[k]).join(', ');
 $('manual-budget').textContent='Rota AM4 exploratória: '+partial.map(e=>labels[e.category]).join(' + ')+' somam '+brl(sum)+'. Restam '+brl(Number(data.hard_budget_brl)-sum)+' do teto para '+absent+', fretes e eventuais ajustes. Não é um PC completo nem uma montagem validada; ofertas e cupons podem ter condições diferentes.';
 $('coverage').replaceChildren();
 for(const c of data.coverage){const entries=m.shortlist[c.category]||m.shortlist[c.key]||[];const card=el('article',null,'part-card');card.append(el('span',c.label,'part-label'),pill(entries.length?'Candidato editorial; montagem não aprovada':'Pesquisar alternativa',entries.length?'green':'warning'),el('span','Referência: '+c.reference,'small muted'),el('strong',brl(entries[0]?.price_brl)));$('coverage').append(card);}
 $('subtotal').textContent=brl(sum);$('subtotal-note').textContent='Rota AM4 parcial indicada acima; faltam '+absent+', fretes e validação do conjunto.';
 $('missing-summary').textContent='Consultar a orientação editorial para comparar o custo das plataformas. Confirmar peças faltantes, BIOS, dimensões e condições antes da compra.';
 for(const id of ['shortlist','market']){const hidden=!data.offers.length;$(id).hidden=hidden;const nav=document.querySelector('.sidebar a[href="#'+id+'"]');if(nav)nav.href=hidden?'#manual-review':'#'+id;}
 $('promising').hidden=!(data.promising||[]).length;
 renderManualAudit();
}
$('manual-search').addEventListener('input',()=>{manualLimit=25;renderManualAudit();});
$('manual-more').addEventListener('click',()=>{manualLimit+=25;renderManualAudit();});

load();
