from flask import Flask, render_template, jsonify, request
import time


app = Flask(__name__)


# ============================================================
# SYSTEM SETTINGS
# ============================================================

CONSUMPTION_RATE = 2.00
PUMP_FILL_RATE = 2.00

AUTO_PUMP_ON_LEVEL = 30.0
AUTO_PUMP_OFF_LEVEL = 90.0

MIN_LEVEL = 0.0
MAX_LEVEL = 100.0

# Source tank
SOURCE_START_LEVEL = 100.0
SOURCE_MIN_LEVEL = 0.0
SOURCE_MAX_LEVEL = 100.0

# Source tank automatically refills
SOURCE_REFILL_RATE = 1.00

# Critical low level
CRITICAL_LOW_LEVEL = 10.0


# ============================================================
# SYSTEM DATA
# ============================================================

system_data = {

    "waterLevel": 75.00,

    "pump": False,

    "mode": "AUTO",

    "runtime": 1250,

    "tank": "NORMAL",

    # Water consumption
    "consumption": True,

    # Source tank
    "sourceWater": True,
    "sourceWaterLevel": SOURCE_START_LEVEL,

    # Emergency
    "emergency": False,

    # Connection
    "connected": True
}


# ============================================================
# ALERT DATA
# ============================================================

alert_data = {

    "active": False,

    "type": "NORMAL",

    "severity": "normal",

    "title": "No Active Alerts",

    "message": "All monitored conditions are currently normal.",

    "timestamp": None
}


# ============================================================
# ALERT HISTORY
# ============================================================

alert_history = []

MAX_ALERT_HISTORY = 100


# ============================================================
# TIME TRACKING
# ============================================================

last_update_time = time.time()


# ============================================================
# SETTINGS GETTER
# ============================================================

def get_settings():

    return {

        "consumptionRate": CONSUMPTION_RATE,

        "pumpFillRate": PUMP_FILL_RATE,

        "autoPumpOnLevel": AUTO_PUMP_ON_LEVEL,

        "autoPumpOffLevel": AUTO_PUMP_OFF_LEVEL,

        "sourceRefillRate": SOURCE_REFILL_RATE,

        "criticalLowLevel": CRITICAL_LOW_LEVEL,

        "minLevel": MIN_LEVEL,

        "maxLevel": MAX_LEVEL

    }


# ============================================================
# CURRENT ALERT CALCULATION
# ============================================================

def determine_current_alert():

    water_level = system_data["waterLevel"]

    source_available = system_data["sourceWater"]

    emergency = system_data["emergency"]

    pump = system_data["pump"]


    # --------------------------------------------------------
    # PRIORITY 1 — EMERGENCY
    # --------------------------------------------------------

    if emergency:

        return {

            "active": True,

            "type": "EMERGENCY",

            "severity": "critical",

            "title": "Emergency Shutdown Active",

            "message":
                "Emergency shutdown is active. "
                "The pump has been stopped for safety."

        }


    # --------------------------------------------------------
    # PRIORITY 2 — SOURCE WATER UNAVAILABLE
    # --------------------------------------------------------

    if not source_available:

        return {

            "active": True,

            "type": "SOURCE_UNAVAILABLE",

            "severity": "critical",

            "title": "Source Water Unavailable",

            "message":
                "The source tank is empty. "
                "The pump cannot operate until source water is available."

        }


    # --------------------------------------------------------
    # PRIORITY 3 — CRITICALLY LOW MAIN TANK
    # --------------------------------------------------------

    if water_level <= CRITICAL_LOW_LEVEL:

        return {

            "active": True,

            "type": "CRITICAL_LOW",

            "severity": "critical",

            "title": "Critically Low Water Level",

            "message":
                f"Main tank water level is critically low "
                f"at {water_level:.2f}%."

        }


    # --------------------------------------------------------
    # PRIORITY 4 — LOW MAIN TANK
    # --------------------------------------------------------

    if water_level <= AUTO_PUMP_ON_LEVEL:

        return {

            "active": True,

            "type": "LOW_WATER",

            "severity": "warning",

            "title": "Low Water Level",

            "message":
                f"Main tank water level is low "
                f"at {water_level:.2f}%."

        }


    # --------------------------------------------------------
    # PRIORITY 5 — FULL TANK
    # --------------------------------------------------------

    if water_level >= AUTO_PUMP_OFF_LEVEL:

        return {

            "active": True,

            "type": "TANK_FULL",

            "severity": "normal",

            "title": "Tank Full",

            "message":
                f"Main tank is full at "
                f"{water_level:.2f}%."

        }


    # --------------------------------------------------------
    # PRIORITY 6 — PUMP RUNNING
    # --------------------------------------------------------

    if pump:

        return {

            "active": True,

            "type": "PUMP_RUNNING",

            "severity": "info",

            "title": "Pump Running",

            "message":
                "The water pump is currently running."

        }


    # --------------------------------------------------------
    # NORMAL
    # --------------------------------------------------------

    return {

        "active": False,

        "type": "NORMAL",

        "severity": "normal",

        "title": "No Active Alerts",

        "message":
            "All monitored conditions are currently normal."

    }


