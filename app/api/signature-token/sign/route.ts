import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { decryptToken } from "@/lib/crypto";

// POST /api/signature-token/sign - Confirmar firma digital y guardar el estado en base de datos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, signatureData } = body;

    if (!token || !signatureData) {
      return NextResponse.json(
        { error: "Token y firma (signatureData) son requeridos" },
        { status: 400 }
      );
    }

    // 1. Descifrar el token de la URL
    let rawToken: string;
    try {
      rawToken = decryptToken(token);
    } catch (err) {
      return NextResponse.json({ error: "Enlace de firma no válido" }, { status: 400 });
    }

    // 2. Buscar el token en base de datos
    const { data: tokenData, error: fetchError } = await supabase
      .from("token_firma")
      .select("*")
      .eq("token", rawToken)
      .single();

    if (fetchError || !tokenData) {
      return NextResponse.json(
        { error: "Enlace de firma no válido o expirado" },
        { status: 404 }
      );
    }

    if (tokenData.usado) {
      return NextResponse.json(
        { error: "Esta constancia ya ha sido firmada" },
        { status: 400 }
      );
    }

    // Obtener IP del cliente
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
    
    // Obtener la fecha formateada
    const signedAtISO = new Date().toISOString();
    const signedAtDisplay = new Date().toLocaleString("es-GT", {
      timeZone: "America/Guatemala",
      dateStyle: "long",
      timeStyle: "short",
    });

    // 3. Actualizar la base de datos
    const { error: updateError } = await supabase
      .from("token_firma")
      .update({
        usado: true,
        signature_data: signatureData,
        firmado_en: signedAtISO,
        ip_registro: clientIp,
      })
      .eq("token", rawToken);

    if (updateError) {
      console.error("Error al actualizar estado de firma en BD:", updateError);
      return NextResponse.json({ error: "Error al guardar la firma en la base de datos" }, { status: 500 });
    }

    // 4. Actualizar el estado de firmado en comprobante_constancia
    const { error: compError } = await supabase
      .from("comprobante_constancia")
      .update({
        firmado: true,
        actualizado_en: signedAtISO,
      })
      .eq("id_constancia", tokenData.id_constancia);

    if (compError) {
      console.warn("Advertencia: No se pudo actualizar el estado de firmado en comprobante_constancia:", compError);
    }

    console.log(`\n=======================================================`);
    console.log(`✍️ CONSTANCIA FIRMADA CON ÉXITO EN BASE DE DATOS`);
    console.log(`Empleado ID: ${tokenData.id_empleado}`);
    console.log(`Constancia ID: ${tokenData.id_constancia}`);
    console.log(`Token UUID: ${rawToken}`);
    console.log(`Fecha de firma: ${signedAtDisplay}`);
    console.log(`IP: ${clientIp}`);
    console.log(`=======================================================\n`);

    return NextResponse.json({
      success: true,
      signedAt: signedAtDisplay,
      ip: clientIp,
    });
  } catch (error) {
    console.error("Error al procesar la firma:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
