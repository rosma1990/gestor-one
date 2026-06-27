"use client";

import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "@/lib/supabase/client";

interface Template {
  id: number;
  template_id: string;
  categoria: string;
  idioma: string;
  activo: boolean;
  notas: string | null;
  created_at: string;
}

interface Log {
  id: number;
  id_empleado: number | null;
  proveedor: string;
  plantilla: string;
  estado: string;
  id_mensaje: string | null;
  error: string | null;
  created_at: string;
  empleado: {
    nombre: string;
    apellido: string;
  } | null;
}

export default function ConfiguracionNotificaciones() {
  const [activeTab, setActiveTab] = useState<"templates" | "logs">("templates");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Log filter and pagination state
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos los Estados");
  const [logsPage, setLogsPage] = useState(1);
  const [totalLogsCount, setTotalLogsCount] = useState(0);

  // Stats state
  const [stats, setStats] = useState({
    deliveredToday: 0,
    failedToday: 0,
    activeTemplates: 0,
  });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    template_id: "",
    categoria: "Recibo de Pago",
    idioma: "Español",
    notas: "",
  });

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setLogsPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchStats = async () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];

      // Active templates count
      const { count: activeCount, error: activeErr } = await supabase
        .from("whatsapp_template")
        .select("*", { count: "exact", head: true })
        .eq("activo", true);

      if (activeErr) throw activeErr;

      // Deliveries today count
      const { count: delCount, error: delErr } = await supabase
        .from("whatsapp_log")
        .select("*", { count: "exact", head: true })
        .eq("estado", "ENVIADO")
        .gte("created_at", `${todayStr}T00:00:00Z`);

      if (delErr) throw delErr;

      // Errors today count
      const { count: errCount, error: errErr } = await supabase
        .from("whatsapp_log")
        .select("*", { count: "exact", head: true })
        .eq("estado", "FALLIDO")
        .gte("created_at", `${todayStr}T00:00:00Z`);

      if (errErr) throw errErr;

      setStats({
        deliveredToday: delCount || 0,
        failedToday: errCount || 0,
        activeTemplates: activeCount || 0,
      });
    } catch (err: any) {
      console.error("Error loading stats:", err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_template")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      console.error("Error fetching templates:", err);
      setStatusMessage({ type: "error", text: "Error al cargar plantillas: " + err.message });
    }
  };

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from("whatsapp_log")
        .select("*, empleado(nombre, apellido)", { count: "exact" });

      if (filterDate) {
        query = query.gte("created_at", `${filterDate}T00:00:00`)
                     .lte("created_at", `${filterDate}T23:59:59`);
      }

      if (filterStatus && filterStatus !== "Todos los Estados") {
        query = query.eq("estado", filterStatus.toUpperCase());
      }

      if (debouncedSearch) {
        query = query.or(`plantilla.ilike.%${debouncedSearch}%,proveedor.ilike.%${debouncedSearch}%,estado.ilike.%${debouncedSearch}%`);
      }

      const from = (logsPage - 1) * 10;
      const to = from + 9;

      const { data, error, count } = await query
        .range(from, to)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setLogs((data as unknown as Log[]) || []);
      setTotalLogsCount(count || 0);
    } catch (err: any) {
      console.error("Error fetching logs:", err);
      setStatusMessage({ type: "error", text: "Error al cargar registro de envíos: " + err.message });
    }
  };

  useEffect(() => {
    fetchStats();
    fetchTemplates();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [logsPage, debouncedSearch, filterDate, filterStatus]);

  // Handle template status toggle
  const handleToggleActive = async (id: number, currentVal: boolean) => {
    try {
      const { error } = await supabase
        .from("whatsapp_template")
        .update({ activo: !currentVal })
        .eq("id", id);

      if (error) throw error;

      // Update locally
      setTemplates(prev =>
        prev.map(t => (t.id === id ? { ...t, activo: !currentVal } : t))
      );
      fetchStats();
      setStatusMessage({ type: "success", text: "Estado de la plantilla actualizado." });
    } catch (err: any) {
      console.error("Error toggling template state:", err);
      setStatusMessage({ type: "error", text: "Error al actualizar estado: " + err.message });
    }
  };

  // Open creation modal
  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({
      template_id: "",
      categoria: "Recibo de Pago",
      idioma: "Español",
      notas: "",
    });
    setSelectedTemplate(null);
    setShowModal(true);
  };

  // Open edit modal
  const handleOpenEdit = (tpl: Template) => {
    setModalMode("edit");
    setSelectedTemplate(tpl);
    setFormData({
      template_id: tpl.template_id,
      categoria: tpl.categoria,
      idioma: tpl.idioma,
      notas: tpl.notas || "",
    });
    setShowModal(true);
  };

  // Save template handler
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.template_id || !formData.categoria || !formData.idioma) {
      setStatusMessage({ type: "error", text: "Los campos de ID, Categoría e Idioma son obligatorios." });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const payload = {
        template_id: formData.template_id.trim(),
        categoria: formData.categoria,
        idioma: formData.idioma,
        notas: formData.notas.trim() || null,
      };

      if (modalMode === "create") {
        const { error } = await supabase
          .from("whatsapp_template")
          .insert(payload);
        if (error) throw error;
        setStatusMessage({ type: "success", text: "Plantilla de notificación agregada con éxito." });
      } else {
        if (!selectedTemplate) return;
        const { error } = await supabase
          .from("whatsapp_template")
          .update(payload)
          .eq("id", selectedTemplate.id);
        if (error) throw error;
        setStatusMessage({ type: "success", text: "Plantilla de notificación actualizada con éxito." });
      }

      setShowModal(false);
      fetchTemplates();
      fetchStats();
    } catch (err: any) {
      console.error("Error saving template:", err);
      setStatusMessage({ type: "error", text: "Error al guardar plantilla: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Format delivery datetime helper
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Filter templates list by search term in memory
  const filteredTemplates = templates.filter(
    t =>
      t.template_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLogsPages = Math.ceil(totalLogsCount / 10) || 1;

  return (
    <div className="flex min-h-screen text-on-surface bg-background font-sans">
      <Sidebar activePage="configuracion" />

      {/* Main Content Area */}
      <div className="md:ml-64 flex flex-col min-h-screen flex-1 min-w-0">
        
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-section-gap py-4 z-30 bg-surface-container-lowest/80 backdrop-blur-md sticky top-0 border-b border-outline-variant">
          <div className="flex items-center flex-1 max-w-xl pl-12 md:pl-0">
            <div className="relative w-full focus-within:ring-2 focus-within:ring-primary rounded-lg transition-all">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                className="w-full bg-surface-container-low border-none pl-10 pr-4 py-2 rounded-lg text-body-sm font-body-sm focus:ring-0 focus:outline-none"
                placeholder="Buscar empleado, log o plantilla..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
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
                <p className="font-body-base font-bold text-on-surface">Admin User</p>
                <p className="text-[10px] tracking-wider text-on-surface-variant/80 uppercase font-semibold">Administrator</p>
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

        {/* Content Canvas */}
        <main className="p-4 md:p-8 flex-1 min-w-0">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Header Section */}
            <div>
              <h2 className="font-h1 text-h1 text-on-surface tracking-tight">Configuración de Notificaciones</h2>
              <p className="text-body-base text-secondary mt-1">Administre las plantillas de comunicación y supervise los registros de entrega.</p>
            </div>

            {/* Stats Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
              <div className="bg-surface-container-lowest p-4 border-t-4 border-primary rounded-xl shadow-sm border border-outline-variant">
                <p className="text-label-caps font-label-caps text-secondary uppercase mb-1">Entregas Hoy</p>
                <h3 className="text-h2 font-h2 text-on-surface">{stats.deliveredToday}</h3>
                <p className="text-[12px] text-primary flex items-center gap-1 mt-2">
                  <span className="material-symbols-outlined text-sm font-semibold">trending_up</span> +12% vs ayer
                </p>
              </div>

              <div className="bg-surface-container-lowest p-4 border-t-4 border-tertiary rounded-xl shadow-sm border border-outline-variant">
                <p className="text-label-caps font-label-caps text-secondary uppercase mb-1">Errores de Envío</p>
                <h3 className="text-h2 font-h2 text-on-surface">{stats.failedToday}</h3>
                <p className="text-[12px] text-error flex items-center gap-1 mt-2">
                  <span className="material-symbols-outlined text-sm font-semibold">warning</span> Acción requerida
                </p>
              </div>

              <div className="bg-surface-container-lowest p-4 border-t-4 border-primary-fixed-dim rounded-xl shadow-sm border border-outline-variant">
                <p className="text-label-caps font-label-caps text-secondary uppercase mb-1">Plantillas Activas</p>
                <h3 className="text-h2 font-h2 text-on-surface">{stats.activeTemplates}</h3>
                <p className="text-[12px] text-secondary mt-2">En 2 idiomas</p>
              </div>

              <div className="bg-surface-container-lowest p-4 border-t-4 border-secondary rounded-xl shadow-sm border border-outline-variant">
                <p className="text-label-caps font-label-caps text-secondary uppercase mb-1">Promedio Entrega</p>
                <h3 className="text-h2 font-h2 text-on-surface">1.2s</h3>
                <p className="text-[12px] text-secondary mt-2">WhatsApp / Email</p>
              </div>
            </div>

            {/* Tabbed Interface Container */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
              <div className="border-b border-outline-variant px-gutter bg-surface-container-low/40">
                <nav aria-label="Tabs" className="flex gap-8">
                  <button 
                    onClick={() => setActiveTab("templates")}
                    className={`py-4 px-1 font-body-base text-body-base transition-all border-b-2 cursor-pointer ${
                      activeTab === "templates" 
                        ? "border-primary text-primary font-semibold" 
                        : "border-transparent text-secondary font-medium hover:text-primary"
                    }`}
                  >
                    Plantillas de Notificación
                  </button>
                  <button 
                    onClick={() => setActiveTab("logs")}
                    className={`py-4 px-1 font-body-base text-body-base transition-all border-b-2 cursor-pointer ${
                      activeTab === "logs" 
                        ? "border-primary text-primary font-semibold" 
                        : "border-transparent text-secondary font-medium hover:text-primary"
                    }`}
                  >
                    Registro de Logs
                  </button>
                </nav>
              </div>

              {/* Tab 1: Notification Templates */}
              {activeTab === "templates" && (
                <div className="p-gutter space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-h3 text-h3 text-on-surface">Listado de Plantillas</h3>
                      <p className="text-body-sm text-secondary mt-0.5">Defina los formatos de mensaje para proveedores externos.</p>
                    </div>
                    <button 
                      onClick={handleOpenCreate}
                      className="bg-primary text-on-primary px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all shadow-sm font-semibold text-body-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Agregar Plantilla
                    </button>
                  </div>

                  <div className="overflow-x-auto custom-scrollbar border border-outline-variant rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low/50 border-b border-outline-variant text-label-caps text-secondary uppercase font-bold">
                          <th className="px-6 py-4">ID</th>
                          <th className="px-6 py-4">Provider Template ID</th>
                          <th className="px-6 py-4">Categoría</th>
                          <th className="px-6 py-4">Idioma</th>
                          <th className="px-6 py-4 text-center">Estado</th>
                          <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant text-body-base">
                        {filteredTemplates.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-secondary">
                              No se encontraron plantillas de notificación registradas.
                            </td>
                          </tr>
                        ) : (
                          filteredTemplates.map((tpl) => (
                            <tr key={tpl.id} className="hover:bg-surface-container-low/20 transition-colors">
                              <td className="px-6 py-4 font-data-tabular text-data-tabular">TPL-{String(tpl.id).padStart(3, "0")}</td>
                              <td className="px-6 py-4 font-body-base text-body-base font-semibold text-primary">{tpl.template_id}</td>
                              <td className="px-6 py-4 font-body-base text-body-base">{tpl.categoria}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                                  tpl.idioma.toUpperCase() === "ESPAÑOL" 
                                    ? "bg-secondary-container text-on-secondary-container" 
                                    : "bg-surface-variant text-on-secondary-fixed-variant"
                                }`}>
                                  {tpl.idioma.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={tpl.activo} 
                                    onChange={() => handleToggleActive(tpl.id, tpl.activo)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => handleOpenEdit(tpl)}
                                  className="text-secondary hover:text-primary transition-colors cursor-pointer"
                                  title="Editar"
                                >
                                  <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Notification Logs */}
              {activeTab === "logs" && (
                <div className="p-gutter space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="font-h3 text-h3 text-on-surface">Historial de Envíos</h3>
                      <p className="text-body-sm text-secondary mt-0.5">Trazabilidad completa de las notificaciones enviadas.</p>
                    </div>
                    
                    {/* Filters Bar */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <input 
                          type="date"
                          className="bg-surface border border-outline-variant rounded-lg px-3 py-1.5 text-body-sm focus:ring-primary focus:border-primary focus:outline-none"
                          value={filterDate}
                          onChange={(e) => {
                            setFilterDate(e.target.value);
                            setLogsPage(1);
                          }}
                        />
                      </div>
                      
                      <select 
                        className="bg-surface border border-outline-variant rounded-lg px-3 py-1.5 text-body-sm focus:ring-primary focus:border-primary focus:outline-none"
                        value={filterStatus}
                        onChange={(e) => {
                          setFilterStatus(e.target.value);
                          setLogsPage(1);
                        }}
                      >
                        <option>Todos los Estados</option>
                        <option>Enviado</option>
                        <option>Fallido</option>
                        <option>Pendiente</option>
                      </select>
                      
                      {(filterDate || filterStatus !== "Todos los Estados" || searchTerm) && (
                        <button 
                          onClick={() => {
                            setFilterDate("");
                            setFilterStatus("Todos los Estados");
                            setSearchTerm("");
                          }}
                          className="bg-surface border border-outline-variant text-secondary px-3 py-1.5 rounded-lg text-body-sm hover:bg-surface-container-low transition-colors cursor-pointer"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto custom-scrollbar border border-outline-variant rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low/50 border-b border-outline-variant text-label-caps text-secondary uppercase font-bold">
                          <th className="px-6 py-4">Log ID</th>
                          <th className="px-6 py-4">Empleado</th>
                          <th className="px-6 py-4">Proveedor</th>
                          <th className="px-6 py-4">Plantilla</th>
                          <th className="px-6 py-4">Estado</th>
                          <th className="px-6 py-4">ID Mensaje</th>
                          <th className="px-6 py-4">Error</th>
                          <th className="px-6 py-4">Fecha/Hora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant text-body-base">
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-secondary">
                              No se encontraron registros de entrega con los filtros seleccionados.
                            </td>
                          </tr>
                        ) : (
                          logs.map((log) => (
                            <tr key={log.id} className={`${log.estado === "FALLIDO" ? "bg-error-container/5 hover:bg-error-container/10" : "hover:bg-surface-container-low/20"} transition-colors`}>
                              <td className="px-6 py-4 font-data-tabular text-data-tabular">LOG-{String(log.id).padStart(5, "0")}</td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-on-surface">{log.empleado ? `${log.empleado.nombre} ${log.empleado.apellido}` : "Desconocido"}</span>
                                  <span className="text-[11px] text-outline">ID: EMP-{log.id_empleado ? String(log.id_empleado).padStart(3, "0") : "-"}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">{log.proveedor}</td>
                              <td className="px-6 py-4 font-medium text-primary">{log.plantilla}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                  log.estado === "ENVIADO" 
                                    ? "bg-primary/10 text-primary border-primary/20" 
                                    : log.estado === "FALLIDO"
                                    ? "bg-error/10 text-error border-error/20"
                                    : "bg-secondary/10 text-secondary border-secondary/20"
                                }`}>
                                  {log.estado}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-data-tabular text-data-tabular text-secondary truncate max-w-[120px]" title={log.id_mensaje || ""}>
                                {log.id_mensaje || "---"}
                              </td>
                              <td className={`px-6 py-4 text-body-sm font-medium ${log.estado === "FALLIDO" ? "text-error" : "text-outline"}`}>
                                {log.error || "N/A"}
                              </td>
                              <td className="px-6 py-4 font-data-tabular text-data-tabular text-secondary">
                                {formatDateTime(log.created_at)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex justify-between items-center">
                    <p className="text-body-sm text-secondary">
                      Mostrando {logs.length > 0 ? (logsPage - 1) * 10 + 1 : 0}-{Math.min(logsPage * 10, totalLogsCount)} de {totalLogsCount} registros
                    </p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                        disabled={logsPage === 1}
                        className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined">chevron_left</span>
                      </button>
                      
                      {Array.from({ length: totalLogsPages }, (_, idx) => idx + 1).map((pg) => (
                        <button
                          key={pg}
                          onClick={() => setLogsPage(pg)}
                          className={`px-4 py-2 rounded-lg text-body-sm font-bold cursor-pointer transition-colors ${
                            logsPage === pg
                              ? "bg-primary text-on-primary"
                              : "border border-outline-variant hover:bg-surface-container-low"
                          }`}
                        >
                          {pg}
                        </button>
                      ))}

                      <button 
                        onClick={() => setLogsPage(prev => Math.min(totalLogsPages, prev + 1))}
                        disabled={logsPage === totalLogsPages}
                        className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* Template Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-xl shadow-xl border border-outline-variant overflow-hidden transform scale-100 transition-all duration-300">
            
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/35">
              <h4 className="font-h3 text-h3 text-on-surface">
                {modalMode === "create" ? "Agregar Plantilla" : "Editar Plantilla"}
              </h4>
              <button 
                className="text-secondary hover:text-error transition-colors cursor-pointer flex items-center justify-center"
                onClick={() => setShowModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveTemplate}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-label-caps font-label-caps text-secondary mb-1">PROVIDER TEMPLATE ID *</label>
                  <input 
                    className="w-full border border-outline-variant rounded-lg px-4 py-2 text-body-base focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
                    placeholder="Ej: wa_template_name"
                    type="text"
                    required
                    value={formData.template_id}
                    onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-label-caps font-label-caps text-secondary mb-1">CATEGORÍA *</label>
                    <div className="relative">
                      <select 
                        className="w-full border border-outline-variant rounded-lg py-2 px-3 pr-10 text-body-base focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none appearance-none bg-transparent"
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      >
                        <option>Recibo de Pago</option>
                        <option>Aviso de Transferencia</option>
                        <option>Constancia Laboral</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-2 text-secondary pointer-events-none">expand_more</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-label-caps font-label-caps text-secondary mb-1">IDIOMA *</label>
                    <div className="relative">
                      <select 
                        className="w-full border border-outline-variant rounded-lg py-2 px-3 pr-10 text-body-base focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none appearance-none bg-transparent"
                        value={formData.idioma}
                        onChange={(e) => setFormData({ ...formData, idioma: e.target.value })}
                      >
                        <option>Español</option>
                        <option>Inglés</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-2 text-secondary pointer-events-none">expand_more</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps font-label-caps text-secondary mb-1">NOTAS INTERNAS</label>
                  <textarea 
                    className="w-full border border-outline-variant rounded-lg px-4 py-2 text-body-base focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none h-24 min-h-[80px]"
                    placeholder="Describa el propósito de esta plantilla..."
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="p-6 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
                <button 
                  type="button"
                  className="px-4 py-2 text-secondary font-medium hover:text-on-surface transition-colors cursor-pointer"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold shadow-md hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {modalMode === "create" ? "Guardar Plantilla" : "Actualizar Plantilla"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
