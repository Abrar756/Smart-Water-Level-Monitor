// ============================================================
// GRAPH DATA
// ============================================================

const graphData = [];

const MAX_GRAPH_POINTS = 60;


// ============================================================
// DASHBOARD UPDATE
// ============================================================

async function updateDashboard() {

    try {

        const response =
            await fetch("/api/status");


        if (!response.ok) {

            throw new Error(
                "Server response error"
            );

        }


        const data =
            await response.json();


        // ----------------------------------------------------
        // WATER LEVEL
        // ----------------------------------------------------

        const waterLevel =
            Number(data.waterLevel);


        document.getElementById(
            "waterLevel"
        ).textContent =
            waterLevel.toFixed(2) + "%";


        document.getElementById(
            "waterFill"
        ).style.height =
            waterLevel + "%";


        document.getElementById(
            "waterFillText"
        ).textContent =
            waterLevel.toFixed(2) + "%";


        // ----------------------------------------------------
        // GRAPH
        // ----------------------------------------------------

        graphData.push(
            waterLevel
        );


        if (
            graphData.length >
            MAX_GRAPH_POINTS
        ) {

            graphData.shift();

        }


        drawWaterGraph();


        // ----------------------------------------------------
        // TANK CONDITION
        // ----------------------------------------------------

        document.getElementById(
            "tankCondition"
        ).textContent =
            data.tank;


        updateTankBadge(
            data.tank
        );


        // ----------------------------------------------------
        // PUMP
        // ----------------------------------------------------

        updatePumpDisplay(
            data.pump
        );


        // ----------------------------------------------------
        // MODE
        // ----------------------------------------------------

        updateModeDisplay(
            data.mode
        );


        // ----------------------------------------------------
        // RUNTIME
        // ----------------------------------------------------

        document.getElementById(
            "runtime"
        ).textContent =
            formatRuntime(
                data.runtime
            );


        // ----------------------------------------------------
        // SOURCE WATER
        // ----------------------------------------------------

        updateSourceWater(
            data.sourceWater,
            data.sourceWaterLevel
        );


        // ----------------------------------------------------
        // WATER CONSUMPTION
        // ----------------------------------------------------

        updateConsumption(
            data.consumption
        );


        // ----------------------------------------------------
        // CONNECTION
        // ----------------------------------------------------

        updateConnection(
            data.connected
        );


        // ----------------------------------------------------
        // ALERTS
        // ----------------------------------------------------

        updateAlerts(
            data
        );


        // ----------------------------------------------------
        // PUMP BUTTONS
        // ----------------------------------------------------

        updatePumpButtons(
            data.mode
        );


        // ----------------------------------------------------
        // SYSTEM HEALTH
        // ----------------------------------------------------

        updateSystemHealth(
            data
        );

    }

    catch (error) {

        console.error(
            "Dashboard error:",
            error
        );


        updateConnection(
            false
        );

    }

}


// ============================================================
// WATER GRAPH
// ============================================================

