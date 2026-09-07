import type { Session } from "@supabase/supabase-js";
import { useUsuarioActual } from "./useUsuarioActual";

const session = ref<Session | null>(null);
const initialized = ref(false);

export function useAuth() {
  const supabase = useSupabaseClient();

  async function init() {
    if (initialized.value) return;
    const { data } = await supabase.auth.getSession();
    session.value = data.session;

    supabase.auth.onAuthStateChange((_event, newSession) => {
      const usuarioAnterior = session.value?.user.id ?? null;
      const usuarioNuevo = newSession?.user.id ?? null;
      session.value = newSession;

      // Red de seguridad para todo lo que no pasa por logout(): expiración de
      // la sesión, signOut desde otra pestaña, o login con otra cuenta. Si
      // cambió el usuario, el usuarioActual cacheado ya no le corresponde y
      // sus permisos no deben seguir gobernando la UI. Un TOKEN_REFRESHED
      // mantiene el mismo id, así que no dispara el reset.
      if (usuarioAnterior !== usuarioNuevo) {
        useUsuarioActual().reset();
      }
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
    // El orden en que dispara onAuthStateChange respecto de esta asignación no
    // está garantizado, así que no dependemos de él para detectar el cambio de
    // usuario: entrar siempre arranca sin usuarioActual cacheado.
    useUsuarioActual().reset();
    return data;
  }

  async function logout() {
    await supabase.auth.signOut();
    session.value = null;
    // Sin esto, usuarioActual (estado a nivel de módulo) sobrevivía al cambio
    // de usuario: como login/logout navegan por SPA y no recargan la página,
    // el siguiente cargar() cortaba por `cargado` y la UI seguía mostrando los
    // botones según los permisos del usuario anterior.
    useUsuarioActual().reset();
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