#!/usr/bin/env bash
# Instala exclusivamente el piloto Docker en un directorio y volumen separados.
set -euo pipefail
umask 077
ref="${1:?Uso: bash install-lan.sh SHA_COMPLETO [IP_LAN]}"
bind_ip="${2:-10.0.0.85}"
[[ "$ref" =~ ^[0-9a-f]{40}$ ]] || { echo 'Se requiere el SHA completo de la versión revisada.' >&2; exit 1; }
[[ "$bind_ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || { echo 'IP LAN no válida.' >&2; exit 1; }
case " $(hostname -I) " in *" $bind_ip "*) ;; *) echo "La IP $bind_ip no pertenece a este servidor. No se ha instalado nada." >&2; exit 1 ;; esac
command -v docker >/dev/null || { echo 'Docker no está instalado.' >&2; exit 1; }
command -v tar >/dev/null || { echo 'Falta tar.' >&2; exit 1; }
if ! command -v curl >/dev/null && ! command -v wget >/dev/null; then echo 'Falta curl o wget para descargar la versión.' >&2; exit 1; fi
docker_cmd=(docker)
if ! docker info >/dev/null 2>&1; then
    echo 'Docker necesita permisos. Introduce la contraseña solo en esta terminal si sudo la solicita.'
    sudo -v
    docker_cmd=(sudo docker)
fi
"${docker_cmd[@]}" compose version >/dev/null
base="$HOME/nexesocial-pruebas"
project='nexesocial-pruebas'
existing_containers="$("${docker_cmd[@]}" ps -aq --filter "label=com.docker.compose.project=$project")"
if [[ -e "$base" && ! -f "$base/.nexesocial-pilot" ]]; then
    echo "Ya existe $base sin la marca de este piloto. No se modificará." >&2; exit 1
fi
if [[ -n "$existing_containers" && ! -f "$base/.nexesocial-pilot" ]]; then
    echo 'Ya existe un proyecto Docker con este nombre. No se modificará.' >&2; exit 1
fi
if [[ -z "$existing_containers" ]] && command -v ss >/dev/null && [[ -n "$(ss -H -ltn 'sport = :4080')" ]]; then
    echo 'El puerto 4080 está ocupado. No se cambiarán otros servicios.' >&2; exit 1
fi
echo "Piloto: http://$bind_ip:4080 · carpeta: $base · versión: $ref"
echo 'Solo datos ficticios durante esta prueba. No se cambiarán las webs existentes.'
mkdir -p "$base/releases"
touch "$base/.nexesocial-pilot"
release="$(mktemp -d "$base/releases/$ref.XXXXXX")"
archive="$release/source.tar.gz"
url="https://codeload.github.com/rcampos-naum/Nexesocial/tar.gz/$ref"
if command -v curl >/dev/null; then curl --fail --location --silent --show-error "$url" --output "$archive";
else wget -q "$url" -O "$archive"; fi
tar -xzf "$archive" --strip-components=1 -C "$release"
[[ -f "$release/selfhost/compose.pruebas.yaml" && -f "$release/selfhost/server.mjs" ]] || { echo 'El paquete descargado no incluye el piloto esperado.' >&2; exit 1; }
export NEXE_BIND_IP="$bind_ip"
export ADMIN_EMAIL=''
export ADMIN_PASSWORD=''
initialized=false
if "${docker_cmd[@]}" volume inspect "${project}_pilot-data" >/dev/null 2>&1; then
    # The previous container may have created the volume without ever starting.
    probe_code="$(cat "$release/selfhost/probe-data.mjs")"
    probe_code+=$'\nprocess.exit(probePilotDatabase("/data/nexesocial.sqlite"));'
    if "${docker_cmd[@]}" run --rm --read-only --network none --cap-drop ALL \
        --security-opt no-new-privileges:true --user node \
        --mount "type=volume,src=${project}_pilot-data,dst=/data,readonly" \
        node:24-bookworm-slim node --input-type=module -e "$probe_code"; then
        initialized=true
    else
        probe_status=$?
        if [[ "$probe_status" != 3 ]]; then
            echo 'No se puede verificar la base existente. Se conserva intacta; no se recrearán las cuentas.' >&2
            exit 1
        fi
        echo 'El volumen existe, pero la primera cuenta todavía no se creó. Se completará ahora.'
    fi
fi
if [[ "$initialized" != true ]]; then
    read -r -p 'Correo de la cuenta administradora de pruebas: ' ADMIN_EMAIL
    [[ "$ADMIN_EMAIL" == *@*.* ]] || { echo 'Correo no válido.' >&2; exit 1; }
    read -r -s -p 'Contraseña NUEVA para las pruebas (mínimo 12 caracteres): ' ADMIN_PASSWORD; printf '\n'
    [[ ${#ADMIN_PASSWORD} -ge 12 && ${#ADMIN_PASSWORD} -le 512 ]] || { echo 'La contraseña debe tener de 12 a 512 caracteres.' >&2; exit 1; }
    read -r -s -p 'Repite la contraseña: ' repeated; printf '\n'
    [[ "$ADMIN_PASSWORD" == "$repeated" ]] || { echo 'Las contraseñas no coinciden.' >&2; exit 1; }
    unset repeated
else
    echo 'Se conserva la base del piloto y sus cuentas existentes.'
    echo 'Creando una copia coherente antes de actualizar…'
    backup_code='import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
const dir = "/data/backups";
mkdirSync(dir, { recursive: true, mode: 0o700 });
const path = `${dir}/antes-actualizar-${new Date().toISOString().replace(/[:.]/g,"-")}.sqlite`;
const db = new DatabaseSync("/data/nexesocial.sqlite", { readOnly: true });
try { await backup(db, path); chmodSync(path, 0o600); console.log("Copia guardada en el volumen del piloto:", path); } finally { db.close(); }'
    "${docker_cmd[@]}" run --rm --read-only --network none --cap-drop ALL \
        --security-opt no-new-privileges:true --user node \
        --mount "type=volume,src=${project}_pilot-data,dst=/data" \
        node:24-bookworm-slim node --input-type=module -e "$backup_code"
fi
compose=("${docker_cmd[@]}" compose --project-name "$project" --file "$release/selfhost/compose.pruebas.yaml")
# -q comprueba el modelo sin imprimir el entorno ni la contraseña.
"${compose[@]}" config -q
"${compose[@]}" up --detach --build
unset ADMIN_PASSWORD
printf '%s\n' "$release" > "$base/current-release"
printf '%s\n' "$bind_ip" > "$base/bind-ip"
echo 'Esperando a que la aplicación responda…'
container="$("${compose[@]}" ps -q nexesocial)"
for attempt in $(seq 1 30); do
    status="$("${docker_cmd[@]}" inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container")"
    if [[ "$status" == healthy ]]; then
        echo "PRUEBA PREPARADA: abre http://$bind_ip:4080 desde este ordenador o la misma red."
        echo 'Accede con tu cuenta de pruebas; si ya existía, se conserva la anterior.'
        echo 'No se ha modificado ningún servicio de producción ni se ha configurado HTTPS todavía.'
        exit 0
    fi
    if [[ "$status" == unhealthy || "$status" == exited || "$status" == dead ]]; then break; fi
    sleep 2
done
echo 'La aplicación no alcanzó el estado saludable. Se conservan el código y el volumen para diagnosticar.' >&2
"${compose[@]}" ps
"${compose[@]}" logs --tail 30 nexesocial
exit 1
