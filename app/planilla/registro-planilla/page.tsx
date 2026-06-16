"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { supabase } from "@/lib/supabase/client";

interface ConceptoPago {
  id_concepto: number;
  codigo: string;
  nombre: string;
  tipo: "INGRESO" | "DESCUENTO" | "TOTAL";
  naturaleza: string;
  origen: string;
  activo: boolean;
  orden_display: number;
  referencia_constante?: string | null;
  formula?: string | null;
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
}

interface Empleado {
  id_empleado: number;
  nombre: string;
  apellido: string;
  activo: boolean;
  id_departamento: number;
  departamento: {
    nombre: string;
  } | null;
}

interface GridRow {
  id_empleado: number;
  nombreCompleto: string;
  id: string;
  depto: string;
  initials: string;
  avatarClass: string;
  valores: Record<number, number>;
  totalIng: number;
  totalDesc: number;
  liquido: number;
  id_constancia?: number;
  hasChanged: boolean;
}

const evaluateMathExpression = (expr: string): number => {
  // Eliminar todo lo que no sea números, operadores matemáticos básicos o paréntesis
  const sanitized = expr.replace(/[^0-9+\-*/.()]/g, "");
  if (!sanitized) return 0;
  try {
    const fn = new Function(`return (${sanitized});`);
    return fn() || 0;
  } catch (e) {
    console.error("Error al evaluar expresión:", expr, e);
    return 0;
  }
};

const calculateRowValues = (
  rawValores: Record<number, number>,
  conceptosList: ConceptoPago[],
  constantesList: Record<string, number>
) => {
  const valores = { ...rawValores };

  // 1. Cargar valores constantes de origen CONSTANTE
  conceptosList.forEach((c) => {
    if (c.origen === "CONSTANTE" && c.referencia_constante) {
      const constantVal = constantesList[c.referencia_constante] ?? 0;
      if (valores[c.id_concepto] === undefined || valores[c.id_concepto] === 0) {
        valores[c.id_concepto] = constantVal;
      }
    }
  });

  // 2. Resolver campos calculados (naturaleza = 'CALCULADO')
  // Hacemos múltiples pasadas para resolver dependencias encadenadas si las hubiera
  const maxIterations = 3;
  for (let iter = 0; iter < maxIterations; iter++) {
    conceptosList.forEach((c) => {
      if (c.naturaleza === "CALCULADO" && c.formula) {
        let formulaExpr = c.formula;

        // Reemplazar códigos de conceptos por sus valores actuales en 'valores'
        // Ordenamos por longitud descendente para evitar reemplazos parciales incorrectos
        const sortedConceptCodes = [...conceptosList].sort((a, b) => b.codigo.length - a.codigo.length);
        sortedConceptCodes.forEach((cp) => {
          const regex = new RegExp(`\\b${cp.codigo}\\b`, "g");
          const val = valores[cp.id_concepto] ?? 0;
          formulaExpr = formulaExpr.replace(regex, val.toString());
        });

        // Reemplazar constantes de la base de datos
        Object.keys(constantesList).forEach((constKey) => {
          const regex = new RegExp(`\\b${constKey}\\b`, "g");
          const val = constantesList[constKey] ?? 0;
          formulaExpr = formulaExpr.replace(regex, val.toString());
        });

        // Reemplazar variables especiales como RENTA_ANUAL
        const salOrdConcept = conceptosList.find((x) => x.codigo === "SAL_ORD");
        const salOrdVal = salOrdConcept ? (valores[salOrdConcept.id_concepto] ?? 0) : 0;
        const rentaAnual = salOrdVal * 12;
        formulaExpr = formulaExpr.replace(/\bRENTA_ANUAL\b/g, rentaAnual.toString());

        // Evaluar la expresión matemática sanitizada
        const result = evaluateMathExpression(formulaExpr);
        valores[c.id_concepto] = Math.round(result * 100) / 100;
      }
    });
  }

  return valores;
};

