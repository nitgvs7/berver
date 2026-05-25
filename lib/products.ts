import seedProducts from "../data/products.json";
import type { Product } from "../types/product";

export const PRODUCTS_STORAGE_KEY = "warehouse-label-printer:products";
export const UNCATEGORIZED_PRODUCT_CATEGORY = "SEM CATEGORIA";

export type ProductSort =
  | "file"
  | "category-asc"
  | "category-desc"
  | "name-asc"
  | "name-desc"
  | "ean-asc"
  | "ean-desc"
  | "itf-asc"
  | "itf-desc"
  | "auchan-asc"
  | "auchan-desc"
  | "box-asc"
  | "box-desc";

export type ProductGroup = {
  category: string;
  products: Product[];
};

type SupabaseProductRow = {
  id: string | number;
  category: string | null;
  name: string;
  ean: string | null;
  ean_cdi: string | null;
  itf: string | null;
  itf_cdi: string | null;
  codigo_auchan: string | null;
  caixa_default: number | null;
  validade_minima_dias: number | null;
};

type SupabaseProductWriteRow = {
  id: string;
  category: string;
  name: string;
  ean: string | null;
  ean_cdi: string | null;
  itf: string | null;
  itf_cdi: string | null;
  codigo_auchan: string | null;
  caixa_default: number | null;
  validade_minima_dias: number | null;
  active: boolean;
  updated_at: string;
};

const productCollator = new Intl.Collator("pt-PT", {
  numeric: true,
  sensitivity: "base",
});

async function getOptionalSupabaseBrowserClient() {
  const { getSupabaseBrowserClient } = await import("./supabase");

  return getSupabaseBrowserClient();
}

export function getSeedProducts(): Product[] {
  return seedProducts.map((product) => ({ ...product }));
}

