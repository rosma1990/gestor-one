import { NextRequest, NextResponse } from "next/server";
import { tokenMap } from "../store";

// POST /api/signature-token/sign - Confirmar firma digital y guardar el estado
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

    const tokenData = tokenMap.get(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Token no válido o expirado" },
        { status: 404 }
      );
    }

    if (tokenData.used) {
      return NextResponse.json(
        { error: "Esta constancia ya ha sido firmada" },
        { status: 400 }
      );
    }

    // Obtener IP del cliente
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
    
    // Obtener la fecha formateada en horario local de Guatemala
    const signedAt = new Date().toLocaleString("es-GT", {
      timeZone: "America/Guatemala",
      dateStyle: "long",
      timeStyle: "short",
    });

    // Actualizar el token en el mapa
    tokenData.used = true;
    tokenData.signatureData = signatureData;
    tokenData.signedAt = signedAt;
    tokenData.ip = clientIp;

    tokenMap.set(token, tokenData);

    console.log(`\n=======================================================`);
    console.log(`✍️ CONSTANCIA FIRMADA CON ÉXITO`);
    console.log(`Empleado ID: ${tokenData.id_empleado}`);
    console.log(`Token: ${token}`);
    console.log(`Fecha de firma: ${signedAt}`);
    console.log(`IP: ${clientIp}`);
    console.log(`=======================================================\n`);

    return NextResponse.json({
      success: true,
      signedAt,
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
