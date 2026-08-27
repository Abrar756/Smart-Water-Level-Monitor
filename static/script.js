// ============================================================
// SMART WATER LEVEL MONITOR
// APPLICATION JAVASCRIPT
// ============================================================


// ============================================================
// GRAPH
// ============================================================

const graphData = [];

const MAX_GRAPH_POINTS = 60;


// ============================================================
// HISTORY
// ============================================================

let historyData = [];

let alertHistory = [];


// ============================================================
// CURRENT PAGE
// ============================================================

let currentPage = "homePage";


// ============================================================
// PAGE INFORMATION
// ============================================================

const pageInformation = {

    homePage: {
        title: "Home",
        subtitle: "Water Management Overview"
    },

    monitorPage: {
        title: "Live Monitor",
        subtitle: "Real-Time System Monitoring"
    },

    historyPage: {
        title: "History",
        subtitle: "Water & Pump Activity"
    },

    alertsPage: {
        title: "Alerts",
        subtitle: "System Notifications"
    },

    emergencyPage: {
        title: "Emergency",
        subtitle: "Safety Control"
    },

    analyticsPage: {
        title: "Analytics",
        subtitle: "Water System Statistics"
    },

    settingsPage: {
        title: "Settings",
        subtitle: "System Configuration"
    }

};


// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

    const menuButton =
        document.getElementById("menuButton");

    const sidebar =
        document.getElementById("sidebar");

    const overlay =
        document.getElementById("sidebarOverlay");


    if (menuButton) {

        menuButton.addEventListener(
            "click",
            function () {

                sidebar.classList.toggle(
                    "sidebar-open"
                );

                overlay.classList.toggle(
                    "active"
                );

            }
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeSidebar
        );

    }


    document
        .querySelectorAll(".nav-item")
        .forEach(function (item) {

            item.addEventListener(
                "click",
                function () {

                    const page =
                        item.getAttribute(
                            "data-page"
                        );

                    showPage(page);

                }
            );

        });


    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Escape") {

                closeSidebar();

            }

        }
    );

}


function closeSidebar() {

    const sidebar =
        document.getElementById(
            "sidebar"
        );

    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );


    if (sidebar) {

        sidebar.classList.remove(
            "sidebar-open"
        );

    }


    if (overlay) {

        overlay.classList.remove(
            "active"
        );

    }

}


function showPage(pageId) {

    const target =
        document.getElementById(
            pageId
        );


    if (!target) {
        return;
    }


    document
        .querySelectorAll(".app-page")
        .forEach(function (page) {

            page.classList.remove(
                "active-page"
            );

        });


    target.classList.add(
        "active-page"
    );


    document
        .querySelectorAll(".nav-item")
        .forEach(function (item) {

            item.classList.toggle(
                "active",
                item.getAttribute(
                    "data-page"
                ) === pageId
            );

        });


    currentPage =
        pageId;


    const information =
        pageInformation[pageId];


    if (information) {

        const title =
            document.getElementById(
                "pageTitle"
            );

        const subtitle =
            document.getElementById(
                "pageSubtitle"
            );


        if (title) {

            title.textContent =
                information.title;

        }


        if (subtitle) {

            subtitle.textContent =
                information.subtitle;

        }

    }


    closeSidebar();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    updateHistoryPage();

    updateAnalyticsPage();

}


// ============================================================
// DASHBOARD UPDATE
// ============================================================