function fromSupabaseProduct(row: SupabaseProductRow): Product {
  return {
    id: String(row.id),
    category: row.category ?? undefined,
    name: row.name,
    ean: row.ean ?? undefined,
    ean_cdi: row.ean_cdi ?? undefined,
    itf: row.itf ?? undefined,
    itf_cdi: row.itf_cdi ?? undefined,
    codigo_auchan: row.codigo_auchan ?? undefined,
    caixa_default: row.caixa_default ?? undefined,
    validade_minima_dias: row.validade_minima_dias,
  };
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function productToSupabaseRow(product: Product): SupabaseProductWriteRow {
  return {
    id: product.id,
    category: product.category?.trim() || UNCATEGORIZED_PRODUCT_CATEGORY,
    name: product.name.trim(),
    ean: emptyToNull(product.ean),
    ean_cdi: emptyToNull(product.ean_cdi),
    itf: emptyToNull(product.itf),
    itf_cdi: emptyToNull(product.itf_cdi),
    codigo_auchan: emptyToNull(product.codigo_auchan),
    caixa_default: Number(product.caixa_default) > 0 ? Number(product.caixa_default) : null,
    validade_minima_dias: Number(product.validade_minima_dias) > 0 ? Number(product.validade_minima_dias) : null,
    active: true,
    updated_at: new Date().toISOString(),
  };
}

export function normalizeSearchValue(value: string | number | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeCode(value: string | number | undefined): string {
  return String(value ?? "").replace(/[^0-9a-z]/gi, "").toLowerCase();
}

function getCategory(product: Product): string {
  return product.category?.trim() || UNCATEGORIZED_PRODUCT_CATEGORY;
}

function compareText(left: string | undefined, right: string | undefined): number {
  return productCollator.compare(left ?? "", right ?? "");
}

function compareNumber(left: number | undefined, right: number | undefined, direction: "asc" | "desc"): number {
  const leftMissing = !Number.isFinite(left);
  const rightMissing = !Number.isFinite(right);

  if (leftMissing && rightMissing) {
    return 0;
  }

  if (leftMissing) {
    return 1;
  }

  if (rightMissing) {
    return -1;
  }

  return direction === "asc" ? Number(left) - Number(right) : Number(right) - Number(left);
}

function codeToNumber(value: string | number | undefined): number | undefined {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number(digits) : undefined;
}

function productEan(product: Product): string | undefined {
  return product.ean_cdi || product.ean;
}

function productItf(product: Product): string | undefined {
  return product.itf_cdi || product.itf;
}

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Product;
  return typeof candidate.id === "string" && typeof candidate.name === "string";
}

type ProductIdentity = {
  codes: Set<string>;
  ids: Set<string>;
  names: Set<string>;
};

function productCodes(product: Product): string[] {
  return [product.ean, product.ean_cdi, product.itf, product.itf_cdi, product.codigo_auchan].map((code) => normalizeCode(code)).filter(Boolean);
}

function createProductIdentity(products: Product[]): ProductIdentity {
  const identity: ProductIdentity = {
    codes: new Set(),
    ids: new Set(),
    names: new Set(),
  };

  products.forEach((product) => addProductToIdentity(identity, product));

  return identity;
}

function addProductToIdentity(identity: ProductIdentity, product: Product): void {
  const id = product.id.trim();

  if (id) {
    identity.ids.add(id);
  }

  productCodes(product).forEach((code) => identity.codes.add(code));

  const name = normalizeSearchValue(product.name);

  if (name) {
    identity.names.add(name);
  }
}

function hasProductIdentityMatch(product: Product, identity: ProductIdentity): boolean {
  const id = product.id.trim();

  if (id && identity.ids.has(id)) {
    return true;
  }

  const codes = productCodes(product);

  if (codes.some((code) => identity.codes.has(code))) {
    return true;
  }

  const name = normalizeSearchValue(product.name);

  return codes.length === 0 && Boolean(name && identity.names.has(name));
}

type SeedIndexes = ReturnType<typeof createSeedIndexes>;

function createSeedIndexes(seedProducts: Product[]) {
  const seedByCode = new Map<string, Product>();
  const seedById = new Map<string, Product>();
  const seedByName = new Map<string, Product>();

  seedProducts.forEach((product) => {
    const id = product.id.trim();

    if (id && !seedById.has(id)) {
      seedById.set(id, product);
    }

    productCodes(product).forEach((code) => {
      if (!seedByCode.has(code)) {
        seedByCode.set(code, product);
      }
    });

    const normalizedName = normalizeSearchValue(product.name);

    if (normalizedName && !seedByName.has(normalizedName)) {
      seedByName.set(normalizedName, product);
    }
  });

  return { seedByCode, seedById, seedByName };
}

function findMatchingSeedProduct(product: Product, seedIndexes: SeedIndexes) {
  const { seedByCode, seedById, seedByName } = seedIndexes;
  const id = product.id.trim();

  if (id && seedById.has(id)) {
    return seedById.get(id);
  }

  const seedByMatchingCode = productCodes(product)
    .map((code) => seedByCode.get(code))
    .find(Boolean);

  return seedByMatchingCode ?? seedByName.get(normalizeSearchValue(product.name));
}

export function syncProductsWithSeed(products: Product[], seedProducts: Product[] = getSeedProducts()): { products: Product[]; changed: boolean } {
  let changed = false;
  const seedIndexes = createSeedIndexes(seedProducts);
  const upgradedProducts = products.map((product) => {
    const seedProduct = findMatchingSeedProduct(product, seedIndexes);

    if (!seedProduct) {
      return product;
    }

    const nextProduct = { ...product };

    if (!nextProduct.category?.trim() && seedProduct.category) {
      nextProduct.category = seedProduct.category;
      changed = true;
    }

    if (nextProduct.validade_minima_dias == null && seedProduct.validade_minima_dias != null) {
      nextProduct.validade_minima_dias = seedProduct.validade_minima_dias;
      changed = true;
    }

    return nextProduct;
  });
  const identity = createProductIdentity(upgradedProducts);

  seedProducts.forEach((seedProduct) => {
    if (hasProductIdentityMatch(seedProduct, identity)) {
      return;
    }

    const product = { ...seedProduct };
    upgradedProducts.push(product);
    addProductToIdentity(identity, product);
    changed = true;
  });

  return { products: upgradedProducts, changed };
}

export function loadProducts(): Product[] {
  const seedProducts = getSeedProducts();

  if (typeof window === "undefined") {
    return seedProducts;
  }

  const stored = window.localStorage.getItem(PRODUCTS_STORAGE_KEY);

  if (!stored) {
    window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(seedProducts));
    return seedProducts;
  }

  try {
    const parsed = JSON.parse(stored) as unknown;

    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isProduct)) {
      const upgraded = syncProductsWithSeed(parsed, seedProducts);

      if (upgraded.changed) {
        window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(upgraded.products));
      }

      return upgraded.products;
    }

    window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(seedProducts));
    return seedProducts;
  } catch {
    window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(seedProducts));
    return seedProducts;
  }
}

export async function loadSupabaseProducts(): Promise<Product[] | null> {
  const supabase = await getOptionalSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, category, name, ean, ean_cdi, itf, itf_cdi, codigo_auchan, caixa_default, validade_minima_dias")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) {
    console.warn("Could not load Supabase products, using local product data.", error);
    return null;
  }

  return (data as SupabaseProductRow[]).map(fromSupabaseProduct);
}

export async function loadProductsForApp(): Promise<Product[]> {
  const supabaseProducts = await loadSupabaseProducts();

  return supabaseProducts?.length ? supabaseProducts : loadProducts();
}

export function saveProducts(products: Product[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
}

export async function saveProductToSource(product: Product): Promise<void> {
  const currentProducts = loadProducts();
  const nextProducts = currentProducts.some((item) => item.id === product.id)
    ? currentProducts.map((item) => (item.id === product.id ? product : item))
    : [product, ...currentProducts];

  saveProducts(nextProducts);

  const supabase = await getOptionalSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("products").upsert(productToSupabaseRow(product), { onConflict: "id" });

  if (error) {
    throw error;
  }
}

export async function deleteProductFromSource(productId: string): Promise<void> {
  const nextProducts = loadProducts().filter((item) => item.id !== productId);
  saveProducts(nextProducts);

  const supabase = await getOptionalSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from("products")
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    throw error;
  }
}

