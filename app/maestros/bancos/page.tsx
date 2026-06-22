"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { supabase } from "@/lib/supabase/client";

interface Banco {
  id_banco: number;
  nombre: string;
  codigo: string | null;
  activo: boolean;
  separador: string;
  codificacion: string;
  incluye_encabezados: boolean;
  mapeo_campos: Array<{ csv_name: string; db_field: string }>;
  preferencias: {
    prefijo: string;
    tipo_eol: string;
    validar_cuenta: boolean;
  };
}

const defaultPreferencias = {
  prefijo: "Transferencias",
  tipo_eol: "Windows (CRLF)",
  validar_cuenta: true
};

const defaultMapping = [
  { csv_name: "CORRELATIVO", db_field: "Auto-incremental" },
  { csv_name: "NOMBRE_EMPLEADO", db_field: "Nombre Completo" },
  { csv_name: "TIPO_CUENTA", db_field: "Tipo de Cuenta" },
  { csv_name: "NUMERO_CUENTA", db_field: "Número de Cuenta" },
  { csv_name: "TOTAL_LIQUIDO", db_field: "Sueldo Líquido" },
  { csv_name: "COMENTARIO_PAGO", db_field: "Comentario Período" }
];

export default function BancosCRUD() {
  const [data, setData] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Selected bank for mapping panel
  const [selectedBankForMapping, setSelectedBankForMapping] = useState<Banco | null>(null);

  // Mapping Panel State
  const [configTab, setConfigTab] = useState<"estructura" | "preferencias">("estructura");
  const [mappingData, setMappingData] = useState<{
    separador: string;
    codificacion: string;
    incluye_encabezados: boolean;
    mapeo_campos: Array<{ csv_name: string; db_field: string }>;
    preferencias: {
      prefijo: string;
      tipo_eol: string;
      validar_cuenta: boolean;
    };
  }>({
    separador: "Coma (,)",
    codificacion: "UTF-8",
    incluye_encabezados: true,
    mapeo_campos: [],
    preferencias: defaultPreferencias
  });

  // Modal State (Create / Edit Bank metadata)
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<Banco | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    activo: true
  });

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Banco | null>(null);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("banco")
        .select("*", { count: "exact" });

      if (debouncedSearch) {
        query = query.or(`nombre.ilike.%${debouncedSearch}%,codigo.ilike.%${debouncedSearch}%`);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: result, error, count } = await query
        .range(from, to)
        .order("nombre", { ascending: true });

      if (error) throw error;
      
      const banks = (result as unknown as Banco[]) || [];
      setData(banks);
      setTotalCount(count || 0);

      // Default selection for mapping panel (first bank loaded)
      if (banks.length > 0) {
        // If there was already a selected bank, update its reference from the fresh data, otherwise pick first
        const active = selectedBankForMapping 
          ? banks.find(b => b.id_banco === selectedBankForMapping.id_banco) || banks[0]
          : banks[0];
        
        handleSelectBankForMapping(active);
      } else {
        setSelectedBankForMapping(null);
      }
    } catch (err: any) {
      console.error("Error fetching banks:", err);
      setStatusMessage({ type: "error", text: "Error al cargar bancos: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, debouncedSearch]);

  const handleSelectBankForMapping = (bank: Banco) => {
    setSelectedBankForMapping(bank);
    setMappingData({
      separador: bank.separador || "Coma (,)",
      codificacion: bank.codificacion || "UTF-8",
      incluye_encabezados: bank.incluye_encabezados ?? true,
      mapeo_campos: Array.isArray(bank.mapeo_campos) ? bank.mapeo_campos : [],
      preferencias: bank.preferencias || defaultPreferencias
    });
  };

  const getBankLogo = (code: string | null) => {
    const codeUpper = (code || "").toUpperCase().trim();
    if (codeUpper === "BAC") {
      return "https://lh3.googleusercontent.com/aida-public/AB6AXuDjNcjZB8G57iHwWWdXldBZ7TeiSmmGGMZxL48EH_b4N5pDry4QDHhUOil04TtVkadISjourYWlxOAilFArN5b56RfmPQjHdBkd9iZiTmR4lchIKmVGfKIZNl1vwyarPwlqjrGaVc0YfFeaJNqLd_F71d9V24Tw6P6GbXwTOHbEtowuEkmtTSn0dht8TjhetvgBN9_kgV7BCE7EPUeR9FByU69Z7cMwhHPRBpSyXc9uCFg8KUDqOQhkkGeLs06_M3S-ZDTrNm8ue3e_";
    }
    if (codeUpper === "BI") {
      return "https://lh3.googleusercontent.com/aida-public/AB6AXuDp82YB5URCf8Xu5IDRK04AuO8dP-Zm8f0caFo67x6sxKn8fXUSVnpwSXL0YW5q6rimTxORgV5yF7zRkO0YLZ0c9dfoxAa4mD90UBZJXg9Bbvymh1HJ_ZJ4Llj3wf7vTa8IHOI6_i3NC7CVBQVEOFbaUjq3RnZlWI2BHjzYSRkddYas8vXfq3PatOxmiA5Enh3ClIFPr89C-aCY8IkVvslj_lxQv4w563SzKVkSLamWjHXIoM0dJM50mSqbAomxMp7ZOUXpUUCFMJFC";
    }
    if (codeUpper === "BANRURAL") {
      return "https://lh3.googleusercontent.com/aida-public/AB6AXuAY-KmlL9G_7KXWKhqpIEy9HPIgkhVzLM21fSZZsKKJ2yStH94gPtkFUiy_-tB8JvUBY0G_tMiY4pDGzMpCCI4mU79ShSIfCg3P0NFn_WLU4DGyvqn972tgCWS6ltJplEQgBhH95XmpqNtXzi9nSKBTi7Ra67CHMZsfY__RvlSnk-f0CuCE58-tBCvxT9ndX7K4hvIcNxI5oI64tcz3jaI-NWKo1xrj51Rb09-fVYUocDXrtp_exNKqkMlqMK6MF5Mhjq5Jogtq--Hj";
    }
    if (codeUpper === "GYT") {
      return "https://lh3.googleusercontent.com/aida-public/AB6AXuDOma_W3IjtPd_62NkAocXr1B8BHxJXVx3HWYSS6-bMCtjmYZf0R426VJDysQfZ4uuuo8YwtF539mIDYLz_1sgvSNuNy99SqcyoXd3BbpNjjceFuFhHL3Os7EaKyQR6Cx_YucAHFcjnmHkFDmDjBWJESepj42NS8IeCXb5nCI3NIvvix9xmH3339YSvLBIFMhOJlLSfoNldYN6NGbD1UXNC6ST1Y5PogNBz_5aKllYZfgHf69oha89j5BNM0CUmGwK6kT5WMX0B9zsE";
    }
    return null;
  };

  const toggleActivo = async (id: number, currentVal: boolean) => {
    const newVal = !currentVal;
    // Optimistic UI update
    setData(prev => prev.map(b => b.id_banco === id ? { ...b, activo: newVal } : b));
    if (selectedBankForMapping?.id_banco === id) {
      setSelectedBankForMapping(prev => prev ? { ...prev, activo: newVal } : null);
    }

    try {
      const { error } = await supabase
        .from("banco")
        .update({ activo: newVal })
        .eq("id_banco", id);
      if (error) throw error;
      setStatusMessage({ type: "success", text: `Banco actualizado a ${newVal ? "Activo" : "Inactivo"}.` });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error("Error updating bank status:", err);
      // Revert local state
      setData(prev => prev.map(b => b.id_banco === id ? { ...b, activo: currentVal } : b));
      if (selectedBankForMapping?.id_banco === id) {
        setSelectedBankForMapping(prev => prev ? { ...prev, activo: currentVal } : null);
      }
      setStatusMessage({ type: "error", text: "Error al actualizar estado: " + err.message });
    }
  };

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({
      nombre: "",
      codigo: "",
      activo: true
    });
    setSelectedItem(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: Banco) => {
    setModalMode("edit");
    setSelectedItem(item);
    setFormData({
      nombre: item.nombre || "",
      codigo: item.codigo || "",
      activo: item.activo ?? true
    });
    setShowModal(true);
  };

  const handleOpenDelete = (item: Banco) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleSaveBankMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setStatusMessage({ type: "error", text: "El nombre del banco es obligatorio." });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      if (modalMode === "create") {
        const payload = {
          nombre: formData.nombre.trim(),
          codigo: formData.codigo.toUpperCase().trim() || null,
          activo: formData.activo,
          separador: "Coma (,)",
          codificacion: "UTF-8",
          incluye_encabezados: true,
          mapeo_campos: defaultMapping,
          preferencias: defaultPreferencias
        };
        const { error } = await supabase
          .from("banco")
          .insert(payload);
        if (error) throw error;
        setStatusMessage({ type: "success", text: "Banco agregado con éxito." });
      } else {
        if (!selectedItem) return;
        const payload = {
          nombre: formData.nombre.trim(),
          codigo: formData.codigo.toUpperCase().trim() || null,
          activo: formData.activo
        };
        const { error } = await supabase
          .from("banco")
          .update(payload)
          .eq("id_banco", selectedItem.id_banco);
        if (error) throw error;
        setStatusMessage({ type: "success", text: "Banco actualizado con éxito." });
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error("Error saving bank metadata:", err);
      setStatusMessage({ type: "error", text: "Error al guardar banco: " + err.message });
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const { error } = await supabase
        .from("banco")
        .delete()
        .eq("id_banco", itemToDelete.id_banco);

      if (error) throw error;

      setStatusMessage({ type: "success", text: "Banco eliminado con éxito." });
      setShowDeleteConfirm(false);
      
      if (selectedBankForMapping?.id_banco === itemToDelete.id_banco) {
        setSelectedBankForMapping(null);
      }
      
      setItemToDelete(null);
      if (data.length === 1 && page > 1) {
        setPage(p => p - 1);
      } else {
        fetchData();
      }
    } catch (err: any) {
      console.error("Error deleting bank:", err);
      setStatusMessage({ 
        type: "error", 
        text: "Error al eliminar banco: " + (err.message.includes("violates foreign key constraint") 
          ? "No se puede eliminar porque existen cuentas bancarias de empleados asociadas a este banco." 
          : err.message)
      });
      setShowDeleteConfirm(false);
      setLoading(false);
    }
  };

  // Mapping Field Adjustments
  const handleAddField = () => {
    setMappingData(prev => ({
      ...prev,
      mapeo_campos: [
        ...prev.mapeo_campos,
        { csv_name: "NUEVO_CAMPO", db_field: "Auto-incremental" }
      ]
    }));
  };

  const handleRemoveField = (index: number) => {
    setMappingData(prev => ({
      ...prev,
      mapeo_campos: prev.mapeo_campos.filter((_, idx) => idx !== index)
    }));
  };

  const handleFieldCsvNameChange = (index: number, value: string) => {
    setMappingData(prev => ({
      ...prev,
      mapeo_campos: prev.mapeo_campos.map((f, idx) => idx === index ? { ...f, csv_name: value } : f)
    }));
  };

  const handleFieldDbFieldChange = (index: number, value: string) => {
    setMappingData(prev => ({
      ...prev,
      mapeo_campos: prev.mapeo_campos.map((f, idx) => idx === index ? { ...f, db_field: value } : f)
    }));
  };

  const handleMoveField = (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= mappingData.mapeo_campos.length) return;
    setMappingData(prev => {
      const newFields = [...prev.mapeo_campos];
      const temp = newFields[index];
      newFields[index] = newFields[newIndex];
      newFields[newIndex] = temp;
      return {
        ...prev,
        mapeo_campos: newFields
      };
    });
  };

  const handleSaveMappingConfig = async () => {
    if (!selectedBankForMapping) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const { error } = await supabase
        .from("banco")
        .update({
          separador: mappingData.separador,
          codificacion: mappingData.codificacion,
          incluye_encabezados: mappingData.incluye_encabezados,
          mapeo_campos: mappingData.mapeo_campos,
          preferencias: mappingData.preferencias
        })
        .eq("id_banco", selectedBankForMapping.id_banco);

      if (error) throw error;

      setStatusMessage({ type: "success", text: "Configuración de mapeo guardada correctamente." });
      
      // Update local state to reflect DB updates
      setData(prev => prev.map(b => b.id_banco === selectedBankForMapping.id_banco ? {
        ...b,
        separador: mappingData.separador,
        codificacion: mappingData.codificacion,
        incluye_encabezados: mappingData.incluye_encabezados,
        mapeo_campos: mappingData.mapeo_campos,
        preferencias: mappingData.preferencias
      } : b));

      setSelectedBankForMapping(prev => prev ? {
        ...prev,
        separador: mappingData.separador,
        codificacion: mappingData.codificacion,
        incluye_encabezados: mappingData.incluye_encabezados,
        mapeo_campos: mappingData.mapeo_campos,
        preferencias: mappingData.preferencias
      } : null);

      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error("Error saving mapping configuration:", err);
      setStatusMessage({ type: "error", text: "Error al guardar configuración: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMappingConfig = () => {
    if (!selectedBankForMapping) return;
    setMappingData({
      separador: selectedBankForMapping.separador || "Coma (,)",
      codificacion: selectedBankForMapping.codificacion || "UTF-8",
      incluye_encabezados: selectedBankForMapping.incluye_encabezados ?? true,
      mapeo_campos: Array.isArray(selectedBankForMapping.mapeo_campos) ? selectedBankForMapping.mapeo_campos : [],
      preferencias: selectedBankForMapping.preferencias || defaultPreferencias
    });
    setStatusMessage({ type: "success", text: "Cambios descartados." });
    setTimeout(() => setStatusMessage(null), 2000);
  };

  // Generate dynamic colored code elements for the preview sample row
  const generateSampleLine = () => {
    if (!mappingData.mapeo_campos || mappingData.mapeo_campos.length === 0) {
      return <span className="text-on-surface-variant italic">Ningún campo configurado</span>;
    }

    const isBI = selectedBankForMapping?.codigo?.toUpperCase().trim() === "BI" ||
                 selectedBankForMapping?.nombre?.toLowerCase().includes("industrial");

    const getSampleValue = (dbField: string) => {
      if (dbField === "Tipo de Cuenta") {
        const dbValue = "monetario"; // Default mock account type value
        if (isBI) {
          return dbValue === "monetario" ? 1 : 2;
        }
        return dbValue === "monetario" ? "Monetaria" : "Ahorros";
      }

      const sampleValues: { [key: string]: string | number } = {
        "Auto-incremental": 1,
        "Nombre Completo": "JUAN PEREZ GARCIA",
        "Primer Nombre": "JUAN",
        "Primer Apellido": "PEREZ",
        "Moneda": "GTQ",
        "Banco": selectedBankForMapping?.nombre || "BAC Credomatic",
        "Número de Cuenta": "1234567890",
        "DPI": "2999123450101",
        "NIT": "1234567-8",
        "Sueldo Líquido": 4500.50,
        "Sueldo Base": 5000.00,
        "Bonificación Ley": 250.00,
        "Comentario Período": "Segunda Quincena Mayo 2026",
        "Fecha de Pago": "2026-06-15",
        "Nombre Empresa": "Importaciones CRESGO"
      };

      return sampleValues[dbField] ?? "Valor";
    };

    let separator = ",";
    if (mappingData.separador.includes("Punto")) {
      separator = ";";
    } else if (mappingData.separador.includes("Tabulador")) {
      separator = "\t";
    }

    return mappingData.mapeo_campos.map((field, idx) => {
      const val = getSampleValue(field.db_field);
      const formattedVal = typeof val === "number"
        ? (["Sueldo Líquido", "Sueldo Base", "Bonificación Ley"].includes(field.db_field) ? val.toFixed(2) : val.toString())
        : `"${val}"`;
      
      let colorClass = "text-primary-fixed-dim";
      if (field.db_field === "Auto-incremental") {
        colorClass = "text-tertiary-fixed-dim";
      } else if (["Sueldo Líquido", "Sueldo Base", "Bonificación Ley"].includes(field.db_field)) {
        colorClass = "text-primary-fixed";
      } else if (["Número de Cuenta", "Tipo de Cuenta", "Moneda", "Banco"].includes(field.db_field)) {
        colorClass = "text-surface-variant";
      }

      return (
        <span key={idx}>
          <span className={colorClass}>{formattedVal}</span>
          {idx < mappingData.mapeo_campos.length - 1 && separator}
        </span>
      );
    });
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="flex min-h-screen text-on-surface bg-background font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #bfcabb; border-radius: 10px; }
      `}} />

      <Sidebar activePage="bancos" />

      {/* Main Workspace */}
      <main className="md:ml-64 flex flex-col min-h-screen flex-1 min-w-0">
        {/* TopAppBar */}
        <header className="flex justify-between items-center w-full px-section-gap py-component-padding-y z-30 bg-surface-container-lowest/80 backdrop-blur-md sticky top-0 border-b border-outline-variant">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 hover:bg-surface-variant rounded-full">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="text-h3 font-h3 font-bold text-primary">Catálogo de Bancos</h2>
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

            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60">search</span>
              <input 
                className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-full text-body-sm focus:ring-2 focus:ring-primary w-64 transition-all focus:outline-none" 
                placeholder="Buscar banco..." 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button className="hover:bg-surface-variant/50 rounded-full p-2 transition-colors relative">
                <span className="material-symbols-outlined text-on-secondary-container">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
              </button>
              <button className="hover:bg-surface-variant/50 rounded-full p-2 transition-colors">
                <span className="material-symbols-outlined text-on-secondary-container">help</span>
              </button>
            </div>
            
            <div className="h-8 w-[1px] bg-outline-variant mx-2"></div>
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden lg:block">
                <p className="text-body-sm font-bold leading-none">Admin CRESGO</p>
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Superuser</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto max-h-[calc(100vh-64px)]">
          {/* Left: Bank List */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="font-h2 text-h2 text-on-surface font-bold">Bancos Registrados</h1>
                <p className="text-body-base text-on-surface-variant">Gestione las instituciones bancarias autorizadas para transferencias de nómina.</p>
              </div>
              <button 
                onClick={handleOpenCreate}
                className="bg-primary hover:bg-primary/90 text-on-primary px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer text-body-sm"
              >
                <span className="material-symbols-outlined">add</span>
                Agregar Banco
              </button>
            </div>

            {/* List Card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="px-6 py-4 text-label-caps text-on-surface-variant uppercase tracking-widest">Institución</th>
                      <th className="px-6 py-4 text-label-caps text-on-surface-variant uppercase tracking-widest text-center">Estado</th>
                      <th className="px-6 py-4 text-label-caps text-on-surface-variant uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {loading && data.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-on-surface-variant">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span>Cargando bancos...</span>
                          </div>
                        </td>
                      </tr>
                    ) : data.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-on-surface-variant">
                          No se encontraron bancos registrados.
                        </td>
                      </tr>
                    ) : (
                      data.map((item) => {
                        const logoUrl = getBankLogo(item.codigo);
                        const isSelected = selectedBankForMapping?.id_banco === item.id_banco;
                        return (
                          <tr 
                            key={item.id_banco} 
                            className={`hover:bg-surface-container transition-colors group ${
                              isSelected ? "bg-surface-container/60" : ""
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center p-2 border border-outline-variant overflow-hidden">
                                  {logoUrl ? (
                                    <img className="w-full h-full object-contain" src={logoUrl} alt={item.nombre} />
                                  ) : (
                                    <span className="material-symbols-outlined text-primary text-2xl select-none">account_balance</span>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-primary">{item.codigo || "-"}</p>
                                  <p className="text-body-sm text-on-surface-variant">{item.nombre}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  checked={item.activo} 
                                  onChange={() => toggleActivo(item.id_banco, item.activo)}
                                  className="sr-only peer" 
                                  type="checkbox"
                                />
                                <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                <span className="ml-3 text-body-sm font-medium text-primary">{item.activo ? "Activo" : "Inactivo"}</span>
                              </label>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  className={`p-2 rounded-lg transition-colors border ${
                                    isSelected 
                                      ? "bg-primary/20 text-primary border-primary/30" 
                                      : "text-on-secondary-container hover:bg-primary/10 hover:text-primary border-transparent hover:border-primary/20"
                                  }`} 
                                  onClick={() => handleSelectBankForMapping(item)}
                                  title="Configurar Mapeo"
                                >
                                  <span className="material-symbols-outlined">settings_input_component</span>
                                </button>
                                <button 
                                  className="p-2 text-on-secondary-container hover:bg-primary/10 hover:text-primary rounded-lg transition-colors border border-transparent hover:border-primary/20"
                                  onClick={() => handleOpenEdit(item)}
                                  title="Editar Banco"
                                >
                                  <span className="material-symbols-outlined">edit</span>
                                </button>
                                <button 
                                  className="p-2 text-on-secondary-container hover:bg-error/10 hover:text-error rounded-lg transition-colors"
                                  onClick={() => handleOpenDelete(item)} 
                                  title="Eliminar"
                                >
                                  <span className="material-symbols-outlined">delete</span>
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
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex justify-between items-center">
                  <p className="text-body-sm text-on-surface-variant">
                    Mostrando {data.length} de {totalCount} bancos registrados
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-1.5 border border-outline-variant rounded text-body-sm disabled:opacity-50 hover:bg-surface-container transition-colors bg-surface-container-lowest font-semibold cursor-pointer"
                    >
                      Anterior
                    </button>
                    <button className="px-4 py-1.5 border border-outline-variant rounded text-body-sm bg-surface-container-lowest font-bold">
                      {page}
                    </button>
                    <button 
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-4 py-1.5 border border-outline-variant rounded text-body-sm disabled:opacity-50 hover:bg-surface-container transition-colors bg-surface-container-lowest font-semibold cursor-pointer"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Dynamic Field Mapping Configuration */}
          <div className="lg:col-span-5 space-y-6">
            {selectedBankForMapping ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <span className="material-symbols-outlined">settings_input_component</span>
                  </div>
                  <div>
                    <h2 className="font-h3 text-h3 text-on-surface">Mapeo de CSV Export</h2>
                    <p className="text-body-sm text-on-surface-variant">
                      Configuración técnica de salida para{" "}
                      <span className="font-bold text-primary" id="current-bank">
                        {selectedBankForMapping.nombre}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                  {/* Config Tabs */}
                  <div className="flex border-b border-outline-variant bg-surface-container-low">
                    <button 
                      onClick={() => setConfigTab("estructura")}
                      className={`px-6 py-3 text-body-sm font-bold transition-all border-b-2 cursor-pointer ${
                        configTab === "estructura" 
                          ? "border-primary text-primary" 
                          : "border-transparent text-on-surface-variant hover:text-primary"
                      }`}
                    >
                      Estructura
                    </button>
                    <button 
                      onClick={() => setConfigTab("preferencias")}
                      className={`px-6 py-3 text-body-sm font-bold transition-all border-b-2 cursor-pointer ${
                        configTab === "preferencias" 
                          ? "border-primary text-primary" 
                          : "border-transparent text-on-surface-variant hover:text-primary"
                      }`}
                    >
                      Preferencias
                    </button>
                  </div>

                  <div className="p-6 space-y-6 custom-scrollbar overflow-y-auto max-h-[600px]">
                    {configTab === "estructura" ? (
                      <>
                        {/* Format fields */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-label-caps text-on-surface-variant">Separador</label>
                            <select 
                              value={mappingData.separador}
                              onChange={(e) => setMappingData({ ...mappingData, separador: e.target.value })}
                              className="w-full bg-surface-container-low border-outline-variant rounded-lg text-body-sm focus:ring-primary focus:border-primary py-2 px-3 focus:outline-none"
                            >
                              <option>Coma (,)</option>
                              <option>Punto y Coma (;)</option>
                              <option>Tabulador (\t)</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-label-caps text-on-surface-variant">Codificación</label>
                            <select 
                              value={mappingData.codificacion}
                              onChange={(e) => setMappingData({ ...mappingData, codificacion: e.target.value })}
                              className="w-full bg-surface-container-low border-outline-variant rounded-lg text-body-sm focus:ring-primary focus:border-primary py-2 px-3 focus:outline-none"
                            >
                              <option>UTF-8</option>
                              <option>ANSI / Windows-1252</option>
                              <option>ISO-8859-1</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input 
                            checked={mappingData.incluye_encabezados} 
                            onChange={(e) => setMappingData({ ...mappingData, incluye_encabezados: e.target.checked })}
                            className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer" 
                            id="headers" 
                            type="checkbox"
                          />
                          <label className="text-body-sm text-on-surface cursor-pointer select-none" htmlFor="headers">
                            Incluir encabezados en el archivo
                          </label>
                        </div>

                        {/* Mapping Fields Area */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-label-caps text-on-surface-variant">Orden y Mapeo de Campos</label>
                            <button 
                              onClick={handleAddField}
                              className="text-primary text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">add_circle</span>
                              Añadir Campo
                            </button>
                          </div>

                          <div className="space-y-2" id="mapping-container">
                            {mappingData.mapeo_campos.map((field, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center gap-3 bg-surface-container-low p-3 rounded-lg border border-outline-variant group hover:shadow-md transition-all duration-200"
                              >
                                <span className="material-symbols-outlined text-outline cursor-move opacity-40 group-hover:opacity-100 select-none">
                                  drag_indicator
                                </span>
                                
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                  <input 
                                    className="bg-surface-container-lowest border-outline-variant rounded text-body-sm font-mono focus:ring-primary py-1.5 px-2 focus:outline-none" 
                                    placeholder="Nombre en CSV" 
                                    type="text" 
                                    value={field.csv_name}
                                    onChange={(e) => handleFieldCsvNameChange(idx, e.target.value)}
                                  />
                                  <select 
                                    value={field.db_field}
                                    onChange={(e) => handleFieldDbFieldChange(idx, e.target.value)}
                                    className="bg-surface-container-lowest border-outline-variant rounded text-body-sm focus:ring-primary py-1.5 px-2 focus:outline-none"
                                  >
                                    <option>Auto-incremental</option>
                                    <option>ID Empleado</option>
                                    <option>Nombre Completo</option>
                                    <option>Primer Nombre</option>
                                    <option>Primer Apellido</option>
                                    <option>Tipo de Cuenta</option>
                                    <option>Moneda</option>
                                    <option>Banco</option>
                                    <option>Número de Cuenta</option>
                                    <option>DPI</option>
                                    <option>NIT</option>
                                    <option>Sueldo Líquido</option>
                                    <option>Sueldo Base</option>
                                    <option>Bonificación Ley</option>
                                    <option>Comentario Período</option>
                                    <option>Fecha de Pago</option>
                                    <option>Nombre Empresa</option>
                                  </select>
                                </div>

                                <div className="flex gap-1.5">
                                  <button 
                                    disabled={idx === 0}
                                    onClick={() => handleMoveField(idx, -1)}
                                    className="text-secondary hover:text-primary disabled:opacity-20 cursor-pointer flex items-center"
                                    title="Subir"
                                  >
                                    <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                  </button>
                                  <button 
                                    disabled={idx === mappingData.mapeo_campos.length - 1}
                                    onClick={() => handleMoveField(idx, 1)}
                                    className="text-secondary hover:text-primary disabled:opacity-20 cursor-pointer flex items-center"
                                    title="Bajar"
                                  >
                                    <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                  </button>
                                </div>

                                <button 
                                  onClick={() => handleRemoveField(idx)}
                                  className="text-error opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Preview Section */}
                        <div className="pt-6 border-t border-outline-variant">
                          <label className="text-label-caps text-on-surface-variant flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            Vista Previa de Fila (Sample)
                          </label>
                          <div className="bg-inverse-surface text-inverse-on-surface p-4 rounded-lg font-mono text-[12px] break-all leading-relaxed shadow-inner overflow-x-auto whitespace-nowrap">
                            {generateSampleLine()}
                          </div>
                          <p className="mt-2 text-[10px] text-on-surface-variant italic">
                            Los datos mostrados son ficticios para propósitos de visualización de estructura.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Preferences Tab */}
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="block text-label-caps text-on-surface-variant">Prefijo del Nombre del Archivo</label>
                            <input 
                              type="text"
                              value={mappingData.preferencias.prefijo}
                              onChange={(e) => setMappingData({
                                ...mappingData,
                                preferencias: { ...mappingData.preferencias, prefijo: e.target.value }
                              })}
                              placeholder="E.j. Transferencias_Noc"
                              className="w-full bg-surface-container-low border border-outline-variant rounded-lg text-body-sm focus:ring-primary focus:border-primary py-2 px-3 focus:outline-none"
                            />
                            <p className="text-[10px] text-on-surface-variant">Prefijo utilizado en el archivo descargado final.</p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-label-caps text-on-surface-variant">Tipo de Fin de Línea (EOL)</label>
                            <select 
                              value={mappingData.preferencias.tipo_eol}
                              onChange={(e) => setMappingData({
                                ...mappingData,
                                preferencias: { ...mappingData.preferencias, tipo_eol: e.target.value }
                              })}
                              className="w-full bg-surface-container-low border border-outline-variant rounded-lg text-body-sm focus:ring-primary focus:border-primary py-2 px-3 focus:outline-none"
                            >
                              <option>Windows (CRLF)</option>
                              <option>Unix / Linux (LF)</option>
                            </select>
                            <p className="text-[10px] text-on-surface-variant">La codificación de saltos de línea (CRLF es recomendada para la carga bancaria).</p>
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <input 
                              checked={mappingData.preferencias.validar_cuenta}
                              onChange={(e) => setMappingData({
                                ...mappingData,
                                preferencias: { ...mappingData.preferencias, validar_cuenta: e.target.checked }
                              })}
                              className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer" 
                              id="validar_cuenta" 
                              type="checkbox"
                            />
                            <label className="text-body-sm text-on-surface cursor-pointer select-none" htmlFor="validar_cuenta">
                              Validar formato de cuenta bancaria (Solo números)
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-6 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
                    <button 
                      onClick={handleCancelMappingConfig}
                      className="px-5 py-2 border border-outline-variant rounded-lg text-body-sm font-bold hover:bg-surface-container transition-colors cursor-pointer bg-surface-container-lowest"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSaveMappingConfig}
                      className="px-5 py-2 bg-primary text-on-primary rounded-lg text-body-sm font-bold shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Guardar Configuración
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-outline-variant rounded-xl p-8 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50 select-none">account_balance</span>
                <p className="text-body-sm">Seleccione un banco para ver y editar su configuración de mapeo de exportación.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm px-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-outline-variant animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-h2 text-h2 text-on-surface">
                {modalMode === "create" ? "Agregar Nuevo Banco" : "Editar Banco"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors flex items-center justify-center cursor-pointer text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveBankMetadata}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Nombre del Banco *</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none" 
                    type="text" 
                    required
                    placeholder="E.j. Banco Industrial"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Código del Banco (Siglas)</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none font-mono uppercase" 
                    type="text" 
                    placeholder="E.j. BI, BANRURAL, GYT"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    id="activo"
                    className="rounded border-outline-variant text-primary focus:ring-primary h-5 w-5 cursor-pointer"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  />
                  <label htmlFor="activo" className="text-body-base font-semibold text-on-surface cursor-pointer select-none">
                    Banco habilitado y activo para selección
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
                ¿Está seguro de que desea eliminar el banco <strong>{itemToDelete.nombre}</strong>?
              </p>
              <p className="text-body-sm text-on-surface-variant mt-2 font-sans">
                Esta acción no se puede deshacer. Si el banco ya está siendo utilizado en las cuentas bancarias de los empleados, la base de datos impedirá la eliminación para proteger la integridad referencial.
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
