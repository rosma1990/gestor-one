import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import os from "os";
import { supabase } from "@/lib/supabase/client";
import { encryptToken, decryptToken } from "@/lib/crypto";

// Función utilitaria para obtener la IP de la red local (Wi-Fi / Ethernet)
function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  const keys = Object.keys(interfaces);
  
  // 1. Intentar buscar en interfaces inalámbricas (Wi-Fi / Wireless)
  const wifiKeys = keys.filter(name => 
    name.toLowerCase().includes("wi-fi") || 
    name.toLowerCase().includes("wifi") || 
    name.toLowerCase().includes("wireless") ||
    name.toLowerCase().includes("inalámbrica")
  );
  
  for (const name of wifiKeys) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }

  // 2. Intentar buscar en otras interfaces físicas, excluyendo las virtuales de VirtualBox, VMware o WSL
  const otherKeys = keys.filter(name => {
    const lname = name.toLowerCase();
    return !lname.includes("virtualbox") && 
           !lname.includes("vmware") && 
           !lname.includes("wsl") && 
           !lname.includes("loopback") &&
           !wifiKeys.includes(name);
  });
  
  for (const name of otherKeys) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        // Ignorar el rango típico de VirtualBox Host-Only (192.168.56.x) si es posible
        if (iface.address.startsWith("192.168.56.")) {
          continue;
        }
        return iface.address;
      }
    }
  }

  // 3. Fallback a cualquier IPv4 no interna que encontremos
  for (const name of keys) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

// GET /api/signature-token?token=CIFRADO_HEX - Validar un token o GET /api/signature-token?id_constancia=ID - Obtener/generar la URL de firma para una constancia
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cipherToken = searchParams.get("token");
  const idConstancia = searchParams.get("id_constancia");

  if (!cipherToken && !idConstancia) {
    return NextResponse.json({ error: "Token o id_constancia es requerido" }, { status: 400 });
  }

  // Si se proporciona id_constancia, buscar el token existente o crear uno nuevo
  if (idConstancia) {
    try {
      const { data: tokenData, error: tokenError } = await supabase
        .from("token_firma")
        .select("*")
        .eq("id_constancia", Number(idConstancia))
        .order("id_token", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tokenError) {
        throw tokenError;
      }

      let rawToken: string;
      let idEmpleado: number;

      if (tokenData) {
        rawToken = tokenData.token;
        idEmpleado = tokenData.id_empleado;
      } else {
        const { data: constancia, error: constError } = await supabase
          .from("constancia_pago")
          .select("id_empleado")
          .eq("id_constancia", Number(idConstancia))
          .single();

        if (constError || !constancia) {
          return NextResponse.json({ error: "Constancia no encontrada" }, { status: 404 });
        }

        rawToken = crypto.randomUUID();
        idEmpleado = constancia.id_empleado;

        const { error: dbError } = await supabase
          .from("token_firma")
          .insert({
            id_constancia: Number(idConstancia),
            id_empleado: Number(idEmpleado),
            token: rawToken,
            usado: false,
          });

        if (dbError) throw dbError;
      }

      const encryptedToken = encryptToken(rawToken);

      const host = request.headers.get("host") || "localhost:3000";
      const port = host.split(":")[1] || "3000";
      const localIp = getLocalIp();

      const localhostUrl = `http://localhost:${port}/firma/${encryptedToken}`;
      const localUrl = `http://${localIp}:${port}/firma/${encryptedToken}`;

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
      const formattedSiteUrl = siteUrl 
        ? (siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`)
        : `http://localhost:${port}`;
      const productionUrl = `${formattedSiteUrl}/firma/${encryptedToken}`;

      return NextResponse.json({
        token: encryptedToken,
        localhostUrl,
        localUrl,
        productionUrl,
        id_empleado: idEmpleado,
        id_constancia: Number(idConstancia)
      });
    } catch (err: any) {
      console.error("Error al obtener/generar token por id_constancia:", err);
      return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 500 });
    }
  }

  // De lo contrario, proceder con la lógica existente para validar el token
  try {
    // 1. Descifrar el token para obtener el UUID original
    const rawToken = decryptToken(cipherToken!);

    // 2. Consultar en la base de datos (Supabase) con todos sus desgloses reales
    const { data: tokenData, error: tokenError } = await supabase
      .from("token_firma")
      .select(`
        *,
        constancia: constancia_pago (
          *,
          periodo_pago (
            *
          ),
          empleado (
            id_empleado,
            nombre,
            apellido,
            cui,
            nit,
            puesto,
            telefono,
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
        )
      `)
      .eq("token", rawToken)
      .single();

    if (tokenError || !tokenData) {
      console.warn("Token no encontrado o error:", tokenError);
      return NextResponse.json({ error: "Token no válido o expirado" }, { status: 404 });
    }

    return NextResponse.json({
      id_empleado: tokenData.id_empleado,
      id_constancia: tokenData.id_constancia,
      usado: tokenData.usado,
      signedAt: tokenData.firmado_en,
      signatureData: tokenData.signature_data,
      ip: tokenData.ip_registro,
      constancia: tokenData.constancia,
    });
  } catch (error: any) {
    console.error("Error al validar el token de firma:", error);
    return NextResponse.json({ error: error.message || "Enlace de firma no válido o expirado" }, { status: 400 });
  }
}

