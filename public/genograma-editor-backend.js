// ============================================================================
// GENOGRAMA EDITOR - DATABASE & LOGIC LAYER (genograma-editor.js)
// Family Tree Management & Visualization
// ============================================================================

import { db, auth } from '../firebase-config.js';
import { 
    collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc,
    query, where, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ============================================================================
// ESTRUCTURA DE DATOS
// ============================================================================

class Persona {
    constructor(datos) {
        this.id = datos.id || Date.now().toString();
        this.nombre = datos.nombre;
        this.apellidos = datos.apellidos || '';
        this.fechaNacimiento = datos.fechaNacimiento || null;
        this.género = datos.género || 'otro';
        this.estado = datos.estado || 'vivo'; // vivo, fallecido, desconocido
        this.notas = datos.notas || '';
        this.x = datos.x || 0;
        this.y = datos.y || 0;
    }

    getNombreCompleto() {
        return `${this.nombre} ${this.apellidos}`.trim();
    }

    getEdad() {
        if (!this.fechaNacimiento) return null;
        const hoy = new Date();
        const fecha = new Date(this.fechaNacimiento);
        let edad = hoy.getFullYear() - fecha.getFullYear();
        const m = hoy.getMonth() - fecha.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) edad--;
        return edad;
    }
}

class Relación {
    constructor(datos) {
        this.id = datos.id || Date.now().toString();
        this.tipo = datos.tipo; // 'matrimonio', 'hijo', 'hermano', etc
        this.persona1Id = datos.persona1Id;
        this.persona2Id = datos.persona2Id;
        this.fechaInicio = datos.fechaInicio || null;
        this.fechaFin = datos.fechaFin || null;
        this.estado = datos.estado || 'activa';
    }
}

