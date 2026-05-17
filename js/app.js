/* ═══════════════════════════════════════════════════════════
   FLOWMIND — App Logic
   Full offline-capable AI productivity app
   ═══════════════════════════════════════════════════════════ */

"use strict";

/* ─── STATE ─────────────────────────────────────────────── */
const APP = {
  tasks: [],
  chatHistory: [],
  currentFilter: "all",
  nextId: 1,
};

/* ─── SEED DATA ─────────────────────────────────────────── */
const SEED_TASKS = [
  { title: "Review Q2 product roadmap",  cat: "work",     priority: "high",   status: "inprogress", time: "9:00 AM" },
  { title: "Write weekly team update",   cat: "work",     priority: "medium", status: "todo",       time: "10:30 AM" },
  { title: "Customer feedback analysis", cat: "work",     priority: "high",   status: "todo",       time: "11:00 AM" },
  { title: "30-min morning run",         cat: "health",   priority: "medium", status: "done",       time: "7:00 AM" },
  { title: "Meal prep for the week",     cat: "health",   priority: "low",    status: "todo",       time: "6:00 PM" },
  { title: "Call with mentor",           cat: "personal", priority: "high",   status: "done",       time: "2:00 PM" },
  { title: "Read 20 pages of book",      cat: "personal", priority: "low",    status: "todo",       time: "9:00 PM" },
  { title: "Fix homepage bug",           cat: "work",     priority: "high",   status: "done",       time: "8:30 AM" },
];

/* ─── AI RESPONSES ──────────────────────────────────────── */
const AI_RESPONSES = {
  "plan my morning": `Here's an optimized morning flow for maximum output:

**7:00 AM** — Quick win: tackle one small task immediately to build momentum.
**7:30 AM** — Deep work block (no notifications). Start with your highest-priority item.
**9:00 AM** — Review the day's task list, adjust priorities.
**9:30 AM** — Collaboration window: emails, Slack, meetings.

Pro tip: Your first 90 minutes set the tone for the entire day. Protect them fiercely. Want me to add these as time blocks?`,

  "i'm feeling overwhelmed": `I hear you — that feeling is real, and it's a signal, not a verdict. Let's reset together.

**Right now:** Close all tabs except this one. Breathe for 60 seconds.

**Then:** Let's do a brain dump. What are the top 3 things weighing on you most? Once we name them, we can triage — some won't matter in a week, and some we can break into tiny steps.

**Remember:** Overwhelm happens when your brain is trying to process everything at once. One task at a time is always the answer.

Would you like me to help you sort and prioritize your task list right now?`,

  "review my tasks": `Here's a snapshot of your current workload:

📊 **Task Overview:**
- ${APP.tasks.filter(t => t.status === "todo").length} tasks to do
- ${APP.tasks.filter(t => t.status === "inprogress").length} in progress  
- ${APP.tasks.filter(t => t.status === "done").length} completed

🔴 **High-priority pending:** ${APP.tasks.filter(t => t.priority === "high" && t.status !== "done").map(t => t.title).slice(0, 2).join(", ") || "None — you're clear!"}

💡 **My recommendation:** Focus on the in-progress items first. Finishing beats starting. Once those are done, pick the highest-priority "To Do" item next.

Want me to suggest a focus order?`,

  "boost my focus": `Let's trigger a deep focus state. Here's what science says actually works:

**⚡ Immediate (right now):**
1. Put on noise-cancelling headphones or use a focus playlist (binaural beats, lo-fi, or white noise)
2. Set a 25-minute timer (Pomodoro technique)
3. Write down the ONE thing you're doing in this block

**🧠 Environment:**
- Close all social media tabs
- Put your phone face-down in another room
- Get a glass of water — dehydration tanks focus by 20%

**📅 Your peak window:** Based on typical patterns, you're likely sharpest between 9–11 AM and 3–5 PM.

Ready to start a 25-minute focus sprint? I'll check in on you after! 🚀`,
};

