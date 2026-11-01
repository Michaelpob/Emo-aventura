const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./excel-CzWTpz2X.js","./supabaseClient-DvXkYhCX.js","./supabase-CcCxm0Mt.js","./chart-BK0e6cPM.js"])))=>i.map(i=>d[i]);
import{e as ta,A as J,i as sa,_ as _a,a as $a}from"./supabaseClient-DvXkYhCX.js";import{createClient as Ea}from"./supabase-CcCxm0Mt.js";import{C as j,B as wa,a as Sa,L as ka,b as ja,P as Ca,D as xa,A as La,c as Aa,d as Ia,T as Da,p as Na,e as Ta,i as Ma}from"./chart-BK0e6cPM.js";const Ra="https://xbptrlrkmcvzbrmednek.supabase.co".trim(),za="sb_publishable_zHBk4bT0-xjB0oNSpMlipw_CcZrYRFu".trim(),qa=5,Pa=120*1e3,Va=1800*1e3;let H=null,M=0,oa=0;function Z({recordar:a=!0}={}){return ta?(H=Ea(Ra,za,{auth:{persistSession:!0,autoRefreshToken:!0,detectSessionInUrl:!1,storage:a?window.localStorage:window.sessionStorage,storageKey:"emoaventura.admin.auth"}}),H):null}function C(){return H??Z({recordar:!0})}function q(a){return String(a??"").trim().toLowerCase()}function z(a){const e=q(a);return e?J.length===0||J.includes(e):!1}function W(){const a=oa-Date.now();return a>0?Math.ceil(a/1e3):0}function Q(){M+=1,M>=qa&&(oa=Date.now()+Pa,M=0)}function Oa(a){const e=String(a??"");if(e.length<10)return 0;let t=1;return/[a-zA-Z]/.test(e)&&/\d/.test(e)&&(t+=1),e.length>=14&&/[^a-zA-Z0-9]/.test(e)&&(t+=1),Math.min(3,t)}function ia(a){const e=String(a??"");return e.length>=10&&/[a-zA-Z]/.test(e)&&/\d/.test(e)}async function Ua(){const a=C();if(!a)return null;try{const{data:e}=await a.auth.getSession(),t=e?.session?.user?.email??null;return t?z(t)?e.session:(await a.auth.signOut(),null):null}catch{return null}}async function Ba(a,e,t){if(W()>0)return{ok:!1,mensaje:`Demasiados intentos. Vuelve a probar en ${W()} s.`};const s=q(a);if(!z(s))return Q(),{ok:!1,mensaje:"Usuario o contraseña incorrectos."};const i=Z({recordar:t});if(!i)return{ok:!1,mensaje:"El panel no está configurado todavía."};try{const{data:o,error:r}=await i.auth.signInWithPassword({email:s,password:e});return r||!o?.session?(Q(),{ok:!1,mensaje:"Usuario o contraseña incorrectos."}):z(o.session.user?.email)?(M=0,{ok:!0}):(await i.auth.signOut(),{ok:!1,mensaje:"Acceso no autorizado."})}catch{return{ok:!1,mensaje:"No se pudo conectar. Revisa tu conexión e inténtalo otra vez."}}}async function na(a){const e=C();if(!e)return{ok:!1,mensaje:"El panel no está configurado todavía."};const t=q(a);if(!z(t))return{ok:!1,mensaje:"Ese correo no tiene acceso al panel."};try{const{error:s}=await e.auth.signInWithOtp({email:t,options:{shouldCreateUser:!1}});if(s){const i=String(s.message??"").toLowerCase();return i.includes("rate")||i.includes("seconds")?{ok:!1,mensaje:"Se han pedido muchos códigos seguidos. Espera un minuto y vuelve a intentarlo."}:{ok:!1,mensaje:"No se pudo enviar el código. Revisa la configuración de correo en Supabase."}}return{ok:!0}}catch{return{ok:!1,mensaje:"No se pudo conectar. Revisa tu conexión e inténtalo otra vez."}}}async function Ha(a,e){const t=C();if(!t)return{ok:!1,mensaje:"El panel no está configurado todavía."};const s=q(a),i=String(e??"").replace(/\D/g,"");if(i.length!==6)return{ok:!1,mensaje:"El código tiene 6 dígitos."};try{const{data:o,error:r}=await t.auth.verifyOtp({email:s,token:i,type:"email"});return r||!o?.session?String(r?.message??"").toLowerCase().includes("expired")?{ok:!1,mensaje:"El código ya venció. Pide uno nuevo."}:{ok:!1,mensaje:"El código no es correcto. Revísalo o pide uno nuevo."}:{ok:!0}}catch{return{ok:!1,mensaje:"No se pudo comprobar el código. Inténtalo otra vez."}}}async function Wa(a){const e=C();if(!e)return{ok:!1,mensaje:"El panel no está configurado todavía."};if(!ia(a))return{ok:!1,mensaje:"La contraseña necesita 10 caracteres como mínimo, con al menos una letra y un número."};try{const{error:t}=await e.auth.updateUser({password:a});return t?{ok:!1,mensaje:"No se pudo guardar la contraseña. Inténtalo otra vez."}:{ok:!0}}catch{return{ok:!1,mensaje:"No se pudo conectar. Inténtalo otra vez."}}}async function Ga(){try{await C()?.auth.signOut()}catch{}}j.register(wa,Sa,ka,ja,Ca,xa,La,Aa,Ia,Da,Na,Ta,Ma);j.defaults.font.family='Inter, ui-sans-serif, system-ui, "Segoe UI", sans-serif';j.defaults.color="#43606f";j.defaults.plugins.legend.labels.usePointStyle=!0;j.defaults.plugins.legend.labels.boxWidth=10;function ra(a){const e=document.createElement("canvas");e.width=8,e.height=8;const t=e.getContext("2d");return t.fillStyle=a,t.fillRect(0,0,8,8),t.strokeStyle="rgba(255,255,255,0.55)",t.lineWidth=2.5,t.beginPath(),t.moveTo(-2,8),t.lineTo(8,-2),t.moveTo(2,10),t.lineTo(10,2),t.stroke(),t.createPattern(e,"repeat")}const A=new Map;function x(a,e){const t=document.getElementById(a);if(!t)return null;A.get(a)?.destroy();const s=new j(t,e);return A.set(a,s),s}function ca(){A.forEach(a=>a.destroy()),A.clear()}const P=a=>({beginAtZero:!0,ticks:{precision:0},title:{display:!0,text:a,font:{weight:"700"}},grid:{color:"rgba(16,44,54,0.08)"}});function Za(a){return x("g-visitas-isla",{type:"bar",data:{labels:a.map(e=>`${e.emoji} ${e.nombre}`),datasets:[{label:"Visitas",data:a.map(e=>e.visitas),backgroundColor:a.map(e=>e.id==="frustration"?ra(e.color):e.color),borderColor:a.map(e=>e.color),borderWidth:1,borderRadius:6}]},options:{maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{callbacks:{label:e=>`${e.parsed.y} visitas`}}},scales:{y:P("Visitas"),x:{grid:{display:!1}}}}})}function Fa(a){return x("g-partidas",{type:"bar",data:{labels:a.map(e=>`${e.emoji} ${e.nombre}`),datasets:[{label:"Partidas iniciadas",data:a.map(e=>e.iniciadas),backgroundColor:"rgba(16,44,54,0.22)",borderColor:"#102c36",borderWidth:1,borderRadius:6},{label:"Partidas completadas",data:a.map(e=>e.completadas),backgroundColor:a.map(e=>e.id==="frustration"?ra(e.color):e.color),borderColor:a.map(e=>e.color),borderWidth:1,borderRadius:6}]},options:{maintainAspectRatio:!1,plugins:{tooltip:{callbacks:{label:e=>`${e.dataset.label}: ${e.parsed.y}`}}},scales:{y:P("Partidas"),x:{grid:{display:!1}}}}})}function Ya(a,e){return x("g-dias",{type:"line",data:{labels:a,datasets:e.map(t=>({label:t.total?"Total":`${t.emoji} ${t.nombre}`,data:t.datos,borderColor:t.total?"#102c36":t.color,backgroundColor:t.total?"rgba(16,44,54,0.08)":t.color,borderWidth:t.total?3:2,borderDash:t.id==="frustration"?[6,4]:[],pointRadius:2.5,pointHoverRadius:5,tension:.3,fill:!!t.total}))},options:{maintainAspectRatio:!1,interaction:{mode:"index",intersect:!1},plugins:{legend:{position:"bottom"},tooltip:{callbacks:{label:t=>`${t.dataset.label}: ${t.parsed.y} visitas`}}},scales:{y:P("Visitas"),x:{title:{display:!0,text:"Día",font:{weight:"700"}},grid:{display:!1}}}}})}function Ka(a){return x("g-horas",{type:"bar",data:{labels:a.map((e,t)=>`${String(t).padStart(2,"0")} h`),datasets:[{label:"Visitas",data:a,backgroundColor:"#2f7fb5",borderRadius:6}]},options:{maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{callbacks:{title:e=>`A las ${e[0].label}`,label:e=>`${e.parsed.y} visitas`}}},scales:{y:P("Visitas"),x:{title:{display:!0,text:"Hora del día (America/Bogotá)",font:{weight:"700"}},grid:{display:!1}}}}})}const la={mobile:"📱 Móvil",tablet:"🖥️ Tableta",desktop:"💻 Escritorio"};function Ja(a){return x("g-dispositivos",{type:"doughnut",data:{labels:a.map(e=>la[e.device]??e.device),datasets:[{data:a.map(e=>e.sesiones),backgroundColor:["#2f7fb5","#f5a524","#2e9e6b","#5947a5"],borderColor:"#fff",borderWidth:2}]},options:{maintainAspectRatio:!1,cutout:"58%",plugins:{legend:{position:"bottom"},tooltip:{callbacks:{label:e=>{const t=e.dataset.data.reduce((s,i)=>s+i,0)||1;return`${e.label}: ${e.parsed} sesiones (${Math.round(e.parsed/t*100)} %)`}}}}}})}function Qa(a,e,t,s){return x(a,{type:"line",data:{labels:e,datasets:[{label:"Visitas",data:t,borderColor:s,backgroundColor:`${s}22`,borderWidth:2,pointRadius:2,tension:.3,fill:!0}]},options:{maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{callbacks:{label:i=>`${i.parsed.y} visitas`}}},scales:{y:{beginAtZero:!0,ticks:{precision:0}},x:{grid:{display:!1}}}}})}const X={"g-visitas-isla":"Visitas por isla","g-partidas":"Partidas iniciadas y completadas","g-dias":"Visitas por día","g-horas":"Visitas por hora del día","g-dispositivos":"Tipo de dispositivo"};function Xa(a){const e=document.createElement("canvas");e.width=a.width,e.height=a.height;const t=e.getContext("2d");return t.fillStyle="#ffffff",t.fillRect(0,0,e.width,e.height),t.drawImage(a,0,0),e.toDataURL("image/png")}function Se(){return Object.keys(X).map(a=>{const e=A.get(a);return e?.canvas?{id:a,titulo:X[a],base64:Xa(e.canvas),ancho:Math.round(e.canvas.clientWidth||640),alto:Math.round(e.canvas.clientHeight||240)}:null}).filter(Boolean)}const da=sa.map(a=>({id:a.id,nombre:a.displayName,emocion:a.name,emoji:a.emoji??"",color:a.palette.ui,glow:a.palette.glow})),ua=new Map(da.map(a=>[a.id,a])),pa=[{id:"hoy",texto:"Hoy",dias:0},{id:"7d",texto:"7 días",dias:7},{id:"30d",texto:"30 días",dias:30},{id:"todo",texto:"Todo",dias:null},{id:"rango",texto:"Personalizado",dias:void 0}];function ae(a,e={}){const t=new Date,s=new Date(t.getTime()+6e4);let i;if(a==="hoy")i=new Date(t),i.setHours(0,0,0,0);else if(a==="7d"||a==="30d"){const o=a==="7d"?7:30;i=new Date(t.getTime()-o*24*3600*1e3)}else if(a==="rango"&&e.desde&&e.hasta){i=new Date(`${e.desde}T00:00:00`);const o=new Date(`${e.hasta}T00:00:00`);return o.setDate(o.getDate()+1),aa(i,o)}else i=new Date("2020-01-01T00:00:00Z");return aa(i,s)}function aa(a,e){const t=e.getTime()-a.getTime();return{desde:a.toISOString(),hasta:e.toISOString(),desdeAntes:new Date(a.getTime()-t).toISOString(),hastaAntes:a.toISOString()}}async function S(a,e,t,s){const{data:i,error:o}=await a.rpc(e,{p_from:t,p_to:s});if(o)throw new Error(o.message);return i??[]}async function ee(a){const e=C();if(!e)throw new Error("sin-configurar");const{desde:t,hasta:s,desdeAntes:i,hastaAntes:o}=a,[r,c,l,d,f,y]=await Promise.all([S(e,"admin_summary",t,s),S(e,"admin_island_stats",t,s),S(e,"admin_daily_visits",t,s),S(e,"admin_hourly_visits",t,s),S(e,"admin_devices",t,s),S(e,"admin_summary",i,o)]);return{resumen:r[0]??ea(),resumenAntes:y[0]??ea(),islas:da.map(w=>{const _=c.find(D=>D.island_id===w.id)??{};return{...w,visitas:Number(_.visitas??0),sesiones:Number(_.sesiones_unicas??0),iniciadas:Number(_.partidas_iniciadas??0),completadas:Number(_.partidas_completas??0),tasa:Number(_.tasa_finalizacion??0),duracion:Number(_.duracion_promedio??0),ultima:_.ultima_visita??null}}),dias:l,horas:d,dispositivos:f}}function ea(){return{visitas:0,sesiones_unicas:0,partidas_iniciadas:0,partidas_completas:0,tasa_finalizacion:0,duracion_promedio:0}}const p=a=>Number(a??0).toLocaleString("es-CO");function ma(a){const e=Math.max(0,Math.round(Number(a??0)/1e3));return`${String(Math.floor(e/60)).padStart(2,"0")}:${String(e%60).padStart(2,"0")}`}function te(a){if(!a)return"sin visitas";const e=Math.round((Date.now()-new Date(a).getTime())/6e4);if(e<1)return"hace un momento";if(e<60)return`hace ${e} min`;const t=Math.round(e/60);if(t<24)return`hace ${t} h`;const s=Math.round(t/24);return s===1?"ayer":`hace ${s} días`}function T(a,e){const t=Number(a??0),s=Number(e??0);if(!s)return t?{clase:"sube",texto:"nuevo"}:{clase:"igual",texto:"sin cambios"};const i=Math.round((t-s)/s*100);return i===0?{clase:"igual",texto:"igual que antes"}:{clase:i>0?"sube":"baja",texto:`${i>0?"▲":"▼"} ${Math.abs(i)} % vs. periodo anterior`}}const m=a=>String(a??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]);function se(a){a.innerHTML=`
    <section class="ad-seccion" aria-busy="true" aria-live="polite">
      <p class="solo-lectores">Cargando estadísticas…</p>
      <div class="ad-metricas">${'<div class="tarjeta ad-esqueleto"></div>'.repeat(4)}</div>
      <div class="tarjeta ad-esqueleto" style="min-height:120px"></div>
      <div class="ad-islas">${'<div class="tarjeta ad-esqueleto" style="min-height:190px"></div>'.repeat(6)}</div>
    </section>`}function oe(a){a.innerHTML=`
    <section class="tarjeta ad-vacio">
      <h2>Aún no hay visitas en este periodo</h2>
      <p>Las estadísticas empiezan a contar desde que se publicó esta versión del juego.
         Prueba con un periodo más amplio, por ejemplo «Todo».</p>
    </section>`}function ie(a,e,t){a.innerHTML=`
    <section class="tarjeta ad-error" role="alert">
      <h2>No se pudieron cargar los datos</h2>
      <p>${m(e)}</p>
      <button class="btn" type="button" data-reintentar>Reintentar</button>
    </section>`,a.querySelector("[data-reintentar]")?.addEventListener("click",t)}function ne(a,e,t){const{resumen:s,resumenAntes:i,islas:o,dias:r,horas:c,dispositivos:l}=e,d=Number(s.visitas??0);if(!d&&!Number(s.partidas_iniciadas??0)){oe(a);return}const f=[...o].sort((n,u)=>u.visitas-n.visitas),y=f[0],w=Math.max(1,...o.map(n=>n.visitas));let _=0,D=null;const O=f.map((n,u)=>(n.visitas!==D&&(_=u+1,D=n.visitas),{...n,puesto:_})),ga=n=>n===1?"🥇":n===2?"🥈":n===3?"🥉":"",ha=[{nombre:"Visitas totales",valor:p(s.visitas),d:T(s.visitas,i.visitas)},{nombre:"Sesiones únicas",valor:p(s.sesiones_unicas),d:T(s.sesiones_unicas,i.sesiones_unicas)},{nombre:"Partidas completadas",valor:p(s.partidas_completas),d:T(s.partidas_completas,i.partidas_completas)},{nombre:"Tasa de finalización",valor:`${Number(s.tasa_finalizacion??0)} %`,d:T(s.tasa_finalizacion,i.tasa_finalizacion)}];a.innerHTML=`
    <section class="ad-seccion" aria-label="Resumen general">
      <div class="ad-metricas">
        ${ha.map(n=>`
          <article class="tarjeta ad-metrica">
            <span class="ad-metrica__valor">${n.valor}</span>
            <span class="ad-metrica__nombre">${n.nombre}</span>
            <span class="ad-metrica__delta ad-metrica__delta--${n.d.clase}">${n.d.texto}</span>
          </article>`).join("")}
      </div>
    </section>

    <section class="ad-seccion" aria-label="Isla más visitada">
      <article class="tarjeta ad-top" style="--c:${y.color}">
        <span class="ad-top__emoji" aria-hidden="true">${y.emoji}</span>
        <div class="ad-top__datos">
          <span class="eyebrow">Isla más visitada</span>
          <span class="ad-top__nombre">${m(y.nombre)}</span>
          <span class="ad-top__cifra">${p(y.visitas)} visitas · ${d?Math.round(y.visitas/d*100):0} % del total · ${m(y.emocion)}</span>
        </div>
        <span class="ad-top__trofeo" aria-hidden="true">🏆</span>
      </article>
    </section>

    <section class="ad-seccion" aria-label="Ranking de islas">
      <div class="ad-seccion__titulo"><h2>Ranking de islas</h2><span class="ad-actualizado">${m(t)}</span></div>
      <div class="tarjeta">
        <ol class="ad-rank">
          ${O.map(n=>`
            <li style="--c:${n.color}">
              <span class="ad-rank__pos">${ga(n.puesto)||n.puesto}</span>
              <span class="ad-rank__emoji" aria-hidden="true">${n.emoji}</span>
              <span class="ad-rank__barra">
                <span class="ad-rank__relleno" style="width:${Math.round(n.visitas/w*100)}%" data-rayas="${n.id==="frustration"}"></span>
                <span class="ad-rank__texto">${m(n.nombre)} · ${m(n.emocion)}</span>
              </span>
              <span class="ad-rank__cifra">${p(n.visitas)} · ${d?Math.round(n.visitas/d*100):0} %</span>
            </li>`).join("")}
        </ol>
      </div>
    </section>

    <section class="ad-seccion" aria-label="Estadísticas por isla">
      <div class="ad-seccion__titulo"><h2>Estadísticas por isla</h2><span class="ad-actualizado">Toca una tarjeta para ver su gráfica por día</span></div>
      <div class="ad-islas">
        ${o.map(n=>`
          <button class="ad-isla" type="button" data-isla="${n.id}" style="--c:${n.color};--glow:${n.glow}" aria-expanded="false">
            <span class="ad-isla__franja"></span>
            <span class="ad-isla__cuerpo">
              <span class="ad-isla__cabecera">
                <span class="ad-isla__emoji" aria-hidden="true">${n.emoji}</span>
                <span>
                  <span class="ad-isla__nombre">${m(n.nombre)}</span>
                  <span class="ad-isla__emocion">${m(n.emocion)}</span>
                </span>
              </span>
              <span class="ad-isla__datos">
                <span class="ad-isla__dato"><b>${p(n.visitas)}</b>visitas</span>
                <span class="ad-isla__dato"><b>${p(n.sesiones)}</b>sesiones únicas</span>
                <span class="ad-isla__dato"><b>${p(n.iniciadas)}</b>partidas iniciadas</span>
                <span class="ad-isla__dato"><b>${p(n.completadas)}</b>completadas</span>
              </span>
              <span class="ad-isla__barra"><i style="width:${Math.min(100,n.tasa)}%"></i></span>
              <span class="ad-isla__pie">
                <span>${n.tasa} % de finalización</span>
                <span>⏱ ${ma(n.duracion)}</span>
              </span>
              <span class="ad-isla__pie"><span>Última visita: ${te(n.ultima)}</span></span>
            </span>
            <span class="ad-isla__detalle oculto"><canvas id="g-isla-${n.id}" height="160"></canvas></span>
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
        <p class="ad-texto">${de(e,O,t)}</p>
      </div>
    </section>

    <section class="ad-seccion">
      <div class="tarjeta" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between">
        <span class="ad-texto">Descarga el periodo completo: hojas con el resumen, el ranking,
          cada isla, los días, las horas, los dispositivos y las cinco gráficas.</span>
        <span class="ad-descargas">
          <button class="btn" type="button" data-excel>⤓ Descargar Excel</button>
          <button class="btn btn--sec btn--chico" type="button" data-csv>CSV simple</button>
        </span>
      </div>
    </section>`;const{etiquetas:N,series:U,porIsla:ya}=re(r,o);Za(o),Fa(o),Ya(N,U),Ka(B(c)),Ja(l.length?l:[{device:"desktop",sesiones:0}]),a.querySelectorAll("[data-tabla]").forEach(n=>{n.addEventListener("click",()=>{const u=n.closest(".ad-grafica"),$=u.querySelector(".ad-tabla-alt"),E=u.querySelector(".ad-grafica__lienzo");if(!$.classList.contains("oculto")){$.classList.add("oculto"),E.classList.remove("oculto"),n.textContent="Ver como tabla";return}$.innerHTML=le(n.dataset.tabla,{islas:o,etiquetas:N,series:U,horas:B(c),dispositivos:l}),$.classList.remove("oculto"),E.classList.add("oculto"),n.textContent="Ver como gráfica"})}),a.querySelectorAll("[data-isla]").forEach(n=>{n.addEventListener("click",()=>{const u=n.dataset.isla,$=n.querySelector(".ad-isla__detalle"),E=!$.classList.contains("oculto");$.classList.toggle("oculto",E),n.setAttribute("aria-expanded",String(!E)),E||Qa(`g-isla-${u}`,N,ya.get(u)??[],ua.get(u).color)})}),a.querySelector("[data-csv]")?.addEventListener("click",()=>ue(r,t)),a.querySelector("[data-excel]")?.addEventListener("click",async n=>{const u=n.currentTarget,$=u.textContent;u.disabled=!0,u.textContent="Preparando…";try{const{descargarExcel:E}=await _a(async()=>{const{descargarExcel:K}=await import("./excel-CzWTpz2X.js");return{descargarExcel:K}},__vite__mapDeps([0,1,2,3]),import.meta.url);await E({datos:{...e,islas:o,dispositivos:l},orden:O,etiquetas:N,series:U,horas:B(c),periodoTexto:t})}catch(E){console.warn("[panel] no se pudo crear el Excel",E),u.textContent="No se pudo crear el Excel",setTimeout(()=>{u.textContent=$,u.disabled=!1},2500);return}u.textContent=$,u.disabled=!1})}function L(a,e,t,s=!1){return`
    <article class="tarjeta ad-grafica ${s?"ad-grafica--ancha":""}">
      <div class="ad-grafica__cabecera">
        <div><h3>${e}</h3><span class="ad-actualizado">${t}</span></div>
        <button class="btn btn--sec btn--chico" type="button" data-tabla="${a}">Ver como tabla</button>
      </div>
      <div class="ad-grafica__lienzo"><canvas id="${a}"></canvas></div>
      <div class="ad-tabla-alt oculto"></div>
    </article>`}function re(a,e){const t=[...new Set(a.map(r=>r.dia))].sort(),s=new Map(e.map(r=>[r.id,t.map(()=>0)])),i=t.map(()=>0);a.forEach(r=>{const c=t.indexOf(r.dia),l=s.get(r.island_id);c>=0&&l&&(l[c]+=Number(r.visitas??0),i[c]+=Number(r.visitas??0))});const o=e.map(r=>({...r,datos:s.get(r.id)}));return o.push({id:"total",nombre:"Total",emoji:"",color:"#102c36",datos:i,total:!0}),{etiquetas:t.map(ce),series:o,porIsla:s}}function ce(a){try{const[e,t,s]=String(a).split("-");return`${s}/${t}`}catch{return a}}function B(a){const e=Array.from({length:24},()=>0);return a.forEach(t=>{e[Number(t.hora)]=Number(t.visitas??0)}),e}function le(a,e){const t=(o,r)=>`
    <table><caption class="solo-lectores">Datos de la gráfica</caption>
      <thead><tr>${o.map(c=>`<th scope="col">${c}</th>`).join("")}</tr></thead>
      <tbody>${r.map(c=>`<tr>${c.map(l=>`<td>${l}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;if(a==="g-visitas-isla")return t(["Isla","Visitas"],e.islas.map(o=>[`${o.emoji} ${m(o.nombre)}`,p(o.visitas)]));if(a==="g-partidas")return t(["Isla","Iniciadas","Completadas"],e.islas.map(o=>[`${o.emoji} ${m(o.nombre)}`,p(o.iniciadas),p(o.completadas)]));if(a==="g-horas")return t(["Hora","Visitas"],e.horas.map((o,r)=>[`${String(r).padStart(2,"0")} h`,p(o)]));if(a==="g-dispositivos")return t(["Dispositivo","Sesiones"],e.dispositivos.map(o=>[la[o.device]??o.device,p(o.sesiones)]));const s=["Día",...e.series.map(o=>o.total?"Total":`${o.emoji} ${o.nombre}`)],i=e.etiquetas.map((o,r)=>[o,...e.series.map(c=>p(c.datos[r]))]);return t(s,i)}function de(a,e,t){const{resumen:s}=a,i=Number(s.visitas??0),o=e[0],r=e[e.length-1],c=i?Math.round(o.visitas/i*100):0,l=Number(s.tasa_finalizacion??0),d=Number(s.sesiones_unicas??0);return`En <b>${m(t.toLowerCase())}</b> hubo <b>${p(i)}</b> visitas de <b>${p(d)}</b> sesiones distintas.
    La isla más visitada fue <b>${m(o.nombre)}</b> (${m(o.emocion)}) con ${p(o.visitas)} visitas (${c} %);
    la menos visitada, <b>${m(r.nombre)}</b> con ${p(r.visitas)}.
    Se completó el <b>${l} %</b> de las partidas iniciadas, con una duración media de <b>${ma(s.duracion_promedio)}</b> por partida.`}function ue(a,e){const t=[["dia","isla_id","isla","emocion","visitas"]];a.forEach(r=>{const c=ua.get(r.island_id);t.push([r.dia,r.island_id,c?.nombre??r.island_id,c?.emocion??"",r.visitas])});const s="\uFEFF"+t.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(";")).join(`
`),i=new Blob([s],{type:"text/csv;charset=utf-8;"}),o=document.createElement("a");o.href=URL.createObjectURL(i),o.download=`emo-aventura-visitas-${e.toLowerCase().replace(/\s+/g,"-")}.csv`,o.click(),setTimeout(()=>URL.revokeObjectURL(o.href),2e3)}const b=document.querySelector("#admin"),pe=sa.map(a=>a.emoji??"").join(" ");let g="7d",v={desde:"",hasta:""},va=0,R=null,G=null;const me='<div class="ad-nubes" aria-hidden="true"><i></i><i></i><i></i></div>';function ba(a){b.innerHTML=`${me}<div class="ad-app">${a}</div>`}function I(a){ba(`
    <div class="ad-login">
      <section class="ad-login__card">
        <div class="ad-sello" aria-hidden="true">EA</div>
        <p class="eyebrow">EMO-AVENTURA</p>
        <h1>Panel de administración</h1>
        <div class="ad-login__islas" aria-hidden="true">${pe}</div>
        ${a}
        <div class="ad-enlaces">
          <a href="./index.html">← Volver al juego</a>
        </div>
      </section>
    </div>`)}function h(a,e,t="error"){a&&(a.className=`ad-aviso ad-aviso--${t}`,a.textContent=e??"")}function ve(){I(`
    <div class="ad-sinconfig">
      <p class="ad-login__sub">El panel todavía no está conectado a su base de datos.
        Falta crear el archivo <code>.env</code> con los datos del proyecto de Supabase
        y volver a publicar.</p>
      <pre>VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ADMIN_EMAIL=${$a||"correo@ejemplo.com"}</pre>
      <p class="ad-login__sub">Los pasos completos están en
        <strong>manuales/PANEL-ADMIN-CONFIGURACION.md</strong>. Mientras tanto, el juego
        funciona con total normalidad.</p>
    </div>`)}function V(a="",e="error"){I(`
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
    </div>`);const t=b.querySelector("form"),s=i=>b.querySelector(i);a&&h(s("[data-aviso]"),a,e),s("[data-ver]").addEventListener("click",()=>{const i=s("#clave");i.type=i.type==="password"?"text":"password",i.focus()}),s("[data-olvido]").addEventListener("click",()=>be()),t.addEventListener("submit",async i=>{i.preventDefault();const o=s("[data-entrar]"),r=W();if(r>0){h(s("[data-aviso]"),`Demasiados intentos. Espera ${r} s.`);return}o.disabled=!0,o.textContent="Entrando…";const c=await Ba(s("#usuario").value,s("#clave").value,s("[data-recordar]").checked);if(o.disabled=!1,o.textContent="Entrar",!c.ok){h(s("[data-aviso]"),c.mensaje);return}await F()})}function be(){I(`
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
    </div>`);const a=e=>b.querySelector(e);a("[data-volver]").addEventListener("click",()=>V()),a("#correo").focus(),a("[data-enviar]").addEventListener("click",async()=>{const e=a("[data-enviar]"),t=a("#correo").value.trim();if(!t){h(a("[data-aviso]"),"Escribe tu correo de administrador.");return}e.disabled=!0,e.textContent="Enviando…";const s=await na(t);if(e.disabled=!1,e.textContent="Enviar código",!s.ok){h(a("[data-aviso]"),s.mensaje);return}fa(t)})}function fa(a){I(`
    <p class="ad-login__sub">Escribe el código de 6 dígitos que llegó a
      <strong>${a}</strong>. Puedes pegarlo completo.</p>
    <div class="ad-codigo" data-codigo>
      ${Array.from({length:6},(c,l)=>`
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
    </div>`);const e=c=>b.querySelector(c),t=[...b.querySelectorAll("[data-pos]")],s=()=>t.map(c=>c.value).join("");t.forEach((c,l)=>{c.addEventListener("input",()=>{c.value=c.value.replace(/\D/g,"").slice(0,1),c.value&&l<5&&t[l+1].focus()}),c.addEventListener("keydown",d=>{d.key==="Backspace"&&!c.value&&l>0&&t[l-1].focus(),d.key==="Enter"&&e("[data-verificar]").click()}),c.addEventListener("paste",d=>{const f=(d.clipboardData?.getData("text")??"").replace(/\D/g,"").slice(0,6);f&&(d.preventDefault(),f.split("").forEach((y,w)=>{t[w]&&(t[w].value=y)}),t[Math.min(f.length,5)].focus())})}),t[0]?.focus();const i=e("[data-reenviar]");let o=60;const r=setInterval(()=>{o-=1,o<=0?(clearInterval(r),i.disabled=!1,i.textContent="Reenviar código"):i.textContent=`Reenviar código (${o} s)`},1e3);i.addEventListener("click",async()=>{i.disabled=!0;const c=await na(a);h(e("[data-aviso]"),c.ok?"Código reenviado. Revisa tu correo.":c.mensaje,c.ok?"ok":"error"),fa(a)}),e("[data-volver]").addEventListener("click",()=>{clearInterval(r),V()}),e("[data-verificar]").addEventListener("click",async()=>{const c=e("[data-verificar]");c.disabled=!0,c.textContent="Comprobando…";const l=await Ha(a,s());if(c.disabled=!1,c.textContent="Comprobar código",!l.ok){h(e("[data-aviso]"),l.mensaje);return}clearInterval(r),fe()})}function fe(){I(`
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
    </form>`);const a=r=>b.querySelector(r),e=["floja","justa","buena","fuerte"];a("[data-ver]").addEventListener("click",()=>{["#c1","#c2"].forEach(r=>{const c=a(r);c.type=c.type==="password"?"text":"password"})});const t=a("#c1"),s=a("[data-fuerza]"),i=s?.querySelector("i"),o=a("[data-nivel]");t.addEventListener("input",()=>{const r=Oa(t.value);s&&(s.dataset.nivel=String(r)),i&&(i.style.width=`${r/3*100}%`),o&&(o.textContent=`Seguridad: ${e[r]}`)}),b.querySelector("form").addEventListener("submit",async r=>{r.preventDefault();const c=a("#c1").value,l=a("#c2").value;if(!ia(c)){h(a("[data-aviso]"),"La contraseña necesita 10 caracteres como mínimo, con al menos una letra y un número.");return}if(c!==l){h(a("[data-aviso]"),"Las dos contraseñas no coinciden.");return}const d=a("[data-guardar]");d.disabled=!0,d.textContent="Guardando…";const f=await Wa(c);if(d.disabled=!1,d.textContent="Guardar contraseña",!f.ok){h(a("[data-aviso]"),f.mensaje);return}h(a("[data-aviso]"),"Contraseña guardada ✔","ok"),setTimeout(()=>F(),700)})}function ge(){return`
    <header class="ad-cabecera">
      <div class="ad-cabecera__titulo">
        <p class="eyebrow">EMO-AVENTURA · Administración</p>
        <h1>Uso de las islas</h1>
      </div>
      <div class="ad-cabecera__acciones">
        <div class="ad-periodos" role="group" aria-label="Periodo">
          ${pa.map(a=>`
            <button class="ad-periodo" type="button" data-periodo="${a.id}" aria-pressed="${a.id===g}">${a.texto}</button>`).join("")}
        </div>
        <div class="ad-fechas ${g==="rango"?"is-on":""}" data-fechas>
          <label class="solo-lectores" for="f-desde">Desde</label>
          <input id="f-desde" type="date" value="${v.desde}" />
          <span>a</span>
          <label class="solo-lectores" for="f-hasta">Hasta</label>
          <input id="f-hasta" type="date" value="${v.hasta}" />
        </div>
        <button class="btn btn--sec btn--chico" type="button" data-refrescar>↻ Actualizar</button>
        <span class="ad-actualizado" data-reloj>Actualizado ahora</span>
        <a class="btn btn--sec btn--chico" href="./index.html">← Volver al juego</a>
        <button class="btn btn--chico" type="button" data-salir>Cerrar sesión</button>
      </div>
    </header>
    <main class="ad-main" data-tablero></main>`}async function F(){ba(ge());const a=e=>b.querySelector(e);b.querySelectorAll("[data-periodo]").forEach(e=>{e.addEventListener("click",()=>{g=e.dataset.periodo,b.querySelectorAll("[data-periodo]").forEach(t=>t.setAttribute("aria-pressed",String(t===e))),a("[data-fechas]").classList.toggle("is-on",g==="rango"),(g!=="rango"||v.desde&&v.hasta)&&k()})}),a("#f-desde")?.addEventListener("change",e=>{v.desde=e.target.value,v.hasta&&k()}),a("#f-hasta")?.addEventListener("change",e=>{v.hasta=e.target.value,v.desde&&k()}),a("[data-refrescar]").addEventListener("click",()=>k()),a("[data-salir]").addEventListener("click",async()=>{await Y()}),_e(),k()}function he(){return pa.find(a=>a.id===g),g==="rango"&&v.desde&&v.hasta?`Del ${v.desde} al ${v.hasta}`:g==="hoy"?"Hoy":g==="7d"?"Los últimos 7 días":g==="30d"?"Los últimos 30 días":"Todo el histórico"}async function k(){const a=b.querySelector("[data-tablero]");if(a){ca(),se(a);try{const e=await ee(ae(g,v));ne(a,e,he()),va=Date.now(),ye()}catch(e){if(String(e?.message??"").includes("Acceso no autorizado")){await Y("Acceso no autorizado.");return}ie(a,"Revisa tu conexión y vuelve a intentarlo.",()=>k())}}}function ye(){clearInterval(R);const a=()=>{const e=b.querySelector("[data-reloj]");if(!e){clearInterval(R);return}const t=Math.round((Date.now()-va)/6e4);e.textContent=t<1?"Actualizado ahora":`Actualizado hace ${t} min`};a(),R=setInterval(a,3e4)}function _e(){const a=()=>{clearTimeout(G),G=setTimeout(()=>Y("Se cerró la sesión por inactividad."),Va)};["pointerdown","keydown","wheel","touchstart"].forEach(e=>window.addEventListener(e,a,{passive:!0})),a()}async function Y(a=""){clearTimeout(G),clearInterval(R),ca(),await Ga(),V(a,a?"info":"error")}(async function(){if(!ta){ve();return}Z({recordar:!0}),await Ua()?F():V()})();export{la as N,Se as i};
