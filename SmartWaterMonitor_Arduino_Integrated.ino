#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <SoftwareSerial.h>

// ================= NODEMCU UART =================
// Arduino D3 = RX, D5 = TX. D5 TX MUST pass through the 10k + 10k + 10k divider.
SoftwareSerial espSerial(3, 5);
const unsigned long espTelemetryInterval = 1500;
unsigned long lastEspTelemetryTime = 0;
unsigned long pumpRuntimeSeconds = 0;
unsigned long pumpRuntimeMs = 0;
unsigned long lastRuntimeUpdate = 0;

// ================= LCD =================
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ================= HC-SR04 =================
const int trigPin = 9;
const int echoPin = 10;

// ================= DS18B20 =================
const int temperaturePin = 12;

OneWire oneWire(temperaturePin);
DallasTemperature sensors(&oneWire);

float waterTemperature = 0.0;
bool temperatureValid = false;

unsigned long lastTemperatureTime = 0;
bool temperaturePending = false;

const unsigned long temperatureInterval = 2000;
const unsigned long temperatureConversionTime = 750;

// ================= TURBIDITY SENSOR =================
const int turbidityPin = A3;

int turbidityValue = 0;
bool turbidityValid = false;

unsigned long lastTurbidityTime = 0;

const unsigned long turbidityInterval = 500;

// Provisional ADC thresholds
const int clearThreshold = 800;
const int slightlyCloudyThreshold = 600;
const int cloudyThreshold = 400;

// ================= LEDs =================
const int redLED = 6;
const int yellowLED = 7;
const int greenLED = A0;

// ================= BUZZER =================
const int buzzerPin = 13;

// ================= RELAY =================
const int relayPin = 8;

const int RELAY_ON = LOW;
const int RELAY_OFF = HIGH;

// ================= BUTTONS =================
const int pumpOnButton = 2;
const int pumpOffButton = 4;
const int modeButton = A1;
const int emergencyButton = A2;

// ================= TANK SETTINGS =================
const float tankHeight = 17.1;

const float lowLevel = 20.0;
const float highLevel = 70.0;
const float safetyLevel = 85.0;

// ================= SENSOR SETTINGS =================
const unsigned long sensorInterval = 500;
const unsigned long sensorTimeout = 30000;

// ================= SYSTEM VARIABLES =================
float distanceCM = 0.0;
float waterLevel = 0.0;

bool sensorValid = false;
bool hasMeasurement = false;

bool autoMode = false;
bool pumpState = false;
bool emergencyActive = false;

// ================= TIMERS =================
unsigned long lastSensorTime = 0;
unsigned long lastLCDTime = 0;
unsigned long lastPageTime = 0;
unsigned long lastSerialTime = 0;

const unsigned long lcdInterval = 300;
const unsigned long pageInterval = 2500;
const unsigned long serialInterval = 1000;

// ================= BUTTON DEBOUNCE =================
struct ButtonState {
int lastReading;
int stableState;
unsigned long lastDebounceTime;
};

ButtonState onBtn = {HIGH, HIGH, 0};
ButtonState offBtn = {HIGH, HIGH, 0};
ButtonState modeBtn = {HIGH, HIGH, 0};
ButtonState emergencyBtn = {HIGH, HIGH, 0};

const unsigned long debounceDelay = 50;

// ================= LCD PAGE =================
// 0 = Water Level
// 1 = Water and Pump
// 2 = Mode and Alert
// 3 = Temperature
// 4 = Turbidity

int currentPage = 0;

// ================= ALERT TYPES =================
enum AlertType {
ALERT_NONE,
ALERT_LOW,
ALERT_HIGH,
ALERT_SENSOR,
ALERT_EMERGENCY
};

// ================= FUNCTION DECLARATIONS =================
void readSensor();
void updateTemperature();
void readTurbiditySensor();
void handleButtons();
void controlPump();
void updateLEDs();
void updateBuzzer();
void updateLCD();
void updateSerial();
void processEspCommands();
void sendEspTelemetry();
void sendEspAck(const String &id, const char *status, const char *reason = "");
void printLCDLine(byte row, const char* message);

