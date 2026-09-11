import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { activityInput, isActiveMember, canManageActivities } from '../src/model.js';

test('activity input validates name and status and trims ordinary text', () => {
    assert.equal(activityInput({ name: '  Taller  ', areaId: 'a', status: 'active' }).name, 'Taller');
    for (const input of [{ name: '', areaId: 'a', status: 'active' }, { name: 'Taller', status: 'active' }, { name: 'Taller', areaId: 'a', status: 'unknown' }]) assert.throws(() => activityInput(input));
});
test('unknown, expired and revoked memberships cannot enter the workspace', () => {
    const member = { active: true, role: 'coordinator', areaIds: ['a'], validUntil: { toMillis: () => 200 } };
    assert.equal(isActiveMember(member, 100), true);
    assert.equal(isActiveMember(member, 201), false);
    assert.equal(isActiveMember({ ...member, active: false }, 100), false);
    assert.equal(isActiveMember({ ...member, role: 'unknown' }, 100), false);
    assert.equal(canManageActivities({ ...member, role: 'volunteer' }), false);
});
test('all v2 application modules parse', () => {
    for (const file of ['app.js', 'data.js', 'model.js']) {
        const result = spawnSync(process.execPath, ['--check', `v2/src/${file}`], { encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr);
    }
});
test('built page has local assets and does not inherit the production project', () => {
    const html = readFileSync('v2/dist/index.html', 'utf8');
    for (const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)) assert.equal(existsSync(`v2/dist/${match[1]}`), true, match[1]);
    assert.ok(!readFileSync('v2/dist/app.js', 'utf8').includes('nexesocial-bc6c4'));
    const config = JSON.parse(readFileSync('v2/firebase.json', 'utf8'));
    assert.equal(config.hosting.public, 'dist');
    assert.equal(config.firestore.rules, 'firestore.rules');
});
