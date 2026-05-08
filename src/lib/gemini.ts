import { GoogleGenAI } from "@google/genai";

export async function fetchDieselPrice(origem: string): Promise<number | null> {
  if (!origem) return null;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // We prompt to get exactly a float number, using googleSearch to find actual current prices
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Qual o preço médio atualizado e verídico de mercado do litro do Diesel S10 em ${origem}, Brasil? Busque dados reais da ANP ou fontes de notícias recentes.
Responda APENAS com um número decimal usando ponto para separar os centavos (ex: 5.89). Não escreva textos ou explicações, apenas o valor numérico exato.`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      }
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
