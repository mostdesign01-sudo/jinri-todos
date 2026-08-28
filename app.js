const STORAGE_KEY = "jinri-todos-v1";
const TZ = "Asia/Shanghai";
const PRIORITIES = [
  { id: "urgent", label: "紧急", rank: 0 },
  { id: "high", label: "高", rank: 1 },
  { id: "medium", label: "中", rank: 2 },
  { id: "low", label: "低", rank: 3 },
];

function shanghaiDateStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

function formatHeaderDate() {
  return new Date().toLocaleDateString("zh-CN", {
    timeZone: TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : "t-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function sampleTodos() {
  const t = Date.now();
  return [
    { id: uid(), title: "回复一条重要消息", priority: "urgent", done: false, createdAt: t, sample: true },
    { id: uid(), title: "整理今天最想完成的一件事", priority: "high", done: false, createdAt: t + 1, sample: true },
    { id: uid(), title: "晚上散步十五分钟", priority: "low", done: false, createdAt: t + 2, sample: true },
  ];
}

function emptyData() {
  return { lastDate: shanghaiDateStr(), todos: sampleTodos() };
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

function rollover(data) {
  const today = shanghaiDateStr();
  if (data.lastDate !== today) {
    data.todos = data.todos.filter((t) => !t.done);
    data.lastDate = today;
  }
  return data;
}

function persist(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function load() {
  const data = rollover(loadRaw());
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

function addTodo(title, priority) {
  const text = (title || "").trim();
  if (!text) return load();
  const data = load();
  data.todos.push({
    id: uid(),
    title: text,
    priority: PRIORITIES.some((p) => p.id === priority) ? priority : "medium",
    done: false,
    createdAt: Date.now(),
    sample: false,
  });
  persist(data);
  return data;
}

function toggleTodo(id) {
  const data = load();
  const item = data.todos.find((t) => t.id === id);
  if (item) item.done = !item.done;
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
      version: 1,
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
  const data = {
    lastDate: shanghaiDateStr(),
    todos: todos.map((t, i) => ({
      id: t.id || uid(),
      title: String(t.title || "").trim() || "未命名",
      priority: PRIORITIES.some((p) => p.id === t.priority) ? t.priority : "medium",
      done: !!t.done,
      createdAt: Number(t.createdAt) || Date.now() + i,
      sample: !!t.sample,
    })),
  };
  persist(rollover(data));
  return load();
}

function unfinishedCount() {
  return load().todos.filter((t) => !t.done).length;
}

window.Jinri = {
  STORAGE_KEY,
  PRIORITIES,
  shanghaiDateStr,
  formatHeaderDate,
  load,
  persist,
  sortTodos,
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
