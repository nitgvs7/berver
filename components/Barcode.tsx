"use client";

import bwipjs from "@bwip-js/browser";
import { useEffect, useRef, useState } from "react";
import type { BarcodeType } from "../lib/barcode";

type BarcodeProps = {
  value: string;
  type?: BarcodeType;
  height?: number;
  scale?: number;
  humanReadable?: boolean;
  className?: string;
  paddingWidth?: number;
  paddingHeight?: number;
};

export function Barcode({
  value,
  type = "code128",
  height = 12,
  scale = 2,
  humanReadable = false,
  className = "",
  paddingWidth = 6,
  paddingHeight = 2,
}: BarcodeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !value) {
      return;
    }

    try {
      setError(null);
      bwipjs.toCanvas(canvas, {
        bcid: type,
        text: value,
        scale,
        height,
        includetext: humanReadable,
        textxalign: "center",
        paddingwidth: paddingWidth,
        paddingheight: paddingHeight,
        backgroundcolor: "FFFFFF",
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Erro no código de barras.";
      setError(message);
    }
  }, [height, humanReadable, paddingHeight, paddingWidth, scale, type, value]);

  return (
    <div className={`label-barcode flex h-full w-full items-center justify-center overflow-hidden ${className}`}>
      {error ? (
        <div className="w-full border border-red-700 p-1 text-center text-[8px] font-bold text-red-800">Erro no código de barras</div>
      ) : null}
      <canvas ref={canvasRef} aria-label={value} className={error ? "hidden" : "block max-w-full"} />
    </div>
  );
}