# ============================================================
# RECORD ALERT CHANGE
# ============================================================

def update_alert_state():

    global alert_data

    new_alert = determine_current_alert()

    old_type = alert_data["type"]

    new_type = new_alert["type"]


    # --------------------------------------------------------
    # FIRST ALERT STATE
    # --------------------------------------------------------

    if alert_data["timestamp"] is None:

        if new_type != "NORMAL":

            timestamp = time.strftime(
                "%H:%M:%S"
            )

            new_alert["timestamp"] = timestamp

            alert_history.insert(
                0,
                {

                    "time": timestamp,

                    "type": new_alert["type"],

                    "severity":
                        new_alert["severity"],

                    "title":
                        new_alert["title"],

                    "message":
                        new_alert["message"],

                    "event":
                        "ACTIVATED"

                }
            )

        else:

            new_alert["timestamp"] = None

        alert_data = new_alert

        return


    # --------------------------------------------------------
    # ALERT CHANGED
    # --------------------------------------------------------

    if new_type != old_type:

        timestamp = time.strftime(
            "%H:%M:%S"
        )


        # ----------------------------------------------------
        # NEW NORMAL STATE
        # ----------------------------------------------------

        if new_type == "NORMAL":

            alert_history.insert(
                0,
                {

                    "time": timestamp,

                    "type": old_type,

                    "severity":
                        "normal",

                    "title":
                        "Alert Resolved",

                    "message":
                        f"{alert_data['title']} has been resolved.",

                    "event":
                        "RESOLVED"

                }
            )

            new_alert["timestamp"] = None


        # ----------------------------------------------------
        # NEW ALERT
        # ----------------------------------------------------

        else:

            new_alert["timestamp"] = timestamp

            alert_history.insert(
                0,
                {

                    "time": timestamp,

                    "type":
                        new_alert["type"],

                    "severity":
                        new_alert["severity"],

                    "title":
                        new_alert["title"],

                    "message":
                        new_alert["message"],

                    "event":
                        "ACTIVATED"

                }
            )


        # Keep history limited

        if len(alert_history) > MAX_ALERT_HISTORY:

            del alert_history[
                MAX_ALERT_HISTORY:
            ]


    else:

        # Same alert type.
        # Update message but do not create
        # another history item every second.

        new_alert["timestamp"] = \
            alert_data["timestamp"]


    alert_data = new_alert


# ============================================================
# UPDATE TANK CONDITION
# ============================================================

def update_tank_condition():

    water_level = system_data["waterLevel"]


    if water_level <= AUTO_PUMP_ON_LEVEL:

        system_data["tank"] = "LOW"

    elif water_level >= AUTO_PUMP_OFF_LEVEL:

        system_data["tank"] = "FULL"

    else:

        system_data["tank"] = "NORMAL"


# ============================================================
# UPDATE SIMULATION
# ============================================================

