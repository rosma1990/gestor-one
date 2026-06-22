"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { supabase } from "@/lib/supabase/client";

interface ConceptoPago {
  id_concepto: number;
  codigo: string;
  nombre: string;
  tipo: string;
  naturaleza: string;
  origen: string;
  formula: string | null;
  referencia_constante: string | null;
  mostrar_en_cero: boolean;
  orden_display: number;
  activo: boolean;
  vigente_desde: string | null;
  vigente_hasta: string | null;
}

export default function ConceptosPagoCRUD() {
  const [data, setData] = useState<ConceptoPago[]>([]);
  const [constantes, setConstantes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<ConceptoPago | null>(null);
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    tipo: "INGRESO",
    naturaleza: "MANUAL",
    origen: "MANUAL",
    formula: "",
    referencia_constante: "",
    mostrar_en_cero: true,
    orden_display: 1,
    activo: true,
    vigente_desde: "",
    vigente_hasta: ""
  });

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ConceptoPago | null>(null);

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
      const { data: constData, error } = await supabase
        .from("constante_sistema")
        .select("clave")
        .order("clave", { ascending: true });
      if (error) throw error;
      setConstantes((constData || []).map(c => c.clave));
    } catch (err) {
      console.error("Error loading system constants keys:", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("concepto_pago")
        .select("*", { count: "exact" });

      if (debouncedSearch) {
        query = query.or(`nombre.ilike.%${debouncedSearch}%,codigo.ilike.%${debouncedSearch}%`);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: result, error, count } = await query
        .range(from, to)
        .order("orden_display", { ascending: true })
        .order("id_concepto", { ascending: true });

      if (error) throw error;
      
      setData((result as unknown as ConceptoPago[]) || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error("Error fetching conceptos:", err);
      setStatusMessage({ type: "error", text: "Error al cargar conceptos: " + err.message });
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
      codigo: "",
      nombre: "",
      tipo: "INGRESO",
      naturaleza: "MANUAL",
      origen: "MANUAL",
      formula: "",
      referencia_constante: constantes.length > 0 ? constantes[0] : "",
      mostrar_en_cero: true,
      orden_display: data.length > 0 ? Math.max(...data.map(d => d.orden_display)) + 1 : 1,
      activo: true,
      vigente_desde: "",
      vigente_hasta: ""
    });
    setSelectedItem(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: ConceptoPago) => {
    setModalMode("edit");
    setSelectedItem(item);
    setFormData({
      codigo: item.codigo || "",
      nombre: item.nombre || "",
      tipo: item.tipo || "INGRESO",
      naturaleza: item.naturaleza || "MANUAL",
      origen: item.origen || "MANUAL",
      formula: item.formula || "",
      referencia_constante: item.referencia_constante || "",
      mostrar_en_cero: item.mostrar_en_cero ?? true,
      orden_display: item.orden_display ?? 1,
      activo: item.activo ?? true,
      vigente_desde: item.vigente_desde || "",
      vigente_hasta: item.vigente_hasta || ""
    });
    setShowModal(true);
  };

  const handleOpenDelete = (item: ConceptoPago) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo.trim() || !formData.nombre.trim() || isNaN(formData.orden_display)) {
      setStatusMessage({ type: "error", text: "El código, nombre y orden son requeridos." });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const payload = {
        codigo: formData.codigo.toUpperCase().replace(/\s+/g, "_"),
        nombre: formData.nombre,
        tipo: formData.tipo,
        naturaleza: formData.naturaleza,
        origen: formData.origen,
        formula: formData.naturaleza === "CALCULADO" && formData.formula.trim() ? formData.formula : null,
        referencia_constante: formData.origen === "CONSTANTE" && formData.referencia_constante ? formData.referencia_constante : null,
        mostrar_en_cero: formData.mostrar_en_cero,
        orden_display: parseInt(formData.orden_display.toString()),
        activo: formData.activo,
        vigente_desde: formData.vigente_desde || null,
        vigente_hasta: formData.vigente_hasta || null
      };

      if (modalMode === "create") {
        const { error } = await supabase
          .from("concepto_pago")
          .insert(payload);
        if (error) throw error;
        setStatusMessage({ type: "success", text: "Concepto de pago agregado con éxito." });
      } else {
        if (!selectedItem) return;
        const { error } = await supabase
          .from("concepto_pago")
          .update(payload)
          .eq("id_concepto", selectedItem.id_concepto);
        if (error) throw error;
        setStatusMessage({ type: "success", text: "Concepto de pago actualizado con éxito." });
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error("Error saving concepto:", err);
      setStatusMessage({ type: "error", text: "Error al guardar concepto: " + err.message });
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const { error } = await supabase
        .from("concepto_pago")
        .delete()
        .eq("id_concepto", itemToDelete.id_concepto);

      if (error) throw error;

      setStatusMessage({ type: "success", text: "Concepto de pago eliminado con éxito." });
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      if (data.length === 1 && page > 1) {
        setPage(p => p - 1);
      } else {
        fetchData();
      }
    } catch (err: any) {
      console.error("Error deleting concepto:", err);
      setStatusMessage({ 
        type: "error", 
        text: "Error al eliminar concepto: " + (err.message.includes("violates foreign key constraint") 
          ? "No se puede eliminar porque existen detalles de planillas vinculados a este concepto. Le sugerimos desactivarlo en su lugar." 
          : err.message)
      });
      setShowDeleteConfirm(false);
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="flex min-h-screen text-on-surface bg-background">
      <Sidebar activePage="conceptospago" />

      {/* Main Content Area */}
      <div className="md:ml-64 flex flex-col min-h-screen flex-1 min-w-0">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-section-gap py-4 z-30 bg-surface-container-lowest/80 backdrop-blur-md sticky top-0 border-b border-outline-variant">
          <div className="flex items-center gap-4 flex-1 pl-12 md:pl-0">
            <span className="font-h3 text-h3 font-bold text-primary">Conceptos de Pago</span>
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
        </header>

        {/* Canvas Content */}
        <main className="p-4 md:p-8 flex-1 min-w-0">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-h2 text-h2 text-on-surface tracking-tight">Conceptos de Pago</h1>
                <p className="text-body-sm text-on-surface-variant">Gestione ingresos, egresos y fórmulas de cálculo de nómina.</p>
              </div>
              <button 
                onClick={handleOpenCreate}
                className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 shadow-sm transition-opacity cursor-pointer text-body-sm"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Agregar Concepto
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
                    placeholder="Filtrar por nombre o código..."
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
                      <th className="px-6 py-4 font-bold">Orden</th>
                      <th className="px-6 py-4 font-bold">Código</th>
                      <th className="px-6 py-4 font-bold">Concepto</th>
                      <th className="px-6 py-4 font-bold">Tipo / Origen</th>
                      <th className="px-6 py-4 font-bold">Naturaleza</th>
                      <th className="px-6 py-4 font-bold">Fórmula / Constante</th>
                      <th className="px-6 py-4 font-bold text-center">Estado</th>
                      <th className="px-6 py-4 font-bold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-body-base">
                    {loading && data.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span>Cargando conceptos...</span>
                          </div>
                        </td>
                      </tr>
                    ) : data.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant">
                          No se encontraron conceptos de pago registrados.
                        </td>
                      </tr>
                    ) : (
                      data.map((item) => (
                        <tr key={item.id_concepto} className="hover:bg-surface-container/30 transition-colors">
                          <td className="px-6 py-4 font-data-tabular text-on-surface-variant">{item.orden_display}</td>
                          <td className="px-6 py-4 font-data-tabular font-bold text-primary">{item.codigo}</td>
                          <td className="px-6 py-4 font-medium text-on-surface">
                            <p>{item.nombre}</p>
                            <p className="text-[10px] text-on-surface-variant italic">
                              {item.mostrar_en_cero ? "Se muestra si es cero" : "Ocultar si es cero"}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                item.tipo === "INGRESO" 
                                  ? "bg-green-100 text-green-800" 
                                  : item.tipo === "DESCUENTO" 
                                    ? "bg-red-100 text-red-800" 
                                    : "bg-slate-100 text-slate-800"
                              }`}>
                                {item.tipo}
                              </span>
                              <span className="text-[10px] text-on-surface-variant font-semibold">Origen: {item.origen}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant text-sm font-semibold">{item.naturaleza}</td>
                          <td className="px-6 py-4 text-on-surface-variant font-mono text-[12px] break-all max-w-[200px]">
                            {item.naturaleza === "CALCULADO" && item.formula ? (
                              <span className="text-secondary">{item.formula}</span>
                            ) : item.origen === "CONSTANTE" && item.referencia_constante ? (
                              <span className="text-primary font-bold">{item.referencia_constante}</span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {item.activo ? (
                              <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[12px] font-bold ring-1 ring-primary/20">Activo</span>
                            ) : (
                              <span className="bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-[12px] font-bold ring-1 ring-slate-300">Inactivo</span>
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
                  Mostrando {data.length} de {totalCount} conceptos
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
          <div className="bg-surface-container-lowest w-full max-w-xl rounded-xl shadow-2xl overflow-hidden border border-outline-variant animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-h2 text-h2 text-on-surface">
                {modalMode === "create" ? "Agregar Nuevo Concepto" : "Editar Concepto"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors flex items-center justify-center cursor-pointer text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                
                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Código del Concepto *</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none font-mono uppercase" 
                    type="text" 
                    required
                    placeholder="E.j. SAL_ORD, BONO_MIN"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Nombre del Concepto *</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none" 
                    type="text" 
                    required
                    placeholder="E.j. Salario Ordinario"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Tipo de Concepto *</label>
                  <div className="relative">
                    <select 
                      className="w-full border border-outline-variant rounded-lg focus:ring-primary focus:border-primary text-body-base appearance-none py-2 px-3 pr-10 bg-transparent focus:outline-none"
                      required
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    >
                      <option value="INGRESO">Ingreso (Suma)</option>
                      <option value="DESCUENTO">Descuento (Resta)</option>
                      <option value="TOTAL">Total (Informativo)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Naturaleza *</label>
                  <div className="relative">
                    <select 
                      className="w-full border border-outline-variant rounded-lg focus:ring-primary focus:border-primary text-body-base appearance-none py-2 px-3 pr-10 bg-transparent focus:outline-none"
                      required
                      value={formData.naturaleza}
                      onChange={(e) => setFormData({ ...formData, naturaleza: e.target.value })}
                    >
                      <option value="MANUAL">Manual (Editable por período)</option>
                      <option value="CALCULADO">Calculado (A través de fórmula)</option>
                      <option value="VARIABLE">Variable (Reinicia a 0 cada mes)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Origen del Valor *</label>
                  <div className="relative">
                    <select 
                      className="w-full border border-outline-variant rounded-lg focus:ring-primary focus:border-primary text-body-base appearance-none py-2 px-3 pr-10 bg-transparent focus:outline-none"
                      required
                      value={formData.origen}
                      onChange={(e) => setFormData({ ...formData, origen: e.target.value })}
                    >
                      <option value="MANUAL">Ingreso Manual / Variable</option>
                      <option value="CONSTANTE">Valor Constante del Sistema</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Orden de Visualización *</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none font-data-tabular" 
                    type="number" 
                    required
                    min={1}
                    value={formData.orden_display}
                    onChange={(e) => setFormData({ ...formData, orden_display: parseInt(e.target.value) || 1 })}
                  />
                </div>

                {formData.naturaleza === "CALCULADO" && (
                  <div className="col-span-1 md:col-span-2 space-y-1.5">
                    <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Fórmula de Cálculo *</label>
                    <input 
                      className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none font-mono" 
                      type="text" 
                      required
                      placeholder="E.j. (SAL_ORD + BONO_LEY) * 0.0483"
                      value={formData.formula}
                      onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                    />
                    <p className="text-[10px] text-on-surface-variant italic">
                      Use códigos de otros conceptos o constantes del sistema. E.j. RENTA_ANUAL, IGSS_TASA.
                    </p>
                  </div>
                )}

                {formData.origen === "CONSTANTE" && (
                  <div className="col-span-1 md:col-span-2 space-y-1.5">
                    <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Constante de Referencia *</label>
                    <div className="relative">
                      <select 
                        className="w-full border border-outline-variant rounded-lg focus:ring-primary focus:border-primary text-body-base appearance-none py-2 px-3 pr-10 bg-transparent focus:outline-none font-mono"
                        required
                        value={formData.referencia_constante}
                        onChange={(e) => setFormData({ ...formData, referencia_constante: e.target.value })}
                      >
                        {constantes.map(key => (
                          <option key={key} value={key}>{key}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary pointer-events-none">expand_more</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Fecha Inicio Vigencia</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none" 
                    type="date" 
                    value={formData.vigente_desde}
                    onChange={(e) => setFormData({ ...formData, vigente_desde: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Fecha Fin Vigencia</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none" 
                    type="date" 
                    value={formData.vigente_hasta}
                    onChange={(e) => setFormData({ ...formData, vigente_hasta: e.target.value })}
                  />
                </div>

                <div className="col-span-1 md:col-span-2 flex flex-col gap-2 pt-2">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="mostrar_en_cero"
                      className="rounded border-outline-variant text-primary focus:ring-primary h-5 w-5 cursor-pointer"
                      checked={formData.mostrar_en_cero}
                      onChange={(e) => setFormData({ ...formData, mostrar_en_cero: e.target.checked })}
                    />
                    <label htmlFor="mostrar_en_cero" className="text-body-base font-semibold text-on-surface cursor-pointer select-none">
                      Mostrar en la boleta de pago aunque el valor calculado sea Q 0.00
                    </label>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <input 
                      type="checkbox" 
                      id="activo"
                      className="rounded border-outline-variant text-primary focus:ring-primary h-5 w-5 cursor-pointer"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    />
                    <label htmlFor="activo" className="text-body-base font-semibold text-on-surface cursor-pointer select-none">
                      Concepto habilitado y activo
                    </label>
                  </div>
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
                ¿Está seguro de que desea eliminar el concepto <strong>{itemToDelete.nombre}</strong> ({itemToDelete.codigo})?
              </p>
              <p className="text-body-sm text-on-surface-variant mt-2">
                Esta acción no se puede deshacer. Si el concepto ya fue utilizado en planillas históricas, la base de datos no permitirá su eliminación. Se recomienda marcar como "Inactivo" en la edición del concepto.
              </p>
            </div>

            <div className="p-6 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3 font-sans">
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
