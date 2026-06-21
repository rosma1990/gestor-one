"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "@/lib/supabase/client";

interface PeriodoPago {
  id_periodo: number;
  mes: string;
  anio: number;
  tipo: string;
  cerrado: boolean;
}

interface Departamento {
  id_departamento: number;
  nombre: string;
}

interface TransferRow {
  id_empleado: number;
  correlativo: string;
  nombreCompleto: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  liquido: number;
  id_departamento: number;
}

interface CsvField {
  id: string;
  label: string;
}

export default function TransferenciasPage() {
  // Page state
  const [periods, setPeriods] = useState<PeriodoPago[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  
  const [departments, setDepartments] = useState<Departamento[]>([]);
  const [selectedDeptoId, setSelectedDeptoId] = useState<string>("Todos");
  
  const [transferData, setTransferData] = useState<TransferRow[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Configuration state
  const [selectedBank, setSelectedBank] = useState("Banco Industrial (BI-Link)");
  const [csvSeparator, setCsvSeparator] = useState("Coma (,)");
  const [csvEncoding, setCsvEncoding] = useState("UTF-8");
  const [csvFields, setCsvFields] = useState<CsvField[]>([
    { id: "correlativo", label: "1. Correlativo" },
    { id: "cuenta", label: "2. No. de Cuenta" },
    { id: "monto", label: "3. Monto" },
    { id: "nombre", label: "4. Nombre Empleado" },
  ]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 1. Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Fetch periods
        const { data: pData, error: pErr } = await supabase
          .from("periodo_pago")
          .select("id_periodo, mes, anio, tipo, cerrado")
          .order("anio", { ascending: false })
          .order("id_periodo", { ascending: false });
        if (pErr) throw pErr;
        setPeriods(pData || []);

        // Load deep-linked period or default to first
        const savedPeriodId = localStorage.getItem("selected_period_id");
        if (savedPeriodId) {
          setSelectedPeriodId(parseInt(savedPeriodId));
          localStorage.removeItem("selected_period_id");
        } else if (pData && pData.length > 0) {
          setSelectedPeriodId(pData[0].id_periodo);
        }

        // Fetch departments
        const { data: dData, error: dErr } = await supabase
          .from("departamento")
          .select("id_departamento, nombre")
          .order("nombre", { ascending: true });
        if (dErr) throw dErr;
        setDepartments(dData || []);

        // Load saved configuration from localStorage
        const savedConfig = localStorage.getItem("transferencias_config");
        if (savedConfig) {
          try {
            const parsed = JSON.parse(savedConfig);
            if (parsed.selectedBank) setSelectedBank(parsed.selectedBank);
            if (parsed.csvSeparator) setCsvSeparator(parsed.csvSeparator);
            if (parsed.csvEncoding) setCsvEncoding(parsed.csvEncoding);
            if (parsed.csvFields) setCsvFields(parsed.csvFields);
          } catch (e) {
            console.error("Error parsing saved configuration", e);
          }
        }
      } catch (err: any) {
        console.error("Error loading initial data:", err);
        setStatusMessage({ type: "error", text: "Error al conectar con la base de datos: " + err.message });
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // 2. Load transfer details for selected period
  const loadTransferDetails = async (periodId: number) => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const { data, error } = await supabase
        .from("constancia_pago")
        .select(`
          id_constancia,
          id_empleado,
          id_periodo,
          anulada,
          empleado (
            id_empleado,
            nombre,
            apellido,
            id_departamento,
            cuenta_bancaria_empleado (
              banco,
              numero_cuenta,
              principal,
              activa
            )
          ),
          resumen_constancia (
            liquido_recibir
          )
        `)
        .eq("id_periodo", periodId)
        .eq("anulada", false);

      if (error) throw error;

      const rows: TransferRow[] = (data || []).map((c: any, index) => {
        const emp = c.empleado;
        const name = emp ? `${emp.nombre} ${emp.apellido}`.trim() : "Empleado Desconocido";
        
        // Find principal active account, fallback to first active, then first overall
        const accounts = emp?.cuenta_bancaria_empleado || [];
        const activeAcct = accounts.find((a: any) => a.principal && a.activa) || 
                           accounts.find((a: any) => a.activa) || 
                           accounts[0] || 
                           { banco: "Sin Registrar", numero_cuenta: "No Disponible" };

        const banco = activeAcct.banco;
        const tipoCuenta = banco.toLowerCase().includes("banrural") ? "Ahorros" : "Monetaria";
        const numeroCuenta = activeAcct.numero_cuenta;

        const resObj = c.resumen_constancia;
        const res = Array.isArray(resObj) ? resObj[0] : resObj;
        const liquido = res ? parseFloat(res.liquido_recibir || 0) : 0;

        return {
          id_empleado: c.id_empleado,
          correlativo: (index + 1).toString().padStart(4, "0"),
          nombreCompleto: name,
          banco,
          tipoCuenta,
          numeroCuenta,
          liquido,
          id_departamento: emp?.id_departamento || 0
        };
      });

      setTransferData(rows);
      setSelectedItems(new Set(rows.map(r => r.id_empleado))); // Select all by default
      setCurrentPage(1);
    } catch (err: any) {
      console.error("Error loading transfer details:", err);
      setStatusMessage({ type: "error", text: "Error de lectura: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPeriodId) {
      loadTransferDetails(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  // Checkbox handlers
  const handleSelectItem = (id: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (filteredRows: TransferRow[]) => {
    const allFilteredSelected = filteredRows.every(r => selectedItems.has(r.id_empleado));
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        // Deselect all filtered items
        filteredRows.forEach(r => next.delete(r.id_empleado));
      } else {
        // Select all filtered items
        filteredRows.forEach(r => next.add(r.id_empleado));
      }
      return next;
    });
  };

  // Reorder fields logic
  const moveField = (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= csvFields.length) return;
    const newFields = [...csvFields];
    const temp = newFields[index];
    newFields[index] = newFields[newIndex];
    newFields[newIndex] = temp;

    // Update numbers in the labels dynamically
    const updated = newFields.map((f, idx) => ({
      ...f,
      label: `${idx + 1}. ${f.label.split(". ")[1]}`
    }));
    setCsvFields(updated);
  };

  // Reset fields to default order
  const handleResetFields = () => {
    setCsvFields([
      { id: "correlativo", label: "1. Correlativo" },
      { id: "cuenta", label: "2. No. de Cuenta" },
      { id: "monto", label: "3. Monto" },
      { id: "nombre", label: "4. Nombre Empleado" },
    ]);
  };

  // Save current config to localStorage
  const handleSaveConfig = () => {
    const config = {
      selectedBank,
      csvSeparator,
      csvEncoding,
      csvFields
    };
    localStorage.setItem("transferencias_config", JSON.stringify(config));
    setStatusMessage({ type: "success", text: "¡Configuración guardada correctamente en el navegador!" });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Generate and download CSV
  const handleGenerateCsv = () => {
    const selectedRows = transferData.filter(r => selectedItems.has(r.id_empleado));
    if (selectedRows.length === 0) {
      setStatusMessage({ type: "error", text: "Debe seleccionar al menos un empleado para exportar." });
      return;
    }

    // Determine separator character
    let separator = ",";
    if (csvSeparator.includes("Punto")) separator = ";";
    else if (csvSeparator.includes("Tabulador")) separator = "\t";

    // Build header row based on current field order
    const headerRow = csvFields.map(f => {
      if (f.id === "correlativo") return "Correlativo";
      if (f.id === "cuenta") return "No. Cuenta";
      if (f.id === "monto") return "Monto";
      if (f.id === "nombre") return "Nombre Empleado";
      return f.id;
    }).join(separator);

    // Build data rows
    const dataRows = selectedRows.map((r, index) => {
      return csvFields.map(f => {
        if (f.id === "correlativo") return (index + 1).toString().padStart(4, "0");
        if (f.id === "cuenta") return `"${r.numeroCuenta}"`; // Quote accounts to prevent scientific notation in Excel
        if (f.id === "monto") return r.liquido.toFixed(2);
        if (f.id === "nombre") return `"${r.nombreCompleto}"`;
        return "";
      }).join(separator);
    });

    const csvContent = [headerRow, ...dataRows].join("\n");
    
    // Add UTF-8 BOM if UTF-8 is selected (so Excel opens accented chars correctly)
    const blobContent = csvEncoding === "UTF-8" ? ["\uFEFF", csvContent] : [csvContent];
    const blob = new Blob(blobContent, { type: `text/csv;charset=${csvEncoding.toLowerCase()};` });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // Format file name
    const period = periods.find(p => p.id_periodo === selectedPeriodId);
    const bankName = selectedBank.split(" (")[0].replace(/\s+/g, "_");
    const periodName = period ? `${period.mes}_${period.anio}` : "periodo";
    
    link.href = url;
    link.setAttribute("download", `Transferencias_${bankName}_${periodName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setStatusMessage({ 
      type: "success", 
      text: `¡Archivo CSV generado con éxito para ${selectedBank}! (${selectedRows.length} registros exportados)` 
    });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Filter transfers based on search, department, and selected bank accounts if necessary
  const filteredTransfers = transferData.filter(r => {
    const matchesSearch = r.nombreCompleto.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.numeroCuenta.includes(searchQuery);
    
    const matchesDepto = selectedDeptoId === "Todos" || 
                         r.id_departamento.toString() === selectedDeptoId;

    return matchesSearch && matchesDepto;
  });

  // Calculate totals for currently selected items
  const totalTransferAmount = transferData
    .filter(r => selectedItems.has(r.id_empleado))
    .reduce((sum, r) => sum + r.liquido, 0);

  // Pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransfers = filteredTransfers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const periodLabel = periods.find(p => p.id_periodo === selectedPeriodId);
  const selectAllChecked = filteredTransfers.length > 0 && filteredTransfers.every(r => selectedItems.has(r.id_empleado));

  return (
    <div className="flex min-h-screen text-on-surface bg-background">
      <Sidebar activePage="transferencias" />
      
      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen min-w-0">
        {/* TopAppBar */}
        <header className="flex justify-between items-center w-full px-section-gap py-4 z-30 bg-surface-container-lowest/80 backdrop-blur-md sticky top-0 border-b border-outline-variant">
          <div className="flex items-center gap-4 pl-12 md:pl-0">
            <span className="font-h3 text-h3 font-bold text-primary">Gestión de Transferencias</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input 
                className="pl-10 pr-4 py-2 bg-surface-container rounded-full border-none focus:ring-2 focus:ring-primary text-body-base w-64 focus:outline-none" 
                placeholder="Buscar empleado..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Status alerts */}
            {statusMessage && (
              <div className={`text-body-sm font-semibold px-4 py-1.5 rounded-lg border shadow-sm ${
                statusMessage.type === "success" 
                  ? "bg-primary/10 text-primary border-primary/20" 
                  : "bg-error/10 text-error border-error/20"
              }`}>
                {statusMessage.text}
              </div>
            )}

            <button className="hover:bg-surface-variant/50 rounded-full p-2 transition-colors">
              <span className="material-symbols-outlined text-primary">notifications</span>
            </button>
            <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xs overflow-hidden border border-outline-variant">
              <img 
                className="w-full h-full object-cover" 
                alt="User profile" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVJ0KDkIXLNnkhPFS4qNH96n3xzyNAWXREAFRTkVhK8RaiMd8n5nrXANqdRDJ0oMpWhSettb5FMuXYv___VBoazd5qH1dDL74yJLNcBmFku64jEy5t_W5jflR0Rj3NRyCLQh8fscItEEmalW1cbrLvfy76zHQ9rD1GYK44NrlNVRybvY9mT-lsXyp_WMjbLDsFEEpMWtZN7AzWYmc9X4fjO1yU0eFgSQaqaEUchngFoF0lZmE3ZAUEBpp8UzhKOTyNIPdNpel7O2jt"
              />
            </div>
          </div>
        </header>

        {/* Screen Content */}
        <div className="p-4 md:p-section-gap space-y-6 max-w-7xl mx-auto w-full flex-1">
          
          {/* Selection Header & Filters */}
          <section className="grid grid-cols-1 lg:grid-cols-4 gap-gutter">
            <div className="lg:col-span-3 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[240px]">
                <label className="block text-label-caps text-on-surface-variant mb-2">PERÍODO DE PAGO</label>
                <div className="relative">
                  <select 
                    className="w-full border border-outline-variant rounded-lg focus:ring-primary focus:border-primary text-body-base appearance-none py-2 px-3 pr-10 bg-transparent"
                    value={selectedPeriodId || ""}
                    onChange={(e) => setSelectedPeriodId(parseInt(e.target.value))}
                  >
                    {periods.map(p => (
                      <option key={p.id_periodo} value={p.id_periodo}>
                        {p.tipo === "MENSUAL" ? "Mensual" : "Quincenal"} - {p.mes} {p.anio} {p.cerrado ? "🔒" : "🔓"}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary pointer-events-none">expand_more</span>
                </div>
              </div>
              <div className="flex-1 min-w-[240px]">
                <label className="block text-label-caps text-on-surface-variant mb-2">FILTRAR POR DEPARTAMENTO</label>
                <div className="relative">
                  <select 
                    className="w-full border border-outline-variant rounded-lg focus:ring-primary focus:border-primary text-body-base appearance-none py-2 px-3 pr-10 bg-transparent"
                    value={selectedDeptoId}
                    onChange={(e) => setSelectedDeptoId(e.target.value)}
                  >
                    <option value="Todos">Todos los Departamentos</option>
                    {departments.map(d => (
                      <option key={d.id_departamento} value={d.id_departamento}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary pointer-events-none">expand_more</span>
                </div>
              </div>
              <button 
                onClick={() => selectedPeriodId && loadTransferDetails(selectedPeriodId)}
                className="bg-surface-container text-primary font-bold px-6 py-2 rounded-lg hover:bg-surface-container-high transition-colors flex items-center gap-2 border border-primary/20 cursor-pointer"
              >
                <span className="material-symbols-outlined">filter_list</span>
                Cargar Datos
              </button>
            </div>
            
            {/* Big Total Card */}
            <div className="bg-primary p-6 rounded-xl shadow-sm flex flex-col justify-between text-on-primary relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-label-caps opacity-80 uppercase tracking-widest">Total a Transferir</p>
                <h2 className="text-h1 font-h1 mt-1">
                  Q {totalTransferAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-9xl opacity-10">account_balance</span>
            </div>
          </section>

          {/* Main Grid: Table & Config */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-gutter items-start">
            
            {/* Left side: Export Preview Table */}
            <div className="xl:col-span-3 space-y-4">
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden border-t-4 border-t-primary">
                
                {/* Table Header */}
                <div className="p-4 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                  <h3 className="text-h3 font-h3 text-on-surface">Vista Previa de Exportación</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm text-on-surface-variant">
                      Seleccionados: <strong>{transferData.filter(r => selectedItems.has(r.id_empleado)).length} / {transferData.length}</strong>
                    </span>
                  </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-highest/30 text-label-caps text-on-surface-variant border-b border-outline-variant">
                        <th className="p-4 w-10 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                            checked={selectAllChecked}
                            onChange={() => handleSelectAll(filteredTransfers)}
                          />
                        </th>
                        <th className="p-4 font-bold">Correlativo</th>
                        <th className="p-4 font-bold">Nombre del Empleado</th>
                        <th className="p-4 font-bold">Banco</th>
                        <th className="p-4 font-bold">Tipo</th>
                        <th className="p-4 font-bold">Cuenta</th>
                        <th className="p-4 font-bold text-right">Monto (Líquido)</th>
                      </tr>
                    </thead>
                    <tbody className="text-body-base divide-y divide-outline-variant">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-on-surface-variant">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                              <span>Cargando datos...</span>
                            </div>
                          </td>
                        </tr>
                      ) : currentTransfers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-on-surface-variant">
                            No se encontraron empleados con planillas generadas en este periodo.
                          </td>
                        </tr>
                      ) : (
                        currentTransfers.map((r, idx) => {
                          const isSelected = selectedItems.has(r.id_empleado);
                          return (
                            <tr 
                              key={r.id_empleado} 
                              className={`hover:bg-primary/5 transition-colors ${!isSelected ? "opacity-50" : ""}`}
                            >
                              <td className="p-4 text-center">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                                  checked={isSelected}
                                  onChange={() => handleSelectItem(r.id_empleado)}
                                />
                              </td>
                              <td className="p-4 text-data-tabular">
                                {(indexOfFirstItem + idx + 1).toString().padStart(4, "0")}
                              </td>
                              <td className="p-4 font-medium text-on-surface">{r.nombreCompleto}</td>
                              <td className="p-4">{r.banco}</td>
                              <td className="p-4 text-on-surface-variant">{r.tipoCuenta}</td>
                              <td className="p-4 text-data-tabular">{r.numeroCuenta}</td>
                              <td className="p-4 text-right font-bold text-primary">
                                Q {r.liquido.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-outline-variant flex justify-center bg-surface-container-low/50">
                    <nav className="flex gap-2">
                      <button 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 hover:bg-surface-variant rounded transition-colors disabled:opacity-30 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                      </button>
                      
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => handlePageChange(idx + 1)}
                          className={`px-3 py-1 rounded font-semibold text-body-sm transition-colors cursor-pointer ${
                            currentPage === idx + 1 
                              ? "bg-primary text-on-primary shadow-sm" 
                              : "hover:bg-surface-variant text-on-surface"
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                      
                      <button 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 hover:bg-surface-variant rounded transition-colors disabled:opacity-30 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </nav>
                  </div>
                )}
              </div>

              {/* Bottom Action Alert Box */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center p-6 bg-surface-container-highest/20 rounded-xl border-2 border-dashed border-primary/30">
                <div className="flex items-center gap-3 text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary">info</span>
                  <p className="text-body-sm">El archivo generado cumplirá con el estándar de carga masiva definido para cada banco.</p>
                </div>
                <div className="flex gap-4 w-full sm:w-auto justify-end">
                  <button 
                    onClick={handleSaveConfig}
                    className="bg-surface-container-lowest border border-outline text-on-surface font-semibold px-6 py-2.5 rounded-lg hover:bg-surface-container transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined">save</span>
                    Guardar Borrador
                  </button>
                  <button 
                    onClick={handleGenerateCsv}
                    className="bg-primary text-on-primary font-bold px-8 py-2.5 rounded-lg hover:opacity-90 shadow-lg shadow-primary/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined">download</span>
                    Generar Archivo CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Right side: Configuration Sidebar */}
            <aside className="space-y-6">
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-6 border-t-4 border-t-primary">
                <div className="flex items-center gap-2 border-b border-outline-variant pb-4">
                  <span className="material-symbols-outlined text-primary">settings_applications</span>
                  <h4 className="font-h3 text-h3 text-on-surface">Configuración</h4>
                </div>
                
                {/* Bank Selection */}
                <div>
                  <label className="block text-label-caps text-on-surface-variant mb-2 font-semibold">BANCO DESTINO</label>
                  <div className="relative">
                    <select 
                      className="w-full border border-outline-variant rounded-lg focus:ring-primary focus:border-primary text-body-base appearance-none py-2 px-3 pr-10 bg-transparent"
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                    >
                      <option>Banco Industrial (BI-Link)</option>
                      <option>Banrural (Carga Masiva)</option>
                      <option>G&amp;T Continental</option>
                      <option>BAC Credomatic</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary pointer-events-none">expand_more</span>
                  </div>
                </div>

                {/* CSV Structure Order */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-label-caps text-on-surface-variant font-semibold">ESTRUCTURA CSV</label>
                    <button 
                      onClick={handleResetFields}
                      className="text-primary font-bold text-[10px] hover:underline cursor-pointer"
                    >
                      RESETEAR
                    </button>
                  </div>
                  <div className="space-y-2">
                    {csvFields.map((field, idx) => (
                      <div 
                        key={field.id} 
                        className="flex items-center justify-between p-2.5 bg-surface-container rounded border border-outline-variant shadow-sm hover:shadow transition-shadow"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">drag_indicator</span>
                          <span className="text-body-sm font-semibold text-on-surface">{field.label}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button 
                            disabled={idx === 0} 
                            onClick={() => moveField(idx, -1)} 
                            className="hover:text-primary disabled:opacity-20 cursor-pointer text-secondary flex items-center"
                            title="Subir"
                          >
                            <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                          </button>
                          <button 
                            disabled={idx === csvFields.length - 1} 
                            onClick={() => moveField(idx, 1)} 
                            className="hover:text-primary disabled:opacity-20 cursor-pointer text-secondary flex items-center"
                            title="Bajar"
                          >
                            <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Separator & Format Options */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-label-caps text-on-surface-variant mb-2 font-semibold">SEPARADOR</label>
                    <div className="relative">
                      <select 
                        className="w-full border border-outline-variant rounded-lg text-body-sm appearance-none py-2 px-2.5 bg-transparent"
                        value={csvSeparator}
                        onChange={(e) => setCsvSeparator(e.target.value)}
                      >
                        <option>Coma (,)</option>
                        <option>Punto y Coma (;)</option>
                        <option>Tabulador</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-2 top-2.5 text-secondary pointer-events-none text-sm">expand_more</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-label-caps text-on-surface-variant mb-2 font-semibold font-sans">CODIFICACIÓN</label>
                    <div className="relative">
                      <select 
                        className="w-full border border-outline-variant rounded-lg text-body-sm appearance-none py-2 px-2.5 bg-transparent"
                        value={csvEncoding}
                        onChange={(e) => setCsvEncoding(e.target.value)}
                      >
                        <option>UTF-8</option>
                        <option>ANSI</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-2 top-2.5 text-secondary pointer-events-none text-sm">expand_more</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSaveConfig}
                  className="w-full py-2 bg-surface-container text-on-surface border border-outline-variant rounded-lg font-semibold hover:bg-surface-container-high transition-colors text-body-sm cursor-pointer"
                >
                  Guardar Configuración
                </button>
              </div>

              {/* Tips Card */}
              <div className="bg-tertiary/5 p-6 rounded-xl border border-tertiary/20 space-y-3">
                <div className="flex items-center gap-2 text-tertiary">
                  <span className="material-symbols-outlined">lightbulb</span>
                  <span className="font-bold text-body-base">Sugerencia</span>
                </div>
                <p className="text-body-sm text-on-tertiary-fixed-variant leading-relaxed">
                  Asegúrese de que el correlativo inicie en el número exacto solicitado por su portal bancario para evitar duplicidad de lotes.
                </p>
              </div>
            </aside>
            
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto py-8 text-center text-on-surface-variant/40 text-body-sm">
          © 2024 Importaciones CRESGO - Sistema de Gestión de Planilla v4.2.1
        </footer>
      </main>
    </div>
  );
}
