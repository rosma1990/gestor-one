import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import os from "os";
import { tokenMap } from "./store";

// Función utilitaria para obtener la IP de la red local (Wi-Fi / Ethernet)
function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

// GET /api/signature-token?token=XYZ - Validar un token
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token es requerido" }, { status: 400 });
  }

  const tokenData = tokenMap.get(token);

  if (!tokenData) {
    return NextResponse.json({ error: "Token no válido o expirado" }, { status: 404 });
  }

  return NextResponse.json(tokenData);
}

// POST /api/signature-token - Generar un nuevo token de un único uso
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_empleado } = body;

    if (!id_empleado) {
      return NextResponse.json({ error: "id_empleado es requerido" }, { status: 400 });
    }

    // Generar token UUID seguro
    const token = crypto.randomUUID();

    // Guardar token en el almacén global
    tokenMap.set(token, {
      id_empleado: Number(id_empleado),
      token,
      used: false,
      createdAt: Date.now(),
    });

    // Detectar puerto del host actual para construir las URLs
    const host = request.headers.get("host") || "localhost:3000";
    const port = host.split(":")[1] || "3000";
    const localIp = getLocalIp();

    const localhostUrl = `http://localhost:${port}/firma/${token}`;
    const localUrl = `http://${localIp}:${port}/firma/${token}`;

    // Mostrar de forma temporal la URL en consola (requisito del usuario)
    console.log("\n=======================================================");
    console.log(`🔑 NUEVA CONSTANCIA DE FIRMA GENERADA`);
    console.log(`Empleado ID: ${id_empleado}`);
    console.log(`Token: ${token}`);
    console.log(`Localhost URL: ${localhostUrl}`);
    console.log(`Celular (Misma Wi-Fi): ${localUrl}`);
    console.log("=======================================================\n");

    return NextResponse.json({
      token,
      localhostUrl,
      localUrl,
      id_empleado
    });
  } catch (error) {
    console.error("Error al generar token de firma:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
