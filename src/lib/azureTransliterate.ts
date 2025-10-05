// Azure Translator Transliterate client
// Uses API v3.0 Transliterate: https://learn.microsoft.com/azure/ai-services/translator/reference/v3-0-transliterate

const TRANSLITERATE_ENDPOINT = "https://api.cognitive.microsofttranslator.com/transliterate?api-version=3.0&language=ar&fromScript=Arab&toScript=Latn";

export async function transliterateViaAzure(inputTexts: string[]): Promise<string[]> {
    const key = process.env.AZURE_TRANSLATOR_KEY;
    const region = process.env.AZURE_TRANSLATOR_REGION; // optional but recommended for global
    if (!key) throw new Error("Missing AZURE_TRANSLATOR_KEY env var");

    // API allows max 10 items per request, 1000 chars each, 5000 total
    const chunks: string[][] = [];
    let current: string[] = [];
    for (const t of inputTexts) {
        current.push(t);
        if (current.length === 10) {
            chunks.push(current);
            current = [];
        }
    }
    if (current.length) chunks.push(current);

    const outputs: string[] = [];
    for (const chunk of chunks) {
        const body = chunk.map(text => ({ Text: text }));
        const res = await fetch(TRANSLITERATE_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Ocp-Apim-Subscription-Key": key,
                ...(region ? { "Ocp-Apim-Subscription-Region": region } : {}),
            },
            body: JSON.stringify(body),
            // Server-only; no caching
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Azure transliterate error ${res.status}: ${text}`);
        }
        const data = await res.json();
        for (const item of data) {
            outputs.push(item?.text ?? "");
        }
    }
    return outputs;
}

export function azureAvailable(): boolean {
    return Boolean(process.env.AZURE_TRANSLATOR_KEY);
}


