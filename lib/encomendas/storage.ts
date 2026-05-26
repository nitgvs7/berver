import type { EncomendaHistoryItem, ParsedEncomenda } from "../../types/encomenda";
import { ptDateToIsoDate } from "../date";
import { getSupabaseServerClient } from "../supabase-server";

const GENERATED_PDF_BUCKET = "auchan-order-pdfs";
const HISTORY_LIMIT = 25;

type AuchanOrderRow = {
  id: string;
  order_number: string;
  delivery_date: string | null;
  item_count: number;
  generated_pdf_path: string;
  generated_filename: string;
  created_at: string;
};

export type StoredGeneratedPdf = {
  id: string;
  filename: string;
  bytes: Uint8Array;
};

function deliveryDateToIso(value: string): string | null {
  return ptDateToIsoDate(value.replace(/\//g, "-"));
}

export async function saveGeneratedEncomendaPdf(order: ParsedEncomenda, pdfBytes: Uint8Array, filename: string): Promise<string | null> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const id = order.id || crypto.randomUUID();
  const storagePath = `${order.orderNumber}/${id}.pdf`;
  const bucket = supabase.storage.from(GENERATED_PDF_BUCKET);
  const { error: uploadError } = await bucket.upload(storagePath, Buffer.from(pdfBytes), {
    contentType: "application/pdf",
    upsert: true,
  });

  if (uploadError) {
    throw uploadError;
  }

  const { error: tableError } = await supabase.from("auchan_orders").upsert(
    {
      id,
      order_number: order.orderNumber,
      delivery_date: deliveryDateToIso(order.deliveryDate),
      item_count: order.items.length,
      generated_pdf_path: storagePath,
      generated_filename: filename,
      parsed_order: order,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (tableError) {
    await bucket.remove([storagePath]);
    throw tableError;
  }

  return id;
}

export async function listGeneratedEncomendaHistory(): Promise<EncomendaHistoryItem[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("auchan_orders")
    .select("id, order_number, delivery_date, item_count, generated_pdf_path, generated_filename, created_at")
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error || !data) {
    throw error ?? new Error("Could not load Encomendas history.");
  }

  return (data as AuchanOrderRow[]).map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    deliveryDate: row.delivery_date ?? "",
    itemCount: row.item_count,
    generatedFilename: row.generated_filename,
    createdAt: row.created_at,
  }));
}

export async function downloadGeneratedEncomendaPdf(id: string): Promise<StoredGeneratedPdf | null> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data: row, error: rowError } = await supabase
    .from("auchan_orders")
    .select("id, generated_pdf_path, generated_filename")
    .eq("id", id)
    .maybeSingle();

  if (rowError) {
    throw rowError;
  }

  if (!row) {
    return null;
  }

  const storedRow = row as Pick<AuchanOrderRow, "id" | "generated_pdf_path" | "generated_filename">;
  const { data, error } = await supabase.storage.from(GENERATED_PDF_BUCKET).download(storedRow.generated_pdf_path);

  if (error || !data) {
    throw error ?? new Error("Could not download generated Encomenda PDF.");
  }

  return {
    id: storedRow.id,
    filename: storedRow.generated_filename,
    bytes: new Uint8Array(await data.arrayBuffer()),
  };
}
