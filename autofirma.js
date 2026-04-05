/**
 * NexeSocial - Conector AutoFirma Pro (Fix NullPointer + Iconos Animados Sidebar)
 */
const AutoFirmaConnector = {
    PROTOCOLO: "afirma://sign",

    signarInforme: function(informe, famId) {
        this.mostrarEstado('ESPERA');

        const dadesBase64 = btoa(unescape(encodeURIComponent(informe.contingut)));
        
        /**
         * CLAVE PARA EL FIX:
         * 'savemode=local' -> Evita el NullPointerException al no buscar servlets de red.
         * 'mode=implicit' -> Define el tipo de firma PAdES estándar.
         */
        const extraProps = btoa("mode=implicit\nsavemode=local");

        const params = {
            op: "sign",
            algorithm: "SHA256withRSA", // Nombre completo para evitar ParameterException
            format: "PAdES",
            dat: dadesBase64,
            properties: extraProps
        };

        // Construcción de la URL limpia
        const url = `${this.PROTOCOLO}?` +
                    `op=${params.op}` +
                    `&algorithm=${params.algorithm}` +
                    `&format=${params.format}` +
                    `&dat=${params.dat}` +
                    `&properties=${params.properties}`;

        window.location.href = url;

        // Detectar retorno al navegador tras la firma
        const detectarRetorno = () => {
            window.removeEventListener('focus', detectarRetorno);
            setTimeout(() => {
                this.mostrarEstado('CONFIRMACION', () => {
                    this.ocultarModal();
                    NexePrinter.generarPDFInforme(informe, famId, 'Autofirma');
                });
            }, 600);
        };
        window.addEventListener('focus', detectarRetorno);
    },

    mostrarEstado: function(estado, callback) {
        let container = document.getElementById('af-modal-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'af-modal-container';
            Object.assign(container.style, {
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center',
                alignItems: 'center', zIndex: 99999, backdropFilter: 'blur(12px)'
            });
            document.body.appendChild(container);
        }

        let content = "";

        if (estado === 'ESPERA') {
            content = `
                <div class="nexe-modal-card">
                    <div class="af-spinner"></div>
                    <h3 class="nexe-title">Preparant Firma</h3>
                    <p class="nexe-text">Tria el certificat a la finestra d'AutoFirma per continuar.</p>
                </div>`;
        } 
        else if (estado === 'CONFIRMACION') {
            content = `
                <div class="nexe-modal-card animate-in">
                    <div class="nexe-icon-box success">
                        <svg class="nexe-svg-icon" viewBox="0 0 52 52">
                            <circle class="nexe-circle" cx="26" cy="26" r="25" fill="none"/>
                            <path class="nexe-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                        </svg>
                    </div>
                    <h3 class="nexe-title">Procés Finalitzat?</h3>
                    <p class="nexe-text">Si has desat el fitxer correctament, prem el botó per generar l'informe a NexeSocial.</p>
                    <div class="nexe-actions">
                        <button id="btn-af-success" class="btn-nexe-primary">Generar PDF</button>
                        <button id="btn-af-fail" class="btn-nexe-ghost">Error / Cancel·lar</button>
                    </div>
                </div>`;
        }
        else if (estado === 'ERROR') {
            content = `
                <div class="nexe-modal-card animate-in">
                    <div class="nexe-icon-box danger">
                        <svg class="nexe-svg-icon" viewBox="0 0 52 52">
                            <circle class="nexe-circle" cx="26" cy="26" r="25" fill="none"/>
                            <path class="nexe-path" fill="none" d="M16 16 36 36 M36 16 16 36"/>
                        </svg>
                    </div>
                    <h3 class="nexe-title">Firma Fallida</h3>
                    <p class="nexe-text">S'ha detectat un error en l'aplicació o s'ha cancel·lat la selecció.</p>
                    <button onclick="AutoFirmaConnector.ocultarModal()" class="btn-nexe-dark">Tancar</button>
                </div>`;
        }

        container.innerHTML = content;
        if (estado === 'CONFIRMACION') {
            document.getElementById('btn-af-success').onclick = callback;
            document.getElementById('btn-af-fail').onclick = () => this.mostrarEstado('ERROR');
        }
    },

    ocultarModal: function() {
        const c = document.getElementById('af-modal-container');
        if (c) c.style.display = 'none';
    }
};

// CSS con el estilo de iconos animados (Stroke-art) de NexeSocial
if (!document.getElementById('nexe-af-styles-v6')) {
    const style = document.createElement("style");
    style.id = 'nexe-af-styles-v6';
    style.innerHTML = `
        .nexe-modal-card { background: white; padding: 45px; border-radius: 35px; text-align: center; max-width: 360px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); border: 1px solid #f1f5f9; }
        .nexe-title { font-family: 'Inter', sans-serif; font-weight: 800; font-size: 1.5rem; color: #1e293b; margin: 20px 0 10px; letter-spacing: -0.02em; }
        .nexe-text { font-family: 'Inter', sans-serif; color: #64748b; font-size: 0.95rem; margin-bottom: 30px; line-height: 1.5; }
        
        /* Animaciones de Iconos (Estilo técnico Sidebar) */
        .nexe-icon-box { width: 80px; height: 80px; margin: 0 auto; position: relative; }
        .nexe-circle { stroke-dasharray: 166; stroke-dashoffset: 166; stroke-width: 2; animation: nexe-stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards; }
        .nexe-path { stroke-dasharray: 48; stroke-dashoffset: 48; stroke-width: 4; stroke-linecap: round; animation: nexe-stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards; }

        .success .nexe-circle { stroke: #22c55e; fill: #f0fdf4; }
        .success .nexe-path { stroke: #16a34a; }
        
        .danger .nexe-circle { stroke: #ef4444; fill: #fef2f2; }
        .danger .nexe-path { stroke: #dc2626; }

        @keyframes nexe-stroke { 100% { stroke-dashoffset: 0; } }
        .animate-in { animation: nexe-pop 0.4s cubic-bezier(0.17, 0.89, 0.32, 1.1); }
        @keyframes nexe-pop { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        /* Botones Nexe */
        .btn-nexe-primary { background: #3b82f6; color: white; border: none; width: 100%; padding: 16px; border-radius: 16px; font-weight: 700; cursor: pointer; transition: 0.2s; box-shadow: 0 10px 15px -3px rgba(59,130,246,0.3); }
        .btn-nexe-primary:hover { background: #2563eb; transform: translateY(-2px); }
        .btn-nexe-ghost { background: transparent; color: #94a3b8; border: 1px solid #e2e8f0; width: 100%; padding: 14px; border-radius: 16px; margin-top: 10px; cursor: pointer; font-weight: 600; }
        .btn-nexe-dark { background: #0f172a; color: white; border: none; width: 100%; padding: 16px; border-radius: 16px; font-weight: 700; cursor: pointer; }

        .af-spinner { border: 4px solid #f1f5f9; border-top: 4px solid #3b82f6; border-radius: 50%; width: 50px; height: 50px; animation: nexe-spin 1s linear infinite; margin: 0 auto; }
        @keyframes nexe-spin { 100% { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
}