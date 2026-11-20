// LifeBalance JavaScript
// Data is saved in this browser using localStorage.

const WATER_GOAL = 8;
const SLEEP_GOAL = 8;
const STEP_GOAL = 8000;

function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

let selectedDate = todayKey();

function readJSON(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value === null ? fallback : value;
    } catch (error) {
        return fallback;
    }
}

let dailyRecords = readJSON("lbDailyRecords", {});
let habits = readJSON("habits", []);
let meals = readJSON("meals", []);
let moodHistory = readJSON("moodHistory", []);
let profile = readJSON("lbProfile", { name: "" });

function getRecord(date = selectedDate) {
    if (!dailyRecords[date]) {
        dailyRecords[date] = {
            water: 0,
            sleep: null,
            steps: 0,
            mood: "",
            habits: [],
            meals: []
        };
    }
    return dailyRecords[date];
}

function saveRecords() {
    localStorage.setItem("lbDailyRecords", JSON.stringify(dailyRecords));
}

function migrateOldData() {
    if (localStorage.getItem("lbMigratedV1")) return;

    const record = getRecord(todayKey());

    record.water = Number(localStorage.getItem("water")) || 0;

    const oldSleep = localStorage.getItem("sleep");
    record.sleep = oldSleep === null ? null : Number(oldSleep);

    record.steps = Number(localStorage.getItem("steps")) || 0;
    record.habits = readJSON("habits", []);
    record.meals = readJSON("meals", []);

    saveRecords();

    localStorage.setItem("lbMigratedV1", "yes");
}

migrateOldData();

function getCurrentRecord() {
    return getRecord(selectedDate);
}

function syncLegacyKeys(record) {
    // Keep the original project's keys updated for compatibility.

    localStorage.setItem("water", record.water);

    if (record.sleep === null) {
        localStorage.removeItem("sleep");
    } else {
        localStorage.setItem("sleep", record.sleep);
    }

    localStorage.setItem("steps", record.steps);
    localStorage.setItem("habits", JSON.stringify(record.habits));
    localStorage.setItem("meals", JSON.stringify(record.meals));
}

// Display all saved information

function renderAll() {

    const record = getCurrentRecord();

    habits = record.habits;
    meals = record.meals;

    document.getElementById("waterCount").innerText =
        record.water + " / 8 glasses";

    document.getElementById("waterBar").style.width =
        Math.min(record.water / WATER_GOAL * 100, 100) + "%";

    document.getElementById("sleepCount").innerText =
        record.sleep === null ? "Not recorded" : record.sleep + " hours";

    document.getElementById("stepCount").innerText =
        record.steps + " steps";

    document.getElementById("stepProgress").innerText =
        "Daily Goal: " +
        Math.round(Math.min(record.steps / STEP_GOAL * 100, 100)) + "%";

    document.getElementById("savedMood").innerText =
        record.mood ? "Today's Mood: " + record.mood : "How are you feeling today?";

    document.getElementById("moodInput").value = record.mood || "";

    displayHabits();
    displayMeals();

    updateAnalytics();
    updateCharts();

    document.getElementById("selectedDateText").innerText =
        "Selected date: " +
        new Date(selectedDate + "T12:00:00").toLocaleDateString(
            undefined,
            { dateStyle: "full" }
        );
}

// WATER INTAKE TRACKER

function addWater() {

    const record = getCurrentRecord();

    if (record.water >= WATER_GOAL) {
        alert("Daily water goal completed!");
        return;
    }

    record.water++;

    saveRecords();
    syncLegacyKeys(record);
    renderAll();
}

// SLEEP TRACKER

function saveSleep() {

    const input = document.getElementById("sleepInput").value;
    const hours = Number(input);

    if (input === "" || !Number.isFinite(hours) || hours < 0 || hours > 24) {
        alert("Please enter valid sleep hours (0-24).");
        return;
    }

    const record = getCurrentRecord();

    record.sleep = hours;

    saveRecords();
    syncLegacyKeys(record);

    document.getElementById("sleepInput").value = "";

    renderAll();
}

// ACTIVITY TRACKER

function saveSteps() {

    const input = document.getElementById("stepInput").value;
    const value = Number(input);

    if (input === "" || !Number.isInteger(value) || value < 0) {
        alert("Please enter a valid whole number of steps.");
        return;
    }

    const record = getCurrentRecord();

    record.steps = value;

    saveRecords();
    syncLegacyKeys(record);

    document.getElementById("stepInput").value = "";

    renderAll();
}

