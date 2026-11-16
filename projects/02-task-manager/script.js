const UI = {
    toast: document.getElementById("toast"),
    title: document.getElementById("title-field"),
    description: document.getElementById("description-field"),
    resetBtn: document.getElementById("reset-button"),
    addTaskBtn: document.getElementById("add-task-button"),
    countText: document.getElementById("count-text"),
    shownText: document.getElementById("shown-text"),
    seedBtn: document.getElementById("seed-button"),
    clearAllBtn: document.getElementById("clear-all-button"),
    tasksNav: document.getElementById("tasks-nav"),
    tasksContainer: document.getElementById("tasks-container"),
    loading: document.getElementById("loading"),
    errorMessage: document.getElementById("error-message"),
    search: document.getElementById("search")
}


let db = null;
let tasks = [];
let currentFilter = "all";

const storeName = "tasks";

let timeOut;
function showToast(message){
    clearTimeout(timeOut);
    UI.toast.style.display = "none";
    void UI.toast.offsetWidth;
    UI.toast.textContent = message;
    UI.toast.style.display = "block";
    timeOut = setTimeout(() => UI.toast.style.display = "none", 2200);
}


function setLoading(isLoading){
    UI.loading.style.display = isLoading ? "block" : "none";
    UI.addTaskBtn.disabled = isLoading;
    UI.addTaskBtn.classList.toggle("disabled", isLoading);
    UI.seedBtn.disabled = isLoading;
    UI.seedBtn.classList.toggle("disabled", isLoading);
    UI.clearAllBtn.disabled = isLoading;
    UI.clearAllBtn.classList.toggle("disabled", isLoading);
}


function setError(message){
    UI.errorMessage.textContent = message;
    UI.errorMessage.style.display = message ? "block" : "none";
}

// Escape the HTML code string, before adding it using innerHTML, for safety.
function esc(s){
    return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// Convert the millesecondes to readable string.
function dateFormate(ms){
    return new Date(ms).toLocaleString();
}

// Open the IDB, create new store, and create two indexes for searching and sorting.
function openDB(){
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("TaskDB", 1);

        request.onupgradeneeded = () => {
            db = request.result;

            const store = db.createObjectStore(storeName, {
                keyPath: "id",
                autoIncrement: true
            });

            store.createIndex("status", "status", {unique: false});
            store.createIndex("createdAt", "status", {unique: false});
        }

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
    });
}


// Create transaction, and return the store.
function createTX(storeName, mode = "readonly"){
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
}


// Convert the old event-based idbRequest to promise for cleaner code.
function idbRequestToPromise(request){
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("IndexedDB request failed!"));
    });
}


async function getAllTasks(){
    const store = createTX(storeName);
    const all = await idbRequestToPromise(store.getAll());

    all.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    return all;
}

// Create new task, add it to the IDB, and return the task object with the new id.
// Always new tasks start with status: "pending".
async function createTask({title, description}){
    const now = Date.now();

    const task = {
        title,
        description,
        status: "pending",
        createdAt: now,
        updatedAt: now
    };

    const store = createTX(storeName, "readwrite");
    const id = await idbRequestToPromise(store.add(task));
    return {...task, id};
}

async function updateTask(id, patch){
    const store = createTX(storeName, "readwrite");
    const oldTask = await idbRequestToPromise(store.get(id));
    if (!oldTask) return new Error("Task not found!");

    const updatedTask = {
        ...oldTask,
        ...patch,
        updatedAt: Date.now()
    };

    await idbRequestToPromise(store.put(updatedTask));
    return updatedTask;
}

async function deleteTask(id){
    const store = createTX(storeName, "readwrite");
    await idbRequestToPromise(store.delete(id));
}

async function clearTasks(){
    const store = createTX(storeName, "readwrite");
    await idbRequestToPromise(store.clear());
}


// Validate the input fields (Title, Description).
function validateInput(){
    const title = UI.title.value.trim();
    const description = UI.description.value.trim();

    if (!title) return {ok: false, message: "Title is required!"};
    if (title < 3) return {ok: false, message: "Title must be at least 3 characters!"};

    if (description > 300) return {ok: false, message: "Description must be less than 300 characters!"};

    return {ok: true, title, description};
}

// Filter tasks based on Search and Filter(status).
function getVisibleTasks(){
    const searchValue = UI.search.value.trim().toLowerCase();

    return tasks.filter((t) => {
        const matchesFilter = currentFilter === "all" ? true : t.status === currentFilter;
        const matchesSearch = !searchValue ? true :
         (t.title || "").toLowerCase().includes(searchValue) ||
         (t.description || "").toLowerCase().includes(searchValue);

        return matchesFilter && matchesSearch;
    });
}