def update_simulation():

    global last_update_time

    current_time = time.time()

    elapsed = current_time - last_update_time


    if elapsed <= 0:

        return


    last_update_time = current_time


    # --------------------------------------------------------
    # SOURCE WATER AUTOMATIC REFILL
    # --------------------------------------------------------

    if (
        system_data["sourceWaterLevel"]
        < SOURCE_MAX_LEVEL
    ):

        refill_amount = (
            SOURCE_REFILL_RATE * elapsed
        )


        system_data["sourceWaterLevel"] += \
            refill_amount


        system_data["sourceWaterLevel"] = min(
            SOURCE_MAX_LEVEL,
            system_data["sourceWaterLevel"]
        )


    # --------------------------------------------------------
    # SOURCE WATER AVAILABILITY
    # --------------------------------------------------------

    if (
        system_data["sourceWaterLevel"]
        <= SOURCE_MIN_LEVEL
    ):

        system_data["sourceWaterLevel"] = \
            SOURCE_MIN_LEVEL

        system_data["sourceWater"] = False

        system_data["pump"] = False

    else:

        system_data["sourceWater"] = True


    # --------------------------------------------------------
    # AUTO MODE
    # --------------------------------------------------------

    if system_data["mode"] == "AUTO":

        if system_data["emergency"]:

            system_data["pump"] = False

        elif not system_data["sourceWater"]:

            system_data["pump"] = False

        elif (
            system_data["waterLevel"]
            <= AUTO_PUMP_ON_LEVEL
        ):

            system_data["pump"] = True

        elif (
            system_data["waterLevel"]
            >= AUTO_PUMP_OFF_LEVEL
        ):

            system_data["pump"] = False


    # --------------------------------------------------------
    # WATER CONSUMPTION
    # --------------------------------------------------------

    if (
        system_data["consumption"]
        and not system_data["pump"]
    ):

        system_data["waterLevel"] -= (
            CONSUMPTION_RATE * elapsed
        )


    # --------------------------------------------------------
    # PUMP FILLING
    # --------------------------------------------------------

    if system_data["pump"]:

        if (
            system_data["sourceWater"]
            and
            system_data["sourceWaterLevel"]
            > SOURCE_MIN_LEVEL
        ):

            amount = (
                PUMP_FILL_RATE * elapsed
            )


            system_data["waterLevel"] += amount

            system_data["sourceWaterLevel"] -= \
                amount


            system_data["sourceWaterLevel"] = max(
                SOURCE_MIN_LEVEL,
                system_data["sourceWaterLevel"]
            )


            # Main tank overflow protection

            if (
                system_data["waterLevel"]
                >= MAX_LEVEL
            ):

                system_data["waterLevel"] = \
                    MAX_LEVEL

                system_data["pump"] = False


            # Source tank empty

            if (
                system_data["sourceWaterLevel"]
                <= SOURCE_MIN_LEVEL
            ):

                system_data["sourceWaterLevel"] = \
                    SOURCE_MIN_LEVEL

                system_data["sourceWater"] = False

                system_data["pump"] = False


        else:

            system_data["sourceWater"] = False

            system_data["pump"] = False


    # --------------------------------------------------------
    # KEEP SOURCE LEVEL VALID
    # --------------------------------------------------------

    system_data["sourceWaterLevel"] = max(
        SOURCE_MIN_LEVEL,
        min(
            SOURCE_MAX_LEVEL,
            system_data["sourceWaterLevel"]
        )
    )


    # --------------------------------------------------------
    # UPDATE SOURCE STATUS
    # --------------------------------------------------------

    if (
        system_data["sourceWaterLevel"]
        > SOURCE_MIN_LEVEL
    ):

        system_data["sourceWater"] = True

    else:

        system_data["sourceWater"] = False

        system_data["pump"] = False


    # --------------------------------------------------------
    # KEEP MAIN TANK VALID
    # --------------------------------------------------------

    system_data["waterLevel"] = max(
        MIN_LEVEL,
        min(
            MAX_LEVEL,
            system_data["waterLevel"]
        )
    )


    # --------------------------------------------------------
    # PUMP RUNTIME
    # --------------------------------------------------------

    if system_data["pump"]:

        system_data["runtime"] += elapsed


    # --------------------------------------------------------
    # AUTO SAFETY CHECK
    # --------------------------------------------------------

    if system_data["mode"] == "AUTO":

        if system_data["emergency"]:

            system_data["pump"] = False

        elif not system_data["sourceWater"]:

            system_data["pump"] = False

        elif (
            system_data["waterLevel"]
            >= MAX_LEVEL
        ):

            system_data["waterLevel"] = \
                MAX_LEVEL

            system_data["pump"] = False

        elif (
            system_data["waterLevel"]
            <= AUTO_PUMP_ON_LEVEL
        ):

            system_data["pump"] = True

        elif (
            system_data["waterLevel"]
            >= AUTO_PUMP_OFF_LEVEL
        ):

            system_data["pump"] = False


    # --------------------------------------------------------
    # MANUAL MODE SAFETY
    # --------------------------------------------------------

    elif system_data["mode"] == "MANUAL":

        if system_data["emergency"]:

            system_data["pump"] = False

        elif not system_data["sourceWater"]:

            system_data["pump"] = False

        elif (
            system_data["waterLevel"]
            >= MAX_LEVEL
        ):

            system_data["waterLevel"] = \
                MAX_LEVEL

            system_data["pump"] = False


    # --------------------------------------------------------
    # UPDATE TANK CONDITION
    # --------------------------------------------------------

    update_tank_condition()


    # --------------------------------------------------------
    # UPDATE ALERT STATE
    # --------------------------------------------------------

    update_alert_state()


