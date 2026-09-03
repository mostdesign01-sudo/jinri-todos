const store = {};
global.localStorage = {
  getItem(k) {
    return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
  },
  setItem(k, v) {
    store[k] = String(v);
  },
  removeItem(k) {
    delete store[k];
  },
  clear() {
    Object.keys(store).forEach((k) => delete store[k]);
  },
};

const Jinri = require("./app.js");
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", msg);
  } else {
    console.log("ok  ", msg);
  }
}

function seed(data) {
  localStorage.setItem(Jinri.STORAGE_KEY, JSON.stringify(data));
}

function reset() {
  localStorage.clear();
}

reset();
const today = Jinri.shanghaiDateStr();
const yesterday = Jinri.addDays(today, -1);
const tomorrow = Jinri.addDays(today, 1);

assert(/^\d{4}-\d{2}-\d{2}$/.test(today), "shanghaiDateStr is YYYY-MM-DD");
assert(Jinri.addDays("2026-08-28", -1) === "2026-08-27", "addDays back one");
assert(Jinri.addDays("2026-03-01", -1) === "2026-02-28", "addDays across month");
assert(Jinri.formatShortDate("2026-08-28") === "8月28日", "short date label");
assert(Jinri.formatMonthTitle(2026, 8) === "2026年8月", "month title");
assert(JSON.stringify(Jinri.addMonths(2026, 1, -1)) === JSON.stringify({ y: 2025, m: 12 }), "addMonths wrap");

const aug = Jinri.monthCells(2026, 8);
assert(aug[0].date === "2026-07-27", "Aug 2026 grid starts Monday Jul 27");
assert(aug.find((c) => c.date === "2026-08-01" && !c.outside), "Aug 1 inside month");
assert(aug[aug.length - 1].date === "2026-09-06", "Aug 2026 grid ends Sep 6");

const week = Jinri.weekCells("2026-09-02");
assert(week.length === 7, "week has 7 days");
assert(week[0].date === "2026-08-31", "week of Sep 2 2026 starts Monday Aug 31");
assert(week[2].date === "2026-09-02", "Wednesday is the third cell");
assert(week[6].date === "2026-09-06", "week ends Sunday");

const feb = Jinri.monthCells(2021, 2);
assert(feb.length === 35, "Feb 2021 trims empty last row");
assert(feb[0].date === "2021-02-01", "Feb 2021 starts on Monday");

reset();
seed({
  lastDate: yesterday,
  todos: [
    { id: "open-1", title: "旧未完成", priority: "high", done: false, createdAt: 1 },
    { id: "done-1", title: "旧已完成", priority: "low", done: true, createdAt: 2 },
    { id: "done-2", title: "带完成日", priority: "medium", done: true, createdAt: 3, doneDate: "2026-08-20" },
  ],
});
const migrated = Jinri.load();
const byId = Object.fromEntries(migrated.todos.map((t) => [t.id, t]));
assert(migrated.version === 2, "migrated data version is 2");
assert(byId["open-1"].date === today, "v1 unfinished moves to today");
assert(byId["done-1"].date === yesterday, "v1 completed keeps lastDate");
assert(byId["done-2"].date === "2026-08-20", "v1 completed keeps doneDate");
assert(migrated.todos.length === 3, "migration does not drop completed tasks");

Jinri.addTodo("后天计划", "medium", tomorrow);
Jinri.addTodo("昨天没做", "urgent", yesterday);
assert(Jinri.todosOnDate(tomorrow, false).some((t) => t.title === "后天计划"), "add uses viewed/future date");
assert(Jinri.overdueTodos().some((t) => t.title === "昨天没做"), "past unfinished is overdue");
assert(!Jinri.overdueTodos().some((t) => t.title === "旧未完成"), "today unfinished is not overdue");
assert(
  Jinri.overlayTodos().every((t) => t.date <= today) &&
    Jinri.overlayTodos().some((t) => t.title === "昨天没做") &&
    !Jinri.overlayTodos().some((t) => t.title === "后天计划"),
  "overlay is today unfinished + overdue only"
);
assert(Jinri.unfinishedOnDate(today) >= 1, "remain for a day counts that day");
assert(Jinri.taskMarks()[yesterday].open >= 1, "calendar marks include open count");

const exported = JSON.parse(Jinri.exportJson());
assert(exported.version === 2, "export version 2");
assert(exported.todos.every((t) => t.date), "export includes dates");
assert(exported.todos.some((t) => t.date === tomorrow), "export includes all dates");

reset();
Jinri.importJson(JSON.stringify({
  lastDate: yesterday,
  todos: [{ id: "imp", title: "导入旧数据", priority: "high", done: false, createdAt: 9 }],
}));
assert(Jinri.load().todos.find((t) => t.id === "imp").date === today, "import v1 unfinished -> today");

reset();
Jinri.importJson(JSON.stringify({
  version: 2,
  lastDate: today,
  todos: [{ id: "keep", title: "未来", priority: "low", done: false, createdAt: 10, date: tomorrow }],
}));
assert(Jinri.load().todos.find((t) => t.id === "keep").date === tomorrow, "import v2 keeps date");

reset();
seed({
  lastDate: today,
  todos: [{ id: "tog", title: "勾选", priority: "medium", done: false, createdAt: 1, date: yesterday }],
});
Jinri.toggleTodo("tog");
const toggled = Jinri.load().todos[0];
assert(toggled.done && toggled.date === yesterday && toggled.doneDate === today, "toggle done keeps original date");

assert(Jinri.reminderState({ hour: 10, overdue: 0, open: 2 }).mood === "idle", "daytime unfinished is idle");
assert(Jinri.reminderState({ hour: 18, overdue: 0, open: 2 }).mood === "dusk", "evening unfinished is dusk");
assert(Jinri.reminderState({ hour: 22, overdue: 0, open: 1 }).mood === "night", "late unfinished is night");
assert(Jinri.reminderState({ hour: 10, overdue: 1, open: 1 }).mood === "overdue", "overdue wins over hour");
assert(Jinri.reminderState({ hour: 22, overdue: 0, open: 0 }).mood === "done", "none left is done");
assert(Jinri.reminderState({ hour: 18, overdue: 0, open: 2 }).text === "天快晚了", "dusk copy");

if (failed) {
  console.error("\n" + failed + " failed");
  process.exit(1);
}
console.log("\nall passed");
