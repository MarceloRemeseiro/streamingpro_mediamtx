# Frontend - StreamingPro Restreamer

Frontend desarrollado con Next.js 15, React 19, Tailwind CSS y shadcn/ui para la plataforma de distribución de streaming SRT/RTMP.

## Características

- ✨ **Interfaz Moderna**: Diseño limpio y profesional con shadcn/ui
- 🌙 **Modo Oscuro/Claro**: Sistema de temas completo con colores azules y grises
- 📱 **Responsive**: Adaptable a diferentes tamaños de pantalla
- 🎯 **Dashboard Intuitivo**: Grid de cards colapsables para gestión de streams
- 🔄 **Tiempo Real**: Integración con API REST del backend

## Estructura de la Interfaz

### Página Principal
- **Header**: Título, botón "Nueva Entrada" y toggle de tema
- **Grid de Cards**: Cada entrada de streaming se muestra como una card independiente
- **Estado Vacío**: Interfaz amigable cuando no hay entradas configuradas

### Card de Entrada de Stream
Cada card contiene componentes colapsables:

1. **Cabecera**:
   - Nombre de la entrada
   - LED de estado (verde = activo, gris = inactivo)  
   - Badge del protocolo (RTMP/SRT)
   - Botón eliminar

2. **Componente Video** (colapsable):
   - Reproductor HLS para previsualización
   - URL del stream HLS generado

3. **Componente Datos de Conexión** (colapsable):
   - URL de conexión con botón copiar
   - Datos específicos por protocolo:
     - **RTMP**: Clave de emisión
     - **SRT**: Puerto, Stream ID, Passphrase, Latencia

4. **Outputs por Defecto** (colapsable):
   - SRT Pull, RTMP Pull, HLS
   - Switch para habilitar/deshabilitar cada output

5. **Outputs Personalizados** (colapsable):
   - Outputs push personalizados
   - Switch individual y botón eliminar
   - Botón "Agregar Output" para crear nuevos

## Tecnologías Utilizadas

- **Next.js 15**: Framework React con App Router
- **React 19**: Biblioteca de interfaz de usuario
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Framework de estilos
- **shadcn/ui**: Componentes de interfaz
- **next-themes**: Gestión de temas
- **Lucide React**: Iconos
- **Axios**: Cliente HTTP para API

## Configuración

### Variables de Entorno

Crear archivo `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build

# Ejecutar en producción
npm start
```

## Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo en puerto 3001

# Producción
npm run build        # Construir aplicación
npm run start        # Servidor de producción

# Calidad de código
npm run lint         # Verificar código con ESLint
```

## Integración con Backend

El frontend se comunica con el backend NestJS a través de:

- **API Service** (`src/lib/api.ts`): Cliente HTTP con Axios
- **Tipos TypeScript** (`src/types/streaming.ts`): Interfaces compartidas
- **Gestión de Estado**: React hooks para estado local

### Endpoints Utilizados

- `GET /streams/entradas` - Obtener todas las entradas
- `POST /streams/entradas` - Crear nueva entrada
- `PUT /streams/entradas/:id` - Actualizar entrada
- `DELETE /streams/entradas/:id` - Eliminar entrada
- `PUT /streams/salidas/:id` - Actualizar estado de salida

## Estructura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── layout.tsx         # Layout principal con ThemeProvider
│   └── page.tsx           # Página principal del dashboard
├── components/            # Componentes React
│   ├── ui/               # Componentes base de shadcn/ui
│   ├── theme-provider.tsx # Proveedor de temas
│   ├── theme-toggle.tsx   # Toggle de tema claro/oscuro
│   └── stream-input-card.tsx # Card de entrada de stream
├── lib/                   # Utilidades
│   ├── api.ts            # Cliente API
│   └── utils.ts          # Utilidades de Tailwind
└── types/                 # Definiciones TypeScript
    └── streaming.ts       # Tipos de datos de streaming
```

## Características del Diseño

### Sistema de Temas
- **Tema Claro**: Fondo blanco, texto oscuro, acentos azules
- **Tema Oscuro**: Fondo gris oscuro, texto claro, acentos azules brillantes
- **Modo Sistema**: Detecta automáticamente la preferencia del usuario

### Componentes Colapsables
- Todos los componentes de la card se pueden expandir/contraer
- Estado persistente durante la sesión
- Optimización de recursos (video oculto cuando está colapsado)

### Responsive Design
- **Móvil**: 1 columna
- **Tablet**: 2 columnas  
- **Desktop**: 3-4 columnas según el tamaño de pantalla

## Próximas Funcionalidades

- [ ] Modales para crear/editar entradas y salidas
- [ ] Notificaciones toast para acciones
- [ ] Reproductor de video HLS funcional
- [ ] Métricas en tiempo real
- [ ] Filtros y búsqueda de entradas
- [ ] Drag & drop para reordenar cards
