import{e as aa,A as Y,i as ea,a as ha}from"./supabaseClient-ByzEwyXg.js";import{createClient as ya}from"./supabase-CcCxm0Mt.js";import{C as j,B as _a,a as $a,L as Ea,b as wa,P as Sa,D as ka,A as ja,c as Ca,d as Aa,T as La,p as xa,e as Ia,i as Da}from"./chart-BK0e6cPM.js";const Na="https://xbptrlrkmcvzbrmednek.supabase.co".trim(),Ma="sb_publishable_zHBk4bT0-xjB0oNSpMlipw_CcZrYRFu".trim(),Ra=5,Ta=120*1e3,za=1800*1e3;let O=null,N=0,ta=0;function B({recordar:a=!0}={}){return aa?(O=ya(Na,Ma,{auth:{persistSession:!0,autoRefreshToken:!0,detectSessionInUrl:!1,storage:a?window.localStorage:window.sessionStorage,storageKey:"emoaventura.admin.auth"}}),O):null}function C(){return O??B({recordar:!0})}function z(a){return String(a??"").trim().toLowerCase()}function R(a){const e=z(a);return e?Y.length===0||Y.includes(e):!1}function U(){const a=ta-Date.now();return a>0?Math.ceil(a/1e3):0}function K(){N+=1,N>=Ra&&(ta=Date.now()+Ta,N=0)}function qa(a){const e=String(a??"");if(e.length<10)return 0;let t=1;return/[a-zA-Z]/.test(e)&&/\d/.test(e)&&(t+=1),e.length>=14&&/[^a-zA-Z0-9]/.test(e)&&(t+=1),Math.min(3,t)}function sa(a){const e=String(a??"");return e.length>=10&&/[a-zA-Z]/.test(e)&&/\d/.test(e)}async function Pa(){const a=C();if(!a)return null;try{const{data:e}=await a.auth.getSession(),t=e?.session?.user?.email??null;return t?R(t)?e.session:(await a.auth.signOut(),null):null}catch{return null}}async function Va(a,e,t){if(U()>0)return{ok:!1,mensaje:`Demasiados intentos. Vuelve a probar en ${U()} s.`};const s=z(a);if(!R(s))return K(),{ok:!1,mensaje:"Usuario o contraseña incorrectos."};const i=B({recordar:t});if(!i)return{ok:!1,mensaje:"El panel no está configurado todavía."};try{const{data:o,error:n}=await i.auth.signInWithPassword({email:s,password:e});return n||!o?.session?(K(),{ok:!1,mensaje:"Usuario o contraseña incorrectos."}):R(o.session.user?.email)?(N=0,{ok:!0}):(await i.auth.signOut(),{ok:!1,mensaje:"Acceso no autorizado."})}catch{return{ok:!1,mensaje:"No se pudo conectar. Revisa tu conexión e inténtalo otra vez."}}}async function oa(a){const e=C();if(!e)return{ok:!1,mensaje:"El panel no está configurado todavía."};const t=z(a);if(!R(t))return{ok:!1,mensaje:"Ese correo no tiene acceso al panel."};try{const{error:s}=await e.auth.signInWithOtp({email:t,options:{shouldCreateUser:!1}});if(s){const i=String(s.message??"").toLowerCase();return i.includes("rate")||i.includes("seconds")?{ok:!1,mensaje:"Se han pedido muchos códigos seguidos. Espera un minuto y vuelve a intentarlo."}:{ok:!1,mensaje:"No se pudo enviar el código. Revisa la configuración de correo en Supabase."}}return{ok:!0}}catch{return{ok:!1,mensaje:"No se pudo conectar. Revisa tu conexión e inténtalo otra vez."}}}async function Oa(a,e){const t=C();if(!t)return{ok:!1,mensaje:"El panel no está configurado todavía."};const s=z(a),i=String(e??"").replace(/\D/g,"");if(i.length!==6)return{ok:!1,mensaje:"El código tiene 6 dígitos."};try{const{data:o,error:n}=await t.auth.verifyOtp({email:s,token:i,type:"email"});return n||!o?.session?String(n?.message??"").toLowerCase().includes("expired")?{ok:!1,mensaje:"El código ya venció. Pide uno nuevo."}:{ok:!1,mensaje:"El código no es correcto. Revísalo o pide uno nuevo."}:{ok:!0}}catch{return{ok:!1,mensaje:"No se pudo comprobar el código. Inténtalo otra vez."}}}async function Ua(a){const e=C();if(!e)return{ok:!1,mensaje:"El panel no está configurado todavía."};if(!sa(a))return{ok:!1,mensaje:"La contraseña necesita 10 caracteres como mínimo, con al menos una letra y un número."};try{const{error:t}=await e.auth.updateUser({password:a});return t?{ok:!1,mensaje:"No se pudo guardar la contraseña. Inténtalo otra vez."}:{ok:!0}}catch{return{ok:!1,mensaje:"No se pudo conectar. Inténtalo otra vez."}}}async function Ha(){try{await C()?.auth.signOut()}catch{}}j.register(_a,$a,Ea,wa,Sa,ka,ja,Ca,Aa,La,xa,Ia,Da);j.defaults.font.family='Inter, ui-sans-serif, system-ui, "Segoe UI", sans-serif';j.defaults.color="#43606f";j.defaults.plugins.legend.labels.usePointStyle=!0;j.defaults.plugins.legend.labels.boxWidth=10;function ia(a){const e=document.createElement("canvas");e.width=8,e.height=8;const t=e.getContext("2d");return t.fillStyle=a,t.fillRect(0,0,8,8),t.strokeStyle="rgba(255,255,255,0.55)",t.lineWidth=2.5,t.beginPath(),t.moveTo(-2,8),t.lineTo(8,-2),t.moveTo(2,10),t.lineTo(10,2),t.stroke(),t.createPattern(e,"repeat")}const T=new Map;function A(a,e){const t=document.getElementById(a);if(!t)return null;T.get(a)?.destroy();const s=new j(t,e);return T.set(a,s),s}function na(){T.forEach(a=>a.destroy()),T.clear()}const q=a=>({beginAtZero:!0,ticks:{precision:0},title:{display:!0,text:a,font:{weight:"700"}},grid:{color:"rgba(16,44,54,0.08)"}});function Ba(a){return A("g-visitas-isla",{type:"bar",data:{labels:a.map(e=>`${e.emoji} ${e.nombre}`),datasets:[{label:"Visitas",data:a.map(e=>e.visitas),backgroundColor:a.map(e=>e.id==="frustration"?ia(e.color):e.color),borderColor:a.map(e=>e.color),borderWidth:1,borderRadius:6}]},options:{maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{callbacks:{label:e=>`${e.parsed.y} visitas`}}},scales:{y:q("Visitas"),x:{grid:{display:!1}}}}})}function Wa(a){return A("g-partidas",{type:"bar",data:{labels:a.map(e=>`${e.emoji} ${e.nombre}`),datasets:[{label:"Partidas iniciadas",data:a.map(e=>e.iniciadas),backgroundColor:"rgba(16,44,54,0.22)",borderColor:"#102c36",borderWidth:1,borderRadius:6},{label:"Partidas completadas",data:a.map(e=>e.completadas),backgroundColor:a.map(e=>e.id==="frustration"?ia(e.color):e.color),borderColor:a.map(e=>e.color),borderWidth:1,borderRadius:6}]},options:{maintainAspectRatio:!1,plugins:{tooltip:{callbacks:{label:e=>`${e.dataset.label}: ${e.parsed.y}`}}},scales:{y:q("Partidas"),x:{grid:{display:!1}}}}})}function Ga(a,e){return A("g-dias",{type:"line",data:{labels:a,datasets:e.map(t=>({label:t.total?"Total":`${t.emoji} ${t.nombre}`,data:t.datos,borderColor:t.total?"#102c36":t.color,backgroundColor:t.total?"rgba(16,44,54,0.08)":t.color,borderWidth:t.total?3:2,borderDash:t.id==="frustration"?[6,4]:[],pointRadius:2.5,pointHoverRadius:5,tension:.3,fill:!!t.total}))},options:{maintainAspectRatio:!1,interaction:{mode:"index",intersect:!1},plugins:{legend:{position:"bottom"},tooltip:{callbacks:{label:t=>`${t.dataset.label}: ${t.parsed.y} visitas`}}},scales:{y:q("Visitas"),x:{title:{display:!0,text:"Día",font:{weight:"700"}},grid:{display:!1}}}}})}function Za(a){return A("g-horas",{type:"bar",data:{labels:a.map((e,t)=>`${String(t).padStart(2,"0")} h`),datasets:[{label:"Visitas",data:a,backgroundColor:"#2f7fb5",borderRadius:6}]},options:{maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{callbacks:{title:e=>`A las ${e[0].label}`,label:e=>`${e.parsed.y} visitas`}}},scales:{y:q("Visitas"),x:{title:{display:!0,text:"Hora del día (America/Bogotá)",font:{weight:"700"}},grid:{display:!1}}}}})}const ra={mobile:"📱 Móvil",tablet:"🖥️ Tableta",desktop:"💻 Escritorio"};function Fa(a){return A("g-dispositivos",{type:"doughnut",data:{labels:a.map(e=>ra[e.device]??e.device),datasets:[{data:a.map(e=>e.sesiones),backgroundColor:["#2f7fb5","#f5a524","#2e9e6b","#5947a5"],borderColor:"#fff",borderWidth:2}]},options:{maintainAspectRatio:!1,cutout:"58%",plugins:{legend:{position:"bottom"},tooltip:{callbacks:{label:e=>{const t=e.dataset.data.reduce((s,i)=>s+i,0)||1;return`${e.label}: ${e.parsed} sesiones (${Math.round(e.parsed/t*100)} %)`}}}}}})}function Ya(a,e,t,s){return A(a,{type:"line",data:{labels:e,datasets:[{label:"Visitas",data:t,borderColor:s,backgroundColor:`${s}22`,borderWidth:2,pointRadius:2,tension:.3,fill:!0}]},options:{maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{callbacks:{label:i=>`${i.parsed.y} visitas`}}},scales:{y:{beginAtZero:!0,ticks:{precision:0}},x:{grid:{display:!1}}}}})}const la=ea.map(a=>({id:a.id,nombre:a.displayName,emocion:a.name,emoji:a.emoji??"",color:a.palette.ui,glow:a.palette.glow})),ca=new Map(la.map(a=>[a.id,a])),da=[{id:"hoy",texto:"Hoy",dias:0},{id:"7d",texto:"7 días",dias:7},{id:"30d",texto:"30 días",dias:30},{id:"todo",texto:"Todo",dias:null},{id:"rango",texto:"Personalizado",dias:void 0}];function Ka(a,e={}){const t=new Date,s=new Date(t.getTime()+6e4);let i;if(a==="hoy")i=new Date(t),i.setHours(0,0,0,0);else if(a==="7d"||a==="30d"){const o=a==="7d"?7:30;i=new Date(t.getTime()-o*24*3600*1e3)}else if(a==="rango"&&e.desde&&e.hasta){i=new Date(`${e.desde}T00:00:00`);const o=new Date(`${e.hasta}T00:00:00`);return o.setDate(o.getDate()+1),J(i,o)}else i=new Date("2020-01-01T00:00:00Z");return J(i,s)}function J(a,e){const t=e.getTime()-a.getTime();return{desde:a.toISOString(),hasta:e.toISOString(),desdeAntes:new Date(a.getTime()-t).toISOString(),hastaAntes:a.toISOString()}}async function S(a,e,t,s){const{data:i,error:o}=await a.rpc(e,{p_from:t,p_to:s});if(o)throw new Error(o.message);return i??[]}async function Ja(a){const e=C();if(!e)throw new Error("sin-configurar");const{desde:t,hasta:s,desdeAntes:i,hastaAntes:o}=a,[n,r,c,d,b,h]=await Promise.all([S(e,"admin_summary",t,s),S(e,"admin_island_stats",t,s),S(e,"admin_daily_visits",t,s),S(e,"admin_hourly_visits",t,s),S(e,"admin_devices",t,s),S(e,"admin_summary",i,o)]);return{resumen:n[0]??Q(),resumenAntes:h[0]??Q(),islas:la.map($=>{const y=r.find(I=>I.island_id===$.id)??{};return{...$,visitas:Number(y.visitas??0),sesiones:Number(y.sesiones_unicas??0),iniciadas:Number(y.partidas_iniciadas??0),completadas:Number(y.partidas_completas??0),tasa:Number(y.tasa_finalizacion??0),duracion:Number(y.duracion_promedio??0),ultima:y.ultima_visita??null}}),dias:c,horas:d,dispositivos:b}}function Q(){return{visitas:0,sesiones_unicas:0,partidas_iniciadas:0,partidas_completas:0,tasa_finalizacion:0,duracion_promedio:0}}const u=a=>Number(a??0).toLocaleString("es-CO");function ua(a){const e=Math.max(0,Math.round(Number(a??0)/1e3));return`${String(Math.floor(e/60)).padStart(2,"0")}:${String(e%60).padStart(2,"0")}`}function Qa(a){if(!a)return"sin visitas";const e=Math.round((Date.now()-new Date(a).getTime())/6e4);if(e<1)return"hace un momento";if(e<60)return`hace ${e} min`;const t=Math.round(e/60);if(t<24)return`hace ${t} h`;const s=Math.round(t/24);return s===1?"ayer":`hace ${s} días`}function D(a,e){const t=Number(a??0),s=Number(e??0);if(!s)return t?{clase:"sube",texto:"nuevo"}:{clase:"igual",texto:"sin cambios"};const i=Math.round((t-s)/s*100);return i===0?{clase:"igual",texto:"igual que antes"}:{clase:i>0?"sube":"baja",texto:`${i>0?"▲":"▼"} ${Math.abs(i)} % vs. periodo anterior`}}const p=a=>String(a??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]);function Xa(a){a.innerHTML=`
    <section class="ad-seccion" aria-busy="true" aria-live="polite">
      <p class="solo-lectores">Cargando estadísticas…</p>
      <div class="ad-metricas">${'<div class="tarjeta ad-esqueleto"></div>'.repeat(4)}</div>
      <div class="tarjeta ad-esqueleto" style="min-height:120px"></div>
      <div class="ad-islas">${'<div class="tarjeta ad-esqueleto" style="min-height:190px"></div>'.repeat(6)}</div>
    </section>`}function ae(a){a.innerHTML=`
    <section class="tarjeta ad-vacio">
      <h2>Aún no hay visitas en este periodo</h2>
      <p>Las estadísticas empiezan a contar desde que se publicó esta versión del juego.
         Prueba con un periodo más amplio, por ejemplo «Todo».</p>
    </section>`}function ee(a,e,t){a.innerHTML=`
    <section class="tarjeta ad-error" role="alert">
      <h2>No se pudieron cargar los datos</h2>
      <p>${p(e)}</p>
      <button class="btn" type="button" data-reintentar>Reintentar</button>
    </section>`,a.querySelector("[data-reintentar]")?.addEventListener("click",t)}function te(a,e,t){const{resumen:s,resumenAntes:i,islas:o,dias:n,horas:r,dispositivos:c}=e,d=Number(s.visitas??0);if(!d&&!Number(s.partidas_iniciadas??0)){ae(a);return}const b=[...o].sort((l,_)=>_.visitas-l.visitas),h=b[0],$=Math.max(1,...o.map(l=>l.visitas));let y=0,I=null;const Z=b.map((l,_)=>(l.visitas!==I&&(y=_+1,I=l.visitas),{...l,puesto:y})),ba=l=>l===1?"🥇":l===2?"🥈":l===3?"🥉":"",fa=[{nombre:"Visitas totales",valor:u(s.visitas),d:D(s.visitas,i.visitas)},{nombre:"Sesiones únicas",valor:u(s.sesiones_unicas),d:D(s.sesiones_unicas,i.sesiones_unicas)},{nombre:"Partidas completadas",valor:u(s.partidas_completas),d:D(s.partidas_completas,i.partidas_completas)},{nombre:"Tasa de finalización",valor:`${Number(s.tasa_finalizacion??0)} %`,d:D(s.tasa_finalizacion,i.tasa_finalizacion)}];a.innerHTML=`
    <section class="ad-seccion" aria-label="Resumen general">
      <div class="ad-metricas">
        ${fa.map(l=>`
          <article class="tarjeta ad-metrica">
            <span class="ad-metrica__valor">${l.valor}</span>
            <span class="ad-metrica__nombre">${l.nombre}</span>
            <span class="ad-metrica__delta ad-metrica__delta--${l.d.clase}">${l.d.texto}</span>
          </article>`).join("")}
      </div>
    </section>

    <section class="ad-seccion" aria-label="Isla más visitada">
      <article class="tarjeta ad-top" style="--c:${h.color}">
        <span class="ad-top__emoji" aria-hidden="true">${h.emoji}</span>
        <div class="ad-top__datos">
          <span class="eyebrow">Isla más visitada</span>
          <span class="ad-top__nombre">${p(h.nombre)}</span>
          <span class="ad-top__cifra">${u(h.visitas)} visitas · ${d?Math.round(h.visitas/d*100):0} % del total · ${p(h.emocion)}</span>
        </div>
        <span class="ad-top__trofeo" aria-hidden="true">🏆</span>
      </article>
    </section>

    <section class="ad-seccion" aria-label="Ranking de islas">
      <div class="ad-seccion__titulo"><h2>Ranking de islas</h2><span class="ad-actualizado">${p(t)}</span></div>
      <div class="tarjeta">
        <ol class="ad-rank">
          ${Z.map(l=>`
            <li style="--c:${l.color}">
              <span class="ad-rank__pos">${ba(l.puesto)||l.puesto}</span>
              <span class="ad-rank__emoji" aria-hidden="true">${l.emoji}</span>
              <span class="ad-rank__barra">
                <span class="ad-rank__relleno" style="width:${Math.round(l.visitas/$*100)}%" data-rayas="${l.id==="frustration"}"></span>
                <span class="ad-rank__texto">${p(l.nombre)} · ${p(l.emocion)}</span>
              </span>
              <span class="ad-rank__cifra">${u(l.visitas)} · ${d?Math.round(l.visitas/d*100):0} %</span>
            </li>`).join("")}
        </ol>
      </div>
    </section>

    <section class="ad-seccion" aria-label="Estadísticas por isla">
      <div class="ad-seccion__titulo"><h2>Estadísticas por isla</h2><span class="ad-actualizado">Toca una tarjeta para ver su gráfica por día</span></div>
      <div class="ad-islas">
        ${o.map(l=>`
          <button class="ad-isla" type="button" data-isla="${l.id}" style="--c:${l.color};--glow:${l.glow}" aria-expanded="false">
            <span class="ad-isla__franja"></span>
            <span class="ad-isla__cuerpo">
              <span class="ad-isla__cabecera">
                <span class="ad-isla__emoji" aria-hidden="true">${l.emoji}</span>
                <span>
                  <span class="ad-isla__nombre">${p(l.nombre)}</span>
                  <span class="ad-isla__emocion">${p(l.emocion)}</span>
                </span>
              </span>
              <span class="ad-isla__datos">
                <span class="ad-isla__dato"><b>${u(l.visitas)}</b>visitas</span>
                <span class="ad-isla__dato"><b>${u(l.sesiones)}</b>sesiones únicas</span>
                <span class="ad-isla__dato"><b>${u(l.iniciadas)}</b>partidas iniciadas</span>
                <span class="ad-isla__dato"><b>${u(l.completadas)}</b>completadas</span>
              </span>
              <span class="ad-isla__barra"><i style="width:${Math.min(100,l.tasa)}%"></i></span>
              <span class="ad-isla__pie">
                <span>${l.tasa} % de finalización</span>
                <span>⏱ ${ua(l.duracion)}</span>
              </span>
              <span class="ad-isla__pie"><span>Última visita: ${Qa(l.ultima)}</span></span>
            </span>
            <span class="ad-isla__detalle oculto"><canvas id="g-isla-${l.id}" height="160"></canvas></span>
          </button>`).join("")}
      </div>
    </section>

    <section class="ad-seccion" aria-label="Gráficas comparativas">
      <div class="ad-seccion__titulo"><h2>Gráficas comparativas</h2></div>
      <div class="ad-graficas">
        ${L("g-visitas-isla","Visitas por isla","Cuántas veces se abrió cada isla en el periodo.")}
        ${L("g-partidas","Partidas iniciadas y completadas","Comparación por isla.")}
        ${L("g-dias","Visitas por día","Una línea por isla, más el total. Puedes ocultar islas en la leyenda.",!0)}
        ${L("g-horas","Visitas por hora del día","A qué horas se juega más (hora de Bogotá).")}
        ${L("g-dispositivos","Tipo de dispositivo","Sesiones por tipo de pantalla.")}
      </div>
    </section>

    <section class="ad-seccion" aria-label="Resumen de actividad">
      <div class="tarjeta">
        <span class="eyebrow">Resumen de actividad</span>
        <p class="ad-texto">${ne(e,Z,t)}</p>
      </div>
    </section>

    <section class="ad-seccion">
      <div class="tarjeta" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between">
        <span class="ad-texto">Descarga los datos agregados por día e isla del periodo elegido.</span>
        <button class="btn btn--sec" type="button" data-csv>⤓ Descargar CSV</button>
      </div>
    </section>`;const{etiquetas:V,series:F,porIsla:ga}=se(n,o);Ba(o),Wa(o),Ga(V,F),Za(X(r)),Fa(c.length?c:[{device:"desktop",sesiones:0}]),a.querySelectorAll("[data-tabla]").forEach(l=>{l.addEventListener("click",()=>{const _=l.closest(".ad-grafica"),E=_.querySelector(".ad-tabla-alt"),w=_.querySelector(".ad-grafica__lienzo");if(!E.classList.contains("oculto")){E.classList.add("oculto"),w.classList.remove("oculto"),l.textContent="Ver como tabla";return}E.innerHTML=ie(l.dataset.tabla,{islas:o,etiquetas:V,series:F,horas:X(r),dispositivos:c}),E.classList.remove("oculto"),w.classList.add("oculto"),l.textContent="Ver como gráfica"})}),a.querySelectorAll("[data-isla]").forEach(l=>{l.addEventListener("click",()=>{const _=l.dataset.isla,E=l.querySelector(".ad-isla__detalle"),w=!E.classList.contains("oculto");E.classList.toggle("oculto",w),l.setAttribute("aria-expanded",String(!w)),w||Ya(`g-isla-${_}`,V,ga.get(_)??[],ca.get(_).color)})}),a.querySelector("[data-csv]")?.addEventListener("click",()=>re(n,t))}function L(a,e,t,s=!1){return`
    <article class="tarjeta ad-grafica ${s?"ad-grafica--ancha":""}">
      <div class="ad-grafica__cabecera">
        <div><h3>${e}</h3><span class="ad-actualizado">${t}</span></div>
        <button class="btn btn--sec btn--chico" type="button" data-tabla="${a}">Ver como tabla</button>
      </div>
      <div class="ad-grafica__lienzo"><canvas id="${a}"></canvas></div>
      <div class="ad-tabla-alt oculto"></div>
    </article>`}function se(a,e){const t=[...new Set(a.map(n=>n.dia))].sort(),s=new Map(e.map(n=>[n.id,t.map(()=>0)])),i=t.map(()=>0);a.forEach(n=>{const r=t.indexOf(n.dia),c=s.get(n.island_id);r>=0&&c&&(c[r]+=Number(n.visitas??0),i[r]+=Number(n.visitas??0))});const o=e.map(n=>({...n,datos:s.get(n.id)}));return o.push({id:"total",nombre:"Total",emoji:"",color:"#102c36",datos:i,total:!0}),{etiquetas:t.map(oe),series:o,porIsla:s}}function oe(a){try{const[e,t,s]=String(a).split("-");return`${s}/${t}`}catch{return a}}function X(a){const e=Array.from({length:24},()=>0);return a.forEach(t=>{e[Number(t.hora)]=Number(t.visitas??0)}),e}function ie(a,e){const t=(o,n)=>`
    <table><caption class="solo-lectores">Datos de la gráfica</caption>
      <thead><tr>${o.map(r=>`<th scope="col">${r}</th>`).join("")}</tr></thead>
      <tbody>${n.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;if(a==="g-visitas-isla")return t(["Isla","Visitas"],e.islas.map(o=>[`${o.emoji} ${p(o.nombre)}`,u(o.visitas)]));if(a==="g-partidas")return t(["Isla","Iniciadas","Completadas"],e.islas.map(o=>[`${o.emoji} ${p(o.nombre)}`,u(o.iniciadas),u(o.completadas)]));if(a==="g-horas")return t(["Hora","Visitas"],e.horas.map((o,n)=>[`${String(n).padStart(2,"0")} h`,u(o)]));if(a==="g-dispositivos")return t(["Dispositivo","Sesiones"],e.dispositivos.map(o=>[ra[o.device]??o.device,u(o.sesiones)]));const s=["Día",...e.series.map(o=>o.total?"Total":`${o.emoji} ${o.nombre}`)],i=e.etiquetas.map((o,n)=>[o,...e.series.map(r=>u(r.datos[n]))]);return t(s,i)}function ne(a,e,t){const{resumen:s}=a,i=Number(s.visitas??0),o=e[0],n=e[e.length-1],r=i?Math.round(o.visitas/i*100):0,c=Number(s.tasa_finalizacion??0),d=Number(s.sesiones_unicas??0);return`En <b>${p(t.toLowerCase())}</b> hubo <b>${u(i)}</b> visitas de <b>${u(d)}</b> sesiones distintas.
    La isla más visitada fue <b>${p(o.nombre)}</b> (${p(o.emocion)}) con ${u(o.visitas)} visitas (${r} %);
    la menos visitada, <b>${p(n.nombre)}</b> con ${u(n.visitas)}.
    Se completó el <b>${c} %</b> de las partidas iniciadas, con una duración media de <b>${ua(s.duracion_promedio)}</b> por partida.`}function re(a,e){const t=[["dia","isla_id","isla","emocion","visitas"]];a.forEach(n=>{const r=ca.get(n.island_id);t.push([n.dia,n.island_id,r?.nombre??n.island_id,r?.emocion??"",n.visitas])});const s="\uFEFF"+t.map(n=>n.map(r=>`"${String(r).replace(/"/g,'""')}"`).join(";")).join(`
