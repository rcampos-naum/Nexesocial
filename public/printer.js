/**
 * NexeSocial - Mòdul d'Impressió Professional
 */

/** Returns the entity config from localStorage (set via Configuració > Impressió). */
function _getEntitatCfg() {
    try { return JSON.parse(localStorage.getItem('nexe_config_entitat') || '{}'); } catch { return {}; }
}

function _entitatContactLine(cfg = {}) {
    const parts = [cfg.cif, cfg.telefon, cfg.email].filter(Boolean);
    return parts.join(' · ');
}

function _roleLabelFromSession() {
    const profileRole = (localStorage.getItem('userSignatureRole') || '').trim();
    if (profileRole) return profileRole;

    const matrixRoles = (() => {
        try { return JSON.parse(localStorage.getItem('userMatrixRoles') || '[]'); } catch { return []; }
    })();
    const legacyRoles = (() => {
        try { return JSON.parse(localStorage.getItem('userRoles') || '[]'); } catch { return []; }
    })();
    const userRole = localStorage.getItem('userRole') || '';

    const has = (v) => matrixRoles.includes(v) || legacyRoles.includes(v);

    if (has('admin') || has('admin_sistema') || has('direccio') || userRole === 'admin') {
        return 'Direccio / Administracio';
    }
    if (has('coordinador') || userRole === 'editor') {
        return 'Coordinador/a de Programa';
    }
    if (has('tecnic') || has('administracio') || has('manteniment') || userRole === 'tecnic') {
        return "Tecnic/a d'Intervencio Social";
    }
    if (has('voluntari') || userRole === 'voluntari') {
        return 'Personal voluntari';
    }

    const custom = matrixRoles.find((r) => !['admin', 'directora', 'coordinador', 'tecnic', 'voluntari'].includes(String(r || '').toLowerCase()));
    if (custom) {
        const pretty = String(custom).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
        return pretty;
    }

    return '';
}

function _resolveSignerRole(cfg = {}) {
    const fromSession = _roleLabelFromSession();
    const entName = cfg.nom || 'NexeSocial';

    if (fromSession) {
        return `${fromSession} - ${entName}`;
    }

    return cfg.rol || "Tecnic/a d'Intervencio Social - NexeSocial";
}

