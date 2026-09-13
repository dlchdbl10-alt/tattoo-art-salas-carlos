const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const port = Number(process.env.PORT || 3000);
const root = __dirname;
const publicDir = path.join(root, "outputs");
const dataDir = path.join(root, "data");
const uploadsDir = path.join(dataDir, "uploads");
const dbPath = path.join(dataDir, "db.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8"
};

async function ensureStore() {
  await fsp.mkdir(uploadsDir, { recursive: true });
  try {
    await fsp.access(dbPath);
  } catch {
    await fsp.writeFile(dbPath, JSON.stringify({ appointments: [] }, null, 2));
  }
}

async function readDb() {
  await ensureStore();
  return JSON.parse(await fsp.readFile(dbPath, "utf8"));
}

async function writeDb(db) {
  await fsp.writeFile(dbPath, JSON.stringify(db, null, 2));
}

function json(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20 * 1024 * 1024) {
        reject(new Error("Archivo demasiado grande para esta demo local."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body ? JSON.parse(body) : {}));
    req.on("error", reject);
  });
}

function cleanName(name) {
  return String(name || "archivo").replace(/[^\w.-]+/g, "_");
}

function fileExtension(file) {
  const fromName = path.extname(file.name || "");
  if (fromName) return fromName.toLowerCase();
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "application/pdf") return ".pdf";
  return ".jpg";
}

async function saveDataUrlFile(appointmentId, file, prefix) {
  if (!file || !file.dataUrl) return null;
  const match = /^data:([^;]+);base64,(.+)$/u.exec(file.dataUrl);
  if (!match) throw new Error("Formato de archivo invalido.");
  const folder = path.join(uploadsDir, appointmentId);
  await fsp.mkdir(folder, { recursive: true });
  const ext = fileExtension(file);
  const filename = `${prefix}-${Date.now()}-${cleanName(file.name || crypto.randomUUID())}${ext}`;
  const diskPath = path.join(folder, filename);
  await fsp.writeFile(diskPath, Buffer.from(match[2], "base64"));
  return {
    name: file.name || filename,
    type: match[1],
    path: `/uploads/${appointmentId}/${filename}`,
    savedAt: new Date().toISOString()
  };
}

function publicAppointment(appointment) {
  return appointment;
}

async function createAppointment(req, res) {
  const body = await readBody(req);
  if (!body.booking?.name || !body.booking?.phone) {
    return json(res, 400, { error: "Nombre y WhatsApp son obligatorios." });
  }
  const db = await readDb();
  const id = crypto.randomUUID();
  const code = String(db.appointments.length + 43).padStart(3, "0");
  const references = [];
  for (const [index, file] of (body.references || []).entries()) {
    const saved = await saveDataUrlFile(id, file, `referencia-${index + 1}`);
    if (saved) references.push(saved);
  }
  const appointment = {
    id,
    code,
    status: "Pendiente de revision",
    booking: body.booking,
    references,
    proposal: null,
    whatsappMessage: "",
    paymentProof: null,
    consent: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.appointments.unshift(appointment);
  await writeDb(db);
  return json(res, 201, publicAppointment(appointment));
}

async function updateAppointment(req, res, id) {
  const body = await readBody(req);
  const db = await readDb();
  const appointment = db.appointments.find((item) => item.id === id);
  if (!appointment) return json(res, 404, { error: "Solicitud no encontrada." });
  Object.assign(appointment, {
    status: body.status || appointment.status,
    proposal: body.proposal || appointment.proposal,
    whatsappMessage: body.whatsappMessage ?? appointment.whatsappMessage,
    updatedAt: new Date().toISOString()
  });
  await writeDb(db);
  return json(res, 200, publicAppointment(appointment));
}

async function savePaymentProof(req, res, id) {
  const body = await readBody(req);
  const db = await readDb();
  const appointment = db.appointments.find((item) => item.id === id);
  if (!appointment) return json(res, 404, { error: "Solicitud no encontrada." });
  appointment.paymentProof = await saveDataUrlFile(id, body.file, "comprobante");
  appointment.status = "Aprobada y confirmada";
  appointment.updatedAt = new Date().toISOString();
  await writeDb(db);
  return json(res, 200, publicAppointment(appointment));
}

async function saveConsent(req, res, id) {
  const body = await readBody(req);
  const db = await readDb();
  const appointment = db.appointments.find((item) => item.id === id);
  if (!appointment) return json(res, 404, { error: "Solicitud no encontrada." });
  const signature = await saveDataUrlFile(id, {
    name: "firma.png",
    type: "image/png",
    dataUrl: body.signatureDataUrl
  }, "firma");
  appointment.consent = {
    ...body.consent,
    signature,
    acceptedAt: new Date().toISOString()
  };
  appointment.updatedAt = new Date().toISOString();
  await writeDb(db);
  return json(res, 200, publicAppointment(appointment));
}

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);
  if (urlPath.startsWith("/uploads/")) {
    return streamFile(path.join(dataDir, urlPath), res);
  }
  const requestedPath = urlPath === "/" ? "/index.html" : urlPath;
  return streamFile(path.join(publicDir, requestedPath), res);
}

function streamFile(filePath, res) {
  const resolved = path.resolve(filePath);
  const allowed = [path.resolve(publicDir), path.resolve(uploadsDir)];
  if (!allowed.some((base) => resolved.startsWith(base))) {
    return json(res, 403, { error: "Ruta no permitida." });
  }
  fs.createReadStream(resolved)
    .on("open", () => {
      const ext = path.extname(resolved).toLowerCase();
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    })
    .on("error", () => json(res, 404, { error: "Archivo no encontrado." }))
    .pipe(res);
}

async function router(req, res) {
  try {
    const { pathname } = new URL(req.url, `http://localhost:${port}`);
    if (pathname === "/health" && req.method === "GET") {
      return json(res, 200, { ok: true, service: "tattoo-art-salas-carlos" });
    }
    if (pathname === "/api/appointments" && req.method === "GET") {
      const db = await readDb();
      return json(res, 200, db.appointments.map(publicAppointment));
    }
    if (pathname === "/api/appointments" && req.method === "POST") return createAppointment(req, res);
    const appointmentMatch = /^\/api\/appointments\/([^/]+)$/u.exec(pathname);
    if (appointmentMatch && req.method === "PATCH") return updateAppointment(req, res, appointmentMatch[1]);
    const paymentMatch = /^\/api\/appointments\/([^/]+)\/payment-proof$/u.exec(pathname);
    if (paymentMatch && req.method === "POST") return savePaymentProof(req, res, paymentMatch[1]);
    const consentMatch = /^\/api\/appointments\/([^/]+)\/consent$/u.exec(pathname);
    if (consentMatch && req.method === "POST") return saveConsent(req, res, consentMatch[1]);
    if (req.method === "GET") return serveStatic(req, res);
    return json(res, 405, { error: "Metodo no permitido." });
  } catch (error) {
    return json(res, 500, { error: error.message || "Error interno." });
  }
}

ensureStore().then(() => {
  http.createServer(router).listen(port, () => {
    console.log(`Tattoo Art Salas Carlos listo en http://localhost:${port}`);
  });
});
