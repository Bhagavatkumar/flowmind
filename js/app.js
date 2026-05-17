/* ═══════════════════════════════════════════════════════════
   FLOWMIND — App Logic v2 (Bug Fixed)
   ═══════════════════════════════════════════════════════════ */

"use strict";

/* ─── STATE ─────────────────────────────────────────────── */
const APP = {
  tasks: [],
  chatHistory: [],
  currentFilter: "all",
  nextId: 1,
};

/* ─── SEED DATA (exactly 8 tasks: 3 done, 1 inprogress, 4 todo) ── */
const SEED_TASKS = [
  { title: "Review Q2 product roadmap",  cat: "work",     priority: "high",   status: "done",       time: "9:00 AM"  },
  { title: "30-min morning run",         cat: "health",   priority: "medium", status: "done",       time: "7:00 AM"  },
  { title: "Fix homepage bug",           cat: "work",     priority: "high",   status: "done",       time: "8:30 AM"  },
  { title: "Write weekly team update",   cat: "work",     priority: "medium", status: "inprogress", time: "10:30 AM" },
  { title: "Customer feedback analysis", cat: "work",     priority: "high",   status: "todo",       time: "11:00 AM" },
  { title: "Meal prep for the week",     cat: "health",   priority: "low",    status: "todo",       time: "6:00 PM"  },
  { title: "Call with mentor",           cat: "personal", priority: "high",   status: "todo",       time: "2:00 PM"  },
  { title: "Read 20 pages of book",      cat: "personal", priority: "low",    status: "todo",       time: "9:00 PM"  },
];

/* ─── AI RESPONSES ──────────────────────────────────────── */
const AI_RESPONSES = {
  "plan my morning": `Here's an optimized morning flow for maximum output:\n\n**7:00 AM** — Quick win: tackle one small task immediately to build momentum.\n**7:30 AM** — Deep work block (no notifications). Start with your highest-priority item.\n**9:00 AM** — Review the day's task list, adjust priorities.\n**9:30 AM** — Collaboration window: emails, Slack, meetings.\n\nPro tip: Your first 90 minutes set the tone for the entire day. Protect them fiercely!`,

  "i'm feeling overwhelmed": `I hear you — that feeling is real, and it's a signal, not a verdict. Let's reset together.\n\n**Right now:** Close all tabs except this one. Breathe for 60 seconds.\n\n**Then:** Let's do a brain dump. What are the top 3 things weighing on you most? Once we name them, we can triage — some won't matter in a week, and some we can break into tiny steps.\n\n**Remember:** Overwhelm happens when your brain is trying to process everything at once. One task at a time is always the answer.`,

  "boost my focus": `Let's trigger a deep focus state. Here's what science says actually works:\n\n**⚡ Immediate (right now):**\n1. Put on noise-cancelling headphones or a focus playlist\n2. Set a 25-minute timer (Pomodoro technique)\n3. Write down the ONE thing you're doing in this block\n\n**🧠 Environment:**\n- Close all social media tabs\n- Put your phone face-down in another room\n- Get a glass of water — dehydration tanks focus by 20%\n\nReady to start a 25-minute focus sprint? 🚀`,
};

const FALLBACK_RESPONSES = [
  "That's a great point! Based on your current task load, I'd suggest prioritizing by impact and urgency. What feels most pressing right now?",
  "Here's my take: the most productive people don't work harder — they work on fewer things at a time. What's the one thing that would make today a success?",
  "Let's break that down. Start with the hardest part first — it's called 'eating the frog,' and it means your mental energy goes to your toughest challenge when it's freshest.",
  "Based on your tasks, you have a solid plan. The key now is protecting your focus blocks from interruptions.",
  "Overwhelm is a signal that your plate is too full. Let's pick the single most important task and start there.",
];

