const styles = [
  ["Realismo", "realismo", ["realismo"], "Retratos, volumen y textura con alto detalle.", "linear-gradient(135deg, #2b2926, #0b0b0a 55%, #6e6252)"],
  ["Tradicional", "tradicional", ["tradicional"], "Lineas firmes, color solido y composiciones clasicas.", "linear-gradient(135deg, #15100e, #8b2e25 52%, #d8a64f)"],
  ["Black and Grey", "black-and-grey", ["black-and-grey", "blackandgrey", "Blackandgrey"], "Sombras suaves, contraste y profundidad sin color.", "linear-gradient(135deg, #0a0a09, #3b3a37 54%, #a9a092)"],
  ["Color", "color", ["color"], "Piezas vibrantes con lectura clara y saturacion controlada.", "linear-gradient(135deg, #123b39, #d4422f 48%, #d8a64f)"],
  ["Anime", "anime", ["anime"], "Personajes, escenas y composiciones inspiradas en manga.", "linear-gradient(135deg, #101224, #7a315f 55%, #efc06a)"],
  ["Fineline", "fineline", ["fineline"], "Lineas delicadas, piezas sutiles y acabado limpio.", "linear-gradient(135deg, #11100e, #2d2925 58%, #fff7ea)"],
  ["Blackwork", "blackwork", ["blackwork"], "Negro solido, patrones, ornamentos y alto contraste.", "linear-gradient(135deg, #030303, #171717 56%, #4b4034)"],
  ["Blackout", "blackout", ["blackout"], "Cobertura amplia con bloques negros y composicion precisa.", "linear-gradient(135deg, #000, #070707 62%, #2b120f)"],
  ["Realismo a color", "realismo-a-color", ["realismo-a-color", "realismoacolor"], "Realismo con paleta viva y transiciones cromaticas.", "linear-gradient(135deg, #17212a, #a7352b 45%, #c7a249)"],
  ["Surrealismo", "surrealismo", ["surrealismo"], "Ideas simbolicas, composiciones oniricas y mezcla de mundos.", "linear-gradient(135deg, #201328, #392b18 52%, #b44e38)"],
  ["Puntillismo", "puntillismo", ["puntillismo"], "Textura construida con puntos, gradaciones y paciencia.", "radial-gradient(circle, rgba(255, 247, 234, 0.85) 1px, transparent 1.5px), linear-gradient(135deg, #11100e, #3c3028)"],
  ["Microrealismo", "microrealismo", ["microrealismo"], "Detalles pequenos con lectura precisa en formatos reducidos.", "linear-gradient(135deg, #181715, #50483e 50%, #c9b799)"],
  ["Freehand", "freehand", ["freehand"], "Diseno directo sobre piel adaptado a anatomia y movimiento.", "linear-gradient(135deg, #0f0c0b, #573027 54%, #d8a64f)"],
  ["Coverup", "coverup", ["coverup"], "Evaluacion tecnica para cubrir o transformar piezas previas.", "linear-gradient(135deg, #090909, #2a1714 52%, #7e2f27)"]
];

const apiBase = window.location.protocol === "file:" ? null : "";
const imageExtensions = ["jpg", "jpeg", "png", "webp", "avif", "JPG", "JPEG", "PNG", "WEBP", "AVIF"];
const styleGrid = document.querySelector("#styleGrid");
const styleSelect = document.querySelector("#styleSelect");
const toast = document.querySelector("#toast");
const requestList = document.querySelector("#requestList");
let appointments = [];
let selectedAppointmentId = null;
let currentStep = 0;

loadProfilePhoto("#artistPhoto", ["carlos-01", "carlos-01.jpg", "Carlos-01", "logo"], "Carlos Salas tatuando", "Carlos Salas, Tattoo Art Salas Carlos.");
loadProfilePhoto("#studioPhoto", ["estudio-01", "studio-01", "Area de trabajo"], "Area de trabajo del estudio", "Area de trabajo de Tattoo Art Salas Carlos.");

