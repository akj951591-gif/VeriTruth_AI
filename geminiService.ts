import { AnalysisResult, Verdict, AnalysisSource } from "./types";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || ''
});
console.log("Gemini API Key:", import.meta.env.VITE_GEMINI_API_KEY);
const SYSTEM_INSTRUCTION = `
You are an expert AI Fact-Checker and Misinformation Analyst. 
Your task is to analyze text (provided directly or as an image) and visual content from news, social media, or messages to determine its authenticity.

You MUST use Google Search to verify claims against the latest news and real-world events.

Return your analysis in a structured format using these specific tags:
[VERDICT] Real | Fake | Suspicious | Mixed Context
[CONFIDENCE] (Number 0-100)
[LANGUAGE] (Detected language name)
[EXPLANATION] (Detailed reasoning)
[CLAIMS] (Comma separated list of flagged claims)
[ACTION] (Practical advice for the user)
[CROSSCHECK] (Summary of findings from search grounding)

Evaluation criteria:
1. Logical consistency and internal contradictions.
2. Cross-referencing with verified current events via Google Search.
3. Identifying AI-generated imagery markers or deepfake patterns.
4. Detecting emotional manipulation or clickbait rhetoric.
`;

export async function analyzeContent(text: string, imageBase64?: string): Promise<AnalysisResult> {
  try {
    const parts: any[] = [{ text: text || "Analyze this content for misinformation based on the latest news and visual recognition." }];
    
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64.split(',')[1] || imageBase64
        }
      });
    }

    // Using gemini-3-pro-preview for complex reasoning and search grounding
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        // We do not set responseMimeType when using googleSearch to ensure grounding chunks are returned correctly
        temperature: 0.2,
      }
    });

    const responseText = response.text || "";
    
    // Parse the custom tagged format
    const getValue = (tag: string) => {
      const regex = new RegExp(`\\[${tag}\\]\\s*(.*?)(\\n|\\[|$)`, 'i');
      const match = responseText.match(regex);
      return match ? match[1].trim() : "";
    };

    const verdictStr = getValue('VERDICT');
    const confidenceStr = getValue('CONFIDENCE');
    
    const result: AnalysisResult = {
      verdict: Verdict.SUSPICIOUS,
      confidence: parseInt(confidenceStr) || 50,
      explanation: getValue('EXPLANATION'),
      detectedLanguage: getValue('LANGUAGE') || "English",
      highlightedClaims: getValue('CLAIMS').split(',').map(s => s.trim()).filter(s => s.length > 0),
      suggestedAction: getValue('ACTION'),
      logicalCrossCheck: getValue('CROSSCHECK'),
      sources: []
    };

    // Standardize Verdict
    if (verdictStr.toLowerCase().includes('real')) result.verdict = Verdict.REAL;
    else if (verdictStr.toLowerCase().includes('fake')) result.verdict = Verdict.FAKE;
    else if (verdictStr.toLowerCase().includes('mixed')) result.verdict = Verdict.MIXED;
    else result.verdict = Verdict.SUSPICIOUS;

    // Extract Grounding Sources (MANDATORY per instructions)
    const sources: AnalysisSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          if (!sources.find(s => s.url === chunk.web.uri)) {
            sources.push({
              title: chunk.web.title,
              url: chunk.web.uri
            });
          }
        }
      });
    }
    result.sources = sources;

    return result;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Analysis engine failed to connect. Please check your network or try again later.");
  }
}
