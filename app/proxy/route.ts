import axios from "axios";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url") as string;

  if (!url) {
    return Response.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
    });

    return new Response(response.data, {
      headers: {
        "Content-Type":
          response.headers["content-type"] || "application/octet-stream",
        "Access-Control-Allow-Origin": "*", // 🔥 Allow CORS
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