bool buttonPressed(int pin, ButtonState &button);

AlertType getCurrentAlert();

const char* getTurbidityStatus();
const char* getTurbidityLCDStatus();

// ================= SETUP =================
void setup() {

Serial.begin(9600);
espSerial.begin(9600);
espSerial.setTimeout(25);
lastRuntimeUpdate = millis();

pinMode(trigPin, OUTPUT);
pinMode(echoPin, INPUT);

pinMode(redLED, OUTPUT);
pinMode(yellowLED, OUTPUT);
pinMode(greenLED, OUTPUT);

pinMode(buzzerPin, OUTPUT);

pinMode(relayPin, OUTPUT);
digitalWrite(relayPin, RELAY_OFF);

pinMode(pumpOnButton, INPUT_PULLUP);
pinMode(pumpOffButton, INPUT_PULLUP);
pinMode(modeButton, INPUT_PULLUP);
pinMode(emergencyButton, INPUT_PULLUP);

digitalWrite(redLED, LOW);
digitalWrite(yellowLED, LOW);
digitalWrite(greenLED, LOW);
digitalWrite(buzzerPin, LOW);

// ================= TEMPERATURE SENSOR =================
sensors.begin();
sensors.setWaitForConversion(false);

sensors.requestTemperatures();

lastTemperatureTime = millis();
temperaturePending = true;

// ================= TURBIDITY SENSOR =================
pinMode(turbidityPin, INPUT);

readTurbiditySensor();

lastTurbidityTime = millis();

// ================= LCD =================
lcd.init();
lcd.backlight();

lcd.setCursor(0, 0);
lcd.print("WATER MONITOR");

lcd.setCursor(0, 1);
lcd.print("MANUAL MODE");

delay(1500);
lcd.clear();

Serial.println("==============================");
Serial.println("SMART WATER MONITOR");
Serial.println("SYSTEM STARTED - MANUAL MODE");
Serial.println("DS18B20 TEMPERATURE ACTIVE");
Serial.println("TURBIDITY SENSOR ACTIVE");
Serial.println("==============================");
}

// ================= MAIN LOOP =================
void loop() {

unsigned long currentTime = millis();

// Remote commands from NodeMCU are handled without replacing local controls.
processEspCommands();

// Pump runtime counter (seconds while relay state is ON).
if (pumpState) {
  pumpRuntimeMs += (currentTime - lastRuntimeUpdate);
}
pumpRuntimeSeconds = pumpRuntimeMs / 1000UL;
lastRuntimeUpdate = currentTime;

// WATER LEVEL SENSOR
if (currentTime - lastSensorTime >= sensorInterval) {

lastSensorTime = currentTime;  
readSensor();

}

// TEMPERATURE SENSOR
updateTemperature();

// TURBIDITY SENSOR
if (currentTime - lastTurbidityTime >= turbidityInterval) {

lastTurbidityTime = currentTime;  
readTurbiditySensor();

}

// BUTTONS
handleButtons();

// PUMP CONTROL
controlPump();

// LED AND BUZZER
updateLEDs();
updateBuzzer();

// LCD UPDATE
if (currentTime - lastLCDTime >= lcdInterval) {

lastLCDTime = currentTime;  
updateLCD();

}

// LCD PAGE CHANGE
if (currentTime - lastPageTime >= pageInterval) {

lastPageTime = currentTime;  

currentPage++;  

if (currentPage > 4) {  
  currentPage = 0;  
}

}

// SERIAL MONITOR
if (currentTime - lastSerialTime >= serialInterval) {

lastSerialTime = currentTime;  
updateSerial();

}

// Send one compact data line to the ESP8266 at a steady interval.
sendEspTelemetry();
}

