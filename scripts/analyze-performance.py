#!/usr/bin/env python3

"""
Analizador de Rendimiento para StreamingPro
Analiza logs de pruebas de estabilidad y genera reportes detallados
"""

import json
import os
import sys
import argparse
from datetime import datetime, timedelta
from pathlib import Path
import statistics
from typing import Dict, List, Any, Optional

class PerformanceAnalyzer:
    def __init__(self, logs_dir="./logs"):
        self.logs_dir = Path(logs_dir)
        self.stability_logs = self.logs_dir / "stability-tests"
        self.network_logs = self.logs_dir / "network-tests"
        
    def load_metrics_file(self, filepath: str) -> Optional[List[Dict]]:
        """Carga un archivo de métricas JSON"""
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"❌ Error cargando {filepath}: {e}")
            return None
    
    def analyze_stability_metrics(self, metrics_data: List[Dict]) -> Dict[str, Any]:
        """Analiza métricas de estabilidad"""
        if not metrics_data:
            return {"error": "No hay datos de métricas"}
        
        analysis = {
            "total_samples": len(metrics_data),
            "duration_seconds": 0,
            "paths_analysis": {},
            "interruptions": [],
            "stability_score": 0.0,
            "avg_bytes_received": 0,
            "max_bytes_received": 0,
            "min_bytes_received": float('inf')
        }
        
        # Calcular duración
        if len(metrics_data) >= 2:
            start_time = datetime.fromisoformat(metrics_data[0]["timestamp"].replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(metrics_data[-1]["timestamp"].replace('Z', '+00:00'))
            analysis["duration_seconds"] = (end_time - start_time).total_seconds()
        
        # Analizar paths
        all_bytes = []
        interruption_count = 0
        ready_count = 0
        total_path_samples = 0
        
        for sample in metrics_data:
            paths = sample.get("paths", {}).get("items", [])
            
            for path in paths:
                path_name = path.get("name", "unknown")
                bytes_received = path.get("bytesReceived", 0)
                is_ready = path.get("ready", False)
                
                # Inicializar análisis del path si no existe
                if path_name not in analysis["paths_analysis"]:
                    analysis["paths_analysis"][path_name] = {
                        "samples": 0,
                        "ready_samples": 0,
                        "bytes_history": [],
                        "avg_bytes": 0,
                        "max_bytes": 0,
                        "stability_percentage": 0.0
                    }
                
                path_analysis = analysis["paths_analysis"][path_name]
                path_analysis["samples"] += 1
                path_analysis["bytes_history"].append(bytes_received)
                path_analysis["max_bytes"] = max(path_analysis["max_bytes"], bytes_received)
                
                if is_ready:
                    path_analysis["ready_samples"] += 1
                    ready_count += 1
                else:
                    interruption_count += 1
                    analysis["interruptions"].append({
                        "timestamp": sample["timestamp"],
                        "path": path_name
                    })
                
                all_bytes.append(bytes_received)
                total_path_samples += 1
        
        # Calcular estadísticas finales
        if all_bytes:
            analysis["avg_bytes_received"] = statistics.mean(all_bytes)
            analysis["max_bytes_received"] = max(all_bytes)
            analysis["min_bytes_received"] = min(all_bytes) if all_bytes else 0
        
        # Calcular score de estabilidad
        if total_path_samples > 0:
            analysis["stability_score"] = (ready_count / total_path_samples) * 100
        
        # Calcular estadísticas por path
        for path_name, path_analysis in analysis["paths_analysis"].items():
            if path_analysis["bytes_history"]:
                path_analysis["avg_bytes"] = statistics.mean(path_analysis["bytes_history"])
            
            if path_analysis["samples"] > 0:
                path_analysis["stability_percentage"] = (
                    path_analysis["ready_samples"] / path_analysis["samples"]
                ) * 100
        
        return analysis
    
    def analyze_network_logs(self, log_file: str) -> Dict[str, Any]:
        """Analiza logs de pruebas de red"""
        try:
            with open(log_file, 'r') as f:
                lines = f.readlines()
        except FileNotFoundError:
            return {"error": f"Archivo de log no encontrado: {log_file}"}
        
        analysis = {
            "total_lines": len(lines),
            "successful_operations": 0,
            "failed_operations": 0,
            "warnings": 0,
            "latency_measurements": [],
            "connectivity_tests": [],
            "streaming_tests": []
        }
        
        for line in lines:
            line = line.strip()
            
            if "✅" in line:
                analysis["successful_operations"] += 1
                
                # Extraer mediciones de latencia
                if "Latencia a" in line and "ms" in line:
                    try:
                        latency_str = line.split(": ")[1].replace("ms", "")
                        latency = int(latency_str)
                        analysis["latency_measurements"].append(latency)
                    except (IndexError, ValueError):
                        pass
            
            elif "❌" in line:
                analysis["failed_operations"] += 1
            
            elif "⚠️" in line:
                analysis["warnings"] += 1
            
            # Identificar tipos de pruebas
            if "prueba de conectividad" in line.lower():
                analysis["connectivity_tests"].append(line)
            elif "streaming remoto" in line.lower():
                analysis["streaming_tests"].append(line)
        
        # Calcular estadísticas de latencia
        if analysis["latency_measurements"]:
            analysis["avg_latency"] = statistics.mean(analysis["latency_measurements"])
            analysis["max_latency"] = max(analysis["latency_measurements"])
            analysis["min_latency"] = min(analysis["latency_measurements"])
        
        return analysis
    
    def generate_report(self, output_file: str = None) -> str:
        """Genera un reporte completo de rendimiento"""
        report_lines = []
        report_lines.append("=" * 60)
        report_lines.append("📊 REPORTE DE RENDIMIENTO STREAMINGPRO")
        report_lines.append("=" * 60)
        report_lines.append(f"Generado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_lines.append("")
        
        # Analizar archivos de métricas más recientes
        metrics_files = list(self.stability_logs.glob("metrics-*.json"))
        if metrics_files:
            latest_metrics = max(metrics_files, key=os.path.getctime)
            report_lines.append(f"🧪 ANÁLISIS DE ESTABILIDAD")
            report_lines.append("-" * 40)
            report_lines.append(f"Archivo: {latest_metrics.name}")
            
            metrics_data = self.load_metrics_file(str(latest_metrics))
            if metrics_data:
                stability_analysis = self.analyze_stability_metrics(metrics_data)
                
                report_lines.append(f"Duración: {stability_analysis['duration_seconds']:.1f} segundos")
                report_lines.append(f"Muestras totales: {stability_analysis['total_samples']}")
                report_lines.append(f"Score de estabilidad: {stability_analysis['stability_score']:.1f}%")
                report_lines.append(f"Bytes promedio: {stability_analysis['avg_bytes_received']:.0f}")
                report_lines.append(f"Interrupciones detectadas: {len(stability_analysis['interruptions'])}")
                
                # Análisis por path
                if stability_analysis["paths_analysis"]:
                    report_lines.append("\n🛤️  ANÁLISIS POR PATH:")
                    for path_name, path_data in stability_analysis["paths_analysis"].items():
                        report_lines.append(f"  • {path_name}:")
                        report_lines.append(f"    - Estabilidad: {path_data['stability_percentage']:.1f}%")
                        report_lines.append(f"    - Bytes promedio: {path_data['avg_bytes']:.0f}")
                        report_lines.append(f"    - Muestras: {path_data['samples']}")
                
                # Recomendaciones basadas en el análisis
                report_lines.append("\n💡 RECOMENDACIONES:")
                if stability_analysis['stability_score'] >= 95:
                    report_lines.append("  ✅ Excelente estabilidad. Sistema listo para producción.")
                elif stability_analysis['stability_score'] >= 85:
                    report_lines.append("  ⚠️  Buena estabilidad. Monitorear en producción.")
                else:
                    report_lines.append("  ❌ Estabilidad insuficiente. Requiere optimización.")
                    report_lines.append("     - Verificar recursos del servidor")
                    report_lines.append("     - Revisar configuración de red")
                    report_lines.append("     - Considerar hardware más potente")
        
        # Analizar logs de red más recientes
        network_log_files = list(self.network_logs.glob("network-test-*.log"))
        if network_log_files:
            latest_network_log = max(network_log_files, key=os.path.getctime)
            report_lines.append(f"\n🌐 ANÁLISIS DE RED")
            report_lines.append("-" * 40)
            report_lines.append(f"Archivo: {latest_network_log.name}")
            
            network_analysis = self.analyze_network_logs(str(latest_network_log))
            
            report_lines.append(f"Operaciones exitosas: {network_analysis['successful_operations']}")
            report_lines.append(f"Operaciones fallidas: {network_analysis['failed_operations']}")
            report_lines.append(f"Advertencias: {network_analysis['warnings']}")
            
            if network_analysis.get("avg_latency"):
                report_lines.append(f"Latencia promedio: {network_analysis['avg_latency']:.1f}ms")
                report_lines.append(f"Latencia máxima: {network_analysis['max_latency']}ms")
                report_lines.append(f"Latencia mínima: {network_analysis['min_latency']}ms")
                
                # Evaluación de latencia
                avg_latency = network_analysis['avg_latency']
                if avg_latency < 50:
                    report_lines.append("  ✅ Latencia excelente para streaming")
                elif avg_latency < 100:
                    report_lines.append("  ⚠️  Latencia aceptable para streaming")
                else:
                    report_lines.append("  ❌ Latencia alta - puede afectar calidad")
        
        # Resumen final
        report_lines.append(f"\n📋 RESUMEN EJECUTIVO")
        report_lines.append("-" * 40)
        
        if metrics_files and network_log_files:
            # Calcular score general basado en múltiples factores
            stability_score = stability_analysis.get('stability_score', 0) if 'stability_analysis' in locals() else 0
            network_score = 100 - min(network_analysis.get('failed_operations', 0) * 10, 50) if 'network_analysis' in locals() else 0
            
            overall_score = (stability_score + network_score) / 2
            
            report_lines.append(f"Score general: {overall_score:.1f}/100")
            
            if overall_score >= 90:
                report_lines.append("🟢 ESTADO: EXCELENTE - Listo para producción")
            elif overall_score >= 75:
                report_lines.append("🟡 ESTADO: BUENO - Monitoreo recomendado")
            elif overall_score >= 60:
                report_lines.append("🟠 ESTADO: REGULAR - Optimización necesaria")
            else:
                report_lines.append("🔴 ESTADO: CRÍTICO - Requiere atención inmediata")
        else:
            report_lines.append("⚠️  Datos insuficientes para evaluación completa")
        
        report_lines.append("")
        report_lines.append("=" * 60)
        
        report_content = "\n".join(report_lines)
        
        # Guardar reporte si se especifica archivo
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(report_content)
            print(f"📄 Reporte guardado en: {output_file}")
        
        return report_content

def main():
    parser = argparse.ArgumentParser(description="Analizador de Rendimiento StreamingPro")
    parser.add_argument("--logs-dir", default="./logs", help="Directorio de logs")
    parser.add_argument("--output", help="Archivo de salida para el reporte")
    parser.add_argument("--metrics-file", help="Archivo específico de métricas a analizar")
    
    args = parser.parse_args()
    
    analyzer = PerformanceAnalyzer(args.logs_dir)
    
    if args.metrics_file:
        # Analizar archivo específico
        metrics_data = analyzer.load_metrics_file(args.metrics_file)
        if metrics_data:
            analysis = analyzer.analyze_stability_metrics(metrics_data)
            print(json.dumps(analysis, indent=2, default=str))
    else:
        # Generar reporte completo
        report = analyzer.generate_report(args.output)
        print(report)

if __name__ == "__main__":
    main() 