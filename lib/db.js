import fs from "fs";
import path from "path";

// Basit, dosya tabanlı bir veri katmanı. Kurulumu kolaylaştırmak için
// (herhangi bir veritabanı sunucusu veya native modül gerektirmeden)
// tüm veriler data/db.json içinde tutulur.
//
// Genişletmek isterseniz: bu dosyadaki fonksiyonların imzalarını koruyarak
// içini Postgres/MySQL/Prisma gibi gerçek bir veritabanına bağlayabilirsiniz.
// Uygulamanın geri kalanı sadece bu fonksiyonları çağırır.

const DB_PATH = path.join(process.cwd(), "data", "db.json");

function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], transactions: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed.users) parsed.users = [];
    if (!parsed.transactions) parsed.transactions = [];
    return parsed;
  } catch {
    return { users: [], transactions: [] };
  }
}

function writeDb(data) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ---- Kullanıcılar ----

export function getUserByEmail(email) {
  const db = readDb();
  return db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
}

export function getUserById(id) {
  const db = readDb();
  return db.users.find((u) => u.id === id);
}

export function createUser(user) {
  const db = readDb();
  db.users.push(user);
  writeDb(db);
  return user;
}

// ---- İşlemler (yatırım / çekim) ----

export function getTransactions(userId) {
  const db = readDb();
  return db.transactions.filter((t) => t.userId === userId);
}

export function addTransaction(tx) {
  const db = readDb();
  db.transactions.push(tx);
  writeDb(db);
  return tx;
}

export function updateTransaction(userId, id, updates) {
  const db = readDb();
  const idx = db.transactions.findIndex((t) => t.id === id && t.userId === userId);
  if (idx === -1) return null;
  db.transactions[idx] = { ...db.transactions[idx], ...updates };
  writeDb(db);
  return db.transactions[idx];
}

export function deleteTransaction(userId, id) {
  const db = readDb();
  const before = db.transactions.length;
  db.transactions = db.transactions.filter((t) => !(t.id === id && t.userId === userId));
  writeDb(db);
  return db.transactions.length < before;
}