// ================= WATER LEVEL SENSOR =================
void readSensor() {

digitalWrite(trigPin, LOW);
delayMicroseconds(2);

digitalWrite(trigPin, HIGH);
delayMicroseconds(10);

digitalWrite(trigPin, LOW);

unsigned long duration = pulseIn(
echoPin,
HIGH,
sensorTimeout
);

if (duration == 0) {

sensorValid = false;  
return;

}

float measuredDistance = duration * 0.0343 / 2.0;

if (measuredDistance < 2.0 ||
measuredDistance > tankHeight + 5.0) {

sensorValid = false;  
return;

}

distanceCM = measuredDistance;

waterLevel =
((tankHeight - distanceCM) / tankHeight) * 100.0;

waterLevel = constrain(waterLevel, 0.0, 100.0);

sensorValid = true;
hasMeasurement = true;
}

// ================= TEMPERATURE SENSOR =================
void updateTemperature() {

unsigned long currentTime = millis();

if (!temperaturePending &&
currentTime - lastTemperatureTime >= temperatureInterval) {

sensors.requestTemperatures();  

lastTemperatureTime = currentTime;  
temperaturePending = true;

}

if (temperaturePending &&
currentTime - lastTemperatureTime >= temperatureConversionTime) {

waterTemperature = sensors.getTempCByIndex(0);  

if (waterTemperature != DEVICE_DISCONNECTED_C &&  
    waterTemperature >= -55 &&  
    waterTemperature <= 125) {  

  temperatureValid = true;  
}  

else {  

  temperatureValid = false;  
}  

temperaturePending = false;

}
}

// ================= TURBIDITY SENSOR =================
void readTurbiditySensor() {

const int sampleCount = 21;

int readings[sampleCount];

// Collect 21 ADC readings
for (int i = 0; i < sampleCount; i++) {

readings[i] = analogRead(turbidityPin);  

delay(2);

}

// Sort readings from lowest to highest
for (int i = 1; i < sampleCount; i++) {

int key = readings[i];  
int j = i - 1;  

while (j >= 0 && readings[j] > key) {  

  readings[j + 1] = readings[j];  
  j--;  
}  

readings[j + 1] = key;

}

// Average the middle 5 readings
// Extreme high and low readings are ignored

long total = 0;

for (int i = 8; i <= 12; i++) {

total += readings[i];

}

turbidityValue = total / 5;

turbidityValue = constrain(turbidityValue, 0, 1023);

turbidityValid = true;
}

// ================= TURBIDITY STATUS =================
const char* getTurbidityStatus() {

if (!turbidityValid) {

return "SENSOR ERROR";

}

if (turbidityValue >= clearThreshold) {

return "CLEAR";

}

else if (turbidityValue >= slightlyCloudyThreshold) {

return "SLIGHT CLOUDY";

}

else if (turbidityValue >= cloudyThreshold) {

return "CLOUDY";

}

else {

return "VERY CLOUDY";

}
}

// ================= TURBIDITY LCD STATUS =================
const char* getTurbidityLCDStatus() {

if (turbidityValue >= clearThreshold) {

return "CLEAR";

}

else if (turbidityValue >= slightlyCloudyThreshold) {

return "SL.CLOUDY";

}

else if (turbidityValue >= cloudyThreshold) {

return "CLOUDY";

}

else {

return "V.CLOUDY";

}
}

// ================= BUTTON DEBOUNCE =================
bool buttonPressed(int pin, ButtonState &button) {

int reading = digitalRead(pin);

if (reading != button.lastReading) {

button.lastDebounceTime = millis();  
button.lastReading = reading;

}

if (millis() - button.lastDebounceTime > debounceDelay) {

if (reading != button.stableState) {  

  button.stableState = reading;  

  if (button.stableState == LOW) {  

    return true;  
  }  
}

}

return false;
}

