// test-auth-system.js - Script de diagnóstico para verificar sistema de autenticación

console.log('%c🔍 DIAGNÓSTICO DEL SISTEMA DE AUTENTICACIÓN', 'color: #2563eb; font-size: 14px; font-weight: bold;');
console.log('='.repeat(60));

// 1. Verificar localStorage
console.log('\n📦 Datos en localStorage:');
const userEmail = localStorage.getItem('userEmail');
const userRole = localStorage.getItem('userRole');
const userName = localStorage.getItem('userName');
const userPermissions = localStorage.getItem('userPermissions');

console.table({
    'userEmail': userEmail || '❌ NO ENCONTRADO',
    'userRole': userRole || '❌ NO ENCONTRADO',
    'userName': userName || '❌ NO ENCONTRADO',
    'userPermissions': userPermissions ? '✅ Presente' : '❌ NO ENCONTRADO',
});

// 2. Verificar Auth global
console.log('\n🔐 Estado de Auth Global:');
if (typeof window.Auth !== 'undefined') {
    console.log('✅ window.Auth está disponible');
    console.log('  - isReady:', window.Auth.isReady);
    
    const user = window.Auth.getUser();
    if (user) {
        console.log('✅ Usuario obtenido desde Auth:');
        console.table({
            'Email': user.email,
            'Nombre': user.displayName || user.nombre,
            'Rol': user.role,
            'Permisos': user.permisos ? Object.keys(user.permisos).join(', ') : 'N/A',
        });
        
        // 3. Verificar acceso a módulos
        console.log('\n🔑 Verificación de Acceso a Módulos:');
        const modules = ['psy', 'admin', 'audit', 'grupos', 'usuarios'];
        modules.forEach(mod => {
            const hasAccess = window.Auth.hasAccessTo(mod);
            console.log(`  ${hasAccess ? '✅' : '❌'} ${mod.toUpperCase()}: ${hasAccess ? 'ACCESO' : 'DENEGADO'}`);
        });
    } else {
        console.warn('⚠️ No se pudo obtener usuario desde Auth');
    }
} else {
    console.error('❌ window.Auth NO está disponible');
}

// 4. Información del navegador
console.log('\n🌐 Información del navegador:');
console.table({
    'URL actual': window.location.href,
    'Ruta': window.location.pathname,
    'Local Storage enabled': typeof localStorage !== 'undefined' ? 'Sí' : 'No',
});

// 5. Firebase
console.log('\n🔥 Firebase:');
if (typeof firebase !== 'undefined' || typeof auth !== 'undefined') {
    console.log('✅ Firebase está disponible');
} else {
    console.warn('⚠️ Firebase podría no estar completamente cargado');
}

console.log('\n' + '='.repeat(60));
console.log('%c✅ Diagnóstico completado', 'color: #10b981; font-size: 12px; font-weight: bold;');

// Exportar función para recargar diagnóstico
window.reloadAuthDiagnostic = function() {
    console.clear();
    eval(document.querySelector('script[src="test-auth-system.js"]').textContent);
};

console.log('💡 Tip: Ejecuta window.reloadAuthDiagnostic() para recargar el diagnóstico\n');
