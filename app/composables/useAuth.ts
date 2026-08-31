import type { Session } from "@supabase/supabase-js";

const session = ref<Session | null>(null);
const initialized = ref(false);

export function useAuth() {
  const supabase = useSupabaseClient();

  async function init() {
    if (initialized.value) return;
    const { data } = await supabase.auth.getSession();
    session.value = data.session;

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession;
    });

    initialized.value = true;
  }

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    session.value = data.session;
    return data;
  }

  async function logout() {
    await supabase.auth.signOut();
    session.value = null;
  }

  const solicitarResetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer-password`,
    });
    if (error) throw error;
  };

  const actualizarPassword = async (nuevaPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: nuevaPassword,
    });
    if (error) throw error;
  };

  return {
    session,
    isAuthenticated: computed(() => !!session.value),
    init,
    login,
    logout,
    solicitarResetPassword,
    actualizarPassword,
  };
}