#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>
#include <SoftwareSerial.h>
#include <ArduinoJson.h>

// ================= USER SETTINGS =================
const char* WIFI_SSID = "Ayet Ali";
const char* WIFI_PASSWORD = "AyetAli#2026";
const char* DEVICE_API_KEY = "6083f1363a5d9445f174651b0b0cec19";
const char* BASE_URL = "https://smart-water-level-monitor.onrender.com";

// NodeMCU D5 = RX from Arduino TX divider; D6 = TX to Arduino RX.
SoftwareSerial arduinoSerial(D5, D6);

const unsigned long TELEMETRY_INTERVAL = 2500;
const unsigned long COMMAND_POLL_INTERVAL = 1800;
unsigned long lastTelemetry = 0;
unsigned long lastCommandPoll = 0;

struct HardwareData {
  float waterLevel = -1;
  float distanceCm = -1;
  float temperature = -999;
  bool temperatureValid = false;
  int turbidityRaw = 0;
  bool turbidityValid = false;
  String turbidityStatus = "SENSOR ERROR";
  bool pump = false;
  String mode = "MANUAL";
  bool emergency = false;
  bool sensorValid = false;
  unsigned long runtime = 0;
  bool received = false;
} hw;

String readLineFromArduino(unsigned long timeoutMs = 80) {
  unsigned long started = millis();
  while (millis() - started < timeoutMs) {
    if (arduinoSerial.available()) {
      String line = arduinoSerial.readStringUntil('\n');
      line.trim();
      return line;
    }
    yield();
  }
  return "";
}

String fieldAt(const String& source, int wanted) {
  int start = 0;
  for (int i = 0; i < wanted; i++) {
    int sep = source.indexOf('|', start);
    if (sep < 0) return "";
    start = sep + 1;
  }
  int end = source.indexOf('|', start);
  if (end < 0) end = source.length();
  return source.substring(start, end);
}

void parseArduinoLine(const String& line) {
  if (!line.startsWith("DATA|")) return;
  hw.waterLevel = fieldAt(line, 1).toFloat();
  hw.distanceCm = fieldAt(line, 2).toFloat();
  hw.temperature = fieldAt(line, 3).toFloat();
  hw.temperatureValid = fieldAt(line, 4).toInt() == 1;
  hw.turbidityRaw = fieldAt(line, 5).toInt();
  hw.turbidityValid = fieldAt(line, 6).toInt() == 1;
  String rawStatus = fieldAt(line, 7);
  if (!hw.turbidityValid) hw.turbidityStatus = "SENSOR ERROR";
  else if (rawStatus == "CLEAR") hw.turbidityStatus = "CLEAR";
  else if (rawStatus == "SLIGHT CLOUDY") hw.turbidityStatus = "MODERATE";
  else if (rawStatus == "CLOUDY" || rawStatus == "VERY CLOUDY") hw.turbidityStatus = "POOR";
  else hw.turbidityStatus = "NOT CALIBRATED";
  hw.pump = fieldAt(line, 8).toInt() == 1;
  hw.mode = fieldAt(line, 9);
  hw.emergency = fieldAt(line, 10).toInt() == 1;
  hw.sensorValid = fieldAt(line, 11).toInt() == 1;
  hw.runtime = (unsigned long)fieldAt(line, 12).toInt();
  hw.received = true;
}

void drainArduinoSerial() {
  while (arduinoSerial.available()) {
    String line = arduinoSerial.readStringUntil('\n');
    line.trim();
    parseArduinoLine(line);
    if (line.startsWith("ACK|")) Serial.println("Arduino command response: " + line);
  }
}