// ================= HANDLE BUTTONS =================
void handleButtons() {

// AUTO / MANUAL BUTTON
if (buttonPressed(modeButton, modeBtn)) {

autoMode = !autoMode;  
pumpState = false;  

if (autoMode) {  

  Serial.println("MODE CHANGED: AUTO");  
}  

else {  

  Serial.println("MODE CHANGED: MANUAL");  
}

}

// EMERGENCY BUTTON
if (buttonPressed(emergencyButton, emergencyBtn)) {

emergencyActive = !emergencyActive;  

if (emergencyActive) {  

  pumpState = false;  
  digitalWrite(relayPin, RELAY_OFF);  

  lcd.clear();  

  printLCDLine(0, "EMERGENCY");  
  printLCDLine(1, "ACTIVATED!");  

  Serial.println("EMERGENCY BUTTON ACTIVATED");  
}  

else {  

  pumpState = false;  

  lcd.clear();  

  printLCDLine(0, "EMERGENCY");  
  printLCDLine(1, "RELEASED");  

  Serial.println("EMERGENCY RELEASED");  
}

}

// PUMP ON BUTTON - MANUAL ONLY
if (buttonPressed(pumpOnButton, onBtn)) {

if (!autoMode &&  
    !emergencyActive &&  
    sensorValid &&  
    hasMeasurement &&  
    waterLevel < safetyLevel) {  

  pumpState = true;  

  Serial.println("MANUAL PUMP ON");  
}

}

// PUMP OFF BUTTON - MANUAL ONLY
if (buttonPressed(pumpOffButton, offBtn)) {

if (!autoMode) {  

  pumpState = false;  

  Serial.println("MANUAL PUMP OFF");  
}

}
}

// ================= PUMP CONTROL =================
void controlPump() {

if (emergencyActive) {

pumpState = false;

}

if (!sensorValid || !hasMeasurement) {

pumpState = false;

}

if (hasMeasurement && waterLevel >= safetyLevel) {

pumpState = false;

}

// AUTO MODE
if (autoMode &&
sensorValid &&
hasMeasurement &&
!emergencyActive) {

if (waterLevel <= lowLevel) {  

  pumpState = true;  
}  

if (waterLevel >= highLevel) {  

  pumpState = false;  
}

}

if (pumpState) {

digitalWrite(relayPin, RELAY_ON);

}

else {

digitalWrite(relayPin, RELAY_OFF);

}
}

// ================= LED CONTROL =================
void updateLEDs() {

if (!sensorValid || !hasMeasurement || emergencyActive) {

digitalWrite(redLED, LOW);  
digitalWrite(yellowLED, LOW);  
digitalWrite(greenLED, LOW);  

return;

}

if (waterLevel <= lowLevel) {

digitalWrite(redLED, HIGH);  
digitalWrite(yellowLED, LOW);  
digitalWrite(greenLED, LOW);

}

else if (waterLevel < highLevel) {

digitalWrite(redLED, LOW);  
digitalWrite(yellowLED, HIGH);  
digitalWrite(greenLED, LOW);

}

else {

digitalWrite(redLED, LOW);  
digitalWrite(yellowLED, LOW);  
digitalWrite(greenLED, HIGH);

}
}

// ================= BUZZER CONTROL =================
void updateBuzzer() {

if (!sensorValid || !hasMeasurement || emergencyActive) {

digitalWrite(buzzerPin, LOW);  
return;

}

if (waterLevel <= lowLevel ||
waterLevel >= highLevel) {

digitalWrite(buzzerPin, HIGH);

}

else {

digitalWrite(buzzerPin, LOW);

}
}

// ================= ALERT DETECTION =================
AlertType getCurrentAlert() {

if (emergencyActive) {

return ALERT_EMERGENCY;

}

if (!sensorValid || !hasMeasurement) {

return ALERT_SENSOR;

}

if (waterLevel <= lowLevel) {

return ALERT_LOW;

}

if (waterLevel >= highLevel) {

return ALERT_HIGH;

}

return ALERT_NONE;
}

// ================= LCD LINE PRINT =================
void printLCDLine(byte row, const char* message) {

lcd.setCursor(0, row);

byte i = 0;

while (message[i] != '\0' && i < 16) {

lcd.print(message[i]);  
i++;

}

while (i < 16) {

lcd.print(' ');  
i++;

}
}

