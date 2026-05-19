import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const PROJECT_ROOT = process.cwd();
const DEFAULT_XLS_PATH = "/Users/nit/Documents/VALIDADES PARA AUCHAN/VALIDADES ATUALIZADAS/MAPA VALIDADES - AUCHAN SABORES MUNDO.xlsx";
const PRODUCTS_JSON_PATH = path.join(PROJECT_ROOT, "data/products.json");
const TARGET_CATEGORY = "SABORES DO MUNDO";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function normalizeCode(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function productCodes(product) {
  return [product.ean, product.ean_cdi, product.itf, product.itf_cdi, product.codigo_auchan].map(normalizeCode).filter(Boolean);
}

function parseMinimumDays(value) {
  const digits = normalizeCode(value);

  if (!digits) {
    return null;
  }

  const days = Number(digits);

  return Number.isInteger(days) && days > 0 ? days : null;
}

function getCell(row, index) {
  return String(row[index] ?? "").trim();
}

function readValidityMinimumsFromXls(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1, raw: false });
  const byCode = new Map();
  const byName = new Map();
  const header = rows[0]?.map(normalizeText).join(" ") ?? "";

  if (header.includes("VALIDADE MINIMA") && header.includes("DESIGNACAO")) {
    rows.slice(1).forEach((row, rowIndex) => {
      const name = getCell(row, 4);
      const minimumDays = parseMinimumDays(row[8]);

      if (!name || !minimumDays) {
        return;
      }

      const entry = { minimumDays, name, rowNumber: rowIndex + 2 };
      byName.set(normalizeText(name), entry);
      [1, 2, 3].forEach((index) => {
        const code = normalizeCode(row[index]);

        if (code) {
          byCode.set(code, entry);
        }
      });
    });

    return { byCode, byName };
  }

  let category = "";

  rows.slice(1).forEach((row, rowIndex) => {
    const name = getCell(row, 0);
    const nonBlankCount = row.filter((cell) => String(cell ?? "").trim()).length;

    if (!name && nonBlankCount === 0) {
      return;
    }

    if (name.endsWith(":") && nonBlankCount === 1) {
      category = normalizeText(name.replace(/:$/, ""));
      return;
    }

    if (category !== TARGET_CATEGORY || !name) {
      return;
    }

    const minimumDays = parseMinimumDays(row[8]);

    if (!minimumDays) {
      return;
    }

    const entry = { minimumDays, name, rowNumber: rowIndex + 2 };
    byName.set(normalizeText(name), entry);
    [1, 2, 3, 4, 6].forEach((index) => {
      const code = normalizeCode(row[index]);

      if (code) {
        byCode.set(code, entry);
      }
    });
  });

  return { byCode, byName };
}

function getProductMinimumDays(product, validityIndex) {
  const matchByCode = productCodes(product)
    .map((code) => validityIndex.byCode.get(code))
    .find(Boolean);

  return matchByCode?.minimumDays ?? validityIndex.byName.get(normalizeText(product.name))?.minimumDays ?? null;
}

loadEnvFile(path.join(PROJECT_ROOT, ".env.local"));

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const xlsPath = args.find((arg) => !arg.startsWith("--")) ?? DEFAULT_XLS_PATH;

if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

if (!fs.existsSync(xlsPath)) {
  console.error(`XLS file not found: ${xlsPath}`);
  process.exit(1);
}

const seedProducts = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, "utf8"));
const saboresProducts = seedProducts.filter((product) => product.category === TARGET_CATEGORY);
const validityIndex = readValidityMinimumsFromXls(xlsPath);
const now = new Date().toISOString();
const rows = saboresProducts.map((product, index) => ({
  id: String(product.id),
  category: product.category,
  name: product.name,
  ean: product.ean || null,
  ean_cdi: product.ean_cdi || null,
  itf: product.itf || null,
  itf_cdi: product.itf_cdi || null,
  codigo_auchan: product.codigo_auchan || null,
  caixa_default: Number(product.caixa_default) > 0 ? Number(product.caixa_default) : null,
  validade_minima_dias: getProductMinimumDays(product, validityIndex),
  active: true,
  sort_order: index + 1,
  updated_at: now,
}));

const withMinimumDays = rows.filter((row) => row.validade_minima_dias !== null).length;

if (dryRun) {
  console.log(`Dry run: ${rows.length} ${TARGET_CATEGORY} products.`);
  console.log(`Products with validade_minima_dias: ${withMinimumDays}.`);
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
const { error } = await supabase.from("products").upsert(rows, { onConflict: "id" });

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Imported ${rows.length} ${TARGET_CATEGORY} products.`);
console.log(`Products with validade_minima_dias: ${withMinimumDays}.`);

if (withMinimumDays === 0) {
  console.warn("Column I had no minimum-day values for Sabores do Mundo in this XLS file.");
}
