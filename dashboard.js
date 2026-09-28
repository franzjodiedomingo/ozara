// js/dashboard.js
// Guards the dashboard behind login, then listens live to the device's
// sensor readings and alerts from Realtime Database.

import { auth, db } from "../firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  ref,
  query,
  limitToLast,
  onValue
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// Change this to match the device ID your ESP32 writes to
// (i.e. the key under /devices/ in Realtime Database).
const DEVICE_ID = "device1";
const OZONE_SAFE_LIMIT_PPM = 0.1;

const els = {
  connDot: document.getElementById("connDot"),
  userEmail: document.getElementById("userEmail"),
  logoutBtn: document.getElementById("logoutBtn"),
  ozoneValue: document.getElementById("ozoneValue"),
  ozoneStatus: document.getElementById("ozoneStatus"),
  humidityValue: document.getElementById("humidityValue"),
  temperatureValue: document.getElementById("temperatureValue"),
  lastUpdated: document.getElementById("lastUpdated"),
  logList: document.getElementById("logList"),
  alertList: document.getElementById("alertList")
};

// --- Auth guard ---
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  els.userEmail.textContent = user.email;
  startListening();
});

els.logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// --- Live data ---
function startListening() {
  const readingsRef = query(
    ref(db, `devices/${DEVICE_ID}/readings`),
    limitToLast(10)
  );

  onValue(
    readingsRef,
    (snapshot) => {
      els.connDot.style.background = "var(--ozone)";
      const readings = [];
      snapshot.forEach((child) => {
        readings.push(child.val());
      });

      if (readings.length === 0) return;

      const latest = readings[readings.length - 1];
      updateReadingCards(latest);
      updateLogList(readings.slice().reverse());
    },
    (error) => {
      els.connDot.style.background = "var(--err)";
      els.ozoneStatus.textContent = "Couldn't reach the database.";
      els.ozoneStatus.classList.add("warn");
      console.error(error);
    }
  );

  const alertsRef = query(ref(db, `devices/${DEVICE_ID}/alerts`), limitToLast(5));
  onValue(alertsRef, (snapshot) => {
    const alerts = [];
    snapshot.forEach((child) => alerts.push(child.val()));

    if (alerts.length === 0) {
      els.alertList.innerHTML = `<p class="log-empty">No alerts. Ozone levels are within the safe range.</p>`;
      return;
    }

    els.alertList.innerHTML = alerts
      .slice()
      .reverse()
      .map(
        (a) => `
        <div class="log-row alert-row">
          <span>${escapeHtml(a.message || "Alert")}</span>
          <span class="log-time">${formatTime(a.timestamp)}</span>
        </div>`
      )
      .join("");
  });
}

function updateReadingCards(reading) {
  els.ozoneValue.textContent = formatNumber(reading.ozone_ppm);
  els.humidityValue.textContent = formatNumber(reading.humidity);
  els.temperatureValue.textContent = formatNumber(reading.temperature);
  els.lastUpdated.textContent = `Updated ${formatTime(reading.timestamp)}`;

  if (reading.ozone_ppm > OZONE_SAFE_LIMIT_PPM) {
    els.ozoneStatus.textContent = "Above safe limit";
    els.ozoneStatus.classList.add("warn");
  } else {
    els.ozoneStatus.textContent = "Within safe range";
    els.ozoneStatus.classList.remove("warn");
  }
}

function updateLogList(readings) {
  els.logList.innerHTML = readings
    .map(
      (r) => `
      <div class="log-row">
        <span>${formatNumber(r.ozone_ppm)} ppm · ${formatNumber(r.humidity)}% · ${formatNumber(r.temperature)}°C</span>
        <span class="log-time">${formatTime(r.timestamp)}</span>
      </div>`
    )
    .join("");
}

function formatNumber(n) {
  return typeof n === "number" ? n.toFixed(2) : "—";
}

function formatTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
