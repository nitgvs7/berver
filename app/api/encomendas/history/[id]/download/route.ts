import { NextResponse } from "next/server";
import { downloadGeneratedEncomendaPdf } from "../../../../../../lib/encomendas/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function contentDisposition(filename: string): string {
  return `attachment; filename="${filename.replace(/["\\]/g, "")}"`;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const pdf = await downloadGeneratedEncomendaPdf(params.id);

    if (!pdf) {
      return NextResponse.json({ error: "Encomenda não encontrada." }, { status: 404 });
    }

    return new NextResponse(Buffer.from(pdf.bytes), {
      headers: {
        "Content-Disposition": contentDisposition(pdf.filename),
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível descarregar o PDF.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