// ============================================================================
// GENOGRAMA DATABASE
// ============================================================================
export const GenogramaDB = {

    // Crear nuevo genograma
    async crear(familiaId, datos) {
        const docRef = await addDoc(collection(db, 'genogramas/documentos'), {
            familiaId,
            nombre: datos.nombre || `Genograma ${familiaId}`,
            descripción: datos.descripción || '',
            fechaCreación: Timestamp.now(),
            personas: [],
            relaciones: [],
            creadorId: auth.currentUser?.uid,
            estado: 'borrador'
        });
        return docRef.id;
    },

    // Obtener genograma completo
    async obtener(genogramaId) {
        const docRef = doc(db, 'genogramas/documentos', genogramaId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },

    // Actualizar genograma
    async actualizar(genogramaId, datos) {
        const docRef = doc(db, 'genogramas/documentos', genogramaId);
        await updateDoc(docRef, {
            ...datos,
            ultimaActualización: Timestamp.now()
        });
    },

    // Obtener genogramas de familia
    async obtenerPorFamilia(familiaId) {
        const q = query(
            collection(db, 'genogramas/documentos'),
            where('familiaId', '==', familiaId)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};

// ============================================================================
// PERSONAS EN GENOGRAMA
// ============================================================================
export const PersonasGenogramaDB = {

    // Agregar persona al genograma
    async agregar(genogramaId, personaData) {
        const persona = new Persona(personaData);
        const genograma = await GenogramaDB.obtener(genogramaId);
        
        genograma.personas.push(persona);
        
        await GenogramaDB.actualizar(genogramaId, {
            personas: genograma.personas
        });

        return persona.id;
    },

    // Actualizar persona
    async actualizar(genogramaId, personaId, datos) {
        const genograma = await GenogramaDB.obtener(genogramaId);
        const personaIndex = genograma.personas.findIndex(p => p.id === personaId);

        if (personaIndex !== -1) {
            genograma.personas[personaIndex] = {
                ...genograma.personas[personaIndex],
                ...datos
            };

            await GenogramaDB.actualizar(genogramaId, {
                personas: genograma.personas
            });
        }
    },

    // Reorganizar posición (para visualización)
    async reorganizarPosición(genogramaId, personaId, x, y) {
        await this.actualizar(genogramaId, personaId, { x, y });
    },

    // Eliminar persona
    async eliminar(genogramaId, personaId) {
        const genograma = await GenogramaDB.obtener(genogramaId);
        
        // Eliminar persona
        genograma.personas = genograma.personas.filter(p => p.id !== personaId);
        
        // Eliminar relaciones asociadas
        genograma.relaciones = genograma.relaciones.filter(
            r => r.persona1Id !== personaId && r.persona2Id !== personaId
        );

        await GenogramaDB.actualizar(genogramaId, {
            personas: genograma.personas,
            relaciones: genograma.relaciones
        });
    },

    // Obtener personas del genograma
    async listar(genogramaId) {
        const genograma = await GenogramaDB.obtener(genogramaId);
        return genograma?.personas || [];
    }
};

// ============================================================================
// RELACIONES EN GENOGRAMA
// ============================================================================
export const RelacionesGenogramaDB = {

    // Agregamos relación entre dos personas
    async agregar(genogramaId, relacionData) {
        const relación = new Relación(relacionData);
        const genograma = await GenogramaDB.obtener(genogramaId);

        genograma.relaciones.push(relación);

        await GenogramaDB.actualizar(genogramaId, {
            relaciones: genograma.relaciones
        });

        return relación.id;
    },

    // Actualizar relación
    async actualizar(genogramaId, relaciónId, datos) {
        const genograma = await GenogramaDB.obtener(genogramaId);
        const relaciónIndex = genograma.relaciones.findIndex(r => r.id === relaciónId);

        if (relaciónIndex !== -1) {
            genograma.relaciones[relaciónIndex] = {
                ...genograma.relaciones[relaciónIndex],
                ...datos
            };

            await GenogramaDB.actualizar(genogramaId, {
                relaciones: genograma.relaciones
            });
        }
    },

    // Eliminar relación
    async eliminar(genogramaId, relaciónId) {
        const genograma = await GenogramaDB.obtener(genogramaId);
        genograma.relaciones = genograma.relaciones.filter(r => r.id !== relaciónId);

        await GenogramaDB.actualizar(genogramaId, {
            relaciones: genograma.relaciones
        });
    },

    // Obtener relaciones del genograma
    async listar(genogramaId) {
        const genograma = await GenogramaDB.obtener(genogramaId);
        return genograma?.relaciones || [];
    },

    // Obtener relaciones de una persona
    async obtenerDelPersona(genogramaId, personaId) {
        const genograma = await GenogramaDB.obtener(genogramaId);
        return (genograma?.relaciones || []).filter(
            r => r.persona1Id === personaId || r.persona2Id === personaId
        );
    },

    // Crear matrimonio
    async crearMatrimonio(genogramaId, persona1Id, persona2Id, datos = {}) {
        return this.agregar(genogramaId, {
            tipo: 'matrimonio',
            persona1Id,
            persona2Id,
            fechaInicio: datos.fechaInicio || null,
            fechaFin: datos.fechaFin || null,
            estado: datos.estado || 'activa'
        });
    },

    // Crear relación hijo
    async crearHijo(genogramaId, padrePid, madrePid, hijoPid) {
        const relaciones = [];
        
        // Relación con padre
        relaciones.push(await this.agregar(genogramaId, {
            tipo: 'padre-hijo',
            persona1Id: padrePid,
            persona2Id: hijoPid
        }));

        // Relación con madre
        relaciones.push(await this.agregar(genogramaId, {
            tipo: 'madre-hijo',
            persona1Id: madrePid,
            persona2Id: hijoPid
        }));

        return relaciones;
    },

    // Crear relación hermanos
    async crearHermanos(genogramaId, hermano1Id, hermano2Id) {
        return this.agregar(genogramaId, {
            tipo: 'hermanos',
            persona1Id: hermano1Id,
            persona2Id: hermano2Id
        });
    }
};

// ============================================================================
// VISUALIZACIÓN & LAYOUT
// ============================================================================
export const GenogramaLayout = {

    // Calcular posiciones automáticas
    calcularLayout(personas, relaciones, ancho = 1200, alto = 800) {
        const nivelAnchura = 300;
        const nivelAltura = 200;

        // Agrupar personas por nivel (generaciones)
        const niveles = this._calcularNiveles(relaciones, personas);

        personas.forEach(persona => {
            const nivel = niveles[persona.id] || 0;
            const posiciónEnNivel = this._contarPersonasEnNivel(personas, niveles, nivel);

            persona.y = nivel * nivelAltura + 100;
            persona.x = posiciónEnNivel * nivelAnchura + 150;
        });

        return personas;
    },

    _calcularNiveles(relaciones, personas) {
        const niveles = {};
        const visitados = new Set();

        // Encontrar raíces (personas sin padre)
        const sinPadre = personas.filter(p =>
            !relaciones.some(r => 
                r.tipo.includes('hijo') && r.persona2Id === p.id
            )
        );

        const cola = sinPadre.map(p => ({ id: p.id, nivel: 0 }));

        while (cola.length > 0) {
            const { id, nivel } = cola.shift();

            if (visitados.has(id)) continue;
            visitados.add(id);
            niveles[id] = nivel;

            // Encontrar hijos
            const hijos = relaciones
                .filter(r => r.tipo.includes('hijo') && r.persona1Id === id)
                .map(r => r.persona2Id);

            hijos.forEach(hijoId => {
                if (!visitados.has(hijoId)) {
                    cola.push({ id: hijoId, nivel: nivel + 1 });
                }
            });
        }

        return niveles;
    },

    _contarPersonasEnNivel(personas, niveles, nivel) {
        let contador = 0;
        for (const persona of personas) {
            if (niveles[persona.id] === nivel) {
                if (persona.x === undefined) contador++;
            }
        }
        return contador;
    }
};

// ============================================================================
// EXPORTACIÓN
// ============================================================================
export const GenogramaExport = {

    // Exportar a JSON
    async exportarJSON(genogramaId) {
        const genograma = await GenogramaDB.obtener(genogramaId);
        return JSON.stringify(genograma, null, 2);
    },

    // Exportar a CSV (formato simplificado)
    async exportarCSV(genogramaId) {
        const genograma = await GenogramaDB.obtener(genogramaId);
        
        let csv = 'Nombre,Apellidos,Fecha Nacimiento,Género,Estado,Notas\n';
        
        genograma.personas.forEach(p => {
            csv += `"${p.nombre}","${p.apellidos || ''}","${p.fechaNacimiento || ''}","${p.género}","${p.estado}","${p.notas || ''}"\n`;
        });

        return csv;
    },

    // Exportar a PDF (requiere librería externa)
    async exportarPDF(genogramaId) {
        const genograma = await GenogramaDB.obtener(genogramaId);
        const ent = (() => {
            try {
                const raw = JSON.parse(localStorage.getItem('nexe_config_entitat') || '{}');
                return {
                    nom: raw.nom || 'NexeSocial',
                    cif: raw.cif || '',
                    telefon: raw.telefon || '',
                    email: raw.email || ''
                };
            } catch {
                return { nom: 'NexeSocial', cif: '', telefon: '', email: '' };
            }
        })();
        const entContact = [ent.cif, ent.telefon, ent.email].filter(Boolean).join(' · ');
        
        // Nota: Requiere jsPDF importado en HTML
        if (!window.jsPDF) {
            console.error('jsPDF no está cargado');
            return null;
        }

        const doc = new window.jsPDF();
        doc.setFontSize(10);
        doc.text(ent.nom, 10, 10);
        doc.setFontSize(8);
        if (entContact) doc.text(entContact, 10, 15);
        doc.setFontSize(11);
        doc.text(`Genograma: ${genograma.nombre}`, 10, 24);
        doc.text(`Familia ID: ${genograma.familiaId}`, 10, 32);

        let yPos = 42;
        genograma.personas.forEach(persona => {
            doc.text(`${persona.getNombreCompleto()} (${persona.género})`, 10, yPos);
            yPos += 7;
            if (yPos > 270) {
                doc.addPage();
                yPos = 15;
            }
        });

        return doc;
    }
};

// ============================================================================
// LÓGICA DE UI
// ============================================================================
export const GenogramaLogic = {

    genogramaActual: null,
    personasSeleccionadas: [],

    async init(genogramaId) {
        console.log('🔴 Inicializando Genograma Editor...');
        this.genogramaActual = await GenogramaDB.obtener(genogramaId);
        console.log('✅ Genograma cargado:', this.genogramaActual);
    },

    async agregarPersona(datos) {
        const personaId = await PersonasGenogramaDB.agregar(
            this.genogramaActual.id,
            datos
        );
        this.genogramaActual.personas = await PersonasGenogramaDB.listar(
            this.genogramaActual.id
        );
        console.log('✅ Persona agregada:', personaId);
        return personaId;
    },

    async agregarRelación(relacionData) {
        const relaciónId = await RelacionesGenogramaDB.agregar(
            this.genogramaActual.id,
            relacionData
        );
        this.genogramaActual.relaciones = await RelacionesGenogramaDB.listar(
            this.genogramaActual.id
        );
        console.log('✅ Relación agregada:', relaciónId);
        return relaciónId;
    },

    async redibujar() {
        // Calcular nuevo layout
        const personas = GenogramaLayout.calcularLayout(
            this.genogramaActual.personas,
            this.genogramaActual.relaciones
        );

        this.genogramaActual.personas = personas;
        await GenogramaDB.actualizar(this.genogramaActual.id, {
            personas
        });

        console.log('✅ Genograma redibujado');
    },

    async guardar() {
        await GenogramaDB.actualizar(this.genogramaActual.id, {
            personas: this.genogramaActual.personas,
            relaciones: this.genogramaActual.relaciones,
            estado: 'guardado'
        });
        console.log('✅ Genograma guardado');
    },

    async exportar(formato = 'json') {
        if (formato === 'json') {
            return await GenogramaExport.exportarJSON(this.genogramaActual.id);
        } else if (formato === 'csv') {
            return await GenogramaExport.exportarCSV(this.genogramaActual.id);
        } else if (formato === 'pdf') {
            return await GenogramaExport.exportarPDF(this.genogramaActual.id);
        }
    }
};

export default {
    Persona,
    Relación,
    GenogramaDB,
    PersonasGenogramaDB,
    RelacionesGenogramaDB,
    GenogramaLayout,
    GenogramaExport,
    GenogramaLogic
};

// Global access
window.GenogramaLogic = GenogramaLogic;
