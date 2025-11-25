#include <SoftwareSerial.h>
#include <TinyGPS.h>

TinyGPS gps;

// SoftwareSerial untuk GPS (pin 2 = RX, 3 = TX)
SoftwareSerial ss(2, 3);

// Ultrasonic pins
const int trigPin = 9;
const int echoPin = 10;
const int buzzer = 11;
const int ledPin = 13;

// Variables
long duration;
int distance;

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(buzzer, OUTPUT);
  pinMode(ledPin, OUTPUT);

  Serial.begin(9600);      // ke ESP32
  ss.begin(4800);          // GPS baudrate
}

void loop() {
  // ---------------------------
  // READ ULTRASONIC
  // ---------------------------
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  duration = pulseIn(echoPin, HIGH, 30000); // timeout 30ms

  if (duration == 0) {
    distance = -1;  // no echo
  } else {
    distance = duration * 0.034 / 2;
  }

  // Buzzer & LED logic
  if (distance > 0 && distance <= 5) {
    digitalWrite(buzzer, HIGH);
    digitalWrite(ledPin, HIGH);
  } else {
    digitalWrite(buzzer, LOW);
    digitalWrite(ledPin, LOW);
  }

  // ---------------------------
  // READ GPS DATA
  // ---------------------------
  bool newData = false;

  for (unsigned long start = millis(); millis() - start < 500;) {
    while (ss.available()) {
      char c = ss.read();
      if (gps.encode(c)) {
        newData = true;
      }
    }
  }

  float flat = 0, flon = 0;
  unsigned long age;

  if (newData) {
    gps.f_get_position(&flat, &flon, &age);

    if (flat == TinyGPS::GPS_INVALID_F_ANGLE) flat = -7.782324330679297;
    if (flon == TinyGPS::GPS_INVALID_F_ANGLE) flon = 110.41574817700014;
  }

  // ---------------------------
  // SEND DATA TO ESP32 (JSON format)
  // ---------------------------
  Serial.print("{\"lat\":");
  Serial.print(flat, 6);
  Serial.print(",\"lon\":");
  Serial.print(flon, 6);
  Serial.println("}");  

  delay(500);
}