async function updateDashboard() {

    try {

        const response =
            await fetch(
                "/api/status",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Server response error"
            );

        }


        const data =
            await response.json();


        updateConnection(
            data.connected !== false
        );


        updateWaterLevel(
            data.waterLevel
        );


        updateTankBadge(
            data.tank
        );


        updatePumpDisplay(
            data.pump
        );


        updateModeDisplay(
            data.mode
        );


        updateRuntime(
            data.runtime
        );


        updateSourceWater(
            data.sourceWater,
            data.sourceWaterLevel
        );


        updateConsumption(
            data.consumption
        );


        updateAlerts(
            data
        );


        updatePumpButtons(
            data.mode
        );


        updateSystemHealth(
            data
        );


        updateMonitorPage(
            data
        );


        updateEmergencyPage(
            data
        );


        recordHistory(
            data
        );


        updateHistoryPage();

        updateAnalyticsPage();

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
// WATER LEVEL
// ============================================================

function updateWaterLevel(level) {

    const waterLevel =
        Number(level);


    if (
        Number.isNaN(
            waterLevel
        )
    ) {
        return;
    }


    const safeLevel =
        Math.max(
            0,
            Math.min(
                100,
                waterLevel
            )
        );


    const main =
        document.getElementById(
            "waterLevel"
        );


    if (main) {

        main.textContent =
            safeLevel.toFixed(2) + "%";

    }


    const fill =
        document.getElementById(
            "waterFill"
        );


    if (fill) {

        fill.style.height =
            safeLevel + "%";

    }


    const fillText =
        document.getElementById(
            "waterFillText"
        );


    if (fillText) {

        fillText.textContent =
            safeLevel.toFixed(0) + "%";

    }


    const homeBar =
        document.getElementById(
            "homeLevelBar"
        );


    if (homeBar) {

        homeBar.style.width =
            safeLevel + "%";

    }


    graphData.push(
        safeLevel
    );


    if (
        graphData.length >
        MAX_GRAPH_POINTS
    ) {

        graphData.shift();

    }


    drawWaterGraph();

}


// ============================================================
// GRAPH
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


    if (
        width <= 0 ||
        height <= 0
    ) {
        return;
    }


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


    const left = 38;
    const right = 12;
    const top = 12;
    const bottom = 23;


    const graphWidth =
        width -
        left -
        right;


    const graphHeight =
        height -
        top -
        bottom;


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
        function (level) {

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
                left - 6,
                y + 3
            );

        }
    );


    if (
        graphData.length < 2
    ) {
        return;
    }


    const points = [];


    graphData.forEach(
        function (
            value,
            index
        ) {

            const denominator =
                Math.max(
                    graphData.length - 1,
                    1
                );


            const x =
                left +
                (
                    index /
                    denominator
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
                x: x,
                y: y
            });

        }
    );


    // --------------------------------------------------------
    // AREA
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
        "rgba(11,132,243,0.20)"
    );


    gradient.addColorStop(
        1,
        "rgba(11,132,243,0.01)"
    );


    ctx.beginPath();


    ctx.moveTo(
        points[0].x,
        height - bottom
    );


    points.forEach(
        function (point) {

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
        function (
            point,
            index
        ) {

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
        "#0b84f3";


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
        "#0b84f3";


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
        "rgba(11,132,243,0.18)";


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

        if (status) {

            status.textContent =
                "ON";

            status.className =
                "pump-status on";

        }


        if (indicator) {

            indicator.textContent =
                "ON";

            indicator.className =
                "status-badge on";

        }


        if (icon) {

            icon.classList.add(
                "on"
            );

        }


        if (description) {

            description.textContent =
                "Pump is currently running";

        }

    }

    else {

        if (status) {

            status.textContent =
                "OFF";

            status.className =
                "pump-status";

        }


        if (indicator) {

            indicator.textContent =
                "OFF";

            indicator.className =
                "status-badge off";

        }


        if (icon) {

            icon.classList.remove(
                "on"
            );

        }


        if (description) {

            description.textContent =
                "Pump is currently stopped";

        }

    }


    const monitor =
        document.getElementById(
            "monitorPumpStatus"
        );


    if (monitor) {

        monitor.textContent =
            pumpOn
                ? "ON"
                : "OFF";

        monitor.style.color =
            pumpOn
                ? "#20b26b"
                : "";

    }


    const emergencyPump =
        document.getElementById(
            "emergencyPumpStatus"
        );


    if (emergencyPump) {

        emergencyPump.textContent =
            pumpOn
                ? "ON"
                : "OFF";

    }

}


// ============================================================
// MODE
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


    if (modeElement) {

        modeElement.textContent =
            mode;

    }


    if (topMode) {

        topMode.textContent =
            mode;

    }


    if (modeDescription) {

        modeDescription.textContent =
            mode === "AUTO"
                ? "Automatic pump control is active"
                : "Pump is controlled manually";

    }


    if (autoButton) {

        autoButton.classList.toggle(
            "active",
            mode === "AUTO"
        );

    }


    if (manualButton) {

        manualButton.classList.toggle(
            "active",
            mode === "MANUAL"
        );

    }


    const monitorMode =
        document.getElementById(
            "monitorMode"
        );


    if (monitorMode) {

        monitorMode.textContent =
            mode;

    }

}


