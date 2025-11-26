// Mengganti alert dan confirm agar tidak muncul di iframe
window.alert = (message) => console.log("Alert diblokir:", message);
window.confirm = (message) => { console.log("Konfirmasi diblokir:", message); return false; };

// FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyDNrYMOY4FBHlSeGDNBaboktNdF5chqGfI",
    authDomain: "blind-nav2.firebaseapp.com",
    databaseURL: "https://blind-nav2-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "blind-nav2",
    storageBucket: "blind-nav2.appspot.com",
    messagingSenderId: "558883900786",
    appId: "1:558883900786:web:bd8c2f27d9f624b1f0a1eb"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let map;
let userMarker;

const DEFAULT_POS = [-7.7956, 110.3695];

// INIT MAP
function initLeaflet() {
    map = L.map('map').setView(DEFAULT_POS, 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
    }).addTo(map);

    const userIcon = L.divIcon({
        className: 'custom-marker',
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0D6E9F" width="40" height="40">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
    });

    userMarker = L.marker(DEFAULT_POS, { icon: userIcon }).addTo(map);
}

// VALIDASI KOORDINAT
function validCoord(val) {
    const num = parseFloat(val);
    return !isNaN(num) && num !== 0;
}

// LISTENER PENGGUNA
function listenUserData() {
    db.ref("devices/pengguna").on("value", snap => {
        let data = snap.val();
        if (!data) return;

        document.getElementById("pengguna-nama").textContent = data.nama || "Tidak Diketahui";
        document.getElementById("pengguna-hp").textContent = data.hp || "-";

        const lat = data.lat;
        const long = data.long;

        if (validCoord(lat) && validCoord(long)) {
            let newPos = [parseFloat(lat), parseFloat(long)];
            userMarker.setLatLng(newPos);

            if (map.getCenter().lat === DEFAULT_POS[0] || !map.getBounds().contains(newPos)) {
                map.setView(newPos, 16);
            }
        }

        updateSOSUI(data["status-sos"] || "aman");
    });
}

// LISTENER PENGAWAS
function listenSupervisorData() {
    db.ref("devices/pengawas").on("value", snap => {
        let data = snap.val();
        if (!data) return;

        document.getElementById("supervisor-name").textContent =
            "Halo, " + (data.nama || "Pengawas") + "!";
    });
}

// UPDATE SOS UI
function updateSOSUI(status) {
    const ind = document.getElementById("sos-status-indicator");
    const card = document.getElementById("sos-status-card");
    const btn = document.getElementById("supervisor-action-btn");

    card.className = "sos-alert-box p-6 rounded-xl shadow-lg border-l-8 bg-white";
    ind.className = "text-xl font-bold mt-4 text-green-500";

    btn.disabled = true;
    btn.textContent = "SAYA AKAN KE SANA";
    btn.className = "w-full py-4 px-6 rounded-xl text-lg font-bold bg-gray-400 text-white cursor-not-allowed";

    if (status === "sos") {
        ind.textContent = "SOS DARURAT!";
        card.classList.add("sos-active", "border-red-500", "bg-red-50");
        ind.classList.replace("text-green-500", "text-red-600");

        btn.disabled = false;
        btn.classList.replace("bg-gray-400", "bg-red-600");
        btn.classList.remove("cursor-not-allowed");

    } else if (status === "pengawas menuju ke sana") {
        ind.textContent = "Pengawas Sedang Menuju!";
        card.classList.add("sos-waiting", "border-yellow-500", "bg-yellow-50");
        ind.classList.replace("text-green-500", "text-yellow-600");

        btn.textContent = "SEDANG DALAM PERJALANAN...";
        btn.classList.replace("bg-gray-400", "bg-yellow-600");
    }
}

// ACTION BUTTON
function supervisorOnTheWay() {
    db.ref("devices/pengguna/status-sos").set("pengawas menuju ke sana")
        .then(() => {
            const btn = document.getElementById("supervisor-action-btn");
            btn.textContent = "Status Terkirim!";
            btn.classList.replace("bg-red-600", "bg-yellow-600");
        })
        .catch(console.error);
}

// START
window.onload = () => {
    initLeaflet();
    listenSupervisorData();
    listenUserData();
};
