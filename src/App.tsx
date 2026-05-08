import React, { useState, useMemo } from 'react';
import { Truck, Settings as SettingsIcon, UploadCloud, MapPin, Package, Users, DollarSign, Activity, FileSpreadsheet, ArrowRight, ChevronRight } from 'lucide-react';
import { useSettings } from './hooks/useSettings';
import { ExtractedData, RouteVariables, FixedCosts, RouteCalculations } from './types';
import { parseSpreadsheet } from './lib/extractor';
import { fetchDieselPrice } from './lib/gemini';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [view, setView] = useState<'route' | 'settings'>('route');

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#f8f9fa] text-zinc-900 font-sans overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-center bg-white border-b border-zinc-200/80 px-4 py-3 shrink-0 relative z-20 shadow-sm">
        <div className="flex items-center justify-center gap-2">
            <img src="/logo.png" alt="Frete Vision Logo" className="h-24 object-contain" />
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[280px] bg-white text-zinc-800 flex-col shrink-0 border-r border-zinc-200/80 shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-10">
        <div className="pt-8 pb-6 px-4 w-full flex flex-col items-center">
          <img src="/logo.png" alt="Frete Vision Logo" className="h-32 md:h-[220px] md:-mt-8 w-full object-contain scale-110" />
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 mt-4">
          <button 
            onClick={() => setView('route')}
            className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-[13px] group hover:cursor-pointer ${view === 'route' ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            {view === 'route' && (
              <motion.div layoutId="activeTab" className="absolute inset-0 bg-zinc-100 rounded-xl shadow-sm border border-zinc-200/50" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
            )}
            <Activity className={`w-4 h-4 relative z-10 transition-colors ${view === 'route' ? 'text-[#C5A059]' : 'text-zinc-400 group-hover:text-[#C5A059]'}`} />
            <span className="relative z-10">Painel da Rota</span>
          </button>
          <button 
            onClick={() => setView('settings')}
            className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-[13px] group hover:cursor-pointer ${view === 'settings' ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            {view === 'settings' && (
              <motion.div layoutId="activeTab" className="absolute inset-0 bg-zinc-100 rounded-xl shadow-sm border border-zinc-200/50" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
            )}
            <SettingsIcon className={`w-4 h-4 relative z-10 transition-colors ${view === 'settings' ? 'text-[#C5A059]' : 'text-zinc-400 group-hover:text-[#C5A059]'}`} />
            <span className="relative z-10">Custos Operacionais</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto bg-[#f8f9fa] relative pb-20 md:pb-0 z-0">
        <AnimatePresence mode="wait">
          {view === 'route' ? (
            <motion.div key="route" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="min-h-full">
              <RouteDashboard />
            </motion.div>
          ) : (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="min-h-full">
              <SettingsDashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200/80 flex px-2 py-2 pb-safe z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        <button 
          onClick={() => setView('route')}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl gap-1 transition-colors ${view === 'route' ? 'text-[#C5A059] bg-[#C5A059]/5' : 'text-zinc-500'}`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] font-medium">Painel da Rota</span>
        </button>
        <button 
          onClick={() => setView('settings')}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl gap-1 transition-colors ${view === 'settings' ? 'text-[#C5A059] bg-[#C5A059]/5' : 'text-zinc-500'}`}
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium">Custos Operacionais</span>
        </button>
      </nav>
    </div>
  );
}

// ---------------------------------------------------------
// Route Dashboard View
// ---------------------------------------------------------

function RouteDashboard() {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [variables, setVariables] = useState<RouteVariables>({
    kmTotal: 0,
    valorFrete: 0,
    qtdPernoites: 0,
    pedagio: 0,
    descarga: 0,
    outrosCustos: 0,
    cidadeOrigem: '',
  });

  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [calculatingDiesel, setCalculatingDiesel] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>('');

  const handleOriginComplete = () => {
    calculateRouteDistance();
    handleFetchDieselPrice();
  };

  const calculateRouteDistance = async () => {
    if (!variables.cidadeOrigem || !extracted || extracted.cidades.length === 0) return;
    
    setCalculatingRoute(true);
    try {
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
      
      const coords: { lon: number; lat: number; name: string }[] = [];
      let originState = "";
      
      // 1. Fetch Origin and extract State
      try {
        const qOrigin = encodeURIComponent(variables.cidadeOrigem + ", Brasil");
        const resOrigin = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${qOrigin}&countrycodes=br&limit=1&addressdetails=1`);
        const dataOrigin = await resOrigin.json();
        if (dataOrigin && dataOrigin.length > 0) {
          coords.push({ lon: parseFloat(dataOrigin[0].lon), lat: parseFloat(dataOrigin[0].lat), name: variables.cidadeOrigem });
          originState = dataOrigin[0].address?.state || "";
        } else {
           alert("Não foi possível encontrar a cidade de origem no mapa.");
           setCalculatingRoute(false);
           return;
        }
      } catch (e) {
           console.warn("Failed origin", e);
           alert("Erro ao buscar a cidade de origem.");
           setCalculatingRoute(false);
           return;
      }
      
      // 2. Fetch Destinations with Origin's State Context
      const allDestinations = extracted.cidades;
      for (let i = 0; i < allDestinations.length; i++) {
        const place = allDestinations[i];
        await delay(1100); 
        
        try {
          const queryParts = [place];
          if (originState) queryParts.push(originState);
          queryParts.push("Brasil");
          
          const q = encodeURIComponent(queryParts.join(", "));
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&countrycodes=br&limit=1`);
          const data = await res.json();
          if (data && data.length > 0) {
            coords.push({ lon: parseFloat(data[0].lon), lat: parseFloat(data[0].lat), name: place });
          }
        } catch (e) {
           console.warn("Failed to geocode", place);
        }
      }

      if (coords.length >= 2) {
        const coordsString = coords.map(c => `${c.lon},${c.lat}`).join(';');
        const tripRes = await fetch(`https://router.project-osrm.org/trip/v1/driving/${coordsString}?roundtrip=true&source=first`);
        if (tripRes.ok) {
           const tripData = await tripRes.json();
           if (tripData.code === "Ok" && tripData.trips && tripData.trips.length > 0) {
              const km = tripData.trips[0].distance / 1000;
              // Add a 10% margin as real-world routes (Google Maps) often have detours/traffic compared to optimal OSRM paths
              const adjustedKm = Math.round(km * 1.10);
              setVariables(p => ({ ...p, kmTotal: adjustedKm }));
              
              // Build Google Maps URL for visualization
              const originStr = `${variables.cidadeOrigem}${originState ? ' - ' + originState : ''}`;
              const gmOrigin = encodeURIComponent(originStr);
              const gmDestination = gmOrigin; // Round trip back to origin
              // Max waypoints for standard GMaps URL might be limited, but we add as many as we can
              const waypoints = extracted.cidades.slice(0, 9).map(c => encodeURIComponent(`${c}${originState ? ' - ' + originState : ''}`)).join('|');
              const url = `https://www.google.com/maps/dir/?api=1&origin=${gmOrigin}&destination=${gmDestination}&waypoints=${waypoints}`;
              setGoogleMapsUrl(url);
           } else {
              alert("Não foi possível processar a rota.");
           }
        }
      } else {
         alert("Não foi possível encontrar as coordenadas para as cidades listadas.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao calcular a rota.");
    } finally {
      setCalculatingRoute(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const data = await parseSpreadsheet(file);
      setExtracted(data);
    } catch (err) {
      alert("Erro ao importar planilha. Verifique o formato.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchDieselPrice = async () => {
    if (!variables.cidadeOrigem) return;
    setCalculatingDiesel(true);
    try {
      const price = await fetchDieselPrice(variables.cidadeOrigem);
      if (price !== null) {
        setVariables(p => ({ ...p, valorDieselAtual: price }));
      } else {
        alert("Não foi possível estimar o preço do diesel via IA. Tente manualmente ou verifique a conexão.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao buscar o preço do diesel.");
    } finally {
      setCalculatingDiesel(false);
    }
  };

  const calc = useMemo(() => {
    const d = variables.kmTotal / (settings.mediaKmLitro > 0 ? settings.mediaKmLitro : 1);
    const valorDieselBase = variables.valorDieselAtual !== undefined ? variables.valorDieselAtual : settings.valorDiesel;
    const custoDiesel = d * valorDieselBase;
    const custoPernoite = variables.qtdPernoites * (settings.pernoiteMotorista + settings.pernoiteAjudante);
    const custoPneu = variables.kmTotal * settings.custoPneuKm;
    const custoDepreciacao = variables.kmTotal * settings.custoDepreciacaoKm;
    const custoManutencao = variables.kmTotal * settings.custoManutencaoKm;
    const custoSeguroRef = variables.kmTotal * settings.custoSeguroRastreadorKm;
    const custoAdminRef = variables.kmTotal * settings.custoAdminKm;
    
    const custoImpostos = variables.valorFrete * ((settings.impostoPisCofins || 0) / 100);
    
    const custoTotal = 
      custoDiesel + 
      custoPernoite + 
      custoPneu + 
      custoDepreciacao + 
      custoManutencao + 
      custoSeguroRef + 
      custoAdminRef + 
      custoImpostos + 
      variables.pedagio + 
      variables.descarga + 
      variables.outrosCustos;
      
    const lucro = variables.valorFrete - custoTotal;
    const margem = variables.valorFrete > 0 ? (lucro / variables.valorFrete) * 100 : 0;
    
    let status: RouteCalculations['status'] = "INVIÁVEL";
    if (lucro < 0) status = "PREJUÍZO";
    else if (margem > 25) status = "VIÁVEL";
    else if (margem >= 10) status = "ATENÇÃO";

    return { 
      custoDiesel, custoPernoite, custoPneu, custoDepreciacao, custoManutencao, 
      custoSeguroRef, custoAdminRef, custoImpostos, custoTotal, lucro, margem, status 
    };
  }, [settings, variables]);

  const updateVar = (key: keyof RouteVariables, val: string) => {
    const num = parseFloat(val);
    setVariables(p => ({ ...p, [key]: isNaN(num) ? 0 : num }));
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatNum = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="p-5 md:p-10 max-w-7xl mx-auto space-y-6 md:space-y-10">
      <header className="flex flex-col md:flex-row md:justify-between items-start md:items-end border-b border-zinc-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">Painel da Rota</h1>
          <p className="text-zinc-500 mt-2 text-sm md:text-base font-medium">Plataforma Inteligente de Viabilidade de Frete</p>
        </div>
        {!extracted && (
          <div className="relative w-full md:w-auto">
             <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
             <Button className="w-full md:w-auto gap-2 pointer-events-none bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl px-5 py-5 shadow-sm">
                <UploadCloud className="w-4 h-4" />
                {loading ? "Processando..." : "Importar Planilha"}
             </Button>
          </div>
        )}
      </header>

      {!extracted && !loading && (
        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }} initial="hidden" animate="show">
          <Card className="border-dashed border-2 border-zinc-200 bg-transparent mt-10 shadow-none rounded-3xl transition-colors hover:border-[#C5A059]/40 hover:bg-[#C5A059]/5 cursor-pointer relative overflow-hidden group">
            <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            <CardContent className="flex flex-col items-center justify-center py-32 text-center pointer-events-none relative z-0">
               <motion.div 
                 className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-zinc-100 mb-8 text-zinc-400 group-hover:scale-110 transition-transform duration-500"
               >
                  <FileSpreadsheet className="w-8 h-8 group-hover:text-[#C5A059] transition-colors duration-300" strokeWidth={1.5} />
               </motion.div>
               <h3 className="text-xl font-medium text-zinc-900 tracking-tight">Importe seu manifesto</h3>
               <p className="text-[15px] text-zinc-500 mt-3 mb-8 max-w-md">Arraste e solte ou clique para carregar o arquivo Excel/CSV com os dados de entrega para avaliação de rota.</p>
               <div className="inline-block relative">
                  <span className="inline-flex items-center gap-2 font-medium bg-white border border-zinc-200 rounded-xl px-6 py-2.5 text-zinc-700 shadow-sm group-hover:bg-[#C5A059] group-hover:text-white group-hover:border-[#C5A059] transition-all duration-300">
                    <UploadCloud className="w-4 h-4" />
                    Selecionar Arquivo
                  </span>
               </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col justify-center items-center py-32 space-y-4">
          <Activity className="w-8 h-8 animate-spin text-[#C5A059]" />
          <span className="text-zinc-500 font-medium animate-pulse">Analisando dados logísticos...</span>
        </motion.div>
      )}

      {extracted && (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 gap-4">
             <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto overflow-hidden">
                <div className="flex items-center gap-2 text-[12px] md:text-[13px] font-medium text-emerald-700 bg-emerald-50/80 py-1.5 px-3.5 rounded-full border border-emerald-200/50 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  Dados Importados com Sucesso
                </div>
                <div className="relative overflow-hidden flex items-center shrink-0">
                  <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <button className="text-[12px] md:text-[13px] font-medium text-zinc-400 hover:text-zinc-600 transition-colors pointer-events-none underline underline-offset-2">Substituir arquivo</button>
                </div>
             </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatsCard label="Peso Total (KG)" value={formatNum(extracted.pesoTotal)} icon={<Package className="w-4 h-4 text-[#C5A059]" strokeWidth={2} />} />
            <StatsCard label="Clientes Exportados" value={formatNum(extracted.clientes.length)} icon={<Users className="w-4 h-4 text-[#C5A059]" strokeWidth={2} />} />
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            
            {/* Lado Esquerdo - Detalhes da Rota e Variáveis */}
            <div className="xl:col-span-2 space-y-8">
              
              <motion.div variants={itemVariants}>
              <Card className="shadow-sm border-zinc-200/60 rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300">
                <CardHeader className="bg-white border-b border-zinc-100 py-5 px-6">
                  <CardTitle className="text-[15px] font-semibold text-zinc-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#C5A059]" />
                    Parâmetros da Rota
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-zinc-50/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2 lg:col-span-1">
                      <Label className="text-zinc-500 uppercase text-[11px] tracking-widest font-semibold">Cidade de Origem</Label>
                      <div className="flex gap-2">
                         <Input 
                            type="text" 
                            placeholder="Ex: São Paulo" 
                            className="bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10"
                            value={variables.cidadeOrigem || ''} 
                            onChange={e => setVariables(p => ({...p, cidadeOrigem: e.target.value}))}
                            onBlur={handleOriginComplete}
                            onKeyDown={e => e.key === 'Enter' && handleOriginComplete()}
                         />
                         <Button onClick={handleOriginComplete} disabled={calculatingRoute || !variables.cidadeOrigem} title="Calcular Rota Automática" variant="secondary" className="border border-zinc-200 bg-white hover:bg-zinc-50 shadow-sm rounded-xl h-10 w-10 p-0 shrink-0">
                           {calculatingRoute ? <Activity className="w-4 h-4 animate-spin text-zinc-600" /> : <MapPin className="w-4 h-4 text-zinc-600" />}
                         </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-500 uppercase text-[11px] tracking-widest font-semibold flex justify-between items-center">
                        <span>Valor Diesel S10 (R$/L) {calculatingDiesel && <span className="text-indigo-500 normal-case font-medium ml-2 tracking-normal">buscando IA...</span>}</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input 
                          type="number" 
                          placeholder={settings.valorDiesel.toString()} 
                          className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" 
                          value={variables.valorDieselAtual ?? ''} 
                          onChange={e => updateVar('valorDieselAtual', e.target.value)} 
                        />
                        <Button 
                          onClick={handleFetchDieselPrice} 
                          disabled={calculatingDiesel || !variables.cidadeOrigem} 
                          title="Estimar Preço via IA" 
                          variant="secondary" 
                          className="border border-[#C5A059]/30 bg-[#C5A059]/5 hover:bg-[#C5A059]/10 text-[#C5A059] shadow-sm rounded-xl h-10 w-10 p-0 shrink-0"
                        >
                           {calculatingDiesel ? <Activity className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 lg:col-span-1">
                      <Label className="text-zinc-500 uppercase text-[11px] tracking-widest font-semibold flex items-center justify-between">
                        <span>Quilometragem (KM) {calculatingRoute && <span className="text-indigo-500 normal-case font-medium ml-2 tracking-normal">calculando...</span>}</span>
                        {googleMapsUrl && (
                          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-[#C5A059] hover:text-[#B38D46] normal-case tracking-normal flex items-center gap-1 transition-colors">
                            Ver no mapa <ChevronRight className="w-3 h-3" />
                          </a>
                        )}
                      </Label>
                      <Input type="number" placeholder="0" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={variables.kmTotal || ''} onChange={e => updateVar('kmTotal', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-500 uppercase text-[11px] tracking-widest font-semibold">Valor Negociado Frete</Label>
                      <Input type="number" placeholder="0" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={variables.valorFrete || ''} onChange={e => updateVar('valorFrete', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-500 uppercase text-[11px] tracking-widest font-semibold">
                        Nº de Pernoites
                        <span className="text-zinc-400 normal-case font-medium ml-1 tracking-normal">({formatCurrency(settings.pernoiteMotorista + settings.pernoiteAjudante)}/un)</span>
                      </Label>
                      <Input type="number" placeholder="0" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={variables.qtdPernoites || ''} onChange={e => updateVar('qtdPernoites', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-500 uppercase text-[11px] tracking-widest font-semibold">Pedágio</Label>
                      <Input type="number" placeholder="0" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={variables.pedagio || ''} onChange={e => updateVar('pedagio', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-500 uppercase text-[11px] tracking-widest font-semibold">Descarga / Chapas</Label>
                      <Input type="number" placeholder="0" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={variables.descarga || ''} onChange={e => updateVar('descarga', e.target.value)} />
                    </div>
                    <div className="space-y-2 lg:col-span-3">
                      <Label className="text-zinc-500 uppercase text-[11px] tracking-widest font-semibold">Outros Custos Imprevistos</Label>
                      <Input type="number" placeholder="0" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={variables.outrosCustos || ''} onChange={e => updateVar('outrosCustos', e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
              <Card className="shadow-sm border-zinc-200/60 rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300">
                <CardHeader className="bg-white border-b border-zinc-100 py-5 px-6">
                  <CardTitle className="text-[14px] font-semibold text-zinc-900">Materiais Transportados</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table className="min-w-[400px]">
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow className="border-b border-zinc-100">
                        <TableHead className="font-semibold text-[11px] tracking-wider text-zinc-500 uppercase py-3.5 px-6">Descrição</TableHead>
                        <TableHead className="text-right font-semibold text-[11px] tracking-wider text-zinc-500 uppercase py-3.5 px-6">Qtd</TableHead>
                        <TableHead className="text-right font-semibold text-[11px] tracking-wider text-zinc-500 uppercase py-3.5 px-6">Peso (KG)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extracted.materiais.slice(0, 10).map((m, i) => (
                        <TableRow key={i} className="border-b border-zinc-50">
                          <TableCell className="font-medium text-zinc-700 px-6">{m.descricao}</TableCell>
                          <TableCell className="text-right tabular-nums px-6">{formatNum(m.quantidade)}</TableCell>
                          <TableCell className="text-right tabular-nums px-6">{formatNum(m.peso)}</TableCell>
                        </TableRow>
                      ))}
                      {extracted.materiais.length > 10 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-[12px] font-medium text-zinc-400 py-4 bg-zinc-50/30">
                            + {extracted.materiais.length - 10} item(ns)...
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <Card className="shadow-sm border-zinc-200/60 rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300">
                   <CardHeader className="py-4 px-6 border-b border-zinc-100 bg-white">
                     <CardTitle className="text-[14px] font-semibold text-zinc-900">Cidades Atendidas</CardTitle>
                   </CardHeader>
                   <CardContent className="p-0">
                     <div className="max-h-60 overflow-y-auto bg-zinc-50/30">
                        <ul className="divide-y divide-zinc-100">
                          {extracted.cidades.map((c, i) => (
                            <li key={i} className="px-6 py-3.5 text-[13px] flex items-center justify-between text-zinc-700">
                              <span className="font-medium">{c}</span>
                            </li>
                          ))}
                        </ul>
                     </div>
                   </CardContent>
                </Card>
                
                <Card className="shadow-sm border-zinc-200/60 rounded-2xl overflow-hidden">
                   <CardHeader className="py-4 px-6 border-b border-zinc-100 bg-white">
                     <CardTitle className="text-[14px] font-semibold text-zinc-900">Principais Clientes</CardTitle>
                   </CardHeader>
                   <CardContent className="p-0">
                     <div className="max-h-60 overflow-y-auto bg-zinc-50/30">
                        <ul className="divide-y divide-zinc-100">
                          {extracted.clientes.slice(0, 50).map((c, i) => (
                            <li key={i} className="px-6 py-3.5 text-[13px] truncate text-zinc-700 font-medium" title={c}>{c}</li>
                          ))}
                        </ul>
                     </div>
                   </CardContent>
                </Card>
              </motion.div>

            </div>

            {/* Lado Direito - Resultados Financeiros */}
            <motion.div variants={itemVariants} className="xl:col-span-1">
              <Card className="sticky top-10 border-[#C5A059]/20 shadow-[0_8px_30px_rgb(197,160,89,0.08)] rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_40px_rgb(197,160,89,0.12)]">
                <CardHeader className="bg-white px-7 py-8 border-b border-zinc-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/5 rounded-bl-full -z-0"></div>
                  <div className="flex justify-between items-center mb-6 relative z-10">
                    <CardTitle className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.2em] relative pl-3">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3 bg-[#C5A059] rounded-full"></span>
                      Viabilidade
                    </CardTitle>
                    <Badge variant={
                      calc.status === 'VIÁVEL' ? 'success' : 
                      calc.status === 'ATENÇÃO' ? 'warning' : 
                      'destructive'
                    } className="text-[10px] shadow-none uppercase font-bold tracking-wider px-2.5 py-1 rounded-full">
                      {calc.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-zinc-500 font-medium text-[12px] uppercase tracking-wide">Lucro Projetado (R$)</p>
                    <p className={`text-5xl font-semibold tracking-tighter ${calc.lucro < 0 ? 'text-red-500' : 'text-[#C5A059]'}`}>
                      {formatCurrency(calc.lucro)}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-7 bg-zinc-50/50 space-y-7">
                  
                  <div className="flex justify-between items-end border-b border-zinc-200/80 pb-6">
                    <div className="space-y-1.5">
                      <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold">Margem Líq.</span>
                      <p className="text-2xl font-semibold tracking-tight text-zinc-900 leading-none">{calc.margem.toFixed(1)}%</p>
                    </div>
                    <div className="text-right space-y-1.5">
                      <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold">Custo Operacional</span>
                      <p className="text-xl font-medium text-zinc-700 leading-none tabular-nums">{formatCurrency(calc.custoTotal)}</p>
                    </div>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.2em] mb-5">Abertura de Custos</h4>
                    
                    <CostRow label="Combustível" value={calc.custoDiesel} />
                    <CostRow label="Pernoites" value={calc.custoPernoite} />
                    <CostRow label="Desgaste/Pneu" value={calc.custoPneu} />
                    <CostRow label="Depreciação" value={calc.custoDepreciacao} />
                    <CostRow label="Manutenção" value={calc.custoManutencao} />
                    {calc.custoImpostos > 0 && <CostRow label="Impostos (P/C)" value={calc.custoImpostos} />}
                    <CostRow label={`Taxas & Seguros`} value={calc.custoSeguroRef + calc.custoAdminRef + variables.pedagio} />
                    {(variables.descarga > 0 || variables.outrosCustos > 0) && <CostRow label={`Gastos Extras`} value={variables.descarga + variables.outrosCustos} />}
                  </div>

                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center text-[13px]">
      <span className="text-zinc-500 font-medium">{label}</span>
      <span className="font-mono font-medium text-zinc-900 tabular-nums">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}</span>
    </div>
  );
}

function StatsCard({ label, value, icon }: { label: string; value: string | number, icon: React.ReactNode }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="h-full">
      <Card className="shadow-sm border-zinc-200/60 rounded-2xl h-full">
        <CardContent className="p-6 flex flex-col justify-between h-full bg-white rounded-2xl">
          <div className="flex justify-between items-start mb-5">
             <h3 className="text-[13px] font-medium text-zinc-500">{label}</h3>
             <div className="p-2.5 bg-[#C5A059]/10 rounded-xl text-[#C5A059] shadow-inner">{icon}</div>
          </div>
          <p className="text-3xl font-semibold tracking-tighter text-zinc-900 font-mono tabular-nums">{value}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------
// Settings Dashboard View
// ---------------------------------------------------------

function SettingsDashboard() {
  const { settings, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<FixedCosts>(settings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (key: keyof FixedCosts, value: string) => {
    const num = parseFloat(value.replace(/,/g, '.'));
    setLocalSettings(prev => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
  };

  return (
    <div className="p-5 md:p-10 max-w-4xl mx-auto space-y-6 md:space-y-8">
      <header className="border-b border-zinc-200 pb-5">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">Custos Fixos da Frota</h1>
        <p className="text-zinc-500 mt-2 text-sm md:text-[15px] font-medium">Configure os valores padrão por KM rodado e taxas diárias. Eles serão gravados para cálculos futuros.</p>
      </header>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className="shadow-sm border-zinc-200/60 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="border-b border-zinc-100 bg-white py-5 px-6">
          <CardTitle className="text-[15px] font-semibold text-zinc-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#C5A059]" />
            Operação, Combustível e Impostos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 bg-zinc-50/30">
          <div className="space-y-2">
            <Label className="text-zinc-500 uppercase tracking-widest text-[11px] font-semibold">Valor Diesel Atual (R$/L)</Label>
            <Input type="number" step="0.01" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={localSettings.valorDiesel} onChange={e => handleChange('valorDiesel', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-500 uppercase tracking-widest text-[11px] font-semibold">Média do Veículo (KM/L)</Label>
            <Input type="number" step="0.1" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={localSettings.mediaKmLitro} onChange={e => handleChange('mediaKmLitro', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-500 uppercase tracking-widest text-[11px] font-semibold">PIS/COFINS (%)</Label>
            <Input type="number" step="0.01" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={localSettings.impostoPisCofins} onChange={e => handleChange('impostoPisCofins', e.target.value)} />
          </div>
        </CardContent>
      </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="shadow-sm border-zinc-200/60 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="border-b border-zinc-100 bg-white py-5 px-6">
          <CardTitle className="text-[15px] font-semibold text-zinc-900 flex items-center gap-2">
             <SettingsIcon className="w-4 h-4 text-[#C5A059]" />
             Custos de Desgaste (R$ por KM)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-zinc-50/30">
          <div className="space-y-2">
            <Label className="text-zinc-500 uppercase tracking-widest text-[11px] font-semibold">Pneu</Label>
            <Input type="number" step="0.01" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={localSettings.custoPneuKm} onChange={e => handleChange('custoPneuKm', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-500 uppercase tracking-widest text-[11px] font-semibold">Depreciação</Label>
            <Input type="number" step="0.01" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={localSettings.custoDepreciacaoKm} onChange={e => handleChange('custoDepreciacaoKm', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-500 uppercase tracking-widest text-[11px] font-semibold">Manutenção</Label>
            <Input type="number" step="0.01" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={localSettings.custoManutencaoKm} onChange={e => handleChange('custoManutencaoKm', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-500 uppercase tracking-widest text-[11px] font-semibold">Seguro / Rastreador</Label>
            <Input type="number" step="0.01" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={localSettings.custoSeguroRastreadorKm} onChange={e => handleChange('custoSeguroRastreadorKm', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-500 uppercase tracking-widest text-[11px] font-semibold">Custo Administrativo</Label>
            <Input type="number" step="0.01" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={localSettings.custoAdminKm} onChange={e => handleChange('custoAdminKm', e.target.value)} />
          </div>
        </CardContent>
      </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="shadow-sm border-zinc-200/60 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="border-b border-zinc-100 bg-white py-5 px-6">
          <CardTitle className="text-[15px] font-semibold text-zinc-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#C5A059]" />
            Tripulação (Pernoites)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-zinc-50/30">
          <div className="space-y-2">
            <Label className="text-zinc-500 uppercase tracking-widest text-[11px] font-semibold">Pernoite Motorista</Label>
            <Input type="number" step="1" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={localSettings.pernoiteMotorista} onChange={e => handleChange('pernoiteMotorista', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-500 uppercase tracking-widest text-[11px] font-semibold">Pernoite Ajudante</Label>
            <Input type="number" step="1" className="font-mono bg-white border-zinc-200 focus:ring-1 focus:ring-indigo-500 shadow-sm rounded-xl h-10" value={localSettings.pernoiteAjudante} onChange={e => handleChange('pernoiteAjudante', e.target.value)} />
          </div>
        </CardContent>
      </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex justify-end gap-4 mt-8">
        <AnimatePresence>
          {saved && (
            <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="text-[#C5A059] self-center text-[14px] font-medium">
              Configurações salvas com sucesso!
            </motion.span>
          )}
        </AnimatePresence>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button onClick={handleSave} className="gap-2 px-8 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl shadow-sm h-11">
            Salvar Configurações
          </Button>
        </motion.div>
      </motion.div>

    </div>
  );
}

export default App;
