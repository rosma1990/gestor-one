"use client";

import { useState } from "react";
import Sidebar from "../components/Sidebar";

// Sub-components
import EmpresaTable from "./components/EmpresaTable";
import DepartamentosTable from "./components/DepartamentosTable";
import EmpleadosTable from "./components/EmpleadosTable";
import ConceptosPagoTable from "./components/ConceptosPagoTable";
import ConstantesTable from "./components/ConstantesTable";
import PeriodosPagoTable from "./components/PeriodosPagoTable";

type TabKey = "empresa" | "departamentos" | "empleados" | "conceptos" | "constantes" | "periodos";

export default function Maestros() {
  const [activeTab, setActiveTab] = useState<TabKey>("empresa");
  const [showModal, setShowModal] = useState(false);

  const renderTabContent = () => {
    switch (activeTab) {
      case "empresa": return <EmpresaTable />;
      case "departamentos": return <DepartamentosTable />;
      case "empleados": return <EmpleadosTable />;
      case "conceptos": return <ConceptosPagoTable />;
      case "constantes": return <ConstantesTable />;
      case "periodos": return <PeriodosPagoTable />;
      default: return null;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar activePage="maestros" />

      {/* Main Content Area */}
      <div className="md:ml-64 flex flex-col min-h-screen flex-1">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-section-gap py-component-padding-y z-30 bg-surface-container-lowest/80 backdrop-blur-md sticky top-0 border-b border-outline-variant">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" data-icon="search">
                search
              </span>
              <input
                className="w-full bg-surface-container border-none rounded-full py-2 pl-10 pr-4 text-body-base focus:ring-2 focus:ring-primary transition-shadow"
                placeholder="Buscar en maestros..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button className="hover:bg-surface-variant/50 rounded-full p-2 transition-colors relative">
                <span className="material-symbols-outlined text-primary" data-icon="notifications">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
              </button>
              <button className="hover:bg-surface-variant/50 rounded-full p-2 transition-colors">
                <span className="material-symbols-outlined text-primary" data-icon="help">help</span>
              </button>
            </div>
            <div className="h-8 w-[1px] bg-outline-variant mx-2"></div>
            <div className="flex items-center gap-3 pl-2">
              <span className="text-right hidden sm:block">
                <p className="font-body-base font-bold text-on-surface">Admin CRESGO</p>
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Administrador</p>
              </span>
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm border border-outline-variant">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* Canvas Content */}
        <main className="p-8 flex-1">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="font-h1 text-h1 text-on-surface tracking-tight">Maestros</h1>
                <p className="text-body-base text-on-surface-variant mt-1">
                  Gestione la información base para el cálculo de planillas de Importaciones CRESGO.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined" data-icon="add">add</span>
                  Nuevo Maestro
                </button>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-outline-variant overflow-x-auto">
              <div className="flex gap-8">
                {[
                  { key: "empresa",       label: "Empresa" },
                  { key: "departamentos", label: "Departamentos" },
                  { key: "empleados",     label: "Empleados" },
                  { key: "conceptos",     label: "Conceptos de Pago" },
                  { key: "constantes",    label: "Constantes del Sistema" },
                  { key: "periodos",      label: "Períodos de Pago" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as TabKey)}
                    className={`pb-4 text-body-base whitespace-nowrap transition-colors relative ${
                      activeTab === key
                        ? "font-bold text-primary active-tab-indicator"
                        : "font-medium text-on-surface-variant hover:text-primary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Content based on Active Tab */}
            {renderTabContent()}

          </div>
        </main>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 md:hidden"
      >
        <span className="material-symbols-outlined" data-icon="add">add</span>
      </button>

      {/* Modal: Nuevo Maestro (Placeholder genérico) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-outline-variant">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-h2 text-h2 text-on-surface">Nuevo Registro</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-surface-variant/50 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined" data-icon="close">close</span>
              </button>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="font-label-caps text-label-caps uppercase text-on-surface-variant">Nombre</label>
                  <input className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary" type="text" />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-caps text-label-caps uppercase text-on-surface-variant">Descripción</label>
                  <input className="w-full px-4 py-2 bg-background border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary" type="text" />
                </div>
              </div>
              <div className="mt-10 flex justify-end gap-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 rounded-lg font-bold border border-outline-variant text-on-surface hover:bg-surface-container transition-all"
                >
                  Cancelar
                </button>
                <button className="px-6 py-2 rounded-lg font-bold bg-primary text-on-primary shadow-sm hover:opacity-90 transition-all">
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active tab indicator style */}
      <style>{`
        .active-tab-indicator {
          position: relative;
        }
        .active-tab-indicator::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #006327;
        }
      `}</style>
    </div>
  );
}