styles.forEach(([name, slug, aliases, description, image]) => {
  const card = document.createElement("button");
  card.className = "style-card";
  card.type = "button";
  card.style.setProperty("--image", image);
  card.innerHTML = `<span>Foto real pendiente</span><div><strong>${name}</strong><p>${description}</p></div>`;
  loadPortfolioPhoto(card, aliases);
  card.addEventListener("click", () => {
    styleSelect.value = name;
    document.querySelector("#reserva").scrollIntoView({ behavior: "smooth" });
    showToast(`${name} cargado en el formulario.`);
  });
  styleGrid.appendChild(card);

  const option = document.createElement("option");
  option.value = name;
  option.textContent = name;
  styleSelect.appendChild(option);
});

function loadPortfolioPhoto(card, names) {
  loadFirstExistingImage("assets/portfolio", names, (src) => {
    card.style.setProperty("--image", `url("${src}")`);
    card.querySelector("span").textContent = "Trabajo de portafolio";
  });
}

function loadProfilePhoto(selector, names, alt, caption) {
  const frame = document.querySelector(selector);
  loadFirstExistingImage("assets/artist", names, (src) => {
    frame.innerHTML = `<img src="${src}" alt="${alt}" /><figcaption>${caption}</figcaption>`;
  });
}

function loadFirstExistingImage(folder, names, onLoad) {
  const candidates = names.flatMap((name) => {
    if (imageExtensions.some((extension) => name.endsWith(`.${extension}`))) return [name];
    return imageExtensions.flatMap((extension) => [
      `${name}.${extension}`,
      `${name}.jpg.${extension}`,
      `${name}.png.${extension}`,
      `${capitalize(name)}.jpg.${extension}`,
      `${capitalize(name)}.${extension}`
    ]);
  });

  let index = 0;
  const tryNext = () => {
    if (index >= candidates.length) return;
    const src = `${folder}/${candidates[index]}`;
    index += 1;
    const photo = new Image();
    photo.onload = () => onLoad(src);
    photo.onerror = tryNext;
    photo.src = src;
  };
  tryNext();
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const steps = [...document.querySelectorAll(".form-step")];
const stepButtons = [...document.querySelectorAll(".step-pill")];
const prevStep = document.querySelector("#prevStep");
const nextStep = document.querySelector("#nextStep");
const submitBooking = document.querySelector("#submitBooking");
const bookingForm = document.querySelector("#bookingForm");
const bookingSummary = document.querySelector("#bookingSummary");

function setStep(index) {
  currentStep = Math.max(0, Math.min(index, steps.length - 1));
  steps.forEach((step, idx) => step.classList.toggle("active", idx === currentStep));
  stepButtons.forEach((button, idx) => button.classList.toggle("active", idx === currentStep));
  prevStep.disabled = currentStep === 0;
  nextStep.classList.toggle("hidden", currentStep === steps.length - 1);
  submitBooking.classList.toggle("hidden", currentStep !== steps.length - 1);
  if (currentStep === steps.length - 1) renderSummary();
}

stepButtons.forEach((button) => button.addEventListener("click", () => setStep(Number(button.dataset.stepTarget))));
prevStep.addEventListener("click", () => setStep(currentStep - 1));
nextStep.addEventListener("click", () => setStep(currentStep + 1));

function getBookingData() {
  const data = new FormData(bookingForm);
  const days = [...bookingForm.querySelectorAll("input[name='days']:checked")].map((item) => item.value);
  return {
    name: data.get("name") || "Cliente sin nombre",
    phone: data.get("phone") || "Sin WhatsApp",
    age: data.get("age") || "No indicada",
    style: data.get("style") || "No indicado",
    size: data.get("size") || "No indicado",
    bodyZone: data.get("bodyZone") || "No indicada",
    idea: data.get("idea") || "Sin descripcion",
    coverup: data.get("coverup") ? "Si" : "No",
    freehand: data.get("freehand") ? "Si" : "No",
    days: days.length ? days.join(", ") : "No indicada",
    time: data.get("time") || "No indicado",
    availabilityNotes: data.get("availabilityNotes") || "Sin notas"
  };
}

function renderSummary() {
  const data = getBookingData();
  bookingSummary.innerHTML = `
    <strong>${data.name}</strong>
    <span>WhatsApp: ${data.phone} | Edad: ${data.age}</span>
    <span>Estilo: ${data.style} | Zona: ${data.bodyZone} | Tamano: ${data.size} cm</span>
    <span>Coverup: ${data.coverup} | Freehand: ${data.freehand}</span>
    <span>Disponibilidad: ${data.days} - ${data.time}</span>
    <p>${data.idea}</p>
  `;
}

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitBooking.disabled = true;
  try {
    const payload = {
      booking: getBookingData(),
      references: await filesToPayload([...referenceInput.files].slice(0, 3))
    };
    const saved = await apiPost("/api/appointments", payload);
    appointments.unshift(saved);
    selectedAppointmentId = saved.id;
    renderDashboard();
    setRequestStatus("Pendiente de revision", "pending");
    showToast("Solicitud guardada. Estado: Pendiente de revision.");
    document.querySelector("#dashboard").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    showToast(error.message);
  } finally {
    submitBooking.disabled = false;
  }
});

