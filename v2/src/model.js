export const ROLE_LABELS = { admin: 'Administració', coordinator: 'Coordinació', educator: 'Equip educatiu', volunteer: 'Voluntariat' };
export function canManageActivities(member) { return member?.active === true && ['admin', 'coordinator'].includes(member.role); }
export function activityInput(input) {
    const name = String(input.name || '').trim();
    if (name.length < 2 || name.length > 120) throw new Error('El nom ha de tenir entre 2 i 120 caràcters.');
    if (!input.areaId) throw new Error('Selecciona una àrea.');
    if (!['active', 'paused'].includes(input.status)) throw new Error('Selecciona un estat vàlid.');
    return { name, areaId: input.areaId, programId: input.programId || '', status: input.status };
}
export function isActiveMember(member, now = Date.now()) {
    return member?.active === true && Object.hasOwn(ROLE_LABELS, member.role)
        && Array.isArray(member.areaIds) && member.validUntil?.toMillis() > now;
}
