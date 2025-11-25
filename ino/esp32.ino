#include <Arduino.h>
#include <WiFi.h>
#include <FirebaseESP32.h>

// ---------- WIFI ----------
#define WIFI_SSID "hehe"
#define WIFI_PASSWORD "hallo123"

// ---------- FIREBASE ----------
#define DATABASE_URL "https://blind-nav2-default-rtdb.asia-southeast1.firebasedatabase.app"
#define DATABASE_SECRET "USYeOoLUAVO1c2Oi8Gpju7JJLxR6SV6yRYIONjC5"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ---------- VARIABEL DARI UNO ----------
int distanceVal = 0;
float latVal = 0;
float lonVal = 0;
int satsVal = 0;
int hdopVal = 0;

unsigned long lastSend = 0;

// ---------- PARSER JSON SEDERHANA ----------
void parseJSON(String json) {
  json.replace("{", "");
  json.replace("}", "");
  json.replace("\"", "");

  int idx;

  idx = json.indexOf("lat:");
  if (idx != -1) {
    latVal = json.substring(idx + 4, json.indexOf(",", idx)).toFloat();
  }

  idx = json.indexOf("lon:");
  if (idx != -1) {
    lonVal = json.substring(idx + 4, json.indexOf(",", idx)).toFloat();
  }
}

// ----------------------------------
// SETUP
// ----------------------------------
void setup() {
  Serial.begin(115200);

  // Serial2 untuk menerima data dari Arduino UNO
  Serial2.begin(9600, SERIAL_8N1, 16, 17); // RX=16, TX=17

  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\nWiFi Connected!");
  Serial.println(WiFi.localIP());

  // Firebase
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;

  Firebase.reconnectNetwork(true);
  fbdo.setBSSLBufferSize(4096, 1024);
  Firebase.begin(&config, &auth);

  Serial.println("Firebase Ready!");
}

// ----------------------------------
// LOOP UTAMA
// ----------------------------------
void loop() {

  // --- Terima JSON dari Arduino UNO ---
  if (Serial2.available()) {
    String json = Serial2.readStringUntil('\n');
    json.trim();

    Serial.print("Received from UNO: ");
    Serial.println(json);

    parseJSON(json);
  }

  // --- Upload ke Firebase setiap 3 detik ---
  if (millis() - lastSend > 3000) {
    lastSend = millis();

    String path = "/devices/pengawas";

    Firebase.setFloat(fbdo, path + "/lat", latVal);
    Firebase.setFloat(fbdo, path + "/lon", lonVal);

    Serial.println("Data uploaded to pengawas!\n");

    String path = "/devices/pengguna";

    Firebase.setFloat(fbdo, path + "/lat", latVal);
    Firebase.setFloat(fbdo, path + "/lon", lonVal);

    Serial.println("Data uploaded to pengguna!\n");
  }

  delay(20);
}