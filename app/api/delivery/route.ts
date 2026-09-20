import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams,
    key = process.env.NOVA_POSHTA_API_KEY,
    q = (p.get("q") || "").slice(0, 100),
    city = p.get("city");
  if (!key)
    return NextResponse.json({
      configured: false,
      items: [],
      message: "Введіть адресу вручну.",
    });
  if (city && !/^[0-9a-f-]{36}$/i.test(city))
    return NextResponse.json({ configured: false, items: [] }, { status: 400 });
  try {
    const r = await fetch("https://api.novaposhta.ua/v2.0/json/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: key,
        modelName: "Address",
        calledMethod: city ? "getWarehouses" : "getCities",
        methodProperties: city
          ? { CityRef: city, FindByString: q, Limit: 500 }
          : { FindByString: q, Limit: 30 },
      }),
      signal: AbortSignal.timeout(10000),
    });
    const d = await r.json();
    if (!r.ok || !d.success) throw new Error();
    return NextResponse.json({
      configured: true,
      items: (d.data || []).map(
        (x: {
          Ref: string;
          Description: string;
          CategoryOfWarehouse?: string;
        }) => ({
          id: x.Ref,
          name: x.Description,
          locker:
            x.CategoryOfWarehouse === "Postomat" ||
            x.Description.toLowerCase().includes("поштомат"),
        }),
      ),
    });
  } catch {
    return NextResponse.json(
      {
        configured: false,
        items: [],
        message:
          "Пошук перевізника тимчасово недоступний. Введіть адресу вручну.",
      },
      { status: 502 },
    );
  }
}
