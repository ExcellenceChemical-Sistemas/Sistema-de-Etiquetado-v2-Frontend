<script setup lang="ts">
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Home,
  Factory,
  Package,
  Boxes,
  Printer,
  History,
  Users,
  FolderKanban,
  Truck,
  Contact,
} from "lucide-vue-next";
import { useUsuarioActual } from "~/composables/useUsuarioActual";
import { usePermiso } from "~/composables/usePermiso";
import { useAccesoKpisIso } from "~/composables/useAccesoKpisIso";

const { session } = useAuth();

const currentUser = computed(() => ({
  name: session.value?.user.email?.split("@")[0] ?? "Usuario",
  email: session.value?.user.email ?? "",
  avatar: "",
}));

const { esAdmin, usuarioActual, cargar: cargarUsuarioActual } = useUsuarioActual();
onMounted(cargarUsuarioActual);

const permisoFabricantes = usePermiso("FABRICANTES");
const permisoProductos = usePermiso("PRODUCTOS");
const permisoLotes = usePermiso("LOTES");
const permisoEtiquetas = usePermiso("ETIQUETAS");
const permisoUsuarios = usePermiso("USUARIOS");
const permisoPedidos = usePermiso("PEDIDOS");

const { puedeVerAlgoKpisIso } = useAccesoKpisIso();

// Gestiona accesos de KPIs/ISO sin ser admin general: entra a /usuarios
// aunque no tenga el permiso USUARIOS (ver middleware/permisos.global.ts).
const esAdminKpis = computed(() => usuarioActual.value?.esAdminKpis === true);

const items = computed(() =>
  [
    { title: "Inicio", url: "/", icon: Home, visible: true },
    {
      title: "Fabricantes",
      url: "/fabricantes",
      icon: Factory,
      visible: permisoFabricantes.puedeVer,
    },
    {
      title: "Productos",
      url: "/productos",
      icon: Package,
      visible: permisoProductos.puedeVer,
    },
    {
      title: "Lotes",
      url: "/lotes",
      icon: Boxes,
      visible: permisoLotes.puedeVer,
    },
    {
      title: "Generar Etiqueta",
      url: "/generar-etiqueta",
      icon: Printer,
      visible: permisoEtiquetas.puedeCrear,
    },

    {
      title: "Historial",
      url: "/historial",
      icon: History,
      visible: permisoEtiquetas.puedeVer,
    },
    {
      title: "KPIs / ISO",
      url: "/kpis",
      icon: FolderKanban,
      visible: puedeVerAlgoKpisIso.value,
    },
    {
      title: "Pedidos",
      url: "/pedidos",
      icon: Truck,
      visible: permisoPedidos.puedeVer,
    },
    {
      title: "Clientes",
      url: "/clientes",
      icon: Contact,
      visible: permisoPedidos.puedeVer,
    },
    {
      title: "Usuarios",
      url: "/usuarios",
      icon: Users,
      visible: permisoUsuarios.puedeVer || esAdminKpis.value,
    },
  ].filter((i) => i.visible),
);

const route = useRoute();
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader class="border-b border-sidebar-border">
      <NuxtLink
        to="/"
        class="flex flex-col items-center gap-3 px-4 py-6 group-data-[collapsible=icon]:hidden"
      >
        <img
          src="/excellence-chemical-logo.png"
          alt="Excellence Chemical"
          class="w-full max-w-[190px] object-contain"
        />
        <span
          class="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
        >
          Sistema de Gestión
        </span>
      </NuxtLink>

      <NuxtLink
        to="/"
        class="hidden group-data-[collapsible=icon]:flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden mx-auto my-2"
      >
        <img
          src="/excellence-chemical-icon.png"
          alt="Excellence Chemical"
          class="size-full object-contain"
        />
      </NuxtLink>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in items" :key="item.url">
              <SidebarMenuButton
                as-child
                :is-active="route.path === item.url"
                :tooltip="item.title"
              >
                <NuxtLink :to="item.url">
                  <component :is="item.icon" />
                  <span>{{ item.title }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter> <NavUser :user="currentUser" /> </SidebarFooter>

    <SidebarRail />
  </Sidebar>
</template>