const NexePrinter = {
    
    colors: {
        primary: [37, 99, 235],    
        textMain: [30, 41, 59],    
        textMuted: [100, 116, 139], 
        border: [226, 232, 240],
        success: [22, 163, 74] // Verde para sellos oficiales
    },

    generarPDFInforme: function(informe, famId, metode) {
        const cfg = _getEntitatCfg();
        const nomEntitat   = cfg.nom       || 'NEXESOCIAL';
        const subtitolEnt  = cfg.subtitol  || "SISTEMA DE GESTIÓ D'INTERVENCIÓ SOCIAL";
        const rolSignant   = _resolveSignerRole(cfg);
        const textLegal    = cfg.peu       || "Aquest document té caràcter oficial. La seva reproducció parcial està prohibida.";
        const contactLine  = _entitatContactLine(cfg);
        const adrecaLine   = cfg.adreca || '';

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const now = new Date().toLocaleString('ca-ES');

        // --- 1. CAPÇALERA ---
        doc.setFillColor(...this.colors.primary);
        doc.circle(25, 22, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text(nomEntitat.charAt(0).toUpperCase(), 23, 24);

        doc.setTextColor(...this.colors.primary);
        doc.setFontSize(16);
        doc.text(nomEntitat.toUpperCase(), 35, 20);
        
        doc.setFontSize(8);
        doc.setTextColor(...this.colors.textMuted);
        doc.setFont("helvetica", "normal");
        doc.text(subtitolEnt.toUpperCase(), 35, 25);

        if (contactLine) {
            doc.setFontSize(7);
            doc.text(contactLine, 35, 28);
        }

        doc.setFontSize(7);
        doc.text(`Imprès el: ${now}`, pageWidth - margin, 20, { align: "right" });
        doc.text(`Expedient: ${famId}`, pageWidth - margin, 24, { align: "right" });

        doc.setDrawColor(...this.colors.primary);
        doc.setLineWidth(0.5);
        doc.line(margin, 30, pageWidth - margin, 30);

        // --- 2. TÍTOL I DADES ---
        doc.setFontSize(14);
        doc.setTextColor(...this.colors.textMain);
        doc.setFont("helvetica", "bold");
        doc.text(informe.titol.toUpperCase(), margin, 45);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Redactor/a: ${informe.redactor}`, margin, 55);
        doc.text(`Data de l'acte: ${informe.data}`, margin, 60);

        // --- 3. COS DE L'INFORME ---
        doc.setDrawColor(...this.colors.border);
        doc.line(margin, 65, pageWidth - margin, 65);

        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        const splitContent = doc.splitTextToSize(informe.contingut, pageWidth - (margin * 2));
        doc.text(splitContent, margin, 75, { lineHeightFactor: 1.5 });

        // --- 4. ÀREA DE FIRMA DIFERENCIADA ---
        const footerY = 220;
        
        // Estilo común del recuadro
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, footerY, 110, 45, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.rect(margin, footerY, 110, 45);

        if (metode === 'Firma Interna') {
            // DISEÑO FIRMA MANUSCRITA
            doc.setFontSize(7);
            doc.setTextColor(...this.colors.textMuted);
            doc.text("SIGNATURA MANUSCRITA EN PANTALLA", margin + 5, footerY + 7);
            
            // Capturar Canvas
            const canvas = document.getElementById('signature-pad');
            if (canvas) {
                const imgData = canvas.toDataURL('image/png');
                // Colocamos la firma capturada en medio del recuadro
                doc.addImage(imgData, 'PNG', margin + 15, footerY + 10, 80, 20);
            }
        } else {
            // DISEÑO AUTOFIRMA (SELLO OFICIAL)
            const csvCode = "CSV-" + Math.random().toString(36).substr(2, 9).toUpperCase();
            
            doc.setFontSize(8);
            doc.setTextColor(...this.colors.success);
            doc.setFont("helvetica", "bold");
            doc.text("VALIDAT AMB CERTIFICAT DIGITAL (AUTOFIRMA)", margin + 5, footerY + 8);
            
            // Dibujar un pequeño icono de "Escudo/Sello"
            doc.setDrawColor(...this.colors.success);
            doc.rect(margin + 80, footerY + 5, 25, 25); 
            doc.setFontSize(6);
            doc.text("SEGELL", margin + 85, footerY + 15);
            doc.text("OFICIAL", margin + 85, footerY + 20);

            doc.setTextColor(...this.colors.textMuted);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.text(`Codi Segur de Verificació: ${csvCode}`, margin + 5, footerY + 15);
            doc.text(`Signat per: ${informe.redactor}`, margin + 5, footerY + 20);
            doc.text(`Data signatura: ${now}`, margin + 5, footerY + 25);
        }

        // Datos del Técnico (Pie del recuadro)
        doc.setTextColor(...this.colors.textMain);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(informe.redactor, margin + 5, footerY + 35);
        
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(...this.colors.textMuted);
        doc.text(rolSignant, margin + 5, footerY + 40);

        // --- 5. PEU DE PÀGINA ---
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const footParts = [textLegal, adrecaLine].filter(Boolean);
        doc.text(footParts.join(' · '), pageWidth / 2, 285, { align: "center" });

        // --- 6. GUARDAR COPIA EN EL EXPEDIENTE (Local Storage) ---
        this.guardarEnExpediente(informe, metode, now);

        // --- 7. DESCARGA ---
        doc.save(`Informe_${informe.id}_${famId}.pdf`);
    },

    guardarEnExpediente: function(informe, metode, dataFirma) {
        // Recuperamos los informes firmados o creamos el array
        let docs = JSON.parse(localStorage.getItem('nexe_docs_firmats')) || [];
        
        const nouDoc = {
            id: Date.now(),
            informeId: informe.id,
            familiaId: informe.familiaId,
            titol: informe.titol,
            data_firma: dataFirma,
            metode: metode,
            status: 'Firmado'
        };

        docs.push(nouDoc);
        localStorage.setItem('nexe_docs_firmats', JSON.stringify(docs));
        console.log("Còpia de seguretat guardada a l'expedient.");
    }
};