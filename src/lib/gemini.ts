import { GoogleGenAI, Type } from "@google/genai";
import { DeliveryItem } from '../types';

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

export interface RouteOptimizationResult {
  entregasOrdenadas: {
    id: string;
    ordem: number;
    justificativa: string;
    estimativaEspacoOcupadoCubico: number;
  }[];
  isViavelEspaco: boolean;
  isViavelPeso: boolean;
  isViavelMaterial12m: boolean;
  pesoMaterial12mEstimado: number;
  espacoM3TotalEstimado: number;
  pesoTotalSoma: number;
  analiseGeral: string;
}

export async function generateOptimalRoute(origem: string, entregas: DeliveryItem[]): Promise<RouteOptimizationResult | null> {
  if (!entregas || entregas.length === 0) return null;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `Atuando como um roteirista logístico, crie a melhor rota possível para as seguintes entregas, saindo de ${origem || 'uma localidade padrão'}.
Restrições do Veículo:
- Capacidade Máxima de Carga: 14 toneladas (14.000 kg)
- Dimensões Internas (estimativa): 2.60m de largura x 10.50m de comprimento (aprox. 27.3 m²). A altura média é 2.60m, gerando aprox 70m³ de cubagem total.
- **RESTRIÇÃO CRÍTICA**: Material de 12 metros (como vergalhões RT que vão no cavalete/rack superior) só pode ser carregado até um máximo de 5 toneladas (5.000 kg).

Regras de Carregamento e Ordem de Entrega (MUITO IMPORTANTE):
1. A sigla "DOB" significa que o material é DOBRADO (ocupando menos espaço linear que o 12m, por exemplo).
2. As **Chapas** vão no piso/solo do caminhão, portanto os clientes com "Chapas" DEBEM SER AS ÚLTIMAS ENTREGAS (para que as chapas sejam descarregadas por último).
3. As **Telas** vão por cima das chapas.
4. As **PRIMEIRAS ENTREGAS** a serem feitas devem ser os clientes que contêm **"Colunas"** e **"materiais de 2 metros"**.

Considere:
- O peso líquido total que será carregado.
- Uma estimativa de cubagem (espaço m³) baseado na descrição do material, pesos e quantidades listados.
- A restrição de 5 toneladas para materiais de 12 metros.
- As regras de carregamento (Chapas por último, Colunas e material 2m primeiro).
- A distância/ordem geográfica entre as cidades, MAS DEVE RESPEITAR as regras de carregamento (ex: se um cliente perto tem apenas chapas, ele pode ter que ficar para depois caso não dê para descarregar a chapa com outros materiais em cima). Planeje a melhor sequência lógica considerando a arrumação da carga e a geografia.

Entregas:
${JSON.stringify(entregas.map(e => ({
  id: e.id,
  cliente: e.cliente,
  cidade: e.cidade,
  enderecoCompleto: e.enderecoCompleto,
  pesoTotalKg: e.pesoTotal,
  materiais: e.materiais
})), null, 2)}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            entregasOrdenadas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  ordem: { type: Type.INTEGER },
                  justificativa: { type: Type.STRING },
                  estimativaEspacoOcupadoCubico: { type: Type.NUMBER }
                },
                required: ["id", "ordem", "justificativa", "estimativaEspacoOcupadoCubico"]
              }
            },
            isViavelEspaco: { type: Type.BOOLEAN },
            isViavelPeso: { type: Type.BOOLEAN },
            isViavelMaterial12m: { type: Type.BOOLEAN, description: "True se o total de materiais de 12m for menor ou igual a 5 toneladas" },
            pesoMaterial12mEstimado: { type: Type.NUMBER, description: "Peso total estimado (em kg) de materiais de 12m identificados na carga" },
            espacoM3TotalEstimado: { type: Type.NUMBER },
            pesoTotalSoma: { type: Type.NUMBER },
            analiseGeral: { type: Type.STRING }
          },
          required: ["entregasOrdenadas", "isViavelEspaco", "isViavelPeso", "isViavelMaterial12m", "pesoMaterial12mEstimado", "espacoM3TotalEstimado", "pesoTotalSoma", "analiseGeral"]
        },
        temperature: 0.2,
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as RouteOptimizationResult;
    }
  } catch (error) {
    console.error("Erro na roteirização via Gemini:", error);
  }
  return null;
}
