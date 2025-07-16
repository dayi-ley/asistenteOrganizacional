# Materiales del Curso ISIUX

Esta carpeta contiene todos los materiales del curso organizados por semanas y tipos de contenido para que el asistente ISIUX pueda responder de manera clara y rápida.

## Estructura de Carpetas

```
materiales_curso/
├── estructura_materiales.json          # Definición de la estructura de datos
├── configuracion_procesamiento.json    # Configuración para procesamiento automático
├── indice_materiales.json              # Índice general para búsquedas rápidas
├── semana_01/                          # Materiales de la Semana 1
│   └── materiales_semana_01.json
├── semana_02/                          # Materiales de la Semana 2
│   └── materiales_semana_02.json
└── ...
```

## Tipos de Materiales Soportados

### 1. Presentaciones (PPT/PPTX → Texto)
- **Estructura**: Diapositivas individuales con título, contenido y puntos clave
- **Uso**: Para presentaciones convertidas a texto plano
- **Ejemplo**: `presentaciones` en `materiales_semana_01.json`

### 2. Documentos (PDF/DOC/DOCX → Texto)
- **Estructura**: Secciones con título, contenido y puntos clave
- **Uso**: Para documentos de lectura y referencia
- **Ejemplo**: `documentos` en `materiales_semana_01.json`

### 3. Ejercicios y Prácticas
- **Estructura**: Objetivos, instrucciones y ejercicios individuales
- **Uso**: Para tareas, ejercicios y evaluaciones
- **Ejemplo**: `ejercicios` en `materiales_semana_01.json`

### 4. Recursos Adicionales
- **Estructura**: Enlaces, videos, artículos complementarios
- **Uso**: Para recursos externos y materiales de apoyo
- **Ejemplo**: `recursos_adicionales` en `materiales_semana_01.json`

## Metadatos Requeridos

Cada material debe incluir:
- `id`: Identificador único
- `titulo`: Título descriptivo
- `descripcion`: Descripción breve del contenido
- `palabras_clave`: Array de palabras para búsquedas
- `fecha_publicacion`: Fecha de publicación
- `profesor_responsable`: Profesor que publicó el material
- `tipo_material`: Tipo de contenido

## Proceso de Conversión

### Para Presentaciones PPT/PPTX:
1. Convertir a texto plano manteniendo estructura de diapositivas
2. Extraer título de cada diapositiva
3. Identificar puntos clave automáticamente
4. Generar metadatos descriptivos

### Para Documentos PDF/DOC:
1. Extraer texto manteniendo estructura de secciones
2. Identificar títulos y subtítulos
3. Generar resumen automático
4. Extraer palabras clave relevantes

## Ventajas de esta Estructura

### Para el Asistente ISIUX:
- **Búsquedas Rápidas**: Índice por palabras clave y semanas
- **Respuestas Contextuales**: Información estructurada por tipo
- **Navegación Intuitiva**: Organización por semanas y temas
- **Actualización Automática**: Proceso estandarizado

### Para los Estudiantes:
- **Acceso Organizado**: Materiales por semana y tipo
- **Información Clara**: Metadatos descriptivos
- **Búsqueda Eficiente**: Palabras clave indexadas
- **Contenido Relacionado**: Sugerencias automáticas

## Ejemplos de Consultas que Puede Responder

- "¿Qué materiales hay para la semana 1?"
- "Muéstrame las presentaciones sobre análisis de sistemas"
- "¿Cuáles son los ejercicios de esta semana?"
- "Busca materiales sobre metodologías de desarrollo"
- "¿Qué recursos adicionales recomiendas para el tema X?"

## Mantenimiento

1. **Agregar Nueva Semana**: Crear carpeta `semana_XX/` con archivo JSON
2. **Actualizar Índice**: Modificar `indice_materiales.json`
3. **Validar Estructura**: Verificar formato según `estructura_materiales.json`
4. **Procesar Materiales**: Seguir configuración en `configuracion_procesamiento.json`

## Integración con el Asistente

El asistente ISIUX utiliza esta estructura para:
- Responder consultas sobre materiales específicos
- Sugerir recursos relacionados
- Proporcionar información contextual
- Facilitar la navegación por el contenido del curso 