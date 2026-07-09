// usuarios-logic.js - Administración con registro automático en Auth y Firestore
import { db, firebaseConfig } from "./firebase-config.js"; // Importante: exporta firebaseConfig en tu config
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc,
    setDoc, 
    updateDoc,
    deleteDoc,
    deleteField,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Módulos para la creación automática sin cerrar la sesión actual
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let editId = null;
let _allDepts = []; // cached departments for scope checkboxes

// ── Load departments once ────────────────────────────────────────────────────
async function loadDepartments() {
    if (_allDepts.length) return _allDepts;
    try {
        const snap = await getDocs(collection(db, 'departamentos'));
        _allDepts = snap.docs.map(d => ({ id: d.id, name: d.data().nombre || d.data().name || d.id }));
    } catch (e) {
        console.warn('Could not load departments:', e);
        _allDepts = [];
    }
    return _allDepts;
}

// ── Render scope checkboxes in modal ────────────────────────────────────────
async function renderScopeCheckboxes(selectedScope = []) {
    const container = document.getElementById('scopeCheckboxes');
    if (!container) return;
    const depts = await loadDepartments();
    if (!depts.length) {
        container.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem;">No hi ha programes definits.</span>';
        return;
    }
    container.innerHTML = depts.map(d => {
        const checked = selectedScope.includes(d.id) ? 'checked' : '';
        const label = (d.name || d.id).replace(/</g, '&lt;');
        return `<label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:#334155;cursor:pointer;">
            <input type="checkbox" class="scope-check" value="${d.id}" ${checked} style="accent-color:#2563eb;width:15px;height:15px;">
            ${label}
        </label>`;
    }).join('');
}

// ── Get selected scope from checkboxes ───────────────────────────────────────
function getSelectedScope() {
    return [...document.querySelectorAll('.scope-check:checked')].map(cb => cb.value);
}

// ── Get selected extra permissions ──────────────────────────────────────────
function getExtraPerms() {
    return {
        pot_veure_facturacio:   document.getElementById('ep_facturacio')?.checked   || false,
        pot_validar_voluntaris: document.getElementById('ep_validar_voluntaris')?.checked || false,
        pot_veure_informes_globals: document.getElementById('ep_informes_globals')?.checked || false,
        pot_gestio_personal:    document.getElementById('ep_gestio_personal')?.checked || false,
    };
}

// ── Set extra permissions checkboxes ─────────────────────────────────────────
function setExtraPerms(ep = {}) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
    set('ep_facturacio',         ep.pot_veure_facturacio);
    set('ep_validar_voluntaris', ep.pot_validar_voluntaris);
    set('ep_informes_globals',   ep.pot_veure_informes_globals);
    set('ep_gestio_personal',    ep.pot_gestio_personal);
}

function setPasswordFieldMode(isEdit = false) {
    const passInput = document.getElementById('userPass');
    const passHint = document.getElementById('userPassHint');
    if (!passInput) return;
    passInput.required = !isEdit;
    if (passHint) {
        passHint.textContent = isEdit
            ? "En edició, deixa-la buida per mantenir la contrasenya actual."
            : "Obligatòria en alta.";
    }
}

// 1. LISTAR USUARIOS
async function cargarUsuarios() {
    const tableBody = document.getElementById('userTableBody');
    if(!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="5">Carregant usuaris...</td></tr>';

    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        tableBody.innerHTML = '';

        querySnapshot.forEach((docSnap) => {
            const user = docSnap.data();
            const p = user.permisos || { psy: 'none', audit: 'none', admin: 'none' };
            const rolLabel = { tecnic_projectes: 'T\u00e8cnic Projectes', coordinador: 'Coordinador/a', administracio: 'Administraci\u00f3', direccio: 'Direcci\u00f3', admin_sistema: 'Admin Sistema' };
            const funcRoleText = rolLabel[user.funcRole] || (user.role === 'admin' ? 'Admin' : '-');
            tableBody.innerHTML += `
                <tr>
                    <td>
                        <strong>${user.nombre || 'Sense nom'}</strong><br>
                        <small style="color:gray;">${user.email}</small>
                    </td>
                    <td><span style="font-size:0.8rem; padding:3px 8px; border-radius:12px; background:#f1f5f9; color:#475569; font-weight:600;">${funcRoleText}</span></td>
                    <td><span class="badge badge-${p.psy}">${p.psy.toUpperCase()}</span></td>
                    <td><span class="badge badge-${p.audit}">${p.audit.toUpperCase()}</span></td>
                    <td><span class="badge badge-${p.admin}">${p.admin.toUpperCase()}</span></td>
                    <td>
                        <button onclick="prepararEdicion('${docSnap.id}')" style="border:none; background:none; color:#2563eb; cursor:pointer; font-weight:600; margin-right:10px;">Editar</button>
                        <button onclick="eliminarUsuario('${docSnap.id}', '${user.nombre}')" style="border:none; background:none; color:#ef4444; cursor:pointer; font-weight:600;">Eliminar</button>
                    </td>
                </tr>`;
        });
    } catch (error) { console.error("Error:", error); }
}

