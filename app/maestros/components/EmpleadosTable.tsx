"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

interface Empleado {
  id_empleado: number;
  nombre: string;
  apellido: string;
  cui: string | null;
  nit: string | null;
  puesto: string | null;
  fecha_ingreso: string | null;
  telefono: string | null;
  activo: boolean;
  departamento: {
    nombre: string;
    empresa: {
      nombre: string;
    } | null;
  } | null;
}

export default function EmpleadosTable() {
  const [data, setData] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para Firma Digital
  const [activeSignatureModal, setActiveSignatureModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(null);
  const [generatedLinkData, setGeneratedLinkData] = useState<{ localUrl: string; localhostUrl: string } | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const [departamentoFilter, setDepartamentoFilter] = useState("TODOS");
  const [departamentos, setDepartamentos] = useState<{id_departamento: number, nombre: string}[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Fetch departments for the select
  useEffect(() => {
    supabase.from("departamento").select("id_departamento, nombre").then(({ data }) => {
      if (data) setDepartamentos(data);
    });
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase
      .from("empleado")
      .select("*, departamento(nombre, empresa(nombre))", { count: "exact" });

    if (debouncedSearch) {
      query = query.or(`nombre.ilike.%${debouncedSearch}%,apellido.ilike.%${debouncedSearch}%,puesto.ilike.%${debouncedSearch}%`);
    }

    if (estadoFilter !== "TODOS") {
      query = query.eq("activo", estadoFilter === "ACTIVO");
    }

    if (departamentoFilter !== "TODOS") {
      query = query.eq("id_departamento", parseInt(departamentoFilter));
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: result, error, count } = await query.range(from, to).order("id_empleado", { ascending: true });

    if (error) {
      console.error("Error fetching empleados:", error);
    } else {
      setData((result as unknown as Empleado[]) || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [page, debouncedSearch, estadoFilter, departamentoFilter]);

  // Función para solicitar enlace de firma de un único uso
  const requestSignature = async (empleado: Empleado) => {
    setGeneratingToken(true);
    try {
      const response = await fetch("/api/signature-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id_empleado: empleado.id_empleado }),
      });
      const data = await response.json();
      if (response.ok && data.localUrl) {
        setGeneratedLinkData({
          localUrl: data.localUrl,
          localhostUrl: data.localhostUrl,
        });
        setSelectedEmployee(empleado);
        setActiveSignatureModal(true);
      } else {
        alert("Error al generar el token de firma: " + (data.error || "Respuesta inválida"));
      }
    } catch (err) {
      console.error(err);
      alert("Error de red al intentar generar el token.");
    } finally {
      setGeneratingToken(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  // Helper function to get initials
  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]" data-icon="search">search</span>
            </span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-background border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-body-sm"
              placeholder="Filtrar por nombre, apellido o puesto..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <select 
          className="bg-background border border-outline-variant rounded-lg px-4 py-2 text-body-sm focus:ring-primary focus:border-primary"
          value={departamentoFilter}
          onChange={(e) => { setDepartamentoFilter(e.target.value); setPage(1); }}
        >
          <option value="TODOS">Todos los Departamentos</option>
          {departamentos.map(dep => (
            <option key={dep.id_departamento} value={dep.id_departamento}>{dep.nombre}</option>
          ))}
        </select>
        <select 
          className="bg-background border border-outline-variant rounded-lg px-4 py-2 text-body-sm focus:ring-primary focus:border-primary"
          value={estadoFilter}
          onChange={(e) => { setEstadoFilter(e.target.value); setPage(1); }}
        >
          <option value="TODOS">Todos los Estados</option>
          <option value="ACTIVO">Estado: Activo</option>
          <option value="INACTIVO">Estado: Inactivo</option>
        </select>
        <button className="bg-surface-container border border-outline-variant text-on-surface px-4 py-2 rounded-lg text-body-sm font-medium hover:bg-surface-container-high transition-colors">
          Exportar Excel
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 text-on-surface-variant border-b border-outline-variant">
                <th className="px-6 py-4 font-label-caps text-label-caps uppercase tracking-wider">Empleado</th>
                <th className="px-6 py-4 font-label-caps text-label-caps uppercase tracking-wider">CUI / NIT</th>
                <th className="px-6 py-4 font-label-caps text-label-caps uppercase tracking-wider">Puesto</th>
                <th className="px-6 py-4 font-label-caps text-label-caps uppercase tracking-wider">Teléfono</th>
                <th className="px-6 py-4 font-label-caps text-label-caps uppercase tracking-wider">Departamento / Empresa</th>
                <th className="px-6 py-4 font-label-caps text-label-caps uppercase tracking-wider text-center">Estado</th>
                <th className="px-6 py-4 font-label-caps text-label-caps uppercase tracking-wider text-center">Constancia Firma</th>
                <th className="px-6 py-4 font-label-caps text-label-caps uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">Cargando...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">No se encontraron registros.</td>
                </tr>
              ) : (
                data.map((item, index) => {
                  const initials = getInitials(item.nombre, item.apellido);
                  // Alternating avatar colors based on index for variety
                  const avatarColors = [
                    "bg-primary-fixed text-on-primary-fixed",
                    "bg-secondary-fixed text-on-secondary-fixed",
                    "bg-tertiary-fixed text-on-tertiary-fixed",
                  ];
                  const avatarClass = avatarColors[index % 3];

                  return (
                    <tr key={item.id_empleado} className="hover:bg-surface-container/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${avatarClass} flex items-center justify-center font-bold text-[12px]`}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-data-tabular text-data-tabular text-on-surface">{item.nombre} {item.apellido}</p>
                            <p className="text-body-sm text-on-surface-variant">EMP-{item.id_empleado.toString().padStart(4, '0')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-data-tabular text-data-tabular">{item.cui || "-"}</p>
                        <p className="text-body-sm text-on-surface-variant">NIT: {item.nit || "-"}</p>
                      </td>
                      <td className="px-6 py-4 text-body-base">{item.puesto || "-"}</td>
                      <td className="px-6 py-4 text-body-base font-data-tabular">{item.telefono || "-"}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[12px] font-bold text-on-surface-variant">
                            {item.departamento?.empresa?.nombre || "-"}
                          </span>
                          <span className="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded text-[12px] font-medium">
                            {item.departamento?.nombre || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.activo ? (
                          <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[12px] font-bold ring-1 ring-primary/20">Activo</span>
                        ) : (
                          <span className="bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-[12px] font-bold ring-1 ring-slate-300">Inactivo</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => requestSignature(item)}
                          disabled={generatingToken}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-[12px] font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Generar enlace de firma digital"
                        >
                          <span className="material-symbols-outlined text-[16px]">draw</span>
                          <span>Enviar Firma</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button className="p-2 hover:bg-surface-variant/50 rounded-lg text-secondary transition-colors">
                            <span className="material-symbols-outlined text-[20px]" data-icon="edit">edit</span>
                          </button>
                          <button
                            onClick={() => {
                              const phone = item.telefono?.replace(/\D/g, '');
                              if (!phone) {
                                alert('Este empleado no tiene número de teléfono registrado.');
                                return;
                              }
                              const mensaje = encodeURIComponent(
                                `Hola ${item.nombre}, le escribimos de Importaciones CRESGO. le compartimos su comprobante de pago`
                              );
                              window.open(`https://wa.me/502${phone}?text=${mensaje}`, '_blank');
                            }}
                            className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                            title="Enviar WhatsApp"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-surface-container-low px-6 py-4 flex justify-between items-center border-t border-outline-variant">
          <p className="text-body-sm text-on-surface-variant">
            Mostrando {data.length} de {totalCount} empleados
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-outline-variant rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-3 py-1 text-on-surface font-medium">Página {page} de {totalPages || 1}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border border-outline-variant rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Administrador - Compartir Firma Digital */}
      {activeSignatureModal && selectedEmployee && generatedLinkData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm px-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-outline-variant">
            <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="font-h2 text-h2 text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">draw</span>
                Solicitud de Firma
              </h3>
              <button
                onClick={() => setActiveSignatureModal(false)}
                className="p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="p-6 space-y-6 text-center">
              <div className="space-y-1">
                <p className="text-body-base font-bold text-on-surface text-lg">
                  {selectedEmployee.nombre} {selectedEmployee.apellido}
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  Puesto: {selectedEmployee.puesto || "No especificado"} • ID: {selectedEmployee.id_empleado}
                </p>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center space-y-3 bg-surface-container-low p-5 rounded-xl border border-outline-variant">
                <span className="text-label-caps text-on-surface-variant uppercase tracking-wider font-bold">Escanee con el Celular</span>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-outline-variant">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(generatedLinkData.localUrl)}`}
                    alt="Código QR de Firma"
                    className="w-[180px] h-[180px] block"
                  />
                </div>
                <p className="text-[12px] text-on-surface-variant max-w-[260px] italic">
                  El teléfono debe estar en la misma red Wi-Fi para acceder al servidor local.
                </p>
              </div>

              {/* Links and Actions */}
              <div className="space-y-3 text-left">
                <div className="space-y-1">
                  <span className="text-label-caps text-on-surface-variant uppercase tracking-wider font-bold text-[11px]">Enlace de Red Local</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLinkData.localUrl}
                      className="flex-1 bg-surface-container-low text-body-sm px-3 py-2 rounded-lg border border-outline-variant font-data-tabular focus:ring-0 focus:outline-none select-all text-xs"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLinkData.localUrl);
                        alert("¡Enlace de red local copiado al portapapeles!");
                      }}
                      className="bg-primary text-white p-2 rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                      title="Copiar enlace de red local"
                    >
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-label-caps text-on-surface-variant uppercase tracking-wider font-bold text-[11px]">Enlace Localhost (PC)</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLinkData.localhostUrl}
                      className="flex-1 bg-surface-container-low text-body-sm px-3 py-2 rounded-lg border border-outline-variant font-data-tabular focus:ring-0 focus:outline-none select-all text-xs"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLinkData.localhostUrl);
                        alert("¡Enlace localhost copiado al portapapeles!");
                      }}
                      className="bg-primary text-white p-2 rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                      title="Copiar enlace de localhost"
                    >
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-surface-container-low border-t border-outline-variant flex gap-3">
              <button
                onClick={() => setActiveSignatureModal(false)}
                className="w-full bg-white border border-outline-variant text-on-surface-variant py-3 rounded-lg font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
