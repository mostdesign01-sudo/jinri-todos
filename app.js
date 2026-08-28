(function (root) {
const STORAGE_KEY = "jinri-todos-v1";
const DATA_VERSION = 2;
const TZ = "Asia/Shanghai";
const PRIORITIES = [
  { id: "urgent", label: "紧急", rank: 0 },
  { id: "high", label: "高", rank: 1 },
  { id: "medium", label: "中", rank: 2 },
  { id: "low", label: "低", rank: 3 },
];
const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

function shanghaiDateStr(now) {
  return (now || new Date()).toLocaleDateString("en-CA", { timeZone: TZ });
}

function isDateStr(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function dateFromStr(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateStr(y, m, d) {
  return y + "-" + pad2(m) + "-" + pad2(d);
}

function yearMonth(dateStr) {
  const [y, m] = (dateStr || shanghaiDateStr()).split("-").map(Number);
  return { y, m };
}

function addDays(dateStr, delta) {
  const day = isDateStr(dateStr) ? dateStr : shanghaiDateStr();
  const dt = dateFromStr(day);
  dt.setUTCDate(dt.getUTCDate() + Number(delta || 0));
  return toDateStr(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function addMonths(year, month, delta) {
  const dt = new Date(Date.UTC(year, month - 1 + Number(delta || 0), 1));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1 };
}

function formatHeaderDate(dateStr) {
  const dt = dateFromStr(isDateStr(dateStr) ? dateStr : shanghaiDateStr());
  return dt.toLocaleDateString("zh-CN", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatShortDate(dateStr) {
  const day = isDateStr(dateStr) ? dateStr : shanghaiDateStr();
  const [, m, d] = day.split("-").map(Number);
  return m + "月" + d + "日";
}

function formatMonthTitle(year, month) {
  return year + "年" + month + "月";
}

function monthCells(year, month) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const mondayOffset = (firstWeekday + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prevMonthDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    let y = year;
    let m = month;
    let d;
    let outside = false;
    if (i < mondayOffset) {
      d = prevMonthDays - mondayOffset + i + 1;
      m = month - 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      outside = true;
    } else if (i >= mondayOffset + daysInMonth) {
      d = i - mondayOffset - daysInMonth + 1;
      m = month + 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      outside = true;
    } else {
      d = i - mondayOffset + 1;
    }
    cells.push({ date: toDateStr(y, m, d), day: d, outside, y, m });
  }
  if (cells.slice(35).every((c) => c.outside)) cells.length = 35;
  return cells;
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : "t-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function sampleTodos(today) {
  const t = Date.now();
  const date = today || shanghaiDateStr();
  return [
    { id: uid(), title: "回复一条重要消息", priority: "urgent", done: false, createdAt: t, sample: true, date },
    { id: uid(), title: "整理今天最想完成的一件事", priority: "high", done: false, createdAt: t + 1, sample: true, date },
    { id: uid(), title: "晚上散步十五分钟", priority: "low", done: false, createdAt: t + 2, sample: true, date },
  ];
}

function emptyData() {
  const today = shanghaiDateStr();
  return { version: DATA_VERSION, lastDate: today, todos: sampleTodos(today) };
}

function loadRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.todos)) return emptyData();
    return data;
  } catch {
    return emptyData();
  }
}

function normalizeTodo(t, i, ctx) {
  const today = ctx.today;
  const lastDate = ctx.lastDate;
  const done = !!t.done;
  const doneDate = isDateStr(t.doneDate) ? t.doneDate : "";
  let date = isDateStr(t.date) ? t.date : "";
  if (!date) {
    date = done ? doneDate || lastDate : today;
  }
  const item = {
    id: t.id || uid(),
    title: String(t.title || "").trim() || "未命名",
    priority: PRIORITIES.some((p) => p.id === t.priority) ? t.priority : "medium",
    done,
    createdAt: Number(t.createdAt) || Date.now() + i,
    sample: !!t.sample,
    date,
  };
  if (done && doneDate) item.doneDate = doneDate;
  return item;
}

function migrate(data) {
  const today = shanghaiDateStr();
  const lastDate = isDateStr(data.lastDate) ? data.lastDate : today;
  const ctx = { today, lastDate };
  data.todos = data.todos.map((t, i) => normalizeTodo(t, i, ctx));
  data.version = DATA_VERSION;
  data.lastDate = today;
  return data;
}

function persist(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function load() {
  const data = migrate(loadRaw());
  persist(data);
  return data;
}

function priorityRank(id) {
  const p = PRIORITIES.find((x) => x.id === id);
  return p ? p.rank : 2;
}

function priorityLabel(id) {
  const p = PRIORITIES.find((x) => x.id === id);
  return p ? p.label : "中";
}

function sortTodos(todos, includeDone) {
  const list = includeDone ? todos.slice() : todos.filter((t) => !t.done);
  return list.sort((a, b) => {
    if (includeDone && a.done !== b.done) return a.done ? 1 : -1;
    const pr = priorityRank(a.priority) - priorityRank(b.priority);
    if (pr !== 0) return pr;
    return a.createdAt - b.createdAt;
  });
}

function todosOnDate(date, includeDone) {
  const day = isDateStr(date) ? date : shanghaiDateStr();
  return sortTodos(
    load().todos.filter((t) => t.date === day),
    includeDone
  );
}

function overdueTodos() {
  const today = shanghaiDateStr();
  return sortTodos(
    load().todos.filter((t) => !t.done && t.date < today),
    false
  );
}

function overlayTodos() {
  const today = shanghaiDateStr();
  return sortTodos(
    load().todos.filter((t) => !t.done && t.date <= today),
    false
  );
}

function unfinishedOnDate(date) {
  const day = isDateStr(date) ? date : shanghaiDateStr();
  return load().todos.filter((t) => !t.done && t.date === day).length;
}

function nowUnfinishedCount() {
  const today = shanghaiDateStr();
  return load().todos.filter((t) => !t.done && t.date <= today).length;
}

function taskMarks() {
  const marks = {};
  load().todos.forEach((t) => {
    if (!t.date) return;
    if (!marks[t.date]) marks[t.date] = { total: 0, open: 0 };
    marks[t.date].total += 1;
    if (!t.done) marks[t.date].open += 1;
  });
  return marks;
}

function addTodo(title, priority, date) {
  const text = (title || "").trim();
  if (!text) return load();
  const data = load();
  const day = isDateStr(date) ? date : shanghaiDateStr();
  data.todos.push({
    id: uid(),
    title: text,
    priority: PRIORITIES.some((p) => p.id === priority) ? priority : "medium",
    done: false,
    createdAt: Date.now(),
    sample: false,
    date: day,
  });
  persist(data);
  return data;
}

function toggleTodo(id) {
  const data = load();
  const item = data.todos.find((t) => t.id === id);
  if (item) {
    item.done = !item.done;
    if (item.done) item.doneDate = shanghaiDateStr();
    else delete item.doneDate;
  }
  persist(data);
  return data;
}

function deleteTodo(id) {
  const data = load();
  data.todos = data.todos.filter((t) => t.id !== id);
  persist(data);
  return data;
}

function editTitle(id, title) {
  const text = (title || "").trim();
  const data = load();
  const item = data.todos.find((t) => t.id === id);
  if (item && text) item.title = text;
  persist(data);
  return data;
}

function setTodoPriority(id, priority) {
  const data = load();
  const item = data.todos.find((t) => t.id === id);
  if (item && PRIORITIES.some((p) => p.id === priority)) item.priority = priority;
  persist(data);
  return data;
}

function clearSamples() {
  const data = load();
  data.todos = data.todos.filter((t) => !t.sample);
  persist(data);
  return data;
}

function hasSamples() {
  return load().todos.some((t) => t.sample);
}

function exportJson() {
  const data = load();
  return JSON.stringify(
    {
      version: DATA_VERSION,
      exportedAt: new Date().toISOString(),
      lastDate: data.lastDate,
      todos: data.todos,
    },
    null,
    2
  );
}

function importJson(text) {
  const parsed = JSON.parse(text);
  const todos = Array.isArray(parsed) ? parsed : parsed.todos;
  if (!Array.isArray(todos)) throw new Error("格式不对");
  const today = shanghaiDateStr();
  const lastDate = isDateStr(parsed && parsed.lastDate) ? parsed.lastDate : today;
  const data = {
    version: DATA_VERSION,
    lastDate: today,
    todos: todos.map((t, i) => normalizeTodo(t, i, { today, lastDate })),
  };
  persist(data);
  return load();
}

function unfinishedCount(date) {
  if (isDateStr(date)) return unfinishedOnDate(date);
  return nowUnfinishedCount();
}

const JinriAPI = {
  STORAGE_KEY,
  DATA_VERSION,
  PRIORITIES,
  WEEKDAYS,
  shanghaiDateStr,
  isDateStr,
  yearMonth,
  addDays,
  addMonths,
  formatHeaderDate,
  formatShortDate,
  formatMonthTitle,
  monthCells,
  load,
  persist,
  sortTodos,
  todosOnDate,
  overdueTodos,
  overlayTodos,
  unfinishedOnDate,
  nowUnfinishedCount,
  taskMarks,
  addTodo,
  toggleTodo,
  deleteTodo,
  editTitle,
  setTodoPriority,
  clearSamples,
  hasSamples,
  exportJson,
  importJson,
  unfinishedCount,
  priorityLabel,
};

root.Jinri = JinriAPI;
if (typeof module !== "undefined" && module.exports) module.exports = JinriAPI;
})(typeof window !== "undefined" ? window : globalThis);
