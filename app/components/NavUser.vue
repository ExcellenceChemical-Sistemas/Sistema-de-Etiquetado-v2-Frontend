<script setup lang="ts">
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { ChevronsUpDown, UserCircle, Settings, LogOut, Sun, Moon } from 'lucide-vue-next'

const props = defineProps<{
  user: {
    name: string
    email: string
    avatar?: string
  }
}>()

const { isMobile } = useSidebar()
const mode = useColorMode()

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function onCuenta() {
  navigateTo('/mi-cuenta')
}
// Placeholder: cuando exista config real, esto llama al composable correspondiente.
function onConfiguracion() {}
async function onCerrarSesion() {
  const { logout } = useAuth()
  await logout()
  await navigateTo('/login')
}
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar class="size-8 rounded-lg">
              <AvatarImage v-if="user.avatar" :src="user.avatar" :alt="user.name" />
              <AvatarFallback class="rounded-lg">
                {{ initials(user.name) }}
              </AvatarFallback>
            </Avatar>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-semibold">{{ user.name }}</span>
              <span class="truncate text-xs text-muted-foreground">
                {{ user.email }}
              </span>
            </div>
            <ChevronsUpDown class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-(--reka-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          :side="isMobile ? 'bottom' : 'right'"
          align="end"
          :side-offset="4"
        >
          <DropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar class="size-8 rounded-lg">
                <AvatarImage v-if="user.avatar" :src="user.avatar" :alt="user.name" />
                <AvatarFallback class="rounded-lg">
                  {{ initials(user.name) }}
                </AvatarFallback>
              </Avatar>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">{{ user.name }}</span>
                <span class="truncate text-xs text-muted-foreground">
                  {{ user.email }}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem @click="onCuenta">
              <UserCircle />
              Mi cuenta
            </DropdownMenuItem>
            <DropdownMenuItem @click="onConfiguracion">
              <Settings />
              Configuración
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel class="text-xs text-muted-foreground">Tema</DropdownMenuLabel>
          <DropdownMenuRadioGroup v-model="mode">
            <DropdownMenuRadioItem value="light">
              <Sun />
              Claro
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon />
              Oscuro
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="onCerrarSesion">
            <LogOut />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>