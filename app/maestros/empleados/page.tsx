"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { supabase } from "@/lib/supabase/client";

interface Departamento {
  id_departamento: number;
  nombre: string;
  empresa: {
    nombre: string;
  } | null;
}

interface Empleado {
  id_empleado: number;
  nombre: string;
  apellido: string;
  cui: string | null;
  nit: string | null;
  puesto: string | null;
  fecha_ingreso: string | null;
  telefono: string | null;
  activo: boolean;
  id_departamento: number;
  departamento: {
    nombre: string;
    empresa: {
      nombre: string;
    } | null;
  } | null;
  cuenta_bancaria_empleado?: {
    id_cuenta: number;
    id_empleado: number;
    banco: string;
    numero_cuenta: string;
    principal: boolean;
    activa: boolean;
    tipo_cuenta: string;
  }[];
}

export default function EmpleadosCRUD() {
  const [data, setData] = useState<Empleado[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [bancos, setBancos] = useState<{ id_banco: number; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const [departamentoFilter, setDepartamentoFilter] = useState("TODOS");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<Empleado | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    cui: "",
    nit: "",
    puesto: "",
    fecha_ingreso: "",
    telefono: "",
    activo: true,
    id_departamento: "",
    banco_nombre: "",
    banco_cuenta: "",
    banco_tipo: "monetario"
  });

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Empleado | null>(null);

  // Digital Signature Modal State
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(null);
  const [generatedLinkData, setGeneratedLinkData] = useState<{ localUrl: string; localhostUrl: string } | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);

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
      const [depRes, banRes] = await Promise.all([
        supabase
          .from("departamento")
          .select("id_departamento, nombre, empresa(nombre)")
          .order("nombre", { ascending: true }),
        supabase
          .from("banco")
          .select("id_banco, nombre")
          .eq("activo", true)
          .order("nombre", { ascending: true })
      ]);

      if (depRes.error) throw depRes.error;
      if (banRes.error) throw banRes.error;

      setDepartamentos((depRes.data as unknown as Departamento[]) || []);
      setBancos((banRes.data as { id_banco: number; nombre: string }[]) || []);
    } catch (err: any) {
      console.error("Error loading initial data for select options:", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("empleado")
        .select("*, departamento(nombre, empresa(nombre)), cuenta_bancaria_empleado(*)", { count: "exact" });

      if (debouncedSearch) {
        query = query.or(`nombre.ilike.%${debouncedSearch}%,apellido.ilike.%${debouncedSearch}%,puesto.ilike.%${debouncedSearch}%`);
      }

      if (estadoFilter !== "TODOS") {
        query = query.eq("activo", estadoFilter === "ACTIVO");
      }

      if (departamentoFilter !== "TODOS") {
        query = query.eq("id_departamento", parseInt(departamentoFilter));
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: result, error, count } = await query
        .range(from, to)
        .order("id_empleado", { ascending: true });

      if (error) throw error;
      
      setData((result as unknown as Empleado[]) || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error("Error fetching empleados:", err);
      setStatusMessage({ type: "error", text: "Error al cargar empleados: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, debouncedSearch, estadoFilter, departamentoFilter]);

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({
      nombre: "",
      apellido: "",
      cui: "",
      nit: "",
      puesto: "",
      fecha_ingreso: new Date().toISOString().split("T")[0],
      telefono: "",
      activo: true,
      id_departamento: departamentos.length > 0 ? departamentos[0].id_departamento.toString() : "",
      banco_nombre: bancos.length > 0 ? bancos[0].nombre : "",
      banco_cuenta: "",
      banco_tipo: "monetario"
    });
    setSelectedItem(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: Empleado) => {
    setModalMode("edit");
    setSelectedItem(item);

    const mainAcct = item.cuenta_bancaria_empleado?.find((a: any) => a.principal && a.activa) || 
                     item.cuenta_bancaria_empleado?.find((a: any) => a.activa) || 
                     item.cuenta_bancaria_empleado?.[0];

    setFormData({
      nombre: item.nombre || "",
      apellido: item.apellido || "",
      cui: item.cui || "",
      nit: item.nit || "",
      puesto: item.puesto || "",
      fecha_ingreso: item.fecha_ingreso || "",
      telefono: item.telefono || "",
      activo: item.activo ?? true,
      id_departamento: item.id_departamento?.toString() || "",
      banco_nombre: mainAcct?.banco || (bancos.length > 0 ? bancos[0].nombre : ""),
      banco_cuenta: mainAcct?.numero_cuenta || "",
      banco_tipo: mainAcct?.tipo_cuenta || "monetario"
    });
    setShowModal(true);
  };

  const handleOpenDelete = (item: Empleado) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.id_departamento) {
      setStatusMessage({ type: "error", text: "El nombre, apellido y departamento son requeridos." });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const payload = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        cui: formData.cui || null,
        nit: formData.nit || null,
        puesto: formData.puesto || null,
        fecha_ingreso: formData.fecha_ingreso || null,
        telefono: formData.telefono || null,
        activo: formData.activo,
        id_departamento: parseInt(formData.id_departamento)
      };

      let empId = selectedItem?.id_empleado;

      if (modalMode === "create") {
        const { data: newEmp, error } = await supabase
          .from("empleado")
          .insert(payload)
          .select("id_empleado")
          .single();
        if (error) throw error;
        empId = newEmp.id_empleado;
        setStatusMessage({ type: "success", text: "Empleado agregado con éxito." });
      } else {
        if (!selectedItem) return;
        const { error } = await supabase
          .from("empleado")
          .update(payload)
          .eq("id_empleado", selectedItem.id_empleado);
        if (error) throw error;
        setStatusMessage({ type: "success", text: "Empleado actualizado con éxito." });
      }

      // Handle bank account information
      if (empId) {
        const existingAcct = selectedItem?.cuenta_bancaria_empleado?.find((a: any) => a.principal && a.activa) || 
                             selectedItem?.cuenta_bancaria_empleado?.find((a: any) => a.activa) || 
                             selectedItem?.cuenta_bancaria_empleado?.[0];

        if (formData.banco_cuenta.trim()) {
          if (existingAcct) {
            // Update existing bank account
            const { error: acctErr } = await supabase
              .from("cuenta_bancaria_empleado")
              .update({
                banco: formData.banco_nombre,
                numero_cuenta: formData.banco_cuenta.trim(),
                tipo_cuenta: formData.banco_tipo,
                principal: true,
                activa: true
              })
              .eq("id_cuenta", existingAcct.id_cuenta);
            if (acctErr) throw acctErr;
          } else {
            // Insert new bank account
            const { error: acctErr } = await supabase
              .from("cuenta_bancaria_empleado")
              .insert({
                id_empleado: empId,
                banco: formData.banco_nombre,
                numero_cuenta: formData.banco_cuenta.trim(),
                tipo_cuenta: formData.banco_tipo,
                principal: true,
                activa: true
              });
            if (acctErr) throw acctErr;
          }
        } else if (existingAcct) {
          // If the account number was cleared, delete the existing record
          const { error: acctErr } = await supabase
            .from("cuenta_bancaria_empleado")
            .delete()
            .eq("id_cuenta", existingAcct.id_cuenta);
          if (acctErr) throw acctErr;
        }
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error("Error saving empleado:", err);
      setStatusMessage({ type: "error", text: "Error al guardar empleado: " + err.message });
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const { error } = await supabase
        .from("empleado")
        .delete()
        .eq("id_empleado", itemToDelete.id_empleado);

      if (error) throw error;

      setStatusMessage({ type: "success", text: "Empleado eliminado con éxito." });
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      if (data.length === 1 && page > 1) {
        setPage(p => p - 1);
      } else {
        fetchData();
      }
    } catch (err: any) {
      console.error("Error deleting empleado:", err);
      setStatusMessage({ 
        type: "error", 
        text: "Error al eliminar empleado: " + (err.message.includes("violates foreign key constraint") 
          ? "No se puede eliminar porque tiene constancias de pago generadas en el sistema. Considere marcar el empleado como Inactivo." 
          : err.message)
      });
      setShowDeleteConfirm(false);
      setLoading(false);
    }
  };

  // Digital Signature Flow
  const requestSignature = async (empleado: Empleado) => {
    setGeneratingToken(true);
    try {
      const response = await fetch("/api/signature-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id_empleado: empleado.id_empleado }),
      });
      const data = await response.json();
      if (response.ok && data.localUrl) {
        setGeneratedLinkData({
          localUrl: data.localUrl,
          localhostUrl: data.localhostUrl,
        });
        setSelectedEmployee(empleado);
        setShowSignatureModal(true);
      } else {
        alert("Error al generar el token de firma: " + (data.error || "Respuesta inválida"));
      }
    } catch (err) {
      console.error(err);
      alert("Error de red al intentar generar el token.");
    } finally {
      setGeneratingToken(false);
    }
  };

  // Send Whatsapp message helper
  const handleSendWhatsApp = (item: Empleado) => {
    const phone = item.telefono?.replace(/\D/g, "");
    if (!phone) {
      alert("Este empleado no tiene número de teléfono válido registrado.");
      return;
    }
    const mensaje = encodeURIComponent(
      `Hola ${item.nombre}, le escribimos de Importaciones CRESGO. Le compartimos su comprobante de pago`
    );
    window.open(`https://wa.me/502${phone}?text=${mensaje}`, "_blank");
  };

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="flex min-h-screen text-on-surface bg-background">
      <Sidebar activePage="empleados" />

      {/* Main Content Area */}
      <div className="md:ml-64 flex flex-col min-h-screen flex-1 min-w-0">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-section-gap py-4 z-30 bg-surface-container-lowest/80 backdrop-blur-md sticky top-0 border-b border-outline-variant">
          <div className="flex items-center gap-4 flex-1 pl-12 md:pl-0">
            <span className="font-h3 text-h3 font-bold text-primary">Catálogo de Empleados</span>
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
                <h1 className="font-h2 text-h2 text-on-surface tracking-tight">Empleados</h1>
                <p className="text-body-sm text-on-surface-variant">Gestione la nómina de colaboradores y firmas de constancias.</p>
              </div>
              <button 
                onClick={handleOpenCreate}
                disabled={departamentos.length === 0}
                className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 shadow-sm transition-opacity cursor-pointer text-body-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Agregar Empleado
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl shadow-sm flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[240px]">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">search</span>
                  </span>
                  <input
                    className="w-full pl-10 pr-4 py-2 bg-background border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-body-sm focus:outline-none"
                    placeholder="Filtrar por nombre, apellido o puesto..."
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <select 
                  className="bg-background border border-outline-variant rounded-lg px-4 py-2 text-body-sm focus:ring-primary focus:border-primary focus:outline-none"
                  value={departamentoFilter}
                  onChange={(e) => { setDepartamentoFilter(e.target.value); setPage(1); }}
                >
                  <option value="TODOS">Todos los Departamentos</option>
                  {departamentos.map(dep => (
                    <option key={dep.id_departamento} value={dep.id_departamento}>{dep.nombre}</option>
                  ))}
                </select>

                <select 
                  className="bg-background border border-outline-variant rounded-lg px-4 py-2 text-body-sm focus:ring-primary focus:border-primary focus:outline-none"
                  value={estadoFilter}
                  onChange={(e) => { setEstadoFilter(e.target.value); setPage(1); }}
                >
                  <option value="TODOS">Todos los Estados</option>
                  <option value="ACTIVO">Estado: Activo</option>
                  <option value="INACTIVO">Estado: Inactivo</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden border-t-4 border-t-primary">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/50 text-on-surface-variant border-b border-outline-variant text-label-caps">
                      <th className="px-6 py-4 font-bold">Empleado</th>
                      <th className="px-6 py-4 font-bold">CUI / NIT</th>
                      <th className="px-6 py-4 font-bold">Puesto</th>
                      <th className="px-6 py-4 font-bold">Teléfono</th>
                      <th className="px-6 py-4 font-bold">Departamento / Empresa</th>
                      <th className="px-6 py-4 font-bold text-center">Estado</th>
                      <th className="px-6 py-4 font-bold text-center">Constancia Firma</th>
                      <th className="px-6 py-4 font-bold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-body-base">
                    {loading && data.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span>Cargando empleados...</span>
                          </div>
                        </td>
                      </tr>
                    ) : data.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant">
                          No se encontraron empleados registrados.
                        </td>
                      </tr>
                    ) : (
                      data.map((item, index) => {
                        const initials = getInitials(item.nombre, item.apellido);
                        const avatarColors = [
                          "bg-primary-fixed text-on-primary-fixed",
                          "bg-secondary-fixed text-on-secondary-fixed",
                          "bg-tertiary-fixed text-on-tertiary-fixed",
                        ];
                        const avatarClass = avatarColors[index % 3];

                        const mainAcct = item.cuenta_bancaria_empleado?.find((a: any) => a.principal && a.activa) || 
                                         item.cuenta_bancaria_empleado?.find((a: any) => a.activa) || 
                                         item.cuenta_bancaria_empleado?.[0];

                        return (
                          <tr key={item.id_empleado} className="hover:bg-surface-container/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full ${avatarClass} flex items-center justify-center font-bold text-[12px] shadow-sm`}>
                                  {initials}
                                </div>
                                <div>
                                  <p className="font-data-tabular font-semibold text-on-surface">{item.nombre} {item.apellido}</p>
                                  <p className="text-[11px] text-on-surface-variant">EMP-{item.id_empleado.toString().padStart(4, "0")}</p>
                                  <p className="text-[11px] text-primary font-semibold mt-0.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">account_balance</span>
                                    {mainAcct ? `${mainAcct.banco} (${mainAcct.tipo_cuenta === "ahorro" ? "Ahorro" : "Monetario"}: ${mainAcct.numero_cuenta})` : "Sin cuenta bancaria"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-data-tabular font-medium text-on-surface text-sm">{item.cui || "-"}</p>
                              <p className="text-body-sm text-on-surface-variant">NIT: {item.nit || "-"}</p>
                            </td>
                            <td className="px-6 py-4 text-on-surface-variant text-sm font-semibold">{item.puesto || "-"}</td>
                            <td className="px-6 py-4 text-on-surface-variant font-data-tabular">{item.telefono || "-"}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col items-start gap-1">
                                <span className="text-[11px] font-bold text-on-surface-variant">
                                  {item.departamento?.empresa?.nombre || "-"}
                                </span>
                                <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded text-[11px] font-bold">
                                  {item.departamento?.nombre || "-"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {item.activo ? (
                                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[12px] font-bold ring-1 ring-primary/20">Activo</span>
                              ) : (
                                <span className="bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-[12px] font-bold ring-1 ring-slate-300">Inactivo</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => requestSignature(item)}
                                disabled={generatingToken || !item.activo}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-[12px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Generar enlace de firma digital"
                              >
                                <span className="material-symbols-outlined text-[16px]">draw</span>
                                <span>Enviar Firma</span>
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1">
                                <button 
                                  onClick={() => handleSendWhatsApp(item)}
                                  className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors cursor-pointer"
                                  title="Enviar WhatsApp"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                  </svg>
                                </button>
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
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="bg-surface-container-low px-6 py-4 flex justify-between items-center border-t border-outline-variant">
                <p className="text-body-sm text-on-surface-variant">
                  Mostrando {data.length} de {totalCount} empleados
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
                {modalMode === "create" ? "Agregar Nuevo Empleado" : "Editar Empleado"}
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
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Nombres *</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none" 
                    type="text" 
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Apellidos *</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none" 
                    type="text" 
                    required
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">CUI / Documento Identificación</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none font-data-tabular" 
                    type="text" 
                    value={formData.cui}
                    onChange={(e) => setFormData({ ...formData, cui: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">NIT</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none font-data-tabular" 
                    type="text" 
                    value={formData.nit}
                    onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Puesto de Trabajo</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none font-sans" 
                    type="text" 
                    value={formData.puesto}
                    onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Número de Teléfono</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none font-data-tabular" 
                    type="text" 
                    placeholder="8 dígitos"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 font-sans">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Fecha de Ingreso</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none" 
                    type="date" 
                    value={formData.fecha_ingreso}
                    onChange={(e) => setFormData({ ...formData, fecha_ingreso: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Departamento Relacionado *</label>
                  <div className="relative">
                    <select 
                      className="w-full border border-outline-variant rounded-lg focus:ring-primary focus:border-primary text-body-base appearance-none py-2 px-3 pr-10 bg-transparent focus:outline-none"
                      required
                      value={formData.id_departamento}
                      onChange={(e) => setFormData({ ...formData, id_departamento: e.target.value })}
                    >
                      {departamentos.map(dep => (
                        <option key={dep.id_departamento} value={dep.id_departamento}>
                          {dep.nombre} - ({dep.empresa?.nombre || "CRESGO"})
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 border-t border-outline-variant pt-4 mt-2">
                  <h4 className="font-h3 text-body-base font-bold text-primary mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">account_balance</span>
                    Información de Cuenta Bancaria
                  </h4>
                  <p className="text-[11px] text-on-surface-variant">Ingrese los datos bancarios para el depósito del sueldo.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Banco *</label>
                  <div className="relative">
                    <select 
                      className="w-full border border-outline-variant rounded-lg focus:ring-primary focus:border-primary text-body-base appearance-none py-2 px-3 pr-10 bg-transparent focus:outline-none"
                      value={formData.banco_nombre}
                      onChange={(e) => setFormData({ ...formData, banco_nombre: e.target.value })}
                    >
                      {bancos.map(b => (
                        <option key={b.id_banco} value={b.nombre}>
                          {b.nombre}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Número de Cuenta</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none font-data-tabular" 
                    type="text" 
                    placeholder="E.j. 00-00000-1"
                    value={formData.banco_cuenta}
                    onChange={(e) => setFormData({ ...formData, banco_cuenta: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Tipo de Cuenta</label>
                  <div className="relative">
                    <select 
                      className="w-full border border-outline-variant rounded-lg focus:ring-primary focus:border-primary text-body-base appearance-none py-2 px-3 pr-10 bg-transparent focus:outline-none"
                      value={formData.banco_tipo}
                      onChange={(e) => setFormData({ ...formData, banco_tipo: e.target.value })}
                    >
                      <option value="monetario">Monetaria</option>
                      <option value="ahorro">Ahorros</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 flex items-center gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    id="activo"
                    className="rounded border-outline-variant text-primary focus:ring-primary h-5 w-5 cursor-pointer"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  />
                  <label htmlFor="activo" className="text-body-base font-semibold text-on-surface cursor-pointer select-none">
                    Colaborador en estado Activo (para cálculo de planilla)
                  </label>
                </div>
              </div>

              <div className="p-6 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3 font-sans">
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
                ¿Está seguro de que desea eliminar al empleado <strong>{itemToDelete.nombre} {itemToDelete.apellido}</strong>?
              </p>
              <p className="text-body-sm text-on-surface-variant mt-2 font-sans">
                Esta acción no se puede deshacer. Si el colaborador posee nóminas, recibos o registros históricos guardados, Supabase bloqueará la eliminación directa. En dicho caso, le sugerimos desmarcar la casilla "Activo" en la edición del empleado.
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

      {/* QR / SIGNATURE LINK GENERATOR MODAL */}
      {showSignatureModal && selectedEmployee && generatedLinkData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm px-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-outline-variant animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="font-h2 text-h2 text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">draw</span>
                Solicitud de Firma
              </h3>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors flex items-center justify-center cursor-pointer text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-6 text-center">
              <div className="space-y-1">
                <p className="text-body-base font-bold text-on-surface text-lg">
                  {selectedEmployee.nombre} {selectedEmployee.apellido}
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  Puesto: {selectedEmployee.puesto || "No especificado"} • ID: {selectedEmployee.id_empleado}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center space-y-3 bg-surface-container-low p-5 rounded-xl border border-outline-variant">
                <span className="text-label-caps text-on-surface-variant uppercase tracking-wider font-bold">Escanee con el Celular</span>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-outline-variant">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(generatedLinkData.localUrl)}`}
                    alt="Código QR de Firma"
                    className="w-[180px] h-[180px] block"
                  />
                </div>
                <p className="text-[12px] text-on-surface-variant max-w-[260px] italic">
                  El teléfono debe estar en la misma red Wi-Fi para acceder al servidor de firma local.
                </p>
              </div>

              {/* Links and Actions */}
              <div className="space-y-3 text-left">
                <div className="space-y-1">
                  <span className="text-label-caps text-on-surface-variant uppercase tracking-wider font-bold text-[11px]">Enlace de Red Local</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLinkData.localUrl}
                      className="flex-1 bg-surface-container-low text-body-sm px-3 py-2 rounded-lg border border-outline-variant font-data-tabular focus:ring-0 focus:outline-none select-all text-xs"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLinkData.localUrl);
                        alert("¡Enlace de red local copiado!");
                      }}
                      className="bg-primary text-white p-2 rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                      title="Copiar enlace de red local"
                    >
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-label-caps text-on-surface-variant uppercase tracking-wider font-bold text-[11px]">Enlace Localhost (PC)</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLinkData.localhostUrl}
                      className="flex-1 bg-surface-container-low text-body-sm px-3 py-2 rounded-lg border border-outline-variant font-data-tabular focus:ring-0 focus:outline-none select-all text-xs"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLinkData.localhostUrl);
                        alert("¡Enlace localhost copiado!");
                      }}
                      className="bg-primary text-white p-2 rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                      title="Copiar enlace de localhost"
                    >
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-surface-container-low border-t border-outline-variant flex gap-3 font-sans">
              <button
                onClick={() => setShowSignatureModal(false)}
                className="w-full bg-white border border-outline-variant text-on-surface-variant py-3 rounded-lg font-bold hover:bg-surface-container-high transition-colors cursor-pointer text-body-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
