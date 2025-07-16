# Asistente Organizacional - Bot de WhatsApp

Un bot inteligente de WhatsApp que actúa como asistente organizacional personal, ayudando con tareas, recordatorios y gestión de información.

## Características

- Integración con WhatsApp Web
- Asistente inteligente con GPT
- Base de datos local con LowDB
- Gestión de usuarios y recordatorios
- Historial de interacciones

## Estructura del Proyecto

```
├── /src
│   ├── index.js                           # Archivo principal que lanza el bot
│   ├── ClienteWhatsApp.js                 # Configuración y conexión de WhatsApp
│   ├── ConfiguracionVariables.js          # Carga y gestión de variables .env
│   ├── handlers/                 
│   │   ├── ManejadorMensajes.js           # Lógica para manejar mensajes entrantes
│   │   └── ConstructorPrompts.js          # Construcción dinámica del prompt para GPT
│   ├── db/                       
│   │   ├── ConfiguracionBaseDatos.js      # Configuración de LowDB
│   │   ├── PerfilAsistente.json           # Perfil y personalidad del asistente
│   │   ├── BaseDatosUsuarios.json         # Base de datos de usuarios
│   │   ├── ConfiguracionBaseDatos.js      # Configuración de LowDB
│   │   ├── informacion_institucional/     # Carpeta con información institucional
│   │   │   ├── PerfilAsistente.json       # Perfil y personalidad del asistente ISIUX
│   │   │   ├── InformacionFacultad.json   # Información de la FIEI-UNFV
│   │   │   └── InformacionCarrera.json    # Información de Ingeniería Informática
│   │   ├── usuarios_sistema/              # Carpeta con datos de usuarios
│   │   │   ├── BaseDatosUsuarios.json     # Base de datos de usuarios (estudiantes + docente)
│   │   │   ├── HistorialInteracciones.json # Historial de mensajes por usuario
│   │   │   └── BaseDatosRecordatorios.json # Recordatorios personales del usuario
│   │   ├── datos_operativos/              # Carpeta con datos operativos del sistema
│   │   │   ├── HorariosCursos.json        # Horarios de cursos con estructura escalable
│   │   │   └── BaseConocimiento.json      # Contenidos entrenados del curso
│   │   ├── syllabus/                      # Carpeta con información del sílabo
│   │   │   ├── SyllabusGeneral.json       # Información general del sílabo
│   │   │   ├── SyllabusUnidades.json      # Contenido detallado de unidades
│   │   │   └── SyllabusEvaluacion.json    # Sistema de evaluación y metodología
│   │   └── malla_curricular/              # Carpeta con información de malla curricular
│   │       ├── InformacionGeneral.json    # Información general de la malla
│   │       ├── CursosPorSemestre.json     # Cursos organizados por semestre
│   │       ├── CursosElectivos.json       # Cursos electivos y sus grupos
│   │       └── RelacionesRequisitos.json  # Prerrequisitos y relaciones entre cursos
│   │   └── materiales_curso/              # Carpeta con materiales del curso por semanas
│   │       ├── estructura_materiales.json # Definición de estructura de materiales
│   │       ├── configuracion_procesamiento.json # Configuración para procesamiento
│   │       ├── indice_materiales.json     # Índice general para búsquedas rápidas
│   │       ├── semana_01/                 # Materiales de la Semana 1
│   │       │   └── materiales_semana_01.json
│   │       └── semana_XX/                 # Materiales de otras semanas
│   │           └── materiales_semana_XX.json
│   └── utils/
│       └── FuncionesAuxiliares.js         # Funciones auxiliares y utilidades
│
├── .env                                   # Variables de entorno (API keys, etc.)
├── .gitignore
├── package.json
└── README.md
```

## Instalación

1. Clona el repositorio
2. Instala las dependencias: `npm install`
3. Configura las variables de entorno en `.env`
4. Ejecuta el bot: `npm start`

## Configuración

Crea un archivo `.env` con las siguientes variables:

```
OPENAI_API_KEY=tu_clave_de_openai
NOMBRE_ASISTENTE=nombre_del_asistente
```

## Uso

El bot se conectará a WhatsApp Web y responderá automáticamente a los mensajes entrantes.

## Licencia

MIT 