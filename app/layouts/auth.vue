<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-8 px-4 bg-background">
    <div class="flex flex-col items-center gap-1">
      <img src="/excellence-chemical-logo.png" alt="Excellence Chemical" class="h-14" />
      <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Plataforma de Gestión
      </p>
    </div>
    <slot />
  </div>
</template>