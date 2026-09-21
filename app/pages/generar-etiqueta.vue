<script setup lang="ts">
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { ref } from "vue";
import { toast } from "vue-sonner";
import {
  Printer,
  Package,
  Scale,
  Receipt,
  Copy as CopyIcon,
} from "@lucide/vue";
import { useLotes } from "~/composables/useLotes";
import { usePlantillasActivas } from "~/composables/usePlantillas";
import { useGenerarEtiqueta } from "~/composables/useEtiquetas";
import type { Lote } from "~/types/lote";

import {
  generarEtiquetaSchema,
  type GenerarEtiquetaFormValues,
} from "~/schemas/etiqueta.schema";

const { data: lotes, isLoading: cargandoLotes } = useLotes();
const { data: plantillasActivas, isLoading: cargandoPlantillas } =
  usePlantillasActivas();

const { mutateAsync: generarEtiqueta, isPending: generando } =
  useGenerarEtiqueta();

const { handleSubmit, defineField, errors, resetForm } =
  useForm<GenerarEtiquetaFormValues>({
    validationSchema: toTypedSchema(generarEtiquetaSchema),
    initialValues: {
      proformaModo: "numero",
      proformaNumero: "",
      unidadBruto: "KG",
      unidadNeta: "KG",
      cantidad: 1,
    },
  });

// validateOnModelUpdate: false en los Select — mismo fix que en LoteForm
// (Bug 1): el Select de Reka UI emite update:modelValue al montarse y
// dispara el setter del computed, dejando el campo en rojo apenas se abre
// la vista.
const [plantillaId] = defineField("plantillaId", {
  validateOnModelUpdate: false,
});
const [loteId] = defineField("loteId", { validateOnModelUpdate: false });
const [proformaModo] = defineField("proformaModo", {
  validateOnModelUpdate: false,
});
const [proformaNumero, proformaNumeroAttrs] = defineField("proformaNumero", {
  validateOnModelUpdate: false,
});
const [pesoBruto, pesoBrutoAttrs] = defineField("pesoBruto", {
  validateOnModelUpdate: false,
});
const [unidadBruto, unidadBrutoAttrs] = defineField("unidadBruto", {
  validateOnModelUpdate: false,
});
const [cantidadNeta, cantidadNetaAttrs] = defineField("cantidadNeta", {
  validateOnModelUpdate: false,
});
const [unidadNeta, unidadNetaAttrs] = defineField("unidadNeta", {
  validateOnModelUpdate: false,
});
const [cantidad, cantidadAttrs] = defineField("cantidad", {
  validateOnModelUpdate: false,
});

function loteLabel(lote: Lote) {
  return `${lote.producto?.nombre ?? "Producto ?"} — ${lote.fabricante?.nombre ?? "Fabricante ?"} (Lote ${lote.numeroLote})`;
}

// Progreso de impresión cuando cantidad > 1 (ej. "Imprimiendo 2 de 5…").
const copiaActual = ref(0);
const totalCopias = ref(0);
const confirmOpen = ref(false);

const valoresPendientes = ref<GenerarEtiquetaFormValues | null>(null);

const onSubmit = handleSubmit(async (values) => {
  if (values.cantidad > 1) {
    valoresPendientes.value = values;
    confirmOpen.value = true;
    return;
  }
  await imprimir(values);
});

async function confirmarImpresion() {
  if (!valoresPendientes.value) return;
  confirmOpen.value = false;
  await imprimir(valoresPendientes.value);
  valoresPendientes.value = null;
}

async function imprimir(values: GenerarEtiquetaFormValues) {
  const proforma =
    values.proformaModo === "blanco"
      ? " "
      : values.proformaNumero
        ? `PF01-${values.proformaNumero}`
        : "PF01-";

  const payload = {
    loteId: values.loteId,
    plantillaId: values.plantillaId,
    pesoBruto: values.pesoBruto,
    unidadBruto: values.unidadBruto,
    cantidadNeta: values.cantidadNeta || undefined,
    unidadNeta: values.unidadNeta,
    proforma,
  };

  totalCopias.value = values.cantidad;
  copiaActual.value = 0;

  try {
    for (let i = 0; i < values.cantidad; i++) {
      copiaActual.value = i + 1;
      // Cada copia es un envase distinto ("Envase 2 de 5") y su etiqueta
      // lleva su propio QR con sus propios pesos.
      await generarEtiqueta({
        ...payload,
        envaseNumero: i + 1,
        envaseTotal: values.cantidad,
      });
    }

    toast.success(
      values.cantidad > 1
        ? `${values.cantidad} etiquetas impresas correctamente`
        : "Etiqueta impresa correctamente",
    );
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "No se pudo generar la etiqueta";
    const progreso =
      copiaActual.value > 1
        ? ` (se imprimieron ${copiaActual.value - 1} de ${totalCopias.value})`
        : "";
    toast.error(mensaje + progreso);
  } finally {
    copiaActual.value = 0;
    totalCopias.value = 0;
  }
}

