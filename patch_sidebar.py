file = r'C:\Users\rafa_\Desktop\NexeSocial\public\NexeAdmin\nexeadmin-sidebar.js'
with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

# Find start of MAIN CONTENT comment line
idx = content.find('MAIN CONTENT')
line_start = content.rfind('\n', 0, idx) + 1

# Find the closing backtick+semicolon of the CSS template literal
closing_seq = '`;\n        document.head'
closing = content.find(closing_seq, idx)
assert closing != -1, "Could not find closing sequence"

line_end = closing + 2  # include "`;" but not the \n

print(f'Replacing from {line_start} to {line_end}')
print(f'Old section chars: {line_end - line_start}')

new_css = r"""            /* -- MAIN CONTENT ----------------------------------------------- */
            .main-content, .content-wrapper {
                margin-left: var(--admin-sidebar-width) !important;
                width: calc(100% - var(--admin-sidebar-width)) !important;
                transition: margin-left 0.25s ease, width 0.25s ease !important;
                box-sizing: border-box; flex-grow: 1;
            }
            body.collapsed .main-content, body.collapsed .content-wrapper {
                margin-left: var(--admin-sidebar-collapsed-width) !important;
                width: calc(100% - var(--admin-sidebar-collapsed-width)) !important;
            }

            /* -- MOBILE HAMBURGER BUTTON ------------------------------------- */
            .mobile-menu-btn {
                display: none; position: fixed; top: 12px; left: 12px; z-index: 200;
                width: 40px; height: 40px; border-radius: 10px;
                border: 1px solid var(--border); background: #fff; color: #475569;
                cursor: pointer; align-items: center; justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: 0.18s;
            }
            .mobile-menu-btn:hover { background: #0f172a; color: #fff; border-color: #0f172a; }
            .mobile-menu-btn svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

            /* -- SIDEBAR BACKDROP (mobile) ----------------------------------- */
            .sidebar-backdrop {
                display: none; position: fixed; inset: 0; z-index: 99;
                background: rgba(15,23,42,0.45); backdrop-filter: blur(3px);
                cursor: pointer;
            }
            body.mobile-open .sidebar-backdrop { display: block; }

            /* -- RESPONSIVE: TABLET (769px to 1024px) ----------------------- */
            @media (max-width: 1024px) and (min-width: 769px) {
                .admin-sidebar { width: var(--admin-sidebar-collapsed-width) !important; min-width: var(--admin-sidebar-collapsed-width) !important; }
                .admin-sidebar .logo-box,
                .admin-sidebar .nav-group-toggle span,
                .admin-sidebar .group-chevron,
                .admin-sidebar .nav-item span,
                .admin-sidebar .nav-footer-action span { display: none !important; }
                .admin-sidebar .nav-group-toggle { justify-content: center; padding: 7px 0; }
                .admin-sidebar .nav-group.collapsed .nav-group-items { display: flex !important; }
                .admin-sidebar .nav-item,
                .admin-sidebar .nav-footer-action { justify-content: center; padding: 10px 0 !important; }
                .admin-sidebar .sidebar-top-bar { flex-direction: column; gap: 6px; }
                .main-content, .content-wrapper {
                    margin-left: var(--admin-sidebar-collapsed-width) !important;
                    width: calc(100% - var(--admin-sidebar-collapsed-width)) !important;
                }
            }

            /* -- RESPONSIVE: MOBILE (max 768px) ----------------------------- */
            @media (max-width: 768px) {
                .admin-sidebar {
                    transform: translateX(-100%) !important;
                    width: 270px !important; min-width: 270px !important;
                    z-index: 150 !important;
                    box-shadow: 4px 0 24px rgba(0,0,0,0.12) !important;
                    transition: width 0.25s ease, min-width 0.25s ease, transform 0.25s ease !important;
                }
                body.mobile-open .admin-sidebar { transform: translateX(0) !important; }
                .admin-sidebar .logo-box { display: flex !important; }
                .admin-sidebar .nav-group-toggle span,
                .admin-sidebar .nav-item span,
                .admin-sidebar .nav-footer-action span { display: flex !important; }
                .admin-sidebar .group-chevron { display: block !important; }
                .admin-sidebar .nav-group-toggle { justify-content: space-between; padding: 7px 10px; }
                .admin-sidebar .nav-item,
                .admin-sidebar .nav-footer-action { justify-content: flex-start; padding: 10px 12px !important; }
                .admin-sidebar .sidebar-top-bar { flex-direction: row; gap: 8px; }
                .main-content, .content-wrapper {
                    margin-left: 0 !important; width: 100% !important;
                    padding-top: 60px !important;
                }
                body.collapsed .admin-sidebar { transform: translateX(-100%) !important; }
                body.collapsed .main-content, body.collapsed .content-wrapper { margin-left: 0 !important; width: 100% !important; }
                .mobile-menu-btn { display: inline-flex !important; }
            }

            /* -- MODALS ------------------------------------------------------ */
            .modal-overlay, .modal-shell {
                position: fixed !important; inset: 0 !important;
                z-index: 30000 !important;
                display: none; justify-content: center; align-items: center;
                background: rgba(15,23,42,0.55) !important;
                backdrop-filter: blur(8px) !important;
            }

            /* -- SVG ICON UTILITY -------------------------------------------- */
            .ui-svg-icon {
                width: 18px; height: 18px; display: inline-block;
                vertical-align: middle; margin-right: 6px;
                fill: none; stroke: currentColor;
                stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
            }
        `"""

result = content[:line_start] + new_css + content[line_end:]
with open(file, 'w', encoding='utf-8') as f:
    f.write(result)

print("DONE.")
print("mobile-menu-btn present:", 'mobile-menu-btn' in result)
print("Total chars:", len(result))