// ============================================================
// TANK CONDITION
// ============================================================

function updateTankBadge(
    condition
) {

    const badge =
        document.getElementById(
            "tankConditionBadge"
        );


    if (badge) {

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


    const monitorCondition =
        document.getElementById(
            "monitorTankCondition"
        );


    if (monitorCondition) {

        monitorCondition.textContent =
            condition;

    }


    const monitorTank =
        document.getElementById(
            "monitorTankStatus"
        );


    if (monitorTank) {

        monitorTank.textContent =
            condition;

    }

}


// ============================================================
// RUNTIME
// ============================================================

function updateRuntime(
    seconds
) {

    const formatted =
        formatRuntime(
            seconds
        );


    const homeRuntime =
        document.getElementById(
            "homeRuntime"
        );


    if (homeRuntime) {

        homeRuntime.textContent =
            formatted;

    }


    const monitorRuntime =
        document.getElementById(
            "monitorPumpRuntime"
        );


    if (monitorRuntime) {

        monitorRuntime.textContent =
            "Runtime: " + formatted;

    }

}


// ============================================================
// SOURCE WATER
// ============================================================

function updateSourceWater(
    available,
    sourceLevel
) {

    const homeSource =
        document.getElementById(
            "homeSourceWater"
        );


    const monitorSource =
        document.getElementById(
            "monitorSourceWater"
        );


    const monitorLevel =
        document.getElementById(
            "monitorSourceLevel"
        );


    const monitorBar =
        document.getElementById(
            "monitorSourceBar"
        );


    const emergencySource =
        document.getElementById(
            "emergencySourceWater"
        );


    if (available) {

        const level =
            Number(sourceLevel);


        const text =
            !Number.isNaN(level)
                ? level.toFixed(2) + "%"
                : "AVAILABLE";


        if (homeSource) {

            homeSource.textContent =
                "AVAILABLE";

            homeSource.className =
                "healthy-text";

        }


        if (monitorSource) {

            monitorSource.textContent =
                text;

            monitorSource.style.color =
                "#20b26b";

        }


        if (monitorLevel) {

            monitorLevel.textContent =
                "Level: " + text;

        }


        if (monitorBar) {

            monitorBar.style.width =
                Math.max(
                    0,
                    Math.min(
                        100,
                        level || 0
                    )
                ) + "%";

        }


        if (emergencySource) {

            emergencySource.textContent =
                "AVAILABLE";

        }

    }

    else {

        if (homeSource) {

            homeSource.textContent =
                "UNAVAILABLE";

            homeSource.className =
                "";

            homeSource.style.color =
                "#e53935";

        }


        if (monitorSource) {

            monitorSource.textContent =
                "UNAVAILABLE";

            monitorSource.style.color =
                "#e53935";

        }


        if (monitorLevel) {

            monitorLevel.textContent =
                "Source tank is empty";

        }


        if (monitorBar) {

            monitorBar.style.width =
                "0%";

        }


        if (emergencySource) {

            emergencySource.textContent =
                "UNAVAILABLE";

        }

    }

}


// ============================================================
// CONSUMPTION
// ============================================================

function updateConsumption(
    enabled
) {

    const home =
        document.getElementById(
            "homeConsumption"
        );


    const monitor =
        document.getElementById(
            "monitorConsumption"
        );


    if (home) {

        home.textContent =
            enabled
                ? "ON"
                : "OFF";

        home.style.color =
            enabled
                ? "#20b26b"
                : "#657486";

    }


    if (monitor) {

        monitor.textContent =
            "Consumption: " +
            (
                enabled
                    ? "ON"
                    : "OFF"
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


    const monitor =
        document.getElementById(
            "monitorConnection"
        );


    if (!element) {
        return;
    }


    if (connected) {

        element.className =
            "connection connected";


        element.innerHTML =
            '<span class="connection-dot"></span>' +
            '<span class="connection-text">CONNECTED</span>';

    }

    else {

        element.className =
            "connection disconnected";


        element.innerHTML =
            '<span class="connection-dot"></span>' +
            '<span class="connection-text">DISCONNECTED</span>';

    }


    if (monitor) {

        monitor.textContent =
            connected
                ? "CONNECTED"
                : "DISCONNECTED";

        monitor.style.color =
            connected
                ? "#20b26b"
                : "#e53935";

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


    if (
        Number.isNaN(seconds)
    ) {

        seconds = 0;

    }


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

        String(hours)
            .padStart(2, "0")

        + ":"

        +

        String(minutes)
            .padStart(2, "0")

        + ":"

        +

        String(secs)
            .padStart(2, "0")

    );

}


// ============================================================
// ALERT SYSTEM
// ============================================================

function updateAlerts(
    data
) {

    const alertElement =
        document.getElementById(
            "alerts"
        );


    const title =
        document.getElementById(
            "additionalAlertTitle"
        );


    const description =
        document.getElementById(
            "additionalAlertDescription"
        );


    let type = "normal";

    let message =
        "No active alerts";


    if (data.emergency) {

        type =
            "emergency";

        message =
            "EMERGENCY SHUTDOWN ACTIVE";

    }

    else if (
        !data.sourceWater
    ) {

        type =
            "warning";

        message =
            "SOURCE WATER UNAVAILABLE";

    }

    else if (
        Number(data.waterLevel) <= 30
    ) {

        type =
            "warning";

        message =
            "LOW WATER LEVEL";

    }

    else if (
        Number(data.waterLevel) >= 90
    ) {

        type =
            "normal";

        message =
            "TANK FULL";

    }


    if (alertElement) {

        alertElement.className =
            "home-alert";


        if (type === "warning") {

            alertElement.classList.add(
                "warning"
            );

        }


        if (type === "emergency") {

            alertElement.classList.add(
                "emergency"
            );

        }


        const icon =
            type === "emergency"
                ? "🚨"
                : type === "warning"
                    ? "⚠"
                    : "✓";


        alertElement.innerHTML =
            "<span>" +
            icon +
            "</span>" +
            "<strong>" +
            message +
            "</strong>";

    }


    if (title) {

        title.textContent =
            type === "normal"
                ? "No Active Alerts"
                : message;

    }


    if (description) {

        description.textContent =
            type === "normal"
                ? "All monitored conditions are currently normal."
                : "The system has detected a condition that requires attention.";

    }


    updateAlertBadge(
        type
    );


    updateAlertHistory(
        message,
        type
    );

}


// ============================================================
// ALERT BADGE
// ============================================================

function updateAlertBadge(
    type
) {

    const badge =
        document.getElementById(
            "navAlertBadge"
        );


    if (!badge) {
        return;
    }


    if (type === "normal") {

        badge.style.display =
            "none";

    }

    else {

        badge.style.display =
            "grid";

        badge.textContent =
            "1";

    }

}


// ============================================================
// ALERT HISTORY
// ============================================================

let lastAlertMessage = "";


function updateAlertHistory(
    message,
    type
) {

    if (
        message === "No active alerts"
    ) {

        return;

    }


    if (
        message === lastAlertMessage
    ) {

        return;

    }


    lastAlertMessage =
        message;


    alertHistory.unshift({

        time:
            new Date()
                .toLocaleTimeString(),

        message:
            message,

        type:
            type

    });


    if (
        alertHistory.length > 30
    ) {

        alertHistory.pop();

    }


    renderAlertHistory();

}


function renderAlertHistory() {

    const container =
        document.getElementById(
            "alertHistoryList"
        );


    if (!container) {
        return;
    }


    if (
        alertHistory.length === 0
    ) {

        container.innerHTML =
            '<div class="empty-state">' +
            'No alert history recorded yet.' +
            '</div>';

        return;

    }


    container.innerHTML =
        alertHistory
            .map(function (alert) {

                return (

                    '<div class="alert-history-item" ' +
                    'style="' +
                    'padding:12px;' +
                    'border-bottom:1px solid #e7edf2;' +
                    'font-size:10px;' +
                    '">' +

                    '<strong>' +
                    alert.message +
                    '</strong>' +

                    '<span style="' +
                    'display:block;' +
                    'margin-top:4px;' +
                    'color:#93a0ad;' +
                    '">' +

                    alert.time +

                    '</span>' +

                    '</div>'

                );

            })
            .join("");

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


    if (
        mode === "MANUAL"
    ) {

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
            "homeSystemHealth"
        );


    if (!health) {
        return;
    }


    const warning =
        data.emergency ||
        data.connected === false ||
        !data.sourceWater;


    if (warning) {

        health.textContent =
            "WARNING";

        health.className =
            "";

        health.style.color =
            "#e53935";

    }

    else {

        health.textContent =
            "HEALTHY";

        health.className =
            "healthy-text";

        health.style.color =
            "";

    }

}


// ============================================================
// MONITOR PAGE
// ============================================================

function updateMonitorPage(
    data
) {

    const water =
        Number(data.waterLevel);


    const waterElement =
        document.getElementById(
            "monitorWaterLevel"
        );


    const waterBar =
        document.getElementById(
            "monitorLevelBar"
        );


    if (waterElement) {

        waterElement.textContent =
            water.toFixed(2) + "%";

    }


    if (waterBar) {

        waterBar.style.width =
            Math.max(
                0,
                Math.min(
                    100,
                    water
                )
            ) + "%";

    }


    const emergency =
        document.getElementById(
            "monitorEmergency"
        );


    if (emergency) {

        emergency.textContent =
            data.emergency
                ? "ACTIVE"
                : "INACTIVE";

        emergency.style.color =
            data.emergency
                ? "#e53935"
                : "#20b26b";

    }


    const last =
        document.getElementById(
            "monitorLastUpdate"
        );


    if (last) {

        last.textContent =
            new Date()
                .toLocaleTimeString();

    }

}


// ============================================================
// EMERGENCY PAGE
// ============================================================

function updateEmergencyPage(
    data
) {

    const message =
        document.getElementById(
            "emergencyStateMessage"
        );


    const button =
        document.getElementById(
            "emergencyStopButton"
        );


    if (data.emergency) {

        if (message) {

            message.textContent =
                "Emergency state: ACTIVE";

            message.style.background =
                "#fff0f0";

            message.style.color =
                "#e53935";

        }


        if (button) {

            button.textContent =
                "EMERGENCY ACTIVE";

        }

    }

    else {

        if (message) {

            message.textContent =
                "Emergency state: INACTIVE";

            message.style.background =
                "";

            message.style.color =
                "";

        }


        if (button) {

            button.textContent =
                "STOP PUMP";

        }

    }


    const level =
        document.getElementById(
            "emergencyWaterLevel"
        );


    if (level) {

        level.textContent =
            Number(data.waterLevel)
                .toFixed(2) + "%";

    }

}


// ============================================================
// HISTORY RECORDING
// ============================================================

function recordHistory(
    data
) {

    const level =
        Number(data.waterLevel);


    if (
        Number.isNaN(level)
    ) {
        return;
    }


    historyData.push({

        time:
            new Date()
                .toLocaleTimeString(),

        water:
            level,

        pump:
            Boolean(data.pump),

        mode:
            data.mode,

        tank:
            data.tank

    });


    if (
        historyData.length > 300
    ) {

        historyData.shift();

    }

}


// ============================================================
// HISTORY PAGE
// ============================================================

function updateHistoryPage() {

    const count =
        document.getElementById(
            "historyPointCount"
        );


    const highest =
        document.getElementById(
            "historyHighestLevel"
        );


    const lowest =
        document.getElementById(
            "historyLowestLevel"
        );


    if (
        historyData.length === 0
    ) {

        if (count) {
            count.textContent = "0";
        }

        if (highest) {
            highest.textContent = "--%";
        }

        if (lowest) {
            lowest.textContent = "--%";
        }

        return;

    }


    const values =
        historyData.map(
            function (item) {
                return item.water;
            }
        );


    const max =
        Math.max(...values);


    const min =
        Math.min(...values);


    if (count) {

        count.textContent =
            historyData.length;

    }


    if (highest) {

        highest.textContent =
            max.toFixed(2) + "%";

    }


    if (lowest) {

        lowest.textContent =
            min.toFixed(2) + "%";

    }


    const tbody =
        document.getElementById(
            "historyTableBody"
        );


    if (!tbody) {
        return;
    }


    const recent =
        historyData
            .slice()
            .reverse()
            .slice(0, 50);


    tbody.innerHTML =
        recent
            .map(function (item) {

                return (

                    "<tr>" +

                    "<td>" +
                    item.time +
                    "</td>" +

                    "<td>" +
                    item.water.toFixed(2) +
                    "%</td>" +

                    "<td>" +
                    (
                        item.pump
                            ? "ON"
                            : "OFF"
                    ) +
                    "</td>" +

                    "<td>" +
                    item.mode +
                    "</td>" +

                    "<td>" +
                    item.tank +
                    "</td>" +

                    "</tr>"

                );

            })
            .join("");

}


// ============================================================
// ANALYTICS
// ============================================================

function updateAnalyticsPage() {

    if (
        historyData.length === 0
    ) {
        return;
    }


    const values =
        historyData.map(
            function (item) {
                return item.water;
            }
        );


    const minimum =
        Math.min(...values);


    const maximum =
        Math.max(...values);


    const average =
        values.reduce(
            function (
                total,
                value
            ) {

                return total + value;

            },
            0
        ) /
        values.length;


    const pumpSamples =
        historyData.filter(
            function (item) {

                return item.pump;

            }
        ).length;


    setText(
        "analyticsAverageLevel",
        average.toFixed(2) + "%"
    );


    setText(
        "analyticsHighestLevel",
        maximum.toFixed(2) + "%"
    );


    setText(
        "analyticsLowestLevel",
        minimum.toFixed(2) + "%"
    );


    setText(
        "analyticsPumpSamples",
        pumpSamples
    );


    setText(
        "analyticsMinText",
        minimum.toFixed(2) + "%"
    );


    setText(
        "analyticsAverageText",
        average.toFixed(2) + "%"
    );


    setText(
        "analyticsMaxText",
        maximum.toFixed(2) + "%"
    );


    setWidth(
        "analyticsMinBar",
        minimum
    );


    setWidth(
        "analyticsAverageBar",
        average
    );


    setWidth(
        "analyticsMaxBar",
        maximum
    );

}


// ============================================================
// HELPER
// ============================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

}


function setWidth(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.style.width =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(value)
                )
            ) + "%";

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

                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
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

                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
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
// CONSUMPTION CONTROL
// ============================================================

async function toggleConsumption() {

    try {

        const statusResponse =
            await fetch(
                "/api/status"
            );


        if (!statusResponse.ok) {

            throw new Error(
                "Could not get status."
            );

        }


        const data =
            await statusResponse.json();


        const newCommand =
            data.consumption
                ? "OFF"
                : "ON";


        const response =
            await fetch(
                "/api/consumption",
                {

                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
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
// EMERGENCY CONTROL
// ============================================================

async function emergencyStop() {

    try {

        const button =
            document.getElementById(
                "emergencyStopButton"
            );


        if (button) {

            button.disabled =
                true;

        }


        /*
         * The current Flask code supplied earlier does not
         * contain a dedicated emergency endpoint.
         *
         * Therefore we safely stop the pump through the
         * existing pump endpoint.
         */

        const response =
            await fetch(
                "/api/pump",
                {

                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            command:
                                "OFF"
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
            "Emergency error:",
            error
        );


        alert(
            "Could not communicate with server."
        );

    }

    finally {

        const button =
            document.getElementById(
                "emergencyStopButton"
            );


        if (button) {

            button.disabled =
                false;

        }

    }

}


// ============================================================
// CLEAR HISTORY
// ============================================================

function clearHistory() {

    if (
        historyData.length === 0
    ) {

        return;

    }


    const confirmed =
        confirm(
            "Clear all recorded history?"
        );


    if (!confirmed) {
        return;
    }


    historyData =
        [];


    updateHistoryPage();

    updateAnalyticsPage();

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
// EVENT LISTENERS
// ============================================================

window.addEventListener(
    "resize",
    function () {

        drawWaterGraph();

    }
);


const clearButton =
    document.getElementById(
        "clearHistoryButton"
    );


if (clearButton) {

    clearButton.addEventListener(
        "click",
        clearHistory
    );

}


const emergencyButton =
    document.getElementById(
        "emergencyStopButton"
    );


if (emergencyButton) {

    emergencyButton.addEventListener(
        "click",
        emergencyStop
    );

}


// ============================================================
// INTERVALS
// ============================================================

setInterval(
    updateClock,
    1000
);


setInterval(
    updateDashboard,
    1000
);


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupNavigation();

        updateClock();

        updateDashboard();

    }
);
