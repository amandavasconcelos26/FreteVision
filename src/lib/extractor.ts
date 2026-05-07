import * as XLSX from 'xlsx';
import { ExtractedData, SpreadsheetRow } from '../types';

export async function parseSpreadsheet(file: File): Promise<ExtractedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Use raw objects
        const json = XLSX.utils.sheet_to_json<SpreadsheetRow>(worksheet);
        resolve(extractData(json));
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file); // Note: readAsArrayBuffer is better than readAsBinaryString
  });
}

function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  // If string, handle Brazilian comma format if present, then parse
  const clearVal = value.toString().replace(/ /g, '').replace(',', '.');
  const num = parseFloat(clearVal);
  return isNaN(num) ? 0 : num;
}

function extractData(rows: SpreadsheetRow[]): ExtractedData {
  let pesoTotal = 0;
  let qtdItensTotal = 0;
  const clientsMap = new Map<string, Set<string>>(); // Nome -> Set of (Endereço Receb + Bairro Receb + Local)
  const materialsMap = new Map<string, { quantidade: number; peso: number }>();
  const locaisSet = new Set<string>();
  const deliveriesSet = new Set<string>();
  const routePointsMap = new Map<string, { completo: string; cidade: string }>();

  rows.forEach((row) => {
    // Normalizing keys to allow varying cases or spaces - but using precise keys as requested first
    // Create a fallback dictionary for case insensitive match if precise key fails
    const rowKeys = Object.keys(row);
    const getVal = (possibleKeys: string[]) => {
      for (const k of possibleKeys) {
        const exact = row[k];
        if (exact) return exact;
        // fallback search
        const found = rowKeys.find(rk => rk.trim().toLowerCase() === k.trim().toLowerCase());
        if (found) return row[found];
      }
      return undefined;
    };

    const recebedor = String(getVal(["Nome Recebedor Mercadoria", "Nome Recebedor", "Recebedor"]) || "DESCONHECIDO").trim();
    const endereco = getVal(["Endereço Receb.", "Endereço Receb", "Endereco"]);
    const bairro = getVal(["Bairro Receb.", "Bairro Receb", "Bairro"]);
    const local = getVal(["Local", "Cidade"]);
    
    const peso = parseNumber(getVal(["Peso líquido", "Peso Liquido", "Peso"]));
    const descricao = String(getVal(["Descrição Material", "Descricao Material", "Material"]) || "DESCONHECIDO").trim();
    const qtd = parseNumber(getVal(["Qtd.Rem.", "Qtd Rem", "Quantidade"]));

    pesoTotal += peso;
    qtdItensTotal += qtd;

    const fullAddress = `${endereco || ''} ${bairro ? '- ' + bairro : ''} ${local ? '- ' + local : ''}`.trim();
    
    // Grouping Deliveries: Unique pair of (Client + Address)
    deliveriesSet.add(`${recebedor}::${fullAddress}`);

    if (local) locaisSet.add(String(local).trim());
    if (fullAddress) {
      if (!routePointsMap.has(fullAddress)) {
         routePointsMap.set(fullAddress, { completo: fullAddress, cidade: String(local || '').trim() });
      }
    }

    if (!clientsMap.has(recebedor)) {
      clientsMap.set(recebedor, new Set());
    }
    if (fullAddress) {
      clientsMap.get(recebedor)?.add(fullAddress);
    }

    if (!materialsMap.has(descricao)) {
      materialsMap.set(descricao, { quantidade: 0, peso: 0 });
    }
    const mat = materialsMap.get(descricao)!;
    mat.quantidade += qtd;
    mat.peso += peso;
  });

  return {
    pesoTotal,
    qtdEntregas: deliveriesSet.size,
    clientes: Array.from(clientsMap.keys()),
    cidades: Array.from(locaisSet),
    locaisRoteirizacao: Array.from(routePointsMap.values()),
    materiais: Array.from(materialsMap.entries()).map(([descricao, data]) => ({
      descricao,
      quantidade: data.quantidade,
      peso: data.peso
    })).sort((a,b) => b.peso - a.peso),
    qtdItensTotal,
  };
}
