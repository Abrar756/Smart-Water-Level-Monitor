# Smart Water Monitor — ESP8266 Hardware API

This web app now has an ESP8266 telemetry bridge.

## Render environment variable

Before connecting the NodeMCU, open the Render service for this app → Environment and add:

- `DEVICE_API_KEY` = a long private key that you choose

Save the environment variable and redeploy. The same key will be placed in the NodeMCU firmware later. Do not commit the key to a public repository.

## ESP8266 API contract

Base URL: `https://smart-water-level-monitor.onrender.com`

All device requests must include this HTTP header:

`X-Device-Key: <same value as DEVICE_API_KEY>`

### Send sensor telemetry

`POST /api/hardware/telemetry`

JSON example:

```json
{
  "waterLevel": 63.25,
  "temperature": 24.75,
  "pump": false,
  "mode": "AUTO",
  "runtime": 1250,
  "emergency": false,
  "tank": "NORMAL"
}
```

`waterLevel` must be 0–100. `temperature` may be null or a DS18B20 reading from -55 to 125 °C. `pump` and `emergency` are booleans; `mode` is `AUTO` or `MANUAL`.

The app marks the hardware online while telemetry has arrived within the last 25 seconds. If telemetry stops, it marks the hardware disconnected and returns to the existing simulation behavior.

### Poll for web commands

`GET /api/hardware/command`

Possible command values:

- `{"command":"PUMP","value":"ON"}`
- `{"command":"PUMP","value":"OFF"}`
- `{"command":"SET_MODE","value":"AUTO"}`
- `{"command":"SET_MODE","value":"MANUAL"}`
- `{"command":"EMERGENCY","value":"ON"}`
- `{"command":"EMERGENCY","value":"OFF"}`

The command response also includes an `id`. After the NodeMCU has applied it, acknowledge it:

`POST /api/hardware/ack` with JSON `{"id": 1}` using the same device header.

## Notes

- Existing dashboard styling and routes are retained.
- A Water Temperature card now displays the DS18B20 reading to two decimal places.
- Existing pump safety rules remain in the web API (MANUAL mode required, emergency and source-water checks, and full-tank protection).
- The Arduino/NodeMCU firmware still needs to be updated separately to send telemetry, poll commands, and acknowledge commands.
