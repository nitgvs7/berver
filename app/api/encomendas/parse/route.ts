import { NextResponse } from "next/server";
import { parseAuchanOrderPdf } from "../../../../lib/encomendas/parser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Envie um PDF da encomenda Auchan." }, { status: 400 });
    }

    if (file.type && file.type !== "application/pdf") {
      return NextResponse.json({ error: "O ficheiro deve ser um PDF." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const order = await parseAuchanOrderPdf(bytes);

    return NextResponse.json({ order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível ler o PDF.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