// ================= LCD DISPLAY =================
void updateLCD() {

// EMERGENCY SCREEN
if (emergencyActive) {

printLCDLine(0, "EMERGENCY");  
printLCDLine(1, "ACTIVATED!");  

return;

}

// WATER LEVEL SENSOR ERROR
if (!sensorValid || !hasMeasurement) {

printLCDLine(0, "SENSOR ERROR");  
printLCDLine(1, "Check D9 / D10");  

return;

}

// PAGE 1: WATER LEVEL
if (currentPage == 0) {

lcd.setCursor(0, 0);  
lcd.print("Dist: ");  
lcd.print(distanceCM, 1);  
lcd.print(" cm    ");  

lcd.setCursor(0, 1);  
lcd.print("Level: ");  
lcd.print(waterLevel, 1);  
lcd.print("%    ");

}

// PAGE 2: WATER AND PUMP
else if (currentPage == 1) {

if (waterLevel <= lowLevel) {  

  printLCDLine(0, "WATER: LOW");  
}  

else if (waterLevel < highLevel) {  

  printLCDLine(0, "WATER: NORMAL");  
}  

else {  

  printLCDLine(0, "WATER: HIGH");  
}  

if (pumpState) {  

  printLCDLine(1, "PUMP: ON");  
}  

else {  

  printLCDLine(1, "PUMP: OFF");  
}

}

// PAGE 3: MODE AND ALERT
else if (currentPage == 2) {

if (autoMode) {  

  printLCDLine(0, "MODE: AUTO");  
}  

else {  

  printLCDLine(0, "MODE: MANUAL");  
}  

AlertType alert = getCurrentAlert();  

if (alert == ALERT_EMERGENCY) {  

  printLCDLine(1, "ALERT: EMERGENCY");  
}  

else if (alert == ALERT_LOW) {  

  printLCDLine(1, "ALERT: LOW");  
}  

else if (alert == ALERT_HIGH) {  

  printLCDLine(1, "ALERT: HIGH");  
}  

else if (alert == ALERT_SENSOR) {  

  printLCDLine(1, "ALERT: SENSOR");  
}  

else {  

  printLCDLine(1, "SYSTEM: NORMAL");  
}

}

// PAGE 4: TEMPERATURE
else if (currentPage == 3) {

printLCDLine(0, "WATER TEMP:");  

if (temperatureValid) {  

  lcd.setCursor(0, 1);  

  lcd.print("Temp: ");  
  lcd.print(waterTemperature, 2);  
  lcd.print((char)223);  
  lcd.print("C     ");  
}  

else {  

  printLCDLine(1, "TEMP SENSOR ERR");  
}

}

// PAGE 5: TURBIDITY
else {

if (turbidityValid) {  

  lcd.setCursor(0, 0);  
  lcd.print("Turbidity: ");  
  lcd.print(turbidityValue);  
  lcd.print("   ");  

  lcd.setCursor(0, 1);  
  lcd.print("Water: ");  
  lcd.print(getTurbidityLCDStatus());  
  lcd.print("   ");  
}  

else {  

  printLCDLine(0, "TURBIDITY ERROR");  
  printLCDLine(1, "CHECK A3");  
}

}
}

// ================= SERIAL MONITOR =================
void updateSerial() {

Serial.println("==============================");

// WATER LEVEL
if (!sensorValid || !hasMeasurement) {

Serial.println("Water Sensor: ERROR");

}

else {

Serial.print("Distance: ");  
Serial.print(distanceCM, 1);  
Serial.println(" cm");  

Serial.print("Water Level: ");  
Serial.print(waterLevel, 1);  
Serial.println(" %");

}

// TEMPERATURE
if (temperatureValid) {

Serial.print("Water Temperature: ");  
Serial.print(waterTemperature, 2);  
Serial.println(" C");

}

else {

Serial.println("Temperature Sensor: ERROR");

}

// TURBIDITY
if (turbidityValid) {

Serial.print("Turbidity Raw ADC: ");  
Serial.print(turbidityValue);  
Serial.println(" / 1023");  

Serial.print("Water Quality: ");  
Serial.println(getTurbidityStatus());

}

else {

Serial.println("Turbidity Sensor: ERROR");

}

// MODE
Serial.print("Mode: ");
Serial.println(autoMode ? "AUTO" : "MANUAL");

// PUMP
Serial.print("Pump: ");
Serial.println(pumpState ? "ON" : "OFF");

// EMERGENCY
Serial.print("Emergency: ");
Serial.println(emergencyActive ? "ACTIVE" : "OFF");

Serial.println("==============================");
}
eta amr hardware er complete set up code ar ami tmke je zip file ar web app link dilam oita web broweser app.
ei sob gulu memorize kore rakho.jodi hoy taile yes likho

