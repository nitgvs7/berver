"use client";

import type { LabelData } from "../types/label";
import { getLabelBarcodeText } from "../lib/barcode";
import { formatHumanSSCC } from "../lib/sscc";
import { Barcode } from "./Barcode";

export function Label100x150({ data }: { data: LabelData }) {
  const barcode = getLabelBarcodeText(data);

  return (
    <div className="label-100x150">
      <section className="label-company">
        <p className="label-company-name">BERVER TRADING, LDA.</p>
        <p>Rua Infante D. Henrique, 6 - 6º Drt.</p>
        <p>2685-212 Portela - Loures</p>
      </section>

      <div className="label-divider" />

      <section className="label-product">
        <p className="label-caption">COD. PRODUTO:</p>
        <p className="label-product-name">{data.product.name}</p>
      </section>

      <section className="label-data-grid">
        <div>
          <span>Lote:</span>
          <strong>{data.lote}</strong>
        </div>
        <div>
          <span>Validade:</span>
          <strong>{data.validade_texto}</strong>
        </div>
        <div>
          <span>GTIN:</span>
          <strong>{barcode.gtin}</strong>
        </div>
        <div>
          <span>Nº. de Caixas:</span>
          <strong>{data.caixas}</strong>
        </div>
        <div className="label-data-wide">
          <span>Ordem de Compra:</span>
          <strong>{data.ordem_compra}</strong>
        </div>
      </section>

      <div className="label-divider" />

      <section className="label-sscc">
        <div className="label-sscc-row">
          <span>SSCC:</span>
          <strong>(00) {formatHumanSSCC(data.sscc)}</strong>
        </div>
      </section>

      <section className="label-gs1-block">
        <p>{barcode.gtinBoxesOrderHuman}</p>
        <Barcode value={barcode.gtinBoxesOrderEncoded} type="gs1-128" height={27} scale={2} />
      </section>

      <section className="label-gs1-block label-gs1-small">
        <p>{barcode.validityLotHuman}</p>
        <Barcode value={barcode.validityLotEncoded} type="gs1-128" height={26} scale={2} />
      </section>

      <section className="label-bottom-barcode">
        <p>{barcode.ssccHuman}</p>
        <Barcode value={barcode.ssccEncoded} type="gs1-128" height={24} scale={2} />
      </section>
    </div>
  );
}
