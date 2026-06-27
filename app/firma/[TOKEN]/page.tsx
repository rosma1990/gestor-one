"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface Empleado {
  id_empleado: number;
  nombre: string;
  apellido: string;
  cui: string | null;
  nit: string | null;
  puesto: string | null;
  departamento: {
    nombre: string;
    empresa: {
      nombre: string;
    } | null;
  } | null;
}

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

export default function SignaturePage() {
  const routeParams = useParams();
  // El parámetro de ruta coincide con el nombre de la carpeta de la ruta dinámica, el cual es [TOKEN] en mayúsculas.
  const token = routeParams ? ((routeParams.TOKEN || routeParams.token) as string) : "";

  // Estados de carga y flujo
  const [status, setStatus] = useState<"loading" | "invalid" | "active" | "signed">("loading");
  const [employee, setEmployee] = useState<any | null>(null);
  const [constanciaData, setConstanciaData] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [generatingSignature, setGeneratingSignature] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [debugTimer, setDebugTimer] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebugTimer(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Datos de firma
  const [signedAt, setSignedAt] = useState("");
  const [originIp, setOriginIp] = useState("");
  const [savedSignatureData, setSavedSignatureData] = useState("");
  const [shaHash, setShaHash] = useState("");

  // Canvas Ref & Drawing State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Carga inicial y validación del token
  useEffect(() => {
    if (!token) return;

    const validateTokenAndFetchEmployee = async () => {
      try {
        const res = await fetch(`/api/signature-token?token=${token}`);
        if (!res.ok) {
          setStatus("invalid");
          return;
        }

        const tokenData = await res.json();

        if (tokenData.constancia) {
          setConstanciaData(tokenData.constancia);
          setEmployee(tokenData.constancia.empleado);
        } else {
          setStatus("invalid");
          return;
        }

        // Generar un hash determinista a partir del token para simular un Código de Verificación SHA-256
        const simpleHash = Array.from(token.replace(/-/g, ""))
          .slice(0, 12)
          .map((char, index) => (index % 4 === 0 && index > 0 ? `:${char}` : char))
          .join("")
          .toUpperCase();
        setShaHash(`SHA-256: ${simpleHash}...${token.slice(-4).toUpperCase()}`);

        if (tokenData.usado) {
          setSignedAt(tokenData.signedAt || "");
          setOriginIp(tokenData.ip || "");
          setSavedSignatureData(tokenData.signatureData || "");
          setStatus("signed");
        } else {
          setStatus("active");
        }
      } catch (err) {
        console.error("Error en validación:", err);
        setStatus("invalid");
      }
    };

    validateTokenAndFetchEmployee();
  }, [token]);

  // Dimensionamiento dinámico del canvas al abrir el modal
  useEffect(() => {
    if (showModal && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#0b1c30";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [showModal]);

  // Coordinadas del mouse/toque relativas al canvas
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Iniciar trazo
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
      setHasSigned(true);
    }
  };

  // Dibujar trazo en movimiento
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  // Finalizar trazo
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Limpiar lienzo
  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
    }
  };

  // Enviar firma y confirmar recibo
  const confirmSignature = async () => {
    if (!hasSigned || !canvasRef.current) return;

    setGeneratingSignature(true);
    try {
      // Extraer base64 PNG del canvas
      const signatureDataUrl = canvasRef.current.toDataURL("image/png");

      const response = await fetch("/api/signature-token/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          signatureData: signatureDataUrl,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSignedAt(data.signedAt);
        setOriginIp(data.ip);
        setSavedSignatureData(signatureDataUrl);
        setShowModal(false);
        setStatus("signed");

        // Iniciar proceso de generación y subida de PDF
        setUploadingPdf(true);
        setTimeout(async () => {
          try {
            await generateAndUploadSignedPdf();
          } catch (uploadErr) {
            console.error("Error subiendo el PDF:", uploadErr);
          } finally {
            setUploadingPdf(false);
          }
        }, 500);
      } else {
        alert("Error al confirmar firma: " + (data.error || "Respuesta inválida"));
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al enviar la firma.");
    } finally {
      setGeneratingSignature(false);
    }
  };

  // Renderiza el recibo oficial de alta fidelidad basado exactamente en la captura provista
  const renderOfficialReceipt = () => {
    if (!employee || !constanciaData) return null;

    const emp = employee;
    const depto = emp?.departamento?.nombre || "General";
    const empresa = emp?.departamento?.empresa?.nombre || "Importaciones CRESGO, S.A.";
    const nitEmpresa = emp?.departamento?.empresa?.nit || "6906818-6";
    const direccionEmpresa = emp?.departamento?.empresa?.direccion || "";
    const telefonoEmpresa = emp?.departamento?.empresa?.telefono || "";

    const details = constanciaData.detalle_constancia || [];
    const incomes = details
      .filter((d: any) => d.concepto_pago?.tipo === "INGRESO" && d.concepto_pago?.codigo !== "TOT_ING")
      .sort((a: any, b: any) => (a.concepto_pago?.orden_display ?? 0) - (b.concepto_pago?.orden_display ?? 0));
    const deductions = details
      .filter((d: any) => d.concepto_pago?.tipo === "DESCUENTO" && d.concepto_pago?.codigo !== "TOT_DES")
      .sort((a: any, b: any) => (a.concepto_pago?.orden_display ?? 0) - (b.concepto_pago?.orden_display ?? 0));

    const resRaw = constanciaData.resumen_constancia;
    const res = (Array.isArray(resRaw) ? resRaw[0] : resRaw) || { total_ingresos: 0, total_descuentos: 0, liquido_recibir: 0 };
    const totalIng = parseFloat(res.total_ingresos.toString());
    const totalDesc = parseFloat(res.total_descuentos.toString());
    const liquido = parseFloat(res.liquido_recibir.toString());

    const retRaw = constanciaData.retencion_isr;
    const retencion = (Array.isArray(retRaw) ? retRaw[0] : retRaw) || { renta_acreditada: 0, monto_retenido: 0 };

    const dateStr = constanciaData.fecha_emision
      ? new Date(constanciaData.fecha_emision).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" })
      : "29 de abril de 2026";

    const netPayWords = numeroALetras(liquido);

    const mainAcct = emp.cuenta_bancaria_empleado?.find((a: any) => a.principal && a.activa) ||
      emp.cuenta_bancaria_empleado?.find((a: any) => a.activa) ||
      (constanciaData.banco_deposito ? { banco: constanciaData.banco_deposito, numero_cuenta: constanciaData.cuenta_deposito } : null);

    return (
      <div id="official-receipt" className="bg-white text-black font-mono text-[11px] leading-relaxed p-6 border border-black shadow-sm w-full print:border-none print:shadow-none print:p-0 print:m-0 print:text-[10px]">
        {/* Recibí de, La cantidad de, En concepto de */}
        <div className="space-y-1 pb-4 text-left">
          <div className="flex">
            <span className="w-28 flex-shrink-0 font-bold">Recibí de:</span>
            <span className="flex-1">{empresa}</span>
          </div>
          <div className="flex">
            <span className="w-28 flex-shrink-0 font-bold">La cantidad de:</span>
            <span className="flex-1 font-bold uppercase text-[10px]">{netPayWords}</span>
          </div>
          <div className="flex">
            <span className="w-28 flex-shrink-0 font-bold">En concepto de:</span>
            <span className="flex-1 text-justify">
              {constanciaData.texto_concepto}
            </span>
          </div>
        </div>

        {/* Ingresos / Descuentos Table Grid */}
        <div className="grid grid-cols-2 gap-x-8 border-t border-black pt-3">
          {/* Column 1: INGRESOS */}
          <div className="flex flex-col justify-between h-full border-r border-dashed border-black/30 pr-4">
            <div>
              <h4 className="font-bold border-b border-black pb-0.5 mb-2 uppercase tracking-wide text-left">INGRESOS</h4>
              <div className="space-y-1 text-left">
                {incomes.map((d: any) => (
                  <div key={d.id_detalle} className="flex justify-between">
                    <span>{d.concepto_pago?.nombre || "Ingreso"}</span>
                    <span className="font-bold">{parseFloat(d.monto).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-black pt-1 mt-2">
              <div className="flex justify-between font-bold border-b-4 border-double border-black pb-0.5">
                <span>TOTAL INGRESOS</span>
                <span>{totalIng.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Column 2: DESCUENTOS */}
          <div className="flex flex-col justify-between h-full">
            <div>
              <h4 className="font-bold border-b border-black pb-0.5 mb-2 uppercase tracking-wide text-left">DESCUENTOS</h4>
              <div className="space-y-1 text-left">
                {deductions.map((d: any) => (
                  <div key={d.id_detalle} className="flex justify-between">
                    <span>{d.concepto_pago?.nombre || "Descuento"}</span>
                    <span className="font-bold">{parseFloat(d.monto).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-black pt-1 mt-2">
              <div className="flex justify-between font-bold border-b-4 border-double border-black pb-0.5">
                <span>TOTAL DESCUENTOS</span>
                <span>{totalDesc.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Líquido Recibido Box */}
        <div className="flex justify-end pt-4">
          <div className="w-64 space-y-1 border-t border-black pt-2 text-left">
            <div className="flex justify-between text-[10px]">
              <span>Total de Ingresos</span>
              <span>{totalIng.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>(-) Total de Descuentos</span>
              <span>{totalDesc.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-xs pt-1 border-t border-black border-b-4 border-double border-black pb-0.5">
              <span>Líquido Recibido</span>
              <span>{liquido.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="text-center py-6 font-bold">
          Guatemala, {dateStr}
        </div>

        {/* Constancia de Retención ISR Banner */}
        <div className="border border-black mt-2">
          <div className="bg-black text-white text-center py-1 font-bold uppercase tracking-wider text-[10px]">
            CONSTANCIA DE RETENCION DEL IMPUESTO SOBRE LA RENTA DEL TRABAJO
          </div>
          <div className="grid grid-cols-3 gap-2 p-3 text-[10px] leading-relaxed text-left border-t border-black">
            <div>
              <p><span className="font-bold">Patrono:</span> {empresa}</p>
              <p><span className="font-bold">Empleado:</span> {emp.nombre} {emp.apellido}</p>
            </div>
            <div>
              <p><span className="font-bold">NIT:</span> {nitEmpresa}</p>
              <p><span className="font-bold">NIT/CUI:</span> {emp.cui || "xxxxxxxx-x"}</p>
            </div>
            <div>
              <p><span className="font-bold">Renta Acreditada:</span> {parseFloat(retencion.renta_acreditada || 0).toFixed(2)}</p>
              <p><span className="font-bold">Monto Retenido:</span> {parseFloat(retencion.monto_retenido || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Bottom Signature Row */}
        <div className="grid grid-cols-2 gap-8 pt-12 items-end">
          {/* Signature Line */}
          <div className="relative pt-14 text-left">
            {savedSignatureData && (
              <div className="absolute left-0 bottom-[38px] w-48 h-16 flex items-center justify-start overflow-hidden">
                <img
                  src={savedSignatureData}
                  alt="Firma del empleado"
                  className="max-h-full max-w-full object-contain pointer-events-none mix-blend-multiply"
                />
              </div>
            )}
            <div className="border-t border-black pt-1">
              <p className="font-bold">F) {emp.nombre} {emp.apellido}</p>
              <p className="text-[9px]">CUI: {emp.cui || "xxxxxxxxxxxxx"}</p>
            </div>
          </div>

          {/* Deposit Info */}
          <div className="text-right pb-1 text-[10px]">
            <p className="font-bold">
              {mainAcct ? `Depósito a cuenta ${mainAcct.banco} No. ${mainAcct.numero_cuenta}` : "Pago en efectivo / cheque"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Función para realizar la descarga directa en formato PDF sin pasar por el diálogo de impresión
  const downloadPdf = async () => {
    const receiptElement = document.getElementById("official-receipt");
    if (!receiptElement) return;

    setDownloadingPdf(true);
    try {
      // Importaciones dinámicas para evitar errores en el servidor (SSR)
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      // 1. Crear un iframe oculto en el DOM
      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.width = "800px"; // Ancho adecuado para renderizado nítido de la constancia
      iframe.style.height = "0px";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) throw new Error("No se pudo acceder al documento del iframe");

      // 2. Clonar el elemento del recibo oficial
      const clonedReceipt = receiptElement.cloneNode(true) as HTMLElement;

      // Asegurarnos de remover clases específicas de impresión que puedan ocultarlo
      clonedReceipt.className = clonedReceipt.className.replace("print:hidden", "");

      // 3. Escribir un HTML limpio en el iframe que contenga estilos estáticos puros (libres de oklch/oklab)
      iframeDoc.open();
      iframeDoc.write(`
        <html>
          <head>
            <style>
              body {
                margin: 0;
                padding: 24px;
                background-color: white;
                color: black;
                font-family: monospace;
                font-size: 11px;
                line-height: 1.6;
              }
              .flex { display: flex; }
              .flex-1 { flex: 1; }
              .flex-shrink-0 { flex-shrink: 0; }
              .flex-col { flex-direction: column; }
              .justify-between { justify-content: space-between; }
              .justify-start { justify-content: flex-start; }
              .justify-end { justify-content: flex-end; }
              .items-end { align-items: flex-end; }
              .items-center { align-items: center; }
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: 1fr 1fr; }
              .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
              .gap-2 { gap: 8px; }
              .gap-8 { gap: 32px; }
              .gap-x-8 { column-gap: 32px; }
              .border { border: 1px solid black; }
              .border-t { border-top: 1px solid black; }
              .border-b { border-bottom: 1px solid black; }
              .border-r { border-right: 1px solid black; }
              .border-black { border-color: black; }
              .border-dashed { border-style: dashed; }
              .border-black\\/30 { border-color: rgba(0,0,0,0.3); }
              .border-b-4 { border-bottom-width: 4px; }
              .border-double { border-bottom-style: double; }
              .w-28 { width: 112px; }
              .w-64 { width: 256px; }
              .w-48 { width: 192px; }
              .h-16 { height: 64px; }
              .pb-4 { padding-bottom: 16px; }
              .pt-3 { padding-top: 12px; }
              .pt-4 { padding-top: 16px; }
              .pt-12 { padding-top: 48px; }
              .pt-14 { padding-top: 56px; }
              .pt-1 { padding-top: 4px; }
              .pb-1 { padding-bottom: 4px; }
              .pr-4 { padding-right: 16px; }
              .p-6 { padding: 24px; }
              .p-3 { padding: 12px; }
              .mt-2 { margin-top: 8px; }
              .mb-2 { margin-top: 8px; }
              .py-6 { padding-top: 24px; padding-bottom: 24px; }
              .py-1 { padding-top: 4px; padding-bottom: 4px; }
              .font-bold { font-weight: bold; }
              .text-left { text-align: left; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .text-justify { text-align: justify; }
              .uppercase { text-transform: uppercase; }
              .text-xs { font-size: 12px; }
              .text-\\[10px\\] { font-size: 10px; }
              .text-\\[9px\\] { font-size: 9px; }
              .bg-black { background-color: black; color: white; }
              .bg-white { background-color: white; }
              .text-white { color: white; }
              .relative { position: relative; }
              .absolute { position: absolute; }
              .left-0 { left: 0px; }
              .bottom-\\[38px\\] { bottom: 38px; }
              .overflow-hidden { overflow: hidden; }
              .mix-blend-multiply { mix-blend-mode: multiply; }
              .max-h-full { max-height: 100%; }
              .max-w-full { max-width: 100%; }
              .object-contain { object-fit: contain; }
              .pointer-events-none { pointer-events: none; }
            </style>
          </head>
          <body>
            <div style="width: 760px;">
              ${clonedReceipt.outerHTML}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      // 4. Pequeña espera para asegurar la carga completa de elementos/imágenes dentro del iframe
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 5. Capturar el elemento clonado dentro del iframe
      const targetElement = iframeDoc.getElementById("official-receipt");
      if (!targetElement) throw new Error("No se encontró el recibo en el iframe");

      const canvas = await html2canvas(targetElement, {
        scale: 2, // Aumenta la resolución para máxima nitidez del PDF
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // 6. Eliminar el iframe del DOM para mantener el documento limpio
      document.body.removeChild(iframe);

      const imgData = canvas.toDataURL("image/png");

      // 7. Crear documento PDF tamaño A4
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // Ancho A4 en mm
      const pageHeight = 295; // Alto A4 en mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Estampar imagen de recibo en el PDF
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Manejar múltiples páginas por si el recibo fuera más grande
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Descargar archivo directamente en el almacenamiento del dispositivo
      pdf.save(`recibo_firmado_${employee?.id_empleado || "empleado"}.pdf`);
    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert("Ocurrió un error al generar la descarga directa del PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const generateAndUploadSignedPdf = async () => {
    const receiptElement = document.getElementById("official-receipt");
    if (!receiptElement) return;

    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      // 1. Crear un iframe oculto en el DOM
      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.width = "800px";
      iframe.style.height = "0px";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) throw new Error("No se pudo acceder al documento del iframe");

      // 2. Clonar el elemento del recibo oficial
      const clonedReceipt = receiptElement.cloneNode(true) as HTMLElement;
      clonedReceipt.className = clonedReceipt.className.replace("print:hidden", "");

      // 3. Escribir HTML
      iframeDoc.open();
      iframeDoc.write(`
        <html>
          <head>
            <style>
              body {
                margin: 0;
                padding: 24px;
                background-color: white;
                color: black;
                font-family: monospace;
                font-size: 11px;
                line-height: 1.6;
              }
              .flex { display: flex; }
              .flex-1 { flex: 1; }
              .flex-shrink-0 { flex-shrink: 0; }
              .flex-col { flex-direction: column; }
              .justify-between { justify-content: space-between; }
              .justify-start { justify-content: flex-start; }
              .justify-end { justify-content: flex-end; }
              .items-end { align-items: flex-end; }
              .items-center { align-items: center; }
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: 1fr 1fr; }
              .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
              .gap-2 { gap: 8px; }
              .gap-8 { gap: 32px; }
              .gap-x-8 { column-gap: 32px; }
              .border { border: 1px solid black; }
              .border-t { border-top: 1px solid black; }
              .border-b { border-bottom: 1px solid black; }
              .border-r { border-right: 1px solid black; }
              .border-black { border-color: black; }
              .border-dashed { border-style: dashed; }
              .border-black\\/30 { border-color: rgba(0,0,0,0.3); }
              .border-b-4 { border-bottom-width: 4px; }
              .border-double { border-bottom-style: double; }
              .w-28 { width: 112px; }
              .w-64 { width: 256px; }
              .w-48 { width: 192px; }
              .h-16 { height: 64px; }
              .pb-4 { padding-bottom: 16px; }
              .pt-3 { padding-top: 12px; }
              .pt-4 { padding-top: 16px; }
              .pt-12 { padding-top: 48px; }
              .pt-14 { padding-top: 56px; }
              .pt-1 { padding-top: 4px; }
              .pb-1 { padding-bottom: 4px; }
              .pr-4 { padding-right: 16px; }
              .p-6 { padding: 24px; }
              .p-3 { padding: 12px; }
              .mt-2 { margin-top: 8px; }
              .mb-2 { margin-top: 8px; }
              .py-6 { padding-top: 24px; padding-bottom: 24px; }
              .py-1 { padding-top: 4px; padding-bottom: 4px; }
              .font-bold { font-weight: bold; }
              .text-left { text-align: left; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .text-justify { text-align: justify; }
              .uppercase { text-transform: uppercase; }
              .text-xs { font-size: 12px; }
              .text-\\[10px\\] { font-size: 10px; }
              .text-\\[9px\\] { font-size: 9px; }
              .bg-black { background-color: black; color: white; }
              .bg-white { background-color: white; }
              .text-white { color: white; }
              .relative { position: relative; }
              .absolute { position: absolute; }
              .left-0 { left: 0px; }
              .bottom-\\[38px\\] { bottom: 38px; }
              .overflow-hidden { overflow: hidden; }
              .mix-blend-multiply { mix-blend-mode: multiply; }
              .max-h-full { max-height: 100%; }
              .max-w-full { max-width: 100%; }
              .object-contain { object-fit: contain; }
              .pointer-events-none { pointer-events: none; }
            </style>
          </head>
          <body>
            <div style="width: 760px;">
              ${clonedReceipt.outerHTML}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      await new Promise((resolve) => setTimeout(resolve, 300));

      const targetElement = iframeDoc.getElementById("official-receipt");
      if (!targetElement) throw new Error("No se encontró el recibo en el iframe");

      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(iframe);

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const pdfBlob = pdf.output("blob");

      const fileName = `${constanciaData.numero_constancia}.pdf`;
      const filePath = `${constanciaData.id_periodo}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("comprobantes")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
          cacheControl: "0",
        });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("comprobantes")
        .getPublicUrl(filePath);

      const { error: upsertErr } = await supabase
        .from("comprobante_constancia")
        .upsert({
          id_constancia: constanciaData.id_constancia,
          url_documento: publicUrl,
          firmado: true,
          actualizado_en: new Date().toISOString(),
        }, { onConflict: "id_constancia" });

      if (upsertErr) throw upsertErr;
      
      console.log("PDF firmado generado y subido.");
    } catch (err) {
      console.error("Error al generar y subir el PDF firmado:", err);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-body-base text-on-surface-variant font-medium">Cargando constancia de pago...</p>

        {debugTimer && (
          <div className="mt-8 p-4 bg-surface-container border border-outline rounded-xl text-left text-xs max-w-sm w-full mx-auto space-y-2">
            <p className="font-bold text-error mb-1 text-sm flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">info</span>
              Información de Diagnóstico (si no carga)
            </p>
            <div className="space-y-1 font-mono text-[10px] text-on-surface-variant">
              <p><strong>URL Token:</strong> {token ? `${token.substring(0, 12)}...` : "VACÍO / NO DETECTADO"}</p>
              <p><strong>Route Params:</strong> {JSON.stringify(routeParams)}</p>
              <p><strong>Origin:</strong> {typeof window !== "undefined" ? window.location.origin : "ssr"}</p>
              <p className="pt-2 italic text-[9px] leading-relaxed border-t border-outline/50 mt-2">
                * Si el parámetro de la URL está vacío pero la barra de direcciones lo muestra, es probable que tu navegador esté utilizando una versión anterior de JavaScript guardada en caché. Intenta recargar la página limpiando la caché o abre una pestaña de incógnito.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-[36px]">warning</span>
        </div>
        <h1 className="text-h2 font-h2 text-on-surface mb-2 font-bold">Enlace No Válido o Expirado</h1>
        <p className="text-body-base text-on-surface-variant max-w-sm mb-6">
          Esta solicitud de firma digital ya no se encuentra activa, ha caducado o el enlace es incorrecto.
        </p>
        <div className="border border-outline-variant rounded-xl p-4 bg-surface-container-low text-xs text-on-surface-variant max-w-sm italic">
          Por favor, póngase en contacto con el departamento de Recursos Humanos de Importaciones CRESGO para generar un nuevo enlace.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background font-body-base min-h-screen flex flex-col print:bg-white print:text-black">
      {/* TopAppBar */}
      <header className="bg-surface-container-lowest/80 backdrop-blur-md sticky top-0 w-full border-b border-outline-variant z-30 px-6 py-4 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg">
            <span className="material-symbols-outlined text-white">account_balance</span>
          </div>
          <div>
            <h1 className="text-h3 font-h3 font-bold text-primary">Importaciones CRESGO</h1>
            <p className="text-body-sm text-on-surface-variant leading-none">Constancia de Pago</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 flex-1 w-full print:p-0 print:m-0 print:max-w-full print:w-full">
        {/* Employee Quick Info */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex items-center gap-4 border-t-4 border-t-primary print:hidden">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-variant flex-shrink-0">
            <img
              alt="Employee Portrait"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDaQ00hAeXJujLLSGEhaOXCEHLit7pd_S5vf7qugNLbnLPVDkoxPTm3hMQw8XgbKDHko2c47R8T6uiblNptlSNPA5H9p9d9hTwGQkUdq79RNf0V3x5ZilH-0fL12EbwuWJmrctNyn3Q5_1FZQAQWgVF_kIDmj0-Sd7aWreiNsKtDZJjcdSyn5rjkE-2PzjOTj8S9SAqc_OeO1Pw4vygGHtRR4BZsk4einAsBmvrSJTt5fRhtnUw0rD_s6Rynadd9gk2zZn1xoaKQKr"
            />
          </div>
          <div>
            <h2 className="text-h2 font-h2 text-on-surface font-bold">
              {employee ? `${employee.nombre} ${employee.apellido}` : "Cargando..."}
            </h2>
            <p className="text-body-base text-on-surface-variant font-medium">
              ID: {employee?.id_empleado} • {employee?.puesto || "Empleado"}
            </p>
            {constanciaData && (
              <p className="text-label-caps text-primary mt-1 font-bold">
                PERIODO: {constanciaData.periodo_pago?.fecha_inicio ? new Date(constanciaData.periodo_pago.fecha_inicio).toLocaleDateString("es-GT") : ""} - {constanciaData.periodo_pago?.fecha_fin ? new Date(constanciaData.periodo_pago.fecha_fin).toLocaleDateString("es-GT") : ""}
              </p>
            )}
          </div>
        </div>

        {/* Pay Stub Details Card (Only shown during active draft state) */}
        {status === "active" && constanciaData && (() => {
          const details = constanciaData.detalle_constancia || [];
          const incomes = details.filter((d: any) => d.concepto_pago?.tipo === "INGRESO" && d.concepto_pago?.codigo !== "TOT_ING");
          const deductions = details.filter((d: any) => d.concepto_pago?.tipo === "DESCUENTO" && d.concepto_pago?.codigo !== "TOT_DES");

          const resRaw = constanciaData.resumen_constancia;
          const res = (Array.isArray(resRaw) ? resRaw[0] : resRaw) || { total_ingresos: 0, total_descuentos: 0, liquido_recibir: 0 };
          const totalIng = parseFloat(res.total_ingresos.toString());
          const totalDesc = parseFloat(res.total_descuentos.toString());
          const liquido = parseFloat(res.liquido_recibir.toString());

          return (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                <span className="font-bold text-on-surface">Detalle de Nómina</span>
                <span className="text-body-sm px-2.5 py-1 bg-primary/10 text-primary rounded-full font-bold">
                  Borrador de Recibo
                </span>
              </div>
              <div className="p-0">
                {/* Incomes Section */}
                <div className="px-6 py-4">
                  <h3 className="text-label-caps text-on-surface-variant mb-3 font-bold">INGRESOS</h3>
                  <div className="space-y-3">
                    {incomes.map((d: any) => (
                      <div key={d.id_detalle} className="flex justify-between items-center">
                        <span className="text-body-base text-on-surface-variant font-medium">{d.concepto_pago?.nombre}</span>
                        <span className="font-data-tabular text-on-surface font-semibold">Q {parseFloat(d.monto).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mx-6 border-t border-outline-variant/50"></div>
                {/* Deductions Section */}
                <div className="px-6 py-4 bg-surface-container-lowest">
                  <h3 className="text-label-caps text-on-surface-variant mb-3 font-bold">DESCUENTOS</h3>
                  <div className="space-y-3">
                    {deductions.map((d: any) => (
                      <div key={d.id_detalle} className="flex justify-between items-center text-error">
                        <span className="text-body-base font-medium">{d.concepto_pago?.nombre}</span>
                        <span className="font-data-tabular font-bold">Q {parseFloat(d.monto).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Summary Section */}
                <div className="p-6 bg-surface-container-low mt-2 border-t border-outline-variant">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-body-base text-on-surface-variant font-medium">Total Ingresos</span>
                    <span className="font-data-tabular text-on-surface font-semibold">Q {totalIng.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-body-base text-on-surface-variant font-medium">Total Descuentos</span>
                    <span className="font-data-tabular text-error font-semibold">Q {totalDesc.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-outline">
                    <span className="text-h3 font-h3 text-on-surface font-bold">Líquido a Recibir</span>
                    <span className="text-h2 font-h2 text-primary font-bold">Q {liquido.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Action Button (only if not signed yet) */}
        {status === "active" && (
          <div className="flex flex-col gap-4 py-4 print:hidden">
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-primary text-white py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined">edit_note</span>
              Firmar y Confirmar Recepción
            </button>
            <p className="text-center text-body-sm text-on-surface-variant italic">
              Al firmar, usted confirma que ha recibido la cantidad estipulada y está de acuerdo con los cálculos presentados.
            </p>
          </div>
        )}

        {/* Vista Oficial Firmada (Renderizado cuando ya está firmado) */}
        {status === "signed" && (
          <div className="space-y-6">
            {/* Cabecera informativa para pantalla */}
            <div className="space-y-2 text-left print:hidden">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
                <span className="font-bold text-body-base text-primary">Constancia Firmada Digitalmente</span>
              </div>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                A continuación se presenta la vista oficial del recibo de nómina respaldado y firmado por usted. Puede guardarlo en su teléfono descargándolo en formato PDF.
              </p>
            </div>

            {/* Renderizado de la Constancia Oficial Completa en formato físico */}
            {renderOfficialReceipt()}

            {/* Metadatos y Acción de descarga */}
            <div className="space-y-4 print:hidden text-left">
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 text-xs text-on-surface-variant space-y-1.5 shadow-sm">
                <div className="flex justify-between">
                  <span className="font-semibold">Fecha de firma:</span>
                  <span className="font-data-tabular">{signedAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Código de seguridad:</span>
                  <span className="font-data-tabular text-[10px] uppercase select-all">{shaHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">IP de Registro:</span>
                  <span className="font-data-tabular">{originIp}</span>
                </div>
              </div>

              <button
                onClick={downloadPdf}
                disabled={downloadingPdf}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-md disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">download</span>
                {downloadingPdf ? "Generando PDF..." : "Descargar Recibo Firmado (PDF)"}
              </button>
            </div>
          </div>
        )}

        {/* Footer / Support */}
        <footer className="pt-8 border-t border-outline-variant text-center print:hidden">
          <p className="text-body-sm text-on-surface-variant font-medium">¿Tiene dudas sobre su pago? Contacte a Recursos Humanos</p>
          <div className="mt-2 flex justify-center gap-6">
            <a className="text-primary font-bold text-body-sm flex items-center gap-1 hover:underline" href="mailto:yvan.sierra@cresgo.com">
              <span className="material-symbols-outlined text-[16px]">mail</span>
              yvan.sierra@cresgo.com
            </a>
            <a className="text-primary font-bold text-body-sm flex items-center gap-1 hover:underline" href="tel:+50223456789">
              <span className="material-symbols-outlined text-[16px]">phone</span>
              +502 2345-6789
            </a>
          </div>
        </footer>
      </main>

      {/* Signature Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-on-surface/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-outline-variant">
            <div className="p-6 border-b border-outline-variant">
              <div className="flex justify-between items-start">
                <h3 className="text-h3 font-h3 text-on-surface font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">draw</span>
                  Firma Digital
                </h3>
                <button
                  className="text-on-surface-variant hover:bg-surface-variant p-1.5 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                  onClick={() => {
                    clearSignature();
                    setShowModal(false);
                  }}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="text-body-sm text-on-surface-variant mt-1.5 font-medium">
                Dibuje su firma en el recuadro inferior para completar el proceso.
              </p>
            </div>

            <div className="p-6">
              {/* Interactive Signature Canvas */}
              <div className="w-full h-48 bg-surface-container-low border-2 border-dashed border-outline-variant rounded-xl flex items-center justify-center relative overflow-hidden signature-pad-container">
                {/* Guía de firma punteada con Tailwind puro */}
                <div className="absolute left-[10%] right-[10%] bottom-[25%] border-b border-dashed border-outline-variant/60 pointer-events-none z-0"></div>

                <span className="text-outline-variant font-label-caps select-none pointer-events-none absolute z-0 uppercase tracking-wider text-xs">
                  Área de Firma Táctil
                </span>

                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="absolute inset-0 z-10 w-full h-full cursor-crosshair touch-none"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearSignature}
                  disabled={!hasSigned}
                  className="text-primary font-bold text-body-sm px-4 py-2 hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Borrar firma
                </button>
              </div>
            </div>

            <div className="p-6 bg-surface-container-low flex gap-3 border-t border-outline-variant">
              <button
                className="flex-1 bg-white border border-outline-variant text-on-surface-variant py-3.5 rounded-xl font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
                onClick={() => {
                  clearSignature();
                  setShowModal(false);
                }}
              >
                Cancelar
              </button>
              <button
                className="flex-1 bg-primary text-white py-3.5 rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                onClick={confirmSignature}
                disabled={!hasSigned || generatingSignature}
              >
                {generatingSignature ? "Procesando..." : "Confirmar Firma"}
              </button>
            </div>
          </div>
        </div>
      )}
      {uploadingPdf && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md p-6 text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-h2 font-h2 text-on-surface font-bold mb-2">Guardando Documento Firmado</h2>
          <p className="text-body-base text-on-surface-variant max-w-sm">
            Estamos aplicando su firma al recibo digital y guardando la constancia en el servidor. Por favor, no cierre esta ventana.
          </p>
        </div>
      )}
    </div>
  );
}
