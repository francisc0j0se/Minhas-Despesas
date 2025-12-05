import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Logo } from '@/components/Logo';

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center">
          <Logo className="h-16 w-16 mb-4" />
          <h2 className="text-3xl font-bold text-center text-gray-800">Minhas Despesas</h2>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          showLinks={false}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Endereço de e-mail',
                password_label: 'Sua senha',
                email_input_placeholder: 'Seu endereço de e-mail',
                password_input_placeholder: 'Sua senha',
                button_label: 'Entrar',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default Login;