(()=>{
  const CARLOS_WHATSAPP="50687485810";
  const DASHBOARD_URL="https://tattoo-art-salas-carlos.onrender.com/#dashboard";
  const CLIENT_TOKEN_KEY="tattoo_client_token";

  const style=document.createElement("style");
  style.textContent=`
    #dashboard{display:none}
    .tattoo-admin-login{position:fixed;inset:0;background:rgba(0,0,0,.84);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px}
    .tattoo-admin-box{width:min(420px,100%);background:#151311;border:1px solid #4a4030;border-radius:18px;padding:28px;box-shadow:0 20px 70px rgba(0,0,0,.5);box-sizing:border-box}
    .tattoo-admin-box h3{margin:0 0 8px;color:#fff7ea;font-size:28px}
    .tattoo-admin-box p{color:#c8bda9;margin:0 0 20px}
    .tattoo-admin-box input{width:100%;box-sizing:border-box;background:#090909;color:#fff7ea;border:1px solid #4a4030;border-radius:10px;padding:13px;margin-bottom:12px;font-size:16px}
    .tattoo-admin-actions{display:flex;gap:10px}
    .tattoo-admin-actions button{border:0;border-radius:10px;padding:12px 16px;font-weight:700;cursor:pointer}
    .tattoo-admin-actions .primary{background:#dca94e;color:#111}
    .tattoo-admin-error{color:#e98c7d;min-height:20px;font-size:14px;margin-bottom:10px}
    #adminAccess{cursor:pointer!important}
  `;
  document.head.appendChild(style);

  function hideDashboard(){
    const d=document.querySelector("#dashboard");
    if(d)d.style.display="none";
    document.querySelectorAll('a[href="#dashboard"]').forEach(a=>a.style.display="none");
  }

  function showDashboard(){
    const d=document.querySelector("#dashboard");
    if(d)d.style.display="block";
    document.querySelectorAll('a[href="#dashboard"]').forEach(a=>a.style.display="");
  }

  function openLogin(){
    if(document.querySelector(".tattoo-admin-login"))return;
    const modal=document.createElement("div");
    modal.className="tattoo-admin-login";
    modal.innerHTML=`<div class="tattoo-admin-box">
      <h3>Acceso del tatuador</h3>
      <p>Ingresa la contraseña de Carlos para ver las solicitudes.</p>
      <form>
        <input id="tattooAdminPassword" type="password" placeholder="Contraseña" autocomplete="current-password" required>
        <div class="tattoo-admin-error"></div>
        <div class="tattoo-admin-actions">
          <button type="button" data-cancel>Cancelar</button>
          <button class="primary" type="submit">Entrar</button>
        </div>
      </form>
    </div>`;
    document.body.appendChild(modal);
    const form=modal.querySelector("form");
    const input=modal.querySelector("#tattooAdminPassword");
    const error=modal.querySelector(".tattoo-admin-error");
    modal.querySelector("[data-cancel]").addEventListener("click",()=>modal.remove());
    modal.addEventListener("click",e=>{if(e.target===modal)modal.remove()});
    input.focus();
    form.addEventListener("submit",async e=>{
      e.preventDefault();
      error.textContent="Entrando...";
      try{
        const r=await fetch("/api/admin/login",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({password:input.value})
        });
        const data=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(data.error||"No se pudo iniciar sesión.");
        modal.remove();
        showDashboard();
        location.hash="dashboard";
        location.reload();
      }catch(err){
        error.textContent=err.message;
      }
    });
  }

  function setupAccess(){
    hideDashboard();
    const nav=document.querySelector(".nav");
    if(!nav)return;
    let button=document.querySelector("#adminAccess");
    if(!button){
      button=document.createElement("button");
      button.id="adminAccess";
      button.type="button";
      button.textContent="Acceso tatuador";
      button.style.cssText="background:none;border:0;color:inherit;font:inherit;cursor:pointer;padding:0;margin-left:18px";
      nav.appendChild(button);
    }
    button.onclick=openLogin;

    fetch("/api/admin/session",{cache:"no-store"})
      .then(r=>r.json())
      .then(session=>{
        if(session.authenticated){
          showDashboard();
          button.textContent="Salir del panel";
          button.onclick=async()=>{
            await fetch("/api/admin/logout",{method:"POST"});
            location.reload();
          };
          if(location.hash==="#dashboard")setTimeout(()=>document.querySelector("#dashboard")?.scrollIntoView({behavior:"smooth"}),100);
        }
      })
      .catch(()=>{});
  }

  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(...args){
    let input=args[0],options={...(args[1]||{})};
    const url=typeof input==="string"?input:input?.url||"";
    const method=String(options.method||(typeof input!=="string"?input?.method:"GET")||"GET").toUpperCase();
    const token=localStorage.getItem(CLIENT_TOKEN_KEY);
    if(token&&(/\/api\/appointments\/[^/]+\/(payment-proof|consent)$/.test(url)||/\/api\/client\/appointments\//.test(url))){
      options.headers={...(options.headers||{}),"X-Client-Token":token};
      args=[input,options];
    }
    const isNew=method==="POST"&&/\/api\/appointments$/.test(url);
    const response=await originalFetch(...args);
    if(isNew){
      try{
        const payload=await response.clone().json();
        if(response.ok&&payload?.id){
          if(payload.clientToken)localStorage.setItem(CLIENT_TOKEN_KEY,payload.clientToken);
          const b=payload.booking||{};
          const refs=(payload.references||[]).map(x=>x.name).join(", ")||"Sin referencias";
          const message=[
            "📩 NUEVA SOLICITUD DE TATUAJE","",
            `Solicitud #${payload.code||""}`,
            `Cliente: ${b.name||"No indicado"}`,
            `WhatsApp: ${b.phone||"No indicado"}`,
            `Edad: ${b.age||"No indicada"}`,
            `Estilo: ${b.style||"No indicado"}`,
            `Zona: ${b.bodyZone||"No indicada"}`,
            `Tamaño: ${b.size||"No indicado"} cm`,
            `Coverup: ${b.coverup||"No"}`,
            `Freehand: ${b.freehand||"No"}`,
            `Disponibilidad: ${b.days||"No indicada"} - ${b.time||"No indicado"}`,
            `Notas: ${b.availabilityNotes||"Sin notas"}`,"",
            `Idea: ${b.idea||"Sin descripción"}`,"",
            `Referencias: ${refs}`,"",
            `🔐 Dashboard de Carlos: ${DASHBOARD_URL}`,
            "","Ingresa al Dashboard para aprobar, rechazar o pedir información."
          ].join("\n");
          location.href=`https://wa.me/${CARLOS_WHATSAPP}?text=${encodeURIComponent(message)}`;
        }
      }catch{}
    }
    return response;
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setupAccess);
  else setupAccess();
})();