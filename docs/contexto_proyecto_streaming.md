# Contexto del Proyecto – Plataforma de distribución de vídeo (SRT / RTMP)

> **Propósito de este documento**
> Este archivo ofrece a la IA de Cursor el contexto esencial y actualizado sobre el proyecto que estamos desarrollando. Debe leerse antes de generar código, propuestas de arquitectura o planes de pruebas relacionados con la plataforma.

---

## 1. Visión general

Creamos una **web-app B2B** que permite a empresas enviar uno o varios flujos de vídeo en **SRT o RTMP** y redistribuirlos simultáneamente a múltiples destinos (SRT o RTMP). Buscamos ofrecer una solución similar a Castr o Restream pero **personalizada y autoalojada**: cada cliente opera en su propio servidor dedicado (EC2, VPS o hardware físico) administrado por nosotros.

### Diferenciadores clave
- **Servidor dedicado por cliente** → aislamiento completo, sin multi-tenant.
- **Control granular de latencia SRT** para optimizar enlaces de larga distancia.
- **Panel de control propio** con branding del cliente y opciones avanzadas (claves de stream, destinos ilimitados, métricas en vivo).
- Seguridad empresarial: autenticación robusta, cifrado de flujos, roles y auditoría.

---

## 2. Usuarios y modelo de servicio
- **Clientes principales**: Departamentos audiovisuales de empresas, productoras, broadcasters que necesitan fiabilidad y control total.
- **Modelo comercial**: Suscripción mensual/anual que incluye licencia de software, mantenimiento y soporte. El coste base cubre la instancia reservada y nuestro servicio gestionado.

---

## 3. Requisitos del MVP
1. **Entradas simultáneas** en SRT o RTMP.
2. **Salidas simultáneas** en SRT o RTMP (push o pull) sin límite impuesto por software.
3. **Dashboard Web** (Next.js 15) donde el usuario:
   - Añade/edita/elimina entradas y salidas.
   - Inicia, detiene y monitoriza cada flujo (estado, bitrate, conexiones).
   - Ajusta la latencia/buffer SRT (80–1000 ms) por flujo.
4. **API interna/externa** REST o WebSocket para automatizar las mismas operaciones.
5. **Autenticación** mediante email + contraseña (con opción 2FA) y roles *Admin / Técnico / Visor*.
6. **Cifrado**: SRT AES‑128/256 y RTMPS cuando sea posible.

_No se incluye aún grabación en el MVP; se prevé en versiones posteriores._

---

## 4. Arquitectura técnica
```
[ Encoder del cliente ] --SRT/RTMP--> [ Servidor dedicado ]
                                        │
                                        ├─ Servidor de medios (MediaMTX o Nginx-RTMP + SRT-live-transmit)
                                        ├─ Backend NestJS 11 (Node.js 22.16 LTS)  ← API + orquestación
                                        ├─ PostgreSQL 15 (configuración y usuarios)
                                        └─ Frontend Next.js 15 (dashboard)
```

- **Backend**: NestJS 11 (Node.js 22.16 LTS) + TypeScript. Controla procesos del servidor de medios y expone API.
- **Frontend**: Next.js 15 con React, Tailwind y SWR/WebSocket para datos en tiempo real.
- **DB**: PostgreSQL 15.
- **Servidor de medios**:
  - Preferencia: **MediaMTX** (unifica SRT↔RTMP↔HLS y API HTTP nativa).
  - Alternativa: Nginx‑RTMP + SRT‑live‑transmit controlados por backend.
- **Orquestación**: Scripts Bash/TypeScript o Ansible playbooks para instalar la stack en nuevas instancias.
- **CI/CD**: GitHub Actions → Docker Hub → despliegue vía SSH/Ansible.

---

## 5. Seguridad
- HTTPS en dashboard (Let’s Encrypt).
- JWT + refresh tokens, rate limits y roles.
- Claves de stream únicas por entrada RTMP; passphrase AES para SRT.
- Logs de auditoría en PostgreSQL (quién hace qué y cuándo).
- Backups automáticos de DB y configuración.

---

## 6. Hoja de ruta resumida
| Fase | Objetivo | Entregables |
|------|----------|-------------|
| 0 | Preparación | Infraestructura base, repositorios, scripts Ansible |
| 1 | MVP streaming | Entradas/salidas, dashboard básico, seguridad mínima |
| 2 | Grabación + métricas | Recording en disco, gráficas en tiempo real |
| 3 | CDN / HLS | Salida HLS, integración CDN, reproductor embebido |

---

## 7. Pautas para la IA de Cursor
- **Lenguaje**: generar código y documentación en español (España) salvo que se especifique lo contrario.
- **Priorización**: centrar esfuerzos en estabilidad del backend y control de flujos antes que en UI compleja.
- **Dependencias externas**: evitar servicios cloud cerrados en el flujo principal; todo debe poder ejecutarse en servidores propios.
- **Modularidad**: dividir el backend en servicios (control, monitorización, métrica) para facilitar escalado posterior.
- **Estrategia de pruebas**: unitarias para la lógica de negocio NestJS, integración (Docker Compose) para flujos SRT/RTMP end‑to‑end.

---

## 8. Referencias rápidas
- MediaMTX → <https://github.com/bluenviron/mediamtx>
- SRT protocol spec → <https://github.com/Haivision/srt>
- Nginx‑RTMP module → <https://github.com/arut/nginx-rtmp-module>

---

**Fin del documento**
