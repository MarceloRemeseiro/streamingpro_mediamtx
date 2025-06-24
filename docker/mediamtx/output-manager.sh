#!/bin/bash

# Script Gestor de Outputs para MediaMTX
# Gestiona procesos FFmpeg individuales para cada output sin afectar otros

set -e

# Configuración
BACKEND_URL="${BACKEND_URL:-http://host.docker.internal:3000}"
STREAM_PATH="$1"
PID_DIR="/tmp/ffmpeg-pids"
LOG_DIR="/tmp/ffmpeg-logs"

# Crear directorios si no existen
mkdir -p "$PID_DIR" "$LOG_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/manager.log"
}

# Función para obtener outputs activos desde el backend
get_active_outputs() {
    local stream_key=$(echo "$STREAM_PATH" | sed 's/live\///')
    curl -s "$BACKEND_URL/streams/outputs/by-stream-key/$stream_key" 2>/dev/null || echo "[]"
}

# Función para iniciar un output específico
start_output() {
    local output_id="$1"
    local output_name="$2"
    local protocol="$3"
    local url="$4"
    local stream_key="$5"
    
    local pid_file="$PID_DIR/output_${output_id}.pid"
    
    # Si ya está corriendo, no hacer nada
    if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        log "Output '$output_name' ya está corriendo (PID: $(cat "$pid_file"))"
        return 0
    fi
    
    # Construir URL completa
    local full_url="$url"
    if [[ -n "$stream_key" ]]; then
        # Para SRT, no agregar stream_key si la URL ya contiene parámetros (streamid)
        if [[ "$protocol" == "SRT" && "$url" == *"?"* ]]; then
            full_url="$url"  # URL SRT ya completa con parámetros
        else
            full_url="$url/$stream_key"  # Para RTMP/RTMPS
        fi
    fi
    
    # Construir comando FFmpeg
    local ffmpeg_cmd="ffmpeg -re -i rtmp://127.0.0.1:1935/$STREAM_PATH -c copy"
    
    case "$protocol" in
        "RTMP")
            ffmpeg_cmd="$ffmpeg_cmd -f flv \"$full_url\""
            ;;
        "RTMPS")
            ffmpeg_cmd="$ffmpeg_cmd -f flv \"$full_url\""
            ;;
        "SRT")
            ffmpeg_cmd="$ffmpeg_cmd -f mpegts \"$full_url\""
            ;;
        *)
            log "ERROR: Protocolo '$protocol' no soportado para output '$output_name'"
            return 1
            ;;
    esac
    
    # Iniciar proceso en background
    log "Iniciando output '$output_name' → $full_url"
    log "🚀 Comando FFmpeg: $ffmpeg_cmd"
    bash -c "$ffmpeg_cmd" > "$LOG_DIR/output_${output_id}.log" 2>&1 &
    local pid=$!
    
    # Verificar que el PID es válido
    if kill -0 "$pid" 2>/dev/null; then
        log "✅ Proceso iniciado correctamente con PID: $pid"
    else
        log "❌ ERROR: No se pudo verificar el proceso con PID: $pid"
        return 1
    fi
    
    # Guardar PID
    echo "$pid" > "$pid_file"
    log "Output '$output_name' iniciado con PID: $pid"
    
    # Debug adicional: verificar que el proceso es realmente FFmpeg
    sleep 1
    local process_info=$(ps aux | grep "$pid" | grep -v grep || echo "NOT_FOUND")
    log "🔍 Información del proceso PID $pid: $process_info"
}

# Función para detener un output específico
stop_output() {
    local output_id="$1"
    local output_name="$2"
    
    local pid_file="$PID_DIR/output_${output_id}.pid"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log "Deteniendo output '$output_name' (PID: $pid)"
            kill -TERM "$pid" 2>/dev/null || true
            sleep 2
            kill -KILL "$pid" 2>/dev/null || true
        fi
        rm -f "$pid_file"
        log "Output '$output_name' detenido"
    fi
}

