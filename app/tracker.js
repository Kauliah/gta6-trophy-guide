// Leonida Legend — tracker state.
//
// One job: remember which trophies the reader has earned, in this browser
// only (localStorage), and move that progress in and out as a file. Nothing
// here talks to a network. The storage key carries a version so a future
// shape change never misreads an old save.

export const STORAGE_KEY = 'leonida-legend-progress-v1';

// Read the earned set from localStorage. A damaged save is treated as empty
// rather than crashing the page.
export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => Number.isInteger(id)));
  } catch {
    return new Set();
  }
}

// Persist the earned set. Returns true when the write stuck.
export function saveProgress(earned) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
    return true;
  } catch {
    return false;
  }
}

// Turn the earned set into a downloadable file. The file holds the trophy ids
// plus the guide's name, so an import can check it belongs to this guide.
export function exportProgress(earned) {
  const payload = {
    guide: 'leonida-legend',
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leonida-legend-progress.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Read a progress file back into an earned set. Accepts both the exported
// shape ({ earned: [...] }) and a bare array of ids. Throws on bad input so
// the caller can tell the reader what went wrong.
export async function importProgress(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const ids = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(ids)) throw new Error('That file does not hold trophy progress.');
  const earned = new Set();
  for (const id of ids) {
    if (Number.isInteger(id) && id >= 1 && id <= 55) earned.add(id);
  }
  return earned;
}

// Count earned trophies inside any list of trophies.
export function countEarned(trophies, earned) {
  let n = 0;
  for (const trophy of trophies) if (earned.has(trophy.id)) n += 1;
  return n;
}

// Group counts by a trophy field (grade, kind or roadmap stage).
export function countByField(trophies, earned, field) {
  const groups = new Map();
  for (const trophy of trophies) {
    const key = String(trophy[field]);
    const group = groups.get(key) ?? { total: 0, earned: 0 };
    group.total += 1;
    if (earned.has(trophy.id)) group.earned += 1;
    groups.set(key, group);
  }
  return groups;
}
