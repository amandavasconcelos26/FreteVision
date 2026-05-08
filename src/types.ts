export interface FixedCosts {
  valorDiesel: number;
  mediaKmLitro: number;
  custoPneuKm: number;
  custoDepreciacaoKm: number;
  custoManutencaoKm: number;
  custoSeguroRastreadorKm: number;
  custoAdminKm: number;
  pernoiteMotorista: number;
  pernoiteAjudante: number;
  impostoPisCofins: number;
}

export interface RouteVariables {
  kmTotal: number;
  valorFrete: number;
  qtdPernoites: number;
  pedagio: number;
  descarga: number;
  outrosCustos: number;
  cidadeOrigem?: string;
  valorDieselAtual?: number;
}

export interface SpreadsheetRow {
  "Endereço Receb."?: string;
  "Bairro Receb."?: string;
  "Local"?: string;
  "Nome Recebedor Mercadoria"?: string;
  "Peso líquido"?: number | string;
  "Descrição Material"?: string;
  "Qtd.Rem."?: number | string;
  "Remessa"?: string;
  "Nº do pedido"?: string;
  [key: string]: any; // Allow other columns
}

export interface ClientData {
  nome: string;
  enderecos: Set<string>;
}

export interface MaterialData {
  descricao: string;
  quantidade: number;
  peso: number;
}

export interface DeliveryItem {
  id: string;
  cliente: string;
  enderecoCompleto: string;
  cidade: string;
  materiais: MaterialData[];
  pesoTotal: number;
}

export interface ExtractedData {
  pesoTotal: number;
  qtdEntregas: number;
  clientes: string[];
  cidades: string[];
  locaisRoteirizacao: { completo: string; cidade: string }[];
  materiais: MaterialData[];
  qtdItensTotal: number;
  entregas: DeliveryItem[];
}

export interface RouteCalculations {
  custoDiesel: number;
  custoPernoite: number;
  custoPneu: number;
  custoDepreciacao: number;
  custoManutencao: number;
  custoSeguroRef: number;
  custoAdminRef: number;
  custoImpostos: number;
  custoTotal: number;
  lucro: number;
  margem: number;
  status: "VIÁVEL" | "ATENÇÃO" | "INVIÁVEL" | "PREJUÍZO";
}
