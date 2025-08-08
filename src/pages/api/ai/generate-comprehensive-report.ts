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
            ? 'https://intelliproofbackend.vercel.app/api/ai/generate-comprehensive-report'
            : 'http://localhost:8000/api/ai/generate-comprehensive-report'

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body),
            // Increase timeout for large responses
            signal: AbortSignal.timeout(60000), // 60 seconds
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Backend error:', response.status, errorText)
            return res.status(response.status).json({
                error: `Backend error: ${response.status}`,
                details: errorText
            })
        }

        const data = await response.json()
        return res.status(200).json(data)
    } catch (error) {
        console.error('API route error:', error)
        return res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}