# ============================================================
# HOME PAGE
# ============================================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# ============================================================
# PWA MANIFEST
# ============================================================

@app.route("/manifest.json")
def manifest():

    return app.send_static_file(
        "manifest.json"
    )


# ============================================================
# PWA SERVICE WORKER
# ============================================================

@app.route("/service-worker.js")
def service_worker():

    response = app.send_static_file(
        "service-worker.js"
    )

    response.headers[
        "Content-Type"
    ] = "application/javascript"

    response.headers[
        "Service-Worker-Allowed"
    ] = "/"

    return response


# ============================================================
# SYSTEM STATUS
# ============================================================

@app.route("/api/status")
def get_status():

    update_simulation()

    return jsonify({

        "waterLevel":
            round(
                system_data["waterLevel"],
                2
            ),

        "pump":
            system_data["pump"],

        "mode":
            system_data["mode"],

        "runtime":
            int(
                system_data["runtime"]
            ),

        "tank":
            system_data["tank"],

        "consumption":
            system_data["consumption"],

        "sourceWater":
            system_data["sourceWater"],

        "sourceWaterLevel":
            round(
                system_data["sourceWaterLevel"],
                2
            ),

        "emergency":
            system_data["emergency"],

        "connected":
            system_data["connected"],

        "alert":
            alert_data,

        "alertHistory":
            alert_history[:],

        "settings":
            get_settings()

    })


# ============================================================
# SETTINGS
# ============================================================

@app.route("/api/settings")
def get_settings_api():

    update_simulation()

    return jsonify({

        "success": True,

        "settings":
            get_settings()

    })


# ============================================================
# UPDATE SETTINGS
# ============================================================

@app.route(
    "/api/settings",
    methods=["POST"]
)
def update_settings():

    global CONSUMPTION_RATE
    global PUMP_FILL_RATE
    global AUTO_PUMP_ON_LEVEL
    global AUTO_PUMP_OFF_LEVEL
    global SOURCE_REFILL_RATE
    global CRITICAL_LOW_LEVEL


    update_simulation()


    data = request.get_json(
        silent=True
    ) or {}


    # --------------------------------------------------------
    # READ VALUES
    # --------------------------------------------------------

    try:

        new_consumption_rate = float(
            data.get(
                "consumptionRate",
                CONSUMPTION_RATE
            )
        )

        new_pump_fill_rate = float(
            data.get(
                "pumpFillRate",
                PUMP_FILL_RATE
            )
        )

        new_auto_on = float(
            data.get(
                "autoPumpOnLevel",
                AUTO_PUMP_ON_LEVEL
            )
        )

        new_auto_off = float(
            data.get(
                "autoPumpOffLevel",
                AUTO_PUMP_OFF_LEVEL
            )
        )

        new_source_refill = float(
            data.get(
                "sourceRefillRate",
                SOURCE_REFILL_RATE
            )
        )

        new_critical_low = float(
            data.get(
                "criticalLowLevel",
                CRITICAL_LOW_LEVEL
            )
        )

    except (
        TypeError,
        ValueError
    ):

        return jsonify({

            "success": False,

            "message":
                "All settings must contain valid numbers."

        }), 400


    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if new_consumption_rate < 0:

        return jsonify({

            "success": False,

            "message":
                "Consumption rate cannot be negative."

        }), 400


    if new_pump_fill_rate < 0:

        return jsonify({

            "success": False,

            "message":
                "Pump fill rate cannot be negative."

        }), 400


    if new_source_refill < 0:

        return jsonify({

            "success": False,

            "message":
                "Source refill rate cannot be negative."

        }), 400


    if not (
        0 <= new_auto_on <= 100
    ):

        return jsonify({

            "success": False,

            "message":
                "Pump ON level must be between 0% and 100%."

        }), 400


    if not (
        0 <= new_auto_off <= 100
    ):

        return jsonify({

            "success": False,

            "message":
                "Pump OFF level must be between 0% and 100%."

        }), 400


    if new_auto_on >= new_auto_off:

        return jsonify({

            "success": False,

            "message":
                "Pump ON level must be lower than Pump OFF level."

        }), 400


    if not (
        0 <= new_critical_low <= 100
    ):

        return jsonify({

            "success": False,

            "message":
                "Critical low level must be between 0% and 100%."

        }), 400


    # --------------------------------------------------------
    # APPLY SETTINGS
    # --------------------------------------------------------

    CONSUMPTION_RATE = new_consumption_rate

    PUMP_FILL_RATE = new_pump_fill_rate

    AUTO_PUMP_ON_LEVEL = new_auto_on

    AUTO_PUMP_OFF_LEVEL = new_auto_off

    SOURCE_REFILL_RATE = new_source_refill

    CRITICAL_LOW_LEVEL = new_critical_low


    # --------------------------------------------------------
    # RE-EVALUATE SYSTEM
    # --------------------------------------------------------

    update_tank_condition()

    update_alert_state()


    return jsonify({

        "success": True,

        "message":
            "System settings updated successfully.",

        "settings":
            get_settings()

    })


