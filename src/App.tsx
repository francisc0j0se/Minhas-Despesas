import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/DashboardLayout";
import Accounts from "./pages/Accounts";
import Expenses from "./pages/Expenses";
import Revenues from "./pages/Revenues";
import FixedExpenses from "./pages/FixedExpenses";
import Budgets from "./pages/Budgets";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import { AuthProvider } from "./contexts/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedRoute />}>
      <Route
        path="/*"
        element={
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/despesas" element={<Expenses />} />
              <Route path="/receitas" element={<Revenues />} />
              <Route path="/despesas-fixas" element={<FixedExpenses />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DashboardLayout>
        }
      />
    </Route>
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;