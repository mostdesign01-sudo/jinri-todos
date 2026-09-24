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
assert(Jinri.petSpeech({ hour: 18, overdue: 0, open: 2, streak: 3 }).speech.indexOf("天快晚了") === 0, "pet dusk speech");
assert(Jinri.petFaceSrc("idle", "3d") === "icons/face3d-idle.png", "idle 3d face");
assert(Jinri.petFaceSrc("night", "3d") === "icons/face3d-night.png", "night 3d face");
assert(Jinri.petFaceSrc("poke", "pixel") === "icons/facepx-poke.png", "poke pixel face");
assert(Jinri.petFaceSrc("missing", "3d") === "icons/face3d-idle.png", "unknown mood falls back");
assert(Jinri.setPetStyle("pixel") === "pixel", "stores pixel style");
assert(Jinri.petStyle() === "pixel", "reads pixel style");
assert(Jinri.setPetStyle("3d") === "3d", "stores 3d style");
assert(typeof Jinri.nativeBridge === "function" && Jinri.nativeBridge() === null, "no native bridge in node");
assert(Jinri.isNativeShell() === false, "node is not the Mac shell");
assert(Jinri.nagSlot({ mood: "dusk" }, today) === today + "-dusk", "nag slot dusk");
assert(Jinri.nagSlot({ mood: "idle" }, today) === "", "idle has no nag");

reset();
seed({
  lastDate: today,
  todos: [{ id: "s1", title: "打卡", priority: "medium", done: false, createdAt: 1, date: today }],
  remind: { on: false, lastNag: "", streak: 2, streakDate: yesterday },
});
Jinri.toggleTodo("s1");
assert(Jinri.streakCount(today) === 3, "completing continues streak");

reset();
seed({
  lastDate: today,
  todos: [{ id: "open1", title: "还在", priority: "low", done: false, createdAt: 1, date: today }],
  remind: { on: true, lastNag: "", streak: 0, streakDate: "" },
});
const nag1 = Jinri.maybeNag({ hour: 18, overdue: 0, open: 1 });
assert(nag1 && nag1.type === "nag" && nag1.title === "小鲨在催你", "enabled remind nags at dusk");
assert(Jinri.maybeNag({ hour: 18, overdue: 0, open: 1 }) === null, "same slot nags once");

reset();
seed({
  lastDate: today,
  todos: [{ id: "open2", title: "还在", priority: "low", done: false, createdAt: 1, date: today }],
  remind: { on: false, lastNag: "", streak: 0, streakDate: "" },
});
assert(Jinri.maybeNag({ hour: 22, overdue: 0, open: 1 }) === null, "remind off does not nag");

reset();
seed({
  lastDate: today,
  todos: [
    { id: "del-me", title: "误删", priority: "high", done: false, createdAt: 1, date: today },
    { id: "later", title: "周末计划", priority: "medium", done: false, createdAt: 2, date: tomorrow },
  ],
  trash: [],
});
Jinri.deleteTodo("del-me");
assert(!Jinri.load().todos.some((t) => t.id === "del-me"), "delete removes from list");
assert(Jinri.trashList().some((t) => t.id === "del-me"), "delete keeps trash copy");
assert(Jinri.upcomingGroups()[0] && Jinri.upcomingGroups()[0].items[0].title === "周末计划", "upcoming groups future tasks");
Jinri.restoreTodo("del-me");
assert(Jinri.load().todos.some((t) => t.id === "del-me"), "restore puts task back");
assert(!Jinri.trashList().some((t) => t.id === "del-me"), "restore leaves trash");

assert(new Date(Date.UTC(2026, 8, 24)).getUTCDay() === 4, "2026-09-24 is Thursday");
assert(
  JSON.stringify(Jinri.rangeDays("2026-09-10", "2026-09-12")) ===
    JSON.stringify(["2026-09-10", "2026-09-11", "2026-09-12"]),
  "rangeDays inclusive"
);
assert(Jinri.rangeDays("2026-09-12", "2026-09-10")[0] === "2026-09-10", "rangeDays swaps when end is earlier");
assert(Jinri.rangeDays("2026-09-12", "2026-09-10").length === 3, "rangeDays swapped length");
assert(Jinri.rangeDays("2026-09-10", "2026-09-10").length === 1, "rangeDays single day");
assert(Jinri.rangeDays("bad", "2026-09-10").length === 0, "rangeDays rejects invalid dates");
assert(Jinri.rangeDays("2026-12-30", "2027-01-02").join(",") === "2026-12-30,2026-12-31,2027-01-01,2027-01-02", "rangeDays crosses year");
const capped = Jinri.rangeDays("2026-01-01", "2026-12-31");
assert(capped.length === 62, "rangeDays caps at 62");
assert(capped[0] === "2026-01-01" && capped[61] === Jinri.addDays("2026-01-01", 61), "rangeDays cap keeps the earlier start");

