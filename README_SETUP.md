# Smart Water Level Monitor — integrated hardware firmware

## Files
- `SmartWaterMonitor_Arduino_Integrated.ino`: your supplied Arduino Uno program with UART telemetry/remote-command support added. Existing sensor, LCD, LED, buzzer, button and relay pins are preserved.
- `SmartWaterMonitor_NodeMCU_Integrated.ino`: ESP8266 Wi-Fi bridge for Render.
- `Smart-Water-Level-Monitor-main-source-removed.zip`: web app with source-water sensor state/interlocks removed and UI marked NOT INSTALLED.

## Wiring
Arduino D5 (TX) -> 10k resistor -> divider junction -> NodeMCU D5 (RX). From divider junction to GND use TWO 10k resistors in series (20k total). NodeMCU D6 (TX) -> Arduino D3 (RX). Arduino GND <-> NodeMCU GND. NodeMCU USB powers NodeMCU. Arduino may remain USB powered. Do not connect 5V to ESP8266 GPIO.

## Arduino IDE libraries
Arduino Uno: install `LiquidCrystal_I2C`, `OneWire`, `DallasTemperature`. `SoftwareSerial` is built in.
NodeMCU: select `NodeMCU 1.0 (ESP-12E Module)` and install ESP8266 board support plus `ArduinoJson` 6.x.

## Before uploading NodeMCU firmware
Set `WIFI_SSID`, `WIFI_PASSWORD`, and `DEVICE_API_KEY` in its sketch. In Render, set the same `DEVICE_API_KEY` environment variable. Never publish the key in a public repository.

## Important safety / operating limits
- Source-water interlock is removed as requested. No source-empty detection or dry-run protection exists. Check source water manually before pump ON.
- Arduino remains the final authority: remote PUMP ON is accepted only in MANUAL mode, with valid main-tank sensor data, below 95% safety cutoff, and no emergency. PUMP OFF and EMERGENCY ON are always accepted.
- AUTO mode uses the existing Arduino thresholds: ON at/below 20%, OFF at/above 70%.
- Main-tank sensor failure and emergency still stop the pump.
- The ESP8266 sketch uses `setInsecure()` for HTTPS compatibility. Traffic is encrypted, but server certificate identity is not verified. For production deployment, pin/validate the Render certificate chain.
- The dashboard receives water level, HC-SR04 distance, DS18B20 temperature, turbidity raw ADC/category, pump state, mode, emergency state and pump runtime.
- `runtime` is accumulated by the Arduino while pump is ON and resets after Arduino power cycle.
- Turbidity NTU is not fabricated; raw ADC and calibrated category are sent.

## Upload order
1. Back up the original Arduino sketch.
2. Upload `SmartWaterMonitor_Arduino_Integrated.ino` to Arduino Uno.
3. Fill Wi-Fi/API key in `SmartWaterMonitor_NodeMCU_Integrated.ino`, then upload to NodeMCU.
4. Connect both boards and common GND as shown above.
5. Keep pump power disconnected for the first live dashboard check. Confirm `/api/status` reports connected and sensor readings.
6. Test PUMP OFF and emergency stop first. Only then test pump ON with water confirmed in the source and MANUAL mode.