const referenceInput = document.querySelector("#referenceInput");
const referenceList = document.querySelector("#referenceList");

referenceInput.addEventListener("change", () => {
  const files = [...referenceInput.files].slice(0, 3);
  referenceList.innerHTML = "";
  files.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "reference-item";
    item.innerHTML = `<strong>${index + 1}. ${file.name}</strong><span>${Math.round(file.size / 1024)} KB</span>`;
    referenceList.appendChild(item);
  });
  if (referenceInput.files.length > 3) showToast("Solo se guardaran las primeras 3 referencias.");
});

const requestStatus = document.querySelector("#requestStatus");
const whatsappPreview = document.querySelector("#whatsappPreview");

function renderDashboard() {
  const current = getSelectedAppointment();
  renderRequestList();
  if (!current) return;

  document.querySelector("#requestNumber").textContent = `Solicitud #${current.code}`;
  document.querySelector("#dashClient").textContent = current.booking.name;
  document.querySelector("#dashPhone").textContent = current.booking.phone;
  document.querySelector("#dashStyle").textContent = current.booking.style;
  document.querySelector("#dashZone").textContent = current.booking.bodyZone;
  document.querySelector("#dashSize").textContent = `${current.booking.size} cm`;
  document.querySelector("#dashIdea").textContent = current.booking.idea;
  document.querySelector("#requestTitle").textContent = `${current.booking.style} en ${current.booking.bodyZone}`;
  setRequestStatus(current.status, statusClass(current.status));
  renderWhatsappPreview(current);
}

function renderRequestList() {
  requestList.innerHTML = "";
  appointments.forEach((appointment) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `request-item ${appointment.id === selectedAppointmentId ? "active" : ""}`;
    button.innerHTML = `<strong>#${appointment.code} ${appointment.booking.name}</strong><span>${appointment.booking.style} - ${appointment.status}</span>`;
    button.addEventListener("click", () => {
      selectedAppointmentId = appointment.id;
      renderDashboard();
    });
    requestList.appendChild(button);
  });
}

function getSelectedAppointment() {
  if (!appointments.length) return null;
  return appointments.find((appointment) => appointment.id === selectedAppointmentId) || appointments[0];
}

function setRequestStatus(text, className) {
  requestStatus.className = `status-badge ${className}`;
  requestStatus.textContent = text;
}

function statusClass(status) {
  if (status.includes("confirmada") || status.includes("Consentimiento")) return "confirmed";
  if (status.includes("Rechazada")) return "rejected";
  if (status.includes("pendiente de pago") || status.includes("informacion")) return "waiting";
  return "pending";
}

