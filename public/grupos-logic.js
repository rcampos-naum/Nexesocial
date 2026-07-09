// grupos-logic.js - Lógica Frontend para Módulo de Grupos

import { auth, db } from "./firebase-config.js";
import { 
    DepartamentosDB, 
    ActividadesDB, 
    GruposDB, 
    BeneficiariosGruposDB, 
    AsistenciaDB,
    TiposActividadesDB,
    calcularEdadPersona,
    validarRangoEdad,
    formatearFecha
} from "./grupos-db.js";
import { getDoc, doc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ==========================================
// --- UTILIDADES GLOBALES ---
// ==========================================

export const GruposLogic = {

    // Obtener usuario actual
    usuarioActual: null,

    getUserAccessProfile: function() {
        const role = localStorage.getItem('userRole') || 'user';
        const roles = (() => {
            try { return JSON.parse(localStorage.getItem('userRoles') || '[]'); }
            catch { return []; }
        })();
        const matrixPerms = (() => {
            try { return JSON.parse(localStorage.getItem('userMatrixPerms') || '{}'); }
            catch { return {}; }
        })();
        const userPermissions = (() => {
            try { return JSON.parse(localStorage.getItem('userPermissions') || '{}'); }
            catch { return {}; }
        })();
        const scope = (() => {
            try { return JSON.parse(localStorage.getItem('userScope') || '[]'); }
            catch { return []; }
        })();
        const deptIds = (() => {
            try { return JSON.parse(localStorage.getItem('userDeptIds') || '[]'); }
            catch { return []; }
        })();
        const assignedGroups = (() => {
            try {
                const raw = JSON.parse(localStorage.getItem('userAssignedGroups') || '[]');
                return Array.isArray(raw) ? raw.filter(Boolean) : [];
            } catch {
                return [];
            }
        })();

        const isAdmin = role === 'admin' || roles.includes('admin_sistema') || roles.includes('direccio');
        const hasProgramsPermission = matrixPerms.programsRead === true || matrixPerms.programsEdit === true;
        const canSeeAllStudents = isAdmin || matrixPerms.verAlumnesTots === true || hasProgramsPermission || (userPermissions.programs && userPermissions.programs !== 'none');
        const effectiveDeptScope = Array.from(new Set([...(Array.isArray(scope) ? scope : []), ...(Array.isArray(deptIds) ? deptIds : [])].filter(Boolean)));

        return {
            isAdmin,
            role,
            roles,
            uid: this.usuarioActual?.uid || null,
            email: this.usuarioActual?.email || '',
            canSeeAllStudents,
            effectiveDeptScope,
            assignedGroups
        };
    },

    canSeeGroup: function(group, access = null) {
        const profile = access || this.getUserAccessProfile();
        if (!group) return false;
        if (profile.isAdmin) return true;

        // Global visibility permission configured in admin-permisos must override scope.
        if (profile.canSeeAllStudents) return true;

        const groupDeptId = group.departamentoId || group.departmentId || '';
        if (profile.effectiveDeptScope.length && groupDeptId && !profile.effectiveDeptScope.includes(groupDeptId)) {
            return false;
        }

        const responsibleIds = [group.responsableId, group.responsibleId].filter(Boolean);
        const isOwnGroup = responsibleIds.some((id) => id === profile.uid || id === profile.email);
        if (isOwnGroup) return true;
        if (profile.assignedGroups.includes(group.id)) return true;

        return false;
    },

    initUser: async function() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.usuarioActual = user;
                    // Obtener datos del usuario de BD
                    try {
                        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
                        if (userDoc.exists()) {
                            this.usuarioActual = { ...user, ...userDoc.data() };
                        }
                    } catch (error) {
                        console.error("Error cargar usuario:", error);
                    }
                    resolve(user);
                } else {
                    window.location.href = "index.html";
                    resolve(null);
                }
            });
        });
    },

    // Notificaciones
    mostrarNotificacion: function(mensaje, tipo = "success") {
        const container = document.createElement("div");
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 10002;
            animation: slideIn 0.3s ease-out;
            background: ${tipo === "success" ? "#10b981" : tipo === "error" ? "#ef4444" : "#f59e0b"};
            color: white;
        `;
        container.textContent = mensaje;
        document.body.appendChild(container);
        setTimeout(() => container.remove(), 3000);
    },

    obtenerDepartamentosCompartidos: async function() {
        const access = this.getUserAccessProfile();
        const localDepartments = JSON.parse(localStorage.getItem('nexesocial_departments') || '[]');
        const departamentosLocales = Array.isArray(localDepartments)
            ? localDepartments
                .filter((item) => item.status !== 'Inactiu')
                .filter((item) => {
                    if (access.isAdmin || access.canSeeAllStudents || !access.effectiveDeptScope.length) return true;
                    const deptId = item.id || item.code || item.name || '';
                    return access.effectiveDeptScope.includes(deptId);
                })
                .map((item) => ({
                    id: item.id || item.code || item.name,
                    nombre: item.name || item.nombre || item.id
                }))
            : [];

        const departamentosFirestore = await DepartamentosDB.obtenerTodos();
        const mapa = new Map();

        [...departamentosFirestore, ...departamentosLocales].forEach((item) => {
            if (!item?.id) return;
            if (!access.isAdmin && !access.canSeeAllStudents && access.effectiveDeptScope.length && !access.effectiveDeptScope.includes(item.id)) return;
            mapa.set(item.id, {
                id: item.id,
                nombre: item.nombre || item.name || item.id
            });
        });

        return Array.from(mapa.values());
    },

    obtenerActividadesCompartidas: async function(departamentoId = "") {
        const access = this.getUserAccessProfile();
        const scopedDepartmentId = (access.isAdmin || access.canSeeAllStudents)
            ? departamentoId
            : (departamentoId || (access.effectiveDeptScope.length === 1 ? access.effectiveDeptScope[0] : ''));
        const localActivities = JSON.parse(localStorage.getItem('nexesocial_activities') || '[]');
        const actividadesLocales = Array.isArray(localActivities)
            ? localActivities
                .filter((item) => {
                    const itemDeptId = item.departmentId || item.departamentoId || '';
                    const sameDepartment = !scopedDepartmentId || itemDeptId === scopedDepartmentId;
                    const allowedByScope = access.isAdmin || access.canSeeAllStudents || !access.effectiveDeptScope.length || access.effectiveDeptScope.includes(itemDeptId);
                    return sameDepartment && allowedByScope && item.status !== 'Inactiva';
                })
                .map((item) => ({
                    id: item.id,
                    nombre: item.name || item.nombre || item.id,
                    departamentoId: item.departmentId || item.departamentoId || '',
                    edadMinima: item.ageMin ?? item.edadMinima ?? 0,
                    edadMaxima: item.ageMax ?? item.edadMaxima ?? 99
                }))
            : [];

        let actividadesFirestore = [];
        try {
            const snapshot = scopedDepartmentId
                ? await ActividadesDB.obtenerPorDepartamento(scopedDepartmentId)
                : (await getDocs(collection(db, "actividades"))).docs.map((item) => ({ id: item.id, ...item.data() }));

            actividadesFirestore = snapshot
                .filter((item) => {
                    const itemDeptId = item.departamentoId || item.departmentId || '';
                    const sameDepartment = !scopedDepartmentId || itemDeptId === scopedDepartmentId;
                    const allowedByScope = access.isAdmin || access.canSeeAllStudents || !access.effectiveDeptScope.length || access.effectiveDeptScope.includes(itemDeptId);
                    return sameDepartment && allowedByScope && item.estado !== 'Inactiva';
                })
                .map((item) => ({
                    id: item.id,
                    nombre: item.nombre || item.name || item.id,
                    departamentoId: item.departamentoId || item.departmentId || '',
                    edadMinima: item.edadMinima ?? item.ageMin ?? 0,
                    edadMaxima: item.edadMaxima ?? item.ageMax ?? 99
                }));
        } catch (error) {
            console.warn('No se pudieron leer actividades compartidas:', error);
        }

        const mapa = new Map();
        [...actividadesFirestore, ...actividadesLocales].forEach((item) => {
            if (!item?.id) return;
            mapa.set(item.id, item);
        });

        return Array.from(mapa.values());
    },

    configurarVistaGrupos: async function(options = {}) {
        const {
            departmentSelectId = 'filtro-departamento',
            activitySelectId = 'filtro-actividad',
            totalDepartmentsId = 'total-departamentos',
            totalActivitiesId = 'total-actividades'
        } = options;

        const departments = await this.obtenerDepartamentosCompartidos();
        const selectedDepartment = document.getElementById(departmentSelectId)?.value || '';
        const activities = await this.obtenerActividadesCompartidas(selectedDepartment);

        const departmentSelect = document.getElementById(departmentSelectId);
        if (departmentSelect) {
            departmentSelect.innerHTML = '<option value="">Todos los departamentos</option>' + departments.map((dept) => `<option value="${dept.id}" ${dept.id === selectedDepartment ? 'selected' : ''}>${dept.nombre}</option>`).join('');
        }

        const activitySelect = document.getElementById(activitySelectId);
        if (activitySelect) {
            const previousValue = activitySelect.value || '';
            activitySelect.innerHTML = '<option value="">Todas las actividades</option>' + activities.map((act) => `<option value="${act.id}" ${act.id === previousValue ? 'selected' : ''}>${act.nombre}</option>`).join('');
        }

        const deptCounter = document.getElementById(totalDepartmentsId);
        if (deptCounter) deptCounter.textContent = String(departments.length);

        const actCounter = document.getElementById(totalActivitiesId);
        if (actCounter) actCounter.textContent = String((await this.obtenerActividadesCompartidas()).length);
    },

    // ==========================================
    // --- GESTIÓN DE DEPARTAMENTOS ---
    // ==========================================

    cargarDepartamentos: async function(selectId) {
        try {
            const select = document.getElementById(selectId);
            if (!select) return;

            const departamentos = await this.obtenerDepartamentosCompartidos();
            select.innerHTML = '<option value="">-- Seleccionar departamento --</option>';

            departamentos.forEach(dept => {
                const option = document.createElement("option");
                option.value = dept.id;
                option.textContent = dept.nombre;
                select.appendChild(option);
            });

            if (selectId === "select-departamento") {
                select.onchange = () => this.cargarActividades();
            }
        } catch (error) {
            console.error("Error cargar departamentos:", error);
            this.mostrarNotificacion("Error al cargar departamentos", "error");
        }
    },

    // ==========================================
    // --- GESTIÓN DE ACTIVIDADES ---
    // ==========================================

    cargarActividades: async function() {
        try {
            const selectDept = document.getElementById("select-departamento");
            const selectAct = document.getElementById("select-actividad");

            if (!selectDept || !selectAct) return;

            const departamentoId = selectDept.value;
            selectAct.innerHTML = '<option value="">-- Seleccionar actividad --</option>';

            if (!departamentoId) return;

            const actividades = await this.obtenerActividadesCompartidas(departamentoId);

            actividades.forEach(act => {
                const option = document.createElement("option");
                option.value = act.id;
                option.textContent = `${act.nombre} (${act.edadMinima}-${act.edadMaxima} años)`;
                option.dataset.edadMinima = act.edadMinima;
                option.dataset.edadMaxima = act.edadMaxima;
                selectAct.appendChild(option);
            });
        } catch (error) {
            console.error("Error cargar actividades:", error);
        }
    },

    cargarTiposActividades: async function(selectId = "select-tipo-actividad", departamentoId = null) {
        try {
            const selectEl = document.getElementById(selectId);
            if (!selectEl) return;

            let tipos;
            if (departamentoId) {
                tipos = await TiposActividadesDB.obtenerPorDepartamento(departamentoId);
            } else {
                tipos = await TiposActividadesDB.obtenerTodos();
            }

            selectEl.innerHTML = '<option value="">-- Seleccionar tipo de actividad --</option>';
            tipos.forEach(tipo => {
                const option = document.createElement("option");
                option.value = tipo.id;
                option.textContent = tipo.nombre;
                if (tipo.descripcion) {
                    option.title = tipo.descripcion;
                }
                selectEl.appendChild(option);
            });
        } catch (error) {
            console.error("Error cargar tipos de actividades:", error);
            this.mostrarNotificacion("Error al cargar tipos de actividades", "error");
        }
    },

    // ==========================================
    // --- GESTIÓN DE GRUPOS ---
    // ==========================================

    crearGrupo: async function(nombre, departamentoId, actividadId, responsableId, responsableNombre, turnos = [], meta = {}, tipoActividadId = null) {
        try {
            if (!nombre || !departamentoId || !actividadId || !responsableId) {
                this.mostrarNotificacion("Todos los campos son obligatorios", "warning");
                return null;
            }

            const departamentos = await this.obtenerDepartamentosCompartidos();
            const actividades = await this.obtenerActividadesCompartidas(departamentoId);
            const departamento = departamentos.find((item) => item.id === departamentoId);
            const actividad = actividades.find((item) => item.id === actividadId);

            const resultado = await GruposDB.crear(
                nombre,
                departamentoId,
                actividadId,
                responsableId,
                responsableNombre,
                departamento?.nombre || '',
                actividad?.nombre || '',
                turnos,
                meta,
                tipoActividadId
            );
            this.mostrarNotificacion(`✔ Grupo creado: ${resultado.idGrupo}`);
            return resultado;
        } catch (error) {
            console.error("Error crear grupo:", error);
            this.mostrarNotificacion("Error al crear grupo", "error");
            return null;
        }
    },

    actualizarGrupo: async function(grupoId, nombre, departamentoId, actividadId, responsableId, responsableNombre, turnos = [], meta = {}, tipoActividadId = null) {
        try {
            if (!grupoId || !nombre || !departamentoId || !actividadId || !responsableId) {
                this.mostrarNotificacion("Todos los campos son obligatorios", "warning");
                return false;
            }

            const departamentos = await this.obtenerDepartamentosCompartidos();
            const actividades = await this.obtenerActividadesCompartidas(departamentoId);
            const departamento = departamentos.find((item) => item.id === departamentoId);
            const actividad = actividades.find((item) => item.id === actividadId);

            await GruposDB.actualizar(grupoId, {
                nombre,
                departamentoId,
                actividadId,
                departamentoNombre: departamento?.nombre || '',
                actividadNombre: actividad?.nombre || '',
                responsableId,
                responsableNombre,
                turnos,
                tipoActividadId
            });

            this.mostrarNotificacion("✔ Grupo actualizado correctamente");
            return true;
        } catch (error) {
            console.error("Error actualizar grupo:", error);
            this.mostrarNotificacion("Error al actualizar el grupo", "error");
            return false;
        }
    },

    cargarGrupos: async function(tableId = "tabla-grupos", filtros = {}) {
        try {
            const tabla = document.getElementById(tableId);
            if (!tabla) return;
            const access = this.getUserAccessProfile();

            const [grupos, departamentos, actividades, tiposActividades] = await Promise.all([
                GruposDB.obtenerTodos(),
                this.obtenerDepartamentosCompartidos(),
                this.obtenerActividadesCompartidas(),
                TiposActividadesDB.obtenerTodos()
            ]);

            const mapaDepartamentos = new Map(departamentos.map((item) => [item.id, item.nombre]));
            const mapaActividades = new Map(actividades.map((item) => [item.id, item.nombre]));
            const mapaTiposActividades = new Map(tiposActividades.map((item) => [item.id, item.nombre]));

            const gruposFiltrados = grupos.filter((grupo) => {
                const sameDepartment = !filtros.departmentId || grupo.departamentoId === filtros.departmentId || grupo.departmentId === filtros.departmentId;
                const sameActivity = !filtros.activityId || grupo.actividadId === filtros.activityId || grupo.activityId === filtros.activityId;
                const allowedByAccess = this.canSeeGroup(grupo, access);
                return sameDepartment && sameActivity && allowedByAccess;
            });

            // Enrich groups with type activity names
            gruposFiltrados.forEach(grupo => {
                if (grupo.tipoActividadId) {
                    grupo.tipoActividadNombre = mapaTiposActividades.get(grupo.tipoActividadId) || '-';
                }
            });

            const totalGrupos = document.getElementById('total-grupos');
            if (totalGrupos) totalGrupos.textContent = String(gruposFiltrados.length);

            const emptyState = document.getElementById('no-grupos');
            if (emptyState) {
                emptyState.style.display = gruposFiltrados.length ? 'none' : 'block';
            }

            if (gruposFiltrados.length === 0) {
                tabla.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">No hay grupos creados con los filtros seleccionados</td></tr>';
                return;
            }

            tabla.innerHTML = gruposFiltrados.map(grupo => {
                const departamentoNombre = grupo.departamentoNombre || grupo.departmentName || mapaDepartamentos.get(grupo.departamentoId || grupo.departmentId) || 'Sin departamento';
                const actividadNombre = grupo.actividadNombre || grupo.activityName || mapaActividades.get(grupo.actividadId || grupo.activityId) || 'Sin actividad';
                const tipoActividadNombre = grupo.tipoActividadNombre || '-';
                const turnosHtml = grupo.turnos && grupo.turnos.length > 0 
                    ? grupo.turnos.map(t => `${t.inicio}-${t.fin}`).join('<br>')
                    : '<span style="color: #cbd5e1;">Sin turnos</span>';

                return `
                    <tr data-grupo-id="${grupo.id}">
                        <td>${grupo.idGrupo}</td>
                        <td>${grupo.nombre}</td>
                        <td>${departamentoNombre}</td>
                        <td>${actividadNombre}</td>
                        <td style="font-size: 0.9rem; color: #0f172a; font-weight: 500;">${tipoActividadNombre}</td>
                        <td>${grupo.responsableNombre}</td>
                        <td style="font-size: 0.8rem; font-weight: 500;">${turnosHtml}</td>
                        <td>${grupo.beneficiarios?.length || 0}</td>
                        <td>
                            <button class="btn-accion btn-beneficiarios" onclick="mostrarBeneficiarios('${grupo.id}')">👥 Beneficiarios</button>
                            <button class="btn-accion btn-asistencia" onclick="abrirPasarLista('${grupo.id}')">📋 Asistencia</button>
                            <button class="btn-accion btn-editar" onclick="editarGrupo('${grupo.id}')">✏️ Editar</button>
                        </td>
                    </tr>
                `;
            }).join("");

            window.replaceEmojiIconsWithSVG?.(tabla);
        } catch (error) {
            console.error("Error cargar grupos:", error);
            this.mostrarNotificacion("Error al cargar grupos", "error");
        }
    },

    eliminarGrupo: async function(grupoId) {
        try {
            if (!confirm("¿Estás seguro de que deseas eliminar este grupo?")) return;
            await GruposDB.eliminar(grupoId);
            this.mostrarNotificacion("✔ Grupo eliminado");
            this.cargarGrupos();
        } catch (error) {
            console.error("Error eliminar grupo:", error);
            this.mostrarNotificacion("Error al eliminar grupo", "error");
        }
    },

    obtenerDetallesGrupo: async function(grupoId) {
        try {
            const grupo = await GruposDB.obtenerPorId(grupoId);
            if (!grupo) {
                this.mostrarNotificacion("Grupo no encontrado", "error");
                return null;
            }

            const actividad = await ActividadesDB.obtenerPorId(grupo.actividadId);
            const beneficiarios = await BeneficiariosGruposDB.obtenerPorGrupo(grupoId);

            return {
                ...grupo,
                actividad: actividad,
                beneficiarios: beneficiarios
            };
        } catch (error) {
            console.error("Error obtener detalles grupo:", error);
            return null;
        }
    },

    cargarPersonal: async function(selectId) {
        try {
            const select = document.getElementById(selectId);
            if (!select) return;

            select.innerHTML = '<option value="">-- Seleccionar responsable --</option>';

            const localStaff = JSON.parse(localStorage.getItem('nexesocial_staff') || '[]');
            if (Array.isArray(localStaff) && localStaff.length) {
                localStaff
                    .filter((item) => item.status !== 'Baixa')
                    .forEach((item) => {
                        const option = document.createElement("option");
                        option.value = item.firebaseUid || item.id;
                        option.textContent = item.name || item.email || item.id;
                        option.dataset.nombre = item.name || item.email || item.id;
                        select.appendChild(option);
                    });
                return;
            }

            const querySnapshot = await getDocs(collection(db, "usuarios"));

            querySnapshot.docs.forEach(docSnap => {
                const datos = docSnap.data();
                if (!datos.nombre && !datos.email) return; // skip empty docs
                const option = document.createElement("option");
                option.value = docSnap.id;
                option.textContent = datos.nombre || datos.email || docSnap.id;
                option.dataset.nombre = datos.nombre || datos.email || docSnap.id;
                select.appendChild(option);
            });
        } catch (error) {
            console.error("Error cargar personal:", error);
        }
    },

    // ==========================================
    // --- GESTIÓN DE BENEFICIARIOS ---
    // ==========================================

    cargarBeneficiarios: async function(grupoId, tableId = "tabla-beneficiarios") {
        try {
            const tabla = document.getElementById(tableId);
            if (!tabla) return;

            const beneficiarios = await BeneficiariosGruposDB.obtenerPorGrupo(grupoId);

            if (beneficiarios.length === 0) {
                tabla.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No hay beneficiarios asignados</td></tr>';
                return;
            }

            tabla.innerHTML = beneficiarios.map(ben => `
                <tr data-beneficiario-id="${ben.id}" data-ben-id="${ben.beneficiarioId}">
                    <td>${ben.nombre}</td>
                    <td>${ben.edad} años</td>
                    <td>
                        <span class="badge ${ben.estado === "Correcto" ? "badge-success" : "badge-warning"}">
                            ${ben.estado === "Correcto" ? "✔ Correcto" : "⚠ Excepción"}
                        </span>
                    </td>
                    <td>${ben.motivoExcepcion || "-"}</td>
                    <td>
                        <button class="btn-accion btn-eliminar" onclick="eliminarBeneficiario('${grupoId}', '${ben.id}', '${ben.beneficiarioId}')">🗑️ Eliminar</button>
                    </td>
                </tr>
            `).join("");

        } catch (error) {
            console.error("Error cargar beneficiarios:", error);
            this.mostrarNotificacion("Error al cargar beneficiarios", "error");
        }
    },

    agregarBeneficiario: async function(grupoId, beneficiarioId, nombre, dataNacimiento) {
        try {
            // Obtener datos del grupo para saber rango de edad
            const grupo = await this.obtenerDetallesGrupo(grupoId);
            if (!grupo || !grupo.actividad) {
                this.mostrarNotificacion("Error: No se encontraron datos del grupo", "error");
                return;
            }

            // Calcular edad
            const edad = calcularEdadPersona(dataNacimiento);
            const edadMinima = grupo.actividad.edadMinima;
            const edadMaxima = grupo.actividad.edadMaxima;

            // Validar rango
            if (!validarRangoEdad(edad, edadMinima, edadMaxima)) {
                // Mostrar diálogo de excepción
                this.mostrarDialogoExcepcion(grupoId, beneficiarioId, nombre, edad, edadMinima, edadMaxima);
                return;
            }

            // Si está dentro de rango, agregar directamente
            await BeneficiariosGruposDB.agregar(grupoId, beneficiarioId, nombre, edad, "Correcto");
            this.mostrarNotificacion("✔ Beneficiario agregado correctamente");
            this.cargarBeneficiarios(grupoId);

        } catch (error) {
            console.error("Error agregar beneficiario:", error);
            this.mostrarNotificacion("Error al agregar beneficiario", "error");
        }
    },

    mostrarDialogoExcepcion: function(grupoId, beneficiarioId, nombre, edad, edadMinima, edadMaxima) {
        const modal = document.createElement("div");
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(15, 23, 42, 0.8);
            z-index: 10001;
            display: flex;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(4px);
        `;

        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 16px; width: 400px;">
                <h3 style="color: #ef4444; margin-top: 0;">⚠️ Excepción de Edad</h3>
                <p>El usuario <strong>${nombre}</strong> tiene ${edad} años y no cumple el rango (${edadMinima}-${edadMaxima} años).</p>
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">Motivo de excepción (obligatorio):</label>
                    <textarea id="motivo-excepcion" style="width: 100%; height: 80px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-family: inherit;" placeholder="Explicar el motivo de la excepción..."></textarea>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 10px 20px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">Cancelar</button>
                    <button onclick="aceptarExcepcion('${grupoId}', '${beneficiarioId}', '${nombre}', ${edad})" style="padding: 10px 20px; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Solicitar Excepción</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById("motivo-excepcion").focus();
    },

    aceptarExcepcion: async function(grupoId, beneficiarioId, nombre, edad) {
        try {
            const motivo = document.getElementById("motivo-excepcion").value;
            if (!motivo.trim()) {
                this.mostrarNotificacion("El motivo es obligatorio", "warning");
                return;
            }

            const usuarioId = this.usuarioActual?.id || this.usuarioActual?.uid;

            await BeneficiariosGruposDB.agregar(
                grupoId,
                beneficiarioId,
                nombre,
                edad,
                "Excepción",
                motivo,
                usuarioId
            );

            this.mostrarNotificacion("⚠️ Excepción solicitada (pendiente de validación)");
            document.querySelector("[style*='position: fixed']").remove();
            this.cargarBeneficiarios(grupoId);

        } catch (error) {
            console.error("Error al aceptar excepción:", error);
            this.mostrarNotificacion("Error al registrar excepción", "error");
        }
    },

    eliminarBeneficiario: async function(grupoId, idBeneficiarioGrupo, beneficiarioId) {
        try {
            if (!confirm("¿Deseas eliminar este beneficiario del grupo?")) return;

            await BeneficiariosGruposDB.eliminar(grupoId, beneficiarioId, idBeneficiarioGrupo);
            this.mostrarNotificacion("✔ Beneficiario eliminado");
            this.cargarBeneficiarios(grupoId);

        } catch (error) {
            console.error("Error eliminar beneficiario:", error);
            this.mostrarNotificacion("Error al eliminar beneficiario", "error");
        }
    },

    cargarBeneficiariosPorDepartamento: async function(departamentoId, selectId, excludeIds = []) {
        try {
            const select = document.getElementById(selectId);
            if (!select) return;

            select.innerHTML = '<option value="">Cargando...</option>';

            const querySnapshot = await getDocs(collection(db, "expedientes"));

            select.innerHTML = '<option value="">-- Seleccionar beneficiario --</option>';

            let count = 0;
            querySnapshot.docs.forEach(docSnap => {
                const datos = docSnap.data();
                // Excluir los que ya están en el grupo
                if (excludeIds.includes(docSnap.id)) return;
                const nombre = datos.dades_personals?.nom
                    || datos.nom
                    || datos.nombre
                    || null;
                if (!nombre) return; // omitir registros sin nombre
                const option = document.createElement("option");
                option.value = docSnap.id;
                option.textContent = nombre;
                option.dataset.nacimiento = datos.dades_personals?.data_naixement
                    || datos.data_naixement
                    || datos.fechaNacimiento
                    || "";
                select.appendChild(option);
                count++;
            });

            if (count === 0) {
                select.innerHTML = '<option value="">No hay beneficiarios disponibles</option>';
            }
        } catch (error) {
            console.error("Error cargar beneficiarios:", error);
            const select = document.getElementById(selectId);
            if (select) select.innerHTML = '<option value="">Error al cargar</option>';
        }
    },

    // ==========================================
    // --- GESTIÓN DE ASISTENCIA ---
    // ==========================================

    cargarListaAsistencia: async function(grupoId, fecha, tableId = "tabla-asistencia-items") {
        try {
            const tabla = document.getElementById(tableId);
            if (!tabla) return;

            // Obtener beneficiarios del grupo
            const grupo = await this.obtenerDetallesGrupo(grupoId);
            if (!grupo || !grupo.beneficiarios) {
                tabla.innerHTML = '<tr><td colspan="2">No hay beneficiarios en este grupo</td></tr>';
                return;
            }

            // Obtener asistencia del día
            const asistenciaDelDia = await AsistenciaDB.obtenerPorGrupoYFecha(grupoId, fecha);
            const mapaAsistencia = {};
            asistenciaDelDia.forEach(reg => {
                mapaAsistencia[reg.beneficiarioId] = reg.asistio;
            });

            // Renderizar lista
            tabla.innerHTML = grupo.beneficiarios.map(ben => {
                const asistio = mapaAsistencia[ben.beneficiarioId] || false;
                return `
                    <tr>
                        <td>${ben.nombre}</td>
                        <td style="text-align: center;">
                            <input type="checkbox" class="checkbox-asistencia" data-beneficiario-id="${ben.beneficiarioId}" ${asistio ? "checked" : ""}>
                        </td>
                    </tr>
                `;
            }).join("");

        } catch (error) {
            console.error("Error cargar lista asistencia:", error);
            this.mostrarNotificacion("Error al cargar lista", "error");
        }
    },

    guardarAsistencia: async function(grupoId, fecha) {
        try {
            const checkboxes = document.querySelectorAll(".checkbox-asistencia");
            const usuarioId = this.usuarioActual?.id || this.usuarioActual?.uid;
            const usuarioNombre = this.usuarioActual?.nombre || "Usuario";

            if (checkboxes.length === 0) {
                this.mostrarNotificacion("No hay beneficiarios para guardar", "warning");
                return;
            }

            let contadorGuardados = 0;

            for (const checkbox of checkboxes) {
                const beneficiarioId = checkbox.dataset.beneficiarioId;
                const asistio = checkbox.checked;

                await AsistenciaDB.guardar(
                    grupoId,
                    beneficiarioId,
                    fecha,
                    asistio,
                    usuarioId,
                    usuarioNombre
                );
                contadorGuardados++;
            }

            this.mostrarNotificacion(`✔ Asistencia guardada (${contadorGuardados} registros)`);

        } catch (error) {
            console.error("Error guardar asistencia:", error);
            this.mostrarNotificacion("Error al guardar asistencia", "error");
        }
    },

    marcarTodos: function(estado = true) {
        const checkboxes = document.querySelectorAll(".checkbox-asistencia");
        checkboxes.forEach(cb => cb.checked = estado);
    },

    // ==========================================
    // --- ASISTENCIA CON ESTADO (P, F, FJ) ---
    // ==========================================

    obtenerAsistenciasDelDia: async function(grupoId, fecha) {
        try {
            const q = query(
                collection(db, "asistencia"),
                where("grupoId", "==", grupoId),
                where("fecha", "==", fecha)
            );
            const querySnapshot = await getDocs(q);
            const registros = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`Asistencias del día (${fecha}):`, registros);
            return registros;
        } catch (error) {
            console.error("Error obtener asistencias del día:", error);
            return [];
        }
    },

    guardarAsistenciaConEstado: async function(grupoId, beneficiarioId, fecha, estado, usuarioId, usuarioNombre, meta = {}) {
        try {
            return await AsistenciaDB.guardarAsistenciaConEstado(
                grupoId,
                beneficiarioId,
                fecha,
                estado,
                usuarioId,
                usuarioNombre,
                meta
            );
        } catch (error) {
            console.error("Error guardar asistencia con estado:", error);
            throw error;
        }
    },

    // ==========================================
    // --- GENERACIÓN DE REPORTES ---
    // ==========================================

    obtenerAsistenciasDelMes: async function(grupoId, mes, año) {
        try {
            // Calcular primer y último día del mes
            const primerDia = new Date(año, mes, 1);
            const ultimoDia = new Date(año, mes + 1, 0);

            // Formatear fechas para la búsqueda (YYYY-MM-DD)
            const fechaInicio = primerDia.toISOString().split('T')[0];
            const fechaFin = ultimoDia.toISOString().split('T')[0];

            console.log(`Buscando asistencias para ${grupoId} entre ${fechaInicio} y ${fechaFin}`);

            // Obtener todos los registros de asistencia del grupo
            const q = query(
                collection(db, "asistencia"),
                where("grupoId", "==", grupoId)
            );

            const querySnapshot = await getDocs(q);
            const asistenciasDelMes = [];

            // Filtrar por fecha en cliente
            querySnapshot.docs.forEach(doc => {
                const datos = doc.data();
                if (datos.fecha >= fechaInicio && datos.fecha <= fechaFin) {
                    asistenciasDelMes.push({
                        id: doc.id,
                        ...datos
                    });
                }
            });

            console.log(`Se encontraron ${asistenciasDelMes.length} registros de asistencia`);
            return asistenciasDelMes;
        } catch (error) {
            console.error("Error obtener asistencias del mes:", error);
            return [];
        }
    }
};

// ==========================================
// --- FUNCIONES GLOBALES PARA HTML ---
// ==========================================

window.GruposLogic = GruposLogic;

window.mostrarBeneficiarios = async function(grupoId) {
    // Esta función se llamará desde los botones del HTML
    const detalles = await GruposLogic.obtenerDetallesGrupo(grupoId);
    window.location.href = `gestio-beneficiaris.html?grupoId=${grupoId}`;
};

window.abrirPasarLista = function(grupoId) {
    window.location.href = `passar-llista.html?grupoId=${grupoId}`;
};

window.editarGrupo = function(grupoId) {
    window.location.href = `crear-grup.html?edit=${grupoId}`;
};

window.eliminarBeneficiario = (grupoId, idBen, beneficiarioId) => GruposLogic.eliminarBeneficiario(grupoId, idBen, beneficiarioId);

window.aceptarExcepcion = (grupoId, beneficiarioId, nombre, edad) => GruposLogic.aceptarExcepcion(grupoId, beneficiarioId, nombre, edad);
