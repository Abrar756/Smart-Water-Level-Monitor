# Smart Water Level Monitor — real hardware mode

This version has **no simulated readings** and no water-consumption-rate feature.

## Run locally
```bash
pip install -r requirements.txt
python app.py
```
Open `http://127.0.0.1:5000`. Until the ESP8266 sends telemetry, the dashboard shows `DISCONNECTED` / `NO DATA`; it does not invent sensor values.

## Render configuration
Set `DEVICE_API_KEY` in the Render service environment to a long private key. Put the same key in the ESP8266 firmware. Do not commit the key to GitHub.

## ESP8266 telemetry
POST `https://smart-water-level-monitor.onrender.com/api/hardware/telemetry`
Header: `X-Device-Key: <DEVICE_API_KEY>`
Content-Type: `application/json`

Example payload (send only fields actually measured/known):
```json
{
  "waterLevel": 63.25,
  "temperature": 24.75,
  "pump": false,
  "mode": "AUTO",
  "runtime": 1250,
  "emergency": false,
  "tank": "NORMAL",
  "sourceWater": true,
  "turbidityRaw": 520,
  "turbidityVoltage": 2.54,
  "turbidityNTU": null,
  "turbidityStatus": "NOT CALIBRATED"
}
```
`waterLevel` is main-tank level (0–100%). `temperature` is DS18B20 °C.
`sourceWater` must come from a **physical source-container low-level/empty sensor**. The software never refills or assumes the source container is infinite. `sourceWaterLevel` is optional and must only be sent if a real source-level sensor measures it.

Turbidity fields:
- `turbidityRaw`: analog ADC count (0–1023 on Uno)
- `turbidityVoltage`: measured sensor output voltage
- `turbidityNTU`: send `null` until you calibrate the exact turbidity module against known reference samples
- `turbidityStatus`: `CLEAR`, `MODERATE`, `POOR`, `NOT CALIBRATED`, or `SENSOR ERROR`

**Important calibration note:** generic turbidity modules do not share one reliable voltage-to-NTU formula. Do not display a made-up NTU value. First collect readings from clear and reference-turbidity water and calibrate your exact sensor.

Telemetry is considered online for 25 seconds after the latest valid request. When offline, dashboard readings are not replaced with simulated values.

## Device command polling
GET `/api/hardware/command` with the same `X-Device-Key` header. Apply returned command and acknowledge with POST `/api/hardware/ack` and JSON `{"id": <returned id>}`.

Commands: `PUMP` ON/OFF, `SET_MODE` AUTO/MANUAL, `EMERGENCY` ON/OFF. The web app refuses remote control while hardware is offline, and requires MANUAL mode, source-water-present data, no emergency, and non-full main tank for remote pump ON.

## Hardware wiring note
The turbidity sensor analog output can be connected to Arduino Uno A3 if that pin is free in the current wiring. The sensor must be powered according to its module specification; keep its analog output within the Uno's 0–5 V input range.

A finite source container needs a physical empty/low-water sensor too (for example, a suitable float switch). Without that sensor, the app cannot know when the source container is empty. Do not report a guessed source level.
