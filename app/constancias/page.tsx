"use client";

import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "@/lib/supabase/client";

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

// Helper: Convertir números a letras para quetzales
function numeroALetras(num: number): string {
  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const especiales = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
  
  const centavos = Math.round((num % 1) * 100);
  const entero = Math.floor(num);
  
  if (entero === 0) return `CERO QUETZALES CON ${centavos.toString().padStart(2, "0")}/100`;
  
  const convertGroup = (n: number): string => {
    let output = "";
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    
    if (c > 0) {
      if (c === 1 && d === 0 && u === 0) {
        output += "CIEN ";
      } else {
        output += centenas[c] + " ";
      }
    }
    
    if (d > 0) {
      if (d === 1) {
        output += especiales[u] + " ";
        return output;
      } else if (d === 2 && u > 0) {
        output += "VEINTI" + unidades[u] + " ";
        return output;
      } else {
        output += decenas[d] + " ";
        if (u > 0) output += "Y ";
      }
    }
    
    if (u > 0) {
      output += unidades[u] + " ";
    }
    
    return output;
  };
  
  let result = "";
  const miles = Math.floor(entero / 1000);
  const resto = entero % 1000;
  
  if (miles > 0) {
    if (miles === 1) {
      result += "MIL ";
    } else {
      result += convertGroup(miles) + "MIL ";
    }
  }
  
  if (resto > 0) {
    result += convertGroup(resto);
  }
  
  return `${result.trim()} QUETZALES CON ${centavos.toString().padStart(2, "0")}/100`;
}

