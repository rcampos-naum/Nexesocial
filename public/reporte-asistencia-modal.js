// reporte-asistencia-modal.js
// Modal de exportación de asistencia — formato matricial (participantes × días)

import { GruposLogic } from "./grupos-logic.js";

function getEntitatCfg() {
    try {
        const raw = JSON.parse(localStorage.getItem('nexe_config_entitat') || '{}');
        return {
            nom: raw.nom || 'NexeSocial',
            cif: raw.cif || '',
            telefon: raw.telefon || '',
            email: raw.email || '',
            adreca: raw.adreca || ''
        };
    } catch {
        return { nom: 'NexeSocial', cif: '', telefon: '', email: '', adreca: '' };
    }
}

/**
 * Inicializa todas las funciones del modal de reporte.
 * @param {Function} getGrupoActual — función que devuelve el objeto grupoActual
 * @param {Function} getGrupoId — función que devuelve el grupoId actual
 */
export function initModalReporte(getGrupoActual, getGrupoId) {

    // ── Abrir modal y generar reporte ─────────────────────────────────────────
    window.abrirModalReporte = async function () {
        const modal = document.getElementById("modal-reporte");
        const contenido = document.getElementById("contenido-reporte");
        const grupoActual = getGrupoActual();
        const grupoId = getGrupoId();

        if (!grupoActual || !grupoActual.beneficiarios) {
            contenido.innerHTML = "<p style='color:#ef4444'>Error: No se han cargado los datos del grupo. Por favor recarga la página.</p>";
            modal.style.display = "flex";
            return;
        }

        modal.style.display = "flex";
        contenido.innerHTML = "<p style='color:#94a3b8;text-align:center'>Generando reporte...</p>";

        try {
            const hoy = new Date();
            const reporte = await generarReporteMensual(grupoActual, grupoId, hoy.getMonth(), hoy.getFullYear());
            contenido.innerHTML = reporte;
        } catch (error) {
            console.error("Error al generar reporte:", error);
            contenido.innerHTML = "<p style='color:#ef4444'>Error al generar el reporte: " + error.message + "</p>";
        }
    };

    // ── Cerrar modal ──────────────────────────────────────────────────────────
    window.cerrarModalReporte = function () {
        document.getElementById("modal-reporte").style.display = "none";
    };

    // Cerrar al clic en el fondo
    document.getElementById("modal-reporte").addEventListener("click", function (e) {
        if (e.target === this) this.style.display = "none";
    });

    // ── Imprimir reporte ──────────────────────────────────────────────────────
    window.imprimirReporte = function () {
        const ent = getEntitatCfg();
        const entContact = [ent.cif, ent.telefon, ent.email].filter(Boolean).join(' · ');
        const contenido = document.getElementById("contenido-reporte").innerHTML;
        const html = [
            "<!DOCTYPE html><html><head>",
            "<meta charset='UTF-8'>",
            "<title>Reporte de Asistencia</title>",
            "<style>body{font-family:system-ui,sans-serif;padding:20px;}@media print{.no-print{display:none;}}</style>",
            "</head><body>",
            `<div style='margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:10px;'><div style='font-weight:800;font-size:20px;color:#0f172a;'>${ent.nom}</div><div style='font-size:12px;color:#64748b;'>${entContact}</div><div style='font-size:12px;color:#64748b;'>${ent.adreca || ''}</div></div>`,
            contenido,
            "</body></html>"
        ].join("");
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const ventana = window.open(url, "", "height=800,width=900");
        setTimeout(function () { ventana.print(); URL.revokeObjectURL(url); }, 500);
    };

    // ── Utilitat: carregar script extern de forma lazy ────────────────────────
    function carregarScript(src) {
        return new Promise(function (resolve, reject) {
            if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
            var s = document.createElement("script");
            s.src = src;
            s.onload = resolve;
            s.onerror = function () { reject(new Error("No s'ha pogut carregar: " + src)); };
            document.head.appendChild(s);
        });
    }

    // ── Exportar Excel (.xlsx) via SheetJS ────────────────────────────────────
    window.exportarExcel = async function () {
        const grupoActual = getGrupoActual();
        const nombreGrupo = (grupoActual && grupoActual.nombre) ? grupoActual.nombre : "Reporte";
        const hoy = new Date();

        try {
            GruposLogic.mostrarNotificacion("Generant Excel...", "success");
            await carregarScript("https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js");

            const XLSX = window.XLSX;
            const tablaHtml = document.querySelector("#contenido-reporte table");
            if (!tablaHtml) {
                GruposLogic.mostrarNotificacion("No hi ha dades per exportar", "error");
                return;
            }

            // Convertir la taula HTML a worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.table_to_sheet(tablaHtml);
            const ent = getEntitatCfg();
            const entContact = [ent.cif, ent.telefon, ent.email].filter(Boolean).join(' · ');
            const wsEnt = XLSX.utils.aoa_to_sheet([
                ['DADES ENTITAT'],
                ['Nom', ent.nom],
                ['Contacte', entContact],
                ['Adreça', ent.adreca || '']
            ]);

            // Amplada de columnes automàtica
            const cols = [];
            tablaHtml.querySelectorAll("tr:first-child th, tr:first-child td").forEach(function () {
                cols.push({ wch: 12 });
            });
            if (cols.length > 0) { cols[0].wch = 5; cols[1].wch = 28; cols[cols.length - 1].wch = 8; }
            ws["!cols"] = cols;

            XLSX.utils.book_append_sheet(wb, wsEnt, "Entitat");
            XLSX.utils.book_append_sheet(wb, ws, "Assistència");

            const nomFitxer = "assistencia_" + nombreGrupo.toLowerCase().replace(/\s+/g, "_") + "_" + hoy.toISOString().split("T")[0] + ".xlsx";
            XLSX.writeFile(wb, nomFitxer);

            GruposLogic.mostrarNotificacion("Excel descarregat correctament", "success");
        } catch (err) {
            console.error("Error exportar Excel:", err);
            GruposLogic.mostrarNotificacion("Error en generar l'Excel", "error");
        }
    };

    // ── Exportar PDF real via jsPDF + html2canvas ─────────────────────────────
    window.exportarPDF = async function () {
        const grupoActual = getGrupoActual();
        const nombreGrupo = (grupoActual && grupoActual.nombre) ? grupoActual.nombre : "Reporte";
        const hoy = new Date();

        try {
            GruposLogic.mostrarNotificacion("Generant PDF...", "success");
            await carregarScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
            await carregarScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");

            const element = document.getElementById("contenido-reporte");
            const canvas = await window.html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false
            });

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
            const ent = getEntitatCfg();
            const entContact = [ent.cif, ent.telefon, ent.email].filter(Boolean).join(' · ');

            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const imgW = pdfW - 20; // marges 10mm a cada costat
            const imgH = (canvas.height * imgW) / canvas.width;

            // Si la imatge és més alta que una pàgina, afegim pàgines
            let yOffset = 10;
            let heightLeft = imgH;
            const imgData = canvas.toDataURL("image/png");

            pdf.setFontSize(10);
            pdf.setTextColor(15, 23, 42);
            pdf.text(ent.nom, 10, 8);
            pdf.setFontSize(7);
            pdf.setTextColor(100, 116, 139);
            pdf.text(entContact, 10, 12);

            pdf.addImage(imgData, "PNG", 10, yOffset, imgW, imgH);
            heightLeft -= (pdfH - 20);

            while (heightLeft > 0) {
                pdf.addPage();
                yOffset = -(imgH - heightLeft) - 10;
                pdf.addImage(imgData, "PNG", 10, yOffset, imgW, imgH);
                heightLeft -= (pdfH - 20);
            }

            const nomFitxer = "assistencia_" + nombreGrupo.toLowerCase().replace(/\s+/g, "_") + "_" + hoy.toISOString().split("T")[0] + ".pdf";
            pdf.save(nomFitxer);

            GruposLogic.mostrarNotificacion("PDF descarregat correctament", "success");
        } catch (err) {
            console.error("Error exportar PDF:", err);
            GruposLogic.mostrarNotificacion("Error en generar el PDF", "error");
        }
    };
}