# Función para matar procesos FFmpeg no gestionados
kill_unmanaged_ffmpeg_processes() {
    # Obtener todos los PIDs de procesos FFmpeg (columna 1 en Alpine Linux)
    local ffmpeg_pids=$(ps aux | grep ffmpeg | grep -v grep | awk '{print $1}')
    
    if [[ -z "$ffmpeg_pids" ]]; then
        return 0
    fi
    
    log "🔍 PIDs de FFmpeg detectados: $ffmpeg_pids"
    
    # Obtener PIDs gestionados por nosotros
    local managed_pids=""
    for pid_file in "$PID_DIR"/output_*.pid; do
        [[ -f "$pid_file" ]] || continue
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            managed_pids="$managed_pids $pid"
            log "📋 PID gestionado encontrado: $pid (desde $(basename "$pid_file"))"
        else
            log "💀 PID inválido encontrado: $pid (desde $(basename "$pid_file")) - limpiando archivo"
            rm -f "$pid_file"
        fi
    done
    
    log "📋 PIDs gestionados: $managed_pids"
    
    # Matar procesos FFmpeg no gestionados
    for pid in $ffmpeg_pids; do
        if ! echo "$managed_pids" | grep -q "$pid"; then
            log "🔪 Matando proceso FFmpeg no gestionado (PID: $pid)"
            kill -TERM "$pid" 2>/dev/null || true
            sleep 1
            kill -KILL "$pid" 2>/dev/null || true
        else
            log "✅ Proceso FFmpeg gestionado (PID: $pid) - manteniéndolo"
        fi
    done
}

# Función para sincronizar outputs
sync_outputs() {
    log "Sincronizando outputs para stream: $STREAM_PATH"
    
    # CRÍTICO: Matar todos los procesos FFmpeg no gestionados
    kill_unmanaged_ffmpeg_processes
    
    # Obtener outputs activos desde el backend
    local outputs_json=$(get_active_outputs)
    
    if [[ "$outputs_json" == "[]" || -z "$outputs_json" ]]; then
        log "No hay outputs activos. Deteniendo todos los procesos."
        # Detener todos los procesos existentes
        for pid_file in "$PID_DIR"/output_*.pid; do
            [[ -f "$pid_file" ]] || continue
            local output_id=$(basename "$pid_file" .pid | sed 's/output_//')
            stop_output "$output_id" "unknown"
        done
        return 0
    fi
    
    # Obtener lista de outputs que deberían estar corriendo
    local should_run_ids=$(echo "$outputs_json" | jq -r '.[] | select(.habilitada == true) | .id')
    
    # Obtener lista de outputs que están corriendo actualmente
    local running_ids=""
    for pid_file in "$PID_DIR"/output_*.pid; do
        [[ -f "$pid_file" ]] || continue
        local output_id=$(basename "$pid_file" .pid | sed 's/output_//')
        if kill -0 "$(cat "$pid_file")" 2>/dev/null; then
            running_ids="$running_ids $output_id"
        else
            # PID inválido, limpiar archivo
            rm -f "$pid_file"
        fi
    done
    
    # Detener outputs que ya no deberían estar corriendo
    for running_id in $running_ids; do
        if ! echo "$should_run_ids" | grep -q "$running_id"; then
            local output_name=$(echo "$outputs_json" | jq -r ".[] | select(.id == \"$running_id\") | .nombre // \"unknown\"")
            stop_output "$running_id" "$output_name"
        fi
    done
    
    # Iniciar outputs que deberían estar corriendo pero no están
    echo "$outputs_json" | jq -c '.[] | select(.habilitada == true)' | while read -r output; do
        local output_id=$(echo "$output" | jq -r '.id')
        local output_name=$(echo "$output" | jq -r '.nombre')
        local protocol=$(echo "$output" | jq -r '.protocolo')
        local url=$(echo "$output" | jq -r '.urlDestino')
        local stream_key=$(echo "$output" | jq -r '.claveStreamRTMP // .streamIdSRT // empty')
        
        # Verificar si ya está corriendo
        local pid_file="$PID_DIR/output_${output_id}.pid"
        if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
            continue # Ya está corriendo
        fi
        
        start_output "$output_id" "$output_name" "$protocol" "$url" "$stream_key"
    done
    
    log "Sincronización completada"
}

# Función principal
main() {
    if [[ -z "$STREAM_PATH" ]]; then
        log "ERROR: Se requiere el path del stream como argumento"
        exit 1
    fi
    
    log "=== Iniciando Output Manager para stream: $STREAM_PATH ==="
    
    # Sincronización inicial
    sync_outputs
    
    # Monitoreo continuo (cada 10 segundos para respuesta más rápida)
    while true; do
        sleep 10
        sync_outputs
    done
}

# Ejecutar función principal
main "$@" 