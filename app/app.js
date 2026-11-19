// Leonida Legend — the guide app.
//
// Boots from data/trophies.json, renders the checklist with its filters, the
// guide pane, the platinum roadmap, the missables page and the tracker page.
// Progress comes from tracker.js (localStorage + export/import). The page
// keeps its state in the URL hash, so a link can open one view or one
// trophy's guide: #/checklist, #/roadmap, #/missables, #/tracker,
// #/trophy/<id>.

import {
  loadProgress,
  saveProgress,
  exportProgress,
  importProgress,
  countEarned,
  countByField,
} from './tracker.js';

const KIND_LABELS = {
  story: 'Story',
  side: 'Strangers & side',
  activity: 'Activity',
  collectible: 'Collectible',
  crime: 'Heist & crime',
  economy: 'Money & property',
  secret: 'Secret moment',
  meta: 'Platinum & 100%',
};

const GRADE_LETTERS = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' };

const ROADMAP_STAGES = [
  {
    stage: 1,
    title: 'Play the story',
    text: 'Chapters 1 to 4 and the named story missions, in order. Nothing here needs a detour: just finish each chapter and mission as it comes, and the trophies pop on completion.',
  },
  {
    stage: 2,
    title: 'Strangers & side strands',
    text: 'The eight stranger mission strands across Leonida and the final mission of each strand-giver: Andy, Kenton, Billy, Randy and Tyrone, plus the unique animal Bret asks you to hunt. Start strands as you meet their strangers; finish each strand before the story moves past them.',
  },
  {
    stage: 3,
    title: 'Activities & skills',
    text: 'The repeatable activities: stunts, the nine activity types, the 42 Shooting Range challenges, Top Fun drone races, the 20 race wins, fishing against Cal, one arcade game, meditation at all 18 spots, 50 challenges, bowling, and the melee drive-by. These are all available alongside the story, so chip away at them between missions.',
  },
  {
    stage: 4,
    title: 'Collectibles & exploration',
    text: 'The long counts: 3 collectible card sets, WAiNK It at 100 locations, 100 vehicles discovered, all 52 areas of Leonida explored, all 8 garage properties bought, and 10 vehicles registered to the Scooter Bros app. Keep a checklist running from the start — backtracking for one missed card is the slowest part of the platinum.',
  },
  {
    stage: 5,
    title: 'Heists, crime & money',
    text: 'The criminal career: losing a 4-star wanted level with your partner, three back-to-back shop robberies, Combat Focus, the VCIA departure, the Rhinos, the jewelry store, 5 bank vaults, the armored truck, one illegal operation per gang, and laundering $250,000 of marked bills plus $100,000 spent in shops.',
  },
  {
    stage: 6,
    title: 'Cleanup & platinum',
    text: 'The last sweep: the secret moments (the Ocean Beach cocktail, the showroom smash, the partnership moment, the 500 choices, the second try, the strange sighting), the 100% completion gold, and then the platinum itself — “Vice Got a Price!” — for the other 54.',
  },
];

const $ = (id) => document.getElementById(id);

let trophies = [];
let earned = loadProgress();
let selectedId = null;
let spoilerOn = false;

const state = { search: '', kind: 'all', grade: 'all', missableOnly: false };

function trophyById(id) {
  return trophies.find((t) => t.id === id);
}

function isHidden(trophy) {
  return trophy.hidden === true;
}

function shownName(trophy) {
  if (spoilerOn && isHidden(trophy) && !earned.has(trophy.id)) return 'Hidden trophy';
  return trophy.name;
}

function shownDescription(trophy) {
  if (spoilerOn && isHidden(trophy) && !earned.has(trophy.id)) {
    return 'Hidden on PlayStation until earned. Tick it off once you have it to reveal its name.';
  }
  return trophy.description;
}

