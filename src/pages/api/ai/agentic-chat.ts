import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const backendUrl = process.env.NODE_ENV === 'production'
      ? 'https://intelliproofbackend.vercel.app/api/ai/agentic-chat'
      : 'http://localhost:8000/api/ai/agentic-chat'

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(120000),
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.error('Agentic backend error:', response.status, responseText)
      return res.status(response.status).json({
        error: `Backend error: ${response.status}`,
        details: responseText,
      })
    }

    try {
      const data = JSON.parse(responseText)
      return res.status(200).json(data)
    } catch {
      return res.status(200).send(responseText)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Agentic API route error:', error)

    if (errorMessage.includes('aborted') || errorMessage.includes('timeout')) {
      return res.status(504).json({
        error: 'Gateway timeout',
        details: 'The agentic chat request took too long to complete.',
      })
    }

    return res.status(500).json({
      error: 'Internal server error',
      details: errorMessage,
    })
  }
}