assert(
  JSON.stringify(Jinri.presetRange("2026-09-24", "weekend")) === JSON.stringify({ start: "2026-09-26", end: "2026-09-27" }),
  "weekend from Thursday is upcoming Sat–Sun"
);
assert(
  JSON.stringify(Jinri.presetRange("2026-09-26", "weekend")) === JSON.stringify({ start: "2026-09-26", end: "2026-09-27" }),
  "weekend on Saturday is today through Sunday"
);
assert(
  JSON.stringify(Jinri.presetRange("2026-09-27", "weekend")) === JSON.stringify({ start: "2026-09-27", end: "2026-09-27" }),
  "weekend on Sunday is today only"
);
assert(
  JSON.stringify(Jinri.presetRange("2026-09-25", "weekend")) === JSON.stringify({ start: "2026-09-26", end: "2026-09-27" }),
  "weekend on Friday is tomorrow and Sunday"
);
assert(
  JSON.stringify(Jinri.presetRange("2026-09-24", "3d")) === JSON.stringify({ start: "2026-09-24", end: "2026-09-26" }),
  "3d is today through today+2"
);
assert(
  JSON.stringify(Jinri.presetRange("2026-09-24", "1w")) === JSON.stringify({ start: "2026-09-24", end: "2026-09-30" }),
  "1w is today through today+6"
);
assert(
  JSON.stringify(Jinri.presetRange("2026-09-24", "2w")) === JSON.stringify({ start: "2026-09-24", end: "2026-10-07" }),
  "2w is today through today+13"
);

reset();
seed({
  version: 2,
  lastDate: "2026-09-24",
  todos: [
    { id: "a", title: "后一天", priority: "low", done: false, createdAt: 2, date: "2026-09-26" },
    { id: "b", title: "紧急", priority: "urgent", done: false, createdAt: 1, date: "2026-09-24" },
    { id: "c", title: "已完成", priority: "medium", done: true, createdAt: 3, date: "2026-09-24" },
    { id: "d", title: "区间外", priority: "high", done: false, createdAt: 4, date: "2026-09-20" },
    { id: "e", title: "更后", priority: "low", done: false, createdAt: 5, date: "2026-09-28" },
  ],
  trash: [],
  remind: { on: false, lastNag: "", streak: 0, streakDate: "" },
});
const ranged = Jinri.todosInRange("2026-09-24", "2026-09-27", true);
assert(ranged.length === 2, "todosInRange drops empty days");
assert(ranged[0].date === "2026-09-24" && ranged[1].date === "2026-09-26", "todosInRange sorts by date");
assert(ranged[0].todos.map((t) => t.id).join(",") === "b,c", "todosInRange sorts open before done");
const openRange = Jinri.todosInRange("2026-09-28", "2026-09-24", false);
assert(openRange.map((g) => g.date).join(",") === "2026-09-24,2026-09-26,2026-09-28", "todosInRange swaps and can hide done");
assert(openRange.every((g) => g.todos.every((t) => !t.done)), "includeDone false drops completed");
const onlyDoneDay = Jinri.todosInRange("2026-09-24", "2026-09-24", false);
assert(onlyDoneDay.length === 1 && onlyDoneDay[0].todos.length === 1 && onlyDoneDay[0].todos[0].id === "b", "a mixed day keeps open todos");
const summary = Jinri.rangeSummary("2026-09-24", "2026-09-26");
assert(summary.days === 3 && summary.open === 2 && summary.done === 1, "rangeSummary counts days, open, done");
assert(Jinri.rangeSummary("nope", "2026-09-01").days === 0, "rangeSummary on invalid range is empty");

reset();
Jinri.addTodo("同形", "low", "2026-09-01");
const single = Jinri.load().todos.find((t) => t.title === "同形");
reset();
const addedN = Jinri.addTodoRange("同形", "low", "2026-09-01", "2026-09-01");
const rangedOne = Jinri.load().todos.find((t) => t.title === "同形");
assert(addedN === 1, "addTodoRange single day returns 1");
assert(Object.keys(rangedOne).sort().join(",") === Object.keys(single).sort().join(","), "addTodoRange uses addTodo keys");
assert(rangedOne.done === false && rangedOne.sample === false && rangedOne.priority === "low" && rangedOne.date === "2026-09-01", "addTodoRange matches addTodo shape");
const beforeBlank = Jinri.load().todos.length;
assert(Jinri.addTodoRange("   ", "high", "2026-09-01", "2026-09-03") === 0, "blank title adds nothing");
assert(Jinri.load().todos.length === beforeBlank, "blank title does not append");
assert(Jinri.addTodoRange("倒序", "nope", "2026-09-03", "2026-09-01") === 3, "addTodoRange swaps and defaults priority");
const flipped = Jinri.load().todos.filter((t) => t.title === "倒序");
assert(flipped.map((t) => t.date).join(",") === "2026-09-01,2026-09-02,2026-09-03", "swapped days each get one todo");
assert(flipped.every((t) => t.priority === "medium" && t.done === false && t.sample === false), "invalid priority becomes medium");
reset();
assert(Jinri.addTodoRange("长区间", "high", "2026-01-01", "2026-06-01") === 62, "addTodoRange caps at 62 days");
assert(Jinri.load().todos.filter((t) => t.title === "长区间").length === 62, "capped range persists once as 62 todos");

if (failed) {
  console.error("\n" + failed + " failed");
  process.exit(1);
}
console.log("\nall passed");
