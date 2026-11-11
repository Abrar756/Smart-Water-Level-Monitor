from flask import Flask, render_template, jsonify, request
import os, time, secrets

app = Flask(__name__)

DEVICE_API_KEY = os.environ.get("DEVICE_API_KEY", "")
HARDWARE_TIMEOUT_SECONDS = 25
hardware_last_seen = 0
hardware_command = None
hardware_command_id = 0

# Values are populated ONLY by hardware telemetry. No simulated defaults.
state = {
    "waterLevel": None, "distanceCm": None, "temperature": None, "pump": None, "mode": None,
    "runtime": None, "tank": "NO DATA", "emergency": None,
    "turbidityRaw": None, "turbidityVoltage": None, "turbidityNTU": None,
    "turbidityStatus": "NOT CALIBRATED", "connected": False,
    "connectionType": "DISCONNECTED"
}
settings = {"autoPumpOnLevel": 20.0, "autoPumpOffLevel": 70.0, "criticalLowLevel": 10.0}
alert_history = []

def online():
    return bool(hardware_last_seen and time.time() - hardware_last_seen <= HARDWARE_TIMEOUT_SECONDS)

def auth():
    key = request.headers.get("X-Device-Key", "")
    return bool(DEVICE_API_KEY) and secrets.compare_digest(key, DEVICE_API_KEY)

def queue_command(command, value=None):
    global hardware_command_id, hardware_command
    hardware_command_id += 1
    hardware_command = {"id": hardware_command_id, "command": command, "value": value}
    return hardware_command

def current_alert():
    if not online():
        return {"active": True, "type": "DISCONNECTED", "severity": "warning",
                "title": "Hardware Disconnected", "message": "No recent data received from Arduino/NodeMCU."}
    if state["emergency"]:
        return {"active": True, "type": "EMERGENCY", "severity": "critical",
                "title": "Emergency Shutdown Active", "message": "Pump stopped by emergency control."}
    if state["waterLevel"] is not None and state["waterLevel"] <= settings["criticalLowLevel"]:
        return {"active": True, "type": "CRITICAL_LOW", "severity": "critical",
                "title": "Critically Low Water", "message": "Main tank water level is critically low."}
    if state["waterLevel"] is not None and state["waterLevel"] <= settings["autoPumpOnLevel"]:
        return {"active": True, "type": "LOW_WATER", "severity": "warning",
                "title": "Low Water Level", "message": "Main tank water level is low."}
    if state["waterLevel"] is not None and state["waterLevel"] >= settings["autoPumpOffLevel"]:
        return {"active": True, "type": "TANK_FULL", "severity": "normal",
                "title": "Tank Full", "message": "Main tank is full."}
    if state["turbidityStatus"] == "POOR":
        return {"active": True, "type": "POOR_WATER_QUALITY", "severity": "warning",
                "title": "Poor Water Quality", "message": "Turbidity reading indicates poor water clarity."}
    return {"active": False, "type": "NORMAL", "severity": "normal",
            "title": "No Active Alerts", "message": "No active hardware alerts."}

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/manifest.json")
def manifest():
    return app.send_static_file("manifest.json")

@app.route("/service-worker.js")
def service_worker():
    response = app.send_static_file("service-worker.js")
    response.headers["Content-Type"] = "application/javascript"
    response.headers["Service-Worker-Allowed"] = "/"
    return response

@app.route("/api/status")
def status():
    connected = online()
    state["connected"] = connected
    state["connectionType"] = "HARDWARE" if connected else "DISCONNECTED"
    alert = current_alert()
    return jsonify({**state, "alert": alert, "alertHistory": alert_history[:],
                    "settings": settings, "hardwareLastSeen": int(hardware_last_seen) if hardware_last_seen else None})