// ── Generación del reporte matricial (participants × dies) ───────────────────
async function generarReporteMensual(grupoActual, grupoId, mes, anio) {
    if (!grupoActual || !grupoActual.nombre) {
        throw new Error("Datos del grupo no disponibles");
    }

    const beneficiaris = grupoActual.beneficiarios || [];
    if (beneficiaris.length === 0) {
        return buildEmptyState("No hi ha beneficiaris assignats en aquest grup.");
    }

    const asistencias = await GruposLogic.obtenerAsistenciasDelMes(grupoId, mes, anio);

    if (!asistencias || asistencias.length === 0) {
        return buildEmptyState("No hi ha registres d'assistència per a aquest mes.");
    }

    // ── Obtenir tots els dies de sessió del mes (ordenats) ────────────────────
    const diesSet = new Set();
    asistencias.forEach(function (r) { if (r.fecha) diesSet.add(r.fecha); });
    const dies = Array.from(diesSet).sort();

    // ── Construir matriu participantId → data → estat ─────────────────────────
    const matriu = {};
    beneficiaris.forEach(function (b) {
        if (b && b.beneficiarioId) matriu[b.beneficiarioId] = {};
    });
    asistencias.forEach(function (r) {
        if (matriu[r.beneficiarioId] !== undefined) {
            matriu[r.beneficiarioId][r.fecha] = r.estado || "";
        }
    });

    // ── Format de data → dia (número) ────────────────────────────────────────
    function diaNum(fecha) {
        var parts = fecha.split("-");
        return parseInt(parts[2], 10);
    }

    // ── Noms de mes en català ─────────────────────────────────────────────────
    var mesos = ["GENER","FEBRER","MARÇ","ABRIL","MAIG","JUNY",
                 "JULIOL","AGOST","SETEMBRE","OCTUBRE","NOVEMBRE","DESEMBRE"];
    var mesNomCat = mesos[mes] + " " + anio;
    var actividadNom = grupoActual.actividadNombre || grupoActual.actividad?.nombre || "";

    var nSessions = dies.length;

    // ═══════════════════════════════════════════
    // CAPÇALERA
    // ═══════════════════════════════════════════
    var html = "";
    html += "<div style='font-family:Arial,sans-serif;border:2px solid #0f172a;border-radius:8px;overflow:hidden;'>";

    // Franja superior
    html += "<div style='background:#0f172a;padding:14px 20px;display:flex;justify-content:space-between;align-items:center'>";
    html += "<div style='color:white'>";
    html += "<span style='font-size:1.15rem;font-weight:700;letter-spacing:0.5px'>FULL DE CONTROL D'ASSIST\u00c8NCIA</span>";
    html += "</div>";
    html += "<div style='color:rgba(255,255,255,0.7);font-size:0.8rem;text-align:right'>";
    html += "Generat: " + new Date().toLocaleDateString("ca-ES") + "</div>";
    html += "</div>";

    // Metadades grup/activitat/mes
    html += "<div style='background:#f8fafc;border-bottom:2px solid #e2e8f0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:0'>";
    html += metaCell("Grup", grupoActual.nombre + " (" + (grupoActual.idGrupo || "") + ")");
    html += metaCell("Activitat", actividadNom || "—");
    html += metaCell("Mes", mesNomCat, true);
    html += "</div>";

    // ═══════════════════════════════════════════
    // TAULA MATRICIAL
    // ═══════════════════════════════════════════
    html += "<div style='overflow-x:auto'>";
    html += "<table style='width:100%;border-collapse:collapse;font-size:0.82rem;min-width:" + (280 + dies.length * 42) + "px'>";

    // Capçalera: Nº | Nom | dies... | %
    html += "<thead>";
    html += "<tr style='background:#1e293b;color:white'>";
    html += "<th style='padding:8px 6px;text-align:center;width:36px;border-right:1px solid #334155'>Nº</th>";
    html += "<th style='padding:8px 12px;text-align:left;min-width:160px;border-right:1px solid #334155'>PARTICIPANT</th>";
    for (var di = 0; di < dies.length; di++) {
        html += "<th style='padding:8px 4px;text-align:center;width:38px;border-right:1px solid #334155'>" + diaNum(dies[di]) + "</th>";
    }
    html += "<th style='padding:8px 6px;text-align:center;width:54px;background:#334155'>%</th>";
    html += "</tr>";
    html += "</thead>";

    // Files de participants
    html += "<tbody>";
    var totalPresPerDia = {};
    for (var di2 = 0; di2 < dies.length; di2++) totalPresPerDia[dies[di2]] = 0;

    var sumaPercentatges = 0;
    var numParticipants = 0;

    beneficiaris.forEach(function (b, idx) {
        if (!b || !b.beneficiarioId) return;
        numParticipants++;
        var fila = matriu[b.beneficiarioId] || {};
        var presentes = 0, justificades = 0, totalSessions = 0;

        dies.forEach(function (d) {
            if (fila[d]) {
                totalSessions++;
                if (fila[d] === "P") presentes++;
                else if (fila[d] === "FJ") justificades++;
                if (fila[d] === "P") totalPresPerDia[d]++;
            }
        });

        var pct = totalSessions > 0 ? Math.round(((presentes + justificades) / totalSessions) * 100) : 0;
        sumaPercentatges += pct;

        var bgFila = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
        var pctColor = pct >= 80 ? "#166534" : pct >= 60 ? "#92400e" : "#991b1b";
        var pctBg    = pct >= 80 ? "#dcfce7" : pct >= 60 ? "#fef3c7" : "#fee2e2";

        html += "<tr style='background:" + bgFila + ";border-bottom:1px solid #e2e8f0'>";
        html += "<td style='padding:7px 6px;text-align:center;color:#64748b;font-weight:600;border-right:1px solid #e2e8f0'>" + (idx + 1) + "</td>";
        html += "<td style='padding:7px 12px;color:#0f172a;font-weight:500;border-right:1px solid #e2e8f0'>" + (b.nombre || "—") + "</td>";

        dies.forEach(function (d) {
            var estat = fila[d] || "";
            var cellBg = "transparent", cellColor = "#94a3b8", cellText = "";
            if (estat === "P")  { cellBg = "#dcfce7"; cellColor = "#166534"; cellText = "P"; }
            if (estat === "F")  { cellBg = "#fee2e2"; cellColor = "#991b1b"; cellText = "F"; }
            if (estat === "FJ") { cellBg = "#fef3c7"; cellColor = "#92400e"; cellText = "FJ"; }
            html += "<td style='padding:7px 4px;text-align:center;background:" + cellBg + ";color:" + cellColor + ";font-weight:700;border-right:1px solid #e2e8f0;font-size:0.78rem'>" + cellText + "</td>";
        });

        html += "<td style='padding:7px 6px;text-align:center;background:" + pctBg + ";color:" + pctColor + ";font-weight:700'>" + (totalSessions > 0 ? pct + "%" : "—") + "</td>";
        html += "</tr>";
    });

    // Fila TOTAL (presents per dia)
    var totalPctGlobal = numParticipants > 0 ? Math.round(sumaPercentatges / numParticipants) : 0;
    html += "<tr style='background:#f1f5f9;border-top:2px solid #0f172a;font-weight:700'>";
    html += "<td colspan='2' style='padding:8px 12px;color:#0f172a;text-align:left;border-right:1px solid #cbd5e1;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.5px'>TOTAL</td>";
    dies.forEach(function (d) {
        var cnt = totalPresPerDia[d];
        var pctDia = beneficiaris.length > 0 ? Math.round((cnt / beneficiaris.length) * 100) : 0;
        var col = pctDia >= 80 ? "#166534" : pctDia >= 60 ? "#92400e" : "#991b1b";
        html += "<td style='padding:8px 4px;text-align:center;color:" + col + ";border-right:1px solid #cbd5e1'>" + cnt + "</td>";
    });
    var tpBg = totalPctGlobal >= 80 ? "#dcfce7" : totalPctGlobal >= 60 ? "#fef3c7" : "#fee2e2";
    var tpCol = totalPctGlobal >= 80 ? "#166534" : totalPctGlobal >= 60 ? "#92400e" : "#991b1b";
    html += "<td style='padding:8px 6px;text-align:center;background:" + tpBg + ";color:" + tpCol + ";font-weight:700'>" + totalPctGlobal + "%</td>";
    html += "</tr>";

    html += "</tbody></table></div>";

    // ═══════════════════════════════════════════
    // LLEGENDA
    // ═══════════════════════════════════════════
    html += "<div style='padding:12px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;gap:20px;flex-wrap:wrap;font-size:0.8rem'>";
    html += llegendaItem("#dcfce7", "#166534", "P = Present");
    html += llegendaItem("#fee2e2", "#991b1b", "F = Falta");
    html += llegendaItem("#fef3c7", "#92400e", "FJ = Falta Justificada");
    html += "<span style='color:#64748b;margin-left:auto'>" + nSessions + " sessions registrades</span>";
    html += "</div>";

    html += "</div>"; // tanca el contenidor principal
    return html;
}

function metaCell(label, value, last) {
    var border = last ? "" : "border-right:1px solid #e2e8f0;";
    return "<div style='padding:10px 16px;" + border + "'>"  
        + "<div style='font-size:0.7rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px'>" + label + "</div>"
        + "<div style='font-size:0.9rem;font-weight:600;color:#0f172a;margin-top:2px'>" + value + "</div>"
        + "</div>";
}

function llegendaItem(bg, color, text) {
    return "<span style='display:inline-flex;align-items:center;gap:6px'>"
        + "<span style='display:inline-block;width:20px;height:20px;background:" + bg + ";border-radius:4px;border:1px solid " + color + ";color:" + color + ";font-weight:700;text-align:center;line-height:20px;font-size:0.73rem'>" + text.split(" ")[0] + "</span>"
        + "<span style='color:#475569'>" + text + "</span>"
        + "</span>";
}

function buildEmptyState(mensaje) {
    return "<div style='padding:40px;text-align:center;color:#94a3b8'><p>" + mensaje + "</p></div>";
}
