import { NextResponse } from "next/server";
import { listGeneratedEncomendaHistory } from "../../../../lib/encomendas/storage";

export const runtime = "nodejs";

export async function GET() {
  try {
    const history = await listGeneratedEncomendaHistory();

    return NextResponse.json({ history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar o histórico de encomendas.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
