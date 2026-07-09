// public/js/components/Sidebar.js
export function renderSidebar() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    sidebarContainer.innerHTML = `
        <div class="d-flex flex-column flex-shrink-0 p-3 text-white bg-dark" style="width: 280px; height: 100vh;">
            <a href="/" class="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
                <span class="fs-4">Nexe Social</span>
            </a>
            <hr>
            <ul class="nav nav-pills flex-column mb-auto">
                <li class="nav-item">
                    <a href="dashboard.html" class="nav-link text-white" id="nav-home">
                        <i class="bi bi-house-door me-2"></i> Inicio
                    </a>
                </li>
                <li>
                    <a href="socios.html" class="nav-link text-white" id="nav-socios">
                        <i class="bi bi-people me-2"></i> Socios
                    </a>
                </li>
                <li>
                    <a href="projectes.html" class="nav-link text-white" id="nav-proyectos">
                        <i class="bi bi-folder me-2"></i> Proyectos
                    </a>
                </li>
            </ul>
            <hr>
            <div class="dropdown">
                <button class="btn btn-danger w-100" id="btn-logout">
                    <i class="bi bi-box-arrow-right"></i> Cerrar Sesión
                </button>
            </div>
        </div>
    `;

    // Marcar como activo el link actual
    const currentPage = window.location.pathname.split("/").pop();
    const links = sidebarContainer.querySelectorAll('.nav-link');
    links.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}