// Evaluar expresión matemática simple
const evaluateMathExpression = (expr: string): number => {
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

export default function Constancias() {
  const [periods, setPeriods] = useState<PeriodoPago[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const [constancias, setConstancias] = useState<any[]>([]);
  const [conceptos, setConceptos] = useState<ConceptoPago[]>([]);
  const [constantes, setConstantes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  
  // Zip state
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [constanciaToCancel, setConstanciaToCancel] = useState<any | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [constanciaToEdit, setConstanciaToEdit] = useState<any | null>(null);
  const [editValues, setEditValues] = useState<Record<number, number>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedPeriod = periods.find((p) => p.id_periodo === selectedPeriodId);
  const isPeriodClosed = selectedPeriod?.cerrado === true;

  const totIngConcept = conceptos.find((c) => c.codigo === "TOT_ING");
  const totDescConcept = conceptos.find((c) => c.codigo === "TOT_DES");
  const totLiqConcept = conceptos.find((c) => c.codigo === "TOT_LIQ");

  // 1. Cargar Períodos, Conceptos y Constantes al inicializar
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Cargar períodos
        const { data: pData, error: pErr } = await supabase
          .from("periodo_pago")
          .select("*")
          .order("anio", { ascending: false })
          .order("id_periodo", { ascending: false });
        if (pErr) throw pErr;
        setPeriods(pData || []);
        if (pData && pData.length > 0) {
          const savedPeriodId = localStorage.getItem("selected_period_id");
          if (savedPeriodId) {
            setSelectedPeriodId(parseInt(savedPeriodId));
            localStorage.removeItem("selected_period_id");
          } else {
            setSelectedPeriodId(pData[0].id_periodo);
          }
        }

        // Cargar conceptos
        const { data: cData, error: cErr } = await supabase
          .from("concepto_pago")
          .select("*")
          .eq("activo", true)
          .order("orden_display", { ascending: true });
        if (cErr) throw cErr;
        setConceptos(cData || []);

        // Cargar constantes
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
      } catch (err: any) {
        console.error("Error cargando datos iniciales:", err);
        setStatusMessage({ type: "error", text: "Error de conexión: " + err.message });
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // 2. Cargar constancias cada vez que cambie el período seleccionado
  const loadConstancias = async (periodId: number) => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const { data, error } = await supabase
        .from("constancia_pago")
        .select(`
          *,
          empleado (
            id_empleado,
            nombre,
            apellido,
            cui,
            nit,
            puesto,
            departamento (
              nombre,
              empresa (
                nombre,
                nit,
                direccion,
                telefono
              )
            )
          ),
          comprobante_constancia (
            url_documento
          ),
          detalle_constancia (
            *,
            concepto_pago (
              *
            )
          ),
          resumen_constancia (
            *
          ),
          retencion_isr (
            *
          )
        `)
        .eq("id_periodo", periodId)
        .order("id_constancia", { ascending: true });

      if (error) throw error;
      setConstancias(data || []);
      setCurrentPage(1);
    } catch (err: any) {
      console.error("Error al cargar constancias:", err);
      setStatusMessage({ type: "error", text: "Error de lectura: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPeriodId) {
      loadConstancias(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  // Recálculo local en tiempo real del modal de edición
  const handleEditCellChange = (id_concepto: number, numericVal: number) => {
    const rawValores = { ...editValues, [id_concepto]: numericVal };
    const conceptosList = conceptos;
    const constantesList = constantes;

    const valores = { ...rawValores };

    // Resolver campos calculados (naturaleza = 'CALCULADO')
    const maxIterations = 3;
    for (let iter = 0; iter < maxIterations; iter++) {
      conceptosList.forEach((c) => {
        if (c.naturaleza === "CALCULADO" && c.formula) {
          let formulaExpr = c.formula;
          const sortedConceptCodes = [...conceptosList].sort((a, b) => b.codigo.length - a.codigo.length);
          sortedConceptCodes.forEach((cp) => {
            const regex = new RegExp(`\\b${cp.codigo}\\b`, "g");
            const val = valores[cp.id_concepto] ?? 0;
            formulaExpr = formulaExpr.replace(regex, val.toString());
          });

          Object.keys(constantesList).forEach((constKey) => {
            const regex = new RegExp(`\\b${constKey}\\b`, "g");
            const val = constantesList[constKey] ?? 0;
            formulaExpr = formulaExpr.replace(regex, val.toString());
          });

          const salOrdConcept = conceptosList.find((x) => x.codigo === "SAL_ORD");
          const salOrdVal = salOrdConcept ? (valores[salOrdConcept.id_concepto] ?? 0) : 0;
          const rentaAnual = salOrdVal * 12;
          formulaExpr = formulaExpr.replace(/\bRENTA_ANUAL\b/g, rentaAnual.toString());

          const result = evaluateMathExpression(formulaExpr);
          valores[c.id_concepto] = Math.round(result * 100) / 100;
        }
      });
    }

    setEditValues(valores);
  };

  // Abrir modal de edición para un comprobante anulado
  const handleOpenEditModal = (item: any) => {
    const values: Record<number, number> = {};
    conceptos.forEach((c) => {
      const detail = item.detalle_constancia?.find((d: any) => d.id_concepto === c.id_concepto);
      values[c.id_concepto] = detail ? parseFloat(detail.monto.toString()) : 0;
    });
    setConstanciaToEdit(item);
    setEditValues(values);
    setShowEditModal(true);
  };

  // Guardar edición del comprobante anulado
  const handleSaveEdit = async () => {
    if (!constanciaToEdit) return;
    setIsSavingEdit(true);
    setStatusMessage(null);
    try {
      const isrConcept = conceptos.find((c) => c.codigo === "ISR");
      const isrVal = isrConcept ? editValues[isrConcept.id_concepto] || 0 : 0;

      const detallesManuales = conceptos
        .filter((c) => c.codigo !== "IGSS")
        .map((c) => ({
          codigo: c.codigo,
          monto: editValues[c.id_concepto] || 0,
        }));

      // 1. Generar la constancia en base de datos (retorna el nuevo id_constancia)
      const retObj = constanciaToEdit.retencion_isr;
      const retObjParsed = Array.isArray(retObj) ? retObj[0] : retObj;
      const rentaAcreditada = retObjParsed?.renta_acreditada || 0;

      const { data: newIdConstancia, error: rpcErr } = await supabase.rpc("fn_generar_constancia", {
        p_id_empleado: constanciaToEdit.id_empleado,
        p_id_periodo: constanciaToEdit.id_periodo,
        p_id_empresa: constanciaToEdit.id_empresa,
        p_renta_acreditada: rentaAcreditada,
        p_monto_retenido: isrVal,
        p_detalles_manuales: detallesManuales,
      });

      if (rpcErr) throw rpcErr;
      if (!newIdConstancia) throw new Error("No se pudo obtener el ID de la nueva constancia.");

      // 2. Cargar los datos completos de la nueva constancia generada para poder recrear su PDF
      const { data: newConstanciaData, error: fetchErr } = await supabase
        .from("constancia_pago")
        .select(`
          *,
          empleado (
            id_empleado,
            nombre,
            apellido,
            cui,
            nit,
            puesto,
            departamento (
              nombre,
              empresa (
                nombre,
                nit,
                direccion,
                telefono
              )
            )
          ),
          comprobante_constancia (
            url_documento
          ),
          detalle_constancia (
            *,
            concepto_pago (
              *
            )
          ),
          resumen_constancia (
            *
          ),
          retencion_isr (
            *
          )
        `)
        .eq("id_constancia", newIdConstancia)
        .single();

      if (fetchErr) throw fetchErr;

      // 3. Generar y subir el nuevo archivo PDF al bucket de almacenamiento
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "-9999px";
      container.style.width = "760px";
      container.style.background = "white";
      container.style.color = "black";
      container.style.padding = "24px";
      document.body.appendChild(container);
      container.innerHTML = getReceiptHtml(newConstanciaData);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      const pdfBlob = pdf.output("blob");

      const fileName = `${newConstanciaData.numero_constancia}.pdf`;
      const filePath = `${newConstanciaData.id_periodo}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("comprobantes")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("comprobantes")
        .getPublicUrl(filePath);

      // 4. Guardar/actualizar en la tabla comprobante_constancia la URL para la nueva constancia
      const { error: upsertErr } = await supabase
        .from("comprobante_constancia")
        .upsert({
          id_constancia: newConstanciaData.id_constancia,
          url_documento: publicUrl,
          actualizado_en: new Date().toISOString(),
        }, { onConflict: "id_constancia" });

      if (upsertErr) throw upsertErr;

      // 5. Registrar en bitácora de edición
      try {
        const logDetails = `Planilla corregida y reactivada a partir de una anulada para empleado ${constanciaToEdit.empleado?.nombre} ${constanciaToEdit.empleado?.apellido}. Documento PDF actualizado en el bucket y base de datos.`;
        await supabase.from("bitacora_edicion_planilla").insert({
          id_periodo: constanciaToEdit.id_periodo,
          detalles: logDetails,
          usuario: "Administrador",
        });
      } catch (logErr) {
        console.warn(logErr);
      }

      setStatusMessage({ type: "success", text: "Constancia corregida, reactivada y comprobante actualizado con éxito." });
      setShowEditModal(false);
      if (selectedPeriodId) {
        loadConstancias(selectedPeriodId);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: "Error al guardar: " + err.message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Solicitar anulación de constancia
  const handleOpenCancelModal = (item: any) => {
    setConstanciaToCancel(item);
    setCancelMotivo("");
    setShowCancelModal(true);
  };

  // Confirmar anulación
  const handleCancelConstancia = async () => {
    if (!constanciaToCancel || !cancelMotivo.trim()) return;
    setIsCancelling(true);
    setStatusMessage(null);
    try {
      const { error } = await supabase.rpc("fn_anular_constancia", {
        p_id_constancia: constanciaToCancel.id_constancia,
        p_motivo: cancelMotivo,
        p_usuario: "Administrador",
      });

      if (error) throw error;

      setStatusMessage({ type: "success", text: "Constancia anulada con éxito." });
      setShowCancelModal(false);
      if (selectedPeriodId) {
        loadConstancias(selectedPeriodId);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: "Error al anular: " + err.message });
    } finally {
      setIsCancelling(false);
    }
  };

  // Generar HTML del comprobante
  const getReceiptHtml = (item: any) => {
    const emp = item.empleado;
    const depto = emp?.departamento?.nombre || "General";
    const empresa = emp?.departamento?.empresa?.nombre || "Importaciones CRESGO, S.A.";
    const nitEmpresa = emp?.departamento?.empresa?.nit || "6906818-6";
    
    const details = item.detalle_constancia || [];
    const incomes = details
      .filter((d: any) => d.concepto_pago?.tipo === "INGRESO" && d.concepto_pago?.codigo !== "TOT_ING")
      .sort((a: any, b: any) => (a.concepto_pago?.orden_display ?? 0) - (b.concepto_pago?.orden_display ?? 0));
    const deductions = details
      .filter((d: any) => d.concepto_pago?.tipo === "DESCUENTO" && d.concepto_pago?.codigo !== "TOT_DES")
      .sort((a: any, b: any) => (a.concepto_pago?.orden_display ?? 0) - (b.concepto_pago?.orden_display ?? 0));
    
    const resRaw = item.resumen_constancia;
    const res = (Array.isArray(resRaw) ? resRaw[0] : resRaw) || { total_ingresos: 0, total_descuentos: 0, liquido_recibir: 0 };
    const totalIng = parseFloat(res.total_ingresos.toString());
    const totalDesc = parseFloat(res.total_descuentos.toString());
    const liquido = parseFloat(res.liquido_recibir.toString());
    
    const retRaw = item.retencion_isr;
    const retencion = (Array.isArray(retRaw) ? retRaw[0] : retRaw) || { renta_acreditada: 0, monto_retenido: 0 };
    
    const dateStr = item.fecha_emision 
      ? new Date(item.fecha_emision).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" })
      : "29 de abril de 2026";
      
    const netPayWords = numeroALetras(liquido);
    
    const incomeRows = incomes.map((d: any) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span>${d.concepto_pago?.nombre || "Ingreso"}</span>
        <span style="font-weight: bold;">${parseFloat(d.monto).toFixed(2)}</span>
      </div>
    `).join("");
    
    const deductionRows = deductions.map((d: any) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span>${d.concepto_pago?.nombre || "Descuento"}</span>
        <span style="font-weight: bold;">${parseFloat(d.monto).toFixed(2)}</span>
      </div>
    `).join("");

    return `
      <div id="official-receipt" style="background-color: white; color: black; font-family: monospace; font-size: 11px; line-height: 1.6; padding: 24px; border: 1px solid black; width: 720px; box-sizing: border-box;">
        <div style="display: flex; flex-direction: column; gap: 8px; padding-bottom: 16px; text-align: left;">
          <div style="display: flex;">
            <span style="width: 112px; flex-shrink: 0; font-weight: bold;">Recibí de:</span>
            <span style="flex-1;">${empresa}</span>
          </div>
          <div style="display: flex;">
            <span style="width: 112px; flex-shrink: 0; font-weight: bold;">La cantidad de:</span>
            <span style="flex-1; font-weight: bold; text-transform: uppercase;">${netPayWords}</span>
          </div>
          <div style="display: flex;">
            <span style="width: 112px; flex-shrink: 0; font-weight: bold;">En concepto de:</span>
            <span style="flex-1; text-align: justify;">
              ${item.texto_concepto || ""}
            </span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; border-top: 1px solid black; padding-top: 12px;">
          <!-- Column 1: INGRESOS -->
          <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%; border-right: 1px dashed rgba(0,0,0,0.3); padding-right: 16px;">
            <div>
              <h4 style="font-weight: bold; border-bottom: 1px solid black; padding-bottom: 4px; margin-top: 0; margin-bottom: 8px; text-transform: uppercase; text-align: left;">INGRESOS</h4>
              <div style="text-align: left;">
                ${incomeRows}
              </div>
            </div>
            <div style="border-top: 1px solid black; padding-top: 4px; margin-top: 8px;">
              <div style="display: flex; justify-content: space-between; font-weight: bold; border-bottom: 4px double black; padding-bottom: 2px;">
                <span>TOTAL INGRESOS</span>
                <span>${totalIng.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <!-- Column 2: DESCUENTOS -->
          <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
            <div>
              <h4 style="font-weight: bold; border-bottom: 1px solid black; padding-bottom: 4px; margin-top: 0; margin-bottom: 8px; text-transform: uppercase; text-align: left;">DESCUENTOS</h4>
              <div style="text-align: left;">
                ${deductionRows}
              </div>
            </div>
            <div style="border-top: 1px solid black; padding-top: 4px; margin-top: 8px;">
              <div style="display: flex; justify-content: space-between; font-weight: bold; border-bottom: 4px double black; padding-bottom: 2px;">
                <span>TOTAL DESCUENTOS</span>
                <span>${totalDesc.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; padding-top: 16px;">
          <div style="width: 256px; padding-top: 8px; border-top: 1px solid black; text-align: left;">
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
              <span>Total de Ingresos</span>
              <span>${totalIng.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
              <span>(-) Total de Descuentos</span>
              <span>${totalDesc.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; padding-top: 4px; border-top: 1px solid black; border-bottom: 4px double black; padding-bottom: 2px;">
              <span>Líquido Recibido</span>
              <span>${liquido.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style="text-align: center; padding: 24px 0; font-weight: bold;">
          Guatemala, ${dateStr}
        </div>

        <div style="border: 1px solid black; margin-top: 8px;">
          <div style="background-color: black; color: white; text-align: center; padding: 4px 0; font-weight: bold; text-transform: uppercase; font-size: 10px;">
            CONSTANCIA DE RETENCION DEL IMPUESTO SOBRE LA RENTA DEL TRABAJO
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding: 12px; font-size: 10px; line-height: 1.6; text-align: left; border-top: 1px solid black;">
            <div>
              <p style="margin: 0;"><span style="font-weight: bold;">Patrono:</span> ${empresa}</p>
              <p style="margin: 4px 0 0 0;"><span style="font-weight: bold;">Empleado:</span> ${emp?.nombre} ${emp?.apellido}</p>
            </div>
            <div>
              <p style="margin: 0;"><span style="font-weight: bold;">NIT:</span> ${nitEmpresa}</p>
              <p style="margin: 4px 0 0 0;"><span style="font-weight: bold;">NIT/CUI:</span> ${emp?.cui || "xxxxxxxx-x"}</p>
            </div>
            <div>
              <p style="margin: 0;"><span style="font-weight: bold;">Renta Acreditada:</span> ${parseFloat(retencion.renta_acreditada || 0).toFixed(2)}</p>
              <p style="margin: 4px 0 0 0;"><span style="font-weight: bold;">Monto Retenido:</span> ${parseFloat(retencion.monto_retenido || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; padding-top: 48px; align-items: flex-end;">
          <div style="position: relative; padding-top: 32px; text-align: left;">
            <div style="border-top: 1px solid black; padding-top: 4px;">
              <p style="font-weight: bold; margin: 0;">F) ${emp?.nombre} ${emp?.apellido}</p>
              <p style="font-size: 9px; margin: 2px 0 0 0;">CUI: ${emp?.cui || "2994 82910 0101"}</p>
            </div>
          </div>
          <div style="text-align: right; padding-bottom: 4px; font-size: 10px;">
            <p style="font-weight: bold; margin: 0;">Depósito a cuenta Banco Industrial</p>
          </div>
        </div>
      </div>
    `;
  };

  // Descargar PDF individual
  const downloadPdf = async (item: any) => {
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "-9999px";
      container.style.width = "760px";
      container.style.background = "white";
      container.style.color = "black";
      container.style.padding = "24px";
      document.body.appendChild(container);
      container.innerHTML = getReceiptHtml(item);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`Constancia_${item.numero_constancia}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert("Error al generar PDF: " + err.message);
    }
  };

  // Generar ZIP y guardar URLs en Base de Datos
  const handleGenerateZip = async () => {
    if (!selectedPeriodId || constancias.length === 0) return;
    setIsGeneratingZip(true);
    setZipProgress({ current: 0, total: constancias.length });

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      for (let i = 0; i < constancias.length; i++) {
        const item = constancias[i];
        setZipProgress({ current: i + 1, total: constancias.length });

        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.left = "-9999px";
        container.style.top = "-9999px";
        container.style.width = "760px";
        container.style.background = "white";
        container.style.color = "black";
        container.style.padding = "24px";
        document.body.appendChild(container);
        container.innerHTML = getReceiptHtml(item);

        await new Promise((resolve) => setTimeout(resolve, 150));

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        document.body.removeChild(container);

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        const pdfBlob = pdf.output("blob");

        // Subir a Supabase Storage
        const fileName = `${item.numero_constancia}.pdf`;
        const filePath = `${selectedPeriodId}/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("comprobantes")
          .upload(filePath, pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage
            .from("comprobantes")
            .getPublicUrl(filePath);

          // Guardar en comprobante_constancia
          await supabase
            .from("comprobante_constancia")
            .upsert({
              id_constancia: item.id_constancia,
              url_documento: publicUrl,
              actualizado_en: new Date().toISOString(),
            }, { onConflict: "id_constancia" });
        }

        zip.file(`${item.numero_constancia}.pdf`, pdfBlob);
      }

      // Descargar Zip
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Constancias_${selectedPeriod?.mes}_${selectedPeriod?.anio}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMessage({ type: "success", text: "¡ZIP generado y URLs almacenadas exitosamente en la base de datos!" });
      loadConstancias(selectedPeriodId);
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: "Error en proceso ZIP: " + err.message });
    } finally {
      setIsGeneratingZip(false);
      setZipProgress(null);
    }
  };

  // Filtrado de constancias ordenadas alfabéticamente
  const filteredConstancias = constancias
    .filter((item) => {
      const statusMatch =
        selectedStatus === "Todos" ||
        (selectedStatus === "Activas" && !item.anulada) ||
        (selectedStatus === "Anuladas" && item.anulada);

      const name = `${item.empleado?.nombre} ${item.empleado?.apellido}`.toLowerCase();
      const docNum = (item.numero_constancia || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      const searchMatch = !searchQuery || name.includes(query) || docNum.includes(query);

      return statusMatch && searchMatch;
    })
    .sort((a, b) => {
      const nameA = `${a.empleado?.apellido || ""} ${a.empleado?.nombre || ""}`.toLowerCase().trim();
      const nameB = `${b.empleado?.apellido || ""} ${b.empleado?.nombre || ""}`.toLowerCase().trim();
      return nameA.localeCompare(nameB);
    });

  // Totales
  const totalCount = filteredConstancias.length;
  const activeCount = filteredConstancias.filter((c) => !c.anulada).length;
  const cancelledCount = filteredConstancias.filter((c) => c.anulada).length;

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentConstancias = filteredConstancias.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredConstancias.length / itemsPerPage);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar activePage="constancias" />
      
      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 flex flex-col min-w-0">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-section-gap py-4 z-30 sticky top-0 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant">
          <div className="flex items-center gap-4 pl-12 md:pl-0">
            <h2 className="font-h3 text-h3 font-semibold text-on-surface">Gestión de Constancias</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full border border-outline-variant">
              <span className="material-symbols-outlined text-on-surface-variant text-sm" data-icon="search">search</span>
              <input 
                className="bg-transparent border-none text-body-sm focus:ring-0 placeholder-on-surface-variant/50 w-48 focus:outline-none" 
                placeholder="Buscar empleado..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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

        {/* View Content */}
        <div className="p-4 md:p-section-gap space-y-gutter">
          {/* Filters and Actions Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="space-y-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant block uppercase font-bold">Periodo de Planilla</label>
                <select 
                  value={selectedPeriodId || ""} 
                  onChange={(e) => setSelectedPeriodId(parseInt(e.target.value))}
                  className="form-select border-outline-variant bg-surface rounded-lg text-body-base px-4 py-2 min-w-[280px] focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                >
                  {periods.map((p) => (
                    <option key={p.id_periodo} value={p.id_periodo}>
                      {p.mes} {p.anio} ({p.tipo}) {p.cerrado ? "🔒 Cerrado" : "🔓 Abierto"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant block uppercase font-bold">Estado</label>
                <select 
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="form-select border-outline-variant bg-surface rounded-lg text-body-base px-4 py-2 min-w-[160px] focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                >
                  <option value="Todos">Todos</option>
                  <option value="Activas">Activas</option>
                  <option value="Anuladas">Anuladas</option>
                </select>
              </div>
            </div>
            
            <button 
              onClick={handleGenerateZip}
              disabled={!isPeriodClosed || constancias.length === 0 || isGeneratingZip}
              className={`flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer ${
                isPeriodClosed 
                  ? "bg-primary text-on-primary hover:opacity-90" 
                  : "bg-surface-variant text-on-surface-variant/40 cursor-not-allowed opacity-50"
              }`}
              title={isPeriodClosed ? "Generar ZIP" : "El período debe estar cerrado en el registro de planilla para habilitar el ZIP"}
            >
              <span className="material-symbols-outlined" data-icon="folder_zip">folder_zip</span>
              {isGeneratingZip ? "Procesando..." : "Generar todas (ZIP)"}
            </button>
          </div>

          {/* Progress Overlay for ZIP Generation */}
          {isGeneratingZip && zipProgress && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex justify-between text-body-sm font-semibold text-primary">
                <span>Generando comprobantes y subiendo a la base de datos...</span>
                <span>{zipProgress.current} / {zipProgress.total} ({Math.round((zipProgress.current / zipProgress.total) * 100)}%)</span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(zipProgress.current / zipProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Main Data Table Container */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Empleado</th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Período</th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider"># Constancia</th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Fecha Emisión</th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <span>Cargando constancias del periodo...</span>
                        </div>
                      </td>
                    </tr>
                  ) : currentConstancias.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                        No se encontraron constancias.
                      </td>
                    </tr>
                  ) : (
                    currentConstancias.map((item) => {
                      const docUrl = item.comprobante_constancia?.url_documento;
                      const hasDoc = !!docUrl;
                      
                      return (
                        <tr key={item.id_constancia} className="hover:bg-surface-container-low/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container text-xs font-bold">
                                {item.empleado?.nombre?.[0] || ""}{item.empleado?.apellido?.[0] || ""}
                              </div>
                              <div>
                                <p className="font-body-base text-body-base font-semibold text-on-surface">
                                  {item.empleado?.nombre} {item.empleado?.apellido}
                                </p>
                                <p className="text-[11px] text-on-surface-variant opacity-70">
                                  CUI: {item.empleado?.cui || "N/A"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-body-base text-body-base">
                            {selectedPeriod?.mes} {selectedPeriod?.anio}
                          </td>
                          <td className="px-6 py-4 font-data-tabular text-data-tabular">{item.numero_constancia}</td>
                          <td className="px-6 py-4 font-body-base text-body-base">
                            {item.fecha_emision ? new Date(item.fecha_emision).toLocaleDateString("es-GT") : "N/A"}
                          </td>
                          <td className="px-6 py-4">
                            {item.anulada ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-600 border border-slate-300">
                                Anulada
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                Activa
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              {/* Ver Comprobante */}
                              <button 
                                onClick={() => {
                                  if (hasDoc) {
                                    window.open(docUrl, "_blank");
                                  } else {
                                    alert("El comprobante de pago aún no ha sido cargado/registrado en la base de datos. Se registrará al generar el ZIP del periodo cerrado.");
                                  }
                                }}
                                className={`p-2 rounded-lg transition-all ${
                                  hasDoc 
                                    ? "text-primary hover:bg-primary-fixed/30 cursor-pointer" 
                                    : "text-on-surface-variant/30 cursor-not-allowed"
                                }`} 
                                title={hasDoc ? "Ver Comprobante Digital" : "Comprobante no guardado en base de datos"}
                              >
                                <span className="material-symbols-outlined">visibility</span>
                              </button>

                              {/* Descargar PDF */}
                              <button 
                                onClick={() => downloadPdf(item)}
                                disabled={item.anulada}
                                className={`p-2 rounded-lg transition-all ${
                                  item.anulada 
                                    ? "text-on-surface-variant/30 cursor-not-allowed" 
                                    : "text-primary hover:bg-primary-fixed/30 cursor-pointer"
                                }`}
                                title={item.anulada ? "No descargable (Anulada)" : "Descargar PDF"}
                              >
                                <span className="material-symbols-outlined">picture_as_pdf</span>
                              </button>

                              {/* Anular */}
                              <button 
                                onClick={() => handleOpenCancelModal(item)}
                                disabled={!hasDoc || item.anulada}
                                className={`p-2 rounded-lg transition-all ${
                                  !hasDoc || item.anulada
                                    ? "text-on-surface-variant/30 cursor-not-allowed" 
                                    : "text-error hover:bg-error-container cursor-pointer"
                                }`}
                                title={
                                  !hasDoc
                                    ? "No cancelable (debe generarse primero)"
                                    : item.anulada 
                                      ? "Ya anulada" 
                                      : "Anular"
                                }
                              >
                                <span className="material-symbols-outlined">cancel</span>
                              </button>

                              {/* Editar (Habilitado solo si está anulada) */}
                              <button 
                                onClick={() => handleOpenEditModal(item)}
                                disabled={!item.anulada}
                                className={`p-2 rounded-lg transition-all ${
                                  item.anulada
                                    ? "text-primary hover:bg-primary-fixed/30 cursor-pointer font-bold" 
                                    : "text-on-surface-variant/30 cursor-not-allowed"
                                }`}
                                title={
                                  !item.anulada 
                                    ? "No editable (debe ser anulada primero)" 
                                    : "Editar y reactivar"
                                }
                              >
                                <span className="material-symbols-outlined">edit</span>
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
              <div className="px-6 py-4 flex items-center justify-between border-t border-outline-variant bg-surface-container-low/30">
                <p className="text-body-sm text-on-surface-variant">
                  Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredConstancias.length)} de {filteredConstancias.length} constancias
                </p>
                <div className="flex items-center gap-2">
                  <button 
                    className="p-2 rounded hover:bg-surface-container transition-colors disabled:opacity-30" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  >
                    <span className="material-symbols-outlined" data-icon="chevron_left">chevron_left</span>
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                        currentPage === idx + 1 
                          ? "bg-primary text-on-primary" 
                          : "hover:bg-surface-container text-on-surface-variant font-medium"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button 
                    className="p-2 rounded hover:bg-surface-container transition-colors disabled:opacity-30"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  >
                    <span className="material-symbols-outlined" data-icon="chevron_right">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bento Grid Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-1 md:col-span-2 bg-primary-container text-on-primary-container p-6 rounded-xl border-t-4 border-primary shadow-sm flex flex-col justify-between">
              <div>
                <p className="font-label-caps text-label-caps uppercase opacity-80 font-bold">Total Generado este Periodo</p>
                <h4 className="text-h1 font-h1 mt-2 font-bold">{totalCount}</h4>
              </div>
              <div className="mt-4 flex items-center gap-2 text-body-sm bg-on-primary-container/10 p-2 rounded w-fit">
                <span className="material-symbols-outlined" data-icon="trending_up">trending_up</span>
                <span>Actualizado desde base de datos</span>
              </div>
            </div>
            
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant border-t-4 border-primary shadow-sm">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">Constancias Activas</p>
              <h4 className="text-h2 font-h2 mt-2 text-primary font-bold">{activeCount}</h4>
              <p className="text-body-sm text-on-surface-variant mt-2">
                {totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}%` : "0%"} efectividad
              </p>
            </div>
            
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant border-t-4 border-error shadow-sm">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">Total Anuladas</p>
              <h4 className="text-h2 font-h2 mt-2 text-error font-bold">{cancelledCount}</h4>
              <p className="text-body-sm text-on-surface-variant mt-2">
                Reactivables por edición: {cancelledCount}
              </p>
            </div>
          </div>

          {/* Contextual Help */}
          <div className="relative overflow-hidden bg-inverse-surface text-inverse-on-surface p-8 rounded-xl flex flex-col md:flex-row items-center gap-8 border border-outline-variant">
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="relative z-10 w-20 h-20 shrink-0 bg-primary-fixed text-on-primary-fixed rounded-2xl flex items-center justify-center rotate-3">
              <span className="material-symbols-outlined text-4xl" data-icon="verified">verified</span>
            </div>
            <div className="relative z-10">
              <h3 className="font-h3 text-h3 mb-2 font-bold">Validez Legal del Documento</h3>
              <p className="text-body-base opacity-80 max-w-2xl">
                Todas las constancias de pago generadas en el sistema de Importaciones CRESGO cuentan con respaldo legal y hash determinista de verificación de firma, asegurando transparencia y auditoría fiscal.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: Anulación de Constancia */}
      {showCancelModal && constanciaToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm px-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-outline-variant animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="font-h2 text-h2 text-error flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined">cancel</span>
                Anular Constancia de Pago
              </h3>
              <button 
                onClick={() => setShowCancelModal(false)}
                className="p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-body-base text-on-surface-variant">
                Se dará de baja el actual documento de constancia de pago para el periodo especificado (<strong>{selectedPeriod?.mes} {selectedPeriod?.anio}</strong>).
              </p>
              <p className="text-body-sm text-on-surface-variant opacity-80">
                ¿Está seguro que desea proceder con la anulación de la constancia <strong>{constanciaToCancel.numero_constancia}</strong> del colaborador <strong>{constanciaToCancel.empleado?.nombre} {constanciaToCancel.empleado?.apellido}</strong>?
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-label-caps text-on-surface-variant font-bold">Motivo de Anulación</label>
                <textarea 
                  value={cancelMotivo}
                  onChange={(e) => setCancelMotivo(e.target.value)}
                  placeholder="Escriba la razón de la anulación..."
                  rows={3}
                  className="bg-background border border-outline-variant rounded-lg px-3 py-2 text-body-base focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="p-6 bg-surface-container-low border-t border-outline-variant flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="bg-white border border-outline-variant text-on-surface-variant px-5 py-2.5 rounded-lg font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCancelConstancia}
                disabled={isCancelling || !cancelMotivo.trim()}
                className="bg-error text-on-error px-5 py-2.5 rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isCancelling ? "Anulando..." : "Confirmar Anulación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edición y Reactivación de Constancia Anulada */}
      {showEditModal && constanciaToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm px-4">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-outline-variant animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="font-h2 text-h2 text-primary flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined">edit_note</span>
                Editar y Reactivar Comprobante
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 max-h-[50vh] overflow-y-auto space-y-6">
              <div className="flex justify-between items-center bg-surface-container p-4 rounded-lg">
                <div>
                  <p className="font-bold text-on-surface text-body-base">Colaborador: {constanciaToEdit.empleado?.nombre} {constanciaToEdit.empleado?.apellido}</p>
                  <p className="text-xs text-on-surface-variant">Puesto: {constanciaToEdit.empleado?.puesto}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-error uppercase">Constancia Anterior Anulada</p>
                  <p className="text-xs text-on-surface-variant font-data-tabular">No: {constanciaToEdit.numero_constancia}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Ingresos manuales */}
                <div className="space-y-4">
                  <h4 className="font-label-caps text-label-caps text-primary border-b border-outline-variant pb-2 font-bold">INGRESOS EDITABLES</h4>
                  {conceptos.filter(c => c.tipo === "INGRESO" && c.origen === "MANUAL").map(c => (
                    <div key={c.id_concepto} className="flex flex-col gap-1.5">
                      <label className="text-xs text-on-surface-variant font-semibold">{c.nombre}</label>
                      <input 
                        type="number"
                        value={editValues[c.id_concepto] || 0}
                        onChange={(e) => handleEditCellChange(c.id_concepto, parseFloat(e.target.value) || 0)}
                        className="bg-background border border-outline-variant rounded-lg px-3 py-1.5 text-body-sm focus:ring-2 focus:ring-primary focus:outline-none text-right font-data-tabular"
                      />
                    </div>
                  ))}
                </div>

                {/* Descuentos manuales */}
                <div className="space-y-4">
                  <h4 className="font-label-caps text-label-caps text-error border-b border-outline-variant pb-2 font-bold">DESCUENTOS EDITABLES</h4>
                  {conceptos.filter(c => c.tipo === "DESCUENTO" && c.origen === "MANUAL").map(c => (
                    <div key={c.id_concepto} className="flex flex-col gap-1.5">
                      <label className="text-xs text-on-surface-variant font-semibold">{c.nombre}</label>
                      <input 
                        type="number"
                        value={editValues[c.id_concepto] || 0}
                        onChange={(e) => handleEditCellChange(c.id_concepto, parseFloat(e.target.value) || 0)}
                        className="bg-background border border-outline-variant rounded-lg px-3 py-1.5 text-body-sm focus:ring-2 focus:ring-primary focus:outline-none text-right font-data-tabular"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales de Recalculo en tiempo real */}
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant flex justify-between items-center">
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Total Ingresos</span>
                  <p className="text-body-base font-bold text-primary font-data-tabular">
                    Q {formatCurrency(totIngConcept ? editValues[totIngConcept.id_concepto] || 0 : 0)}
                  </p>
                </div>
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Total Descuentos</span>
                  <p className="text-body-base font-bold text-error font-data-tabular">
                    Q {formatCurrency(totDescConcept ? editValues[totDescConcept.id_concepto] || 0 : 0)}
                  </p>
                </div>
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Líquido a Recibir</span>
                  <p className="text-h3 font-bold text-primary font-data-tabular">
                    Q {formatCurrency(totLiqConcept ? editValues[totLiqConcept.id_concepto] || 0 : 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-surface-container-low border-t border-outline-variant flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="bg-white border border-outline-variant text-on-surface-variant px-5 py-2.5 rounded-lg font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSavingEdit ? "Guardando..." : "Generar Nueva Constancia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
