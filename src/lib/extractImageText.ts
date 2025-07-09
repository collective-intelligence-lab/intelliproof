export async function extractTextFromImage(
    file: File,
    summarize: boolean = false
): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(
        `/api/ai/extract-text-from-image?summarize=${summarize}`,
        {
            method: "POST",
            body: formData,
        }
    );

    if (!res.ok) {
        let errorMsg = "Failed to extract text from image";
        try {
            const error = await res.json();
            errorMsg = error.detail || errorMsg;
        } catch { }
        throw new Error(errorMsg);
    }

    const data = await res.json();
    return data.text;
} 