// POST /api/signature-token - Generar y persistir un nuevo token cifrado
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_empleado, id_constancia } = body;

    if (!id_empleado) {
      return NextResponse.json({ error: "id_empleado es requerido" }, { status: 400 });
    }

    let resolvedConstanciaId = id_constancia;

    if (!resolvedConstanciaId) {
      // Buscar la constancia de pago más reciente no anulada para este empleado
      const { data: latestConstancia, error: constanciaError } = await supabase
        .from("constancia_pago")
        .select("id_constancia")
        .eq("id_empleado", Number(id_empleado))
        .eq("anulada", false)
        .order("id_constancia", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (constanciaError) {
        console.error("Error al buscar la constancia de pago más reciente:", constanciaError);
        return NextResponse.json({ error: "Error al buscar la constancia de pago del colaborador" }, { status: 500 });
      }

      if (!latestConstancia) {
        return NextResponse.json({ 
          error: "El colaborador no tiene constancias de pago activas en el sistema para poder firmar." 
        }, { status: 400 });
      }

      resolvedConstanciaId = latestConstancia.id_constancia;
    }

    // 1. Generar token UUID seguro
    const rawToken = crypto.randomUUID();

    // 2. Guardar token persistente en Supabase
    const { error: dbError } = await supabase
      .from("token_firma")
      .insert({
        id_constancia: Number(resolvedConstanciaId),
        id_empleado: Number(id_empleado),
        token: rawToken,
        usado: false,
      });

    if (dbError) {
      console.error("Error al persistir token en base de datos:", dbError);
      return NextResponse.json({ error: "Error al guardar el token en la base de datos" }, { status: 500 });
    }

    // 3. Cifrar el token UUID de forma simétrica para la URL
    const encryptedToken = encryptToken(rawToken);

    // Detectar puerto del host actual para construir las URLs
    const host = request.headers.get("host") || "localhost:3000";
    const port = host.split(":")[1] || "3000";
    const localIp = getLocalIp();

    const localhostUrl = `http://localhost:${port}/firma/${encryptedToken}`;
    const localUrl = `http://${localIp}:${port}/firma/${encryptedToken}`;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    const formattedSiteUrl = siteUrl 
      ? (siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`)
      : `http://localhost:${port}`;
    const productionUrl = `${formattedSiteUrl}/firma/${encryptedToken}`;

    // Mostrar de forma temporal la URL en consola
    console.log("\n=======================================================");
    console.log(`🔑 NUEVA CONSTANCIA DE FIRMA GENERADA (PERSISTIDA Y CIFRADA)`);
    console.log(`Empleado ID: ${id_empleado}`);
    console.log(`Constancia ID (Resuelto): ${resolvedConstanciaId}`);
    console.log(`Token UUID: ${rawToken}`);
    console.log(`Localhost URL: ${localhostUrl}`);
    console.log(`Celular (Misma Wi-Fi): ${localUrl}`);
    console.log(`Producción (Vercel): ${productionUrl}`);
    console.log("=======================================================\n");

    return NextResponse.json({
      token: encryptedToken,
      localhostUrl,
      localUrl,
      productionUrl,
      id_empleado,
      id_constancia: resolvedConstanciaId
    });
  } catch (error) {
    console.error("Error al generar token de firma:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