@app.route("/api/hardware/telemetry", methods=["POST"])
def telemetry():
    global hardware_last_seen
    if not auth():
        return jsonify(success=False, message="Unauthorized device"), 401
    data = request.get_json(silent=True) or {}
    try:
        numeric = {
            "waterLevel": (0, 100), "distanceCm": (0, 1000), "temperature": (-55, 125),
            "runtime": (0, 2147483647),
            "turbidityRaw": (0, 1023), "turbidityVoltage": (0, 5),
            "turbidityNTU": (0, 100000)
        }
        for key, (lo, hi) in numeric.items():
            if key in data:
                value = data[key]
                if value is None:
                    state[key] = None
                else:
                    value = float(value)
                    if not lo <= value <= hi:
                        raise ValueError(f"{key} is out of range")
                    state[key] = round(value, 2) if key != "runtime" and key != "turbidityRaw" else int(value)
        for key in ("pump", "emergency"):
            if key in data:
                if not isinstance(data[key], bool):
                    raise ValueError(f"{key} must be true or false")
                state[key] = data[key]
        if data.get("mode") in ("AUTO", "MANUAL"):
            state["mode"] = data["mode"]
        if isinstance(data.get("tank"), str):
            state["tank"] = data["tank"][:20].upper()
        if isinstance(data.get("turbidityStatus"), str):
            allowed = ("CLEAR", "MODERATE", "POOR", "NOT CALIBRATED", "SENSOR ERROR")
            if data["turbidityStatus"] not in allowed:
                raise ValueError("Invalid turbidityStatus")
            state["turbidityStatus"] = data["turbidityStatus"]
    except (ValueError, TypeError) as exc:
        return jsonify(success=False, message=str(exc)), 400
    hardware_last_seen = time.time()
    state["connected"] = True
    state["connectionType"] = "HARDWARE"
    return jsonify(success=True, message="Hardware telemetry received")

@app.route("/api/hardware/command")
def device_command():
    if not auth():
        return jsonify(success=False, message="Unauthorized device"), 401
    return jsonify(success=True, command=hardware_command)

@app.route("/api/hardware/ack", methods=["POST"])
def device_ack():
    global hardware_command
    if not auth():
        return jsonify(success=False), 401
    data = request.get_json(silent=True) or {}
    if hardware_command and data.get("id") == hardware_command.get("id"):
        hardware_command = None
    return jsonify(success=True)

@app.route("/api/mode", methods=["POST"])
def set_mode():
    data = request.get_json(silent=True) or {}
    mode = data.get("mode")
    if mode not in ("AUTO", "MANUAL"):
        return jsonify(success=False, message="Invalid mode"), 400
    if not online():
        return jsonify(success=False, message="Hardware is disconnected; command not sent")
    queue_command("SET_MODE", mode)
    return jsonify(success=True, mode=mode, message="Mode command sent to hardware")

@app.route("/api/pump", methods=["POST"])
def pump():
    data = request.get_json(silent=True) or {}
    command = data.get("command")
    if command not in ("ON", "OFF"):
        return jsonify(success=False, message="Invalid pump command"), 400
    if not online():
        return jsonify(success=False, message="Hardware is disconnected; command not sent")
    if command == "ON":
        if state["mode"] != "MANUAL":
            return jsonify(success=False, message="Switch to MANUAL mode first")
        if state["emergency"]:
            return jsonify(success=False, message="Emergency shutdown is active")
        if state["waterLevel"] is None or state["waterLevel"] >= 95:
            return jsonify(success=False, message="Main tank at/above the 95% safety cutoff or water-level data unavailable")
    queue_command("PUMP", command)
    return jsonify(success=True, message=f"Pump {command} command sent to hardware")

@app.route("/api/emergency", methods=["POST"])
def emergency():
    data = request.get_json(silent=True) or {}
    command = data.get("command")
    if command not in ("ON", "OFF"):
        return jsonify(success=False, message="Invalid emergency command"), 400
    if not online():
        return jsonify(success=False, message="Hardware is disconnected; command not sent")
    queue_command("EMERGENCY", command)
    return jsonify(success=True, emergency=(command == "ON"), message="Emergency command sent")

@app.route("/api/settings", methods=["GET", "POST"])
def settings_api():
    if request.method == "GET":
        return jsonify(success=True, settings=settings)
    data = request.get_json(silent=True) or {}
    try:
        on = float(data.get("autoPumpOnLevel", settings["autoPumpOnLevel"]))
        off = float(data.get("autoPumpOffLevel", settings["autoPumpOffLevel"]))
        low = float(data.get("criticalLowLevel", settings["criticalLowLevel"]))
        if not (0 <= low <= on < off <= 100):
            raise ValueError("Thresholds must satisfy 0 ≤ critical low ≤ pump ON < pump OFF ≤ 100")
    except (ValueError, TypeError) as exc:
        return jsonify(success=False, message=str(exc)), 400
    settings.update(autoPumpOnLevel=on, autoPumpOffLevel=off, criticalLowLevel=low)
    return jsonify(success=True, settings=settings, message="Threshold settings saved")

@app.route("/api/alerts/clear", methods=["POST"])
def clear_alerts():
    alert_history.clear()
    return jsonify(success=True)

@app.route("/api/consumption", methods=["POST"])
def removed_consumption():
    return jsonify(success=False, message="Water consumption simulation has been removed."), 410

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