bool postTelemetry() {
  if (!hw.received) return false;
  if (WiFi.status() != WL_CONNECTED) return false;

  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  client->setInsecure(); // TLS encryption is used; certificate validation is disabled.
  HTTPClient https;
  String url = String(BASE_URL) + "/api/hardware/telemetry";
  if (!https.begin(*client, url)) return false;
  https.addHeader("Content-Type", "application/json");
  https.addHeader("X-Device-Key", DEVICE_API_KEY);

  StaticJsonDocument<512> doc;
  if (hw.sensorValid) {
    doc["waterLevel"] = hw.waterLevel;
    doc["distanceCm"] = hw.distanceCm;
  } else {
    doc["waterLevel"] = nullptr;
    doc["distanceCm"] = nullptr;
  }
  if (hw.temperatureValid) doc["temperature"] = hw.temperature;
  else doc["temperature"] = nullptr;
  doc["pump"] = hw.pump;
  doc["mode"] = hw.mode;
  doc["runtime"] = hw.runtime;
  doc["emergency"] = hw.emergency;
  doc["turbidityRaw"] = hw.turbidityValid ? hw.turbidityRaw : 0;
  if (hw.turbidityValid) doc["turbidityVoltage"] = hw.turbidityRaw * (5.0 / 1023.0);
  else doc["turbidityVoltage"] = nullptr;
  doc["turbidityStatus"] = hw.turbidityStatus;
  doc["tank"] = !hw.sensorValid ? "SENSOR ERROR" : (hw.waterLevel <= 20 ? "LOW" : (hw.waterLevel >= 70 ? "HIGH" : "NORMAL"));
  String body;
  serializeJson(doc, body);
  int code = https.POST(body);
  String response = https.getString();
  https.end();
  Serial.printf("Telemetry HTTP: %d %s\n", code, response.c_str());
  return code >= 200 && code < 300;
}

bool sendCommandToArduino(long id, const String& command, const String& value) {
  while (arduinoSerial.available()) arduinoSerial.read();
  arduinoSerial.print("CMD|");
  arduinoSerial.print(id);
  arduinoSerial.print('|');
  arduinoSerial.print(command);
  arduinoSerial.print('|');
  arduinoSerial.println(value);

  unsigned long started = millis();
  while (millis() - started < 1500) {
    String line = readLineFromArduino(100);
    if (line.startsWith("DATA|")) parseArduinoLine(line);
    if (line.startsWith("ACK|" + String(id) + "|")) {
      Serial.println("Command result: " + line);
      return line.indexOf("|OK") > 0;
    }
    yield();
  }
  Serial.println("No Arduino acknowledgement for command " + String(id));
  return false;
}

void acknowledgeCommand(long id) {
  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  client->setInsecure();
  HTTPClient https;
  if (!https.begin(*client, String(BASE_URL) + "/api/hardware/ack")) return;
  https.addHeader("Content-Type", "application/json");
  https.addHeader("X-Device-Key", DEVICE_API_KEY);
  StaticJsonDocument<96> doc;
  doc["id"] = id;
  String body;
  serializeJson(doc, body);
  int code = https.POST(body);
  Serial.printf("Command ACK HTTP: %d\n", code);
  https.end();
}

void pollCommand() {
  if (WiFi.status() != WL_CONNECTED) return;
  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  client->setInsecure();
  HTTPClient https;
  if (!https.begin(*client, String(BASE_URL) + "/api/hardware/command")) return;
  https.addHeader("X-Device-Key", DEVICE_API_KEY);
  int code = https.GET();
  if (code == HTTP_CODE_OK) {
    String payload = https.getString();
    StaticJsonDocument<384> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (!err && !doc["command"].isNull()) {
      long id = doc["command"]["id"] | 0;
      String command = doc["command"]["command"] | "";
      String value = doc["command"]["value"] | "";
      if (id > 0 && command.length() && value.length()) {
        bool applied = sendCommandToArduino(id, command, value);
        // Acknowledge after the Arduino responds. Log rejected commands for diagnosis.
        if (applied) Serial.println("Command applied successfully.");
        else Serial.println("Arduino rejected/timed out command; clearing queued command.");
        acknowledgeCommand(id);
      }
    }
  } else {
    Serial.printf("Command poll HTTP: %d\n", code);
  }
  https.end();
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting Wi-Fi");
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 20000) {
    delay(300);
    Serial.print('.');
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi connected: " + WiFi.localIP().toString());
  } else {
    Serial.println("\nWi-Fi connection failed; will retry in loop.");
  }
}

void setup() {
  Serial.begin(115200);
  arduinoSerial.begin(9600);
  arduinoSerial.setTimeout(80);
  delay(300);
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastReconnect = 0;
    if (millis() - lastReconnect > 10000) {
      lastReconnect = millis();
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
  }

  drainArduinoSerial();

  if (millis() - lastTelemetry >= TELEMETRY_INTERVAL) {
    lastTelemetry = millis();
    postTelemetry();
  }

  if (millis() - lastCommandPoll >= COMMAND_POLL_INTERVAL) {
    lastCommandPoll = millis();
    pollCommand();
  }
  yield();
}
