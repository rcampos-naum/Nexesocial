#!/bin/sh
# Diagnóstico de solo lectura. No instala ni modifica servicios o archivos.
set -eu
printf '\nSistema operativo\n'
if [ -r /etc/os-release ]; then cat /etc/os-release; fi
printf '\nArquitectura\n'
uname -m
printf '\nEspacio disponible\n'
df -h .
printf '\nHerramientas disponibles\n'
for tool in node docker nginx systemctl; do
    if command -v "$tool" >/dev/null 2>&1; then command -v "$tool"; else printf '%s: no encontrado\n' "$tool"; fi
done
if command -v node >/dev/null 2>&1; then node --version; fi
if command -v docker >/dev/null 2>&1; then
    docker --version
    docker compose version 2>/dev/null || true
fi
printf '\nEste diagnóstico no comprueba credenciales ni publica configuración sensible.\n'
