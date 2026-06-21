"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { supabase } from "@/lib/supabase/client";

interface Empresa {
  id_empresa: number;
  nombre: string;
}

interface PeriodoPago {
  id_periodo: number;
  id_empresa: number;
  mes: string;
  anio: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  cerrado: boolean;
  empresa: {
    nombre: string;
  } | null;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const TIPOS_PAGO = [
  { value: "QUINCENAL", label: "Quincenal" },
  { value: "MENSUAL", label: "Mensual" }
];

export default function PeriodosPagoCRUD() {
  const [data, setData] = useState<PeriodoPago[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<PeriodoPago | null>(null);
  const [formData, setFormData] = useState({
    id_empresa: "",
    mes: "Enero",
    anio: new Date().getFullYear().toString(),
    tipo: "QUINCENAL",
    fecha_inicio: "",
    fecha_fin: "",
    cerrado: false
  });

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<PeriodoPago | null>(null);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchInitialData = async () => {
    try {
      const { data: empData, error: empErr } = await supabase
        .from("empresa")
        .select("id_empresa, nombre")
        .order("nombre", { ascending: true });
      if (empErr) throw empErr;
      setEmpresas(empData || []);
    } catch (err: any) {
      console.error("Error loading empresas for select:", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("periodo_pago")
        .select("*, empresa(nombre)", { count: "exact" });

      if (debouncedSearch) {
        query = query.or(`mes.ilike.%${debouncedSearch}%,tipo.ilike.%${debouncedSearch}%`);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: result, error, count } = await query
        .range(from, to)
        .order("anio", { ascending: false })
        .order("fecha_inicio", { ascending: false });

      if (error) throw error;
      
      setData((result as unknown as PeriodoPago[]) || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error("Error fetching periodos de pago:", err);
      setStatusMessage({ type: "error", text: "Error al cargar periodos de pago: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, debouncedSearch]);

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({
      id_empresa: empresas.length > 0 ? empresas[0].id_empresa.toString() : "",
      mes: MESES[new Date().getMonth()],
      anio: new Date().getFullYear().toString(),
      tipo: "QUINCENAL",
      fecha_inicio: "",
      fecha_fin: "",
      cerrado: false
    });
    setSelectedItem(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: PeriodoPago) => {
    setModalMode("edit");
    setSelectedItem(item);
    setFormData({
      id_empresa: item.id_empresa?.toString() || "",
      mes: item.mes || "Enero",
      anio: item.anio?.toString() || new Date().getFullYear().toString(),
      tipo: item.tipo || "QUINCENAL",
      fecha_inicio: item.fecha_inicio || "",
      fecha_fin: item.fecha_fin || "",
      cerrado: item.cerrado ?? false
    });
    setShowModal(true);
  };

  const handleOpenDelete = (item: PeriodoPago) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_empresa || !formData.mes || !formData.anio || !formData.tipo || !formData.fecha_inicio || !formData.fecha_fin) {
      setStatusMessage({ type: "error", text: "Todos los campos son obligatorios." });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const payload = {
        id_empresa: parseInt(formData.id_empresa),
        mes: formData.mes,
        anio: parseInt(formData.anio),
        tipo: formData.tipo,
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin,
        cerrado: formData.cerrado
      };

      if (modalMode === "create") {
        const { error } = await supabase
          .from("periodo_pago")
          .insert(payload);
        if (error) throw error;
        setStatusMessage({ type: "success", text: "Periodo de pago agregado con éxito." });
      } else {
        if (!selectedItem) return;
        const { error } = await supabase
          .from("periodo_pago")
          .update(payload)
          .eq("id_periodo", selectedItem.id_periodo);
        if (error) throw error;
        setStatusMessage({ type: "success", text: "Periodo de pago actualizado con éxito." });
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error("Error saving periodo de pago:", err);
      setStatusMessage({ type: "error", text: "Error al guardar periodo: " + err.message });
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const { error } = await supabase
        .from("periodo_pago")
        .delete()
        .eq("id_periodo", itemToDelete.id_periodo);

      if (error) throw error;

      setStatusMessage({ type: "success", text: "Periodo de pago eliminado con éxito." });
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      if (data.length === 1 && page > 1) {
        setPage(p => p - 1);
      } else {
        fetchData();
      }
    } catch (err: any) {
      console.error("Error deleting periodo de pago:", err);
      setStatusMessage({ 
        type: "error", 
        text: "Error al eliminar periodo: " + (err.message.includes("violates foreign key constraint") 
          ? "No se puede eliminar porque existen planillas registradas o asociadas a este periodo." 
          : err.message)
      });
      setShowDeleteConfirm(false);
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="flex min-h-screen text-on-surface bg-background font-sans">
      <Sidebar activePage="periodospago" />

      {/* Main Content Area */}
      <div className="md:ml-64 flex flex-col min-h-screen flex-1 min-w-0">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-section-gap py-4 z-30 bg-surface-container-lowest/80 backdrop-blur-md sticky top-0 border-b border-outline-variant">
          <div className="flex items-center gap-4 flex-1 pl-12 md:pl-0">
            <span className="font-h3 text-h3 font-bold text-primary">Periodos de Pago</span>
          </div>
          
          <div className="flex items-center gap-4">
            {statusMessage && (
              <div className={`text-body-sm font-semibold px-4 py-1.5 rounded-lg border shadow-sm ${
                statusMessage.type === "success" 
                  ? "bg-primary/10 text-primary border-primary/20" 
                  : "bg-error/10 text-error border-error/20"
              }`}>
                {statusMessage.text}
              </div>
            )}
            
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm border border-outline-variant">
              AD
            </div>
          </div>
        </header>

        {/* Canvas Content */}
        <main className="p-4 md:p-8 flex-1 min-w-0">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-h2 text-h2 text-on-surface tracking-tight">Periodos de Pago</h1>
                <p className="text-body-sm text-on-surface-variant">Configure y gestione los intervalos de tiempo quincenales o mensuales para la generación de planillas.</p>
              </div>
              <button 
                onClick={handleOpenCreate}
                disabled={empresas.length === 0}
                className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 shadow-sm transition-opacity cursor-pointer text-body-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Agregar Periodo
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl shadow-sm flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[280px]">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">search</span>
                  </span>
                  <input
                    className="w-full pl-10 pr-4 py-2 bg-background border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-body-sm focus:outline-none"
                    placeholder="Filtrar por mes o tipo (Quincenal / Mensual)..."
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden border-t-4 border-t-primary">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/50 text-on-surface-variant border-b border-outline-variant text-label-caps">
                      <th className="px-6 py-4 font-bold">Empresa</th>
                      <th className="px-6 py-4 font-bold">Mes / Año</th>
                      <th className="px-6 py-4 font-bold">Tipo</th>
                      <th className="px-6 py-4 font-bold">Fechas (Inicio - Fin)</th>
                      <th className="px-6 py-4 font-bold text-center">Estado</th>
                      <th className="px-6 py-4 font-bold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-body-base">
                    {loading && data.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span>Cargando periodos de pago...</span>
                          </div>
                        </td>
                      </tr>
                    ) : data.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                          No se encontraron periodos de pago registrados.
                        </td>
                      </tr>
                    ) : (
                      data.map((item) => (
                        <tr key={item.id_periodo} className="hover:bg-surface-container/30 transition-colors">
                          <td className="px-6 py-4">
                            <span className="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded text-[12px] font-medium">
                              {item.empresa?.nombre || "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-on-surface">
                            {item.mes} {item.anio}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              item.tipo === "QUINCENAL" 
                                ? "bg-blue-100 text-blue-800" 
                                : "bg-purple-100 text-purple-800"
                            }`}>
                              {item.tipo}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-data-tabular text-on-surface-variant text-sm font-semibold">
                            {item.fecha_inicio} al {item.fecha_fin}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {item.cerrado ? (
                              <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-[12px] font-bold ring-1 ring-red-200">Cerrado</span>
                            ) : (
                              <span className="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full text-[12px] font-bold ring-1 ring-green-200">Abierto</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button 
                                onClick={() => handleOpenEdit(item)}
                                className="p-2 hover:bg-surface-variant/50 rounded-lg text-secondary transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <span className="material-symbols-outlined text-[20px]">edit</span>
                              </button>
                              <button 
                                onClick={() => handleOpenDelete(item)}
                                className="p-2 hover:bg-error-container/20 rounded-lg text-error transition-colors cursor-pointer"
                                title="Eliminar"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="bg-surface-container-low px-6 py-4 flex justify-between items-center border-t border-outline-variant">
                <p className="text-body-sm text-on-surface-variant">
                  Mostrando {data.length} de {totalCount} periodos
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-outline-variant rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container disabled:opacity-50 font-semibold text-body-sm cursor-pointer"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1 text-on-surface font-semibold text-body-sm">Página {page} de {totalPages || 1}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1 border border-outline-variant rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container disabled:opacity-50 font-semibold text-body-sm cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm px-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-outline-variant animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-h2 text-h2 text-on-surface">
                {modalMode === "create" ? "Agregar Nuevo Periodo" : "Editar Periodo de Pago"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors flex items-center justify-center cursor-pointer text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="p-6 space-y-4">
                
                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Empresa Relacionada *</label>
                  <div className="relative">
                    <select 
                      className="w-full border border-outline-variant rounded-lg focus:ring-primary focus:border-primary text-body-base appearance-none py-2 px-3 pr-10 bg-transparent focus:outline-none"
                      required
                      value={formData.id_empresa}
                      onChange={(e) => setFormData({ ...formData, id_empresa: e.target.value })}
                    >
                      {empresas.map(emp => (
                        <option key={emp.id_empresa} value={emp.id_empresa}>
                          {emp.nombre}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Mes *</label>
                    <div className="relative">
                      <select 
                        className="w-full border border-outline-variant rounded-lg focus:ring-primary focus:border-primary text-body-base appearance-none py-2 px-3 pr-10 bg-transparent focus:outline-none"
                        required
                        value={formData.mes}
                        onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
                      >
                        {MESES.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary pointer-events-none">expand_more</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Año *</label>
                    <input 
                      className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none font-data-tabular" 
                      type="number" 
                      required
                      min={2000}
                      max={2100}
                      value={formData.anio}
                      onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Tipo de Pago *</label>
                  <div className="relative">
                    <select 
                      className="w-full border border-outline-variant rounded-lg focus:ring-primary focus:border-primary text-body-base appearance-none py-2 px-3 pr-10 bg-transparent focus:outline-none"
                      required
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    >
                      {TIPOS_PAGO.map(tp => (
                        <option key={tp.value} value={tp.value}>{tp.label}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Fecha Inicio *</label>
                    <input 
                      className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none" 
                      type="date" 
                      required
                      value={formData.fecha_inicio}
                      onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Fecha Fin *</label>
                    <input 
                      className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none" 
                      type="date" 
                      required
                      value={formData.fecha_fin}
                      onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    id="cerrado"
                    className="rounded border-outline-variant text-primary focus:ring-primary h-5 w-5 cursor-pointer"
                    checked={formData.cerrado}
                    onChange={(e) => setFormData({ ...formData, cerrado: e.target.checked })}
                  />
                  <label htmlFor="cerrado" className="text-body-base font-semibold text-on-surface cursor-pointer select-none">
                    Periodo Cerrado (impide realizar modificaciones en planillas asociadas)
                  </label>
                </div>
              </div>

              <div className="p-6 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 rounded-lg font-bold border border-outline-variant text-on-surface hover:bg-surface-container transition-all cursor-pointer text-body-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 rounded-lg font-bold bg-primary text-on-primary shadow-sm hover:opacity-90 transition-all cursor-pointer text-body-sm"
                >
                  {modalMode === "create" ? "Guardar" : "Actualizar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteConfirm && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm px-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-outline-variant animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-error-container/10">
              <h3 className="font-h2 text-h2 text-error flex items-center gap-2">
                <span className="material-symbols-outlined">warning</span>
                Confirmar Eliminación
              </h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors flex items-center justify-center cursor-pointer text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-body-base text-on-surface">
                ¿Está seguro de que desea eliminar el periodo de pago <strong>{itemToDelete.mes} {itemToDelete.anio} ({itemToDelete.tipo})</strong> de la empresa {itemToDelete.empresa?.nombre}?
              </p>
              <p className="text-body-sm text-on-surface-variant mt-2">
                Esta acción no se puede deshacer. Si el periodo ya tiene planillas o constancias vinculadas, la base de datos impedirá la eliminación para proteger la integridad.
              </p>
            </div>

            <div className="p-6 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2 rounded-lg font-bold border border-outline-variant text-on-surface hover:bg-surface-container transition-all cursor-pointer text-body-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                className="px-5 py-2 rounded-lg font-bold bg-error text-on-error shadow-sm hover:opacity-90 transition-all cursor-pointer text-body-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
