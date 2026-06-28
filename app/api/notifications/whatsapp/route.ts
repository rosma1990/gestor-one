import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notifications } = body;

    if (!notifications || !Array.isArray(notifications)) {
      return NextResponse.json({ error: "Arreglo 'notifications' es requerido" }, { status: 400 });
    }

    // 1. Obtener los IDs de empresa únicos presentes en el lote
    const uniqueEmpresaIds = Array.from(
      new Set(
        notifications
          .map((n: any) => n.id_empresa)
          .filter((id) => id !== undefined && id !== null)
      )
    );

    // 2. Consultar base de datos para obtener las configuraciones dinámicas por empresa
    const dbConfigsMap = new Map<number, any>();
    if (uniqueEmpresaIds.length > 0) {
      try {
        const { data: configsData, error: configsError } = await supabase
          .from("configuracion_whatsapp")
          .select("*")
          .in("id_empresa", uniqueEmpresaIds);

        if (!configsError && configsData) {
          configsData.forEach((c) => {
            dbConfigsMap.set(c.id_empresa, c);
          });
        } else if (configsError) {
          console.warn("Advertencia al consultar configuraciones de WhatsApp:", configsError);
        }
      } catch (err) {
        console.warn("Fallo de conexión al consultar configuraciones de WhatsApp:", err);
      }
    }

    // Parámetros globales por defecto (fallback .env.local)
    const envToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
    const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    const envTemplateName = process.env.WHATSAPP_TEMPLATE_NAME || "";
    const envTemplateLang = process.env.WHATSAPP_TEMPLATE_LANG || "es";
    const defaultTextTemplate = "Hola {{nombre}}, le compartimos su enlace único para firmar digitalmente su constancia de pago para el período {{periodo}}: {{url}}";

    const results = {
      enviados: 0,
      fallidos: 0,
      simulados: 0,
      detalles: [] as any[],
    };

    for (const notif of notifications) {
      const { telefono, nombre, periodo, url, id_empresa, liquido, concepto, token } = notif;
      
      if (!telefono) {
        results.fallidos++;
        results.detalles.push({ nombre, error: "Teléfono no proveído" });
        continue;
      }

      // Limpiar y formatear número de teléfono (Guatemala predeterminado a +502)
      const cleanPhone = telefono.replace(/\D/g, "");
      const formattedPhone = cleanPhone.length === 8 ? `502${cleanPhone}` : cleanPhone;

      // 3. Resolver configuración (Base de datos o variables de entorno)
      const dbConfig = id_empresa ? dbConfigsMap.get(id_empresa) : null;

      const whatsappToken = dbConfig?.whatsapp_token || envToken;
      const whatsappPhoneId = dbConfig?.phone_number_id || envPhoneId;
      const templateName = dbConfig?.template_name || envTemplateName;
      const templateLang = dbConfig?.template_lang || envTemplateLang;
      const textTemplate = dbConfig?.mensaje_texto_fallback || defaultTextTemplate;

      const isConfigured = 
        whatsappToken && 
        whatsappPhoneId && 
        !whatsappToken.includes("tu_token") && 
        !whatsappPhoneId.includes("tu_phone_number_id");

      // Construir el mensaje de texto libre reemplazando comodines
      const customMessage = textTemplate
        .replace(/\{\{nombre\}\}/g, nombre)
        .replace(/\{\{periodo\}\}/g, periodo)
        .replace(/\{\{url\}\}/g, url);

      if (!isConfigured) {
        // Modo Simulación: Mostrar en consola
        console.log(`\n📱 [SIMULADOR WHATSAPP - NOTIFICACIÓN ENVIADA]`);
        console.log(`Empresa ID: ${id_empresa || "Por defecto (.env)"}`);
        console.log(`Destinatario: ${nombre} (${formattedPhone})`);
        console.log(`Enlace de Firma: ${url}`);
        if (templateName) {
          console.log(`Modo: Plantilla Oficial [${templateName}] (${templateLang})`);
          if (templateName === "payment_confirmation_3") {
            console.log(`Variables Body: [1 (Nombre): "${nombre}", 2 (Líquido): "${liquido}", 3 (Concepto): "${concepto}"]`);
            console.log(`Variable Botón (Token): "${token}"`);
          } else {
            console.log(`Variables: [1: "${nombre}", 2: "${periodo}", 3: "${url}"]`);
          }
        } else {
          console.log(`Modo: Texto Libre`);
          console.log(`Mensaje: ${customMessage}`);
        }
        console.log(`=================================================\n`);

        results.simulados++;
        results.detalles.push({ nombre, status: "simulated", telefono: formattedPhone, id_empresa });
        continue;
      }

      // Modo Real: Meta Cloud API
      try {
        let payload: any;
        if (templateName === "payment_confirmation_3") {
          payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "template",
            template: {
              name: templateName,
              language: {
                code: templateLang,
              },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: nombre },
                    { type: "text", text: liquido || "" },
                    { type: "text", text: concepto || "" },
                  ],
                },
                {
                  type: "button",
                  sub_type: "url",
                  index: "0",
                  parameters: [
                    { type: "text", text: token || "" },
                  ],
                },
              ],
            },
          };
        } else if (templateName) {
          payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "template",
            template: {
              name: templateName,
              language: {
                code: templateLang,
              },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: nombre },
                    { type: "text", text: periodo },
                    { type: "text", text: url },
                  ],
                },
              ],
            },
          };
        } else {
          payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "text",
            text: {
              preview_url: true,
              body: customMessage,
            },
          };
        }

        const res = await fetch(`https://graph.facebook.com/v19.0/${whatsappPhoneId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${whatsappToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const resData = await res.json();

        if (res.ok) {
          results.enviados++;
          results.detalles.push({ nombre, status: "sent", message_id: resData.messages?.[0]?.id, id_empresa });
        } else {
          console.error(`Error en API de Meta para ${nombre} (Empresa: ${id_empresa}):`, resData);
          results.fallidos++;
          results.detalles.push({ nombre, error: resData.error?.message || "Error al enviar mensaje", id_empresa });
        }
      } catch (err: any) {
        console.error(`Error de conexión al enviar WhatsApp a ${nombre} (Empresa: ${id_empresa}):`, err);
        results.fallidos++;
        results.detalles.push({ nombre, error: err.message || "Error de red", id_empresa });
      }
    }

    return NextResponse.json({
      success: true,
      simulated: results.simulados > 0,
      summary: results,
    });
  } catch (error: any) {
    console.error("Error al procesar lote de notificaciones dinámicas:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
