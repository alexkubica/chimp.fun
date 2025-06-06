import axios from "axios";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return Response.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });

    const base64 = Buffer.from(response.data, "binary").toString("base64");
    const contentType = response.headers["content-type"] || "image/png";
    const dataUrl = `data:${contentType};base64,${base64}`;

    return new Response(JSON.stringify({ dataUrl }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching the resource:", (error as Error).message);
    return Response.json(
      { error: "Failed to fetch resource" },
      { status: 500 },
    );
  }
}