function drawWaterGraph() {

    const canvas =
        document.getElementById(
            "waterLevelChart"
        );


    if (!canvas) {
        return;
    }


    const area =
        canvas.parentElement;


    const width =
        area.clientWidth;


    const height =
        area.clientHeight;


    const dpr =
        window.devicePixelRatio || 1;


    canvas.width =
        width * dpr;


    canvas.height =
        height * dpr;


    const ctx =
        canvas.getContext(
            "2d"
        );


    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    const left =
        40;


    const right =
        15;


    const top =
        15;


    const bottom =
        25;


    const graphWidth =
        width - left - right;


    const graphHeight =
        height - top - bottom;


    // --------------------------------------------------------
    // GRID
    // --------------------------------------------------------

    const levels = [
        100,
        75,
        50,
        25,
        0
    ];


    ctx.font =
        "9px Segoe UI";


    ctx.textAlign =
        "right";


    levels.forEach(
        level => {

            const y =
                top +
                graphHeight -
                (
                    level / 100
                ) *
                graphHeight;


            ctx.beginPath();


            ctx.moveTo(
                left,
                y
            );


            ctx.lineTo(
                width - right,
                y
            );


            ctx.strokeStyle =
                "#e7eef3";


            ctx.lineWidth =
                1;


            ctx.stroke();


            ctx.fillStyle =
                "#9aa8b3";


            ctx.fillText(
                level + "%",
                left - 7,
                y + 3
            );

        }
    );


    if (
        graphData.length < 2
    ) {

        return;

    }


    // --------------------------------------------------------
    // POINTS
    // --------------------------------------------------------

    const points = [];


    graphData.forEach(
        (value, index) => {

            const x =
                left +
                (
                    index /
                    (
                        MAX_GRAPH_POINTS - 1
                    )
                ) *
                graphWidth;


            const y =
                top +
                graphHeight -
                (
                    value / 100
                ) *
                graphHeight;


            points.push({
                x,
                y
            });

        }
    );


    // --------------------------------------------------------
    // FILL AREA
    // --------------------------------------------------------

    const gradient =
        ctx.createLinearGradient(
            0,
            top,
            0,
            height
        );


    gradient.addColorStop(
        0,
        "rgba(20, 142, 216, 0.20)"
    );


    gradient.addColorStop(
        1,
        "rgba(20, 142, 216, 0.01)"
    );


    ctx.beginPath();


    ctx.moveTo(
        points[0].x,
        height - bottom
    );


    points.forEach(
        point => {

            ctx.lineTo(
                point.x,
                point.y
            );

        }
    );


    ctx.lineTo(
        points[points.length - 1].x,
        height - bottom
    );


    ctx.closePath();


    ctx.fillStyle =
        gradient;


    ctx.fill();


    // --------------------------------------------------------
    // LINE
    // --------------------------------------------------------

    ctx.beginPath();


    points.forEach(
        (point, index) => {

            if (index === 0) {

                ctx.moveTo(
                    point.x,
                    point.y
                );

            }

            else {

                ctx.lineTo(
                    point.x,
                    point.y
                );

            }

        }
    );


    ctx.strokeStyle =
        "#148ed8";


    ctx.lineWidth =
        2.5;


    ctx.lineJoin =
        "round";


    ctx.lineCap =
        "round";


    ctx.stroke();


    // --------------------------------------------------------
    // CURRENT POINT
    // --------------------------------------------------------

    const last =
        points[
            points.length - 1
        ];


    ctx.beginPath();


    ctx.arc(
        last.x,
        last.y,
        4,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "#148ed8";


    ctx.fill();


    ctx.beginPath();


    ctx.arc(
        last.x,
        last.y,
        8,
        0,
        Math.PI * 2
    );


    ctx.strokeStyle =
        "rgba(20, 142, 216, 0.18)";


    ctx.lineWidth =
        2;


    ctx.stroke();

}


// ============================================================
// PUMP DISPLAY
// ============================================================

function updatePumpDisplay(
    pumpOn
) {

    const status =
        document.getElementById(
            "pumpStatus"
        );


    const indicator =
        document.getElementById(
            "pumpIndicator"
        );


    const icon =
        document.getElementById(
            "pumpIcon"
        );


    const description =
        document.getElementById(
            "pumpDescription"
        );


    if (pumpOn) {

        status.textContent =
            "ON";


        status.className =
            "pump-state on";


        indicator.textContent =
            "ON";


        indicator.className =
            "status-badge on";


        icon.classList.add(
            "on"
        );


        description.textContent =
            "Pump is currently running";

    }

    else {

        status.textContent =
            "OFF";


        status.className =
            "pump-state";


        indicator.textContent =
            "OFF";


        indicator.className =
            "status-badge off";


        icon.classList.remove(
            "on"
        );


        description.textContent =
            "Pump is currently stopped";

    }

}


// ============================================================
// MODE DISPLAY
// ============================================================

function updateModeDisplay(
    mode
) {

    const modeElement =
        document.getElementById(
            "mode"
        );


    const modeDescription =
        document.getElementById(
            "modeDescription"
        );


    const modeCard =
        document.getElementById(
            "modeCard"
        );


    const topMode =
        document.getElementById(
            "topMode"
        );


    const autoButton =
        document.getElementById(
            "autoModeButton"
        );


    const manualButton =
        document.getElementById(
            "manualModeButton"
        );


    modeElement.textContent =
        mode;


    modeCard.textContent =
        mode;


    topMode.textContent =
        mode;


    if (mode === "AUTO") {

        modeDescription.textContent =
            "Automatic pump control is active";


        autoButton.classList.add(
            "active"
        );


        manualButton.classList.remove(
            "active"
        );

    }

    else {

        modeDescription.textContent =
            "Pump is controlled manually";


        autoButton.classList.remove(
            "active"
        );


        manualButton.classList.add(
            "active"
        );

    }

}


// ============================================================
// TANK BADGE
// ============================================================

function updateTankBadge(
    condition
) {

    const badge =
        document.getElementById(
            "tankConditionBadge"
        );


    badge.textContent =
        condition;


    badge.className =
        "status-badge";


    if (condition === "LOW") {

        badge.classList.add(
            "low"
        );

    }

    else if (
        condition === "FULL"
    ) {

        badge.classList.add(
            "full"
        );

    }

    else {

        badge.classList.add(
            "normal"
        );

    }

}


// ============================================================
// SOURCE WATER
// ============================================================

function updateSourceWater(
    sourceAvailable,
    sourceLevel = null
) {

    const sourceWater =
        document.getElementById(
            "sourceWater"
        );


    const sourceDescription =
        document.getElementById(
            "sourceWaterDescription"
        );


    const sourceButton =
        document.getElementById(
            "sourceWaterButton"
        );


    if (!sourceWater) {
        return;
    }


    // ========================================================
    // SOURCE WATER AVAILABLE
    // ========================================================

    if (sourceAvailable) {

        if (
            sourceLevel !== null &&
            sourceLevel !== undefined &&
            !Number.isNaN(
                Number(sourceLevel)
            )
        ) {

            sourceWater.textContent =
                Number(sourceLevel).toFixed(2)
                + "%";

        }

        else {

            sourceWater.textContent =
                "AVAILABLE";

        }


        sourceWater.className =
            "info-value green-text";


        sourceWater.style.color =
            "";


        if (sourceDescription) {

            sourceDescription.textContent =
                "Source tank water available";

        }


        // Source water is automatic.
        // Hide old manual source-water button.

        if (sourceButton) {

            sourceButton.style.display =
                "none";

        }

    }


    // ========================================================
    // SOURCE WATER UNAVAILABLE
    // ========================================================

    else {

        sourceWater.textContent =
            "NOT AVAILABLE";


        sourceWater.className =
            "info-value";


        sourceWater.style.color =
            "#c62828";


        if (sourceDescription) {

            sourceDescription.textContent =
                "Source tank is empty";

        }


        if (sourceButton) {

            sourceButton.style.display =
                "none";

        }

    }

}


// ============================================================
// WATER CONSUMPTION DISPLAY
// ============================================================

function updateConsumption(
    consumptionOn
) {

    const status =
        document.getElementById(
            "consumptionStatus"
        );


    const button =
        document.getElementById(
            "consumptionButton"
        );


    const description =
        document.getElementById(
            "consumptionDescription"
        );


    if (!status) {
        return;
    }


    // --------------------------------------------------------
    // CONSUMPTION ON
    // --------------------------------------------------------

    if (consumptionOn) {

        status.textContent =
            "ON";


        status.className =
            "status-badge on";


        if (button) {

            button.textContent =
                "TURN OFF";

        }


        if (description) {

            description.textContent =
                "Water is being consumed automatically";

        }

    }


    // --------------------------------------------------------
    // CONSUMPTION OFF
    // --------------------------------------------------------

    else {

        status.textContent =
            "OFF";


        status.className =
            "status-badge off";


        if (button) {

            button.textContent =
                "TURN ON";

        }


        if (description) {

            description.textContent =
                "Water consumption is stopped";

        }

    }

}


// ============================================================
// CONSUMPTION CONTROL
// ============================================================

async function toggleConsumption() {

    try {

        // Get current status
        const statusResponse =
            await fetch(
                "/api/status"
            );


        if (!statusResponse.ok) {

            throw new Error(
                "Could not get system status."
            );

        }


        const data =
            await statusResponse.json();


        // Reverse current state
        const newCommand =
            data.consumption
                ? "OFF"
                : "ON";


        // Send command to Flask
        const response =
            await fetch(
                "/api/consumption",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        command:
                            newCommand

                    })

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(
                result.message
            );

            return;

        }


        // Refresh dashboard
        await updateDashboard();

    }

    catch (error) {

        console.error(
            "Consumption error:",
            error
        );


        alert(
            "Could not communicate with server."
        );

    }

}


