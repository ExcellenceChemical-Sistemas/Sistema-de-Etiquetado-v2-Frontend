<template>
  <div class="min-h-screen bg-background">
    <header class="border-b bg-card">
      <div class="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <img src="/excellence-chemical-logo.png" alt="Excellence Chemical" class="h-10" />
        <p class="text-right text-[11px] font-medium uppercase leading-tight tracking-widest text-muted-foreground">
          Trazabilidad<br />de producto
        </p>
      </div>
    </header>
    <main class="mx-auto w-full max-w-lg px-4 py-5">
      <slot />
    </main>
    <footer class="mx-auto max-w-lg px-4 pb-8 text-center text-xs text-muted-foreground">
      Excellence Chemical S.A.C.
    </footer>
  </div>
</template>
