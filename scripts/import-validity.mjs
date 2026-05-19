import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const PROJECT_ROOT = process.cwd();
const PRODUCTS_JSON_PATH = path.join(PROJECT_ROOT, "data/products.json");
const VALIDITY_DIR = "/Users/nit/Documents/VALIDADES PARA AUCHAN/VALIDADES ATUALIZADAS";

const CATEGORY_FILES = [
  ["BEBIDAS SEM ALCOOL", "MAPA VALIDADES - AUCHAN BEBIDAS.xlsx"],
  ["CERVEJAS", "MAPA VALIDADES - AUCHAN CERVEJAS.xlsx"],
  ["MERCEARIA SALGADA", "MAPA VALIDADES - AUCHAN MERCEARIA SALGADA.xlsx"],
  ["AVULSO", "MAPA VALIDADES - AUCHAN AVULSO.xlsx"],
  ["SABORES DO MUNDO", "MAPA VALIDADES - AUCHAN SABORES MUNDO.xlsx"],
  ["MERCEARIA DOCE", "MAPA VALIDADES - AUCHAN MERCEARIA DOCE.xlsx"],
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
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

function readValidityMinimumsFromXls(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1, raw: false });
  const byCode = new Map();
  const byName = new Map();

  rows.slice(1).forEach((row, rowIndex) => {
    const name = String(row[4] ?? "").trim();
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

function getProductMinimumDays(product, validityIndex) {
  const matchByCode = productCodes(product)
    .map((code) => validityIndex.byCode.get(code))
    .find(Boolean);

  return matchByCode?.minimumDays ?? validityIndex.byName.get(normalizeText(product.name))?.minimumDays ?? null;
}

function buildRows(products, category, validityIndex, sortOffset) {
  const categoryProducts = products.filter((product) => product.category === category);

  return categoryProducts.map((product, index) => ({
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
    sort_order: sortOffset + index + 1,
    updated_at: new Date().toISOString(),
  }));
}

loadEnvFile(path.join(PROJECT_ROOT, ".env.local"));

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const writeJson = args.includes("--write-json");
const skipSupabase = args.includes("--skip-supabase");
const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, "utf8"));
const rows = [];
const report = [];
let sortOffset = 0;

CATEGORY_FILES.forEach(([category, fileName]) => {
  const filePath = path.join(VALIDITY_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    report.push({ category, error: `Missing file: ${filePath}` });
    return;
  }

  const validityIndex = readValidityMinimumsFromXls(filePath);
  const categoryRows = buildRows(products, category, validityIndex, sortOffset);
  sortOffset += categoryRows.length;
  rows.push(...categoryRows);
  report.push({
    category,
    matched: categoryRows.filter((row) => row.validade_minima_dias !== null).length,
    products: categoryRows.length,
    sourceRows: validityIndex.byName.size,
  });
});

if (writeJson) {
  const validityById = new Map(rows.map((row) => [row.id, row.validade_minima_dias]));
  const updatedProducts = products.map((product) =>
    validityById.has(String(product.id))
      ? {
          ...product,
          validade_minima_dias: validityById.get(String(product.id)),
        }
      : product,
  );

  fs.writeFileSync(PRODUCTS_JSON_PATH, `${JSON.stringify(updatedProducts, null, 2)}\n`);
}

console.table(report);
console.log(`Prepared ${rows.length} products.`);
console.log(`Products with validade_minima_dias: ${rows.filter((row) => row.validade_minima_dias !== null).length}.`);

if (dryRun || skipSupabase) {
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
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

console.log(`Imported ${rows.length} products into Supabase.`);
