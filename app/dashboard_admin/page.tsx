import Sidebar from "../components/Sidebar";

export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen">
        <Sidebar activePage="dashboard" />
        {/* Main Content Canvas */}
        <main className="flex-1 md:ml-64 flex flex-col min-w-0">
          {/* TopAppBar */}
          <header className="flex justify-between items-center w-full px-section-gap py-4 z-30 sticky top-0 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative w-full max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" data-icon="search">search</span>
                <input className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-body-base focus:ring-2 focus:ring-primary" placeholder="Buscar registros..." type="text" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="hover:bg-surface-variant/50 rounded-full p-2 transition-colors">
                <span className="material-symbols-outlined text-primary" data-icon="notifications">notifications</span>
              </button>
              <button className="hover:bg-surface-variant/50 rounded-full p-2 transition-colors">
                <span className="material-symbols-outlined text-primary" data-icon="help">help</span>
              </button>
              <div className="h-8 w-[1px] bg-outline-variant mx-2"></div>
              <div className="flex items-center gap-3 cursor-pointer hover:bg-surface-variant/20 p-1 pr-3 rounded-full transition-all">
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center overflow-hidden">
                  <img alt="User Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCjxSEmFXXy1pOpXZjUy0mA_8Bg8Mz4IxmdkyuqrWRaOXO1RTW6WD7ME96rs1nxNKZq_fUYRQaieq4YQ-NQYV8AjKD7Bw8I6xucJCWYYQCs8aqLgMbcelOxJnAbo_7kKn06FCHtzloyuL_BkbHU7qmM88-YLh1VUCSXiFdlODAXNA20Q1wmDSc9W-QNbC-bmWZmf8crTtWpYjBhNRKEmq0fXs0QQiAQcelNgyNPb0mJXskpi2C8S4GSnIzd2gBQxInQij4xhWyPpuJ6" />
                </div>
                <span className="text-body-base font-semibold text-on-surface">Administrador</span>
              </div>
            </div>
          </header>
          {/* Dashboard Content */}
          <div className="p-section-gap space-y-gutter">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-h1 text-h1 text-on-surface">Resumen de Planilla</h2>
                <p className="text-body-base text-on-surface-variant">Bienvenido de nuevo. Aquí tienes un vistazo general del estado actual.</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold hover:opacity-90 transition-opacity">
                  <span className="material-symbols-outlined" data-icon="add">add</span>
                  Nueva Planilla
                </button>
              </div>
            </div>
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-primary">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-label-caps text-on-surface-variant uppercase">Total Planilla (Mes Actual)</span>
                  <span className="material-symbols-outlined text-primary" data-icon="payments">payments</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-h1 font-h1 text-on-surface">Q 452,180.50</span>
                  <span className="text-body-sm text-primary font-medium flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[16px]" data-icon="trending_up">trending_up</span>
                    +4.2% vs mes anterior
                  </span>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-primary">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-label-caps text-on-surface-variant uppercase">Colaboradores Activos</span>
                  <span className="material-symbols-outlined text-primary" data-icon="badge">badge</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-h1 font-h1 text-on-surface">342</span>
                  <span className="text-body-sm text-on-surface-variant opacity-70 mt-1">Personal contratado</span>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-primary">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-label-caps text-on-surface-variant uppercase">Deducciones Totales</span>
                  <span className="material-symbols-outlined text-tertiary" data-icon="account_balance_wallet">account_balance_wallet</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-h1 font-h1 text-on-surface">Q 82,410.20</span>
                  <span className="text-body-sm text-on-surface-variant opacity-70 mt-1">IGSS, ISR y Otros</span>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-primary">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-label-caps text-on-surface-variant uppercase">Pendiente de Pago</span>
                  <span className="material-symbols-outlined text-secondary" data-icon="schedule">schedule</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-h1 font-h1 text-on-surface">Q 0.00</span>
                  <span className="text-body-sm text-primary font-medium mt-1">Todo al día</span>
                </div>
              </div>
            </div>
            {/* Main Dashboard Layout: Bento Style */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
              {/* Chart Section */}
              <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-h3 text-h3 text-on-surface">Histórico de Pagos (2023-2024)</h3>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
                      <span className="w-3 h-3 bg-primary rounded-full"></span> Ingresos
                    </span>
                    <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
                      <span className="w-3 h-3 bg-tertiary rounded-full"></span> Deducciones
                    </span>
                  </div>
                </div>
                {/* Simulated Bar Chart */}
                <div className="h-64 flex items-end justify-between gap-4 px-4">
                  {/* January */}
                  <div className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full flex items-end gap-1 h-full">
                      <div className="w-1/2 bg-primary/20 rounded-t h-[60%] group-hover:bg-primary transition-colors"></div>
                      <div className="w-1/2 bg-tertiary/20 rounded-t h-[20%] group-hover:bg-tertiary transition-colors"></div>
                    </div>
                    <span className="text-label-caps">ENE</span>
                  </div>
                  {/* February */}
                  <div className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full flex items-end gap-1 h-full">
                      <div className="w-1/2 bg-primary/20 rounded-t h-[65%] group-hover:bg-primary transition-colors"></div>
                      <div className="w-1/2 bg-tertiary/20 rounded-t h-[22%] group-hover:bg-tertiary transition-colors"></div>
                    </div>
                    <span className="text-label-caps">FEB</span>
                  </div>
                  {/* March */}
                  <div className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full flex items-end gap-1 h-full">
                      <div className="w-1/2 bg-primary/20 rounded-t h-[58%] group-hover:bg-primary transition-colors"></div>
                      <div className="w-1/2 bg-tertiary/20 rounded-t h-[18%] group-hover:bg-tertiary transition-colors"></div>
                    </div>
                    <span className="text-label-caps">MAR</span>
                  </div>
                  {/* April */}
                  <div className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full flex items-end gap-1 h-full">
                      <div className="w-1/2 bg-primary/20 rounded-t h-[75%] group-hover:bg-primary transition-colors"></div>
                      <div className="w-1/2 bg-tertiary/20 rounded-t h-[25%] group-hover:bg-tertiary transition-colors"></div>
                    </div>
                    <span className="text-label-caps">ABR</span>
                  </div>
                  {/* May */}
                  <div className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full flex items-end gap-1 h-full">
                      <div className="w-1/2 bg-primary/20 rounded-t h-[70%] group-hover:bg-primary transition-colors"></div>
                      <div className="w-1/2 bg-tertiary/20 rounded-t h-[23%] group-hover:bg-tertiary transition-colors"></div>
                    </div>
                    <span className="text-label-caps">MAY</span>
                  </div>
                  {/* June */}
                  <div className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full flex items-end gap-1 h-full">
                      <div className="w-1/2 bg-primary rounded-t h-[82%]"></div>
                      <div className="w-1/2 bg-tertiary rounded-t h-[28%]"></div>
                    </div>
                    <span className="text-label-caps font-bold text-primary">JUN</span>
                  </div>
                </div>
              </div>
              {/* Quick Actions Section */}
              <div className="flex flex-col gap-4">
                <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase">Acciones Rápidas</h3>
                <a className="group bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm hover:border-primary transition-all flex items-center gap-4" href="#">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all">
                    <span className="material-symbols-outlined" data-icon="post_add">post_add</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-on-surface">Nueva Planilla</p>
                    <p className="text-body-sm text-on-surface-variant">Iniciar periodo de pago</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant opacity-30" data-icon="chevron_right">chevron_right</span>
                </a>
                <a className="group bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm hover:border-primary transition-all flex items-center gap-4" href="#">
                  <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-on-secondary transition-all">
                    <span className="material-symbols-outlined" data-icon="receipt_long">receipt_long</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-on-surface">Generar Constancias</p>
                    <p className="text-body-sm text-on-surface-variant">Descargar boletas de pago</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant opacity-30" data-icon="chevron_right">chevron_right</span>
                </a>
                <a className="group bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm hover:border-primary transition-all flex items-center gap-4" href="#">
                  <div className="w-12 h-12 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary group-hover:bg-tertiary group-hover:text-on-tertiary transition-all">
                    <span className="material-symbols-outlined" data-icon="sync_alt">sync_alt</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-on-surface">Descargar Transferencias</p>
                    <p className="text-body-sm text-on-surface-variant">Exportar archivo bancario</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant opacity-30" data-icon="chevron_right">chevron_right</span>
                </a>
              </div>
            </div>
            {/* Table Section */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
                <h3 className="font-h3 text-h3 text-on-surface">Últimos Periodos de Planilla</h3>
                <button className="text-primary font-semibold text-body-sm hover:underline">Ver todo</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low text-label-caps text-on-surface-variant">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Mes / Año</th>
                      <th className="px-6 py-3 font-semibold">Tipo</th>
                      <th className="px-6 py-3 font-semibold">Colaboradores</th>
                      <th className="px-6 py-3 font-semibold text-right">Total Devengado</th>
                      <th className="px-6 py-3 font-semibold">Estado</th>
                      <th className="px-6 py-3 font-semibold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-body-base">
                    <tr className="hover:bg-surface-container/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-on-surface">Junio 2024</td>
                      <td className="px-6 py-4">Mensual Normal</td>
                      <td className="px-6 py-4">342</td>
                      <td className="px-6 py-4 text-right font-data-tabular">Q 452,180.50</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-primary/10 text-primary text-[12px] font-bold">CERRADO</span></td>
                      <td className="px-6 py-4 text-center"><button className="material-symbols-outlined text-on-surface-variant hover:text-primary" data-icon="visibility">visibility</button></td>
                    </tr>
                    <tr className="hover:bg-surface-container/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-on-surface">Mayo 2024</td>
                      <td className="px-6 py-4">Mensual Normal</td>
                      <td className="px-6 py-4">340</td>
                      <td className="px-6 py-4 text-right font-data-tabular">Q 431,200.00</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-primary/10 text-primary text-[12px] font-bold">CERRADO</span></td>
                      <td className="px-6 py-4 text-center"><button className="material-symbols-outlined text-on-surface-variant hover:text-primary" data-icon="visibility">visibility</button></td>
                    </tr>
                    <tr className="hover:bg-surface-container/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-on-surface">Abril 2024</td>
                      <td className="px-6 py-4">Mensual Normal</td>
                      <td className="px-6 py-4">338</td>
                      <td className="px-6 py-4 text-right font-data-tabular">Q 428,500.25</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-primary/10 text-primary text-[12px] font-bold">CERRADO</span></td>
                      <td className="px-6 py-4 text-center"><button className="material-symbols-outlined text-on-surface-variant hover:text-primary" data-icon="visibility">visibility</button></td>
                    </tr>
                    <tr className="hover:bg-surface-container/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-on-surface">Bono 14 - 2024</td>
                      <td className="px-6 py-4">Extraordinario</td>
                      <td className="px-6 py-4">342</td>
                      <td className="px-6 py-4 text-right font-data-tabular">Q 395,000.00</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-surface-variant text-on-surface-variant text-[12px] font-bold">PROCESO</span></td>
                      <td className="px-6 py-4 text-center"><button className="material-symbols-outlined text-on-surface-variant hover:text-primary" data-icon="edit">edit</button></td>
                    </tr>
                    <tr className="hover:bg-surface-container/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-on-surface">Marzo 2024</td>
                      <td className="px-6 py-4">Mensual Normal</td>
                      <td className="px-6 py-4">335</td>
                      <td className="px-6 py-4 text-right font-data-tabular">Q 425,100.00</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-primary/10 text-primary text-[12px] font-bold">CERRADO</span></td>
                      <td className="px-6 py-4 text-center"><button className="material-symbols-outlined text-on-surface-variant hover:text-primary" data-icon="visibility">visibility</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {/* Footer Info */}
            <footer className="mt-auto px-section-gap py-8 text-center text-body-sm text-on-surface-variant opacity-60">
              <p>© 2024 Importaciones CRESGO S.A. - Control Interno de Planillas v2.4.0</p>
            </footer>
          </div>
        </main>
      </div>
  );
}