export default function Planilla() {
  const [periodos, setPeriodos] = useState<PeriodoPago[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [conceptos, setConceptos] = useState<ConceptoPago[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [constantes, setConstantes] = useState<Record<string, number>>({});

  const [gridData, setGridData] = useState<GridRow[]>([]);
  const [editStates, setEditStates] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const selectedPeriod = periodos.find((p) => p.id_periodo === selectedPeriodId);
  const isPeriodClosed = selectedPeriod?.cerrado === true;

  const ingresos = conceptos.filter((c) => c.tipo === "INGRESO");
  const descuentos = conceptos.filter((c) => c.tipo === "DESCUENTO");
  const totLiqConcept = conceptos.find((c) => c.codigo === "TOT_LIQ");

  // 1. Carga inicial de datos desde Supabase
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Conceptos de pago
        const { data: cData, error: cErr } = await supabase
          .from("concepto_pago")
          .select("*")
          .eq("activo", true)
          .order("orden_display", { ascending: true });

        if (cErr) throw cErr;
        setConceptos(cData || []);

        // Periodos de pago
        const { data: pData, error: pErr } = await supabase
          .from("periodo_pago")
          .select("*")
          .order("anio", { ascending: false })
          .order("id_periodo", { ascending: false });

        if (pErr) throw pErr;
        setPeriodos(pData || []);
        if (pData && pData.length > 0) {
          setSelectedPeriodId(pData[0].id_periodo);
        }

        // Empleados activos
        const { data: empData, error: empErr } = await supabase
          .from("empleado")
          .select("*, departamento(nombre)")
          .eq("activo", 1);

        if (empErr) throw empErr;
        setEmpleados((empData as unknown as Empleado[]) || []);

        // Constantes del sistema
        const { data: constData } = await supabase
          .from("constante_sistema")
          .select("clave, valor, vigente_desde");

        const constsMap: Record<string, number> = {};
        if (constData) {
          const sorted = [...constData].sort(
            (a, b) => new Date(a.vigente_desde).getTime() - new Date(b.vigente_desde).getTime()
          );
          sorted.forEach((c) => {
            constsMap[c.clave] = parseFloat(c.valor.toString());
          });
        }
        setConstantes(constsMap);
      } catch (err: unknown) {
        console.error("Error loading initial data:", err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        setStatusMessage({ type: "error", text: "Error al conectar con la base de datos: " + errorMsg });
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!selectedPeriodId || conceptos.length === 0 || empleados.length === 0) return;

    setCurrentPage(1);

    const loadPeriodPayroll = async () => {
      setIsLoading(true);
      setStatusMessage(null);
      try {
        // Buscar constancias del periodo
        const { data: constancias, error: constErr } = await supabase
          .from("constancia_pago")
          .select("*, detalle_constancia(*)")
          .eq("id_periodo", selectedPeriodId)
          .eq("anulada", false);

        if (constErr) throw constErr;

        // Buscar planillas recientes para usar como sugerencia de valores históricos
        const { data: recentConstancias } = await supabase
          .from("constancia_pago")
          .select("*, detalle_constancia(*)")
          .eq("anulada", false)
          .order("fecha_emision", { ascending: false });

        interface DetalleConstancia {
          id_concepto: number;
          monto: number;
        }

        interface ConstanciaPagoReciente {
          id_empleado: number;
          detalle_constancia?: DetalleConstancia[];
        }

        const latestConstDataByEmployee: Record<number, ConstanciaPagoReciente> = {};
        if (recentConstancias) {
          for (const c of recentConstancias) {
            if (!latestConstDataByEmployee[c.id_empleado]) {
              latestConstDataByEmployee[c.id_empleado] = c as unknown as ConstanciaPagoReciente;
            }
          }
        }

        // Construir la matriz de datos
        const rows = empleados.map((emp) => {
          const activeConstancia = constancias?.find((c) => c.id_empleado === emp.id_empleado);
          const valores: Record<number, number> = {};
          let id_constancia = undefined;

          if (activeConstancia) {
            id_constancia = activeConstancia.id_constancia;
            conceptos.forEach((c) => {
              const detail = activeConstancia.detalle_constancia?.find((d: DetalleConstancia) => d.id_concepto === c.id_concepto);
              valores[c.id_concepto] = detail ? parseFloat(detail.monto.toString()) : 0;
            });
          } else {
            // Sin constancia para el periodo actual: usar última constancia como plantilla base
            const lastConst = latestConstDataByEmployee[emp.id_empleado];
            conceptos.forEach((c) => {
              if (lastConst) {
                const detail = lastConst.detalle_constancia?.find((d: DetalleConstancia) => d.id_concepto === c.id_concepto);
                // Los conceptos de naturaleza VARIABLE se reinician en 0 para el nuevo período
                if (c.naturaleza === "VARIABLE") {
                  valores[c.id_concepto] = 0;
                } else {
                  valores[c.id_concepto] = detail ? parseFloat(detail.monto.toString()) : 0;
                }
              } else {
                valores[c.id_concepto] = 0;
              }
            });

            // Forzar constantes si siguen en cero
            conceptos.forEach((c) => {
              if (
                c.origen === "CONSTANTE" &&
                c.referencia_constante &&
                (valores[c.id_concepto] === 0 || valores[c.id_concepto] === undefined)
              ) {
                valores[c.id_concepto] = constantes[c.referencia_constante] ?? 0;
              }
            });
          }

          // Calcular valores calculados y fórmulas en base de datos local
          const finalValores = calculateRowValues(valores, conceptos, constantes);

          // Totales obtenidos directamente desde los conceptos de la base de datos (TOT_ING y TOT_DES)
          const totIngConcept = conceptos.find((c) => c.codigo === "TOT_ING");
          const totDescConcept = conceptos.find((c) => c.codigo === "TOT_DES");
          const totLiqConcept = conceptos.find((c) => c.codigo === "TOT_LIQ");
          const totalIng = totIngConcept ? (finalValores[totIngConcept.id_concepto] || 0) : 0;
          const totalDesc = totDescConcept ? (finalValores[totDescConcept.id_concepto] || 0) : 0;
          const liquido = totLiqConcept ? (finalValores[totLiqConcept.id_concepto] || 0) : (totalIng - totalDesc);

          const initials = `${emp.nombre[0] || ""}${emp.apellido[0] || ""}`.toUpperCase();
          const avatarClasses = [
            "bg-primary-fixed-dim text-on-primary-fixed-variant",
            "bg-secondary-fixed text-on-secondary-fixed-variant",
            "bg-tertiary-fixed-dim text-on-tertiary-fixed-variant",
            "bg-primary-fixed text-on-primary-fixed-variant",
          ];
          const avatarClass = avatarClasses[emp.id_empleado % avatarClasses.length];

          return {
            id_empleado: emp.id_empleado,
            nombreCompleto: `${emp.nombre} ${emp.apellido}`,
            id: emp.id_empleado.toString().padStart(5, "0"),
            depto: emp.departamento?.nombre || "General",
            initials,
            avatarClass,
            valores: finalValores,
            totalIng,
            totalDesc,
            liquido,
            id_constancia,
            hasChanged: false,
          };
        });

        setGridData(rows);
      } catch (err: unknown) {
        console.error("Error loading period payroll:", err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        setStatusMessage({ type: "error", text: "Error al cargar nóminas: " + errorMsg });
      } finally {
        setIsLoading(false);
      }
    };

    loadPeriodPayroll();
  }, [selectedPeriodId, conceptos, empleados, constantes]);

  // 3. Manejo de cambios en celdas editables (real-time calculations)
  const handleCellChange = (id_empleado: number, id_concepto: number, numericVal: number) => {
    setGridData((prev) =>
      prev.map((row) => {
        if (row.id_empleado !== id_empleado) return row;

        const newValores = { ...row.valores, [id_concepto]: numericVal };
        const updatedValores = calculateRowValues(newValores, conceptos, constantes);

        const totIngConcept = conceptos.find((c) => c.codigo === "TOT_ING");
        const totDescConcept = conceptos.find((c) => c.codigo === "TOT_DES");
        const totLiqConcept = conceptos.find((c) => c.codigo === "TOT_LIQ");
        const totalIng = totIngConcept ? (updatedValores[totIngConcept.id_concepto] || 0) : 0;
        const totalDesc = totDescConcept ? (updatedValores[totDescConcept.id_concepto] || 0) : 0;
        const liquido = totLiqConcept ? (updatedValores[totLiqConcept.id_concepto] || 0) : (totalIng - totalDesc);

        return {
          ...row,
          valores: updatedValores,
          totalIng,
          totalDesc,
          liquido,
          hasChanged: true,
        };
      })
    );
  };

  // 4. Guardar cambios en la base de datos
  const handleSaveChanges = async () => {
    if (!selectedPeriodId || !selectedPeriod) return;

    if (isPeriodClosed) {
      alert("No se pueden guardar cambios en un período cerrado.");
      return;
    }

    const rowsToSave = gridData.filter((row) => row.hasChanged || !row.id_constancia);
    if (rowsToSave.length === 0) {
      setStatusMessage({ type: "success", text: "Todos los cambios ya están al día." });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    let successCount = 0;

    try {
      const isrConcept = conceptos.find((c) => c.codigo === "ISR");

      for (const row of rowsToSave) {


        // 2. Preparar el arreglo de conceptos manuales para fn_generar_constancia
        // Excluimos 'IGSS' porque el SP de Postgres lo calcula automáticamente con la fórmula interna.
        const detallesManuales = conceptos
          .filter((c) => c.codigo !== "IGSS")
          .map((c) => ({
            codigo: c.codigo,
            monto: row.valores[c.id_concepto] || 0,
          }));

        const isrVal = isrConcept ? row.valores[isrConcept.id_concepto] || 0 : 0;

        // 3. Invocar fn_generar_constancia vía RPC de Supabase
        const { error: rpcErr } = await supabase.rpc("fn_generar_constancia", {
          p_id_empleado: row.id_empleado,
          p_id_periodo: selectedPeriodId,
          p_id_empresa: 1, // Empresa CRESGO
          p_renta_acreditada: 0,
          p_monto_retenido: isrVal,
          p_detalles_manuales: detallesManuales,
        });

        if (rpcErr) {
          throw new Error(`Error al guardar nómina de ${row.nombreCompleto}: ${rpcErr.message}`);
        }

        // 4. Escribir registro en bitácora de auditoría
        try {
          const logDetails = `Planilla editada para empleado ${row.nombreCompleto} (ID: ${row.id_empleado}). Conceptos guardados: ${JSON.stringify(
            conceptos.reduce((acc, c) => ({ ...acc, [c.codigo]: row.valores[c.id_concepto] }), {})
          )}`;

          await supabase.from("bitacora_edicion_planilla").insert({
            id_periodo: selectedPeriodId,
            detalles: logDetails,
            usuario: "Administrador",
          });
        } catch (bitacoraErr) {
          console.warn("Fallo de registro en bitacora_edicion_planilla:", bitacoraErr);
        }

        successCount++;
      }

      setStatusMessage({
        type: "success",
        text: `¡Se guardaron ${successCount} planillas con éxito en la base de datos!`,
      });

      // Recargar el grid para limpiar estados modificados locales
      const tempId = selectedPeriodId;
      setSelectedPeriodId(null);
      setTimeout(() => setSelectedPeriodId(tempId), 50);
    } catch (err: unknown) {
      console.error("Error saving payroll:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ type: "error", text: "Error al guardar: " + errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Cierre definitivo de periodo (ejecución directa tras confirmación)
  const executeClosePeriod = async () => {
    if (!selectedPeriodId || !selectedPeriod) return;

    if (isPeriodClosed) {
      setStatusMessage({ type: "error", text: "El período ya está cerrado." });
      return;
    }

    setIsClosing(true);
    setStatusMessage(null);

    try {
      const { error: rpcErr } = await supabase.rpc("fn_cerrar_periodo", {
        p_id_periodo: selectedPeriodId,
        p_id_empresa: selectedPeriod.id_empresa,
        p_usuario: "Administrador",
        p_forzar: 1, // Forzar cierre omitiendo validaciones estrictas de firma
      });

      if (rpcErr) throw rpcErr;

      setStatusMessage({
        type: "success",
        text: `El período ${selectedPeriod.mes} ${selectedPeriod.anio} ha sido cerrado correctamente.`,
      });

      // Recargar la lista de períodos
      const { data: pData } = await supabase
        .from("periodo_pago")
        .select("*")
        .order("anio", { ascending: false })
        .order("id_periodo", { ascending: false });

      if (pData) {
        setPeriodos(pData);
      }
    } catch (err: unknown) {
      console.error("Error closing period:", err);
      let errorMsg = "";
      if (err && typeof err === "object" && "message" in err) {
        errorMsg = String((err as { message: unknown }).message);
      } else if (err instanceof Error) {
        errorMsg = err.message;
      } else {
        errorMsg = String(err);
      }
      if (errorMsg.includes("Could not choose the best candidate function")) {
        errorMsg = "Duplicidad en base de datos. Por favor ejecute en Supabase: DROP FUNCTION IF EXISTS public.fn_cerrar_periodo(integer, integer, text, boolean);";
      }
      setStatusMessage({ type: "error", text: "Error al realizar el cierre: " + errorMsg });
    } finally {
      setIsClosing(false);
    }
  };

  // Ayudantes para cálculo de totales de pie de página
  const getConceptTotal = (id_concepto: number) => {
    return gridData.reduce((sum, row) => sum + (row.valores[id_concepto] || 0), 0);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalIncomesSum = gridData.reduce((sum, row) => sum + row.totalIng, 0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalDeductionsSum = gridData.reduce((sum, row) => sum + row.totalDesc, 0);
  const netPaySum = gridData.reduce((sum, row) => sum + row.liquido, 0);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = gridData.slice(indexOfFirstItem, indexOfLastItem);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Carga prestacional
  const salOrdConcept = conceptos.find((c) => c.codigo === "SAL_ORD");
  const totalSalary = salOrdConcept ? getConceptTotal(salOrdConcept.id_concepto) : 0;
  const igssPatronal = totalSalary * 0.1067;
  const irtra = totalSalary * 0.01;
  const intecap = totalSalary * 0.01;
  const totalPatronal = igssPatronal + irtra + intecap;

  // Alertas
  const pendingCount = gridData.filter((row) => !row.id_constancia).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar activePage="registro-planilla" />

      {/* Main Content Canvas */}
      <main className="md:ml-64 pt-8 pb-12 px-section-gap flex-1 min-w-0">
        {/* Top App Bar */}
        <header className="fixed top-0 left-64 right-0 z-30 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant flex justify-between items-center px-section-gap py-component-padding-y">
          <div className="flex items-center gap-4">
            <h1 className="font-h3 text-h3 font-bold text-primary">Importaciones CRESGO</h1>
            <div className="h-6 w-px bg-outline-variant hidden md:block"></div>
            <span className="font-body-base text-body-base font-medium text-secondary hidden md:block">
              Sistema de Planilla
            </span>
          </div>
          <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-outline-variant">
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm">
                AD
              </div>
              <span className="font-body-sm text-body-sm font-medium text-on-surface-variant hidden lg:block">
                Admin Usuario
              </span>
            </div>
          </div>
        </header>

        {/* Page canvas — pushed below the sticky header */}
        <div className="pt-16">
          {/* Action Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h2 className="font-h2 text-h2 text-on-surface mb-2">Ingreso de Datos de Planilla</h2>
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">
                    PERÍODO DE PLANILLA
                  </label>
                  <div className="relative">
                    <select
                      value={selectedPeriodId || ""}
                      onChange={(e) => setSelectedPeriodId(parseInt(e.target.value))}
                      className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 pr-10 text-body-base focus:ring-2 focus:ring-primary focus:outline-none appearance-none min-w-[280px]"
                    >
                      {periodos.map((p) => (
                        <option key={p.id_periodo} value={p.id_periodo}>
                          {p.mes} {p.anio} ({p.tipo}) {p.cerrado ? "🔒 Cerrado" : "🔓 Abierto"}
                        </option>
                      ))}
                    </select>
                    <span
                      className="material-symbols-outlined absolute right-3 top-2.5 text-secondary pointer-events-none"
                      data-icon="expand_more"
                    >
                      expand_more
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCloseConfirm(true)}
                disabled={isClosing || isPeriodClosed || gridData.length === 0}
                className="bg-error text-on-error px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]" data-icon="lock_open">
                  {isPeriodClosed ? "lock" : "lock_open"}
                </span>
                {isClosing ? "Cerrando..." : isPeriodClosed ? "Período Cerrado" : "Cerrar Período"}
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={isSaving || isPeriodClosed || gridData.length === 0}
                className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]" data-icon="save">
                  save
                </span>
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>

          {/* Data Grid */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col border-t-4 border-t-primary">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead className="sticky top-0 z-20 shadow-sm">
                  {/* Multi-level Header row 1 */}
                  <tr className="border-b border-outline-variant">
                    <th
                      className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant border-r border-outline-variant w-64 sticky top-0 left-0 bg-[#eff4ff] z-30"
                      rowSpan={2}
                    >
                      EMPLEADO
                    </th>
                    <th
                      className="px-4 py-2 text-center font-label-caps text-label-caps text-primary border-r border-outline-variant bg-[#e6f4ea] z-20"
                      colSpan={ingresos.length}
                    >
                      INGRESOS (Q)
                    </th>
                    <th
                      className="px-4 py-2 text-center font-label-caps text-label-caps text-tertiary border-r border-outline-variant bg-[#fce8e6] z-20"
                      colSpan={descuentos.length}
                    >
                      DESCUENTOS (Q)
                    </th>
                    <th className="px-4 py-2 text-center font-label-caps text-label-caps text-on-surface bg-[#dce9ff] z-20">
                      RESUMEN (Q)
                    </th>
                  </tr>
                  {/* Multi-level Header row 2 */}
                  <tr className="border-b border-outline-variant">
                    {/* Ingresos dinamicos */}
                    {ingresos.map((c) => (
                      <th
                        key={c.id_concepto}
                        className="px-4 py-2 font-label-caps text-label-caps text-on-surface-variant font-medium border-r border-outline-variant bg-[#eff4ff] z-20"
                      >
                        {c.nombre.toUpperCase()}
                      </th>
                    ))}
                    {/* Descuentos dinamicos */}
                    {descuentos.map((c) => (
                      <th
                        key={c.id_concepto}
                        className="px-4 py-2 font-label-caps text-label-caps text-on-surface-variant font-medium border-r border-outline-variant bg-[#eff4ff] z-20"
                      >
                        {c.nombre.toUpperCase()}
                      </th>
                    ))}
                    <th className="px-4 py-2 font-label-caps text-label-caps text-on-surface font-bold bg-[#dce9ff] z-20">
                      {totLiqConcept ? totLiqConcept.nombre.toUpperCase() : "LÍQUIDO"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={ingresos.length + descuentos.length + 2}
                        className="px-6 py-12 text-center text-on-surface-variant"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <span>Cargando planilla de la base de datos...</span>
                        </div>
                      </td>
                    </tr>
                  ) : gridData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={ingresos.length + descuentos.length + 2}
                        className="px-6 py-12 text-center text-on-surface-variant"
                      >
                        No hay empleados activos registrados en el sistema.
                      </td>
                    </tr>
                  ) : (
                    currentRows.map((row) => (
                      <tr key={row.id_empleado} className="hover:bg-surface-container transition-colors group">
                        {/* Sticky employee column */}
                        <td className="px-4 py-3 border-r border-outline-variant sticky left-0 bg-surface-container-lowest group-hover:bg-surface-container z-10">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] ${row.avatarClass}`}
                            >
                              {row.initials}
                            </div>
                            <div>
                              <div className="font-data-tabular text-data-tabular text-on-surface">
                                {row.nombreCompleto}
                                {row.hasChanged && (
                                  <span className="ml-1.5 inline-block w-2.5 h-2.5 bg-primary rounded-full" title="Modificado localmente"></span>
                                )}
                              </div>
                              <div className="text-[11px] text-secondary">
                                ID: {row.id} • {row.depto}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Ingresos dinamicos */}
                        {ingresos.map((c) => {
                          const isEditable = c.origen === "MANUAL" && !isPeriodClosed;
                          return (
                            <td key={c.id_concepto} className="px-4 py-3 border-r border-outline-variant">
                              {isEditable ? (
                                <input
                                  className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary p-1 text-right font-data-tabular text-data-tabular focus:outline-none"
                                  type="text"
                                  value={
                                    editStates[`${row.id_empleado}-${c.id_concepto}`] ??
                                    formatCurrency(row.valores[c.id_concepto] || 0)
                                  }
                                  onChange={(e) =>
                                    setEditStates((prev) => ({
                                      ...prev,
                                      [`${row.id_empleado}-${c.id_concepto}`]: e.target.value,
                                    }))
                                  }
                                  onBlur={() => {
                                    const rawVal = editStates[`${row.id_empleado}-${c.id_concepto}`];
                                    if (rawVal !== undefined) {
                                      const num = parseFloat(rawVal.replace(/,/g, "")) || 0;
                                      handleCellChange(row.id_empleado, c.id_concepto, num);
                                      setEditStates((prev) => {
                                        const copy = { ...prev };
                                        delete copy[`${row.id_empleado}-${c.id_concepto}`];
                                        return copy;
                                      });
                                    }
                                  }}
                                />
                              ) : (
                                <div className="text-right font-data-tabular text-data-tabular text-on-surface/70">
                                  {formatCurrency(row.valores[c.id_concepto] || 0)}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Descuentos dinamicos */}
                        {descuentos.map((c) => {
                          const isEditable = c.origen === "MANUAL" && !isPeriodClosed;
                          return (
                            <td key={c.id_concepto} className="px-4 py-3 border-r border-outline-variant">
                              {isEditable ? (
                                <input
                                  className="w-full bg-transparent border-none focus:ring-1 focus:ring-tertiary p-1 text-right font-data-tabular text-data-tabular focus:outline-none"
                                  type="text"
                                  value={
                                    editStates[`${row.id_empleado}-${c.id_concepto}`] ??
                                    formatCurrency(row.valores[c.id_concepto] || 0)
                                  }
                                  onChange={(e) =>
                                    setEditStates((prev) => ({
                                      ...prev,
                                      [`${row.id_empleado}-${c.id_concepto}`]: e.target.value,
                                    }))
                                  }
                                  onBlur={() => {
                                    const rawVal = editStates[`${row.id_empleado}-${c.id_concepto}`];
                                    if (rawVal !== undefined) {
                                      const num = parseFloat(rawVal.replace(/,/g, "")) || 0;
                                      handleCellChange(row.id_empleado, c.id_concepto, num);
                                      setEditStates((prev) => {
                                        const copy = { ...prev };
                                        delete copy[`${row.id_empleado}-${c.id_concepto}`];
                                        return copy;
                                      });
                                    }
                                  }}
                                />
                              ) : (
                                <div className="text-right font-data-tabular text-data-tabular text-on-surface/70">
                                  {formatCurrency(row.valores[c.id_concepto] || 0)}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Resumen */}
                        <td className="px-4 py-3 bg-surface-container-high/30 text-right font-bold text-on-surface font-data-tabular text-data-tabular">
                          Q {formatCurrency(row.liquido)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Totals Footer Row */}
                <tfoot>
                  <tr className="bg-surface-container-highest font-bold border-t-2 border-outline">
                    <td className="px-4 py-4 border-r border-outline-variant sticky left-0 bg-surface-container-highest z-10 font-label-caps text-label-caps text-on-surface-variant">
                      TOTALES GENERALES
                    </td>
                    {/* Totales de ingresos dinamicos */}
                    {ingresos.map((c) => (
                      <td
                        key={c.id_concepto}
                        className="px-4 py-4 border-r border-outline-variant text-right font-data-tabular text-data-tabular"
                      >
                        Q {formatCurrency(getConceptTotal(c.id_concepto))}
                      </td>
                    ))}
                    {/* Totales de descuentos dinamicos */}
                    {descuentos.map((c) => (
                      <td
                        key={c.id_concepto}
                        className="px-4 py-4 border-r border-outline-variant text-right font-data-tabular text-data-tabular"
                      >
                        Q {formatCurrency(getConceptTotal(c.id_concepto))}
                      </td>
                    ))}
                    <td className="px-4 py-4 bg-primary text-on-primary text-right font-data-tabular text-data-tabular text-[16px]">
                      Q {formatCurrency(netPaySum)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Table Pagination / Stats Footer */}
            <div className="px-4 py-3 bg-surface-container-low border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Mostrando {gridData.length > 0 ? indexOfFirstItem + 1 : 0} - {Math.min(indexOfLastItem, gridData.length)} de {gridData.length} empleados activos
              </span>

              {gridData.length > itemsPerPage && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded text-body-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="font-body-sm text-body-sm text-secondary">
                    Página {currentPage} de {Math.ceil(gridData.length / itemsPerPage)}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(gridData.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(gridData.length / itemsPerPage)}
                    className="px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded text-body-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              )}

              <div className="flex items-center gap-4">
                <span className="font-body-sm text-body-sm text-secondary">
                  Estado de Planilla:{" "}
                  <span className={`font-bold ${isPeriodClosed ? "text-error" : "text-primary"}`}>
                    {isPeriodClosed ? "CERRADA" : "ABIERTA"}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Bento Widgets */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Summary Card 1 — Carga Prestacional */}
            <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm border-t-4 border-t-primary">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <span className="material-symbols-outlined" data-icon="trending_up">
                    trending_up
                  </span>
                </div>
                <h3 className="font-body-base text-body-base font-bold text-on-surface">Carga Prestacional</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-body-sm">
                  <span className="text-secondary">IGSS Patronal (10.67%)</span>
                  <span className="font-data-tabular font-bold">Q {formatCurrency(igssPatronal)}</span>
                </div>
                <div className="flex justify-between items-center text-body-sm">
                  <span className="text-secondary">IRTRA (1%)</span>
                  <span className="font-data-tabular font-bold">Q {formatCurrency(irtra)}</span>
                </div>
                <div className="flex justify-between items-center text-body-sm">
                  <span className="text-secondary">INTECAP (1%)</span>
                  <span className="font-data-tabular font-bold">Q {formatCurrency(intecap)}</span>
                </div>
                <div className="pt-2 border-t border-outline-variant flex justify-between items-center font-bold">
                  <span className="text-on-surface">Total Patronal</span>
                  <span className="text-primary">Q {formatCurrency(totalPatronal)}</span>
                </div>
              </div>
            </div>

            {/* Summary Card 2 — Alertas */}
            <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm border-t-4 border-t-tertiary">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-tertiary/10 rounded-lg text-tertiary">
                  <span className="material-symbols-outlined" data-icon="warning">
                    warning
                  </span>
                </div>
                <h3 className="font-body-base text-body-base font-bold text-on-surface">Alertas de Período</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex gap-3 text-body-sm">
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      pendingCount > 0 ? "text-tertiary animate-pulse" : "text-primary"
                    }`}
                    data-icon={pendingCount > 0 ? "error_outline" : "check_circle"}
                  >
                    {pendingCount > 0 ? "error_outline" : "check_circle"}
                  </span>
                  <span className="text-on-surface-variant">
                    {pendingCount > 0
                      ? `${pendingCount} empleados pendientes de cálculo de planilla.`
                      : "Todos los colaboradores tienen sus nóminas calculadas."}
                  </span>
                </li>
                <li className="flex gap-3 text-body-sm">
                  <span className="material-symbols-outlined text-secondary text-[18px]" data-icon="info">
                    info
                  </span>
                  <span className="text-on-surface-variant">
                    {isPeriodClosed
                      ? "Este período ya se encuentra archivado y sellado."
                      : "El período está abierto y acepta modificaciones."}
                  </span>
                </li>
              </ul>
            </div>

            {/* Visual Context Card */}
            <div className="relative overflow-hidden rounded-xl border border-outline-variant h-full min-h-[160px]">
              <div className="absolute inset-0 bg-gradient-to-br from-surface-container-low via-surface-container to-surface-dim"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <span className="material-symbols-outlined text-primary text-[64px] opacity-20 mb-3" data-icon="calculate">
                  calculate
                </span>
                <div className="absolute inset-0 bg-primary/40 flex items-center justify-center p-6 text-center">
                  <p className="text-on-primary font-bold text-h3 leading-tight drop-shadow-md">
                    Comprometidos con la precisión financiera.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Confirmación Cierre de Período */}
      {showCloseConfirm && selectedPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm px-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-outline-variant animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="font-h2 text-h2 text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-error">lock</span>
                Confirmar Cierre de Período
              </h3>
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-on-surface text-body-base">
                ¿Está seguro de cerrar el período de planilla: <strong className="text-primary">{selectedPeriod.mes} {selectedPeriod.anio}</strong> ({selectedPeriod.tipo})?
              </p>
              <div className="bg-error/10 border border-error/20 rounded-lg p-3.5 flex items-start gap-3 text-error text-body-sm font-medium">
                <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">warning</span>
                <span>Esta acción bloqueará ediciones futuras y no podrá ser revertida. Asegúrese de que todas las planillas estén ingresadas correctamente.</span>
              </div>
            </div>
            <div className="p-6 bg-surface-container-low border-t border-outline-variant flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                className="bg-white border border-outline-variant text-on-surface-variant px-5 py-2.5 rounded-lg font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  executeClosePeriod();
                  setShowCloseConfirm(false);
                }}
                className="bg-error text-on-error px-5 py-2.5 rounded-lg font-bold hover:bg-error/90 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Sí, Cerrar Período
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #bfcabb; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6f7a6d; }
      `}</style>
    </div>
  );
}
