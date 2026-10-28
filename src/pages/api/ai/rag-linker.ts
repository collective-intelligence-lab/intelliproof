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
      process.env.RAG_BACKEND_URL ||
      (process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_API_URL
        : "http://127.0.0.1:8000");
    const authorization = req.headers.authorization;
    const response = await fetch(`${backendUrl}/api/ai/rag-linker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
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

    return res.status(response.status).json(responseData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("RAG linker API route error:", error);
    return res.status(500).json({ error: "Internal server error", details: message });
  }
}