# ============================================================
# MODE CONTROL
# ============================================================

@app.route(
    "/api/mode",
    methods=["POST"]
)
def change_mode():

    update_simulation()


    data = request.get_json(
        silent=True
    ) or {}


    requested_mode = data.get(
        "mode"
    )


    if requested_mode not in [
        "AUTO",
        "MANUAL"
    ]:

        return jsonify({

            "success": False,

            "message":
                "Invalid operating mode."

        }), 400


    system_data["mode"] = requested_mode


    # --------------------------------------------------------
    # AUTO MODE
    # --------------------------------------------------------

    if requested_mode == "AUTO":

        if system_data["emergency"]:

            system_data["pump"] = False

        elif not system_data["sourceWater"]:

            system_data["pump"] = False

        elif (
            system_data["waterLevel"]
            >= MAX_LEVEL
        ):

            system_data["waterLevel"] = \
                MAX_LEVEL

            system_data["pump"] = False

        elif (
            system_data["waterLevel"]
            <= AUTO_PUMP_ON_LEVEL
        ):

            system_data["pump"] = True

        elif (
            system_data["waterLevel"]
            >= AUTO_PUMP_OFF_LEVEL
        ):

            system_data["pump"] = False


    update_alert_state()


    return jsonify({

        "success": True,

        "message":
            f"Operating mode changed to {requested_mode}.",

        "mode":
            requested_mode

    })


# ============================================================
# PUMP CONTROL
# ============================================================

@app.route(
    "/api/pump",
    methods=["POST"]
)
def pump_control():

    update_simulation()


    data = request.get_json(
        silent=True
    ) or {}


    command = data.get(
        "command"
    )


    # --------------------------------------------------------
    # ONLY MANUAL MODE
    # --------------------------------------------------------

    if system_data["mode"] != "MANUAL":

        return jsonify({

            "success": False,

            "message":
                "Switch to MANUAL mode to control the pump."

        })


    # --------------------------------------------------------
    # EMERGENCY
    # --------------------------------------------------------

    if system_data["emergency"]:

        system_data["pump"] = False

        update_alert_state()

        return jsonify({

            "success": False,

            "message":
                "Emergency shutdown is active."

        })


    # --------------------------------------------------------
    # SOURCE WATER
    # --------------------------------------------------------

    if not system_data["sourceWater"]:

        system_data["pump"] = False

        update_alert_state()

        return jsonify({

            "success": False,

            "message":
                "Source water is unavailable."

        })


    # --------------------------------------------------------
    # PUMP ON
    # --------------------------------------------------------

    if command == "ON":

        if (
            system_data["waterLevel"]
            >= MAX_LEVEL
        ):

            return jsonify({

                "success": False,

                "message":
                    "Tank is already full."

            })


        system_data["pump"] = True


        update_alert_state()


        return jsonify({

            "success": True,

            "message":
                "Pump turned ON."

        })


    # --------------------------------------------------------
    # PUMP OFF
    # --------------------------------------------------------

    elif command == "OFF":

        system_data["pump"] = False

        update_alert_state()


        return jsonify({

            "success": True,

            "message":
                "Pump turned OFF."

        })


    # --------------------------------------------------------
    # INVALID
    # --------------------------------------------------------

    return jsonify({

        "success": False,

        "message":
            "Invalid pump command."

    }), 400


