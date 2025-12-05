import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Settings, LogOut, ArrowDownCircle, ArrowUpCircle, Wallet, Package, PanelLeft,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';

const navItems = [
  { href: '/', icon: Home, label: 'Painel' },
  { href: '/accounts', icon: Wallet, label: 'Contas' },
  { href: '/despesas', icon: ArrowDownCircle, label: 'Despesas' },
  { href: '/receitas', icon: ArrowUpCircle, label: 'Receitas' },
  { href: '/budgets', icon: Package, label: 'Orçamentos' },
];

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Abrir Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs flex flex-col">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              to="/"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Logo className="h-6 w-6" />
              <span className="sr-only">Minhas Despesas</span>
            </Link>
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground',
                  location.pathname === item.href && 'text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
          <nav className="mt-auto grid gap-6 text-lg font-medium">
            <Link
              to="/settings"
              className={cn(
                'flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground',
                location.pathname === '/settings' && 'text-foreground'
              )}
            >
              <Settings className="h-5 w-5" />
              Configurações
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground text-left"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default Header;