document.querySelector("#approveRequest").addEventListener("click", async () => {
  const current = getSelectedAppointment();
  if (!current) return showToast("No hay solicitudes para aprobar.");
  const proposal = getProposal();
  const message = buildWhatsAppMessage(current.booking, proposal);
  const updated = await patchAppointment(current.id, { status: "Aprobada pendiente de pago", proposal, whatsappMessage: message });
  replaceAppointment(updated);
  renderDashboard();
  const clientWhatsApp = normalizePhone(current.booking.phone);
  if (!clientWhatsApp) return showToast("Solicitud aprobada, pero el WhatsApp del cliente no es valido.");
  window.open(`https://wa.me/${clientWhatsApp}?text=${encodeURIComponent(message)}`, "_blank");
  showToast("Solicitud aprobada. WhatsApp del cliente abierto con el mensaje listo para enviar.");
});

document.querySelector("#infoRequest").addEventListener("click", async () => {
  const current = getSelectedAppointment();
  if (!current) return showToast("No hay solicitud seleccionada.");
  const message = "Hola. Necesito una foto mas clara de la zona y una referencia adicional antes de aprobar la solicitud.";
  const updated = await patchAppointment(current.id, { status: "Requiere mas informacion", whatsappMessage: message });
  replaceAppointment(updated);
  renderDashboard();
  const clientWhatsApp = normalizePhone(current.booking.phone);
  if (clientWhatsApp) window.open(`https://wa.me/${clientWhatsApp}?text=${encodeURIComponent(message)}`, "_blank");
  showToast("Solicitud marcada como requiere mas informacion.");
});

document.querySelector("#rejectRequest").addEventListener("click", async () => {
  const current = getSelectedAppointment();
  if (!current) return showToast("No hay solicitud seleccionada.");
  const message = `Hola, ${current.booking.name}. Gracias por enviar tu solicitud de tatuaje. En este momento no puedo tomar este proyecto con las condiciones solicitadas. Si deseas, puedes contactarnos para consultar por otras opciones.`;
  const updated = await patchAppointment(current.id, { status: "Rechazada", whatsappMessage: message });
  replaceAppointment(updated);
  renderDashboard();
  const clientWhatsApp = normalizePhone(current.booking.phone);
  if (!clientWhatsApp) return showToast("Solicitud rechazada, pero el WhatsApp del cliente no es valido.");
  window.open(`https://wa.me/${clientWhatsApp}?text=${encodeURIComponent(message)}`, "_blank");
  showToast("Solicitud rechazada. WhatsApp del cliente abierto con el mensaje listo para enviar.");
});

document.querySelector("#confirmPayment").addEventListener("click", async () => {
  const current = getSelectedAppointment();
  const proof = document.querySelector("#paymentProof").files[0];
  if (!current) return showToast("No hay solicitud seleccionada.");
  if (!proof) return showToast("Selecciona un comprobante antes de enviarlo.");

  const [file] = await filesToPayload([proof]);
  const updated = await apiPost(`/api/appointments/${current.id}/payment-proof`, { file });
  replaceAppointment(updated);
  renderDashboard();
  const paymentStatus = document.querySelector("#paymentStatus");
  paymentStatus.className = "status-badge confirmed";
  paymentStatus.textContent = "Aprobada y confirmada";
  showToast("Comprobante guardado. Reserva confirmada.");
});

function getProposal() {
  return {
    date: document.querySelector("#approvedDate").value || "fecha por confirmar",
    time: document.querySelector("#approvedTime").value || "hora por confirmar",
    deposit: Number(document.querySelector("#deposit").value || 0),
    estimate: Number(document.querySelector("#estimate").value || 0)
  };
}

function renderWhatsappPreview(appointment) {
  if (!appointment.whatsappMessage) {
    whatsappPreview.innerHTML = "<strong>Mensaje de WhatsApp</strong><p>Aqui aparecera el texto automatico cuando la solicitud sea aprobada.</p>";
    return;
  }
  whatsappPreview.innerHTML = `<strong>Mensaje de WhatsApp</strong><p>${appointment.whatsappMessage}</p>`;
}

