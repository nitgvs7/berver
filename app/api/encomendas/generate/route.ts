import { NextResponse } from "next/server";
import { generateCleanEncomendaPdf } from "../../../../lib/encomendas/pdf";
import { saveGeneratedEncomendaPdf } from "../../../../lib/encomendas/storage";
import { createGeneratedFilename, normalizeParsedEncomenda } from "../../../../lib/encomendas/validation";

export const runtime = "nodejs";

function contentDisposition(filename: string): string {
  return `attachment; filename="${filename.replace(/["\\]/g, "")}"`;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const order = normalizeParsedEncomenda(payload);
    const filename = createGeneratedFilename(order);
    const pdfBytes = await generateCleanEncomendaPdf(order);
    const storedId = await saveGeneratedEncomendaPdf(order, pdfBytes, filename);
    const headers = new Headers({
      "Content-Disposition": contentDisposition(filename),
      "Content-Type": "application/pdf",
    });

    if (storedId) {
      headers.set("X-Encomenda-Id", storedId);
    }

    return new NextResponse(Buffer.from(pdfBytes), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível gerar o PDF.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
