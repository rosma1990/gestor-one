"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

interface Departamento {
  id_departamento: number;
  nombre: string;
  codigo: string;
  id_empresa: number;
  empresa: {
    nombre: string;
  } | null;
}

export default function DepartamentosTable() {
  const [data, setData] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

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
      .from("departamento")
      .select("*, empresa(nombre)", { count: "exact" });

    if (debouncedSearch) {
      query = query.or(`nombre.ilike.%${debouncedSearch}%,codigo.ilike.%${debouncedSearch}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: result, error, count } = await query.range(from, to).order("id_departamento", { ascending: true });

    if (error) {
      console.error("Error fetching departamentos:", error);
    } else {
      setData((result as unknown as Departamento[]) || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [page, debouncedSearch]);

  const totalPages = Math.ceil(totalCount / limit);

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
              placeholder="Filtrar por código o nombre..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <button className="bg-surface-container border border-outline-variant text-on-surface px-4 py-2 rounded-lg text-body-sm font-medium hover:bg-surface-container-high transition-colors">
          Exportar Excel
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 text-on-surface-variant border-b border-outline-variant">
                <th className="px-6 py-4 font-label-caps text-label-caps uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-4 font-label-caps text-label-caps uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 font-label-caps text-label-caps uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-4 font-label-caps text-label-caps uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant">Cargando...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant">No se encontraron registros.</td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id_departamento} className="hover:bg-surface-container/30 transition-colors">
                    <td className="px-6 py-4 text-body-base text-on-surface font-medium">{item.empresa?.nombre || "-"}</td>
                    <td className="px-6 py-4 font-data-tabular text-data-tabular text-on-surface">{item.codigo}</td>
                    <td className="px-6 py-4 text-body-base text-on-surface">{item.nombre}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button className="p-2 hover:bg-surface-variant/50 rounded-lg text-secondary transition-colors">
                          <span className="material-symbols-outlined text-[20px]" data-icon="edit">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-surface-container-low px-6 py-4 flex justify-between items-center border-t border-outline-variant">
          <p className="text-body-sm text-on-surface-variant">
            Mostrando {data.length} de {totalCount} departamentos
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
    </div>
  );
}