// 2. GUARDAR (CREACIÓN AUTOMÁTICA)
document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    const nombre = document.getElementById('userName').value;
    const permisos = {
        psy: document.getElementById('p_psy').value,
        audit: document.getElementById('p_audit').value,
        admin: document.getElementById('p_admin').value
    };
    const funcRole = document.getElementById('userFuncRole')?.value || '';

    btn.disabled = true;
    btn.innerText = "Processant...";

    try {
        let finalUID = editId;

        if (!editId) {
            if (!pass || pass.length < 6) {
                throw new Error('La contrasenya és obligatòria i ha de tenir almenys 6 caràcters.');
            }
            btn.innerText = "Creant accés oficial...";
            // Instancia secundaria para registrar al usuario en Auth sin desloguear al Admin
            const tempAppName = `SecondaryApp-${Date.now()}`;
            const secondaryApp = initializeApp(firebaseConfig, tempAppName);
            try {
                const secondaryAuth = getAuth(secondaryApp);
                const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
                finalUID = userCred.user.uid;
                await signOut(secondaryAuth); // Limpiamos la conexión secundaria
            } finally {
                await deleteApp(secondaryApp).catch(() => {});
            }
        }

        btn.innerText = "Guardant dades...";
        // Derive role from permissions
        let derivedRole = 'user';
        if (permisos.admin && permisos.admin !== 'none') derivedRole = 'admin';
        else if (permisos.psy && permisos.psy !== 'none') derivedRole = 'psicolog';
        else if (permisos.audit && permisos.audit !== 'none') derivedRole = 'auditor';

        // Build roles array from functional role
        const roles = funcRole ? [funcRole] : [];
        if (derivedRole === 'admin' && !roles.includes('admin_sistema')) {
            // admin stays via permisos, no need to add to roles unless specified
        }

        const datos = {
            nombre, email, permisos,
            role: derivedRole,
            roles,
            funcRole,
            scope: getSelectedScope(),
            extraPerms: getExtraPerms(),
            pass: deleteField(),
            ultimaModificacion: serverTimestamp()
        };
        if (!editId) {
            datos.fechaAlta = serverTimestamp();
            datos.mustChangePassword = true; // Force password change on first login
        }

        await setDoc(doc(db, "usuarios", finalUID), datos, { merge: true });
        alert(editId ? "✅ Usuari actualitzat!" : "✅ Usuari creat en Auth i Firestore!");
        location.reload();
    } catch (error) {
        alert("❌ Error: " + error.message);
        btn.disabled = false;
        btn.innerText = "Guardar Usuari";
    }
});

// 3. ELIMINAR (Solo borra de Firestore)
window.eliminarUsuario = async (id, nombre) => {
    if (confirm(`Eliminar a ${nombre}? Això esborra els seus permisos a la BD.`)) {
        try {
            await deleteDoc(doc(db, "usuarios", id));
            alert("✅ Permisos eliminats. Recorda eliminar-lo manualment de 'Authentication' si vols revocar el login.");
            cargarUsuarios();
        } catch (error) { alert("Error: " + error.message); }
    }
};

// UI & Inicialización
window.prepararEdicion = async (id) => {
    editId = id;
    const docSnap = await getDoc(doc(db, "usuarios", id));
    if (docSnap.exists()) {
        const user = docSnap.data();
        document.getElementById('userName').value = user.nombre || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userPass').value = '';
        setPasswordFieldMode(true);
        const p = user.permisos || { psy: 'none', audit: 'none', admin: 'none' };
        document.getElementById('p_psy').value = p.psy;
        document.getElementById('p_audit').value = p.audit;
        document.getElementById('p_admin').value = p.admin;
        if (document.getElementById('userFuncRole')) {
            document.getElementById('userFuncRole').value = user.funcRole || '';
        }
        // Populate scope and extra perms
        await renderScopeCheckboxes(user.scope || []);
        setExtraPerms(user.extraPerms || {});
        const title = document.querySelector('#userModal h2') || document.getElementById('modalTitle');
        if (title) title.innerText = `Editar Usuari: "${user.nombre || user.email}"`;
        window.openModal();
    }
};

window.openModal = () => {
    if (!editId) setPasswordFieldMode(false);
    document.getElementById('userModal').style.display = 'flex';
};
window.closeModal = () => {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
    document.querySelector('#userModal h2').innerText = "Alta de Nou Usuari";
    editId = null;
    setPasswordFieldMode(false);
};

document.addEventListener('DOMContentLoaded', cargarUsuarios);
// usuarios-logic.js

// Forzamos que las funciones sean globales para que los botones onclick funcionen
// (window.openModal and window.closeModal already defined above)
