import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const backendUrl =
      process.env.NODE_ENV === "production"
        ? "https://intelliproofbackend.vercel.app/api/ai/linker"
        : "http://localhost:8000/api/ai/linker";

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(180000),
    });

    const responseText = await response.text();
    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { error: responseText || "Invalid backend response" };
    }

    if (!response.ok) {
      return res.status(response.status).json(responseData);
    }

    return res.status(200).json(responseData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("aborted") || message.includes("timeout")) {
      return res.status(504).json({
        error: "Gateway timeout",
        details: "The evidence linking request took too long to complete.",
      });
    }

    console.error("Linker API route error:", error);
    return res.status(500).json({ error: "Internal server error", details: message });
  }
}