function printTasks(){
    const visibleTasks = getVisibleTasks();

    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const done = tasks.filter((t) => t.status === "done").length;

    UI.countText.textContent = `Total: ${total} • Pending: ${pending} • Done: ${done}`;
    UI.shownText.textContent = `${visibleTasks.length} shown`;

    if (visibleTasks.length === 0){
        UI.tasksContainer.innerHTML = `<p class="light-text">No tasks match your filter/search.</p>`;
        return;
    }

    UI.tasksContainer.innerHTML = visibleTasks.map((t) => {
        const isDone = t.status === "done";

        const depug = isDone ? "Done" : "Pending";
        const toggleBtn = isDone ? "Mark Pending" : "Mark Done";

        return `
            <div class="card ${t.status}" data-id="${t.id}">
                <div class="card-texts">
                    <h4>${t.title}</h4>
                    <p class="light-text">${t.description}</p>
                    <div>
                        <span class="emphasized">${t.id}</span>
                        <span class="emphasized">${depug}</span>
                        <span class="emphasized">Created: ${dateFormate(t.createdAt)}</span>
                    </div>
                </div>
                <div class="card-buttons">
                    <button class="second-button" data-action="toggle">${toggleBtn}</button>
                    <button class="second-button delete" data-action="delete">Delete</button>
                </div>
            </div>
        `
    }).join("");
}


async function handleAdd(){
    setError("");

    const v = validateInput();
    if (!v.ok) {setError(v.message); return;}

    UI.addTaskBtn.disabled = true;

    try {
        const createdTask = await createTask({
            title: v.title,
            description: v.description
        });

        tasks.unshift(createdTask);

        UI.title.value = "";
        UI.description.value = "";

        printTasks();
        showToast("Task added");
    } catch (error) {
        setError(`Add failed: ${error.message}`);
    } finally {
        UI.addTaskBtn.disabled = false;
    }
}

async function handleToggle(id){
    setError("");

    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const old = {...tasks[idx]};
    
    const newStatus = tasks[idx].status === "done" ? "pending" : "done";

    tasks[idx] = {
        ...tasks[idx],
        status: newStatus,
        updatedAt: Date.now()
    };
    printTasks();

    try {
        await updateTask(id, {status: newStatus});
        showToast(newStatus === "done" ? "Marked as done" : "Marked as pending");
    } catch (error) {
        tasks[idx] = old;
        printTasks();

        setError(`Update failed: ${error.message}`);
    }
}

async function handleDelete(id){
    setError("");

    const t = tasks.find((t) => t.id === id);
    if (!t) return;

    if (!confirm(`Delete this task?\n\n"${t.title}"`)) return;

    const backUp = [...tasks];
    tasks = tasks.filter((t) => t.id !== id);
    printTasks();

    try {
        await deleteTask(id);
        showToast("Task deleted");
    } catch (error) {
        tasks = backUp;
        printTasks();

        setError(`Delete failed: ${error.message}`);
    }
}

async function handleSeed(){
    setError("");

    const samples = [
        {
        title: "Record lesson: Event Delegation",
        description: "Add examples with bubbling and delegation.",
        },
        {
        title: "Build IndexedDB Task Project",
        description: "CRUD + search + filters + modern cards.",
        },
        {
        title: "Prepare quiz questions",
        description: "Mix MCQ and true/false for DOM lessons.",
        },
    ];

    UI.seedBtn.disabled = true;

    try {
        for (const s of samples){
            const createdTask = await createTask({
                title: s.title,
                description: s.description
            });
            tasks.unshift(createdTask);
        }

        printTasks();
        showToast("Seeded sample tasks");
    } catch (error) {
        setError(`Seed failed: ${e.message}`);
    } finally {
        UI.seedBtn.disabled = false;
    }
}

async function handleClear(){
    setError("");

    if (!confirm("Clear ALL tasks?\n\nThis cannot be undone.")) return;

    UI.clearAllBtn.disabled = true;

    try {
        await clearTasks();
        tasks = [];
        printTasks();
        showToast("All tasks cleared");
    } catch (error) {
        setError(`Clear failed: ${error.message}`);
    } finally {
        UI.clearAllBtn.disabled = false;
    }
}

async function resetForm(){
    UI.title.value = "";
    UI.description.value = "";
    setError("");
}


// Add event listners
UI.tasksContainer.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    
    const card = e.target.closest(".card");
    if (!card) return;
    
    const id = Number(card.dataset.id);
    const action = btn.dataset.action;

    if (action === "toggle") handleToggle(id);
    if (action === "delete") handleDelete(id);
});

UI.tasksNav.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    currentFilter = btn.dataset.filter;

    [...UI.tasksNav.querySelectorAll("button")].forEach((b) => {
        b.classList.remove("selected");
    })

    btn.classList.add("selected");

    printTasks();
});

UI.search.addEventListener("input", printTasks);

UI.addTaskBtn.addEventListener("click", handleAdd);
UI.resetBtn.addEventListener("click", resetForm);
UI.clearAllBtn.addEventListener("click", handleClear);
UI.seedBtn.addEventListener("click", handleSeed);

window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") handleAdd();
});

(
    async function boot(){
        setError("");
        UI.toast.style.display = "none";
        setLoading(true);

        try {
            db = await openDB();
            tasks = await getAllTasks();
            printTasks();
        } catch (error) {
            setError(`Failed to initialize app: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }
)();