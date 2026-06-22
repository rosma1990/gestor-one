"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { supabase } from "@/lib/supabase/client";

interface CatalogCard {
  key: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  countLabel: string;
}

export default function MaestrosDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    empresas: 0,
    departamentos: 0,
    empleados: 0,
    conceptos: 0,
    constantes: 0,
    periodos: 0,
    bancos: 0,
  });

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      try {
        const [
          { count: empCount },
          { count: depCount },
          { count: emplCount },
          { count: concCount },
          { count: constCount },
          { count: perCount },
          { count: banCount }
        ] = await Promise.all([
          supabase.from("empresa").select("*", { count: "exact", head: true }),
          supabase.from("departamento").select("*", { count: "exact", head: true }),
          supabase.from("empleado").select("*", { count: "exact", head: true }),
          supabase.from("concepto_pago").select("*", { count: "exact", head: true }),
          supabase.from("constante_sistema").select("*", { count: "exact", head: true }),
          supabase.from("periodo_pago").select("*", { count: "exact", head: true }),
          supabase.from("banco").select("*", { count: "exact", head: true }),
        ]);

        setCounts({
          empresas: empCount || 0,
          departamentos: depCount || 0,
          empleados: emplCount || 0,
          conceptos: concCount || 0,
          constantes: constCount || 0,
          periodos: perCount || 0,
          bancos: banCount || 0,
        });
      } catch (err) {
        console.error("Error loading maestros counts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCounts();
  }, []);

  const catalogs: CatalogCard[] = [
    {
      key: "empresas",
      title: "Empresas",
      description: "Gestione las empresas registradas en el sistema, NIT y datos de facturación general.",
      icon: "domain",
      route: "/maestros/empresas",
      countLabel: `${counts.empresas} ${counts.empresas === 1 ? "empresa registrada" : "empresas registradas"}`
    },
    {
      key: "departamentos",
      title: "Departamentos",
      description: "Organice la estructura empresarial por departamentos operativos y administrativos.",
      icon: "schema",
      route: "/maestros/departamentos",
      countLabel: `${counts.departamentos} ${counts.departamentos === 1 ? "departamento configurado" : "departamentos configurados"}`
    },
    {
      key: "empleados",
      title: "Empleados",
      description: "Administre la información de los colaboradores, puestos, CUI, NIT y firmas digitales.",
      icon: "badge",
      route: "/maestros/empleados",
      countLabel: `${counts.empleados} ${counts.empleados === 1 ? "empleado registrado" : "empleados registrados"}`
    },
    {
      key: "conceptos",
      title: "Conceptos de Pago",
      description: "Configure los ingresos, egresos, fórmulas de cálculo e IGSS/ISR de la planilla.",
      icon: "payments",
      route: "/maestros/conceptospago",
      countLabel: `${counts.conceptos} ${counts.conceptos === 1 ? "concepto activo" : "conceptos activos"}`
    },
    {
      key: "constantes",
      title: "Constantes del Sistema",
      description: "Defina las variables fijas del sistema como salarios mínimos, bonos de ley y tasas impositivas.",
      icon: "calculate",
      route: "/maestros/constantesistema",
      countLabel: `${counts.constantes} ${counts.constantes === 1 ? "constante del sistema" : "constantes del sistema"}`
    },
    {
      key: "periodos",
      title: "Períodos de Pago",
      description: "Abra, administre y cierre periodos mensuales y quincenales de pago.",
      icon: "calendar_month",
      route: "/maestros/periodospago",
      countLabel: `${counts.periodos} ${counts.periodos === 1 ? "periodo de pago" : "periodos de pago"}`
    },
    {
      key: "bancos",
      title: "Bancos",
      description: "Gestione las instituciones bancarias para la generación de transferencias y depósitos de nómina.",
      icon: "account_balance",
      route: "/maestros/bancos",
      countLabel: `${counts.bancos} ${counts.bancos === 1 ? "banco registrado" : "bancos registrados"}`
    }
  ];

  return (
    <div className="flex min-h-screen text-on-surface bg-background">
      <Sidebar activePage="maestros" />

      {/* Main Content Area */}
      <div className="md:ml-64 flex flex-col min-h-screen flex-1 min-w-0">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-section-gap py-4 z-30 bg-surface-container-lowest/80 backdrop-blur-md sticky top-0 border-b border-outline-variant">
          <div className="flex items-center gap-4 flex-1 pl-12 md:pl-0">
            <span className="font-h3 text-h3 font-bold text-primary">Catálogos Maestros</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 pl-2">
              <span className="text-right hidden sm:block">
                <p className="font-body-base font-bold text-on-surface">Admin CRESGO</p>
                <p className="text-[10px] tracking-wider text-on-surface-variant/80 uppercase font-semibold">SUPERUSER</p>
              </span>
              <div className="w-10 h-10 rounded-2xl border border-outline-variant overflow-hidden flex items-center justify-center bg-primary-container">
                <img 
                  className="w-full h-full object-cover" 
                  alt="User profile" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVJ0KDkIXLNnkhPFS4qNH96n3xzyNAWXREAFRTkVhK8RaiMd8n5nrXANqdRDJ0oMpWhSettb5FMuXYv___VBoazd5qH1dDL74yJLNcBmFku64jEy5t_W5jflR0Rj3NRyCLQh8fscItEEmalW1cbrLvfy76zHQ9rD1GYK44NrlNVRybvY9mT-lsXyp_WMjbLDsFEEpMWtZN7AzWYmc9X4fjO1yU0eFgSQaqaEUchngFoF0lZmE3ZAUEBpp8UzhKOTyNIPdNpel7O2jt"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Canvas Content */}
        <main className="p-4 md:p-8 flex-1 min-w-0">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Page Header */}
            <div>
              <h1 className="font-h1 text-h1 text-on-surface tracking-tight">Maestros</h1>
              <p className="text-body-base text-on-surface-variant mt-1">
                Gestione la información base para el cálculo de planillas de Importaciones CRESGO. Seleccione un catálogo para ver, crear, editar o eliminar registros.
              </p>
            </div>

            {/* Grid Bento of Catalogs */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-body-base text-on-surface-variant font-medium">Cargando estadísticas de catálogos...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {catalogs.map((catalog) => (
                  <div 
                    key={catalog.key}
                    onClick={() => router.push(catalog.route)}
                    className="group bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm hover:border-primary hover:shadow-md cursor-pointer transition-all duration-300 flex flex-col justify-between h-64 border-t-4 border-t-primary"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                          <span className="material-symbols-outlined text-2xl">{catalog.icon}</span>
                        </div>
                        <span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          arrow_forward
                        </span>
                      </div>
                      <h3 className="font-h3 text-h3 text-on-surface group-hover:text-primary transition-colors">
                        {catalog.title}
                      </h3>
                      <p className="text-body-sm text-on-surface-variant mt-2 line-clamp-3">
                        {catalog.description}
                      </p>
                    </div>
                    
                    <div className="border-t border-outline-variant/30 pt-3 mt-4 flex items-center gap-1.5 text-body-sm font-semibold text-primary">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      <span>{catalog.countLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
