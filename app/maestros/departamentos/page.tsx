"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { supabase } from "@/lib/supabase/client";

interface Empresa {
  id_empresa: number;
  nombre: string;
}

interface Departamento {
  id_departamento: number;
  id_empresa: number;
  nombre: string;
  codigo: string;
  empresa: {
    nombre: string;
  } | null;
}

export default function DepartamentosCRUD() {
  const [data, setData] = useState<Departamento[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<Departamento | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    id_empresa: ""
  });

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Departamento | null>(null);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchInitialData = async () => {
    try {
      const { data: empData, error: empErr } = await supabase
        .from("empresa")
        .select("id_empresa, nombre")
        .order("nombre", { ascending: true });
      if (empErr) throw empErr;
      setEmpresas(empData || []);
    } catch (err: any) {
      console.error("Error loading empresas for select:", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("departamento")
        .select("*, empresa(nombre)", { count: "exact" });

      if (debouncedSearch) {
        query = query.or(`nombre.ilike.%${debouncedSearch}%,codigo.ilike.%${debouncedSearch}%`);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: result, error, count } = await query
        .range(from, to)
        .order("id_departamento", { ascending: true });

      if (error) throw error;
      
      setData((result as unknown as Departamento[]) || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error("Error fetching departamentos:", err);
      setStatusMessage({ type: "error", text: "Error al cargar departamentos: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, debouncedSearch]);

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({
      nombre: "",
      codigo: "",
      id_empresa: empresas.length > 0 ? empresas[0].id_empresa.toString() : ""
    });
    setSelectedItem(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: Departamento) => {
    setModalMode("edit");
    setSelectedItem(item);
    setFormData({
      nombre: item.nombre || "",
      codigo: item.codigo || "",
      id_empresa: item.id_empresa?.toString() || ""
    });
    setShowModal(true);
  };

  const handleOpenDelete = (item: Departamento) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.codigo.trim() || !formData.id_empresa) {
      setStatusMessage({ type: "error", text: "Todos los campos son obligatorios." });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      if (modalMode === "create") {
        const { error } = await supabase
          .from("departamento")
          .insert({
            nombre: formData.nombre,
            codigo: formData.codigo,
            id_empresa: parseInt(formData.id_empresa)
          });
        if (error) throw error;
        setStatusMessage({ type: "success", text: "Departamento agregado con éxito." });
      } else {
        if (!selectedItem) return;
        const { error } = await supabase
          .from("departamento")
          .update({
            nombre: formData.nombre,
            codigo: formData.codigo,
            id_empresa: parseInt(formData.id_empresa)
          })
          .eq("id_departamento", selectedItem.id_departamento);
        if (error) throw error;
        setStatusMessage({ type: "success", text: "Departamento actualizado con éxito." });
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error("Error saving departamento:", err);
      setStatusMessage({ type: "error", text: "Error al guardar departamento: " + err.message });
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const { error } = await supabase
        .from("departamento")
        .delete()
        .eq("id_departamento", itemToDelete.id_departamento);

      if (error) throw error;

      setStatusMessage({ type: "success", text: "Departamento eliminado con éxito." });
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      if (data.length === 1 && page > 1) {
        setPage(p => p - 1);
      } else {
        fetchData();
      }
    } catch (err: any) {
      console.error("Error deleting departamento:", err);
      setStatusMessage({ 
        type: "error", 
        text: "Error al eliminar departamento: " + (err.message.includes("violates foreign key constraint") 
          ? "No se puede eliminar porque tiene empleados asociados." 
          : err.message)
      });
      setShowDeleteConfirm(false);
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="flex min-h-screen text-on-surface bg-background">
      <Sidebar activePage="departamentos" />

      {/* Main Content Area */}
      <div className="md:ml-64 flex flex-col min-h-screen flex-1 min-w-0">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-section-gap py-4 z-30 bg-surface-container-lowest/80 backdrop-blur-md sticky top-0 border-b border-outline-variant">
          <div className="flex items-center gap-4 flex-1 pl-12 md:pl-0">
            <span className="font-h3 text-h3 font-bold text-primary">Catálogo de Departamentos</span>
          </div>
          
          <div className="flex items-center gap-4">
            {statusMessage && (
              <div className={`text-body-sm font-semibold px-4 py-1.5 rounded-lg border shadow-sm ${
                statusMessage.type === "success" 
                  ? "bg-primary/10 text-primary border-primary/20" 
                  : "bg-error/10 text-error border-error/20"
              }`}>
                {statusMessage.text}
              </div>
            )}
            
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm border border-outline-variant">
              AD
            </div>
          </div>
        </header>

        {/* Canvas Content */}
        <main className="p-4 md:p-8 flex-1 min-w-0">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-h2 text-h2 text-on-surface tracking-tight">Departamentos</h1>
                <p className="text-body-sm text-on-surface-variant">Gestione las áreas organizacionales de la empresa.</p>
              </div>
              <button 
                onClick={handleOpenCreate}
                disabled={empresas.length === 0}
                className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 shadow-sm transition-opacity cursor-pointer text-body-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Agregar Departamento
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl shadow-sm flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[280px]">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">search</span>
                  </span>
                  <input
                    className="w-full pl-10 pr-4 py-2 bg-background border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-body-sm focus:outline-none"
                    placeholder="Filtrar por nombre o código..."
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden border-t-4 border-t-primary">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/50 text-on-surface-variant border-b border-outline-variant text-label-caps">
                      <th className="px-6 py-4 font-bold">Código</th>
                      <th className="px-6 py-4 font-bold">Nombre del Departamento</th>
                      <th className="px-6 py-4 font-bold">Empresa Relacionada</th>
                      <th className="px-6 py-4 font-bold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-body-base">
                    {loading && data.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span>Cargando departamentos...</span>
                          </div>
                        </td>
                      </tr>
                    ) : data.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant">
                          No se encontraron departamentos registrados.
                        </td>
                      </tr>
                    ) : (
                      data.map((item) => (
                        <tr key={item.id_departamento} className="hover:bg-surface-container/30 transition-colors">
                          <td className="px-6 py-4 font-data-tabular font-semibold text-primary">{item.codigo}</td>
                          <td className="px-6 py-4 font-medium text-on-surface">{item.nombre}</td>
                          <td className="px-6 py-4">
                            <span className="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded text-[12px] font-medium">
                              {item.empresa?.nombre || "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button 
                                onClick={() => handleOpenEdit(item)}
                                className="p-2 hover:bg-surface-variant/50 rounded-lg text-secondary transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <span className="material-symbols-outlined text-[20px]">edit</span>
                              </button>
                              <button 
                                onClick={() => handleOpenDelete(item)}
                                className="p-2 hover:bg-error-container/20 rounded-lg text-error transition-colors cursor-pointer"
                                title="Eliminar"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="bg-surface-container-low px-6 py-4 flex justify-between items-center border-t border-outline-variant">
                <p className="text-body-sm text-on-surface-variant">
                  Mostrando {data.length} de {totalCount} departamentos
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-outline-variant rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container disabled:opacity-50 font-semibold text-body-sm cursor-pointer"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1 text-on-surface font-semibold text-body-sm">Página {page} de {totalPages || 1}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1 border border-outline-variant rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container disabled:opacity-50 font-semibold text-body-sm cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm px-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-outline-variant animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-h2 text-h2 text-on-surface">
                {modalMode === "create" ? "Agregar Nuevo Departamento" : "Editar Departamento"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors flex items-center justify-center cursor-pointer text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Código del Departamento *</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none" 
                    type="text" 
                    required
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Nombre del Departamento *</label>
                  <input 
                    className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-body-base focus:outline-none" 
                    type="text" 
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-caps text-on-surface-variant uppercase font-semibold">Empresa Relacionada *</label>
                  <div className="relative">
                    <select 
                      className="w-full border border-outline-variant rounded-lg focus:ring-primary focus:border-primary text-body-base appearance-none py-2 px-3 pr-10 bg-transparent focus:outline-none"
                      required
                      value={formData.id_empresa}
                      onChange={(e) => setFormData({ ...formData, id_empresa: e.target.value })}
                    >
                      {empresas.map(emp => (
                        <option key={emp.id_empresa} value={emp.id_empresa}>
                          {emp.nombre}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-secondary pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 rounded-lg font-bold border border-outline-variant text-on-surface hover:bg-surface-container transition-all cursor-pointer text-body-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 rounded-lg font-bold bg-primary text-on-primary shadow-sm hover:opacity-90 transition-all cursor-pointer text-body-sm"
                >
                  {modalMode === "create" ? "Guardar" : "Actualizar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteConfirm && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm px-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-outline-variant animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-error-container/10">
              <h3 className="font-h2 text-h2 text-error flex items-center gap-2">
                <span className="material-symbols-outlined">warning</span>
                Confirmar Eliminación
              </h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors flex items-center justify-center cursor-pointer text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-body-base text-on-surface">
                ¿Está seguro de que desea eliminar el departamento <strong>{itemToDelete.nombre}</strong> (Código: {itemToDelete.codigo})?
              </p>
              <p className="text-body-sm text-on-surface-variant mt-2">
                Esta acción no se puede deshacer. Si el departamento posee empleados asociados, la base de datos impedirá la eliminación para proteger la integridad referencial.
              </p>
            </div>

            <div className="p-6 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2 rounded-lg font-bold border border-outline-variant text-on-surface hover:bg-surface-container transition-all cursor-pointer text-body-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                className="px-5 py-2 rounded-lg font-bold bg-error text-on-error shadow-sm hover:opacity-90 transition-all cursor-pointer text-body-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