const FALLBACK_RESPONSES = [
  "That's a great point! Let me think through this with you. Based on your current task load, I'd suggest prioritizing by impact and urgency. What feels most pressing right now?",
  "I'm analyzing your productivity patterns. You tend to do best when you chunk similar tasks together. Try batching all your communication tasks in one block today.",
  "Interesting! Here's my take: the most productive people don't work harder — they work on fewer things at a time. What's the one thing that would make today a success?",
  "Let's break that down. Start with the hardest part first — it's called 'eating the frog,' and it means your mental energy goes to your toughest challenge when it's freshest.",
  "Based on your tasks, you have a solid plan. The key now is protecting your focus blocks from interruptions. Even 90 minutes of uninterrupted deep work beats 4 hours of distracted work.",
];

/* ─── INIT ──────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  setLiveDate();
  seedTasks();
  renderTimeBlocks();
  renderStats();
  renderKanban();
  renderWeekBars();
  renderCategoryBars();
  renderHeatmap();
  renderSparkline();
  animateRing(72);
  updateAnalytics();
});

/* ─── DATE ──────────────────────────────────────────────── */
function setLiveDate() {
  const el = document.getElementById("live-date");
  const now = new Date();
  el.textContent = now.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric"
  });
}

/* ─── TASK MANAGEMENT ────────────────────────────────────── */
function seedTasks() {
  SEED_TASKS.forEach(t => {
    APP.tasks.push({ ...t, id: APP.nextId++ });
  });
}

function addTask() {
  const title = document.getElementById("task-title").value.trim();
  if (!title) return showToast("Please enter a task title");

  const task = {
    id:       APP.nextId++,
    title,
    cat:      document.getElementById("task-cat").value,
    priority: document.getElementById("task-priority").value,
    time:     document.getElementById("task-time").value || "Anytime",
    notes:    document.getElementById("task-notes").value,
    status:   "todo",
  };

  APP.tasks.push(task);
  closeQuickAdd();
  renderTimeBlocks();
  renderStats();
  renderKanban();
  updateAnalytics();
  showToast("✅ Task added!");
}

function toggleTaskDone(id) {
  const task = APP.tasks.find(t => t.id === id);
  if (!task) return;
  task.status = task.status === "done" ? "todo" : "done";
  renderTimeBlocks();
  renderStats();
  renderKanban();
  updateAnalytics();
  recalcFocusScore();
}

function recalcFocusScore() {
  const total = APP.tasks.length;
  const done  = APP.tasks.filter(t => t.status === "done").length;
  const score = total ? Math.round((done / total) * 100) : 0;
  document.getElementById("focus-score").textContent = score;
  document.getElementById("ring-pct").textContent    = score + "%";
  animateRing(score);
}

/* ─── RENDER: TIME BLOCKS ────────────────────────────────── */
function renderTimeBlocks() {
  const container = document.getElementById("time-blocks-today");
  const tasks = APP.tasks.filter(t => t.status !== "done" || t.status === "done").slice(0, 6);

  container.innerHTML = tasks.map(t => {
    const accentColor = t.cat === "work" ? "#f0b429" : t.cat === "health" ? "#ff6b35" : "#00d4aa";
    return `
      <div class="time-block ${t.status === "done" ? "done" : ""}" onclick="toggleTaskDone(${t.id})">
        <div class="tb-accent-bar" style="background:${accentColor}"></div>
        <div class="tb-time">${t.time}</div>
        <div class="tb-title">${t.title}</div>
        <span class="tb-cat cat-${t.cat}">${t.cat}</span>
        <div class="tb-check ${t.status === "done" ? "checked" : ""}">${t.status === "done" ? "✓" : ""}</div>
      </div>`;
  }).join("");
}