export async function replaceProductsInSource(products: Product[]): Promise<void> {
  saveProducts(products);

  const supabase = await getOptionalSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const activeIds = products.map((product) => product.id);

  if (products.length > 0) {
    const { error } = await supabase.from("products").upsert(products.map(productToSupabaseRow), { onConflict: "id" });

    if (error) {
      throw error;
    }
  }

  const inactiveUpdate = {
    active: false,
    updated_at: new Date().toISOString(),
  };
  const inactiveRequest =
    activeIds.length > 0
      ? supabase.from("products").update(inactiveUpdate).not("id", "in", `(${activeIds.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(",")})`)
      : supabase.from("products").update(inactiveUpdate).neq("id", "");
  const { error } = await inactiveRequest.neq("category", "__APP_STATE__");

  if (error) {
    throw error;
  }
}

export function resetProducts(): Product[] {
  const products = getSeedProducts();

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(PRODUCTS_STORAGE_KEY);
  }

  return products;
}

export function findProductByCode(code: string, products: Product[] = loadProducts()): Product | undefined {
  const normalizedCode = normalizeCode(code);

  if (!normalizedCode) {
    return undefined;
  }

  return products.find((product) =>
    [product.ean, product.ean_cdi, product.itf, product.itf_cdi, product.codigo_auchan]
      .filter(Boolean)
      .some((candidate) => normalizeCode(candidate) === normalizedCode),
  );
}

export function findProductById(id: string, products: Product[] = loadProducts()): Product | undefined {
  return products.find((product) => product.id === id);
}

export function filterProducts(query: string, products: Product[] = loadProducts()): Product[] {
  const normalizedQuery = normalizeSearchValue(query);
  const normalizedCodeQuery = normalizeCode(query);

  if (!normalizedQuery) {
    return products.slice();
  }

  return products.filter((product) => {
    const textMatches = [product.name, product.category].some((candidate) => normalizeSearchValue(candidate).includes(normalizedQuery));
    const codeMatches = [product.ean, product.ean_cdi, product.itf, product.itf_cdi, product.codigo_auchan]
      .filter(Boolean)
      .some((candidate) => normalizeCode(candidate).includes(normalizedCodeQuery));

    return textMatches || codeMatches;
  });
}

export function searchProducts(query: string, products: Product[] = loadProducts(), limit = normalizeSearchValue(query) ? 50 : 20): Product[] {
  return filterProducts(query, products).slice(0, limit);
}

export function sortProducts(products: Product[], sort: ProductSort): Product[] {
  const sortedProducts = products.slice();

  switch (sort) {
    case "category-asc":
      return sortedProducts.sort((left, right) => compareText(getCategory(left), getCategory(right)) || compareText(left.name, right.name));
    case "category-desc":
      return sortedProducts.sort((left, right) => compareText(getCategory(right), getCategory(left)) || compareText(left.name, right.name));
    case "name-asc":
      return sortedProducts.sort((left, right) => compareText(left.name, right.name));
    case "name-desc":
      return sortedProducts.sort((left, right) => compareText(right.name, left.name));
    case "ean-asc":
      return sortedProducts.sort((left, right) => compareText(productEan(left), productEan(right)) || compareText(left.name, right.name));
    case "ean-desc":
      return sortedProducts.sort((left, right) => compareText(productEan(right), productEan(left)) || compareText(left.name, right.name));
    case "itf-asc":
      return sortedProducts.sort((left, right) => compareText(productItf(left), productItf(right)) || compareText(left.name, right.name));
    case "itf-desc":
      return sortedProducts.sort((left, right) => compareText(productItf(right), productItf(left)) || compareText(left.name, right.name));
    case "auchan-asc":
      return sortedProducts.sort((left, right) => compareNumber(codeToNumber(left.codigo_auchan), codeToNumber(right.codigo_auchan), "asc") || compareText(left.name, right.name));
    case "auchan-desc":
      return sortedProducts.sort((left, right) => compareNumber(codeToNumber(left.codigo_auchan), codeToNumber(right.codigo_auchan), "desc") || compareText(left.name, right.name));
    case "box-asc":
      return sortedProducts.sort((left, right) => compareNumber(left.caixa_default, right.caixa_default, "asc") || compareText(left.name, right.name));
    case "box-desc":
      return sortedProducts.sort((left, right) => compareNumber(left.caixa_default, right.caixa_default, "desc") || compareText(left.name, right.name));
    case "file":
    default:
      return sortedProducts;
  }
}

export function groupProductsByCategory(products: Product[]): ProductGroup[] {
  const groups = new Map<string, Product[]>();

  products.forEach((product) => {
    const category = getCategory(product);
    const groupProducts = groups.get(category) ?? [];
    groupProducts.push(product);
    groups.set(category, groupProducts);
  });

  return Array.from(groups, ([category, products]) => ({ category, products }));
}
