const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const OUTPUTS = path.join(ROOT, "outputs");
const DATA = path.join(ROOT, "data");
const UPLOADS = path.join(DATA, "uploads");
const DB_FILE = path.join(DATA, "db.json");
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const sessions = new Map();

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}
function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").map(x => x.trim()).filter(Boolean).map(x => { const i=x.indexOf("="); return [x.slice(0,i), decodeURIComponent(x.slice(i+1))]; }));
}
function isAdmin(req) {
  const token = parseCookies(req).tattoo_admin;
  return Boolean(token && sessions.has(token));
}
function requireAdmin(req,res) {
  if (!isAdmin(req)) { json(res,401,{error:"Acceso no autorizado."}); return false; }
  return true;
}
function clientToken(req) { return req.headers["x-client-token"] || ""; }
function requireClient(appointment, req, res) {
  if (!appointment || !clientToken(req) || !crypto.timingSafeEqual(Buffer.from(String(appointment.clientToken || "")), Buffer.from(String(clientToken(req))))) {
    json(res,401,{error:"Acceso privado requerido."}); return false;
  }
  return true;
}
function safePrivateName(value) { return String(value || "").replace(/^\/+/, "").replace(/\\/g,"/").replace(/\.\.+/g,"."); }
async function readDb(){
  try { return JSON.parse(await fs.promises.readFile(DB_FILE,"utf8")); }
  catch { return {appointments:[]}; }
}
async function writeDb(db){ await fs.promises.mkdir(DATA,{recursive:true}); await fs.promises.writeFile(DB_FILE,JSON.stringify(db,null,2)); }
function readBody(req){ return new Promise((resolve,reject)=>{let data="";req.on("data",c=>{data+=c;if(data.length>20*1024*1024){req.destroy();reject(new Error("PAYLOAD_TOO_LARGE"));}});req.on("end",()=>{try{resolve(data?JSON.parse(data):{});}catch{reject(new Error("INVALID_JSON"));}});req.on("error",reject);}); }
function sendFile(res,file,contentType){ fs.promises.readFile(file).then(buf=>{res.writeHead(200,{"Content-Type":contentType,"Cache-Control":"private, no-store"});res.end(buf);}).catch(()=>json(res,404,{error:"Archivo no encontrado."})); }
function contentType(file){const ext=path.extname(file).toLowerCase();return ({".pdf":"application/pdf",".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp"}[ext])||"application/octet-stream";}
function appointmentForPrivateFile(reqPath){const m=reqPath.match(/^\/private-files\/([^/]+)\/(.+)$/);return m?{id:m[1],file:safePrivateName(m[2])}:null;}
async function privateFile(req,res,reqPath){
  const info=appointmentForPrivateFile(reqPath); if(!info)return json(res,404,{error:"Archivo no encontrado."});
  const db=await readDb(); const appointment=db.appointments.find(a=>a.id===info.id); if(!appointment)return json(res,404,{error:"Solicitud no encontrada."});
  if(!isAdmin(req) && !requireClient(appointment,req,res))return;
  const candidates=[appointment.paymentProof,appointment.consent].filter(Boolean);
  const record=candidates.find(x=>safePrivateName(x.path||"")===info.file || safePrivateName(x.filename||"")===info.file);
  if(!record)return json(res,404,{error:"Archivo no encontrado."});
  const file=path.join(UPLOADS,appointment.id,safePrivateName(record.filename || path.basename(record.path || "")));
  if(!file.startsWith(path.join(UPLOADS,appointment.id)))return json(res,403,{error:"Acceso denegado."});
  return sendFile(res,file,contentType(file));
}
async function saveDataUrlFile(id,file,prefix){
  const match=String(file.dataUrl||"").match(/^data:([^;]+);base64,(.+)$/); if(!match)throw new Error("INVALID_FILE");
  const ext=match[1]==="application/pdf"?"pdf":match[1].split("/")[1]||"bin"; const dir=path.join(UPLOADS,id); await fs.promises.mkdir(dir,{recursive:true});
  const filename=`${prefix}-${Date.now()}.${ext}`; const filepath=path.join(dir,filename); await fs.promises.writeFile(filepath,Buffer.from(match[2],"base64"));
  return {path:`/private-files/${id}/${filename}`,filename};
}
async function savePaymentProof(req,res,id){
  const db=await readDb(); const appointment=db.appointments.find(item=>item.id===id); if(!appointment)return json(res,404,{error:"Solicitud no encontrada."});
  const authorizedAdmin=isAdmin(req); if(!authorizedAdmin&&!requireClient(appointment,req,res))return;
  if(appointment.status!=="Aprobada pendiente de pago")return json(res,409,{error:"La solicitud todavía no está aprobada para pago."});
  try { const body=await readBody(req); if(!body.file?.dataUrl)return json(res,400,{error:"Selecciona un comprobante antes de enviarlo."}); appointment.paymentProof=await saveDataUrlFile(id,body.file,"comprobante"); appointment.status="Aprobada y confirmada"; appointment.updatedAt=new Date().toISOString(); await writeDb(db); return json(res,200,authorizedAdmin?adminAppointment(appointment):appointment); }
  catch(e){ return json(res,400,{error:e.message==="PAYLOAD_TOO_LARGE"?"El archivo es demasiado grande.":"No se pudo guardar el comprobante."}); }
}
function adminAppointment(a){return {...a,clientToken:undefined};}
function publicAppointment(a){return {id:a.id,status:a.status,updatedAt:a.updatedAt,booking:{name:a.booking?.name},proposal:a.proposal||null};}
function appointmentFromBody(body){return {id:crypto.randomUUID(),clientToken:crypto.randomBytes(32).toString("hex"),status:"Pendiente",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),booking:body.booking||{},proposal:body.proposal||null,paymentProof:null,consent:null};}
async function handle(req,res){
  const u=new URL(req.url,`http://${req.headers.host}`); const p=u.pathname;
  if(req.method==="GET" && p==="/api/admin/session")return json(res,200,{authenticated:isAdmin(req)});
  if(req.method==="POST" && p==="/api/admin/login") { try{const body=await readBody(req); if(!ADMIN_PASSWORD || body.password!==ADMIN_PASSWORD)return json(res,401,{error:"Contraseña incorrecta."}); const token=crypto.randomBytes(32).toString("hex");sessions.set(token,Date.now());res.writeHead(200,{"Set-Cookie":`tattoo_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`,"Content-Type":"application/json"});return res.end(JSON.stringify({ok:true}));}catch{return json(res,400,{error:"Solicitud inválida."});} }
  if(req.method==="POST" && p==="/api/admin/logout"){const c=parseCookies(req);if(c.tattoo_admin)sessions.delete(c.tattoo_admin);res.writeHead(200,{"Set-Cookie":"tattoo_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0","Content-Type":"application/json"});return res.end(JSON.stringify({ok:true}));}
  if(req.method==="GET" && p.startsWith("/private-files/"))return privateFile(req,res,p);
  if(req.method==="GET" && p==="/api/appointments") { if(!requireAdmin(req,res))return; const db=await readDb(); return json(res,200,db.appointments.map(adminAppointment)); }
  if(req.method==="POST" && p==="/api/appointments") { try{const body=await readBody(req);const db=await readDb();const a=appointmentFromBody(body);db.appointments.push(a);await writeDb(db);return json(res,201,{...publicAppointment(a),clientToken:a.clientToken});}catch{return json(res,400,{error:"No se pudo crear la solicitud."});} }
  const clientMatch=p.match(/^\/api\/client\/appointments\/([^/]+)$/); if(req.method==="GET"&&clientMatch){const db=await readDb();const a=db.appointments.find(x=>x.id===clientMatch[1]);if(!a||!requireClient(a,req,res))return;return json(res,200,{...a,clientToken:undefined});}
  const proof=p.match(/^\/api\/appointments\/([^/]+)\/payment-proof$/); if(req.method==="POST"&&proof)return savePaymentProof(req,res,proof[1]);
  const consent=p.match(/^\/api\/appointments\/([^/]+)\/consent$/); if(req.method==="POST"&&consent){const db=await readDb();const a=db.appointments.find(x=>x.id===consent[1]);if(!a)return json(res,404,{error:"Solicitud no encontrada."});if(!isAdmin(req)&&!requireClient(a,req,res))return;try{const body=await readBody(req);if(!body.file?.dataUrl)return json(res,400,{error:"Falta el consentimiento firmado."});a.consent=await saveDataUrlFile(a.id,body.file,"consentimiento");a.updatedAt=new Date().toISOString();await writeDb(db);return json(res,200,isAdmin(req)?adminAppointment(a):{ok:true,status:a.status});}catch{return json(res,400,{error:"No se pudo guardar el consentimiento."});}}
  const patch=p.match(/^\/api\/appointments\/([^/]+)$/); if(req.method==="PATCH"&&patch){if(!requireAdmin(req,res))return;const db=await readDb();const a=db.appointments.find(x=>x.id===patch[1]);if(!a)return json(res,404,{error:"Solicitud no encontrada."});try{const body=await readBody(req);Object.assign(a,body);a.updatedAt=new Date().toISOString();await writeDb(db);return json(res,200,adminAppointment(a));}catch{return json(res,400,{error:"No se pudo actualizar la solicitud."});}}
  if(req.method==="GET"&&p==="/health")return json(res,200,{ok:true});
  if(req.method==="GET"&&p==="/"||req.method==="GET"&&p==="/index.html"){return sendFile(res,path.join(OUTPUTS,"index.html"),"text/html; charset=utf-8");}
  if(req.method==="GET"&&p.startsWith("/assets/")){const f=path.join(OUTPUTS,p.slice(1));if(!f.startsWith(OUTPUTS))return json(res,403,{error:"Acceso denegado."});return sendFile(res,f,contentType(f));}
  return json(res,404,{error:"No encontrado."});
}
http.createServer((req,res)=>handle(req,res).catch(e=>json(res,500,{error:"Error interno del servidor."}))).listen(PORT,()=>console.log(`Server running on ${PORT}`));