/* ─── RENDER: STATS ──────────────────────────────────────── */
function renderStats() {
  const total    = APP.tasks.length;
  const done     = APP.tasks.filter(t => t.status === "done").length;
  const inprog   = APP.tasks.filter(t => t.status === "inprogress").length;
  const pct      = total ? Math.round((done / total) * 100) : 0;

  document.getElementById("stats-row").innerHTML = `
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
  const filter = APP.currentFilter;
  const filtered = filter === "all" ? APP.tasks : APP.tasks.filter(t => t.cat === filter);

  ["todo", "inprogress", "done"].forEach(status => {
    const cards = filtered.filter(t => t.status === status);
    const container = document.getElementById(`cards-${status}`);
    document.getElementById(`count-${status}`).textContent = cards.length;

    container.innerHTML = cards.map(t => {
      const nextStatus = t.status === "todo" ? "inprogress" : t.status === "inprogress" ? "done" : "todo";
      const nextLabel  = t.status === "todo" ? "▶ Start" : t.status === "inprogress" ? "✓ Done" : "↩ Reopen";
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
        <button class="kc-action-btn"
                style="color:${nextColor};border-color:${nextColor}22;background:${nextColor}11"
                onclick="cycleStatus(${t.id},'${nextStatus}')">${nextLabel}</button>
      </div>`;
    }).join("");
  });
}

/* ─── CYCLE STATUS (click button on card) ───────────────── */
function cycleStatus(id, newStatus) {
  const task = APP.tasks.find(t => t.id === id);
  if (!task) return;
  task.status = newStatus;
  renderKanban();
  renderTimeBlocks();
  renderStats();
  updateAnalytics();
  recalcFocusScore();
  const label = newStatus === "inprogress" ? "In Progress" : newStatus === "done" ? "Done ✅" : "To Do";
  showToast(`Moved to ${label}`);
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
  if (task) {
    task.status = newStatus;
    renderKanban();
    renderTimeBlocks();
    renderStats();
    updateAnalytics();
    recalcFocusScore();
    showToast("Task moved to " + newStatus.replace("inprogress", "In Progress"));
  }
  draggedId = null;
}

/* ─── FILTER ─────────────────────────────────────────────── */
function filterTasks(cat, btn) {
  APP.currentFilter = cat;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderKanban();
}

/* ─── RING ANIMATION ─────────────────────────────────────── */
function animateRing(pct) {
  const circ = 2 * Math.PI * 50; // r=50
  const fill = circ - (pct / 100) * circ;
  const ring = document.getElementById("ring-circle");
  if (ring) ring.style.strokeDashoffset = fill;
}

/* ─── WEEK BARS ──────────────────────────────────────────── */
function renderWeekBars() {
  const days   = ["M", "T", "W", "T", "F", "S", "S"];
  const scores = [60, 80, 45, 90, 72, 30, 55];
  const today  = new Date().getDay(); // 0=sun
  const todayIdx = today === 0 ? 6 : today - 1;

  document.getElementById("week-bars").innerHTML = days.map((d, i) => {
    const h = Math.round((scores[i] / 100) * 56);
    return `<div class="wbar ${i === todayIdx ? "today" : ""}"
               style="height:${h}px" title="${scores[i]}%">
               <span class="wbar-label">${d}</span>
             </div>`;
  }).join("");
}

/* ─── CATEGORY BARS ──────────────────────────────────────── */
function renderCategoryBars() {
  const cats = [
    { name: "Work",     pct: 58, color: "#f0b429" },
    { name: "Personal", pct: 25, color: "#00d4aa" },
    { name: "Health",   pct: 17, color: "#ff6b35" },
  ];

  document.getElementById("category-bars").innerHTML = cats.map(c => `
    <div class="cat-bar-row">
      <div class="cat-bar-label">${c.name}</div>
      <div class="cat-bar-track">
        <div class="cat-bar-fill" style="width:${c.pct}%;background:${c.color}"></div>
      </div>
      <div class="cat-bar-pct">${c.pct}%</div>
    </div>`).join("");
}

