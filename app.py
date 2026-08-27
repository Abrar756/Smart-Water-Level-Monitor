from flask import Flask, render_template, jsonify, request
import time

app = Flask(__name__)


# ============================================================
# DEFAULT SYSTEM SETTINGS
# ============================================================

DEFAULT_SETTINGS = {
    "consumptionRate": 2.00,
    "pumpFillRate": 2.00,

    "autoPumpOnLevel": 30.0,
    "autoPumpOffLevel": 90.0,

    "sourceRefillRate": 1.00
}


# ============================================================
# ACTIVE SYSTEM SETTINGS
# ============================================================

settings = DEFAULT_SETTINGS.copy()


# ============================================================
# FIXED SYSTEM LIMITS
# ============================================================

MIN_LEVEL = 0.0
MAX_LEVEL = 100.0

SOURCE_MIN_LEVEL = 0.0
SOURCE_MAX_LEVEL = 100.0


# ============================================================
# SYSTEM DATA
# ============================================================

system_data = {

    "waterLevel": 75.00,

    "pump": False,

    "mode": "AUTO",

    "runtime": 1250,

    "tank": "NORMAL",

    "consumption": True,

    "sourceWater": True,

    "sourceWaterLevel": 100.0,

    "emergency": False,

    "connected": True
}


# ============================================================
# TIME TRACKING
# ============================================================

last_update_time = time.time()


# ============================================================
# HELPER
# ============================================================

def get_settings():

    return {
        "consumptionRate": settings["consumptionRate"],
        "pumpFillRate": settings["pumpFillRate"],
        "autoPumpOnLevel": settings["autoPumpOnLevel"],
        "autoPumpOffLevel": settings["autoPumpOffLevel"],
        "sourceRefillRate": settings["sourceRefillRate"]
    }


# ============================================================
# UPDATE TANK CONDITION
# ============================================================

def update_tank_condition():

    if system_data["waterLevel"] <= settings["autoPumpOnLevel"]:

        system_data["tank"] = "LOW"

    elif system_data["waterLevel"] >= settings["autoPumpOffLevel"]:

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


    # ========================================================
    # SOURCE WATER AUTOMATIC REFILL
    # ========================================================

    if system_data["sourceWaterLevel"] < SOURCE_MAX_LEVEL:

        refill_amount = (
            settings["sourceRefillRate"] * elapsed
        )

        system_data["sourceWaterLevel"] += refill_amount

        system_data["sourceWaterLevel"] = min(
            SOURCE_MAX_LEVEL,
            system_data["sourceWaterLevel"]
        )


    # ========================================================
    # SOURCE WATER AVAILABILITY
    # ========================================================

    if system_data["sourceWaterLevel"] <= SOURCE_MIN_LEVEL:

        system_data["sourceWaterLevel"] = SOURCE_MIN_LEVEL

        system_data["sourceWater"] = False

        system_data["pump"] = False

    else:

        system_data["sourceWater"] = True


    # ========================================================
    # AUTO MODE
    # ========================================================

    if system_data["mode"] == "AUTO":

        if system_data["emergency"]:

            system_data["pump"] = False

        elif not system_data["sourceWater"]:

            system_data["pump"] = False

        elif system_data["waterLevel"] <= settings["autoPumpOnLevel"]:

            system_data["pump"] = True

        elif system_data["waterLevel"] >= settings["autoPumpOffLevel"]:

            system_data["pump"] = False


    # ========================================================
    # WATER CONSUMPTION
    # ========================================================

    if (
        system_data["consumption"]
        and not system_data["pump"]
    ):

        system_data["waterLevel"] -= (
            settings["consumptionRate"] * elapsed
        )


    # ========================================================
    # PUMP FILLING
    # ========================================================

    if system_data["pump"]:

        if (
            system_data["sourceWater"]
            and system_data["sourceWaterLevel"] > SOURCE_MIN_LEVEL
        ):

            amount = settings["pumpFillRate"] * elapsed

            system_data["waterLevel"] += amount

            system_data["sourceWaterLevel"] -= amount

            system_data["sourceWaterLevel"] = max(
                SOURCE_MIN_LEVEL,
                system_data["sourceWaterLevel"]
            )


            # ------------------------------------------------
            # MAIN TANK OVERFLOW PROTECTION
            # ------------------------------------------------

            if system_data["waterLevel"] >= MAX_LEVEL:

                system_data["waterLevel"] = MAX_LEVEL

                system_data["pump"] = False


            # ------------------------------------------------
            # SOURCE WATER EMPTY
            # ------------------------------------------------

            if system_data["sourceWaterLevel"] <= SOURCE_MIN_LEVEL:

                system_data["sourceWaterLevel"] = SOURCE_MIN_LEVEL

                system_data["sourceWater"] = False

                system_data["pump"] = False

        else:

            system_data["sourceWater"] = False

            system_data["pump"] = False


    # ========================================================
    # KEEP SOURCE LEVEL VALID
    # ========================================================

    system_data["sourceWaterLevel"] = max(
        SOURCE_MIN_LEVEL,
        min(
            SOURCE_MAX_LEVEL,
            system_data["sourceWaterLevel"]
        )
    )


    # ========================================================
    # UPDATE SOURCE AVAILABILITY
    # ========================================================

    if system_data["sourceWaterLevel"] > SOURCE_MIN_LEVEL:

        system_data["sourceWater"] = True

    else:

        system_data["sourceWater"] = False

        system_data["pump"] = False


    # ========================================================
    # KEEP MAIN TANK VALID
    # ========================================================

    system_data["waterLevel"] = max(
        MIN_LEVEL,
        min(
            MAX_LEVEL,
            system_data["waterLevel"]
        )
    )


    # ========================================================
    # PUMP RUNTIME
    # ========================================================

    if system_data["pump"]:

        system_data["runtime"] += elapsed


    # ========================================================
    # AUTO SAFETY CHECK
    # ========================================================

    if system_data["mode"] == "AUTO":

        if system_data["emergency"]:

            system_data["pump"] = False

        elif not system_data["sourceWater"]:

            system_data["pump"] = False

        elif system_data["waterLevel"] >= MAX_LEVEL:

            system_data["waterLevel"] = MAX_LEVEL

            system_data["pump"] = False

        elif system_data["waterLevel"] <= settings["autoPumpOnLevel"]:

            system_data["pump"] = True

        elif system_data["waterLevel"] >= settings["autoPumpOffLevel"]:

            system_data["pump"] = False


    # ========================================================
    # MANUAL MODE SAFETY
    # ========================================================

    elif system_data["mode"] == "MANUAL":

        if system_data["emergency"]:

            system_data["pump"] = False

        elif not system_data["sourceWater"]:

            system_data["pump"] = False

        elif system_data["waterLevel"] >= MAX_LEVEL:

            system_data["waterLevel"] = MAX_LEVEL

            system_data["pump"] = False


    # ========================================================
    # TANK CONDITION
    # ========================================================

    update_tank_condition()