// ================= NODEMCU COMMUNICATION =================
// Wire format from Arduino to ESP8266:
// DATA|waterLevel|-1 if invalid|distanceCM|temperature|-999 if invalid|tempValid|
// turbidityRaw|turbidityValid|turbidityStatus|pump|mode|emergency|sensorValid|runtimeSeconds

void sendEspTelemetry() {
  unsigned long now = millis();
  if (now - lastEspTelemetryTime < espTelemetryInterval) return;
  lastEspTelemetryTime = now;

  espSerial.print("DATA|");
  espSerial.print((sensorValid && hasMeasurement) ? waterLevel : -1.0, 1); espSerial.print('|');
  espSerial.print(distanceCM, 1); espSerial.print('|');
  espSerial.print(temperatureValid ? waterTemperature : -999.0, 2); espSerial.print('|');
  espSerial.print(temperatureValid ? 1 : 0); espSerial.print('|');
  espSerial.print(turbidityValue); espSerial.print('|');
  espSerial.print(turbidityValid ? 1 : 0); espSerial.print('|');
  espSerial.print(getTurbidityStatus()); espSerial.print('|');
  espSerial.print(pumpState ? 1 : 0); espSerial.print('|');
  espSerial.print(autoMode ? "AUTO" : "MANUAL"); espSerial.print('|');
  espSerial.print(emergencyActive ? 1 : 0); espSerial.print('|');
  espSerial.print((sensorValid && hasMeasurement) ? 1 : 0); espSerial.print('|');
  espSerial.println(pumpRuntimeSeconds);
}

void sendEspAck(const String &id, const char *status, const char *reason) {
  espSerial.print("ACK|");
  espSerial.print(id);
  espSerial.print('|');
  espSerial.print(status);
  if (reason && reason[0] != '\0') {
    espSerial.print('|');
    espSerial.print(reason);
  }
  espSerial.println();
}

void processEspCommands() {
  while (espSerial.available()) {
    String line = espSerial.readStringUntil('\n');
    line.trim();
    if (!line.startsWith("CMD|")) continue;

    int first = line.indexOf('|');
    int second = line.indexOf('|', first + 1);
    int third = line.indexOf('|', second + 1);
    if (first < 0 || second < 0 || third < 0) continue;

    String id = line.substring(first + 1, second);
    String command = line.substring(second + 1, third);
    String value = line.substring(third + 1);
    value.trim();

    if (command == "PUMP" && value == "OFF") {
      pumpState = false;
      digitalWrite(relayPin, RELAY_OFF);
      sendEspAck(id, "OK");
    }
    else if (command == "PUMP" && value == "ON") {
      if (autoMode) sendEspAck(id, "ERROR", "SWITCH_TO_MANUAL");
      else if (emergencyActive) sendEspAck(id, "ERROR", "EMERGENCY_ACTIVE");
      else if (!sensorValid || !hasMeasurement) sendEspAck(id, "ERROR", "LEVEL_SENSOR_INVALID");
      else if (waterLevel >= safetyLevel) sendEspAck(id, "ERROR", "TANK_SAFETY_CUTOFF");
      else {
        pumpState = true;
        sendEspAck(id, "OK");
      }
    }
    else if (command == "SET_MODE" && (value == "AUTO" || value == "MANUAL")) {
      autoMode = (value == "AUTO");
      pumpState = false;
      sendEspAck(id, "OK");
    }
    else if (command == "EMERGENCY" && value == "ON") {
      emergencyActive = true;
      pumpState = false;
      digitalWrite(relayPin, RELAY_OFF);
      sendEspAck(id, "OK");
    }
    else if (command == "EMERGENCY" && value == "OFF") {
      emergencyActive = false;
      pumpState = false;
      sendEspAck(id, "OK");
    }
    else {
      sendEspAck(id, "ERROR", "INVALID_COMMAND");
    }
  }
}
