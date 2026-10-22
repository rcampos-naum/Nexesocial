import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

// Installer exit codes: 0 initialized; 3 needs first account; 4 unreadable.
// This probe never creates, migrates or modifies the pilot database.
export function probePilotDatabase(path) {
  let db;
  try {
    if (!existsSync(path)) return 3;
    db = new DatabaseSync(path, { readOnly: true });
    const users = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (!users) return db.prepare("SELECT count(*) total FROM sqlite_master WHERE type='table'").get().total ? 4 : 3;
    return db.prepare('SELECT 1 FROM users LIMIT 1').get() ? 0 : 3;
  } catch { return 4; }
  finally { db?.close(); }
}