# ============================================================
# HOME PAGE
# ============================================================

@app.route("/")
def home():

    return render_template("index.html")


# ============================================================
# PWA MANIFEST
# ============================================================

@app.route("/manifest.json")
def manifest():

    return app.send_static_file("manifest.json")


# ============================================================
# SERVICE WORKER
# ============================================================

@app.route("/service-worker.js")
def service_worker():

    response = app.send_static_file(
        "service-worker.js"
    )

    response.headers["Content-Type"] = (
        "application/javascript"
    )

    response.headers["Service-Worker-Allowed"] = "/"

    return response


# ============================================================
# SYSTEM STATUS
# ============================================================

@app.route("/api/status")
def get_status():

    update_simulation()

    return jsonify({

        "waterLevel": round(
            system_data["waterLevel"],
            2
        ),

        "pump": system_data["pump"],

        "mode": system_data["mode"],

        "runtime": int(
            system_data["runtime"]
        ),

        "tank": system_data["tank"],

        "consumption": system_data["consumption"],

        "sourceWater": system_data["sourceWater"],

        "sourceWaterLevel": round(
            system_data["sourceWaterLevel"],
            2
        ),

        "emergency": system_data["emergency"],

        "connected": system_data["connected"],

        "settings": get_settings()

    })


# ============================================================
# SETTINGS GET
# ============================================================

@app.route("/api/settings")
def get_system_settings():

    update_simulation()

    return jsonify({

        "success": True,

        "settings": get_settings()

    })


# ============================================================
# SETTINGS UPDATE
# ============================================================

