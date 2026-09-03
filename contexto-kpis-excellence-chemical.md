# Contexto del proyecto — Sistema de KPIs (Excellence Chemical S.A.C.)

## 1. Objetivo

Reemplazar la organización manual de indicadores (KPIs) en Google Drive por una aplicación web propia, que replique la estructura de carpetas actual (Proceso → Periodo → Tipo de documento) pero con control de permisos real y granular, y sin necesidad de recrear la estructura cada año.

## 2. Contexto de negocio

- Empresa: **Excellence Chemical S.A.C.**
- Documento/código de referencia del formato actual: **QA-FMT-06**
- Estructura actual en Drive (carpeta "10. KPIs-SGC-2026"): proceso → mes → tipo de documento
- Procesos existentes: Comercial, Compras, Almacén y Distribución, Control de Calidad (responsable: Willy), Gestión de Calidad (SGC), Dirección y Planeamiento Estratégico, RR.HH, Servicios Generales
- Cada proceso tiene su propia periodicidad: mensual, trimestral o semestral
- Cada periodo genera exactamente 2 documentos: Reporte de Indicador (RI, en Word) y Data de Sustento (DS, en Excel)
- La misma estructura de procesos se repite cada año; solo cambian los periodos (año + mes/trimestre/semestre)

## 3. Stack tecnológico

### Backend — NestJS
- Framework principal de la API REST
- Maneja: autenticación (validación de tokens de Supabase Auth), autorización (Guards de permisos granulares), lógica de negocio (generación de periodos, validación de subida de documentos), y el acceso controlado a los archivos (nunca entrega URLs directas sin validar permiso primero)
- Reutiliza el mismo patrón de permisos granulares (por usuario y por recurso) ya implementado y probado en el proyecto de etiquetado de la empresa

### Frontend — Nuxt
- Interfaz para navegar Proceso → Periodo → RI/DS (reemplaza la navegación de carpetas de Drive)
- Formularios de subida de documentos (Word para RI, Excel para DS)
- Visor embebido de PDF con restricciones (pdf.js, nunca `iframe` con URL directa)
- Panel de administración de permisos por usuario y documento/proceso
- El rol/permiso mostrado en el frontend es solo para UX (ocultar botones); la validación real siempre ocurre en el backend

### Supabase
- **Base de datos** (PostgreSQL): tablas `procesos`, `periodos`, `documentos_kpi`, `permisos_kpi` (reutilizando la tabla de usuarios existente si el sistema comparte login con el proyecto de etiquetado)
- **Storage**: bucket privado para los archivos (Word, Excel, PDF), con nombres de archivo tipo UUID (no predecibles), acceso mediante signed URLs temporales o streaming controlado por el backend
- **Auth**: login vía email+password; a definir si comparte la misma base de usuarios que el sistema de etiquetado o es independiente

## 4. Modelo de datos (borrador)

```sql
create table procesos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  periodicidad text not null check (periodicidad in ('mensual','trimestral','semestral')),
  responsable_id uuid references usuarios(id)
);

create table periodos (
  id uuid primary key default gen_random_uuid(),
  proceso_id uuid references procesos(id),
  anio int not null,
  numero int not null,
  unique(proceso_id, anio, numero)
);

create table documentos_kpi (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid references periodos(id),
  tipo text not null check (tipo in ('RI','DS')),
  formato text not null check (formato in ('word','excel','pdf')),
  storage_path text not null,
  nombre_original text not null,
  subido_por uuid references usuarios(id),
  created_at timestamp default now()
);

create table permisos_kpi (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id),
  documento_id uuid references documentos_kpi(id),
  puede_ver boolean default false,
  puede_editar boolean default false,
  puede_descargar boolean default false,
  puede_imprimir boolean default false,
  puede_eliminar boolean default false
);
```

## 5. Reglas de negocio de permisos ya definidas

| Tipo de documento | Regla |
|---|---|
| Carpeta de indicadores en general | Solo el usuario principal tiene acceso completo (no se comparte por ahora) |
| Word (RI) | Ver: usuario principal, Edin, Kathy — Editar: solo el usuario principal (por ahora) |
| PDF | Solo ver — sin descargar, imprimir, eliminar ni modificar |

## 6. Repetición anual (clave del diseño)

Los **procesos** se crean una sola vez y no cambian año a año. Lo único que se genera cada año son nuevas filas en la tabla `periodos` (mismo proceso, `anio` distinto) — no se recrea ninguna estructura ni se reconfiguran permisos, porque estos viven a nivel de usuario/proceso o usuario/tipo de documento, no a nivel de carpeta física.

## 7. Preguntas pendientes de definir antes de codear

1. ¿Comparte la misma base de usuarios/login que el proyecto de etiquetado, o es una app independiente?
2. ¿Los periodos se generan automáticamente al iniciar el año, o mediante un botón manual ("Generar periodos 2027")?
3. ¿Un documento puede reemplazarse/actualizarse, o cada subida es definitiva?
4. ¿Se necesitan notificaciones/recordatorios de reportes próximos a vencer?
5. ¿El PDF se sube manualmente aparte del Word, o se genera automáticamente a partir de él?
