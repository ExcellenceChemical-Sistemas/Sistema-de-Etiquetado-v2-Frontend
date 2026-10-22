export interface Lote {
  id: number;
  numeroLote: string;
  fechaFabricacion: string;
  fechaVencimiento: string;
  fechaVencimientoOrden: string | null;
  productoId: number;
  fabricanteId: number;
  producto?: { id: number; nombre: string; codigo?: string | null };
  fabricante?: { id: number; nombre: string };
  coaUrl?: string | null;
  detalle?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoteDto {
  numeroLote: string;
  fechaFabricacion: string;
  fechaVencimientoOrden?: string | null;
  detalle?: string;
  productoId: number;
  fabricanteId: number;
}

export type UpdateLoteDto = CreateLoteDto;