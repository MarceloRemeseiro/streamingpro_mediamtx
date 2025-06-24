# 🧪 Guía de Pruebas de Estabilidad StreamingPro

Esta guía te ayudará a realizar pruebas empíricas completas para validar la estabilidad de inputs y outputs en condiciones reales de producción.

## 📋 Índice

1. [Configuración Inicial](#configuración-inicial)
2. [Pruebas de Estabilidad Local](#pruebas-de-estabilidad-local)
3. [Pruebas de Red Distribuida](#pruebas-de-red-distribuida)
4. [Análisis de Resultados](#análisis-de-resultados)
5. [Escenarios de Prueba](#escenarios-de-prueba)
6. [Interpretación de Métricas](#interpretación-de-métricas)

## 🚀 Configuración Inicial

### Prerrequisitos

```bash
# Instalar herramientas necesarias
sudo apt update
sudo apt install -y ffmpeg curl jq netcat-openbsd bc python3

# Dar permisos de ejecución a los scripts
chmod +x scripts/test-stability.sh
chmod +x scripts/test-network-distributed.sh
chmod +x scripts/analyze-performance.py
```

### Configuración de Entorno de Pruebas

```bash
# 1. Levantar entorno de testing
docker-compose -f docker-compose.testing.yml up -d

# 2. Verificar que todos los servicios estén funcionando
docker-compose -f docker-compose.testing.yml ps

# 3. Esperar a que MediaMTX esté completamente inicializado
sleep 30
```

## 🔧 Pruebas de Estabilidad Local

### Prueba Básica de Estabilidad (5 minutos)

```bash
# Ejecutar prueba básica
./scripts/test-stability.sh basic

# Ver logs en tiempo real
tail -f logs/stability-tests/test-$(date +%Y%m%d).log
```

### Prueba de Carga de Outputs

```bash
# Probar con 5 outputs simultáneos
./scripts/test-stability.sh load 5

# Probar con 10 outputs (más exigente)
./scripts/test-stability.sh load 10
```

### Prueba de Latencia

```bash
# Medir latencia de API
./scripts/test-stability.sh latency
```

### Prueba de Reconexión

```bash
# Simular desconexiones y recuperación
./scripts/test-stability.sh reconnection
```

### Suite Completa de Pruebas

```bash
# Ejecutar todas las pruebas (duración: ~20 minutos)
TEST_DURATION=600 ./scripts/test-stability.sh all
```

## 🌐 Pruebas de Red Distribuida

### Configuración para Pruebas Remotas

```bash
# Configurar IP del servidor MediaMTX
export MEDIAMTX_HOST=192.168.1.100  # Cambiar por tu IP

# Verificar conectividad
ping -c 4 $MEDIAMTX_HOST
```

### Prueba de Conectividad Completa

```bash
# Verificar todos los puertos y servicios
./scripts/test-network-distributed.sh connectivity
```

### Prueba de Streaming Remoto

```bash
# Stream de 60 segundos desde cliente remoto
./scripts/test-network-distributed.sh streaming test-remote-key 60
```

### Prueba de Conexiones Concurrentes

```bash
# 5 conexiones simultáneas por 30 segundos
./scripts/test-network-distributed.sh concurrent 5 30
```

### Prueba de Ancho de Banda

```bash
# Medir ancho de banda por 15 segundos
./scripts/test-network-distributed.sh bandwidth 15
```

## 📊 Análisis de Resultados

### Generar Reporte Automático

```bash
# Generar reporte completo
python3 scripts/analyze-performance.py

# Guardar reporte en archivo
python3 scripts/analyze-performance.py --output reports/performance-$(date +%Y%m%d).txt
```

### Análisis Manual de Logs

```bash
# Ver métricas en tiempo real
ls -la logs/stability-tests/metrics-*.json

# Analizar archivo específico
python3 scripts/analyze-performance.py --metrics-file logs/stability-tests/metrics-20241224-143022.json
```

## 🎯 Escenarios de Prueba Específicos

### Escenario 1: Validación Pre-Producción

```bash
# 1. Prueba de estabilidad extendida (30 minutos)
TEST_DURATION=1800 ./scripts/test-stability.sh basic

# 2. Prueba de carga realista (10 outputs)
./scripts/test-stability.sh load 10

# 3. Prueba de reconexión múltiple
for i in {1..3}; do
    echo "Prueba de reconexión $i/3"
    ./scripts/test-stability.sh reconnection
    sleep 60
done

# 4. Generar reporte final
python3 scripts/analyze-performance.py --output reports/pre-production-$(date +%Y%m%d).txt
```

### Escenario 2: Prueba de Estrés de Red

```bash
# Configurar para servidor remoto
export MEDIAMTX_HOST=your-server-ip

# 1. Prueba de conectividad
./scripts/test-network-distributed.sh connectivity

# 2. Streaming prolongado
./scripts/test-network-distributed.sh streaming stress-test 300

# 3. Múltiples conexiones concurrentes
./scripts/test-network-distributed.sh concurrent 8 120

# 4. Análisis de resultados
python3 scripts/analyze-performance.py
```

### Escenario 3: Validación de Failover (Preparación)

```bash
# 1. Establecer stream estable
./scripts/test-network-distributed.sh streaming main-stream 600 &
MAIN_PID=$!

# 2. Simular fallo después de 120 segundos
sleep 120
docker restart streamingpro_mediamtx_test

# 3. Verificar recuperación
sleep 30
./scripts/test-stability.sh basic

# 4. Terminar stream principal
kill $MAIN_PID
```

## 📈 Interpretación de Métricas

### Métricas de Estabilidad

| Métrica | Excelente | Bueno | Regular | Crítico |
|---------|-----------|-------|---------|---------|
| **Stability Score** | ≥95% | 85-94% | 70-84% | <70% |
| **Interrupciones** | 0 | 1-2 | 3-5 | >5 |
| **Bytes Promedio** | Consistente | Variación <10% | Variación <25% | Muy variable |

### Métricas de Red

| Métrica | Excelente | Bueno | Regular | Crítico |
|---------|-----------|-------|---------|---------|
| **Latencia API** | <50ms | 50-100ms | 100-200ms | >200ms |
| **Conectividad** | 100% | 95-99% | 90-94% | <90% |
| **Streaming Success** | 100% | 95-99% | 85-94% | <85% |

### Indicadores de Calidad

#### 🟢 Sistema Listo para Producción
- Stability Score: ≥95%
- Latencia: <50ms
- Sin interrupciones en 30 minutos
- Recuperación automática <30s

#### 🟡 Requiere Monitoreo
- Stability Score: 85-94%
- Latencia: 50-100ms
- 1-2 interrupciones menores
- Recuperación <60s

#### 🔴 Requiere Optimización
- Stability Score: <85%
- Latencia: >100ms
- Múltiples interrupciones
- Recuperación >60s

## 🛠️ Solución de Problemas Comunes

### Problema: Alta Latencia

```bash
# Verificar configuración de red
ping -c 10 $MEDIAMTX_HOST

# Verificar carga del servidor
curl -s http://$MEDIAMTX_HOST:9997/v3/config/global/get | jq '.logLevel'

# Optimizar configuración MediaMTX
# Reducir MTX_HLSSEGMENTDURATION a 1s
# Aumentar MTX_READBUFFERCOUNT
```

### Problema: Interrupciones Frecuentes

```bash
# Verificar recursos del sistema
docker stats streamingpro_mediamtx_test

# Revisar logs de MediaMTX
docker logs streamingpro_mediamtx_test --tail 100

# Verificar configuración de FFmpeg
grep -r "preset" docker/mediamtx/output-manager.sh
```

### Problema: Fallo de Conexiones Concurrentes

```bash
# Verificar límites del sistema
ulimit -n

# Aumentar límites si es necesario
ulimit -n 4096

# Verificar configuración de MediaMTX
curl -s http://$MEDIAMTX_HOST:9997/v3/config/global/get | jq '.readTimeout'
```

## 📝 Automatización de Pruebas

### Script de Pruebas Nocturnas

```bash
#!/bin/bash
# scripts/nightly-tests.sh

echo "🌙 Iniciando pruebas nocturnas $(date)"

# Prueba de estabilidad de 8 horas
TEST_DURATION=28800 ./scripts/test-stability.sh basic

# Generar reporte
python3 scripts/analyze-performance.py --output reports/nightly-$(date +%Y%m%d).txt

# Enviar notificación (opcional)
# curl -X POST "https://hooks.slack.com/..." -d "payload={\"text\":\"Pruebas nocturnas completadas\"}"
```

### Configurar Cron para Pruebas Automáticas

```bash
# Editar crontab
crontab -e

# Agregar línea para pruebas diarias a las 2 AM
0 2 * * * /path/to/streamingpro-restreamer/scripts/nightly-tests.sh
```

## 🎯 Objetivos de Rendimiento

### Para Entorno de Desarrollo
- Stability Score: ≥85%
- Latencia: <100ms
- Recuperación: <60s

### Para Entorno de Producción
- Stability Score: ≥95%
- Latencia: <50ms
- Recuperación: <30s
- Uptime: 99.9%

## 📞 Soporte y Recursos

- **Logs**: `logs/stability-tests/` y `logs/network-tests/`
- **Reportes**: `reports/`
- **Configuración**: `docker-compose.testing.yml`
- **Scripts**: `scripts/test-*.sh`

---

**Nota**: Estas pruebas están diseñadas para validar la estabilidad del sistema antes de implementar funcionalidades de failover. Una vez confirmada la estabilidad base, se puede proceder con la implementación de redundancia main+backup. 