function buildWhatsAppMessage(data, proposal) {
  const deposit = proposal.deposit.toLocaleString("es-CR");
  const estimate = proposal.estimate.toLocaleString("es-CR");
  document.querySelector("#paymentSummary").textContent = `Deposito requerido: CRC ${deposit}. Banco: Banco Popular. SINPE: 87485810.`;
  return `Hola, ${data.name}. Tu solicitud fue aprobada.\n\nResumen:\nEstilo: ${data.style}\nZona: ${data.bodyZone}\nTamano estimado: ${data.size} cm\nFecha propuesta: ${proposal.date}\nHora: ${proposal.time}\n\nPrecio estimado: CRC ${estimate}\nDeposito requerido: CRC ${deposit}\n\nDatos bancarios:\nBanco: Banco Popular\nSINPE: 87485810\nNombre: Tattoo Art Salas Carlos\n\nPara confirmar tu reserva, sube el comprobante en el enlace de pago.`;
}

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("506") ? digits : `506${digits}`;
}

function replaceAppointment(updated) {
  appointments = appointments.map((appointment) => appointment.id === updated.id ? updated : appointment);
  selectedAppointmentId = updated.id;
}

const signaturePad = document.querySelector("#signaturePad");
const ctx = signaturePad.getContext("2d");
let drawing = false;

ctx.lineWidth = 3;
ctx.lineCap = "round";
ctx.strokeStyle = "#fff7ea";

function pointerPosition(event) {
  const rect = signaturePad.getBoundingClientRect();
  const pointer = event.touches ? event.touches[0] : event;
  return {
    x: ((pointer.clientX - rect.left) / rect.width) * signaturePad.width,
    y: ((pointer.clientY - rect.top) / rect.height) * signaturePad.height
  };
}

function startDrawing(event) {
  drawing = true;
  const pos = pointerPosition(event);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
}

function draw(event) {
  if (!drawing) return;
  event.preventDefault();
  const pos = pointerPosition(event);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function stopDrawing() {
  drawing = false;
}

signaturePad.addEventListener("mousedown", startDrawing);
signaturePad.addEventListener("mousemove", draw);
window.addEventListener("mouseup", stopDrawing);
signaturePad.addEventListener("touchstart", startDrawing, { passive: false });
signaturePad.addEventListener("touchmove", draw, { passive: false });
signaturePad.addEventListener("touchend", stopDrawing);

document.querySelector("#clearSignature").addEventListener("click", () => {
  ctx.clearRect(0, 0, signaturePad.width, signaturePad.height);
});

document.querySelector("#consentForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const current = getSelectedAppointment();
  if (!current) return showToast("Primero selecciona o crea una solicitud.");
  const form = new FormData(event.currentTarget);
  const medical = [...event.currentTarget.querySelectorAll("input[name='medical']:checked")].map((item) => item.value);
  const updated = await apiPost(`/api/appointments/${current.id}/consent`, {
    consent: {
      legalName: form.get("legalName"),
      identification: form.get("identification"),
      medical,
      medicalNotes: form.get("medicalNotes")
    },
    signatureDataUrl: signaturePad.toDataURL("image/png")
  });
  replaceAppointment(updated);
  renderDashboard();
  const consentStatus = document.querySelector("#consentStatus");
  consentStatus.className = "status-badge confirmed";
  consentStatus.textContent = "Consentimiento completado";
  showToast("Consentimiento digital guardado.");
});

async function filesToPayload(files) {
  return Promise.all(files.map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result });
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    reader.readAsDataURL(file);
  })));
}

async function loadAppointments() {
  if (!apiBase && window.location.protocol === "file:") {
    showToast("Abre el sitio con start.bat para activar guardado real.");
    return;
  }
  try {
    appointments = await apiGet("/api/appointments");
    selectedAppointmentId = appointments[0]?.id || null;
    renderDashboard();
  } catch (error) {
    showToast(error.message);
  }
}

async function apiGet(path) {
  const response = await fetch(path);
  return parseApiResponse(response);
}

async function apiPost(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return parseApiResponse(response);
}

async function patchAppointment(id, body) {
  const response = await fetch(`/api/appointments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return parseApiResponse(response);
}

async function parseApiResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "No se pudo completar la accion.");
  return payload;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

setStep(0);
loadAppointments();
