"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { supabase } from "@/lib/supabase/client";

interface PeriodData {
  id_periodo: number;
  mes: string;
  anio: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  cerrado: boolean;
  colaboradores: number;
  totalIngresos: number;
  totalDescuentos: number;
  liquidoRecibir: number;
}

interface MonthGroup {
  mes: string;
  anio: number;
  ingresos: number;
  descuentos: number;
  liquido: number;
  colaboradores: number;
  periods: any[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeEmployeesCount, setActiveEmployeesCount] = useState(0);
  const [periodosData, setPeriodosData] = useState<PeriodData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [metrics, setMetrics] = useState({
    totalPlanilla: 0,
    deducciones: 0,
    pendiente: 0,
    percentChange: 0,
    currentMonthLabel: "Mes Actual",
    isPositiveChange: true
  });
  
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch active employees count
        const { data: empData, error: empErr } = await supabase
          .from("empleado")
          .select("id_empleado")
          .eq("activo", true);
        if (empErr) throw empErr;
        const empCount = empData?.length || 0;
        setActiveEmployeesCount(empCount);

        // 2. Fetch periods and their summaries
        const { data: pData, error: pErr } = await supabase
          .from("periodo_pago")
          .select(`
            id_periodo,
            mes,
            anio,
            tipo,
            fecha_inicio,
            fecha_fin,
            cerrado,
            constancia_pago (
              id_constancia,
              anulada,
              resumen_constancia (
                total_ingresos,
                total_descuentos,
                liquido_recibir
              )
            )
          `)
          .order("anio", { ascending: false })
          .order("fecha_inicio", { ascending: false });
        
        if (pErr) throw pErr;

        // Process periods and calculate metrics
        const processedPeriods: PeriodData[] = (pData || []).map((p: any) => {
          const nonAnuladas = p.constancia_pago?.filter((c: any) => !c.anulada) || [];
          let totalIngresos = 0;
          let totalDescuentos = 0;
          let liquidoRecibir = 0;

          nonAnuladas.forEach((c: any) => {
            const res = Array.isArray(c.resumen_constancia) 
              ? c.resumen_constancia[0] 
              : c.resumen_constancia;
            if (res) {
              totalIngresos += parseFloat(res.total_ingresos || 0);
              totalDescuentos += parseFloat(res.total_descuentos || 0);
              liquidoRecibir += parseFloat(res.liquido_recibir || 0);
            }
          });

          return {
            id_periodo: p.id_periodo,
            mes: p.mes,
            anio: p.anio,
            tipo: p.tipo,
            fecha_inicio: p.fecha_inicio,
            fecha_fin: p.fecha_fin,
            cerrado: p.cerrado,
            colaboradores: nonAnuladas.length,
            totalIngresos,
            totalDescuentos,
            liquidoRecibir
          };
        });

        setPeriodosData(processedPeriods);

        // Group by Month-Year
        const monthGroups: Record<string, MonthGroup> = {};

        processedPeriods.forEach((p) => {
          const key = `${p.anio}-${p.mes}`;
          if (!monthGroups[key]) {
            monthGroups[key] = {
              mes: p.mes,
              anio: p.anio,
              ingresos: 0,
              descuentos: 0,
              liquido: 0,
              colaboradores: 0,
              periods: []
            };
          }
          monthGroups[key].ingresos += p.totalIngresos;
          monthGroups[key].descuentos += p.totalDescuentos;
          monthGroups[key].liquido += p.liquidoRecibir;
          monthGroups[key].colaboradores = Math.max(monthGroups[key].colaboradores, p.colaboradores);
          monthGroups[key].periods.push(p);
        });

        const MONTHS_MAP: Record<string, number> = {
          "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6,
          "Julio": 7, "Agosto": 8, "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12
        };

        const sortedGroups = Object.values(monthGroups).sort((a, b) => {
          if (a.anio !== b.anio) return b.anio - a.anio;
          const monthA = MONTHS_MAP[a.mes] || 0;
          const monthB = MONTHS_MAP[b.mes] || 0;
          return monthB - monthA;
        });

        // Find latest month group that has data
        const latestMonth = sortedGroups.find(g => g.ingresos > 0 || g.periods.some(p => p.colaboradores > 0));
        let totalPlanilla = 0;
        let deducciones = 0;
        let percentChange = 0;
        let currentMonthLabel = "Mes Actual";
        let isPositiveChange = true;