// MOOD JOURNAL

function saveMood() {

    const mood = document.getElementById("moodInput").value;

    if (!mood) {
        alert("Please select your mood!");
        return;
    }

    const record = getCurrentRecord();

    record.mood = mood;

    const existingIndex = moodHistory.findIndex(
        item => item.date === selectedDate
    );

    const entry = {
        date: selectedDate,
        mood: mood
    };

    if (existingIndex >= 0) {
        moodHistory[existingIndex] = entry;
    } else {
        moodHistory.push(entry);
    }

    moodHistory.sort((a, b) => a.date.localeCompare(b.date));

    localStorage.setItem("moodHistory", JSON.stringify(moodHistory));

    saveRecords();

    renderAll();

    alert("Your mood has been saved!");
}

// DAILY HABITS TRACKER

function addHabit() {

    const input = document.getElementById("habitInput");
    const name = input.value.trim();

    if (!name) {
        alert("Please enter a habit!");
        return;
    }

    const record = getCurrentRecord();

    record.habits.push({
        name: name,
        completed: false
    });

    saveRecords();
    syncLegacyKeys(record);

    input.value = "";

    renderAll();
}

function displayHabits() {

    const list = document.getElementById("habitList");

    list.innerHTML = "";

    const record = getCurrentRecord();

    record.habits.forEach((habit, index) => {

        const li = document.createElement("li");

        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.checked = habit.completed;

        checkbox.addEventListener("change", function () {

            record.habits[index].completed = checkbox.checked;

            saveRecords();
            syncLegacyKeys(record);

            renderAll();

        });

        const span = document.createElement("span");

        span.innerText = habit.name;

        if (habit.completed) {
            span.style.textDecoration = "line-through";
        }

        li.append(checkbox, span);

        list.appendChild(li);

    });

    const done = record.habits.filter(
        item => item.completed
    ).length;

    document.getElementById("habitProgress").innerText =
        "Completed: " + done + " / " + record.habits.length;
}

// MEAL PLANNER

function saveMeal() {

    const type = document.getElementById("mealType").value;

    const food = document.getElementById("mealInput").value.trim();

    if (!type || !food) {
        alert("Please select a meal and enter food details!");
        return;
    }

    const record = getCurrentRecord();

    record.meals.push({
        type: type,
        food: food
    });

    saveRecords();
    syncLegacyKeys(record);

    document.getElementById("mealType").value = "";
    document.getElementById("mealInput").value = "";

    renderAll();
}

function displayMeals() {

    const list = document.getElementById("mealList");

    list.innerHTML = "";

    getCurrentRecord().meals.forEach(meal => {

        const li = document.createElement("li");

        li.innerText = meal.type + ": " + meal.food;

        list.appendChild(li);

    });
}

// WELLNESS ANALYTICS

function updateAnalytics() {

    const record = getCurrentRecord();

    document.getElementById("analyticsWater").innerText =
        record.water + " / 8 glasses";

    document.getElementById("analyticsSleep").innerText =
        record.sleep === null ? "Not recorded" : record.sleep + " hours";

    document.getElementById("analyticsSteps").innerText =
        record.steps + " steps";

    const done = record.habits.filter(
        item => item.completed
    ).length;

    document.getElementById("analyticsHabits").innerText =
        done + " / " + record.habits.length;
}

// CHARTS

let waterChart, sleepChart, activityChart, moodChart;

