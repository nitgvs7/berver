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

const productCollator = new Intl.Collator("pt-PT", {
  numeric: true,
  sensitivity: "base",
});

export function getSeedProducts(): Product[] {
  return seedProducts.map((product) => ({ ...product }));
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

function withSeedCategories(products: Product[], seedProducts: Product[]): { products: Product[]; changed: boolean } {
  const seedByCode = new Map<string, Product>();
  const seedByName = new Map<string, Product>();

  seedProducts.forEach((product) => {
    [product.ean, product.ean_cdi, product.itf, product.itf_cdi].forEach((code) => {
      const normalizedCode = normalizeCode(code);

      if (normalizedCode && !seedByCode.has(normalizedCode)) {
        seedByCode.set(normalizedCode, product);
      }
    });

    const normalizedName = normalizeSearchValue(product.name);

    if (normalizedName && !seedByName.has(normalizedName)) {
      seedByName.set(normalizedName, product);
    }
  });

  let changed = false;
  const upgradedProducts = products.map((product) => {
    if (product.category?.trim()) {
      return product;
    }

    const seedByMatchingCode = [product.ean, product.ean_cdi, product.itf, product.itf_cdi]
      .map((code) => seedByCode.get(normalizeCode(code)))
      .find(Boolean);
    const seedProduct = seedByMatchingCode ?? seedByName.get(normalizeSearchValue(product.name));

    if (seedProduct?.category) {
      changed = true;
      return { ...product, category: seedProduct.category };
    }

    return product;
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
      const upgraded = withSeedCategories(parsed, seedProducts);

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

export function saveProducts(products: Product[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
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
