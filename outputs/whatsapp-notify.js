(() => {
  const CARLOS_WHATSAPP = "50687485810";
  const originalFetch = window.fetch.bind(window);
  function appointmentMessage(appointment) {
    const b = appointment?.booking || {};
    const references = (appointment.references || []).map((file) => file.name).join(", ") || "No adjunto referencias";
    return [
      "NUEVA SOLICITUD DE TATUAJE",
      "",
      `Solicitud #${appointment.code || ""}`,
      `Cliente: ${b.name || "No indicado"}`,
      `WhatsApp: ${b.phone || "No indicado"}`,
      `Edad: ${b.age || "No indicada"}`,
      `Estilo: ${b.style || "No indicado"}`,
      `Zona: ${b.bodyZone || "No indicada"}`,
      `Tamano: ${b.size || "No indicado"} cm`,
      `Coverup: ${b.coverup || "No"}`,
      `Freehand: ${b.freehand || "No"}`,
      `Disponibilidad: ${b.days || "No indicada"} - ${b.time || "No indicado"}`,
      `Notas: ${b.availabilityNotes || "Sin notas"}`,
      "",
      `Idea: ${b.idea || "Sin descripcion"}`,
      "",
      `Referencias adjuntas: ${references}`,
      "",
      "Entra al Dashboard para aprobar, rechazar o pedir informacion."
    ].join("\n");
  }
  window.fetch = async function (...args) {
    const input = args[0];
    const options = args[1] || {};
    const url = typeof input === "string" ? input : input?.url || "";
    const method = String(options.method || (typeof input !== "string" ? input?.method : "GET") || "GET").toUpperCase();
    const isNewAppointment = method === "POST" && /\/api\/appointments$/.test(url);
    let whatsappWindow = null;
    if (isNewAppointment) whatsappWindow = window.open("about:blank", "_blank");
    const response = await originalFetch(...args);
    if (isNewAppointment) {
      try {
        const payload = await response.clone().json();
        if (response.ok && payload?.appointment) {
          const message = appointmentMessage(payload.appointment);
          const target = `https://wa.me/${CARLOS_WHATSAPP}?text=${encodeURIComponent(message)}`;
          if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.location.href = target;
          else window.open(target, "_blank");
        } else if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
      } catch {
        if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
      }
    }
    return response;
  };
})();