/* ─── INIT ──────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  setLiveDate();
  seedTasks();
  renderAll();
  animateRing(calcFocusScore());
});

function renderAll() {
  renderTimeBlocks();
  renderStats();
  renderKanban();
  renderWeekBars();
  renderCategoryBars();
  renderHeatmap();
  renderSparkline();
  updateAnalytics();
}

/* ─── DATE ──────────────────────────────────────────────── */
function setLiveDate() {
  const el = document.getElementById("live-date");
  const now = new Date();
  el.textContent = now.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric"
  });
}

/* ─── SEED TASKS ─────────────────────────────────────────── */
function seedTasks() {
  APP.tasks = [];
  APP.nextId = 1;
  SEED_TASKS.forEach(t => {
    APP.tasks.push({ ...t, id: APP.nextId++ });
  });
}

/* ─── FOCUS SCORE CALC ───────────────────────────────────── */
function calcFocusScore() {
  const total = APP.tasks.length;
  const done  = APP.tasks.filter(t => t.status === "done").length;
  return total ? Math.round((done / total) * 100) : 0;
}

function updateFocusUI() {
  const score = calcFocusScore();
  const el    = document.getElementById("focus-score");
  const pct   = document.getElementById("ring-pct");
  const sub   = document.querySelector(".hero-sub");
  if (el)  el.textContent  = score;
  if (pct) pct.textContent = score + "%";
  if (sub) {
    if (score >= 80)      sub.textContent = "Outstanding focus today! 🔥";
    else if (score >= 60) sub.textContent = "Keep it up — you're in the zone 🎯";
    else if (score >= 40) sub.textContent = "Good progress — keep going! 💪";
    else                  sub.textContent = "Let's get started — you've got this! 🚀";
  }
  animateRing(score);
}

/* ─── ADD TASK ───────────────────────────────────────────── */
function addTask() {
  const titleEl = document.getElementById("task-title");
  const title   = titleEl.value.trim();
  if (!title) {
    showToast("⚠️ Please enter a task title");
    titleEl.focus();
    return;
  }

  const task = {
    id:       APP.nextId++,
    title,
    cat:      document.getElementById("task-cat").value,
    priority: document.getElementById("task-priority").value,
    time:     document.getElementById("task-time").value.trim() || "Anytime",
    notes:    document.getElementById("task-notes").value.trim(),
    status:   "todo",
  };

  APP.tasks.push(task);
  closeQuickAdd();
  renderAll();
  updateFocusUI();
  showToast("✅ Task added successfully!");
}

/* ─── TOGGLE DONE (time blocks) ──────────────────────────── */
function toggleTaskDone(id) {
  const task = APP.tasks.find(t => t.id === id);
  if (!task) return;
  task.status = task.status === "done" ? "todo" : "done";
  renderTimeBlocks();
  renderStats();
  renderKanban();
  updateAnalytics();
  updateFocusUI();
}

/* ─── CYCLE STATUS (kanban button) ───────────────────────── */
function cycleStatus(id, newStatus) {
  const task = APP.tasks.find(t => t.id === id);
  if (!task) return;
  task.status = newStatus;
  renderKanban();
  renderTimeBlocks();
  renderStats();
  updateAnalytics();
  updateFocusUI();
  const labels = { inprogress: "In Progress ▶", done: "Done ✅", todo: "To Do" };
  showToast(`Moved to ${labels[newStatus]}`);
}

/* ─── DELETE TASK ────────────────────────────────────────── */
function deleteTask(id) {
  APP.tasks = APP.tasks.filter(t => t.id !== id);
  renderAll();
  updateFocusUI();
  showToast("🗑️ Task deleted");
}

