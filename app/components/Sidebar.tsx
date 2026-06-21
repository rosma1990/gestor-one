"use client";

import { useState } from "react";

type ActivePage =
  | "dashboard"
  | "planilla"
  | "registro-periodos"
  | "registro-planilla"
  | "constancias"
  | "transferencias"
  | "maestros"
  | "empresas"
  | "departamentos"
  | "empleados"
  | "conceptospago"
  | "constantesistema"
  | "periodospago"
  | "bancos"
  | "usuarios";

interface SidebarProps {
  activePage: ActivePage;
}

const NAV_ITEMS = [
  { key: "dashboard",      icon: "dashboard",       label: "Dashboard",      href: "/admin_dashboard" },
  { key: "planilla",       icon: "payments",        label: "Planilla",       href: "#", hasSubmenu: true },
  { key: "constancias",    icon: "description",     label: "Constancias",    href: "/constancias" },
  { key: "transferencias", icon: "account_balance", label: "Transferencias", href: "/transferencias" },
  { key: "maestros",       icon: "database",        label: "Maestros",       href: "#", hasSubmenu: true },
  { key: "usuarios",       icon: "group",           label: "Usuarios",       href: "/usuarios" },
] as const;

const ACTIVE_LINK   = "flex items-center justify-between px-4 py-2 text-primary font-bold border-r-4 border-primary bg-surface-container-low transition-all";
const INACTIVE_LINK = "flex items-center justify-between px-4 py-2 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all";

export default function Sidebar({ activePage }: SidebarProps) {
  const isPlanillaActive = activePage === "planilla" || activePage === "registro-periodos" || activePage === "registro-planilla";
  const isMaestrosActive = activePage === "maestros" || 
                           activePage === "empresas" || 
                           activePage === "departamentos" || 
                           activePage === "empleados" || 
                           activePage === "conceptospago" || 
                           activePage === "constantesistema" || 
                           activePage === "periodospago" ||
                           activePage === "bancos";

  const [planillaExpanded, setPlanillaExpanded] = useState(isPlanillaActive);
  const [maestrosExpanded, setMaestrosExpanded] = useState(isMaestrosActive);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Hamburger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-3 left-4 z-40 md:hidden p-2 rounded-lg bg-surface-container-low/90 backdrop-blur-md text-primary border border-outline-variant shadow-sm hover:bg-surface-container-high transition-all active:scale-95 cursor-pointer flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>
      )}

      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-35 md:hidden"
        />
      )}

      <aside className={`fixed left-0 top-0 h-full z-40 flex flex-col w-64 border-r border-outline-variant bg-surface-container-lowest shadow-sm transition-transform duration-300 ease-in-out md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Mobile close button inside sidebar */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 md:hidden p-1.5 hover:bg-surface-variant/50 rounded-full text-on-surface-variant transition-colors cursor-pointer flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      {/* Brand */}
      <div className="px-6 py-8">
        <h1 className="font-h2 text-h2 font-bold text-on-surface">Importaciones CRESGO</h1>
        <p className="text-body-sm text-on-surface-variant opacity-70">Sistema de Planilla</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const { key, icon, label, href } = item;
          const isActive = key === "planilla" ? isPlanillaActive : key === "maestros" ? isMaestrosActive : activePage === key;
          
          if ("hasSubmenu" in item && item.hasSubmenu) {
            const isPlanilla = key === "planilla";
            const expanded = isPlanilla ? planillaExpanded : maestrosExpanded;
            const toggle = () => isPlanilla ? setPlanillaExpanded(!planillaExpanded) : setMaestrosExpanded(!maestrosExpanded);

            return (
              <div key={key} className="space-y-1">
                <button
                  onClick={toggle}
                  className={`w-full text-left cursor-pointer ${isActive ? ACTIVE_LINK : INACTIVE_LINK}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined" data-icon={icon}>{icon}</span>
                    <span className="font-body-base text-body-base">{label}</span>
                  </div>
                  <span 
                    className="material-symbols-outlined text-sm font-light transition-transform duration-200" 
                    style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    expand_more
                  </span>
                </button>
                {expanded && (
                  <div className="pl-9 pr-2 py-1 space-y-1 border-l border-outline-variant/30 ml-6">
                    {isPlanilla ? (
                      <>
                        <a
                          href="/planilla/registro-periodos"
                          className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-body-sm transition-all ${
                            activePage === "registro-periodos"
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Registro Periodos</span>
                        </a>
                        <a
                          href="/planilla/registro-planilla"
                          className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-body-sm transition-all ${
                            activePage === "registro-planilla"
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Registro Planilla</span>
                        </a>
                      </>
                    ) : (
                      <>
                        <a
                          href="/maestros/empresas"
                          className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-body-sm transition-all ${
                            activePage === "empresas"
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Empresas</span>
                        </a>
                        <a
                          href="/maestros/departamentos"
                          className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-body-sm transition-all ${
                            activePage === "departamentos"
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Departamentos</span>
                        </a>
                        <a
                          href="/maestros/empleados"
                          className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-body-sm transition-all ${
                            activePage === "empleados"
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Empleados</span>
                        </a>
                        <a
                          href="/maestros/conceptospago"
                          className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-body-sm transition-all ${
                            activePage === "conceptospago"
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Conceptos Pago</span>
                        </a>
                        <a
                          href="/maestros/constantesistema"
                          className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-body-sm transition-all ${
                            activePage === "constantesistema"
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Constantes Sistema</span>
                        </a>
                        <a
                          href="/maestros/periodospago"
                          className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-body-sm transition-all ${
                            activePage === "periodospago"
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Periodos Pago</span>
                        </a>
                        <a
                          href="/maestros/bancos"
                          className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-body-sm transition-all ${
                            activePage === "bancos"
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Bancos</span>
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          }

          return (
            <a
              key={key}
              href={href}
              className={isActive ? ACTIVE_LINK : INACTIVE_LINK}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined" data-icon={icon}>{icon}</span>
                <span className="font-body-base text-body-base">{label}</span>
              </div>
            </a>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-4 py-6 border-t border-outline-variant mt-auto space-y-1">
        <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all" href="#">
          <span className="material-symbols-outlined" data-icon="settings">settings</span>
          <span className="font-body-base text-body-base">Ajustes</span>
        </a>
        <a className="flex items-center gap-3 px-4 py-2 text-error hover:bg-error-container/20 transition-all" href="#">
          <span className="material-symbols-outlined" data-icon="logout">logout</span>
          <span className="font-body-base text-body-base">Cerrar Sesión</span>
        </a>
      </div>
    </aside>
  </>
  );
}
