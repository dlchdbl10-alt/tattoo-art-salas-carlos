const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "db.json");
const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

async function ensureLocalStore() {
  await fsp.mkdir(dataDir, { recursive: true });
  try { await fsp.access(dbPath); }
  catch { await fsp.writeFile(dbPath, JSON.stringify({ appointments: [] }, null, 2)); }
}

function headers() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json"
  };
}

async function supabaseRequest(url, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${url}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    const detail = typeof payload === "string" ? payload : JSON.stringify(payload);
    throw new Error(`Supabase ${response.status}: ${detail}`);
  }
  return payload;
}

function fromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    clientToken: row.client_token,
    status: row.status,
    booking: row.booking || {},
    references: row.references_data || [],
    proposal: row.proposal || null,
    whatsappMessage: row.whatsapp_message || "",
    paymentProof: row.payment_proof || null,
    consent: row.consent || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toRow(a) {
  return {
    id: a.id,
    code: a.code,
    client_token: a.clientToken,
    status: a.status,
    booking: a.booking || {},
    references_data: a.references || [],
    proposal: a.proposal || null,
    whatsapp_message: a.whatsappMessage || "",
    payment_proof: a.paymentProof || null,
    consent: a.consent || null,
    created_at: a.createdAt,
    updated_at: a.updatedAt
  };
}

async function readDb() {
  if (!useSupabase) {
    await ensureLocalStore();
    return JSON.parse(await fsp.readFile(dbPath, "utf8"));
  }
  const rows = await supabaseRequest("/rest/v1/appointments?select=*&order=created_at.desc");
  return { appointments: rows.map(fromRow) };
}

async function writeDb(db) {
  if (!useSupabase) {
    await ensureLocalStore();
    await fsp.writeFile(dbPath, JSON.stringify(db, null, 2));
    return;
  }
  const rows = (db.appointments || []).map(toRow);
  if (!rows.length) return;
  await supabaseRequest("/rest/v1/appointments?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows)
  });
}

async function migrateLocalDb() {
  await ensureLocalStore();
  const db = JSON.parse(await fsp.readFile(dbPath, "utf8"));
  if (!useSupabase) throw new Error("Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY antes de migrar.");
  const rows = (db.appointments || []).map(toRow);
  if (!rows.length) return { migrated: 0 };
  await supabaseRequest("/rest/v1/appointments?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows)
  });
  return { migrated: rows.length };
}

module.exports = { readDb, writeDb, migrateLocalDb, useSupabase };
