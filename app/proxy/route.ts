import axios from "axios";
import { type NextRequest } from "next/server";
import { logAPIUsage } from "@/lib/api-logger";

type ResponseData = {
  message?: string;
  error?: string;
};

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = "/proxy";
  const method = "GET";
  let status = 200;

  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url") as string;

    if (!url) {
      status = 400;
      return Response.json({ error: "URL is required" }, { status: 400 });
    }

    const response = await axios.get(url, {
      responseType: "arraybuffer",
    });

    return new Response(response.data, {
      headers: {
        "Content-Type": response.headers["content-type"],
      },
    });
  } catch (error) {
    status = 500;
    console.error("Error fetching the resource:", (error as Error).message);
    return Response.json(
      { error: "Failed to fetch resource" },
      { status: 500 },
    );
  } finally {
    const responseTime = Date.now() - startTime;
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    await logAPIUsage(endpoint, method, status, responseTime, ip, userAgent);
  }
}