/* ─── RENDER: TIME BLOCKS ────────────────────────────────── */
function renderTimeBlocks() {
  const container = document.getElementById("time-blocks-today");
  if (!container) return;

  // Sort: undone first (by time), then done
  const sorted = [...APP.tasks].sort((a, b) => {
    if (a.status === "done" && b.status !== "done") return 1;
    if (a.status !== "done" && b.status === "done") return -1;
    return 0;
  }).slice(0, 6);

  if (sorted.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:var(--text3);padding:32px">No tasks yet — add one with + Add Task</div>`;
    return;
  }

  container.innerHTML = sorted.map(t => {
    const accentColor = t.cat === "work" ? "#f0b429" : t.cat === "health" ? "#ff6b35" : "#00d4aa";
    const isDone      = t.status === "done";
    return `
      <div class="time-block ${isDone ? "done" : ""}" onclick="toggleTaskDone(${t.id})">
        <div class="tb-accent-bar" style="background:${accentColor}"></div>
        <div class="tb-time">${t.time}</div>
        <div class="tb-title">${t.title}</div>
        <span class="tb-cat cat-${t.cat}">${t.cat}</span>
        <div class="tb-check ${isDone ? "checked" : ""}">${isDone ? "✓" : ""}</div>
      </div>`;
  }).join("");
}