@app.route(
    "/api/settings",
    methods=["POST"]
)
def update_system_settings():

    update_simulation()

    data = request.get_json(
        silent=True
    ) or {}


    try:

        new_consumption_rate = float(
            data.get(
                "consumptionRate",
                settings["consumptionRate"]
            )
        )

        new_pump_fill_rate = float(
            data.get(
                "pumpFillRate",
                settings["pumpFillRate"]
            )
        )

        new_auto_on = float(
            data.get(
                "autoPumpOnLevel",
                settings["autoPumpOnLevel"]
            )
        )

        new_auto_off = float(
            data.get(
                "autoPumpOffLevel",
                settings["autoPumpOffLevel"]
            )
        )

        new_source_refill = float(
            data.get(
                "sourceRefillRate",
                settings["sourceRefillRate"]
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


    # ========================================================
    # VALIDATION
    # ========================================================

    if not (
        0 <= new_consumption_rate <= 100
    ):

        return jsonify({

            "success": False,

            "message":
                "Consumption rate must be between 0 and 100."

        }), 400


    if not (
        0 <= new_pump_fill_rate <= 100
    ):

        return jsonify({

            "success": False,

            "message":
                "Pump fill rate must be between 0 and 100."

        }), 400


    if not (
        0 <= new_source_refill <= 100
    ):

        return jsonify({

            "success": False,

            "message":
                "Source refill rate must be between 0 and 100."

        }), 400


    if not (
        0 <= new_auto_on <= 100
    ):

        return jsonify({

            "success": False,

            "message":
                "Pump ON level must be between 0 and 100%."

        }), 400


    if not (
        0 <= new_auto_off <= 100
    ):

        return jsonify({

            "success": False,

            "message":
                "Pump OFF level must be between 0 and 100%."

        }), 400


    if new_auto_on >= new_auto_off:

        return jsonify({

            "success": False,

            "message":
                "Pump ON level must be lower than Pump OFF level."

        }), 400


    # ========================================================
    # SAVE SETTINGS
    # ========================================================

    settings["consumptionRate"] = round(
        new_consumption_rate,
        2
    )

    settings["pumpFillRate"] = round(
        new_pump_fill_rate,
        2
    )

    settings["autoPumpOnLevel"] = round(
        new_auto_on,
        2
    )

    settings["autoPumpOffLevel"] = round(
        new_auto_off,
        2
    )

    settings["sourceRefillRate"] = round(
        new_source_refill,
        2
    )


    # ========================================================
    # RE-EVALUATE AUTO MODE
    # ========================================================

    if system_data["mode"] == "AUTO":

        if system_data["emergency"]:

            system_data["pump"] = False

        elif not system_data["sourceWater"]:

            system_data["pump"] = False

        elif system_data["waterLevel"] <= settings["autoPumpOnLevel"]:

            system_data["pump"] = True

        elif system_data["waterLevel"] >= settings["autoPumpOffLevel"]:

            system_data["pump"] = False


    update_tank_condition()


    return jsonify({

        "success": True,

        "message":
            "System settings updated successfully.",

        "settings":
            get_settings()

    })


# ============================================================
# RESET SETTINGS
# ============================================================

@app.route(
    "/api/settings/reset",
    methods=["POST"]
)
def reset_settings():

    global settings

    update_simulation()

    settings = DEFAULT_SETTINGS.copy()

    update_tank_condition()


    return jsonify({

        "success": True,

        "message":
            "Settings restored to default values.",

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


    if requested_mode == "AUTO":

        if system_data["emergency"]:

            system_data["pump"] = False

        elif not system_data["sourceWater"]:

            system_data["pump"] = False

        elif system_data["waterLevel"] >= MAX_LEVEL:

            system_data["waterLevel"] = MAX_LEVEL

            system_data["pump"] = False

        elif system_data["waterLevel"] <= settings["autoPumpOnLevel"]:

            system_data["pump"] = True

        elif system_data["waterLevel"] >= settings["autoPumpOffLevel"]:

            system_data["pump"] = False


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


    if system_data["mode"] != "MANUAL":

        return jsonify({

            "success": False,

            "message":
                "Switch to MANUAL mode to control the pump."

        })


    if system_data["emergency"]:

        system_data["pump"] = False

        return jsonify({

            "success": False,

            "message":
                "Emergency shutdown is active."

        })


    if not system_data["sourceWater"]:

        system_data["pump"] = False

        return jsonify({

            "success": False,

            "message":
                "Source water is unavailable."

        })


    if command == "ON":

        if system_data["waterLevel"] >= MAX_LEVEL:

            return jsonify({

                "success": False,

                "message":
                    "Tank is already full."

            })


        system_data["pump"] = True

        return jsonify({

            "success": True,

            "message":
                "Pump turned ON."

        })


    elif command == "OFF":

        system_data["pump"] = False

        return jsonify({

            "success": True,

            "message":
                "Pump turned OFF."

        })


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
# EMERGENCY STOP
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


    if command == "STOP":

        system_data["emergency"] = True

        system_data["pump"] = False

        return jsonify({

            "success": True,

            "message":
                "Emergency shutdown activated."

        })


    elif command == "RESET":

        system_data["emergency"] = False

        return jsonify({

            "success": True,

            "message":
                "Emergency shutdown reset."

        })


    return jsonify({

        "success": False,

        "message":
            "Invalid emergency command."

    }), 400


# ============================================================
# RUN FLASK
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )
