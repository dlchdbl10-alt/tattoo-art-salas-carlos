(()=>{
  const params=new URLSearchParams(window.location.search);
  const id=params.get("cliente");
  const token=params.get("token");
  if(!id||!token)return;

  const headers={"X-Client-Token":token};
  const input=document.querySelector("#paymentProof");
  const button=document.querySelector("#confirmPayment");
  const summary=document.querySelector("#paymentSummary");
  const status=document.querySelector("#paymentStatus");

  const money=value=>Number(value||0).toLocaleString("es-CR");

  async function load(){
    try{
      const response=await fetch(`/api/client/appointments/${encodeURIComponent(id)}`,{headers,cache:"no-store"});
      const appointment=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(appointment.error||"No se pudo cargar la solicitud.");
      const proposal=appointment.proposal||{};
      const deposit=Number(proposal.deposit||0);
      const estimate=Number(proposal.estimate||0);
      if(summary)summary.textContent=`Deposito requerido: CRC ${money(deposit)}. Es el 50% del costo total. Banco: Banco Popular. SINPE: 87485810.`;
      if(status){
        status.className=`status-badge ${appointment.status.includes("confirmada")?"confirmed":"waiting"}`;
        status.textContent=appointment.status;
      }
      const title=document.querySelector("#pago .payment-card h3");
      if(title)title.textContent=appointment.status==="Aprobada pendiente de pago"?`Reserva aprobada - ${appointment.booking?.name||"Cliente"}`:`Estado de reserva: ${appointment.status}`;
      if(button){
        button.disabled=appointment.status!=="Aprobada pendiente de pago";
        button.textContent=appointment.status==="Aprobada pendiente de pago"?"Enviar comprobante":"Comprobante enviado";
      }
    }catch(error){
      if(summary)summary.textContent=error.message;
      if(button)button.disabled=true;
    }
  }

  if(button)button.addEventListener("click",async event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    if(!input?.files?.[0]){
      if(window.showToast)window.showToast("Selecciona un comprobante antes de enviarlo.");
      else window.alert("Selecciona un comprobante antes de enviarlo.");
      return;
    }
    button.disabled=true;
    try{
      const file=input.files[0];
      const dataUrl=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.onerror=()=>reject(new Error(`No se pudo leer ${file.name}`));
        reader.readAsDataURL(file);
      });
      const response=await fetch(`/api/appointments/${encodeURIComponent(id)}/payment-proof`,{
        method:"POST",
        headers:{"Content-Type":"application/json",...headers},
        body:JSON.stringify({file:{name:file.name,type:file.type,dataUrl}})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||"No se pudo guardar el comprobante.");
      if(status){status.className="status-badge confirmed";status.textContent="Aprobada y confirmada";}
      button.textContent="Comprobante enviado";
      if(window.showToast)window.showToast("Comprobante recibido. Tu reserva quedó confirmada.");
      else window.alert("Comprobante recibido. Tu reserva quedó confirmada.");
    }catch(error){
      button.disabled=false;
      if(window.showToast)window.showToast(error.message);
      else window.alert(error.message);
    }
  },true);

  load();
})();
