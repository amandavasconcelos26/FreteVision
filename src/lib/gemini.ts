import { GoogleGenAI } from "@google/genai";

export async function fetchDieselPrice(origem: string): Promise<number | null> {
  if (!origem) return null;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // We prompt to get exactly a float number, nothing else
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Pesquise na internet qual o preço médio atualizado (em reais) do litro do Diesel S10 em ${origem}, Brasil. 
Responda APENAS com um número decimal usando ponto para separar os centavos (ex: 5.89). Não explique ou escreva textos.`,
      tools: [{ googleSearch: {} }]
    });
    
    const text = response.text || "";
    const match = text.match(/\d+\.\d+/);
    if (match && match[0]) {
      return parseFloat(match[0]);
    } else {
      const matchComma = text.match(/\d+,\d+/);
      if (matchComma && matchComma[0]) {
        return parseFloat(matchComma[0].replace(',', '.'));
      }
    }
  } catch (error) {
    console.error("Erro ao buscar preço do diesel via Gemini API:", error);
  }
  return null;
}