function limpiarFormulario() {
  resetForm({
    values: {
      proformaModo: "numero",
      proformaNumero: "",
      unidadBruto: "KG",
      unidadNeta: "KG",
      cantidad: 1,
    },
  });
}
</script>

<template>
  <div
    class="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-1 py-2 sm:px-2 sm:py-3"
  >
    <div class="flex items-center gap-3">
      <div
        class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
      >
        <Printer class="h-5 w-5" />
      </div>
      <div>
        <h1 class="text-2xl font-semibold leading-tight">Generar etiqueta</h1>
        <p class="text-sm text-muted-foreground">
          Se imprime directo en la Epson al confirmar — sin vista previa.
        </p>
      </div>
    </div>

    <form @submit="onSubmit">
      <Card>
        <CardContent class="space-y-5 pt-5 sm:space-y-6 sm:pt-6">
          <!-- Sección: qué se imprime -->
          <div class="space-y-4">
            <div
              class="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <Package class="h-4 w-4 text-muted-foreground" />
              Lote y plantilla
            </div>

            <div class="space-y-1.5">
              <Label for="loteId">Lote</Label>
              <ComboboxBuscador
                v-model="loteId"
                :items="lotes ?? []"
                :loading="cargandoLotes"
                :get-label="loteLabel"
                placeholder="Buscar por producto, fabricante o número de lote…"
                loading-placeholder="Cargando lotes…"
              />
              <p v-if="errors.loteId" class="text-sm text-destructive">
                {{ errors.loteId }}
              </p>
            </div>

            <div class="space-y-1.5">
              <Label for="plantillaId">Plantilla</Label>
              <Select v-model="plantillaId">
                <SelectTrigger id="plantillaId">
                  <SelectValue placeholder="Selecciona una plantilla" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="plantilla in plantillasActivas ?? []"
                    :key="plantilla.id"
                    :value="plantilla.id"
                  >
                    {{ plantilla.nombre }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="errors.plantillaId" class="text-sm text-destructive">
                {{ errors.plantillaId }}
              </p>
              <p
                v-if="cargandoPlantillas"
                class="text-sm text-muted-foreground"
              >
                Cargando plantillas…
              </p>
              <p
                v-else-if="!plantillasActivas?.length"
                class="text-sm text-destructive"
              >
                No hay plantillas activas configuradas.
              </p>
            </div>
          </div>

          <Separator />

          <!-- Sección: pesos -->
          <div class="space-y-4">
            <div
              class="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <Scale class="h-4 w-4 text-muted-foreground" />
              Pesos
            </div>

            <div
              class="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div class="space-y-1.5">
                <Label for="cantidadNeta">Peso/cant. neta (opcional)</Label>
                <Input
                  id="cantidadNeta"
                  v-model="cantidadNeta"
                  v-bind="cantidadNetaAttrs"
                  placeholder="Ej. 1.000"
                  inputmode="decimal"
                />
                <p v-if="errors.cantidadNeta" class="text-sm text-destructive">
                  {{ errors.cantidadNeta }}
                </p>
              </div>
              <div class="space-y-1.5">
                <Label for="unidadNeta">Unidad</Label>
                <Select v-model="unidadNeta" v-bind="unidadNetaAttrs">
                  <SelectTrigger id="unidadNeta">
                    <SelectValue placeholder="Unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="GR">GR</SelectItem>
                    <SelectItem value="ML">ML</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                  </SelectContent>
                </Select>
                <p v-if="errors.unidadNeta" class="text-sm text-destructive">
                  {{ errors.unidadNeta }}
                </p>
              </div>
            </div>

            <div
              class="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div class="space-y-1.5">
                <Label for="pesoBruto">Peso bruto</Label>
                <Input
                  id="pesoBruto"
                  v-model="pesoBruto"
                  v-bind="pesoBrutoAttrs"
                  placeholder="Ej. 1.140"
                  inputmode="decimal"
                />
                <p v-if="errors.pesoBruto" class="text-sm text-destructive">
                  {{ errors.pesoBruto }}
                </p>
              </div>
              <div class="space-y-1.5">
                <Label for="unidadBruto">Unidad</Label>
                <Select v-model="unidadBruto" v-bind="unidadBrutoAttrs">
                  <SelectTrigger id="unidadBruto">
                    <SelectValue placeholder="Unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="GR">GR</SelectItem>
                  </SelectContent>
                </Select>
                <p v-if="errors.unidadBruto" class="text-sm text-destructive">
                  {{ errors.unidadBruto }}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <!-- Sección: proforma y copias -->
          <div class="space-y-4">
            <div
              class="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <Receipt class="h-4 w-4 text-muted-foreground" />
              Proforma y copias
            </div>

            <div class="space-y-1.5">
              <Label for="proformaModo">Proforma</Label>
              <Select v-model="proformaModo">
                <SelectTrigger id="proformaModo">
                  <SelectValue placeholder="Tipo de proforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="numero">Con número</SelectItem>
                  <SelectItem value="blanco">En blanco (muestra)</SelectItem>
                </SelectContent>
              </Select>
              <p v-if="errors.proformaModo" class="text-sm text-destructive">
                {{ errors.proformaModo }}
              </p>

              <div
                v-if="proformaModo === 'numero'"
                class="flex items-center gap-2 pt-1"
              >
                <span
                  class="rounded-md border bg-muted px-2.5 py-2 text-sm text-muted-foreground"
                >
                  PF01-
                </span>
                <Input
                  id="proformaNumero"
                  v-model="proformaNumero"
                  v-bind="proformaNumeroAttrs"
                  placeholder="Número de proforma"
                  class="flex-1"
                />
              </div>
              <p v-if="errors.proformaNumero" class="text-sm text-destructive">
                {{ errors.proformaNumero }}
              </p>
            </div>

            <div class="space-y-1.5">
              <Label for="cantidad" class="flex items-center gap-1.5">
                <CopyIcon class="h-3.5 w-3.5 text-muted-foreground" />
                Cantidad de envases (una etiqueta por envase)
              </Label>
              <Input
                id="cantidad"
                v-model.number="cantidad"
                v-bind="cantidadAttrs"
                type="number"
                min="1"
                max="50"
                class="w-24"
              />
              <p v-if="errors.cantidad" class="text-sm text-destructive">
                {{ errors.cantidad }}
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter class="flex-col items-stretch gap-4 border-t pt-6">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="submit"
              size="lg"
              class="flex-1"
              :disabled="
                generando || cargandoLotes || !plantillasActivas?.length
              "
            >
              <Printer class="mr-2 h-4 w-4" />
              {{
                generando
                  ? totalCopias > 1
                    ? `Imprimiendo ${copiaActual} de ${totalCopias}…`
                    : "Generando e imprimiendo…"
                  : "Generar e imprimir"
              }}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              :disabled="generando"
              @click="limpiarFormulario"
            >
              Limpiar
            </Button>
          </div>
          <p v-if="generando" class="text-xs text-muted-foreground">
            Esto puede tardar unos segundos, la impresión ocurre antes de
            confirmar.
          </p>
        </CardFooter>
      </Card>
    </form>
    <Dialog v-model:open="confirmOpen">
      <DialogContent>
        <DialogTitle>
          ¿Imprimir {{ valoresPendientes?.cantidad }} copias?
        </DialogTitle>
        <p class="text-sm text-muted-foreground">
          Se van a imprimir {{ valoresPendientes?.cantidad }} etiquetas físicas
          en la Epson, una por una. Esta acción no se puede deshacer.
        </p>
        <div class="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            @click="
              valoresPendientes = null;
              confirmOpen = false;
            "
          >
            Cancelar
          </Button>
          <Button @click="confirmarImpresion">Imprimir</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
