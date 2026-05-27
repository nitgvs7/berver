"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, Keyboard, Search, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { findProductByCode, loadProductsForApp } from "../lib/products";
import { setSelectedProduct } from "../lib/label-storage";
import type { Product } from "../types/product";
import { ProductCard } from "./ProductCard";
import { ProductSearch } from "./ProductSearch";

export function BarcodeScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [status, setStatus] = useState("Pronto para digitalizar.");
  const [error, setError] = useState<string | null>(null);
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [scanning, setScanning] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialProducts() {
      try {
        const nextProducts = await loadProductsForApp();

        if (!cancelled) {
          setProducts(nextProducts);
        }
      } catch {
        if (!cancelled) {
          setError("Não foi possível carregar a base de produtos partilhada.");
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    }

    loadInitialProducts();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, []);

  function handleDetectedCode(code: string) {
    if (loadingProducts) {
      setError("A base de produtos ainda está a carregar.");
      return;
    }

    const product = findProductByCode(code, products);

    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);

    if (product) {
      setFoundProduct(product);
      setSelectedProduct(product);
      setStatus(`Produto encontrado para ${code}.`);
      setError(null);
      return;
    }

    setFoundProduct(null);
    setStatus(`Código lido: ${code}`);
    setError("Produto não encontrado. Pode procurar manualmente.");
  }

  async function startScanner() {
    setError(null);
    setFoundProduct(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Câmara não disponível neste dispositivo. Use a pesquisa manual.");
      return;
    }

    if (!videoRef.current) {
      setError("Não foi possível iniciar a pré-visualização da câmara.");
      return;
    }

    try {
      controlsRef.current?.stop();
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      setScanning(true);
      setStatus("A apontar a câmara para o código de barras...");

      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        const text = result?.getText();

        if (text) {
          handleDetectedCode(text);
        }
      });

      controlsRef.current = controls;
    } catch {
      setScanning(false);
      setError("Permissão da câmara negada ou câmara indisponível. Use a pesquisa manual.");
    }
  }

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
    setStatus("Digitalização parada.");
  }

  function selectProduct(product: Product) {
    setSelectedProduct(product);
    router.push(`/label/new?productId=${encodeURIComponent(product.id)}`);
  }

  function submitManualCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!manualCode.trim()) {
      setError("Indique um código para procurar.");
      return;
    }

    if (loadingProducts) {
      setError("A base de produtos ainda está a carregar.");
      return;
    }

    handleDetectedCode(manualCode);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
      <section className="space-y-4">
        <div className="overflow-hidden rounded-lg border-2 border-[#2f4fb3] bg-black">
          <video ref={videoRef} className="aspect-[4/3] w-full bg-black object-cover" muted playsInline />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={startScanner}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-[#1f3679] px-4 py-3 text-base font-black text-white"
          >
            <Camera aria-hidden="true" className="h-5 w-5" />
            Scan EAN
          </button>
          <button
            type="button"
            onClick={stopScanner}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md border-2 border-[#2f4fb3] bg-white px-4 py-3 text-base font-black text-[#1f3679]"
          >
            <XCircle aria-hidden="true" className="h-5 w-5" />
            Parar
          </button>
        </div>

        <p className="rounded-lg border border-[#b9d8f6] bg-white p-3 text-sm font-bold text-[#1f3679]" aria-live="polite">
          {scanning ? "Câmara ativa. " : ""}
          {loadingProducts ? "A carregar produtos. " : ""}
          {status}
        </p>

        {error ? <div className="rounded-lg border border-red-300 bg-red-50 p-4 font-bold text-red-900">{error}</div> : null}

        {foundProduct ? <ProductCard product={foundProduct} onSelect={selectProduct} /> : null}
      </section>

      <aside className="space-y-5">
        <form onSubmit={submitManualCode} className="rounded-lg border border-[#b9d8f6] bg-white p-4 shadow-sm">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-black uppercase text-[#1f3679]">
              <Keyboard aria-hidden="true" className="h-4 w-4" />
              Código Manual
            </span>
            <input
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              inputMode="numeric"
              className="min-h-14 w-full rounded-md border-2 border-[#5ab2e8] px-3 text-lg font-black outline-none focus:border-[#1f3679]"
              placeholder="EAN, ITF ou código"
            />
          </label>
          <button
            type="submit"
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#1f3679] px-4 py-3 text-base font-black text-white"
          >
            <Search aria-hidden="true" className="h-5 w-5" />
            Procurar Produto
          </button>
        </form>

        <ProductSearch onSelect={selectProduct} actionLabel="Criar Etiqueta" />
      </aside>
    </div>
  );
}
