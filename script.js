window.alert = (msg) => console.log("Alert diblokir:", msg);
window.confirm = (msg) => { console.log("Konfirmasi diblokir:", msg); return false; };

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

// GLOBAL VARIABLE
let map;
let userMarker;
// Koordinat default sesuai permintaan user: dekat UIN Sunan Kalijaga, Yogyakarta
const DEFAULT_POS = [-7.782430, 110.415507]; 

// INIT MAP
function initLeaflet() {
    map = L.map('map').setView(DEFAULT_POS, 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    const userIcon = L.divIcon({
        className: 'custom-marker',
        html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0D6E9F" width="40px" height="40px"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
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

// LISTEN DATA PENGGUNA
function listenUserData() {
    db.ref("devices/pengguna").on("value", snap => {
        let data = snap.val();

        // Default untuk Nama dan HP Pengguna
        const defaultNama = "Yuli";
        const defaultHp = "+62 812-3456-7890";

        // Menggunakan field database yang baru: "pengguna" dan "hp_pengawas"
        const nama = data?.pengguna || defaultNama;
        const hp = data?.hp_pengawas || defaultHp;

        document.getElementById("pengguna-nama").textContent = nama;
        document.getElementById("pengguna-hp").textContent = hp;

        if (!data) {
            updateSOSUI("aman");
            return;
        }

        // Cek apakah ada data Location (untuk koordinat)
        const location = data.Location;
        if (location) {
            const lat = location.lat;
            const lon = location.lon; // Database menggunakan "lon"

            if (validCoord(lat) && validCoord(lon)) {
                let pos = [parseFloat(lat), parseFloat(lon)];
                userMarker.setLatLng(pos);

                if (!map.getBounds().contains(pos)) {
                    map.setView(pos, 16);
                }

                userMarker.bindPopup(`<b>${nama}</b><br>HP: ${hp}`).openPopup();
            }
        }

        // Menggunakan field database yang baru: "sos"
        updateSOSUI(data.sos || "aman");
        
        // Tampilkan jarak dan status buzzer
        updateDistanceUI(data.distance, data.buzzer);
    });
}

// LISTEN DATA PENGAWAS
function listenSupervisorData() {
    db.ref("devices/pengguna").on("value", snap => {
        let data = snap.val();

        // Default untuk Nama dan Nomor Pengawas
        const defaultNama = "Lisa";
        const defaultNomor = "+62 811-9876-5432"; // Nomor default pengawas

        // Menggunakan field database yang baru: "pengawas" untuk nama
        const nama = data?.pengawas || defaultNama;
        
        document.getElementById("supervisor-name").textContent = "Halo, " + nama + "!";
        // Tidak ada field nomor pengawas di DB yang diberikan, menggunakan default di sini
        document.getElementById("supervisor-number").textContent = "Nomor: " + defaultNomor;
    });
}

// UPDATE UI JARAK DAN BUZZER
function updateDistanceUI(distance, buzzer) {
    const distanceEl = document.getElementById("distance-value");
    const buzzerEl = document.getElementById("buzzer-status");
    
    if (distanceEl && distance !== undefined) {
        distanceEl.textContent = distance + " cm";
        
        // Ubah warna berdasarkan jarak
        if (distance < 30) {
            distanceEl.classList.add("text-red-600", "font-bold");
            distanceEl.classList.remove("text-green-600", "text-gray-800");
        } else {
            distanceEl.classList.add("text-green-600");
            distanceEl.classList.remove("text-red-600", "font-bold", "text-gray-800");
        }
    }
    
    if (buzzerEl && buzzer !== undefined) {
        buzzerEl.textContent = buzzer === 1 ? "AKTIF ⚠️" : "Mati";
        buzzerEl.className = buzzer === 1 ? "text-red-600 font-bold" : "text-gray-600";
    }
}

// UPDATE UI SOS
function updateSOSUI(status) {
    const ind = document.getElementById("sos-status-indicator");
    const card = document.getElementById("sos-status-card");
    const btn = document.getElementById("supervisor-action-btn");

    // Reset state
    card.classList.remove("sos-active", "sos-waiting", "bg-red-50", "bg-yellow-50");
    card.classList.add("bg-white"); // Pastikan warna latar belakang default

    ind.classList.remove("text-red-600", "text-yellow-600");
    ind.classList.add("text-green-500");
    ind.textContent = "AMAN";

    btn.disabled = true;
    btn.classList.remove("bg-red-600", "bg-yellow-600", "hover:bg-red-700", "hover:bg-yellow-700");
    btn.classList.add("bg-gray-400", "cursor-not-allowed");
    btn.textContent = "TANGGAPI SOS";
    btn.onclick = null; // Hapus event handler saat tidak aktif

    // Status: "bahaya" (button SOS ditekan)
    if (status === "bahaya") {
        ind.textContent = "🚨 SOS DARURAT!";
        ind.classList.replace("text-green-500", "text-red-600");

        card.classList.add("sos-active", "bg-red-50");

        btn.disabled = false;
        btn.classList.replace("bg-gray-400", "bg-red-600");
        btn.classList.remove("cursor-not-allowed");
        btn.classList.add("hover:bg-red-700");
        btn.textContent = "SAYA AKAN KE SANA";
        btn.onclick = supervisorOnTheWay;

    // Status: "otw" (pengawas sedang dalam perjalanan)
    } else if (status === "otw") {
        ind.textContent = "🚶 Pengawas Sedang Menuju!";
        ind.classList.replace("text-green-500", "text-yellow-600");
        card.classList.add("sos-waiting", "bg-yellow-50");

        btn.disabled = true;
        btn.textContent = "SEDANG DALAM PERJALANAN...";
        btn.classList.replace("bg-gray-400", "bg-yellow-600");
        
    // Status: "aman" (kondisi normal/sudah ditangani)
    } else {
        // Default AMAN sudah di-set di atas
    }
}

// PENGAWAS MENUJU (OTW)
function supervisorOnTheWay() {
    // Ubah status ke "otw" di Firebase
    db.ref("devices/pengguna/sos")
        .set("otw")
        .then(() => {
            console.log("Status diubah → otw (Pengawas Menuju)");
            
            // Logic: Setelah 3 detik, ubah status kembali ke "aman"
            // Catatan: Biasanya logika ini dilakukan di perangkat keras (ESP32/Arduino)
            // agar buzzer berbunyi 3 detik lalu mati. Karena ini simulasi, kita lakukan di sini.
            setTimeout(() => {
                db.ref("devices/pengguna/sos")
                    .set("aman")
                    .then(() => console.log("Status diubah → aman (setelah 3 detik)"));
            }, 3000);
        })
        .catch(error => console.error("Gagal mengubah status ke OTW:", error));
}

// LOGIC API - CEK JARAK DAN UPDATE BUZZER
function checkDistanceAndUpdateBuzzer() {
    db.ref("devices/pengguna/distance").once("value", snap => {
        const distance = snap.val();
        
        if (distance !== null && distance !== undefined) {
            // Jika jarak < 30cm, nyalakan buzzer (value 1)
            const buzzerStatus = distance < 30 ? 1 : 0;
            
            db.ref("devices/pengguna/buzzer")
                .set(buzzerStatus)
                .then(() => {
                    // console.log(`Buzzer updated: ${buzzerStatus} (distance: ${distance}cm)`);
                })
                .catch(error => console.error("Gagal mengubah status buzzer:", error));
        }
    });
}

// Jalankan pengecekan jarak setiap 1 detik
setInterval(checkDistanceAndUpdateBuzzer, 1000);

// START APP
window.onload = () => {
    initLeaflet();
    listenSupervisorData();
    listenUserData();
};
