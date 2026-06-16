"use client";

import Sidebar from "../components/Sidebar";

const USUARIOS = [
  {
    initials: "CM",
    avatarBg: "bg-primary-container",
    avatarText: "text-on-primary-container",
    nombre: "Carlos Mendoza",
    email: "carlos.mendoza@cresgo.com",
    rol: "Admin",
    rolClass: "bg-primary/10 text-primary",
    vinculado: "N/A",
    activo: true,
    accionBloqueo: "block",
    accionBloqueoClass: "hover:bg-error-container/20 text-error",
  },
  {
    initials: "AL",
    avatarBg: "bg-secondary-container",
    avatarText: "text-on-secondary-container",
    nombre: "Ana Lucía Torres",
    email: "ana.torres@cresgo.com",
    rol: "Empleado",
    rolClass: "bg-secondary-container text-on-secondary-container",
    vinculado: "Ana Lucía Torres (EMP-022)",
    activo: true,
    accionBloqueo: "block",
    accionBloqueoClass: "hover:bg-error-container/20 text-error",
  },
  {
    initials: "RG",
    avatarBg: "bg-tertiary-fixed",
    avatarText: "text-on-tertiary-fixed",
    nombre: "Roberto Gómez",
    email: "roberto.gomez@cresgo.com",
    rol: "Empleado",
    rolClass: "bg-secondary-container text-on-secondary-container",
    vinculado: "Roberto Gómez (EMP-105)",
    activo: false,
    accionBloqueo: "check_circle",
    accionBloqueoClass: "hover:bg-primary-fixed/20 text-primary",
  },
];

export default function Usuarios() {
  return (
    <div className="flex min-h-screen">
      <Sidebar activePage="usuarios" />

      {/* Main Canvas */}
      <main className="md:ml-64 min-h-screen flex flex-col flex-1">
        {/* TopAppBar */}
        <header className="flex justify-between items-center w-full px-section-gap py-component-padding-y z-30 bg-surface-container-lowest/80 backdrop-blur-md sticky top-0 border-b border-outline-variant">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" data-icon="search">
                search
              </span>
              <input
                className="w-full bg-surface-container border-none rounded-full py-2 pl-10 pr-4 text-body-base focus:ring-2 focus:ring-primary transition-shadow"
                placeholder="Buscar usuarios..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="hover:bg-surface-variant/50 rounded-full p-2 transition-colors">
              <span className="material-symbols-outlined text-primary" data-icon="notifications">notifications</span>
            </button>
            <button className="hover:bg-surface-variant/50 rounded-full p-2 transition-colors">
              <span className="material-symbols-outlined text-primary" data-icon="help">help</span>
            </button>
            <div className="h-8 w-[1px] bg-outline-variant mx-2"></div>
            <div className="flex items-center gap-3 pl-2">
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm border border-outline-variant">
                AD
              </div>
              <span className="font-body-base font-semibold hidden lg:block">Admin Cresgo</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-container-padding space-y-gutter flex-1">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="font-h1 text-h1 text-on-surface">Gestión de Usuarios</h1>
              <p className="font-body-base text-body-base text-on-surface-variant">
                Administre los accesos y roles de los usuarios del sistema.
              </p>
            </div>
            <button className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-body-base font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95 shadow-sm">
              <span className="material-symbols-outlined" data-icon="person_add">person_add</span>
              + Invitar Usuario
            </button>
          </div>

          {/* Main Controls — Filters & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
            <div className="md:col-span-12 lg:col-span-12">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-lg text-body-sm text-on-surface-variant cursor-pointer hover:bg-surface-variant transition-colors">
                    <span className="material-symbols-outlined text-[18px]" data-icon="filter_list">filter_list</span>
                    <span>Filtrar por:</span>
                  </div>
                  <select className="bg-surface border border-outline-variant rounded-lg text-body-sm py-1.5 px-3 focus:ring-primary focus:border-primary">
                    <option>Todos los Roles</option>
                    <option>Admin</option>
                    <option>Empleado</option>
                  </select>
                  <select className="bg-surface border border-outline-variant rounded-lg text-body-sm py-1.5 px-3 focus:ring-primary focus:border-primary">
                    <option>Todos los Estados</option>
                    <option>Activo</option>
                    <option>Inactivo</option>
                  </select>
                </div>
                <div className="text-body-sm text-on-surface-variant">
                  Total: <span className="font-bold text-on-surface">25 usuarios</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Usuario</th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Rol</th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Empleado Vinculado</th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {USUARIOS.map((u, idx) => (
                    <tr
                      key={u.email}
                      className={`hover:bg-surface/50 transition-colors ${idx % 2 === 1 ? "bg-surface-container-low/20" : ""}`}
                    >
                      {/* Usuario */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${u.avatarBg} ${u.avatarText}`}>
                            {u.initials}
                          </div>
                          <div>
                            <div className="font-body-base font-semibold text-on-surface">{u.nombre}</div>
                            <div className="text-body-sm text-on-surface-variant">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      {/* Rol */}
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full font-label-caps font-bold ${u.rolClass}`}>
                          {u.rol}
                        </span>
                      </td>
                      {/* Empleado Vinculado */}
                      <td className="px-6 py-4 font-data-tabular text-data-tabular text-on-surface">{u.vinculado}</td>
                      {/* Estado */}
                      <td className="px-6 py-4">
                        {u.activo ? (
                          <span className="flex items-center gap-1.5 text-primary">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            <span className="font-body-sm font-medium">Activo</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-on-surface-variant">
                            <span className="w-2 h-2 rounded-full bg-outline"></span>
                            <span className="font-body-sm font-medium">Inactivo</span>
                          </span>
                        )}
                      </td>
                      {/* Acciones */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 hover:bg-surface-container rounded-lg text-on-secondary-container transition-colors">
                            <span className="material-symbols-outlined text-[20px]" data-icon="edit">edit</span>
                          </button>
                          <button className={`p-2 rounded-lg transition-colors ${u.accionBloqueoClass}`}>
                            <span className="material-symbols-outlined text-[20px]" data-icon={u.accionBloqueo}>
                              {u.accionBloqueo}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-surface-container-low/30 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Mostrando <span className="font-bold text-on-surface">1 a 10</span> de{" "}
                <span className="font-bold text-on-surface">25</span> usuarios
              </p>
              <div className="flex items-center gap-2">
                <button className="p-2 border border-outline-variant rounded hover:bg-surface-container transition-colors disabled:opacity-50" disabled>
                  <span className="material-symbols-outlined text-[20px]" data-icon="chevron_left">chevron_left</span>
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-on-primary font-body-sm font-bold shadow-sm">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container text-on-surface font-body-sm transition-colors">2</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container text-on-surface font-body-sm transition-colors">3</button>
                <button className="p-2 border border-outline-variant rounded hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-[20px]" data-icon="chevron_right">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Branding */}
        <footer className="mt-auto px-container-padding py-8 text-center">
          <p className="font-label-caps text-label-caps text-on-surface-variant">
            © 2024 Importaciones CRESGO | Todos los derechos reservados.
          </p>
        </footer>
      </main>
    </div>
  );
}
