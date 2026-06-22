"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { supabase } from "@/lib/supabase/client";

interface PeriodoPago {
  id_periodo: number;
  mes: string;
  anio: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  cerrado: boolean;
  id_empresa: number;
  empresa: {
    nombre: string;
  } | null;
}

interface AsuetoFestivo {
  id_asueto: number;
  id_empresa: number;
  nombre: string;
  tipo: string;
  fecha: string;
  paga_recargo: boolean;
}

interface Empresa {
  id_empresa: number;
  nombre: string;
}

const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const FULL_MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function RegistroPeriodos() {
  const [activeTab, setActiveTab] = useState<"periods" | "holidays">("periods");
  const [periodos, setPeriodos] = useState<PeriodoPago[]>([]);
  const [holidays, setHolidays] = useState<AsuetoFestivo[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modales
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);

  // Modales de confirmación
  const [periodToClose, setPeriodToClose] = useState<PeriodoPago | null>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<AsuetoFestivo | null>(null);

  // Formulario Período
  const [formPeriod, setFormPeriod] = useState({
    id_empresa: 1,
    mes: "Enero",
    anio: new Date().getFullYear(),
    tipo: "MENSUAL",
    fecha_inicio: "",
    fecha_fin: ""
  });

  const getErrorMessage = (err: unknown): string => {
    if (err && typeof err === "object" && "message" in err) {
      return String((err as { message: unknown }).message);
    }
    if (err instanceof Error) {
      return err.message;
    }
    return String(err);
  };

  // Formulario Asueto
  const [formHoliday, setFormHoliday] = useState({
    id_empresa: 1,
    nombre: "",
    tipo: "Feriado Nacional",
    fecha: "",
    paga_recargo: true
  });

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Cargar períodos
      const { data: pData, error: pErr } = await supabase
        .from("periodo_pago")
        .select("*, empresa(nombre)")
        .order("id_periodo", { ascending: false });

      if (pErr) throw pErr;
      setPeriodos(pData || []);

      // 2. Cargar asuetos
      const { data: hData, error: hErr } = await supabase
        .from("asueto_festivo")
        .select("*")
        .order("fecha", { ascending: true });

      if (hErr && hErr.code !== "PGRST205") { // Omitir si la tabla no está creada aún para evitar caídas
        throw hErr;
      }
      setHolidays(hData || []);

      // 3. Cargar empresas
      const { data: empData, error: empErr } = await supabase
        .from("empresa")
        .select("id_empresa, nombre");
      
      if (empErr) throw empErr;
      setEmpresas(empData || []);
      if (empData && empData.length > 0) {
        setFormPeriod(prev => ({ ...prev, id_empresa: empData[0].id_empresa }));
        setFormHoliday(prev => ({ ...prev, id_empresa: empData[0].id_empresa }));
      }
      } catch (err: unknown) {
        const errorMsg = getErrorMessage(err);
        console.error("Error al cargar datos:", err);
        setStatusMessage({ type: "error", text: "Error de base de datos: " + errorMsg });
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  // Guardar nuevo período
  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPeriod.fecha_inicio || !formPeriod.fecha_fin) {
      alert("Por favor complete todas las fechas.");
      return;
    }

    try {
      const { error } = await supabase.rpc("fn_periodo_pago_insert", {
        p_id_empresa: formPeriod.id_empresa,
        p_mes: formPeriod.mes,
        p_anio: formPeriod.anio,
        p_tipo: formPeriod.tipo,
        p_fecha_inicio: formPeriod.fecha_inicio,
        p_fecha_fin: formPeriod.fecha_fin
      });

      if (error) throw error;

      setStatusMessage({ type: "success", text: "Período creado con éxito." });
      setShowPeriodModal(false);
      // Reset form
      setFormPeriod(prev => ({
        ...prev,
        fecha_inicio: "",
        fecha_fin: ""
      }));
      loadData();
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err);
      console.error(err);
      setStatusMessage({ type: "error", text: "Error al crear período: " + errorMsg });
    }
  };

  // Guardar nuevo asueto
  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHoliday.nombre || !formHoliday.fecha) {
      alert("Por favor complete todos los campos.");
      return;
    }

    try {
      const { error } = await supabase
        .from("asueto_festivo")
        .insert({
          id_empresa: formHoliday.id_empresa,
          nombre: formHoliday.nombre,
          tipo: formHoliday.tipo,
          fecha: formHoliday.fecha,
          paga_recargo: formHoliday.paga_recargo
        });

      if (error) throw error;

      setStatusMessage({ type: "success", text: "Asueto/Festivo creado con éxito." });
      setShowHolidayModal(false);
      // Reset form
      setFormHoliday(prev => ({
        ...prev,
        nombre: "",
        fecha: "",
        paga_recargo: true
      }));
      loadData();
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err);
      console.error(err);
      setStatusMessage({ type: "error", text: "Error al crear asueto: " + errorMsg });
    }
  };

  // Alternar recargo de un asueto
  const handleToggleHolidayRecargo = async (item: AsuetoFestivo) => {
    try {
      const newVal = !item.paga_recargo;
      const { error } = await supabase
        .from("asueto_festivo")
        .update({ paga_recargo: newVal })
        .eq("id_asueto", item.id_asueto);

      if (error) throw error;

      // Actualizar estado local inmediatamente
      setHolidays(prev => prev.map(h => h.id_asueto === item.id_asueto ? { ...h, paga_recargo: newVal } : h));
      setStatusMessage({ type: "success", text: "Estado de recargo actualizado." });
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err);
      console.error(err);
      setStatusMessage({ type: "error", text: "Error al actualizar recargo: " + errorMsg });
    }
  };

  // Eliminar un asueto (ejecución directa tras confirmación)
  const executeDeleteHoliday = async (id: number) => {
    try {
      const { error } = await supabase
        .from("asueto_festivo")
        .delete()
        .eq("id_asueto", id);

      if (error) throw error;

      setHolidays(prev => prev.filter(h => h.id_asueto !== id));
      setStatusMessage({ type: "success", text: "Asueto eliminado con éxito." });
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err);
      console.error(err);
      setStatusMessage({ type: "error", text: "Error al eliminar: " + errorMsg });
    }
  };

  // Cerrar un período de pago (ejecución directa tras confirmación)
  const executeClosePeriod = async (id: number, mes: string, anio: number, id_empresa: number) => {
    try {
      const { error } = await supabase.rpc("fn_cerrar_periodo", {
        p_id_periodo: id,
        p_id_empresa: id_empresa,
        p_usuario: "Administrador",
        p_forzar: 1
      });

      if (error) throw error;

      setStatusMessage({ type: "success", text: `El período ${mes} ${anio} ha sido cerrado correctamente.` });
      loadData();
    } catch (err: unknown) {
      let errorMsg = getErrorMessage(err);
      if (errorMsg.includes("Could not choose the best candidate function")) {
        errorMsg = "Duplicidad en base de datos. Por favor ejecute en Supabase: DROP FUNCTION IF EXISTS public.fn_cerrar_periodo(integer, integer, text, boolean);";
      }
      console.error(err);
      setStatusMessage({ type: "error", text: "Error al realizar el cierre: " + errorMsg });
    }
  };

  // Cálculos de resumen anual
  const periodosCerrados = periodos.filter(p => p.cerrado).length;
  const totalPeriodos = periodos.length;
  const periodosPendientes = periodos.filter(p => !p.cerrado).length;
  const totalFestivos = holidays.length;

  // Próximo cierre (periodo abierto con fecha_fin más cercana en el futuro)
  const openPeriodsSorted = [...periodos]
    .filter(p => !p.cerrado)
    .sort((a, b) => new Date(a.fecha_fin).getTime() - new Date(b.fecha_fin).getTime());
  
  const proximoCierre = openPeriodsSorted[0] || null;

  // Formateador de fecha simple DD/MM/YYYY sin desfasamiento de zona horaria
  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Formateador de fecha para los badges de asuetos
  const getDayAndMonth = (dateStr: string) => {
    if (!dateStr) return { day: "", month: "" };
    const parts = dateStr.split("-");
    if (parts.length !== 3) return { day: "", month: "" };
    const monthIndex = parseInt(parts[1]) - 1;
    return {
      day: parts[2],
      month: MONTHS_ES[monthIndex] || ""
    };
  };

  // Filtros aplicados
  const filteredPeriodos = periodos.filter(p => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      p.mes.toLowerCase().includes(term) ||
      p.anio.toString().includes(term) ||
      p.tipo.toLowerCase().includes(term)
    );
  });

  const filteredHolidays = holidays.filter(h => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      h.nombre.toLowerCase().includes(term) ||
      h.tipo.toLowerCase().includes(term) ||
      h.fecha.includes(term)
    );
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar activePage="registro-periodos" />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen min-w-0">
        {/* TopAppBar */}
        <header className="flex justify-between items-center w-full px-8 py-4 z-30 sticky top-0 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant">
          <div className="flex items-center gap-4 pl-12 md:pl-0">
            <h1 className="text-h3 font-h3 font-bold text-primary">Importaciones CRESGO</h1>
            <div className="h-6 w-[1px] bg-outline-variant hidden md:block"></div>
            <span className="font-body-base text-body-base font-medium text-secondary hidden md:block">
              Sistema de Planilla
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                className="pl-10 pr-4 py-1.5 bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-primary w-64 text-body-sm"
                placeholder="Buscar..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              {statusMessage && (
                <div
                  className={`text-body-sm font-semibold px-4 py-1.5 rounded-lg border shadow-sm ${
                    statusMessage.type === "success"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-error/10 text-error border-error/20"
                  }`}
                >
                  {statusMessage.text}
                </div>
              )}
              <div className="flex items-center gap-3">
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
          </div>
        </header>

        {/* Canvas */}
        <section className="p-8 max-w-[1600px] mx-auto w-full">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="font-h1 text-h1 text-on-surface">Configuración de Períodos y Calendario</h1>
              <p className="text-on-surface-variant font-body-base">Administre los ciclos de pago y fechas especiales de la empresa.</p>
            </div>
            {activeTab === "periods" ? (
              <button 
                onClick={() => setShowPeriodModal(true)}
                className="bg-primary text-on-primary px-6 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined">add</span>
                <span className="font-body-base font-semibold">Nuevo Período</span>
              </button>
            ) : (
              <button 
                onClick={() => setShowHolidayModal(true)}
                className="bg-primary text-on-primary px-6 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined">add</span>
                <span className="font-body-base font-semibold">Nuevo Asueto</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* Main Content (Tabs) */}
            <div className="lg:col-span-9 space-y-6">
              {/* Tab Switcher */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                <div className="flex border-b border-outline-variant">
                  <button
                    className={`px-8 py-4 font-semibold relative transition-colors cursor-pointer ${
                      activeTab === "periods" 
                        ? "text-primary active-tab-line" 
                        : "text-on-surface-variant hover:text-primary"
                    }`}
                    onClick={() => setActiveTab("periods")}
                  >
                    Períodos de Pago
                  </button>
                  <button
                    className={`px-8 py-4 font-semibold relative transition-colors cursor-pointer ${
                      activeTab === "holidays" 
                        ? "text-primary active-tab-line" 
                        : "text-on-surface-variant hover:text-primary"
                    }`}
                    onClick={() => setActiveTab("holidays")}
                  >
                    Asuetos y Festivos
                  </button>
                </div>

                {/* Content 1: Períodos de Pago */}
                {activeTab === "periods" && (
                  <div className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low">
                            <th className="px-6 py-3 text-label-caps text-on-surface-variant border-b border-outline-variant">Año</th>
                            <th className="px-6 py-3 text-label-caps text-on-surface-variant border-b border-outline-variant">Mes</th>
                            <th className="px-6 py-3 text-label-caps text-on-surface-variant border-b border-outline-variant">Tipo</th>
                            <th className="px-6 py-3 text-label-caps text-on-surface-variant border-b border-outline-variant">Rango de Fechas</th>
                            <th className="px-6 py-3 text-label-caps text-on-surface-variant border-b border-outline-variant">Estado</th>
                            <th className="px-6 py-3 text-label-caps text-on-surface-variant border-b border-outline-variant text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                          {loading ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                                <div className="flex flex-col items-center gap-2 justify-center">
                                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                  <span>Cargando períodos...</span>
                                </div>
                              </td>
                            </tr>
                          ) : filteredPeriodos.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                                No se encontraron períodos de pago.
                              </td>
                            </tr>
                          ) : (
                            filteredPeriodos.map((item) => (
                              <tr key={item.id_periodo} className="hover:bg-primary/5 transition-colors group">
                                <td className="px-6 py-4 font-data-tabular">{item.anio}</td>
                                <td className="px-6 py-4 font-body-base">{item.mes}</td>
                                <td className="px-6 py-4 font-body-base">{item.tipo}</td>
                                <td className="px-6 py-4 font-data-tabular text-on-surface-variant">
                                  {formatDateStr(item.fecha_inicio)} - {formatDateStr(item.fecha_fin)}
                                </td>
                                <td className="px-6 py-4">
                                  {item.cerrado ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600 uppercase">Cerrado</span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase">Abierto</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    {item.cerrado ? (
                                      <span className="p-1 text-on-surface-variant opacity-50" title="Período Cerrado">
                                        <span className="material-symbols-outlined text-[20px]">lock</span>
                                      </span>
                                    ) : (
                                      <button 
                                        onClick={() => setPeriodToClose(item)}
                                        className="p-1 hover:bg-surface-variant rounded transition-colors text-error cursor-pointer" 
                                        title="Cerrar Período"
                                      >
                                        <span className="material-symbols-outlined text-[20px]">lock_open</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Content 2: Asuetos y Festivos */}
                {activeTab === "holidays" && (
                  <div className="p-6">
                    {loading ? (
                      <div className="flex flex-col items-center gap-2 justify-center py-12">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-on-surface-variant">Cargando asuetos...</span>
                      </div>
                    ) : filteredHolidays.length === 0 ? (
                      <div className="text-center text-on-surface-variant py-8">
                        No hay asuetos o días festivos registrados en el sistema.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredHolidays.map((item) => {
                          const dateInfo = getDayAndMonth(item.fecha);
                          return (
                            <div key={item.id_asueto} className="p-4 border border-outline-variant rounded-lg hover:border-primary transition-all group flex items-start gap-4 bg-surface-container-lowest">
                              <div className="bg-primary/10 text-primary w-12 h-12 flex flex-col items-center justify-center rounded-lg select-none">
                                <span className="text-[10px] font-bold uppercase">{dateInfo.month}</span>
                                <span className="text-lg font-bold">{dateInfo.day}</span>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-on-surface">{item.nombre}</h4>
                                <p className="text-body-sm text-on-surface-variant">{item.tipo} • {formatDateStr(item.fecha)}</p>
                                <div className="mt-3 flex items-center justify-between">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <div 
                                      onClick={() => handleToggleHolidayRecargo(item)}
                                      className={`relative w-10 h-5 rounded-full transition-colors ${
                                        item.paga_recargo ? "bg-primary" : "bg-outline-variant/50"
                                      }`}
                                    >
                                      <div 
                                        className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${
                                          item.paga_recargo ? "left-6" : "left-1"
                                        }`}
                                      ></div>
                                    </div>
                                    <span className={`text-xs font-semibold ${item.paga_recargo ? "text-primary" : "text-on-surface-variant"}`}>
                                      Paga Recargo
                                    </span>
                                  </label>
                                  <button 
                                    onClick={() => setHolidayToDelete(item)}
                                    className="text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-6 flex justify-center">
                      <button 
                        onClick={() => setShowHolidayModal(true)}
                        className="text-primary font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span className="material-symbols-outlined">add_circle</span>
                        Agregar festivo manual
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Visual Accent Card */}
              <div className="relative h-48 rounded-xl overflow-hidden shadow-sm select-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  alt="Planificación Estratégica" 
                  className="w-full h-full object-cover" 
                  src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=1000"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-primary/95 to-transparent flex items-center p-8">
                  <div className="max-w-md text-on-primary">
                    <h3 className="font-h3 text-h3 font-bold mb-2">Planificación Estratégica {new Date().getFullYear()}</h3>
                    <p className="text-body-base opacity-90">Recuerde que el cierre de períodos afecta directamente la generación de reportes ante la SAT. Mantenga su calendario actualizado.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Widget */}
            <aside className="lg:col-span-3 space-y-6">
              {/* Resumen Anual Card */}
              <div className="bg-surface-container-lowest border-t-4 border-primary rounded-xl border border-outline-variant shadow-sm p-6">
                <h3 className="font-h3 text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">analytics</span>
                  Resumen Anual
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-body-sm mb-2">
                      <span className="text-on-surface-variant">Períodos Completados</span>
                      <span className="font-bold text-on-surface">{periodosCerrados} / {totalPeriodos}</span>
                    </div>
                    <div className="w-full bg-surface-container rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${totalPeriodos > 0 ? (periodosCerrados / totalPeriodos) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-low p-4 rounded-lg text-center">
                      <span className="block text-h2 font-bold text-primary">{periodosPendientes}</span>
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant">Pendientes</span>
                    </div>
                    <div className="bg-surface-container-low p-4 rounded-lg text-center">
                      <span className="block text-h2 font-bold text-secondary">{totalFestivos}</span>
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant">Festivos</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-outline-variant">
                    <h4 className="text-label-caps text-on-surface-variant mb-4 font-bold">PRÓXIMO CIERRE</h4>
                    {proximoCierre ? (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-error-container text-error rounded-lg">
                          <span className="material-symbols-outlined">event_busy</span>
                        </div>
                        <div>
                          <p className="font-bold text-body-base">{formatDateStr(proximoCierre.fecha_fin)}</p>
                          <p className="text-body-sm text-on-surface-variant">{proximoCierre.mes} - {proximoCierre.tipo}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-body-sm text-on-surface-variant italic">No hay cierres pendientes programados.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant">
                <h4 className="font-bold text-on-surface mb-4">Accesos Rápidos</h4>
                <ul className="space-y-3">
                  <li>
                    <a className="flex items-center justify-between group" href="#">
                      <span className="text-body-sm text-on-surface-variant group-hover:text-primary transition-colors">Generar Reporte SAT</span>
                      <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-all text-primary">arrow_forward</span>
                    </a>
                  </li>
                  <li>
                    <a className="flex items-center justify-between group" href="#">
                      <span className="text-body-sm text-on-surface-variant group-hover:text-primary transition-colors">Historial de Cambios</span>
                      <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-all text-primary">arrow_forward</span>
                    </a>
                  </li>
                  <li>
                    <a className="flex items-center justify-between group" href="#">
                      <span className="text-body-sm text-on-surface-variant group-hover:text-primary transition-colors">Configuración ISR</span>
                      <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-all text-primary">arrow_forward</span>
                    </a>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </main>

      {/* Modal: Nuevo Período */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm px-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-outline-variant animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="font-h2 text-h2 text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_today</span>
                Nuevo Período de Pago
              </h3>
              <button
                onClick={() => setShowPeriodModal(false)}
                className="p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <form onSubmit={handleSavePeriod}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">EMPRESA</label>
                    <select
                      value={formPeriod.id_empresa}
                      onChange={(e) => setFormPeriod(prev => ({ ...prev, id_empresa: parseInt(e.target.value) }))}
                      className="bg-background border border-outline-variant rounded-lg px-3 py-2 text-body-base focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      {empresas.map(emp => (
                        <option key={emp.id_empresa} value={emp.id_empresa}>{emp.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">TIPO</label>
                    <select
                      value={formPeriod.tipo}
                      onChange={(e) => setFormPeriod(prev => ({ ...prev, tipo: e.target.value }))}
                      className="bg-background border border-outline-variant rounded-lg px-3 py-2 text-body-base focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="QUINCENAL">Quincenal</option>
                      <option value="MENSUAL">Mensual</option>
                      <option value="EXTRAORDINARIO">Extraordinario</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">MES</label>
                    <select
                      value={formPeriod.mes}
                      onChange={(e) => setFormPeriod(prev => ({ ...prev, mes: e.target.value }))}
                      className="bg-background border border-outline-variant rounded-lg px-3 py-2 text-body-base focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      {FULL_MONTHS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">AÑO</label>
                    <input
                      type="number"
                      value={formPeriod.anio}
                      onChange={(e) => setFormPeriod(prev => ({ ...prev, anio: parseInt(e.target.value) }))}
                      className="bg-background border border-outline-variant rounded-lg px-3 py-2 text-body-base focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">FECHA INICIO</label>
                    <input
                      type="date"
                      value={formPeriod.fecha_inicio}
                      onChange={(e) => setFormPeriod(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                      className="bg-background border border-outline-variant rounded-lg px-3 py-2 text-body-base focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">FECHA FIN</label>
                    <input
                      type="date"
                      value={formPeriod.fecha_fin}
                      onChange={(e) => setFormPeriod(prev => ({ ...prev, fecha_fin: e.target.value }))}
                      className="bg-background border border-outline-variant rounded-lg px-3 py-2 text-body-base focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-surface-container-low border-t border-outline-variant flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPeriodModal(false)}
                  className="bg-white border border-outline-variant text-on-surface-variant px-5 py-2.5 rounded-lg font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-bold hover:opacity-90 transition-all cursor-pointer"
                >
                  Guardar Período
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Asueto */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm px-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-outline-variant animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="font-h2 text-h2 text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">celebration</span>
                Nuevo Asueto o Festivo
              </h3>
              <button
                onClick={() => setShowHolidayModal(false)}
                className="p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveHoliday}>
              <div className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">EMPRESA</label>
                  <select
                    value={formHoliday.id_empresa}
                    onChange={(e) => setFormHoliday(prev => ({ ...prev, id_empresa: parseInt(e.target.value) }))}
                    className="bg-background border border-outline-variant rounded-lg px-3 py-2 text-body-base focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    {empresas.map(emp => (
                      <option key={emp.id_empresa} value={emp.id_empresa}>{emp.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">NOMBRE DEL FESTIVO</label>
                  <input
                    type="text"
                    value={formHoliday.nombre}
                    onChange={(e) => setFormHoliday(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej. Día del Ejército"
                    className="bg-background border border-outline-variant rounded-lg px-3 py-2 text-body-base focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">TIPO</label>
                    <select
                      value={formHoliday.tipo}
                      onChange={(e) => setFormHoliday(prev => ({ ...prev, tipo: e.target.value }))}
                      className="bg-background border border-outline-variant rounded-lg px-3 py-2 text-body-base focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="Feriado Nacional">Feriado Nacional</option>
                      <option value="Asueto Local">Asueto Local</option>
                      <option value="Feriado Municipal">Feriado Municipal</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">FECHA</label>
                    <input
                      type="date"
                      value={formHoliday.fecha}
                      onChange={(e) => setFormHoliday(prev => ({ ...prev, fecha: e.target.value }))}
                      className="bg-background border border-outline-variant rounded-lg px-3 py-2 text-body-base focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div 
                    onClick={() => setFormHoliday(prev => ({ ...prev, paga_recargo: !prev.paga_recargo }))}
                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer select-none ${
                      formHoliday.paga_recargo ? "bg-primary" : "bg-outline-variant/50"
                    }`}
                  >
                    <div 
                      className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${
                        formHoliday.paga_recargo ? "left-6" : "left-1"
                      }`}
                    ></div>
                  </div>
                  <span className="font-body-base font-semibold text-on-surface select-none">
                    Paga recargo del 100% (Doble tiempo)
                  </span>
                </div>
              </div>
              <div className="p-6 bg-surface-container-low border-t border-outline-variant flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
                  className="bg-white border border-outline-variant text-on-surface-variant px-5 py-2.5 rounded-lg font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-bold hover:opacity-90 transition-all cursor-pointer"
                >
                  Guardar Asueto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmación Cierre de Período */}
      {periodToClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm px-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-outline-variant animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="font-h2 text-h2 text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-error">lock</span>
                Confirmar Cierre de Período
              </h3>
              <button
                onClick={() => setPeriodToClose(null)}
                className="p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-on-surface text-body-base">
                ¿Está seguro de cerrar el período de planilla: <strong className="text-primary">{periodToClose.mes} {periodToClose.anio}</strong> ({periodToClose.tipo})?
              </p>
              <div className="bg-error/10 border border-error/20 rounded-lg p-3.5 flex items-start gap-3 text-error text-body-sm font-medium">
                <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">warning</span>
                <span>Esta acción bloqueará ediciones futuras y no podrá ser revertida. Asegúrese de que todas las planillas estén ingresadas correctamente.</span>
              </div>
            </div>
            <div className="p-6 bg-surface-container-low border-t border-outline-variant flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setPeriodToClose(null)}
                className="bg-white border border-outline-variant text-on-surface-variant px-5 py-2.5 rounded-lg font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  executeClosePeriod(periodToClose.id_periodo, periodToClose.mes, periodToClose.anio, periodToClose.id_empresa);
                  setPeriodToClose(null);
                }}
                className="bg-error text-on-error px-5 py-2.5 rounded-lg font-bold hover:bg-error/90 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Sí, Cerrar Período
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmación Eliminar Asueto */}
      {holidayToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm px-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-outline-variant animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="font-h2 text-h2 text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-error">delete</span>
                Confirmar Eliminación
              </h3>
              <button
                onClick={() => setHolidayToDelete(null)}
                className="p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-on-surface text-body-base">
                ¿Está seguro de eliminar el asueto/festivo: <strong className="text-primary">{holidayToDelete.nombre}</strong> ({formatDateStr(holidayToDelete.fecha)})?
              </p>
              <div className="bg-error/10 border border-error/20 rounded-lg p-3.5 flex items-start gap-3 text-error text-body-sm font-medium">
                <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">warning</span>
                <span>Esta acción eliminará permanentemente este día del calendario y podría afectar los recargos de planilla.</span>
              </div>
            </div>
            <div className="p-6 bg-surface-container-low border-t border-outline-variant flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setHolidayToDelete(null)}
                className="bg-white border border-outline-variant text-on-surface-variant px-5 py-2.5 rounded-lg font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  executeDeleteHoliday(holidayToDelete.id_asueto);
                  setHolidayToDelete(null);
                }}
                className="bg-error text-on-error px-5 py-2.5 rounded-lg font-bold hover:bg-error/90 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilo para la pestaña activa */}
      <style>{`
        .active-tab-line::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #006327;
        }
      `}</style>
    </div>
  );
}