function matchesFilters(trophy) {
  if (state.kind !== 'all' && trophy.kind !== state.kind) return false;
  if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
  if (state.missableOnly && trophy.missable !== true) return false;
  if (state.search) {
    const needle = state.search.toLowerCase();
    const haystack = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

function renderProgress() {
  const total = trophies.length;
  const n = countEarned(trophies, earned);
  const percent = total ? Math.round((n / total) * 100) : 0;
  $('earnedCount').textContent = `${n} of ${total} earned`;
  $('progressBar').style.width = `${percent}%`;
  $('progressText').textContent = `${percent}%`;
}

function renderChecklist() {
  const list = $('trophyList');
  const visible = trophies.filter(matchesFilters);
  $('listSummary').textContent =
    `Showing ${visible.length} of ${trophies.length} trophies · ` +
    `${countEarned(trophies, earned)} earned · ` +
    `${trophies.filter((t) => t.missable).length} missable in the full list`;
  list.replaceChildren();
  if (visible.length === 0) {
    const note = document.createElement('li');
    note.className = 'empty-note';
    note.textContent = 'No trophies match those filters. Clear the search or widen the kind and grade.';
    list.append(note);
    return;
  }
  for (const trophy of visible) {
    const item = document.createElement('li');
    item.className = 'trophy-card' + (earned.has(trophy.id) ? ' earned' : '');
    item.dataset.id = String(trophy.id);

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(trophy.id);
    box.setAttribute('aria-label', `Mark ${trophy.name} earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(trophy.id);
      else earned.delete(trophy.id);
      saveProgress(earned);
      renderAll();
    });

    const medal = document.createElement('span');
    medal.className = `medal ${trophy.grade}`;
    medal.textContent = GRADE_LETTERS[trophy.grade] ?? '?';
    medal.title = trophy.grade;

    const body = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'trophy-name';
    name.textContent = shownName(trophy);
    if (spoilerOn && isHidden(trophy) && !earned.has(trophy.id)) {
      const tag = document.createElement('span');
      tag.className = 'hidden-tag';
      tag.textContent = ' · hidden';
      name.append(tag);
    }
    const desc = document.createElement('div');
    desc.className = 'trophy-desc';
    desc.textContent = shownDescription(trophy);
    const meta = document.createElement('div');
    meta.className = 'trophy-meta';
    const gradeTag = document.createElement('span');
    gradeTag.className = `tag grade-${trophy.grade}`;
    gradeTag.textContent = trophy.grade;
    meta.append(gradeTag);
    const kindTag = document.createElement('span');
    kindTag.className = 'tag';
    kindTag.textContent = KIND_LABELS[trophy.kind] ?? trophy.kind;
    meta.append(kindTag);
    if (trophy.missable) {
      const missTag = document.createElement('span');
      missTag.className = 'tag missable';
      missTag.textContent = 'MISSABLE';
      meta.append(missTag);
    }
    if (isHidden(trophy)) {
      const hiddenTag = document.createElement('span');
      hiddenTag.className = 'tag';
      hiddenTag.textContent = 'Hidden';
      meta.append(hiddenTag);
    }
    body.append(name, desc, meta);
    if (typeof trophy.target === 'number') {
      const target = document.createElement('div');
      target.className = 'target';
      target.textContent = `PSN counts this one: 0 / ${trophy.target.toLocaleString('en-US')}`;
      body.append(target);
    }

    const guideBtn = document.createElement('button');
    guideBtn.type = 'button';
    guideBtn.className = 'guide-btn';
    guideBtn.textContent = selectedId === trophy.id ? 'Guide open' : 'Guide';
    guideBtn.addEventListener('click', () => {
      selectedId = trophy.id;
      location.hash = `#/trophy/${trophy.id}`;
      renderAll();
      $('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    item.append(box, medal, body, guideBtn);
    list.append(item);
  }
}

function renderDetail() {
  const panel = $('detail');
  const body = $('detailBody');
  const trophy = selectedId === null ? null : trophyById(selectedId);
  if (!trophy) {
    panel.hidden = true;
    body.replaceChildren();
    return;
  }
  panel.hidden = false;
  body.replaceChildren();

  const title = document.createElement('h2');
  title.textContent = trophy.name;
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = `${trophy.description} · ${trophy.grade} · ${KIND_LABELS[trophy.kind] ?? trophy.kind}`;
  body.append(title, official);

  if (trophy.missable) {
    const warn = document.createElement('p');
    warn.className = 'missable-note';
    warn.textContent =
      'Missable — this one can pass you by. Do it before the story moves on, or keep a save from before it.';
    body.append(warn);
  }

  const guide = document.createElement('div');
  guide.className = 'guide-text';
  for (const paragraph of String(trophy.guide).split('\n\n')) {
    const p = document.createElement('p');
    p.textContent = paragraph;
    guide.append(p);
  }
  body.append(guide);

  const sources = document.createElement('p');
  sources.className = 'sources';
  sources.textContent = `Sources: ${trophy.sources}`;
  body.append(sources);

  const row = document.createElement('div');
  row.className = 'earn-row';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.textContent = earned.has(trophy.id) ? 'Mark as not earned' : 'Mark as earned';
  toggle.addEventListener('click', () => {
    if (earned.has(trophy.id)) earned.delete(trophy.id);
    else earned.add(trophy.id);
    saveProgress(earned);
    renderAll();
  });
  row.append(toggle);
  body.append(row);
}

function renderRoadmap() {
  const wrap = $('roadmapStages');
  wrap.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const members = trophies.filter((t) => t.stage === stage.stage);
    const n = countEarned(members, earned);
    const card = document.createElement('article');
    card.className = 'stage';
    const heading = document.createElement('h2');
    heading.textContent = `Stage ${stage.stage} — ${stage.title} `;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `(${n}/${members.length} earned)`;
    heading.append(count);
    const text = document.createElement('p');
    text.textContent = stage.text;
    const list = document.createElement('ul');
    for (const trophy of members) {
      const li = document.createElement('li');
      if (earned.has(trophy.id)) li.className = 'earned';
      li.textContent = `${earned.has(trophy.id) ? '✓ ' : ''}${trophy.name} `;
      const grade = document.createElement('span');
      grade.className = 'stage-grade';
      grade.textContent = `(${trophy.grade}${trophy.missable ? ', missable' : ''})`;
      li.append(grade);
      list.append(li);
    }
    card.append(heading, text, list);
    wrap.append(card);
  }
}

function renderMissables() {
  const wrap = $('missableList');
  wrap.replaceChildren();
  for (const trophy of trophies.filter((t) => t.missable)) {
    const card = document.createElement('article');
    card.className = 'missable-card';
    const heading = document.createElement('h3');
    heading.textContent = `${trophy.name} — ${trophy.grade}`;
    const why = document.createElement('p');
    why.className = 'why';
    why.textContent = earned.has(trophy.id)
      ? 'Earned — safe.'
      : 'Not earned yet — do this before the story moves on.';
    const guide = document.createElement('p');
    guide.textContent = String(trophy.guide).split('\n\n')[0];
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = 'Open full guide';
    open.addEventListener('click', () => {
      selectedId = trophy.id;
      location.hash = `#/trophy/${trophy.id}`;
    });
    card.append(heading, why, guide, open);
    wrap.append(card);
  }
}

function renderTracker() {
  const wrap = $('trackerStats');
  wrap.replaceChildren();
  const total = trophies.length;
  const n = countEarned(trophies, earned);

  const overall = document.createElement('div');
  overall.className = 'stat-card';
  overall.innerHTML = `<h3>Overall</h3><div class="big">${n} / ${total}</div><p>${Math.round((n / total) * 100)}% of the way to the platinum.</p>`;
  wrap.append(overall);

  const byGrade = countByField(trophies, earned, 'grade');
  const gradeCard = document.createElement('div');
  gradeCard.className = 'stat-card';
  const gradeTitle = document.createElement('h3');
  gradeTitle.textContent = 'By grade';
  const gradeList = document.createElement('ul');
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const group = byGrade.get(grade);
    if (!group) continue;
    const li = document.createElement('li');
    li.textContent = `${grade}: ${group.earned} of ${group.total}`;
    gradeList.append(li);
  }
  gradeCard.append(gradeTitle, gradeList);
  wrap.append(gradeCard);

  const byKind = countByField(trophies, earned, 'kind');
  const kindCard = document.createElement('div');
  kindCard.className = 'stat-card';
  const kindTitle = document.createElement('h3');
  kindTitle.textContent = 'By kind';
  const kindList = document.createElement('ul');
  for (const kind of Object.keys(KIND_LABELS)) {
    const group = byKind.get(kind);
    if (!group) continue;
    const li = document.createElement('li');
    li.textContent = `${KIND_LABELS[kind]}: ${group.earned} of ${group.total}`;
    kindList.append(li);
  }
  kindCard.append(kindTitle, kindList);
  wrap.append(kindCard);

  const byStage = countByField(trophies, earned, 'stage');
  const stageCard = document.createElement('div');
  stageCard.className = 'stat-card';
  const stageTitle = document.createElement('h3');
  stageTitle.textContent = 'Roadmap stages';
  const stageList = document.createElement('ul');
  for (const stage of ROADMAP_STAGES) {
    const group = byStage.get(String(stage.stage));
    if (!group) continue;
    const li = document.createElement('li');
    li.textContent = `Stage ${stage.stage} ${stage.title}: ${group.earned} of ${group.total}`;
    stageList.append(li);
  }
  stageCard.append(stageTitle, stageList);
  wrap.append(stageCard);

  const missable = trophies.filter((t) => t.missable);
  const missCard = document.createElement('div');
  missCard.className = 'stat-card';
  missCard.innerHTML =
    `<h3>Missables</h3><div class="big">${countEarned(missable, earned)} / ${missable.length}</div>` +
    `<p>Missable trophies earned. Check the Missables page before the finale.</p>`;
  wrap.append(missCard);
}

function renderAll() {
  renderProgress();
  renderChecklist();
  renderDetail();
  renderRoadmap();
  renderMissables();
  renderTracker();
}

function showView(name) {
  for (const view of ['checklist', 'roadmap', 'missables', 'tracker']) {
    $(`view-${view}`).hidden = view !== name;
  }
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('active', tab.dataset.view === name);
  }
}

function routeFromHash() {
  const hash = location.hash || '#/checklist';
  const trophyMatch = hash.match(/^#\/trophy\/(\d+)$/);
  if (trophyMatch) {
    const id = Number(trophyMatch[1]);
    if (trophyById(id)) selectedId = id;
    showView('checklist');
    return;
  }
  const viewMatch = hash.match(/^#\/(checklist|roadmap|missables|tracker)$/);
  showView(viewMatch ? viewMatch[1] : 'checklist');
}

function wireControls() {
  $('search').addEventListener('input', (event) => {
    state.search = event.target.value.trim();
    renderChecklist();
  });
  $('kindFilter').addEventListener('change', (event) => {
    state.kind = event.target.value;
    renderChecklist();
  });
  $('gradeFilter').addEventListener('change', (event) => {
    state.grade = event.target.value;
    renderChecklist();
  });
  $('missableOnly').addEventListener('change', (event) => {
    state.missableOnly = event.target.checked;
    renderChecklist();
  });
  $('spoilerToggle').addEventListener('change', (event) => {
    spoilerOn = event.target.checked;
    renderChecklist();
  });
  $('detailClose').addEventListener('click', () => {
    selectedId = null;
    location.hash = '#/checklist';
    renderAll();
  });
  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => {
      location.hash = `#/${tab.dataset.view}`;
    });
  }
  window.addEventListener('hashchange', () => {
    routeFromHash();
    renderAll();
  });

  const doExport = () => exportProgress(earned);
  $('exportBtn').addEventListener('click', doExport);
  $('exportBtn2').addEventListener('click', doExport);
  const doImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      earned = await importProgress(file);
      saveProgress(earned);
      renderAll();
    } catch (error) {
      alert(`Could not import that file: ${error.message}`);
    }
    event.target.value = '';
  };
  $('importFile').addEventListener('change', doImport);
  $('importFile2').addEventListener('change', doImport);
  $('resetBtn').addEventListener('click', () => {
    if (confirm('Reset all progress? This clears every ticked trophy.')) {
      earned = new Set();
      saveProgress(earned);
      renderAll();
    }
  });
}

async function boot() {
  const response = await fetch('data/trophies.json');
  const data = await response.json();
  trophies = Array.isArray(data) ? data : data.trophies;
  wireControls();
  routeFromHash();
  renderAll();
}

boot();