// ============================================================
// CONNECTION
// ============================================================

function updateConnection(
    connected
) {

    const element =
        document.getElementById(
            "connectionStatus"
        );


    if (!element) {
        return;
    }


    if (connected) {

        element.innerHTML =
            '<span class="connection-dot"></span> CONNECTED';


        element.className =
            "connection connected";

    }

    else {

        element.innerHTML =
            '<span class="connection-dot"></span> DISCONNECTED';


        element.className =
            "connection disconnected";

    }

}


// ============================================================
// RUNTIME FORMAT
// ============================================================

function formatRuntime(
    seconds
) {

    seconds =
        Math.floor(
            Number(seconds)
        );


    const hours =
        Math.floor(
            seconds / 3600
        );


    const minutes =
        Math.floor(
            (
                seconds % 3600
            ) / 60
        );


    const secs =
        seconds % 60;


    return (
        String(hours).padStart(
            2,
            "0"
        )
        +
        ":"
        +
        String(minutes).padStart(
            2,
            "0"
        )
        +
        ":"
        +
        String(secs).padStart(
            2,
            "0"
        )
    );

}


// ============================================================
// ALERT SYSTEM
// ============================================================

function updateAlerts(
    data
) {

    const alerts =
        document.getElementById(
            "alerts"
        );


    if (!alerts) {
        return;
    }


    if (data.emergency) {

        alerts.className =
            "alert-message emergency-alert";


        alerts.innerHTML =
            "<span>🚨</span> EMERGENCY SHUTDOWN ACTIVE";


        return;

    }


    if (!data.sourceWater) {

        alerts.className =
            "alert-message warning-alert";


        alerts.innerHTML =
            "<span>⚠</span> SOURCE WATER UNAVAILABLE";


        return;

    }


    if (data.waterLevel <= 30) {

        alerts.className =
            "alert-message warning-alert";


        alerts.innerHTML =
            "<span>⚠</span> LOW WATER LEVEL";


        return;

    }


    if (data.waterLevel >= 90) {

        alerts.className =
            "alert-message normal-alert";


        alerts.innerHTML =
            "<span>✓</span> TANK FULL";


        return;

    }


    alerts.className =
        "alert-message normal-alert";


    alerts.innerHTML =
        "<span>✓</span> No active alerts";

}