`),i=new Blob([s],{type:"text/csv;charset=utf-8;"}),o=document.createElement("a");o.href=URL.createObjectURL(i),o.download=`emo-aventura-visitas-${e.toLowerCase().replace(/\s+/g,"-")}.csv`,o.click(),setTimeout(()=>URL.revokeObjectURL(o.href),2e3)}const v=document.querySelector("#admin"),le=ea.map(a=>a.emoji??"").join(" ");let f="7d",m={desde:"",hasta:""},pa=0,M=null,H=null;const ce='<div class="ad-nubes" aria-hidden="true"><i></i><i></i><i></i></div>';function ma(a){v.innerHTML=`${ce}<div class="ad-app">${a}</div>`}function x(a){ma(`
    <div class="ad-login">
      <section class="ad-login__card">
        <div class="ad-sello" aria-hidden="true">EA</div>
        <p class="eyebrow">EMO-AVENTURA</p>
        <h1>Panel de administración</h1>
        <div class="ad-login__islas" aria-hidden="true">${le}</div>
        ${a}
        <div class="ad-enlaces">
          <a href="./index.html">← Volver al juego</a>
        </div>
      </section>
    </div>`)}function g(a,e,t="error"){a&&(a.className=`ad-aviso ad-aviso--${t}`,a.textContent=e??"")}function de(){x(`
    <div class="ad-sinconfig">
      <p class="ad-login__sub">El panel todavía no está conectado a su base de datos.
        Falta crear el archivo <code>.env</code> con los datos del proyecto de Supabase
        y volver a publicar.</p>
      <pre>VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ADMIN_EMAIL=${ha||"correo@ejemplo.com"}</pre>
      <p class="ad-login__sub">Los pasos completos están en
        <strong>manuales/PANEL-ADMIN-CONFIGURACION.md</strong>. Mientras tanto, el juego
        funciona con total normalidad.</p>
    </div>`)}function P(a="",e="error"){x(`
    <p class="ad-login__sub">Acceso restringido. Escribe tu correo de administrador
      y tu contraseña para ver las estadísticas.</p>
    <form novalidate>
      <div class="ad-campo">
        <label for="usuario">Usuario</label>
        <input id="usuario" name="usuario" type="email" autocomplete="username"
               placeholder="correo@ejemplo.com" value="" />
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
    </div>`);const t=v.querySelector("form"),s=i=>v.querySelector(i);a&&g(s("[data-aviso]"),a,e),s("[data-ver]").addEventListener("click",()=>{const i=s("#clave");i.type=i.type==="password"?"text":"password",i.focus()}),s("[data-olvido]").addEventListener("click",()=>ue()),t.addEventListener("submit",async i=>{i.preventDefault();const o=s("[data-entrar]"),n=U();if(n>0){g(s("[data-aviso]"),`Demasiados intentos. Espera ${n} s.`);return}o.disabled=!0,o.textContent="Entrando…";const r=await Va(s("#usuario").value,s("#clave").value,s("[data-recordar]").checked);if(o.disabled=!1,o.textContent="Entrar",!r.ok){g(s("[data-aviso]"),r.mensaje);return}await W()})}function ue(){x(`
    <p class="ad-login__sub">Escribe tu correo de administrador y te enviamos un código
      de 6 dígitos. Con ese código podrás crear una contraseña nueva.</p>
    <div class="ad-campo">
      <label for="correo">Correo del administrador</label>
      <input id="correo" type="email" autocomplete="username"
             placeholder="correo@ejemplo.com" value="" />
    </div>
    <div class="ad-acciones">
      <button class="btn" type="button" data-enviar>Enviar código</button>
    </div>
    <p class="ad-aviso" data-aviso role="status" aria-live="polite"></p>
    <div class="ad-enlaces">
      <button class="ad-enlace" type="button" data-volver>← Volver a iniciar sesión</button>
    </div>`);const a=e=>v.querySelector(e);a("[data-volver]").addEventListener("click",()=>P()),a("#correo").focus(),a("[data-enviar]").addEventListener("click",async()=>{const e=a("[data-enviar]"),t=a("#correo").value.trim();if(!t){g(a("[data-aviso]"),"Escribe tu correo de administrador.");return}e.disabled=!0,e.textContent="Enviando…";const s=await oa(t);if(e.disabled=!1,e.textContent="Enviar código",!s.ok){g(a("[data-aviso]"),s.mensaje);return}va(t)})}function va(a){x(`
    <p class="ad-login__sub">Escribe el código de 6 dígitos que llegó a
      <strong>${a}</strong>. Puedes pegarlo completo.</p>
    <div class="ad-codigo" data-codigo>
      ${Array.from({length:6},(r,c)=>`
        <input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="1"
               aria-label="Dígito ${c+1} de 6" data-pos="${c}" />`).join("")}
    </div>
    <div class="ad-acciones">
      <button class="btn" type="button" data-verificar>Comprobar código</button>
      <button class="btn btn--sec" type="button" data-reenviar disabled>Reenviar código (60 s)</button>
    </div>
    <p class="ad-aviso" data-aviso role="status" aria-live="polite"></p>
    <div class="ad-enlaces">
      <button class="ad-enlace" type="button" data-volver>← Volver a iniciar sesión</button>
    </div>`);const e=r=>v.querySelector(r),t=[...v.querySelectorAll("[data-pos]")],s=()=>t.map(r=>r.value).join("");t.forEach((r,c)=>{r.addEventListener("input",()=>{r.value=r.value.replace(/\D/g,"").slice(0,1),r.value&&c<5&&t[c+1].focus()}),r.addEventListener("keydown",d=>{d.key==="Backspace"&&!r.value&&c>0&&t[c-1].focus(),d.key==="Enter"&&e("[data-verificar]").click()}),r.addEventListener("paste",d=>{const b=(d.clipboardData?.getData("text")??"").replace(/\D/g,"").slice(0,6);b&&(d.preventDefault(),b.split("").forEach((h,$)=>{t[$]&&(t[$].value=h)}),t[Math.min(b.length,5)].focus())})}),t[0]?.focus();const i=e("[data-reenviar]");let o=60;const n=setInterval(()=>{o-=1,o<=0?(clearInterval(n),i.disabled=!1,i.textContent="Reenviar código"):i.textContent=`Reenviar código (${o} s)`},1e3);i.addEventListener("click",async()=>{i.disabled=!0;const r=await oa(a);g(e("[data-aviso]"),r.ok?"Código reenviado. Revisa tu correo.":r.mensaje,r.ok?"ok":"error"),va(a)}),e("[data-volver]").addEventListener("click",()=>{clearInterval(n),P()}),e("[data-verificar]").addEventListener("click",async()=>{const r=e("[data-verificar]");r.disabled=!0,r.textContent="Comprobando…";const c=await Oa(a,s());if(r.disabled=!1,r.textContent="Comprobar código",!c.ok){g(e("[data-aviso]"),c.mensaje);return}clearInterval(n),pe()})}function pe(){x(`
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
    </form>`);const a=n=>v.querySelector(n),e=["floja","justa","buena","fuerte"];a("[data-ver]").addEventListener("click",()=>{["#c1","#c2"].forEach(n=>{const r=a(n);r.type=r.type==="password"?"text":"password"})});const t=a("#c1"),s=a("[data-fuerza]"),i=s?.querySelector("i"),o=a("[data-nivel]");t.addEventListener("input",()=>{const n=qa(t.value);s&&(s.dataset.nivel=String(n)),i&&(i.style.width=`${n/3*100}%`),o&&(o.textContent=`Seguridad: ${e[n]}`)}),v.querySelector("form").addEventListener("submit",async n=>{n.preventDefault();const r=a("#c1").value,c=a("#c2").value;if(!sa(r)){g(a("[data-aviso]"),"La contraseña necesita 10 caracteres como mínimo, con al menos una letra y un número.");return}if(r!==c){g(a("[data-aviso]"),"Las dos contraseñas no coinciden.");return}const d=a("[data-guardar]");d.disabled=!0,d.textContent="Guardando…";const b=await Ua(r);if(d.disabled=!1,d.textContent="Guardar contraseña",!b.ok){g(a("[data-aviso]"),b.mensaje);return}g(a("[data-aviso]"),"Contraseña guardada ✔","ok"),setTimeout(()=>W(),700)})}function me(){return`
    <header class="ad-cabecera">
      <div class="ad-cabecera__titulo">
        <p class="eyebrow">EMO-AVENTURA · Administración</p>
        <h1>Uso de las islas</h1>
      </div>
      <div class="ad-cabecera__acciones">
        <div class="ad-periodos" role="group" aria-label="Periodo">
          ${da.map(a=>`
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
    <main class="ad-main" data-tablero></main>`}async function W(){ma(me());const a=e=>v.querySelector(e);v.querySelectorAll("[data-periodo]").forEach(e=>{e.addEventListener("click",()=>{f=e.dataset.periodo,v.querySelectorAll("[data-periodo]").forEach(t=>t.setAttribute("aria-pressed",String(t===e))),a("[data-fechas]").classList.toggle("is-on",f==="rango"),(f!=="rango"||m.desde&&m.hasta)&&k()})}),a("#f-desde")?.addEventListener("change",e=>{m.desde=e.target.value,m.hasta&&k()}),a("#f-hasta")?.addEventListener("change",e=>{m.hasta=e.target.value,m.desde&&k()}),a("[data-refrescar]").addEventListener("click",()=>k()),a("[data-salir]").addEventListener("click",async()=>{await G()}),fe(),k()}function ve(){return da.find(a=>a.id===f),f==="rango"&&m.desde&&m.hasta?`Del ${m.desde} al ${m.hasta}`:f==="hoy"?"Hoy":f==="7d"?"Los últimos 7 días":f==="30d"?"Los últimos 30 días":"Todo el histórico"}async function k(){const a=v.querySelector("[data-tablero]");if(a){na(),Xa(a);try{const e=await Ja(Ka(f,m));te(a,e,ve()),pa=Date.now(),be()}catch(e){if(String(e?.message??"").includes("Acceso no autorizado")){await G("Acceso no autorizado.");return}ee(a,"Revisa tu conexión y vuelve a intentarlo.",()=>k())}}}function be(){clearInterval(M);const a=()=>{const e=v.querySelector("[data-reloj]");if(!e){clearInterval(M);return}const t=Math.round((Date.now()-pa)/6e4);e.textContent=t<1?"Actualizado ahora":`Actualizado hace ${t} min`};a(),M=setInterval(a,3e4)}function fe(){const a=()=>{clearTimeout(H),H=setTimeout(()=>G("Se cerró la sesión por inactividad."),za)};["pointerdown","keydown","wheel","touchstart"].forEach(e=>window.addEventListener(e,a,{passive:!0})),a()}async function G(a=""){clearTimeout(H),clearInterval(M),na(),await Ha(),P(a,a?"info":"error")}(async function(){if(!aa){de();return}B({recordar:!0}),await Pa()?W():P()})();