        if (latestMonth) {
          totalPlanilla = latestMonth.ingresos;
          deducciones = latestMonth.descuentos;
          currentMonthLabel = `${latestMonth.mes} ${latestMonth.anio}`;

          // Find the month group prior to the latest month group for comparison
          const index = sortedGroups.indexOf(latestMonth);
          const prevMonth = sortedGroups.slice(index + 1).find(g => g.ingresos > 0);
          if (prevMonth && prevMonth.ingresos > 0) {
            percentChange = ((latestMonth.ingresos - prevMonth.ingresos) / prevMonth.ingresos) * 100;
            isPositiveChange = percentChange >= 0;
          }
        }

        // Pendiente de pago: sum of liquidoRecibir of all open periods (cerrado === false)
        const pendiente = processedPeriods
          .filter((p) => !p.cerrado)
          .reduce((sum, p) => sum + p.liquidoRecibir, 0);

        setMetrics({
          totalPlanilla,
          deducciones,
          pendiente,
          percentChange,
          currentMonthLabel,
          isPositiveChange
        });

        // 3. Build Chart Data for the latest year containing data, or fallback to current year
        const latestYear = latestMonth ? latestMonth.anio : new Date().getFullYear();
        const shortMonths = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
        const fullMonths = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        const tempChartData = shortMonths.map((label, idx) => {
          const fullname = fullMonths[idx];
          const key = `${latestYear}-${fullname}`;
          const group = monthGroups[key] || { ingresos: 0, descuentos: 0, liquido: 0 };
          return {
            label,
            fullname: `${fullname} ${latestYear}`,
            ingresos: group.ingresos,
            descuentos: group.descuentos,
            liquido: group.liquido,
            ingresosPct: 0,
            descuentosPct: 0,
            isLatest: latestMonth && latestMonth.mes === fullname && latestMonth.anio === latestYear
          };
        });

        // Find max ingresos in the selected year to scale heights
        const maxIngresos = Math.max(...tempChartData.map(d => d.ingresos), 1); // avoid division by 0
        tempChartData.forEach(d => {
          d.ingresosPct = (d.ingresos / maxIngresos) * 100;
          d.descuentosPct = (d.descuentos / maxIngresos) * 100;
        });

