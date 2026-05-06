import seedProducts from "../data/products.json";
import type { Product } from "../types/product";

export const PRODUCTS_STORAGE_KEY = "warehouse-label-printer:products";

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

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Product;
  return typeof candidate.id === "string" && typeof candidate.name === "string";
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
      return parsed;
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

export function searchProducts(query: string, products: Product[] = loadProducts()): Product[] {
  const normalizedQuery = normalizeSearchValue(query);
  const normalizedCodeQuery = normalizeCode(query);

  if (!normalizedQuery) {
    return products.slice(0, 20);
  }

  return products
    .filter((product) => {
      const textMatches = normalizeSearchValue(product.name).includes(normalizedQuery);
      const codeMatches = [product.ean, product.ean_cdi, product.itf, product.itf_cdi, product.codigo_auchan]
        .filter(Boolean)
        .some((candidate) => normalizeCode(candidate).includes(normalizedCodeQuery));

      return textMatches || codeMatches;
    })
    .slice(0, 50);
}
