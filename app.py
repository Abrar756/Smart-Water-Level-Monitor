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

# Source tank simulation
SOURCE_START_LEVEL = 100.0
SOURCE_MIN_LEVEL = 0.0
SOURCE_MAX_LEVEL = 100.0

# Source tank automatically refills at 1% per second
SOURCE_REFILL_RATE = 1.00


# ============================================================
# SYSTEM DATA
# ============================================================

system_data = {

    "waterLevel": 75.00,

    "pump": False,

    "mode": "AUTO",

    "runtime": 1250,

    "tank": "NORMAL",

    # Water consumption control
    "consumption": True,

    # Source tank
    "sourceWater": True,
    "sourceWaterLevel": SOURCE_START_LEVEL,

    # Emergency system
    "emergency": False,

    # Connection status
    "connected": True
}


# ============================================================
# TIME TRACKING
# ============================================================

last_update_time = time.time()


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
    #
    # The source tank automatically refills at
    # SOURCE_REFILL_RATE percent per second.
    #
    # When the source tank reaches 100%, it becomes
    # available again.
    # --------------------------------------------------------

    if system_data["sourceWaterLevel"] < SOURCE_MAX_LEVEL:

        refill_amount = (
            SOURCE_REFILL_RATE * elapsed
        )

        system_data["sourceWaterLevel"] += refill_amount


        # Prevent source level from going above 100%
        system_data["sourceWaterLevel"] = min(
            SOURCE_MAX_LEVEL,
            system_data["sourceWaterLevel"]
        )


    # --------------------------------------------------------
    # SOURCE WATER AVAILABILITY
    #
    # Source water is unavailable only when the source
    # tank is completely empty.
    # --------------------------------------------------------

    if system_data["sourceWaterLevel"] <= SOURCE_MIN_LEVEL:

        system_data["sourceWaterLevel"] = SOURCE_MIN_LEVEL

        system_data["sourceWater"] = False

        # Pump cannot operate without source water
        system_data["pump"] = False

    else:

        system_data["sourceWater"] = True


    # --------------------------------------------------------
    # AUTO MODE DECISION
    # --------------------------------------------------------

    if system_data["mode"] == "AUTO":

        if system_data["emergency"]:

            system_data["pump"] = False

        elif not system_data["sourceWater"]:

            system_data["pump"] = False

        elif system_data["waterLevel"] <= AUTO_PUMP_ON_LEVEL:

            system_data["pump"] = True

        elif system_data["waterLevel"] >= AUTO_PUMP_OFF_LEVEL:

            system_data["pump"] = False


    # --------------------------------------------------------
    # WATER CONSUMPTION
    #
    # Water is consumed only when:
    # 1. Consumption is ON
    # 2. Pump is OFF
    #
    # If consumption is OFF, water level stays unchanged.
    # --------------------------------------------------------

    if system_data["consumption"] and not system_data["pump"]:

        system_data["waterLevel"] -= (
            CONSUMPTION_RATE * elapsed
        )


    # --------------------------------------------------------
    # PUMP FILLING + SOURCE TANK CONSUMPTION
    # --------------------------------------------------------

    if system_data["pump"]:

        if (
            system_data["sourceWater"]
            and system_data["sourceWaterLevel"] > SOURCE_MIN_LEVEL
        ):

            amount = PUMP_FILL_RATE * elapsed

            # Main tank receives water
            system_data["waterLevel"] += amount

            # Source tank supplies the water
            system_data["sourceWaterLevel"] -= amount

            # Prevent negative source level
            system_data["sourceWaterLevel"] = max(
                SOURCE_MIN_LEVEL,
                system_data["sourceWaterLevel"]
            )

            # ------------------------------------------------
            # MAIN TANK OVERFLOW PROTECTION
            #
            # The pump must automatically turn OFF when the
            # main tank reaches 100%, regardless of whether
            # the system is in AUTO or MANUAL mode.
            # ------------------------------------------------

            if system_data["waterLevel"] >= MAX_LEVEL:

                system_data["waterLevel"] = MAX_LEVEL

                system_data["pump"] = False

            # Source tank becomes unavailable at 0%
            if system_data["sourceWaterLevel"] <= SOURCE_MIN_LEVEL:

                system_data["sourceWaterLevel"] = SOURCE_MIN_LEVEL

                system_data["sourceWater"] = False

                system_data["pump"] = False

        else:

            system_data["sourceWater"] = False

            system_data["pump"] = False


    # --------------------------------------------------------
    # KEEP SOURCE TANK BETWEEN 0 AND 100
    # --------------------------------------------------------

    system_data["sourceWaterLevel"] = max(
        SOURCE_MIN_LEVEL,
        min(
            SOURCE_MAX_LEVEL,
            system_data["sourceWaterLevel"]
        )
    )


    # --------------------------------------------------------
    # UPDATE SOURCE WATER AVAILABILITY AFTER REFILL
    # --------------------------------------------------------

    if system_data["sourceWaterLevel"] > SOURCE_MIN_LEVEL:

        system_data["sourceWater"] = True

    else:

        system_data["sourceWater"] = False

        system_data["pump"] = False


    # --------------------------------------------------------
    # KEEP MAIN TANK BETWEEN 0 AND 100
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
    # AUTO SAFETY CHECK AFTER LEVEL UPDATE
    # --------------------------------------------------------

    if system_data["mode"] == "AUTO":

        if system_data["emergency"]:

            system_data["pump"] = False

        elif not system_data["sourceWater"]:

            system_data["pump"] = False

        elif system_data["waterLevel"] >= MAX_LEVEL:

            # Overflow protection also applies in AUTO mode
            system_data["waterLevel"] = MAX_LEVEL

            system_data["pump"] = False

        elif system_data["waterLevel"] <= AUTO_PUMP_ON_LEVEL:

            system_data["pump"] = True

        elif system_data["waterLevel"] >= AUTO_PUMP_OFF_LEVEL:

            system_data["pump"] = False


    # --------------------------------------------------------
    # MANUAL MODE SAFETY
    #
    # Manual mode does not automatically start/stop the pump
    # based on the main tank level.
    #
    # However, the pump MUST automatically turn OFF when
    # the main tank reaches 100% to prevent overflow.
    # --------------------------------------------------------

    elif system_data["mode"] == "MANUAL":

        if system_data["emergency"]:

            system_data["pump"] = False

        elif not system_data["sourceWater"]:

            system_data["pump"] = False

        elif system_data["waterLevel"] >= MAX_LEVEL:

            # Overflow protection in MANUAL mode
            system_data["waterLevel"] = MAX_LEVEL

            system_data["pump"] = False


    # --------------------------------------------------------
    # TANK CONDITION
    # --------------------------------------------------------

    if system_data["waterLevel"] <= 30:

        system_data["tank"] = "LOW"

    elif system_data["waterLevel"] >= 90:

        system_data["tank"] = "FULL"

    else:

        system_data["tank"] = "NORMAL"


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

        # Water consumption status
        "consumption": system_data["consumption"],

        # Source tank status
        "sourceWater": system_data["sourceWater"],

        "sourceWaterLevel": round(
            system_data["sourceWaterLevel"],
            2
        ),

        # Emergency status
        "emergency": system_data["emergency"],

        # Connection status
        "connected": system_data["connected"]

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


    # --------------------------------------------------------
    # VALIDATE MODE
    # --------------------------------------------------------

    if requested_mode not in [
        "AUTO",
        "MANUAL"
    ]:

        return jsonify({

            "success": False,

            "message":
                "Invalid operating mode."

        }), 400


    # --------------------------------------------------------
    # CHANGE MODE
    # --------------------------------------------------------

    system_data["mode"] = requested_mode


    # --------------------------------------------------------
    # WHEN SWITCHING TO AUTO
    # LET AUTO LOGIC DECIDE WHAT TO DO
    # --------------------------------------------------------

    if requested_mode == "AUTO":

        if system_data["emergency"]:

            system_data["pump"] = False

        elif not system_data["sourceWater"]:

            system_data["pump"] = False

        elif system_data["waterLevel"] >= MAX_LEVEL:

            # Overflow protection
            system_data["waterLevel"] = MAX_LEVEL

            system_data["pump"] = False

        elif system_data["waterLevel"] <= AUTO_PUMP_ON_LEVEL:

            system_data["pump"] = True

        elif system_data["waterLevel"] >= AUTO_PUMP_OFF_LEVEL:

            system_data["pump"] = False


    # --------------------------------------------------------
    # WHEN SWITCHING TO MANUAL
    #
    # Keep the current pump state.
    # The ON/OFF buttons can control it afterward.
    #
    # Overflow protection is still handled by
    # update_simulation() when the tank reaches 100%.
    # --------------------------------------------------------

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
    # ONLY MANUAL MODE CAN DIRECTLY CONTROL THE PUMP
    # --------------------------------------------------------

    if system_data["mode"] != "MANUAL":

        return jsonify({

            "success": False,

            "message":
                "Switch to MANUAL mode to control the pump."

        })


    # --------------------------------------------------------
    # EMERGENCY PROTECTION
    # --------------------------------------------------------

    if system_data["emergency"]:

        system_data["pump"] = False

        return jsonify({

            "success": False,

            "message":
                "Emergency shutdown is active."

        })


    # --------------------------------------------------------
    # SOURCE WATER PROTECTION
    # --------------------------------------------------------

    if not system_data["sourceWater"]:

        system_data["pump"] = False

        return jsonify({

            "success": False,

            "message":
                "Source water is unavailable."

        })


    # --------------------------------------------------------
    # TURN PUMP ON
    # --------------------------------------------------------

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


    # --------------------------------------------------------
    # TURN PUMP OFF
    # --------------------------------------------------------

    elif command == "OFF":

        system_data["pump"] = False


        return jsonify({

            "success": True,

            "message":
                "Pump turned OFF."

        })


    # --------------------------------------------------------
    # INVALID COMMAND
    # --------------------------------------------------------

    else:

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


    # --------------------------------------------------------
    # TURN CONSUMPTION ON
    # --------------------------------------------------------

    if command == "ON":

        system_data["consumption"] = True

        return jsonify({

            "success": True,

            "message":
                "Water consumption turned ON.",

            "consumption":
                True

        })


    # --------------------------------------------------------
    # TURN CONSUMPTION OFF
    # --------------------------------------------------------

    elif command == "OFF":

        system_data["consumption"] = False

        return jsonify({

            "success": True,

            "message":
                "Water consumption turned OFF.",

            "consumption":
                False

        })


    # --------------------------------------------------------
    # INVALID COMMAND
    # --------------------------------------------------------

    else:

        return jsonify({

            "success": False,

            "message":
                "Invalid consumption command."

        }), 400


# ============================================================
# RUN FLASK
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000
    )