# ============================================================
# WATER CONSUMPTION CONTROL
# ============================================================

@app.route(
    "/api/consumption",
    methods=["POST"]
)
def consumption_control():

    update_simulation()


    data = request.get_json(
        silent=True
    ) or {}


    command = data.get(
        "command"
    )


    if command == "ON":

        system_data["consumption"] = True


        return jsonify({

            "success": True,

            "message":
                "Water consumption turned ON.",

            "consumption":
                True

        })


    elif command == "OFF":

        system_data["consumption"] = False


        return jsonify({

            "success": True,

            "message":
                "Water consumption turned OFF.",

            "consumption":
                False

        })


    return jsonify({

        "success": False,

        "message":
            "Invalid consumption command."

    }), 400


# ============================================================
# SOURCE WATER CONTROL
# ============================================================

@app.route(
    "/api/source-water",
    methods=["POST"]
)
def source_water_control():

    update_simulation()


    data = request.get_json(
        silent=True
    ) or {}


    available = data.get(
        "available"
    )


    if not isinstance(
        available,
        bool
    ):

        return jsonify({

            "success": False,

            "message":
                "Invalid source-water state."

        }), 400


    # --------------------------------------------------------
    # SOURCE WATER AVAILABLE
    # --------------------------------------------------------

    if available:

        if (
            system_data["sourceWaterLevel"]
            <= SOURCE_MIN_LEVEL
        ):

            system_data["sourceWaterLevel"] = \
                SOURCE_START_LEVEL


        system_data["sourceWater"] = True


    # --------------------------------------------------------
    # SOURCE WATER UNAVAILABLE
    # --------------------------------------------------------

    else:

        system_data["sourceWaterLevel"] = \
            SOURCE_MIN_LEVEL

        system_data["sourceWater"] = False

        system_data["pump"] = False


    update_alert_state()


    return jsonify({

        "success": True,

        "message":
            (
                "Source water restored."
                if available
                else
                "Source water marked unavailable."
            ),

        "sourceWater":
            system_data["sourceWater"],

        "sourceWaterLevel":
            round(
                system_data["sourceWaterLevel"],
                2
            )

    })


# ============================================================
# EMERGENCY CONTROL
# ============================================================

@app.route(
    "/api/emergency",
    methods=["POST"]
)
def emergency_control():

    update_simulation()


    data = request.get_json(
        silent=True
    ) or {}


    command = data.get(
        "command"
    )


    # --------------------------------------------------------
    # ACTIVATE
    # --------------------------------------------------------

    if command == "ON":

        system_data["emergency"] = True

        system_data["pump"] = False


        update_alert_state()


        return jsonify({

            "success": True,

            "message":
                "Emergency shutdown activated.",

            "emergency":
                True

        })


    # --------------------------------------------------------
    # DEACTIVATE
    # --------------------------------------------------------

    elif command == "OFF":

        system_data["emergency"] = False


        # Do NOT automatically start pump here.
        # AUTO mode will decide on the next update.

        update_alert_state()


        return jsonify({

            "success": True,

            "message":
                "Emergency shutdown cleared.",

            "emergency":
                False

        })


    return jsonify({

        "success": False,

        "message":
            "Invalid emergency command."

    }), 400


# ============================================================
# CLEAR ALERT HISTORY
# ============================================================

@app.route(
    "/api/alerts/clear",
    methods=["POST"]
)
def clear_alert_history():

    alert_history.clear()


    return jsonify({

        "success": True,

        "message":
            "Alert history cleared."

    })


# ============================================================
# RUN FLASK
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000
    )
