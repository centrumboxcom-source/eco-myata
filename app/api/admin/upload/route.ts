import { NextResponse } from "next/server";
import { requireAdmin, safeError } from "@/lib/server";
export async function POST(request: Request) {
  try {
    const { client } = await requireAdmin();
    const form = await request.formData();
    const file = form.get("file");
    const document = form.get("kind") === "document";
    if (document) {
      if (
        !(file instanceof File) ||
        file.size > 10 * 1024 * 1024 ||
        file.type !== "application/pdf"
      )
        return NextResponse.json(
          { message: "Оберіть PDF до 10 МБ." },
          { status: 400 },
        );
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
        return NextResponse.json(
          { message: "Некоректний PDF." },
          { status: 400 },
        );
      const path = crypto.randomUUID() + ".pdf";
      const { error } = await client.storage
        .from("product-files")
        .upload(path, bytes, { contentType: "application/pdf", upsert: false });
      if (error) throw error;
      return NextResponse.json({
        url: client.storage.from("product-files").getPublicUrl(path).data
          .publicUrl,
      });
    }
    if (
      !(file instanceof File) ||
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      return NextResponse.json(
        { message: "Оберіть JPG, PNG або WebP до 5 МБ." },
        { status: 400 },
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    const valid =
      file.type === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216
        : file.type === "image/png"
          ? bytes[0] === 137 && bytes[1] === 80
          : new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
            new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    if (!valid)
      return NextResponse.json(
        { message: "Файл не є коректним зображенням." },
        { status: 400 },
      );
    const ext = file.type.split("/")[1];
    const path = crypto.randomUUID() + "." + ext;
    const { error } = await client.storage
      .from("products")
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data } = client.storage.from("products").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (e) {
    const x = safeError(e);
    return NextResponse.json({ message: x.message }, { status: x.status });
  }
}