// ============================================================
// PUMP BUTTONS
// ============================================================

function updatePumpButtons(
    mode
) {

    const onButton =
        document.getElementById(
            "pumpOnButton"
        );


    const offButton =
        document.getElementById(
            "pumpOffButton"
        );


    const notice =
        document.getElementById(
            "manualNotice"
        );


    if (!onButton || !offButton) {
        return;
    }


    if (mode === "MANUAL") {

        onButton.disabled =
            false;


        offButton.disabled =
            false;


        if (notice) {

            notice.textContent =
                "Manual mode: you control the pump.";

        }

    }


    else {

        onButton.disabled =
            true;


        offButton.disabled =
            true;


        if (notice) {

            notice.textContent =
                "Switch to MANUAL mode to control the pump.";

        }

    }

}


// ============================================================
// SYSTEM HEALTH
// ============================================================

function updateSystemHealth(
    data
) {

    const health =
        document.getElementById(
            "systemHealth"
        );


    if (!health) {
        return;
    }


    if (
        data.emergency ||
        !data.connected ||
        !data.sourceWater
    ) {

        health.textContent =
            "WARNING";


        health.className =
            "info-value";

    }

    else {

        health.textContent =
            "HEALTHY";


        health.className =
            "info-value green-text";

    }

}


// ============================================================
// CHANGE MODE
// ============================================================

async function changeMode(
    newMode
) {

    try {

        const response =
            await fetch(
                "/api/mode",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        mode:
                            newMode

                    })

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(
                result.message
            );

            return;

        }


        await updateDashboard();

    }

    catch (error) {

        console.error(
            "Mode error:",
            error
        );


        alert(
            "Could not communicate with server."
        );

    }

}


// ============================================================
// PUMP CONTROL
// ============================================================

async function controlPump(
    command
) {

    try {

        const response =
            await fetch(
                "/api/pump",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        command:
                            command

                    })

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(
                result.message
            );

            return;

        }


        await updateDashboard();

    }

    catch (error) {

        console.error(
            "Pump error:",
            error
        );


        alert(
            "Could not communicate with server."
        );

    }

}


// ============================================================
// CLOCK
// ============================================================

function updateClock() {

    const element =
        document.getElementById(
            "systemTime"
        );


    if (!element) {
        return;
    }


    const now =
        new Date();


    const hours =
        String(
            now.getHours()
        ).padStart(
            2,
            "0"
        );


    const minutes =
        String(
            now.getMinutes()
        ).padStart(
            2,
            "0"
        );


    const seconds =
        String(
            now.getSeconds()
        ).padStart(
            2,
            "0"
        );


    element.textContent =
        `${hours}:${minutes}:${seconds}`;

}


// ============================================================
// WINDOW RESIZE
// ============================================================

window.addEventListener(
    "resize",
    function() {

        drawWaterGraph();

    }
);


// ============================================================
// CLOCK UPDATE
// ============================================================

setInterval(
    updateClock,
    1000
);


// ============================================================
// DASHBOARD UPDATE EVERY SECOND
// ============================================================

setInterval(
    updateDashboard,
    1000
);


// ============================================================
// INITIAL LOAD
// ============================================================

updateClock();

updateDashboard();


// ============================================================
// SOURCE WATER SIMULATION
// ============================================================

async function toggleSourceWater() {

    try {

        // Get current source-water state
        const statusResponse =
            await fetch(
                "/api/status"
            );


        const data =
            await statusResponse.json();


        // Reverse current state
        const newState =
            !data.sourceWater;


        // Send new state to Flask
        const response =
            await fetch(
                "/api/source-water",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        available:
                            newState

                    })

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(
                result.message
            );

            return;

        }


        // Refresh dashboard
        await updateDashboard();

    }

    catch (error) {

        console.error(
            "Source water error:",
            error
        );


        alert(
            "Could not communicate with server."
        );

    }

}