/* ─── RENDER: STATS ──────────────────────────────────────── */
function renderStats() {
  const total  = APP.tasks.length;
  const done   = APP.tasks.filter(t => t.status === "done").length;
  const inprog = APP.tasks.filter(t => t.status === "inprogress").length;
  const pct    = total ? Math.round((done / total) * 100) : 0;

  const el = document.getElementById("stats-row");
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-val">${done}</div>
      <div class="stat-label">Completed today</div>
    </div>
    <div class="stat-card">
      <div class="stat-val">${inprog}</div>
      <div class="stat-label">In progress</div>
    </div>
    <div class="stat-card">
      <div class="stat-val">${pct}%</div>
      <div class="stat-label">Completion rate</div>
    </div>`;
}

/* ─── RENDER: KANBAN ─────────────────────────────────────── */
function renderKanban() {
  const filter   = APP.currentFilter;
  const filtered = filter === "all"
    ? APP.tasks
    : APP.tasks.filter(t => t.cat === filter);

  ["todo", "inprogress", "done"].forEach(status => {
    const cards     = filtered.filter(t => t.status === status);
    const container = document.getElementById(`cards-${status}`);
    const countEl   = document.getElementById(`count-${status}`);
    if (!container || !countEl) return;

    countEl.textContent = cards.length;

    if (cards.length === 0) {
      container.innerHTML = `<div style="text-align:center;color:var(--text3);font-size:.8rem;padding:20px 0">Empty</div>`;
      return;
    }

    container.innerHTML = cards.map(t => {
      const nextStatus = t.status === "todo" ? "inprogress" : t.status === "inprogress" ? "done" : "todo";
      const nextLabel  = t.status === "todo" ? "▶ Start" : t.status === "inprogress" ? "✓ Mark Done" : "↩ Reopen";
      const nextColor  = t.status === "todo" ? "#f0b429" : t.status === "inprogress" ? "#00d4aa" : "#9998a8";
      return `
        <div class="kanban-card"
             draggable="true"
             ondragstart="dragStart(event, ${t.id})"
             data-id="${t.id}">
          <div class="kc-title">${t.title}</div>
          <div class="kc-footer">
            <span class="kc-priority pri-${t.priority}">${t.priority}</span>
            <span class="kc-time">${t.time}</span>
          </div>
          <div style="display:flex;gap:6px;margin-top:10px">
            <button class="kc-action-btn"
                    style="color:${nextColor};border-color:${nextColor}33;background:${nextColor}11;flex:1"
                    onclick="cycleStatus(${t.id},'${nextStatus}')">${nextLabel}</button>
            <button class="kc-action-btn"
                    style="color:#ff6464;border-color:#ff646433;background:#ff646411;width:32px"
                    onclick="deleteTask(${t.id})" title="Delete">✕</button>
          </div>
        </div>`;
    }).join("");
  });
}

/* ─── FILTER ─────────────────────────────────────────────── */
function filterTasks(cat, btn) {
  APP.currentFilter = cat;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderKanban();
}

/* ─── DRAG & DROP ────────────────────────────────────────── */
let draggedId = null;

function dragStart(e, id) {
  draggedId = id;
  e.dataTransfer.effectAllowed = "move";
}

function allowDrop(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

function dropCard(e, newStatus) {
  e.preventDefault();
  if (!draggedId) return;
  const task = APP.tasks.find(t => t.id === draggedId);
  if (task && task.status !== newStatus) {
    task.status = newStatus;
    renderKanban();
    renderTimeBlocks();
    renderStats();
    updateAnalytics();
    updateFocusUI();
    const labels = { inprogress: "In Progress", done: "Done ✅", todo: "To Do" };
    showToast(`Moved to ${labels[newStatus]}`);
  }
  draggedId = null;
}

/* ─── RING ANIMATION ─────────────────────────────────────── */
function animateRing(pct) {
  const circ = 2 * Math.PI * 50;
  const fill = circ - (pct / 100) * circ;
  const ring = document.getElementById("ring-circle");
  if (ring) ring.style.strokeDashoffset = fill;
}

/* ─── WEEK BARS ──────────────────────────────────────────── */
function renderWeekBars() {
  const days   = ["M", "T", "W", "T", "F", "S", "S"];
  const scores = [60, 80, 45, 90, 72, 30, 55];
  const today  = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;
  const el = document.getElementById("week-bars");
  if (!el) return;
  el.innerHTML = days.map((d, i) => {
    const h = Math.round((scores[i] / 100) * 56);
    return `<div class="wbar ${i === todayIdx ? "today" : ""}" style="height:${h}px" title="${scores[i]}%">
              <span class="wbar-label">${d}</span>
            </div>`;
  }).join("");
}

/* ─── CATEGORY BARS ──────────────────────────────────────── */
function renderCategoryBars() {
  const total = APP.tasks.length || 1;
  const cats  = [
    { name: "Work",     key: "work",     color: "#f0b429" },
    { name: "Personal", key: "personal", color: "#00d4aa" },
    { name: "Health",   key: "health",   color: "#ff6b35" },
  ];
  const el = document.getElementById("category-bars");
  if (!el) return;
  el.innerHTML = cats.map(c => {
    const count = APP.tasks.filter(t => t.cat === c.key).length;
    const pct   = Math.round((count / total) * 100);
    return `
      <div class="cat-bar-row">
        <div class="cat-bar-label">${c.name}</div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width:${pct}%;background:${c.color}"></div>
        </div>
        <div class="cat-bar-pct">${pct}%</div>
      </div>`;
  }).join("");
}

/* ─── HEATMAP ─────────────────────────────────────────────── */
function renderHeatmap() {
  const container = document.getElementById("heatmap");
  if (!container) return;
  const weeks = 16;
  let html = "";
  for (let w = 0; w < weeks; w++) {
    html += '<div class="hm-week">';
    for (let d = 0; d < 7; d++) {
      const level = Math.floor(Math.random() * 5);
      html += `<div class="hm-cell hm-${level}" title="Level ${level}"></div>`;
    }
    html += "</div>";
  }
  container.innerHTML = html;
}

/* ─── SPARKLINE ───────────────────────────────────────────── */
function renderSparkline() {
  const canvas = document.getElementById("sparkline");
  if (!canvas) return;
  const ctx  = canvas.getContext("2d");
  const data = [3, 5, 2, 8, 6, 9, 7];
  const W = canvas.width, H = canvas.height;
  const max  = Math.max(...data);
  const step = W / (data.length - 1);

  ctx.clearRect(0, 0, W, H);

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(240,180,41,.25)");
  grad.addColorStop(1, "rgba(240,180,41,0)");

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i * step;
    const y = H - (v / max) * (H - 4);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i * step;
    const y = H - (v / max) * (H - 4);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#f0b429";
  ctx.lineWidth   = 2;
  ctx.lineJoin    = "round";
  ctx.stroke();
}

/* ─── ANALYTICS ───────────────────────────────────────────── */
function updateAnalytics() {
  const done  = APP.tasks.filter(t => t.status === "done").length;
  const total = APP.tasks.length;
  const rate  = total ? Math.round((done / total) * 100) : 0;
  const doneEl = document.getElementById("an-completed");
  const rateEl = document.getElementById("an-rate");
  if (doneEl) doneEl.textContent = done;
  if (rateEl) rateEl.textContent = rate + "%";
  renderCategoryBars();
}

/* ─── AI CHAT ─────────────────────────────────────────────── */
async function sendMessage() {
  const input = document.getElementById("chat-input");
  const text  = input.value.trim();
  if (!text) return;
  input.value = "";
  addChatMessage(text, "user");
  const typingId = showTyping();
  await delay(800 + Math.random() * 500);
  removeTyping(typingId);
  addChatMessage(getAIResponse(text), "ai");
}

function getAIResponse(text) {
  const lower = text.toLowerCase();
  for (const [key, response] of Object.entries(AI_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  // Dynamic review response
  if (lower.includes("review") || lower.includes("task") || lower.includes("status")) {
    const done   = APP.tasks.filter(t => t.status === "done").length;
    const inprog = APP.tasks.filter(t => t.status === "inprogress").length;
    const todo   = APP.tasks.filter(t => t.status === "todo").length;
    const high   = APP.tasks.filter(t => t.priority === "high" && t.status !== "done").map(t => t.title).slice(0, 2).join(", ");
    return `Here's your task snapshot:\n\n📊 **Overview:**\n- ${todo} to do\n- ${inprog} in progress\n- ${done} completed\n\n🔴 **High priority pending:** ${high || "None — you're clear!"}\n\n💡 Finish in-progress tasks first. Momentum beats perfection!`;
  }
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

