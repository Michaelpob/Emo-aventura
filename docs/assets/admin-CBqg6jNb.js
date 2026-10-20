import{e as X,A as $,i as aa}from"./supabaseClient-Ba5D93oV.js";import{createClient as ga}from"./supabase-CcCxm0Mt.js";import{C as j,B as ha,a as ya,L as _a,b as $a,P as wa,D as Sa,A as Ea,c as ka,d as ja,T as Ca,p as La,e as Aa,i as xa}from"./chart-BK0e6cPM.js";const Da="".trim(),Ia="".trim(),Na=5,Ta=120*1e3,Ra=1800*1e3;let V=null,T=0,ea=0;function B({recordar:a=!0}={}){return X?(V=ga(Da,Ia,{auth:{persistSession:!0,autoRefreshToken:!0,detectSessionInUrl:!1,storage:a?window.localStorage:window.sessionStorage,storageKey:"emoaventura.admin.auth"}}),V):null}function C(){return V??B({recordar:!0})}function Ma(a){const e=String(a??"").trim().toLowerCase();return e?e==="admin"||e==="administrador"?$:e:""}function O(a){return!!a&&String(a).trim().toLowerCase()===$}function U(){const a=ea-Date.now();return a>0?Math.ceil(a/1e3):0}function K(){T+=1,T>=Na&&(ea=Date.now()+Ta,T=0)}function za(a){const e=String(a??"");if(e.length<10)return 0;let t=1;return/[a-zA-Z]/.test(e)&&/\d/.test(e)&&(t+=1),e.length>=14&&/[^a-zA-Z0-9]/.test(e)&&(t+=1),Math.min(3,t)}function ta(a){const e=String(a??"");return e.length>=10&&/[a-zA-Z]/.test(e)&&/\d/.test(e)}async function qa(){const a=C();if(!a)return null;try{const{data:e}=await a.auth.getSession(),t=e?.session?.user?.email??null;return t?O(t)?e.session:(await a.auth.signOut(),null):null}catch{return null}}async function Pa(a,e,t){if(U()>0)return{ok:!1,mensaje:`Demasiados intentos. Vuelve a probar en ${U()} s.`};const s=Ma(a);if(!O(s))return K(),{ok:!1,mensaje:"Usuario o contraseña incorrectos."};const n=B({recordar:t});if(!n)return{ok:!1,mensaje:"El panel no está configurado todavía."};try{const{data:o,error:i}=await n.auth.signInWithPassword({email:s,password:e});return i||!o?.session?(K(),{ok:!1,mensaje:"Usuario o contraseña incorrectos."}):O(o.session.user?.email)?(T=0,{ok:!0}):(await n.auth.signOut(),{ok:!1,mensaje:"Acceso no autorizado."})}catch{return{ok:!1,mensaje:"No se pudo conectar. Revisa tu conexión e inténtalo otra vez."}}}async function sa(){const a=C();if(!a)return{ok:!1,mensaje:"El panel no está configurado todavía."};try{const{error:e}=await a.auth.signInWithOtp({email:$,options:{shouldCreateUser:!1}});if(e){const t=String(e.message??"").toLowerCase();return t.includes("rate")||t.includes("seconds")?{ok:!1,mensaje:"Se han pedido muchos códigos seguidos. Espera un minuto y vuelve a intentarlo."}:{ok:!1,mensaje:"No se pudo enviar el código. Revisa la configuración de correo en Supabase."}}return{ok:!0}}catch{return{ok:!1,mensaje:"No se pudo conectar. Revisa tu conexión e inténtalo otra vez."}}}async function Va(a){const e=C();if(!e)return{ok:!1,mensaje:"El panel no está configurado todavía."};const t=String(a??"").replace(/\D/g,"");if(t.length!==6)return{ok:!1,mensaje:"El código tiene 6 dígitos."};try{const{data:s,error:n}=await e.auth.verifyOtp({email:$,token:t,type:"email"});return n||!s?.session?String(n?.message??"").toLowerCase().includes("expired")?{ok:!1,mensaje:"El código ya venció. Pide uno nuevo."}:{ok:!1,mensaje:"El código no es correcto. Revísalo o pide uno nuevo."}:{ok:!0}}catch{return{ok:!1,mensaje:"No se pudo comprobar el código. Inténtalo otra vez."}}}async function Oa(a){const e=C();if(!e)return{ok:!1,mensaje:"El panel no está configurado todavía."};if(!ta(a))return{ok:!1,mensaje:"La contraseña necesita 10 caracteres como mínimo, con al menos una letra y un número."};try{const{error:t}=await e.auth.updateUser({password:a});return t?{ok:!1,mensaje:"No se pudo guardar la contraseña. Inténtalo otra vez."}:{ok:!0}}catch{return{ok:!1,mensaje:"No se pudo conectar. Inténtalo otra vez."}}}async function Ua(){try{await C()?.auth.signOut()}catch{}}j.register(ha,ya,_a,$a,wa,Sa,Ea,ka,ja,Ca,La,Aa,xa);j.defaults.font.family='Inter, ui-sans-serif, system-ui, "Segoe UI", sans-serif';j.defaults.color="#43606f";j.defaults.plugins.legend.labels.usePointStyle=!0;j.defaults.plugins.legend.labels.boxWidth=10;function oa(a){const e=document.createElement("canvas");e.width=8,e.height=8;const t=e.getContext("2d");return t.fillStyle=a,t.fillRect(0,0,8,8),t.strokeStyle="rgba(255,255,255,0.55)",t.lineWidth=2.5,t.beginPath(),t.moveTo(-2,8),t.lineTo(8,-2),t.moveTo(2,10),t.lineTo(10,2),t.stroke(),t.createPattern(e,"repeat")}const M=new Map;function L(a,e){const t=document.getElementById(a);if(!t)return null;M.get(a)?.destroy();const s=new j(t,e);return M.set(a,s),s}function ia(){M.forEach(a=>a.destroy()),M.clear()}const z=a=>({beginAtZero:!0,ticks:{precision:0},title:{display:!0,text:a,font:{weight:"700"}},grid:{color:"rgba(16,44,54,0.08)"}});function Ha(a){return L("g-visitas-isla",{type:"bar",data:{labels:a.map(e=>`${e.emoji} ${e.nombre}`),datasets:[{label:"Visitas",data:a.map(e=>e.visitas),backgroundColor:a.map(e=>e.id==="frustration"?oa(e.color):e.color),borderColor:a.map(e=>e.color),borderWidth:1,borderRadius:6}]},options:{maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{callbacks:{label:e=>`${e.parsed.y} visitas`}}},scales:{y:z("Visitas"),x:{grid:{display:!1}}}}})}function Ba(a){return L("g-partidas",{type:"bar",data:{labels:a.map(e=>`${e.emoji} ${e.nombre}`),datasets:[{label:"Partidas iniciadas",data:a.map(e=>e.iniciadas),backgroundColor:"rgba(16,44,54,0.22)",borderColor:"#102c36",borderWidth:1,borderRadius:6},{label:"Partidas completadas",data:a.map(e=>e.completadas),backgroundColor:a.map(e=>e.id==="frustration"?oa(e.color):e.color),borderColor:a.map(e=>e.color),borderWidth:1,borderRadius:6}]},options:{maintainAspectRatio:!1,plugins:{tooltip:{callbacks:{label:e=>`${e.dataset.label}: ${e.parsed.y}`}}},scales:{y:z("Partidas"),x:{grid:{display:!1}}}}})}function Wa(a,e){return L("g-dias",{type:"line",data:{labels:a,datasets:e.map(t=>({label:t.total?"Total":`${t.emoji} ${t.nombre}`,data:t.datos,borderColor:t.total?"#102c36":t.color,backgroundColor:t.total?"rgba(16,44,54,0.08)":t.color,borderWidth:t.total?3:2,borderDash:t.id==="frustration"?[6,4]:[],pointRadius:2.5,pointHoverRadius:5,tension:.3,fill:!!t.total}))},options:{maintainAspectRatio:!1,interaction:{mode:"index",intersect:!1},plugins:{legend:{position:"bottom"},tooltip:{callbacks:{label:t=>`${t.dataset.label}: ${t.parsed.y} visitas`}}},scales:{y:z("Visitas"),x:{title:{display:!0,text:"Día",font:{weight:"700"}},grid:{display:!1}}}}})}function Ga(a){return L("g-horas",{type:"bar",data:{labels:a.map((e,t)=>`${String(t).padStart(2,"0")} h`),datasets:[{label:"Visitas",data:a,backgroundColor:"#2f7fb5",borderRadius:6}]},options:{maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{callbacks:{title:e=>`A las ${e[0].label}`,label:e=>`${e.parsed.y} visitas`}}},scales:{y:z("Visitas"),x:{title:{display:!0,text:"Hora del día (America/Bogotá)",font:{weight:"700"}},grid:{display:!1}}}}})}const na={mobile:"📱 Móvil",tablet:"🖥️ Tableta",desktop:"💻 Escritorio"};function Za(a){return L("g-dispositivos",{type:"doughnut",data:{labels:a.map(e=>na[e.device]??e.device),datasets:[{data:a.map(e=>e.sesiones),backgroundColor:["#2f7fb5","#f5a524","#2e9e6b","#5947a5"],borderColor:"#fff",borderWidth:2}]},options:{maintainAspectRatio:!1,cutout:"58%",plugins:{legend:{position:"bottom"},tooltip:{callbacks:{label:e=>{const t=e.dataset.data.reduce((s,n)=>s+n,0)||1;return`${e.label}: ${e.parsed} sesiones (${Math.round(e.parsed/t*100)} %)`}}}}}})}function Fa(a,e,t,s){return L(a,{type:"line",data:{labels:e,datasets:[{label:"Visitas",data:t,borderColor:s,backgroundColor:`${s}22`,borderWidth:2,pointRadius:2,tension:.3,fill:!0}]},options:{maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{callbacks:{label:n=>`${n.parsed.y} visitas`}}},scales:{y:{beginAtZero:!0,ticks:{precision:0}},x:{grid:{display:!1}}}}})}const ra=aa.map(a=>({id:a.id,nombre:a.displayName,emocion:a.name,emoji:a.emoji??"",color:a.palette.ui,glow:a.palette.glow})),la=new Map(ra.map(a=>[a.id,a])),ca=[{id:"hoy",texto:"Hoy",dias:0},{id:"7d",texto:"7 días",dias:7},{id:"30d",texto:"30 días",dias:30},{id:"todo",texto:"Todo",dias:null},{id:"rango",texto:"Personalizado",dias:void 0}];function Ka(a,e={}){const t=new Date,s=new Date(t.getTime()+6e4);let n;if(a==="hoy")n=new Date(t),n.setHours(0,0,0,0);else if(a==="7d"||a==="30d"){const o=a==="7d"?7:30;n=new Date(t.getTime()-o*24*3600*1e3)}else if(a==="rango"&&e.desde&&e.hasta){n=new Date(`${e.desde}T00:00:00`);const o=new Date(`${e.hasta}T00:00:00`);return o.setDate(o.getDate()+1),Y(n,o)}else n=new Date("2020-01-01T00:00:00Z");return Y(n,s)}function Y(a,e){const t=e.getTime()-a.getTime();return{desde:a.toISOString(),hasta:e.toISOString(),desdeAntes:new Date(a.getTime()-t).toISOString(),hastaAntes:a.toISOString()}}async function E(a,e,t,s){const{data:n,error:o}=await a.rpc(e,{p_from:t,p_to:s});if(o)throw new Error(o.message);return n??[]}async function Ya(a){const e=C();if(!e)throw new Error("sin-configurar");const{desde:t,hasta:s,desdeAntes:n,hastaAntes:o}=a,[i,l,c,u,_,b]=await Promise.all([E(e,"admin_summary",t,s),E(e,"admin_island_stats",t,s),E(e,"admin_daily_visits",t,s),E(e,"admin_hourly_visits",t,s),E(e,"admin_devices",t,s),E(e,"admin_summary",n,o)]);return{resumen:i[0]??J(),resumenAntes:b[0]??J(),islas:ra.map(D=>{const g=l.find(I=>I.island_id===D.id)??{};return{...D,visitas:Number(g.visitas??0),sesiones:Number(g.sesiones_unicas??0),iniciadas:Number(g.partidas_iniciadas??0),completadas:Number(g.partidas_completas??0),tasa:Number(g.tasa_finalizacion??0),duracion:Number(g.duracion_promedio??0),ultima:g.ultima_visita??null}}),dias:c,horas:u,dispositivos:_}}function J(){return{visitas:0,sesiones_unicas:0,partidas_iniciadas:0,partidas_completas:0,tasa_finalizacion:0,duracion_promedio:0}}const d=a=>Number(a??0).toLocaleString("es-CO");function da(a){const e=Math.max(0,Math.round(Number(a??0)/1e3));return`${String(Math.floor(e/60)).padStart(2,"0")}:${String(e%60).padStart(2,"0")}`}function Ja(a){if(!a)return"sin visitas";const e=Math.round((Date.now()-new Date(a).getTime())/6e4);if(e<1)return"hace un momento";if(e<60)return`hace ${e} min`;const t=Math.round(e/60);if(t<24)return`hace ${t} h`;const s=Math.round(t/24);return s===1?"ayer":`hace ${s} días`}function N(a,e){const t=Number(a??0),s=Number(e??0);if(!s)return t?{clase:"sube",texto:"nuevo"}:{clase:"igual",texto:"sin cambios"};const n=Math.round((t-s)/s*100);return n===0?{clase:"igual",texto:"igual que antes"}:{clase:n>0?"sube":"baja",texto:`${n>0?"▲":"▼"} ${Math.abs(n)} % vs. periodo anterior`}}const p=a=>String(a??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]);function Qa(a){a.innerHTML=`
    <section class="ad-seccion" aria-busy="true" aria-live="polite">
      <p class="solo-lectores">Cargando estadísticas…</p>
      <div class="ad-metricas">${'<div class="tarjeta ad-esqueleto"></div>'.repeat(4)}</div>
      <div class="tarjeta ad-esqueleto" style="min-height:120px"></div>
      <div class="ad-islas">${'<div class="tarjeta ad-esqueleto" style="min-height:190px"></div>'.repeat(6)}</div>
    </section>`}function Xa(a){a.innerHTML=`
    <section class="tarjeta ad-vacio">
      <h2>Aún no hay visitas en este periodo</h2>
      <p>Las estadísticas empiezan a contar desde que se publicó esta versión del juego.
         Prueba con un periodo más amplio, por ejemplo «Todo».</p>
    </section>`}function ae(a,e,t){a.innerHTML=`
    <section class="tarjeta ad-error" role="alert">
      <h2>No se pudieron cargar los datos</h2>
      <p>${p(e)}</p>
      <button class="btn" type="button" data-reintentar>Reintentar</button>
    </section>`,a.querySelector("[data-reintentar]")?.addEventListener("click",t)}function ee(a,e,t){const{resumen:s,resumenAntes:n,islas:o,dias:i,horas:l,dispositivos:c}=e,u=Number(s.visitas??0);if(!u&&!Number(s.partidas_iniciadas??0)){Xa(a);return}const _=[...o].sort((r,h)=>h.visitas-r.visitas),b=_[0],D=Math.max(1,...o.map(r=>r.visitas));let g=0,I=null;const Z=_.map((r,h)=>(r.visitas!==I&&(g=h+1,I=r.visitas),{...r,puesto:g})),va=r=>r===1?"🥇":r===2?"🥈":r===3?"🥉":"",ba=[{nombre:"Visitas totales",valor:d(s.visitas),d:N(s.visitas,n.visitas)},{nombre:"Sesiones únicas",valor:d(s.sesiones_unicas),d:N(s.sesiones_unicas,n.sesiones_unicas)},{nombre:"Partidas completadas",valor:d(s.partidas_completas),d:N(s.partidas_completas,n.partidas_completas)},{nombre:"Tasa de finalización",valor:`${Number(s.tasa_finalizacion??0)} %`,d:N(s.tasa_finalizacion,n.tasa_finalizacion)}];a.innerHTML=`
    <section class="ad-seccion" aria-label="Resumen general">
      <div class="ad-metricas">
        ${ba.map(r=>`
          <article class="tarjeta ad-metrica">
            <span class="ad-metrica__valor">${r.valor}</span>
            <span class="ad-metrica__nombre">${r.nombre}</span>
            <span class="ad-metrica__delta ad-metrica__delta--${r.d.clase}">${r.d.texto}</span>
          </article>`).join("")}
      </div>
    </section>

    <section class="ad-seccion" aria-label="Isla más visitada">
      <article class="tarjeta ad-top" style="--c:${b.color}">
        <span class="ad-top__emoji" aria-hidden="true">${b.emoji}</span>
        <div class="ad-top__datos">
          <span class="eyebrow">Isla más visitada</span>
          <span class="ad-top__nombre">${p(b.nombre)}</span>
          <span class="ad-top__cifra">${d(b.visitas)} visitas · ${u?Math.round(b.visitas/u*100):0} % del total · ${p(b.emocion)}</span>
        </div>
        <span class="ad-top__trofeo" aria-hidden="true">🏆</span>
      </article>
    </section>

    <section class="ad-seccion" aria-label="Ranking de islas">
      <div class="ad-seccion__titulo"><h2>Ranking de islas</h2><span class="ad-actualizado">${p(t)}</span></div>
      <div class="tarjeta">
        <ol class="ad-rank">
          ${Z.map(r=>`
            <li style="--c:${r.color}">
              <span class="ad-rank__pos">${va(r.puesto)||r.puesto}</span>
              <span class="ad-rank__emoji" aria-hidden="true">${r.emoji}</span>
              <span class="ad-rank__barra">
                <span class="ad-rank__relleno" style="width:${Math.round(r.visitas/D*100)}%" data-rayas="${r.id==="frustration"}"></span>
                <span class="ad-rank__texto">${p(r.nombre)} · ${p(r.emocion)}</span>
              </span>
              <span class="ad-rank__cifra">${d(r.visitas)} · ${u?Math.round(r.visitas/u*100):0} %</span>
            </li>`).join("")}
        </ol>
      </div>
    </section>

    <section class="ad-seccion" aria-label="Estadísticas por isla">
      <div class="ad-seccion__titulo"><h2>Estadísticas por isla</h2><span class="ad-actualizado">Toca una tarjeta para ver su gráfica por día</span></div>
      <div class="ad-islas">
        ${o.map(r=>`
          <button class="ad-isla" type="button" data-isla="${r.id}" style="--c:${r.color};--glow:${r.glow}" aria-expanded="false">
            <span class="ad-isla__franja"></span>
            <span class="ad-isla__cuerpo">
              <span class="ad-isla__cabecera">
                <span class="ad-isla__emoji" aria-hidden="true">${r.emoji}</span>
                <span>
                  <span class="ad-isla__nombre">${p(r.nombre)}</span>
                  <span class="ad-isla__emocion">${p(r.emocion)}</span>
                </span>
              </span>
              <span class="ad-isla__datos">
                <span class="ad-isla__dato"><b>${d(r.visitas)}</b>visitas</span>
                <span class="ad-isla__dato"><b>${d(r.sesiones)}</b>sesiones únicas</span>
                <span class="ad-isla__dato"><b>${d(r.iniciadas)}</b>partidas iniciadas</span>
                <span class="ad-isla__dato"><b>${d(r.completadas)}</b>completadas</span>
              </span>
              <span class="ad-isla__barra"><i style="width:${Math.min(100,r.tasa)}%"></i></span>
              <span class="ad-isla__pie">
                <span>${r.tasa} % de finalización</span>
                <span>⏱ ${da(r.duracion)}</span>
              </span>
              <span class="ad-isla__pie"><span>Última visita: ${Ja(r.ultima)}</span></span>
            </span>
            <span class="ad-isla__detalle oculto"><canvas id="g-isla-${r.id}" height="160"></canvas></span>
          </button>`).join("")}
      </div>
    </section>

    <section class="ad-seccion" aria-label="Gráficas comparativas">
      <div class="ad-seccion__titulo"><h2>Gráficas comparativas</h2></div>
      <div class="ad-graficas">
        ${A("g-visitas-isla","Visitas por isla","Cuántas veces se abrió cada isla en el periodo.")}
        ${A("g-partidas","Partidas iniciadas y completadas","Comparación por isla.")}
        ${A("g-dias","Visitas por día","Una línea por isla, más el total. Puedes ocultar islas en la leyenda.",!0)}
        ${A("g-horas","Visitas por hora del día","A qué horas se juega más (hora de Bogotá).")}
        ${A("g-dispositivos","Tipo de dispositivo","Sesiones por tipo de pantalla.")}
      </div>
    </section>

    <section class="ad-seccion" aria-label="Resumen de actividad">
      <div class="tarjeta">
        <span class="eyebrow">Resumen de actividad</span>
        <p class="ad-texto">${ie(e,Z,t)}</p>
      </div>
    </section>

    <section class="ad-seccion">
      <div class="tarjeta" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between">
        <span class="ad-texto">Descarga los datos agregados por día e isla del periodo elegido.</span>
        <button class="btn btn--sec" type="button" data-csv>⤓ Descargar CSV</button>
      </div>
    </section>`;const{etiquetas:P,series:F,porIsla:fa}=te(i,o);Ha(o),Ba(o),Wa(P,F),Ga(Q(l)),Za(c.length?c:[{device:"desktop",sesiones:0}]),a.querySelectorAll("[data-tabla]").forEach(r=>{r.addEventListener("click",()=>{const h=r.closest(".ad-grafica"),w=h.querySelector(".ad-tabla-alt"),S=h.querySelector(".ad-grafica__lienzo");if(!w.classList.contains("oculto")){w.classList.add("oculto"),S.classList.remove("oculto"),r.textContent="Ver como tabla";return}w.innerHTML=oe(r.dataset.tabla,{islas:o,etiquetas:P,series:F,horas:Q(l),dispositivos:c}),w.classList.remove("oculto"),S.classList.add("oculto"),r.textContent="Ver como gráfica"})}),a.querySelectorAll("[data-isla]").forEach(r=>{r.addEventListener("click",()=>{const h=r.dataset.isla,w=r.querySelector(".ad-isla__detalle"),S=!w.classList.contains("oculto");w.classList.toggle("oculto",S),r.setAttribute("aria-expanded",String(!S)),S||Fa(`g-isla-${h}`,P,fa.get(h)??[],la.get(h).color)})}),a.querySelector("[data-csv]")?.addEventListener("click",()=>ne(i,t))}function A(a,e,t,s=!1){return`
    <article class="tarjeta ad-grafica ${s?"ad-grafica--ancha":""}">
      <div class="ad-grafica__cabecera">
        <div><h3>${e}</h3><span class="ad-actualizado">${t}</span></div>
        <button class="btn btn--sec btn--chico" type="button" data-tabla="${a}">Ver como tabla</button>
      </div>
      <div class="ad-grafica__lienzo"><canvas id="${a}"></canvas></div>
      <div class="ad-tabla-alt oculto"></div>
    </article>`}function te(a,e){const t=[...new Set(a.map(i=>i.dia))].sort(),s=new Map(e.map(i=>[i.id,t.map(()=>0)])),n=t.map(()=>0);a.forEach(i=>{const l=t.indexOf(i.dia),c=s.get(i.island_id);l>=0&&c&&(c[l]+=Number(i.visitas??0),n[l]+=Number(i.visitas??0))});const o=e.map(i=>({...i,datos:s.get(i.id)}));return o.push({id:"total",nombre:"Total",emoji:"",color:"#102c36",datos:n,total:!0}),{etiquetas:t.map(se),series:o,porIsla:s}}function se(a){try{const[e,t,s]=String(a).split("-");return`${s}/${t}`}catch{return a}}function Q(a){const e=Array.from({length:24},()=>0);return a.forEach(t=>{e[Number(t.hora)]=Number(t.visitas??0)}),e}function oe(a,e){const t=(o,i)=>`
    <table><caption class="solo-lectores">Datos de la gráfica</caption>
      <thead><tr>${o.map(l=>`<th scope="col">${l}</th>`).join("")}</tr></thead>
      <tbody>${i.map(l=>`<tr>${l.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;if(a==="g-visitas-isla")return t(["Isla","Visitas"],e.islas.map(o=>[`${o.emoji} ${p(o.nombre)}`,d(o.visitas)]));if(a==="g-partidas")return t(["Isla","Iniciadas","Completadas"],e.islas.map(o=>[`${o.emoji} ${p(o.nombre)}`,d(o.iniciadas),d(o.completadas)]));if(a==="g-horas")return t(["Hora","Visitas"],e.horas.map((o,i)=>[`${String(i).padStart(2,"0")} h`,d(o)]));if(a==="g-dispositivos")return t(["Dispositivo","Sesiones"],e.dispositivos.map(o=>[na[o.device]??o.device,d(o.sesiones)]));const s=["Día",...e.series.map(o=>o.total?"Total":`${o.emoji} ${o.nombre}`)],n=e.etiquetas.map((o,i)=>[o,...e.series.map(l=>d(l.datos[i]))]);return t(s,n)}function ie(a,e,t){const{resumen:s}=a,n=Number(s.visitas??0),o=e[0],i=e[e.length-1],l=n?Math.round(o.visitas/n*100):0,c=Number(s.tasa_finalizacion??0),u=Number(s.sesiones_unicas??0);return`En <b>${p(t.toLowerCase())}</b> hubo <b>${d(n)}</b> visitas de <b>${d(u)}</b> sesiones distintas.
    La isla más visitada fue <b>${p(o.nombre)}</b> (${p(o.emocion)}) con ${d(o.visitas)} visitas (${l} %);
    la menos visitada, <b>${p(i.nombre)}</b> con ${d(i.visitas)}.
    Se completó el <b>${c} %</b> de las partidas iniciadas, con una duración media de <b>${da(s.duracion_promedio)}</b> por partida.`}function ne(a,e){const t=[["dia","isla_id","isla","emocion","visitas"]];a.forEach(i=>{const l=la.get(i.island_id);t.push([i.dia,i.island_id,l?.nombre??i.island_id,l?.emocion??"",i.visitas])});const s="\uFEFF"+t.map(i=>i.map(l=>`"${String(l).replace(/"/g,'""')}"`).join(";")).join(`
`),n=new Blob([s],{type:"text/csv;charset=utf-8;"}),o=document.createElement("a");o.href=URL.createObjectURL(n),o.download=`emo-aventura-visitas-${e.toLowerCase().replace(/\s+/g,"-")}.csv`,o.click(),setTimeout(()=>URL.revokeObjectURL(o.href),2e3)}const v=document.querySelector("#admin"),re=aa.map(a=>a.emoji??"").join(" ");let f="7d",m={desde:"",hasta:""},ua=0,R=null,H=null;const le='<div class="ad-nubes" aria-hidden="true"><i></i><i></i><i></i></div>';function pa(a){v.innerHTML=`${le}<div class="ad-app">${a}</div>`}function x(a){pa(`
    <div class="ad-login">
      <section class="ad-login__card">
        <div class="ad-sello" aria-hidden="true">EA</div>
        <p class="eyebrow">EMO-AVENTURA</p>
        <h1>Panel de administración</h1>
        <div class="ad-login__islas" aria-hidden="true">${re}</div>
        ${a}
        <div class="ad-enlaces">
          <a href="./index.html">← Volver al juego</a>
        </div>
      </section>
    </div>`)}function y(a,e,t="error"){a&&(a.className=`ad-aviso ad-aviso--${t}`,a.textContent=e??"")}function ce(){x(`
    <div class="ad-sinconfig">
      <p class="ad-login__sub">El panel todavía no está conectado a su base de datos.
        Falta crear el archivo <code>.env</code> con los datos del proyecto de Supabase
        y volver a publicar.</p>
      <pre>VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ADMIN_EMAIL=${$||"correo@ejemplo.com"}</pre>
      <p class="ad-login__sub">Los pasos completos están en
        <strong>manuales/PANEL-ADMIN-CONFIGURACION.md</strong>. Mientras tanto, el juego
        funciona con total normalidad.</p>
    </div>`)}function q(a="",e="error"){x(`
    <p class="ad-login__sub">Acceso restringido. Solo el administrador del proyecto puede ver las estadísticas.</p>
    <form novalidate>
      <div class="ad-campo">
        <label for="usuario">Usuario</label>
        <input id="usuario" name="usuario" type="text" autocomplete="username" value="${$}" />
        <p class="ad-campo__pista">También puedes escribir «admin».</p>
      </div>
      <div class="ad-campo ad-clave">
        <label for="clave">Contraseña</label>
        <input id="clave" name="clave" type="password" autocomplete="current-password" />
        <button type="button" data-ver aria-label="Mostrar u ocultar la contraseña">👁</button>
      </div>
      <label class="ad-check">
        <input type="checkbox" data-recordar checked />
        Mantener la sesión iniciada en este equipo
      </label>
      <div class="ad-acciones">
        <button class="btn" type="submit" data-entrar>Entrar</button>
      </div>
      <p class="ad-aviso" data-aviso role="status" aria-live="polite"></p>
    </form>
    <div class="ad-enlaces">
      <button class="ad-enlace" type="button" data-olvido>¿Olvidaste tu contraseña?</button>
    </div>`);const t=v.querySelector("form"),s=n=>v.querySelector(n);a&&y(s("[data-aviso]"),a,e),s("[data-ver]").addEventListener("click",()=>{const n=s("#clave");n.type=n.type==="password"?"text":"password",n.focus()}),s("[data-olvido]").addEventListener("click",()=>de()),t.addEventListener("submit",async n=>{n.preventDefault();const o=s("[data-entrar]"),i=U();if(i>0){y(s("[data-aviso]"),`Demasiados intentos. Espera ${i} s.`);return}o.disabled=!0,o.textContent="Entrando…";const l=await Pa(s("#usuario").value,s("#clave").value,s("[data-recordar]").checked);if(o.disabled=!1,o.textContent="Entrar",!l.ok){y(s("[data-aviso]"),l.mensaje);return}await W()})}function de(){x(`
    <p class="ad-login__sub">Te enviamos un código de 6 dígitos al correo del administrador.
      Con ese código podrás crear una contraseña nueva.</p>
    <div class="ad-campo">
      <label for="correo">Correo del administrador</label>
      <input id="correo" type="email" value="${$}" disabled />
    </div>
    <div class="ad-acciones">
      <button class="btn" type="button" data-enviar>Enviar código</button>
    </div>
    <p class="ad-aviso" data-aviso role="status" aria-live="polite"></p>
    <div class="ad-enlaces">
      <button class="ad-enlace" type="button" data-volver>← Volver a iniciar sesión</button>
    </div>`);const a=e=>v.querySelector(e);a("[data-volver]").addEventListener("click",()=>q()),a("[data-enviar]").addEventListener("click",async()=>{const e=a("[data-enviar]");e.disabled=!0,e.textContent="Enviando…";const t=await sa();if(e.disabled=!1,e.textContent="Enviar código",!t.ok){y(a("[data-aviso]"),t.mensaje);return}ma()})}function ma(){x(`
    <p class="ad-login__sub">Escribe el código de 6 dígitos que llegó a
      <strong>${$}</strong>. Puedes pegarlo completo.</p>
    <div class="ad-codigo" data-codigo>
      ${Array.from({length:6},(i,l)=>`
        <input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="1"
               aria-label="Dígito ${l+1} de 6" data-pos="${l}" />`).join("")}
    </div>
    <div class="ad-acciones">
      <button class="btn" type="button" data-verificar>Comprobar código</button>
      <button class="btn btn--sec" type="button" data-reenviar disabled>Reenviar código (60 s)</button>
    </div>
    <p class="ad-aviso" data-aviso role="status" aria-live="polite"></p>
    <div class="ad-enlaces">
      <button class="ad-enlace" type="button" data-volver>← Volver a iniciar sesión</button>
    </div>`);const a=i=>v.querySelector(i),e=[...v.querySelectorAll("[data-pos]")],t=()=>e.map(i=>i.value).join("");e.forEach((i,l)=>{i.addEventListener("input",()=>{i.value=i.value.replace(/\D/g,"").slice(0,1),i.value&&l<5&&e[l+1].focus()}),i.addEventListener("keydown",c=>{c.key==="Backspace"&&!i.value&&l>0&&e[l-1].focus(),c.key==="Enter"&&a("[data-verificar]").click()}),i.addEventListener("paste",c=>{const u=(c.clipboardData?.getData("text")??"").replace(/\D/g,"").slice(0,6);u&&(c.preventDefault(),u.split("").forEach((_,b)=>{e[b]&&(e[b].value=_)}),e[Math.min(u.length,5)].focus())})}),e[0]?.focus();const s=a("[data-reenviar]");let n=60;const o=setInterval(()=>{n-=1,n<=0?(clearInterval(o),s.disabled=!1,s.textContent="Reenviar código"):s.textContent=`Reenviar código (${n} s)`},1e3);s.addEventListener("click",async()=>{s.disabled=!0;const i=await sa();y(a("[data-aviso]"),i.ok?"Código reenviado. Revisa tu correo.":i.mensaje,i.ok?"ok":"error"),ma()}),a("[data-volver]").addEventListener("click",()=>{clearInterval(o),q()}),a("[data-verificar]").addEventListener("click",async()=>{const i=a("[data-verificar]");i.disabled=!0,i.textContent="Comprobando…";const l=await Va(t());if(i.disabled=!1,i.textContent="Comprobar código",!l.ok){y(a("[data-aviso]"),l.mensaje);return}clearInterval(o),ue()})}function ue(){x(`
    <p class="ad-login__sub">Código correcto. Ahora crea tu contraseña: al menos
      10 caracteres, con una letra y un número.</p>
    <form novalidate>
      <div class="ad-campo ad-clave">
        <label for="c1">Contraseña</label>
        <input id="c1" type="password" autocomplete="new-password" />
        <button type="button" data-ver aria-label="Mostrar u ocultar la contraseña">👁</button>
        <div class="ad-fuerza" data-fuerza="0" aria-hidden="true"><i></i></div>
        <p class="ad-campo__pista" data-nivel>Seguridad: floja</p>
      </div>
      <div class="ad-campo ad-clave">
        <label for="c2">Repite la contraseña</label>
        <input id="c2" type="password" autocomplete="new-password" />
      </div>
      <div class="ad-acciones">
        <button class="btn" type="submit" data-guardar>Guardar contraseña</button>
      </div>
      <p class="ad-aviso" data-aviso role="status" aria-live="polite"></p>
    </form>`);const a=i=>v.querySelector(i),e=["floja","justa","buena","fuerte"];a("[data-ver]").addEventListener("click",()=>{["#c1","#c2"].forEach(i=>{const l=a(i);l.type=l.type==="password"?"text":"password"})});const t=a("#c1"),s=a("[data-fuerza]"),n=s?.querySelector("i"),o=a("[data-nivel]");t.addEventListener("input",()=>{const i=za(t.value);s&&(s.dataset.nivel=String(i)),n&&(n.style.width=`${i/3*100}%`),o&&(o.textContent=`Seguridad: ${e[i]}`)}),v.querySelector("form").addEventListener("submit",async i=>{i.preventDefault();const l=a("#c1").value,c=a("#c2").value;if(!ta(l)){y(a("[data-aviso]"),"La contraseña necesita 10 caracteres como mínimo, con al menos una letra y un número.");return}if(l!==c){y(a("[data-aviso]"),"Las dos contraseñas no coinciden.");return}const u=a("[data-guardar]");u.disabled=!0,u.textContent="Guardando…";const _=await Oa(l);if(u.disabled=!1,u.textContent="Guardar contraseña",!_.ok){y(a("[data-aviso]"),_.mensaje);return}y(a("[data-aviso]"),"Contraseña guardada ✔","ok"),setTimeout(()=>W(),700)})}function pe(){return`
    <header class="ad-cabecera">
      <div class="ad-cabecera__titulo">
        <p class="eyebrow">EMO-AVENTURA · Administración</p>
        <h1>Uso de las islas</h1>
      </div>
      <div class="ad-cabecera__acciones">
        <div class="ad-periodos" role="group" aria-label="Periodo">
          ${ca.map(a=>`
            <button class="ad-periodo" type="button" data-periodo="${a.id}" aria-pressed="${a.id===f}">${a.texto}</button>`).join("")}
        </div>
        <div class="ad-fechas ${f==="rango"?"is-on":""}" data-fechas>
          <label class="solo-lectores" for="f-desde">Desde</label>
          <input id="f-desde" type="date" value="${m.desde}" />
          <span>a</span>
          <label class="solo-lectores" for="f-hasta">Hasta</label>
          <input id="f-hasta" type="date" value="${m.hasta}" />
        </div>
        <button class="btn btn--sec btn--chico" type="button" data-refrescar>↻ Actualizar</button>
        <span class="ad-actualizado" data-reloj>Actualizado ahora</span>
        <a class="btn btn--sec btn--chico" href="./index.html">← Volver al juego</a>
        <button class="btn btn--chico" type="button" data-salir>Cerrar sesión</button>
      </div>
    </header>
    <main class="ad-main" data-tablero></main>`}async function W(){pa(pe());const a=e=>v.querySelector(e);v.querySelectorAll("[data-periodo]").forEach(e=>{e.addEventListener("click",()=>{f=e.dataset.periodo,v.querySelectorAll("[data-periodo]").forEach(t=>t.setAttribute("aria-pressed",String(t===e))),a("[data-fechas]").classList.toggle("is-on",f==="rango"),(f!=="rango"||m.desde&&m.hasta)&&k()})}),a("#f-desde")?.addEventListener("change",e=>{m.desde=e.target.value,m.hasta&&k()}),a("#f-hasta")?.addEventListener("change",e=>{m.hasta=e.target.value,m.desde&&k()}),a("[data-refrescar]").addEventListener("click",()=>k()),a("[data-salir]").addEventListener("click",async()=>{await G()}),be(),k()}function me(){return ca.find(a=>a.id===f),f==="rango"&&m.desde&&m.hasta?`Del ${m.desde} al ${m.hasta}`:f==="hoy"?"Hoy":f==="7d"?"Los últimos 7 días":f==="30d"?"Los últimos 30 días":"Todo el histórico"}async function k(){const a=v.querySelector("[data-tablero]");if(a){ia(),Qa(a);try{const e=await Ya(Ka(f,m));ee(a,e,me()),ua=Date.now(),ve()}catch(e){if(String(e?.message??"").includes("Acceso no autorizado")){await G("Acceso no autorizado.");return}ae(a,"Revisa tu conexión y vuelve a intentarlo.",()=>k())}}}function ve(){clearInterval(R);const a=()=>{const e=v.querySelector("[data-reloj]");if(!e){clearInterval(R);return}const t=Math.round((Date.now()-ua)/6e4);e.textContent=t<1?"Actualizado ahora":`Actualizado hace ${t} min`};a(),R=setInterval(a,3e4)}function be(){const a=()=>{clearTimeout(H),H=setTimeout(()=>G("Se cerró la sesión por inactividad."),Ra)};["pointerdown","keydown","wheel","touchstart"].forEach(e=>window.addEventListener(e,a,{passive:!0})),a()}async function G(a=""){clearTimeout(H),clearInterval(R),ia(),await Ua(),q(a,a?"info":"error")}(async function(){if(!X){ce();return}B({recordar:!0}),await qa()?W():q()})();