        setChartData(tempChartData);

      } catch (err: any) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handlePeriodAction = (periodId: number, cerrado: boolean) => {
    localStorage.setItem("selected_period_id", periodId.toString());
    if (cerrado) {
      router.push("/constancias");
    } else {
      router.push("/planilla/registro-planilla");
    }
  };

  // Filter periods table by search query
  const filteredPeriods = periodosData.filter(p => {
    const term = searchQuery.toLowerCase();
    return (
      p.mes.toLowerCase().includes(term) ||
      p.anio.toString().includes(term) ||
      p.tipo.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar activePage="dashboard" />
        <main className="flex-1 md:ml-64 flex flex-col min-w-0 bg-surface-container-lowest justify-center items-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-body-base text-on-surface-variant font-medium">Cargando información general...</p>
          </div>
        </main>
      </div>
    );
  }

  const latestYearLabel = chartData.length > 0 ? chartData[0].fullname.split(" ")[1] : "2026";

  return (
    <div className="flex min-h-screen">
      <Sidebar activePage="dashboard" />
      {/* Main Content Canvas */}
      <main className="flex-1 md:ml-64 flex flex-col min-w-0">
        {/* TopAppBar */}
        <header className="flex justify-between items-center w-full px-section-gap py-4 z-30 sticky top-0 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant">
          <div className="flex items-center gap-4 flex-1 pl-12 md:pl-0">
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" data-icon="search">search</span>
              <input 
                className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-body-base focus:ring-2 focus:ring-primary focus:outline-none" 
                placeholder="Buscar períodos o registros..." 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 cursor-pointer hover:bg-surface-variant/20 p-1 pr-3 rounded-full transition-all">
              <span className="text-right hidden sm:block">
                <p className="font-body-base font-bold text-on-surface">Admin CRESGO</p>
                <p className="text-[10px] tracking-wider text-on-surface-variant/80 uppercase font-semibold">SUPERUSER</p>
              </span>
              <div className="w-10 h-10 rounded-2xl border border-outline-variant overflow-hidden flex items-center justify-center bg-primary-container">
                <img 
                  className="w-full h-full object-cover" 
                  alt="User profile" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVJ0KDkIXLNnkhPFS4qNH96n3xzyNAWXREAFRTkVhK8RaiMd8n5nrXANqdRDJ0oMpWhSettb5FMuXYv___VBoazd5qH1dDL74yJLNcBmFku64jEy5t_W5jflR0Rj3NRyCLQh8fscItEEmalW1cbrLvfy76zHQ9rD1GYK44NrlNVRybvY9mT-lsXyp_WMjbLDsFEEpMWtZN7AzWYmc9X4fjO1yU0eFgSQaqaEUchngFoF0lZmE3ZAUEBpp8UzhKOTyNIPdNpel7O2jt"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-4 md:p-section-gap space-y-gutter">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-h1 text-h1 text-on-surface">Resumen de Planilla</h2>
              <p className="text-body-base text-on-surface-variant">Bienvenido de nuevo. Aquí tienes un vistazo general del estado actual.</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {/* Total Planilla Card */}
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-primary hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-label-caps text-on-surface-variant uppercase font-medium">Total Planilla ({metrics.currentMonthLabel})</span>
                <span className="material-symbols-outlined text-primary" data-icon="payments">payments</span>
              </div>
              <div className="flex flex-col">
                <span className="text-h1 font-h1 text-on-surface">Q {metrics.totalPlanilla.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`text-body-sm font-medium flex items-center gap-1 mt-1 ${metrics.isPositiveChange ? "text-primary" : "text-tertiary"}`}>
                  <span className="material-symbols-outlined text-[16px]" data-icon={metrics.isPositiveChange ? "trending_up" : "trending_down"}>
                    {metrics.isPositiveChange ? "trending_up" : "trending_down"}
                  </span>
                  {metrics.percentChange > 0 ? "+" : ""}{metrics.percentChange.toFixed(1)}% vs mes anterior
                </span>
              </div>
            </div>

            {/* Colaboradores Activos Card */}
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-primary hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-label-caps text-on-surface-variant uppercase font-medium">Colaboradores Activos</span>
                <span className="material-symbols-outlined text-primary" data-icon="badge">badge</span>
              </div>
              <div className="flex flex-col">
                <span className="text-h1 font-h1 text-on-surface">{activeEmployeesCount}</span>
                <span className="text-body-sm text-on-surface-variant opacity-70 mt-1">Personal contratado</span>
              </div>
            </div>

            {/* Deducciones Totales Card */}
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-primary hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-label-caps text-on-surface-variant uppercase font-medium">Deducciones Totales</span>
                <span className="material-symbols-outlined text-tertiary" data-icon="account_balance_wallet">account_balance_wallet</span>
              </div>
              <div className="flex flex-col">
                <span className="text-h1 font-h1 text-on-surface">Q {metrics.deducciones.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-body-sm text-on-surface-variant opacity-70 mt-1">IGSS, ISR y Otros</span>
              </div>
            </div>

            {/* Pendiente de Pago Card */}
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-primary hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-label-caps text-on-surface-variant uppercase font-medium">Pendiente de Pago</span>
                <span className="material-symbols-outlined text-secondary" data-icon="schedule">schedule</span>
              </div>
              <div className="flex flex-col">
                <span className="text-h1 font-h1 text-on-surface">Q {metrics.pendiente.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`text-body-sm font-medium mt-1 ${metrics.pendiente > 0 ? "text-tertiary" : "text-primary"}`}>
                  {metrics.pendiente > 0 ? "Periodos en proceso" : "Todo al día"}
                </span>
              </div>
            </div>
          </div>

          {/* Main Dashboard Layout */}
          <div className="grid grid-cols-1 gap-gutter">
            {/* Chart Section */}
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm relative">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-h3 text-h3 text-on-surface">Histórico de Pagos ({latestYearLabel})</h3>
                <div className="flex gap-4">
                  <span className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                    <span className="w-3 h-3 bg-primary rounded-full"></span> Ingresos
                  </span>
                  <span className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                    <span className="w-3 h-3 bg-tertiary rounded-full"></span> Deducciones
                  </span>
                </div>
              </div>
              
              {/* Simulated Bar Chart with Tooltips */}
              <div className="h-72 flex items-end justify-between gap-4 px-4 pb-2 border-b border-outline-variant">
                {chartData.map((m, idx) => (
                  <div key={idx} className="flex-1 flex flex-col justify-end items-center gap-2 group relative h-full">
                    {/* Tooltip visible on hover */}
                    <div className="absolute bottom-[230px] left-1/2 -translate-x-1/2 bg-surface-container-highest/95 border border-outline-variant text-on-surface text-[11px] p-3 rounded-lg shadow-xl hidden group-hover:block z-50 pointer-events-none min-w-[150px] backdrop-blur-md">
                      <p className="font-bold text-center mb-1.5 border-b border-outline-variant/30 pb-1">{m.fullname}</p>
                      <div className="space-y-1">
                        <p className="text-primary flex justify-between gap-3">
                          <span>Ingresos:</span> 
                          <span className="font-semibold">Q{m.ingresos.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </p>
                        <p className="text-tertiary flex justify-between gap-3">
                          <span>Descuentos:</span> 
                          <span className="font-semibold">Q{m.descuentos.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </p>
                        <div className="border-t border-outline-variant/30 pt-1 mt-1">
                          <p className="font-bold text-on-surface flex justify-between gap-3">
                            <span>Líquido:</span> 
                            <span>Q{m.liquido.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bars Container */}
                    <div className="w-full flex items-end gap-1.5 h-[180px]">
                      {/* Ingresos bar */}
                      <div 
                        style={{ height: m.ingresos > 0 ? `${Math.max(m.ingresosPct, 3)}%` : "0%" }}
                        className="w-1/2 bg-primary/20 rounded-t group-hover:bg-primary transition-all duration-300 cursor-pointer"
                      ></div>
                      {/* Deducciones bar */}
                      <div 
                        style={{ height: m.descuentos > 0 ? `${Math.max(m.descuentosPct, 3)}%` : "0%" }}
                        className="w-1/2 bg-tertiary/20 rounded-t group-hover:bg-tertiary transition-all duration-300 cursor-pointer"
                      ></div>
                    </div>
                    {/* Month Label */}
                    <span className={`text-label-caps mt-1 text-[11px] ${m.isLatest ? "font-bold text-primary" : "text-on-surface-variant"}`}>
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="font-h3 text-h3 text-on-surface">Últimos Periodos de Planilla</h3>
              <button 
                onClick={() => router.push("/planilla/registro-planilla")} 
                className="text-primary font-semibold text-body-sm hover:underline cursor-pointer"
              >
                Ver todo
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low text-label-caps text-on-surface-variant">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Mes / Año</th>
                    <th className="px-6 py-3 font-semibold">Tipo</th>
                    <th className="px-6 py-3 font-semibold">Colaboradores</th>
                    <th className="px-6 py-3 font-semibold text-right">Total Devengado</th>
                    <th className="px-6 py-3 font-semibold">Estado</th>
                    <th className="px-6 py-3 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant text-body-base">
                  {filteredPeriods.slice(0, 5).map((p) => (
                    <tr key={p.id_periodo} className="hover:bg-surface-container/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-on-surface">{p.mes} {p.anio}</td>
                      <td className="px-6 py-4 capitalize">{p.tipo.toLowerCase()}</td>
                      <td className="px-6 py-4">{p.colaboradores}</td>
                      <td className="px-6 py-4 text-right font-data-tabular">
                        Q {p.totalIngresos.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        {p.cerrado ? (
                          <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[12px] font-bold">CERRADO</span>
                        ) : (
                          <span className="px-2 py-1 rounded bg-surface-variant text-on-surface-variant text-[12px] font-bold">PROCESO</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handlePeriodAction(p.id_periodo, p.cerrado)} 
                          className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer transition-colors"
                          data-icon={p.cerrado ? "visibility" : "edit"}
                          title={p.cerrado ? "Ver constancias" : "Editar planilla"}
                        >
                          {p.cerrado ? "visibility" : "edit"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPeriods.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                        No se encontraron periodos de planilla.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Info */}
          <footer className="mt-auto px-section-gap py-8 text-center text-body-sm text-on-surface-variant opacity-60">
            <p>© 2024 Importaciones CRESGO S.A. - Control Interno de Planillas v2.4.0</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
