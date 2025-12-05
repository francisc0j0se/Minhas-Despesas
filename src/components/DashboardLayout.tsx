import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const pageTitles: { [key: string]: string } = {
  '/': 'Painel',
  '/accounts': 'Contas',
  '/despesas': 'Despesas',
  '/receitas': 'Receitas',
  '/budgets': 'Orçamentos',
  '/settings': 'Configurações',
};

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const pageTitle = pageTitles[path] || 'Página não encontrada';
    document.title = `Minhas Despesas | ${pageTitle}`;
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <Sidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14 flex-grow">
        <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;