function addChatMessage(text, role) {
  const container = document.getElementById("chat-messages");
  if (!container) return;
  const now      = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
  const div = document.createElement("div");
  div.className = `msg ${role}-msg`;
  div.innerHTML = `<div class="msg-bubble">${formatted}</div><div class="msg-time">${now}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showTyping() {
  const container = document.getElementById("chat-messages");
  const id  = "typing-" + Date.now();
  const div = document.createElement("div");
  div.className = "msg ai-msg typing-indicator";
  div.id = id;
  div.innerHTML = `<div class="msg-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function usePrompt(btn) {
  const input = document.getElementById("chat-input");
  input.value = btn.textContent;
  sendMessage();
}

/* ─── MODAL ───────────────────────────────────────────────── */
function openQuickAdd() {
  document.getElementById("modal-overlay").classList.add("open");
  setTimeout(() => document.getElementById("task-title").focus(), 100);
}

function closeQuickAdd() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.getElementById("task-title").value = "";
  document.getElementById("task-time").value  = "";
  document.getElementById("task-notes").value = "";
}

function closeModal(e) {
  if (e.target === document.getElementById("modal-overlay")) closeQuickAdd();
}

/* ─── NAVIGATION ──────────────────────────────────────────── */
const VIEW_TITLES = {
  today:     "Today's Flow",
  tasks:     "All Tasks",
  ai:        "AI Coach",
  analytics: "Analytics",
};

function showView(viewId, btn) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  const view = document.getElementById(`view-${viewId}`);
  if (view) view.classList.add("active");
  if (btn)  btn.classList.add("active");
  document.getElementById("page-title").textContent = VIEW_TITLES[viewId] || viewId;
  if (window.innerWidth <= 900) {
    document.getElementById("sidebar").classList.remove("open");
  }
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

/* ─── TOAST ───────────────────────────────────────────────── */
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2500);
}

/* ─── UTILITY ─────────────────────────────────────────────── */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ctrl+K shortcut
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    openQuickAdd();
  }
  if (e.key === "Escape") closeQuickAdd();
});