function makeCharts() {

    const chartText =
        getComputedStyle(document.body)
        .getPropertyValue("--muted").trim() || "#777";

    const common = {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    color: chartText
                }
            }
        }
    };

    // Water Chart

    waterChart = new Chart(
        document.getElementById("waterChart"),
        {
            type: "doughnut",

            data: {
                labels: ["Consumed", "Remaining"],

                datasets: [{
                    data: [0, 8],

                    backgroundColor: [
                        "#7652b5",
                        "#eee7fa"
                    ],

                    borderWidth: 0
                }]
            },

            options: common
        }
    );

    // Sleep Chart

    sleepChart = new Chart(
        document.getElementById("sleepChart"),
        {
            type: "doughnut",

            data: {
                labels: ["Hours Slept", "Remaining"],

                datasets: [{
                    data: [0, 8],

                    backgroundColor: [
                        "#8c70c5",
                        "#eee7fa"
                    ],

                    borderWidth: 0
                }]
            },

            options: common
        }
    );

    // Activity Chart

    activityChart = new Chart(
        document.getElementById("activityChart"),
        {
            type: "bar",

            data: {
                labels: ["Steps Completed", "Remaining"],

                datasets: [{
                    label: "Daily Steps",

                    data: [0, 8000],

                    backgroundColor: [
                        "#7652b5",
                        "#eee7fa"
                    ],

                    borderRadius: 8
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                indexAxis: "y",

                plugins: {
                    legend: {
                        display: false
                    }
                },

                scales: {
                    x: {
                        beginAtZero: true,
                        max: 8000
                    }
                }
            }
        }
    );

    // Mood History Chart

    moodChart = new Chart(
        document.getElementById("moodChart"),
        {
            type: "bar",

            data: {
                labels: [],

                datasets: [{
                    label: "Mood rating (1-5)",

                    data: [],

                    backgroundColor: "#9a7bd0",

                    borderRadius: 7
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                scales: {
                    y: {
                        min: 0,
                        max: 5,

                        ticks: {
                            stepSize: 1
                        }
                    }
                },

                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        }
    );
}

// UPDATE CHARTS

function updateCharts() {

    if (!waterChart) return;

    const record = getCurrentRecord();

    waterChart.data.datasets[0].data = [
        Math.min(record.water, 8),
        Math.max(8 - record.water, 0)
    ];

    sleepChart.data.datasets[0].data = [
        Math.min(record.sleep || 0, 8),
        Math.max(8 - (record.sleep || 0), 0)
    ];

    activityChart.data.datasets[0].data = [
        Math.min(record.steps, 8000),
        Math.max(8000 - record.steps, 0)
    ];

    waterChart.update();
    sleepChart.update();
    activityChart.update();

    const recent = moodHistory.slice(-7);

    const moodScores = {
        "😔 Sad": 1,
        "😡 Stressed": 2,
        "😐 Neutral": 3,
        "😌 Relaxed": 4,
        "😊 Happy": 5
    };

    moodChart.data.labels = recent.map(
        item => item.date.slice(5)
    );

    moodChart.data.datasets[0].data = recent.map(
        item => moodScores[item.mood] || 0
    );

    moodChart.update();
}

// USER PROFILE

function saveProfile() {

    profile.name =
        document.getElementById("profileName").value.trim();

    localStorage.setItem("lbProfile", JSON.stringify(profile));

    updateWelcome();

    alert("Profile saved!");
}

function updateWelcome() {

    const name = profile.name;

    document.getElementById("welcomeName").innerText =
        name ? "Welcome back, " + name + "!" :
        "Your wellness journey starts here.";
}

// CALENDAR AND DATE SELECTION

function setDate(date) {

    if (!date) return;

    selectedDate = date;

    renderAll();
}

function goToToday() {

    selectedDate = todayKey();

    document.getElementById("recordDate").value = selectedDate;

    renderAll();
}

// DATE AND GREETING

function updateDateHeader() {

    const now = new Date();

    document.getElementById("todayDate").innerText =
        now.toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });

    const hour = now.getHours();

    document.getElementById("greeting").innerText =
        hour < 12 ? "Good Morning!" :
        hour < 17 ? "Good Afternoon!" :
        "Good Evening!";
}

// DARK MODE

function setupTheme() {

    const savedTheme = localStorage.getItem("lbTheme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark");
    }

    updateThemeButton();

    document.getElementById("themeToggle").addEventListener(
        "click",
        function () {

            document.body.classList.toggle("dark");

            localStorage.setItem(
                "lbTheme",
                document.body.classList.contains("dark")
                    ? "dark"
                    : "light"
            );

            updateThemeButton();

        }
    );
}

function updateThemeButton() {

    document.getElementById("themeToggle").innerText =
        document.body.classList.contains("dark")
            ? "☀️ Light Mode"
            : "🌙 Dark Mode";
}

// INITIALIZE WEBSITE

document.getElementById("recordDate").value = selectedDate;

document.getElementById("recordDate").addEventListener(
    "change",
    event => setDate(event.target.value)
);

document.getElementById("profileName").value =
    profile.name || "";

updateDateHeader();
updateWelcome();
setupTheme();

if (typeof Chart !== "undefined") {

    makeCharts();

    renderAll();

} else {

    renderAll();

    alert(
        "Charts could not load. Please check your internet connection and refresh the page."
    );

}