/* ─── HEATMAP ─────────────────────────────────────────────── */
function renderHeatmap() {
  const container = document.getElementById("heatmap");
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
  const ctx = canvas.getContext("2d");
  const data = [3, 5, 2, 8, 6, 9, 7];
  const W = canvas.width, H = canvas.height;
  const max = Math.max(...data);
  const step = W / (data.length - 1);

  ctx.clearRect(0, 0, W, H);

  // Fill
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(240,180,41,.25)");
  grad.addColorStop(1, "rgba(240,180,41,0)");

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i * step;
    const y = H - (v / max) * (H - 4);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i * step;
    const y = H - (v / max) * (H - 4);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#f0b429";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.stroke();
}

/* ─── ANALYTICS UPDATE ────────────────────────────────────── */
function updateAnalytics() {
  const done  = APP.tasks.filter(t => t.status === "done").length;
  const total = APP.tasks.length;
  const rate  = total ? Math.round((done / total) * 100) : 0;
  document.getElementById("an-completed").textContent = done;
  document.getElementById("an-rate").textContent      = rate + "%";
}

/* ─── AI CHAT ─────────────────────────────────────────────── */
async function sendMessage() {
  const input = document.getElementById("chat-input");
  const text  = input.value.trim();
  if (!text) return;

  input.value = "";
  addChatMessage(text, "user");

  // Show typing indicator
  const typingId = showTyping();

  await delay(900 + Math.random() * 600);

  removeTyping(typingId);

  const response = getAIResponse(text);
  addChatMessage(response, "ai");
}

function getAIResponse(text) {
  const lower = text.toLowerCase();

  // Check keyword matches
  for (const [key, response] of Object.entries(AI_RESPONSES)) {
    if (lower.includes(key)) {
      // For review tasks, regenerate dynamically
      if (key === "review my tasks") {
        return `Here's a snapshot of your current workload:\n\n📊 **Task Overview:**\n- ${APP.tasks.filter(t => t.status === "todo").length} tasks to do\n- ${APP.tasks.filter(t => t.status === "inprogress").length} in progress\n- ${APP.tasks.filter(t => t.status === "done").length} completed\n\n💡 **My recommendation:** Focus on finishing in-progress tasks before starting new ones. Momentum beats perfection every time.`;
      }
      return response;
    }
  }

  // Fallback
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

function addChatMessage(text, role) {
  const container = document.getElementById("chat-messages");
  const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const div = document.createElement("div");
  div.className = `msg ${role}-msg`;

  // Convert markdown-like bold to <strong>
  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");

  div.innerHTML = `
    <div class="msg-bubble">${formatted}</div>
    <div class="msg-time">${now}</div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showTyping() {
  const container = document.getElementById("chat-messages");
  const id = "typing-" + Date.now();
  const div = document.createElement("div");
  div.className = "msg ai-msg typing-indicator";
  div.id = id;
  div.innerHTML = `<div class="msg-bubble">
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  </div>`;
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
  input.focus();
  sendMessage();
}

/* ─── MODAL ───────────────────────────────────────────────── */
function openQuickAdd() {
  document.getElementById("modal-overlay").classList.add("open");
  document.getElementById("task-title").focus();
}

function closeQuickAdd() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.getElementById("task-title").value  = "";
  document.getElementById("task-time").value   = "";
  document.getElementById("task-notes").value  = "";
}

function closeModal(e) {
  if (e.target === document.getElementById("modal-overlay")) {
    closeQuickAdd();
  }
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

  document.getElementById(`view-${viewId}`).classList.add("active");
  if (btn) btn.classList.add("active");
  document.getElementById("page-title").textContent = VIEW_TITLES[viewId] || viewId;

  // Close sidebar on mobile
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

// Keyboard shortcut: Cmd/Ctrl+K to add task
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    openQuickAdd();
  }
});
