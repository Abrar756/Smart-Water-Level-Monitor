// ============================================================
// GRAPH DATA
// ============================================================

const graphData = [];

const MAX_GRAPH_POINTS = 60;


// ============================================================
// HISTORY DATA
// ============================================================

const historyData = [];

const MAX_HISTORY_POINTS = 200;


// ============================================================
// ALERT HISTORY
// ============================================================

const alertHistory = [];

let lastAlertState = "";


// ============================================================
// NAVIGATION
// ============================================================

const pageInformation = {

    homePage: {
        title: "Home",
        subtitle: "Water Management Overview"
    },

    monitorPage: {
        title: "Live Monitor",
        subtitle: "Real-Time System Information"
    },

    historyPage: {
        title: "History",
        subtitle: "Recent System Records"
    },

    alertsPage: {
        title: "Alerts",
        subtitle: "System Conditions & Notifications"
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
// INITIALIZE NAVIGATION
// ============================================================

function initializeNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(
        button => {

            button.addEventListener(
                "click",
                function () {

                    const pageId =
                        this.dataset.page;


                    showPage(
                        pageId
                    );

                }
            );

        }
    );


    const menuButton =
        document.getElementById(
            "menuButton"
        );


    const sidebar =
        document.getElementById(
            "sidebar"
        );


    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );


    if (menuButton) {

        menuButton.addEventListener(
            "click",
            function () {

                sidebar.classList.toggle(
                    "open"
                );

                overlay.classList.toggle(
                    "open"
                );

            }
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            function () {

                sidebar.classList.remove(
                    "open"
                );

                overlay.classList.remove(
                    "open"
                );

            }
        );

    }

}


// ============================================================
// SHOW PAGE
// ============================================================

function showPage(
    pageId
) {

    const pages =
        document.querySelectorAll(
            ".app-page"
        );


    pages.forEach(
        page => {

            page.classList.remove(
                "active-page"
            );

        }
    );


    const selectedPage =
        document.getElementById(
            pageId
        );


    if (selectedPage) {

        selectedPage.classList.add(
            "active-page"
        );

    }


    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(
        item => {

            item.classList.remove(
                "active"
            );


            if (
                item.dataset.page ===
                pageId
            ) {

                item.classList.add(
                    "active"
                );

            }

        }
    );


    const info =
        pageInformation[pageId];


    if (info) {

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
                info.title;

        }


        if (subtitle) {

            subtitle.textContent =
                info.subtitle;

        }

    }


    // Close mobile menu

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
            "open"
        );

    }


    if (overlay) {

        overlay.classList.remove(
            "open"
        );

    }


    // Load settings when page is opened

    if (pageId === "settingsPage") {

        loadSettings();

    }


    updateHistoryDisplay();

    updateAnalyticsDisplay();

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
            data.connected
        );


        // ----------------------------------------------------
        // WATER LEVEL
        // ----------------------------------------------------

        const waterLevel =
            Number(
                data.waterLevel
            );


        const waterElement =
            document.getElementById(
                "waterLevel"
            );


        if (waterElement) {

            waterElement.textContent =
                waterLevel.toFixed(2) + "%";

        }


        const waterFill =
            document.getElementById(
                "waterFill"
            );


        if (waterFill) {

            waterFill.style.height =
                waterLevel + "%";

        }


        const waterFillText =
            document.getElementById(
                "waterFillText"
            );


        if (waterFillText) {

            waterFillText.textContent =
                waterLevel.toFixed(0) + "%";

        }


        const homeLevelBar =
            document.getElementById(
                "homeLevelBar"
            );


        if (homeLevelBar) {

            homeLevelBar.style.width =
                waterLevel + "%";

        }


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
        // HISTORY
        // ----------------------------------------------------

        addHistoryPoint(
            data
        );


        // ----------------------------------------------------
        // TANK
        // ----------------------------------------------------

        document.getElementById(
            "tankCondition"
        );


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

        updateElementText(
            "runtime",
            formatRuntime(
                data.runtime
            )
        );


        updateElementText(
            "homeRuntime",
            formatRuntime(
                data.runtime
            )
        );


        // ----------------------------------------------------
        // SOURCE WATER
        // ----------------------------------------------------

        updateSourceWater(
            data.sourceWater,
            data.sourceWaterLevel
        );


        updateElementText(
            "homeSourceWater",
            data.sourceWater
                ? Number(
                    data.sourceWaterLevel
                ).toFixed(2) + "%"
                : "UNAVAILABLE"
        );


        // ----------------------------------------------------
        // CONSUMPTION
        // ----------------------------------------------------

        updateConsumption(
            data.consumption
        );


        updateElementText(
            "homeConsumption",
            data.consumption
                ? "ON"
                : "OFF"
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


        // ----------------------------------------------------
        // MONITOR PAGE
        // ----------------------------------------------------

        updateMonitorPage(
            data
        );


        // ----------------------------------------------------
        // EMERGENCY PAGE
        // ----------------------------------------------------

        updateEmergencyPage(
            data
        );


        // ----------------------------------------------------
        // SETTINGS CURRENT VALUES
        // ----------------------------------------------------

        if (data.settings) {

            updateCurrentSettings(
                data.settings
            );

        }

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
// GENERIC ELEMENT UPDATE
// ============================================================

function updateElementText(
    id,
    text
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            text;

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


    const left =
        40;

    const right =
        15;

    const top =
        15;

    const bottom =
        25;


    const graphWidth =
        width -
        left -
        right;


    const graphHeight =
        height -
        top -
        bottom;


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
                    Math.max(
                        1,
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
    // FILL
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
        points[
            points.length - 1
        ].x,
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


    if (!status) {
        return;
    }


    if (pumpOn) {

        status.textContent =
            "ON";

        status.className =
            "pump-state on";


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

        status.textContent =
            "OFF";

        status.className =
            "pump-state";


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


    if (mode === "AUTO") {

        if (modeDescription) {

            modeDescription.textContent =
                "Automatic pump control is active";

        }


        if (autoButton) {

            autoButton.classList.add(
                "active"
            );

        }


        if (manualButton) {

            manualButton.classList.remove(
                "active"
            );

        }

    }

    else {

        if (modeDescription) {

            modeDescription.textContent =
                "Pump is controlled manually";

        }


        if (autoButton) {

            autoButton.classList.remove(
                "active"
            );

        }


        if (manualButton) {

            manualButton.classList.add(
                "active"
            );

        }

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


    if (!badge) {
        return;
    }


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


    const level =
        Number(
            sourceLevel
        );


    if (sourceAvailable) {

        if (
            sourceLevel !== null &&
            sourceLevel !== undefined &&
            !Number.isNaN(level)
        ) {

            if (sourceWater) {

                sourceWater.textContent =
                    level.toFixed(2) + "%";

            }

        }

        else {

            if (sourceWater) {

                sourceWater.textContent =
                    "AVAILABLE";

            }

        }


        if (sourceDescription) {

            sourceDescription.textContent =
                "Source tank water available";

        }

    }

    else {

        if (sourceWater) {

            sourceWater.textContent =
                "NOT AVAILABLE";

        }


        if (sourceDescription) {

            sourceDescription.textContent =
                "Source tank is empty";

        }

    }


    // Monitor page

    updateElementText(
        "monitorSourceWater",
        sourceAvailable
            ? "AVAILABLE"
            : "UNAVAILABLE"
    );


    updateElementText(
        "monitorSourceLevel",
        "Level: " +
        (
            Number.isNaN(level)
                ? "--"
                : level.toFixed(2)
        ) +
        "%"
    );


    const sourceBar =
        document.getElementById(
            "monitorSourceBar"
        );


    if (sourceBar) {

        sourceBar.style.width =
            (
                Number.isNaN(level)
                    ? 0
                    : level
            ) + "%";

    }

}


// ============================================================
// CONSUMPTION DISPLAY
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


    updateElementText(
        "monitorConsumption",
        consumptionOn
            ? "Consumption: ON"
            : "Consumption: OFF"
    );

}


// ============================================================
// TOGGLE CONSUMPTION
// ============================================================

async function toggleConsumption() {

    try {

        const response =
            await fetch(
                "/api/status"
            );


        if (!response.ok) {

            throw new Error(
                "Could not get system status."
            );

        }


        const data =
            await response.json();


        const newCommand =
            data.consumption
                ? "OFF"
                : "ON";


        const controlResponse =
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
            await controlResponse.json();


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
            '<span class="connection-dot"></span>' +
            '<span class="connection-text">' +
            'CONNECTED' +
            '</span>';


        element.className =
            "connection connected";

    }

    else {

        element.innerHTML =
            '<span class="connection-dot"></span>' +
            '<span class="connection-text">' +
            'DISCONNECTED' +
            '</span>';


        element.className =
            "connection disconnected";

    }

}


// ============================================================
// RUNTIME
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


    let alertState =
        "normal";


    let alertText =
        "No active alerts";


    let icon =
        "✓";


    if (data.emergency) {

        alertState =
            "emergency";

        alertText =
            "EMERGENCY SHUTDOWN ACTIVE";

        icon =
            "🚨";

    }

    else if (!data.sourceWater) {

        alertState =
            "warning";

        alertText =
            "SOURCE WATER UNAVAILABLE";

        icon =
            "⚠";

    }

    else if (
        data.waterLevel <=
        Number(
            data.settings
                ?.autoPumpOnLevel ??
            30
        )
    ) {

        alertState =
            "warning";

        alertText =
            "LOW WATER LEVEL";

        icon =
            "⚠";

    }

    else if (
        data.waterLevel >=
        Number(
            data.settings
                ?.autoPumpOffLevel ??
            90
        )
    ) {

        alertState =
            "normal";

        alertText =
            "TANK FULL";

        icon =
            "✓";

    }


    alerts.className =
        "home-alert";


    if (
        alertState ===
        "emergency"
    ) {

        alerts.classList.add(
            "emergency-alert"
        );

    }

    else if (
        alertState ===
        "warning"
    ) {

        alerts.classList.add(
            "warning-alert"
        );

    }

    else {

        alerts.classList.add(
            "normal-alert"
        );

    }


    alerts.innerHTML =
        "<span>" +
        icon +
        "</span>" +
        "<strong>" +
        alertText +
        "</strong>";


    // --------------------------------------------------------
    // Alert history
    // --------------------------------------------------------

    if (
        alertState !== lastAlertState
    ) {

        if (
            alertState !== "normal"
        ) {

            alertHistory.unshift({

                time:
                    new Date().toLocaleTimeString(),

                message:
                    alertText,

                type:
                    alertState

            });

            if (
                alertHistory.length >
                50
            ) {

                alertHistory.pop();

            }

        }

        lastAlertState =
            alertState;

        updateAlertPage();
    }


    updateAlertPage();
}


// ============================================================
// ALERT PAGE
// ============================================================

function updateAlertPage() {

    const list =
        document.getElementById(
            "alertHistoryList"
        );


    if (!list) {
        return;
    }


    if (
        alertHistory.length === 0
    ) {

        list.innerHTML =
            '<div class="empty-state">' +
            'No alert history recorded yet.' +
            '</div>';

        return;

    }


    list.innerHTML =
        alertHistory.map(
            alert => {

                return (
                    '<div style="' +
                    'padding:12px 0;' +
                    'border-bottom:1px solid #edf1f4;' +
                    'font-size:10px;">' +

                    '<strong>' +
                    alert.message +
                    '</strong>' +

                    '<span style="' +
                    'display:block;' +
                    'color:#8b98a2;' +
                    'margin-top:3px;">' +
                    alert.time +
                    '</span>' +

                    '</div>'
                );

            }
        ).join("");


    const badge =
        document.getElementById(
            "navAlertBadge"
        );


    if (badge) {

        if (
            alertHistory.length > 0
        ) {

            badge.textContent =
                Math.min(
                    alertHistory.length,
                    99
                );

            badge.style.display =
                "flex";

        }

        else {

            badge.style.display =
                "none";

        }

    }

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
            "homeSystemHealth"
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
            "";

        health.style.color =
            "#dc3545";

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
// SETTINGS
// ============================================================

async function loadSettings() {

    try {

        const response =
            await fetch(
                "/api/settings"
            );


        if (!response.ok) {

            throw new Error(
                "Could not load settings."
            );

        }


        const result =
            await response.json();


        if (
            !result.success
        ) {

            return;

        }


        populateSettingsForm(
            result.settings
        );


    }

    catch (error) {

        console.error(
            "Settings load error:",
            error
        );

    }

}


// ============================================================
// POPULATE SETTINGS
// ============================================================

function populateSettingsForm(
    data
) {

    setInputValue(
        "autoPumpOnInput",
        data.autoPumpOnLevel
    );


    setInputValue(
        "autoPumpOffInput",
        data.autoPumpOffLevel
    );


    setInputValue(
        "consumptionRateInput",
        data.consumptionRate
    );


    setInputValue(
        "pumpFillRateInput",
        data.pumpFillRate
    );


    setInputValue(
        "sourceRefillRateInput",
        data.sourceRefillRate
    );


    updateCurrentSettings(
        data
    );

}


// ============================================================
// SET INPUT VALUE
// ============================================================

function setInputValue(
    id,
    value
) {

    const input =
        document.getElementById(
            id
        );


    if (input) {

        input.value =
            Number(value).toFixed(2);

    }

}


// ============================================================
// CURRENT SETTINGS DISPLAY
// ============================================================

function updateCurrentSettings(
    data
) {

    updateElementText(
        "currentAutoOn",
        Number(
            data.autoPumpOnLevel
        ).toFixed(2) + "%"
    );


    updateElementText(
        "currentAutoOff",
        Number(
            data.autoPumpOffLevel
        ).toFixed(2) + "%"
    );


    updateElementText(
        "currentConsumptionRate",
        Number(
            data.consumptionRate
        ).toFixed(2) +
        "% / sec"
    );


    updateElementText(
        "currentPumpFillRate",
        Number(
            data.pumpFillRate
        ).toFixed(2) +
        "% / sec"
    );


    updateElementText(
        "currentSourceRefillRate",
        Number(
            data.sourceRefillRate
        ).toFixed(2) +
        "% / sec"
    );

}


// ============================================================
// GET NUMBER FROM INPUT
// ============================================================

function getInputNumber(
    id
) {

    const input =
        document.getElementById(
            id
        );


    if (!input) {

        return NaN;

    }


    return Number(
        input.value
    );

}


// ============================================================
// SETTINGS MESSAGE
// ============================================================

function showSettingsMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "settingsMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        "settings-message " +
        type;


    element.style.display =
        "block";


    clearTimeout(
        showSettingsMessage.timeout
    );


    showSettingsMessage.timeout =
        setTimeout(
            function () {

                element.style.display =
                    "none";

            },
            3500
        );

}


// ============================================================
// SAVE SETTINGS
// ============================================================

async function saveSettings() {

    const autoPumpOnLevel =
        getInputNumber(
            "autoPumpOnInput"
        );


    const autoPumpOffLevel =
        getInputNumber(
            "autoPumpOffInput"
        );


    const consumptionRate =
        getInputNumber(
            "consumptionRateInput"
        );


    const pumpFillRate =
        getInputNumber(
            "pumpFillRateInput"
        );


    const sourceRefillRate =
        getInputNumber(
            "sourceRefillRateInput"
        );


    if (
        [
            autoPumpOnLevel,
            autoPumpOffLevel,
            consumptionRate,
            pumpFillRate,
            sourceRefillRate
        ].some(
            value =>
                Number.isNaN(value)
        )
    ) {

        showSettingsMessage(
            "Please enter valid numbers in all fields.",
            "error"
        );

        return;

    }


    if (
        autoPumpOnLevel < 0 ||
        autoPumpOnLevel > 100
    ) {

        showSettingsMessage(
            "Pump ON level must be between 0 and 100%.",
            "error"
        );

        return;

    }


    if (
        autoPumpOffLevel < 0 ||
        autoPumpOffLevel > 100
    ) {

        showSettingsMessage(
            "Pump OFF level must be between 0 and 100%.",
            "error"
        );

        return;

    }


    if (
        autoPumpOnLevel >=
        autoPumpOffLevel
    ) {

        showSettingsMessage(
            "Pump ON level must be lower than Pump OFF level.",
            "error"
        );

        return;

    }


    if (
        consumptionRate < 0 ||
        consumptionRate > 100
    ) {

        showSettingsMessage(
            "Consumption rate must be between 0 and 100.",
            "error"
        );

        return;

    }


    if (
        pumpFillRate < 0 ||
        pumpFillRate > 100
    ) {

        showSettingsMessage(
            "Pump fill rate must be between 0 and 100.",
            "error"
        );

        return;

    }


    if (
        sourceRefillRate < 0 ||
        sourceRefillRate > 100
    ) {

        showSettingsMessage(
            "Source refill rate must be between 0 and 100.",
            "error"
        );

        return;

    }


    try {

        const response =
            await fetch(
                "/api/settings",
                {

                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            autoPumpOnLevel:
                                autoPumpOnLevel,

                            autoPumpOffLevel:
                                autoPumpOffLevel,

                            consumptionRate:
                                consumptionRate,

                            pumpFillRate:
                                pumpFillRate,

                            sourceRefillRate:
                                sourceRefillRate

                        })

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            showSettingsMessage(
                result.message,
                "error"
            );

            return;

        }


        populateSettingsForm(
            result.settings
        );


        showSettingsMessage(
            "Settings saved successfully.",
            "success"
        );


        await updateDashboard();

    }

    catch (error) {

        console.error(
            "Settings save error:",
            error
        );


        showSettingsMessage(
            "Could not communicate with the server.",
            "error"
        );

    }

}


// ============================================================
// RESET SETTINGS
// ============================================================

async function resetSettings() {

    const confirmed =
        confirm(
            "Restore all settings to their default values?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                "/api/settings/reset",
                {

                    method:
                        "POST"

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            showSettingsMessage(
                result.message,
                "error"
            );

            return;

        }


        populateSettingsForm(
            result.settings
        );


        showSettingsMessage(
            "Default settings restored.",
            "success"
        );


        await updateDashboard();

    }

    catch (error) {

        console.error(
            "Settings reset error:",
            error
        );


        showSettingsMessage(
            "Could not communicate with the server.",
            "error"
        );

    }

}


// ============================================================
// MONITOR PAGE
// ============================================================

function updateMonitorPage(
    data
) {

    updateElementText(
        "monitorWaterLevel",
        Number(
            data.waterLevel
        ).toFixed(2) + "%"
    );


    updateElementText(
        "monitorPumpStatus",
        data.pump
            ? "ON"
            : "OFF"
    );


    updateElementText(
        "monitorPumpRuntime",
        "Runtime: " +
        formatRuntime(
            data.runtime
        )
    );


    updateElementText(
        "monitorMode",
        data.mode
    );


    updateElementText(
        "monitorTankCondition",
        data.tank
    );


    updateElementText(
        "monitorConnection",
        data.connected
            ? "CONNECTED"
            : "DISCONNECTED"
    );


    updateElementText(
        "monitorEmergency",
        data.emergency
            ? "ACTIVE"
            : "INACTIVE"
    );


    updateElementText(
        "monitorTankStatus",
        data.tank
    );


    updateElementText(
        "monitorLastUpdate",
        new Date().toLocaleTimeString()
    );


    const levelBar =
        document.getElementById(
            "monitorLevelBar"
        );


    if (levelBar) {

        levelBar.style.width =
            Number(
                data.waterLevel
            ) + "%";

    }

}


// ============================================================
// HISTORY
// ============================================================

function addHistoryPoint(
    data
) {

    const now =
        new Date();


    const point = {

        time:
            now.toLocaleTimeString(),

        water:
            Number(
                data.waterLevel
            ),

        pump:
            data.pump,

        mode:
            data.mode,

        tank:
            data.tank

    };


    // Avoid recording duplicate data every second
    // if the exact same reading is repeated.

    const last =
        historyData[
            historyData.length - 1
        ];


    if (
        last &&
        Math.abs(
            last.water -
            point.water
        ) < 0.001 &&
        last.pump === point.pump &&
        last.mode === point.mode
    ) {

        return;

    }


    historyData.push(
        point
    );


    if (
        historyData.length >
        MAX_HISTORY_POINTS
    ) {

        historyData.shift();

    }


    updateHistoryDisplay();

    updateAnalyticsDisplay();

}


// ============================================================
// HISTORY DISPLAY
// ============================================================

function updateHistoryDisplay() {

    const body =
        document.getElementById(
            "historyTableBody"
        );


    if (!body) {
        return;
    }


    const count =
        document.getElementById(
            "historyPointCount"
        );


    if (count) {

        count.textContent =
            historyData.length;

    }


    if (
        historyData.length === 0
    ) {

        body.innerHTML =
            '<tr>' +
            '<td colspan="5" class="empty-table">' +
            'No history recorded yet.' +
            '</td>' +
            '</tr>';

        return;

    }


    const values =
        historyData.map(
            item =>
                item.water
        );


    const highest =
        Math.max(
            ...values
        );


    const lowest =
        Math.min(
            ...values
        );


    updateElementText(
        "historyHighestLevel",
        highest.toFixed(2) + "%"
    );


    updateElementText(
        "historyLowestLevel",
        lowest.toFixed(2) + "%"
    );


    const recent =
        historyData
            .slice(
                -30
            )
            .reverse();


    body.innerHTML =
        recent.map(
            item => {

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

            }
        ).join("");

}


// ============================================================
// CLEAR HISTORY
// ============================================================

function clearHistory() {

    historyData.length =
        0;

    updateHistoryDisplay();

    updateAnalyticsDisplay();

}


// ============================================================
// ANALYTICS
// ============================================================

function updateAnalyticsDisplay() {

    if (
        historyData.length === 0
    ) {

        updateElementText(
            "analyticsAverageLevel",
            "--%"
        );

        updateElementText(
            "analyticsHighestLevel",
            "--%"
        );

        updateElementText(
            "analyticsLowestLevel",
            "--%"
        );

        updateElementText(
            "analyticsPumpSamples",
            "0"
        );

        updateElementText(
            "analyticsMinText",
            "--%"
        );

        updateElementText(
            "analyticsAverageText",
            "--%"
        );

        updateElementText(
            "analyticsMaxText",
            "--%"
        );

        return;

    }


    const values =
        historyData.map(
            item =>
                item.water
        );


    const minimum =
        Math.min(
            ...values
        );


    const maximum =
        Math.max(
            ...values
        );


    const average =
        values.reduce(
            (
                total,
                value
            ) =>
                total + value,
            0
        ) /
        values.length;


    const pumpSamples =
        historyData.filter(
            item =>
                item.pump
        ).length;


    updateElementText(
        "analyticsAverageLevel",
        average.toFixed(2) + "%"
    );


    updateElementText(
        "analyticsHighestLevel",
        maximum.toFixed(2) + "%"
    );


    updateElementText(
        "analyticsLowestLevel",
        minimum.toFixed(2) + "%"
    );


    updateElementText(
        "analyticsPumpSamples",
        pumpSamples
    );


    updateElementText(
        "analyticsMinText",
        minimum.toFixed(2) + "%"
    );


    updateElementText(
        "analyticsAverageText",
        average.toFixed(2) + "%"
    );


    updateElementText(
        "analyticsMaxText",
        maximum.toFixed(2) + "%"
    );


    const minBar =
        document.getElementById(
            "analyticsMinBar"
        );


    const averageBar =
        document.getElementById(
            "analyticsAverageBar"
        );


    const maxBar =
        document.getElementById(
            "analyticsMaxBar"
        );


    if (minBar) {

        minBar.style.width =
            minimum + "%";

    }


    if (averageBar) {

        averageBar.style.width =
            average + "%";

    }


    if (maxBar) {

        maxBar.style.width =
            maximum + "%";

    }

}


// ============================================================
// EMERGENCY PAGE
// ============================================================

function updateEmergencyPage(
    data
) {

    updateElementText(
        "emergencyPumpStatus",
        data.pump
            ? "ON"
            : "OFF"
    );


    updateElementText(
        "emergencyWaterLevel",
        Number(
            data.waterLevel
        ).toFixed(2) + "%"
    );


    updateElementText(
        "emergencySourceWater",
        data.sourceWater
            ? "AVAILABLE"
            : "UNAVAILABLE"
    );


    updateElementText(
        "emergencyStateMessage",
        data.emergency
            ? "Emergency state: ACTIVE"
            : "Emergency state: INACTIVE"
    );


    const button =
        document.getElementById(
            "emergencyStopButton"
        );


    if (button) {

        if (data.emergency) {

            button.textContent =
                "RESET EMERGENCY";

        }

        else {

            button.textContent =
                "STOP PUMP";

        }

    }

}


// ============================================================
// EMERGENCY CONTROL
// ============================================================

async function toggleEmergency() {

    try {

        const response =
            await fetch(
                "/api/status"
            );


        const data =
            await response.json();


        const command =
            data.emergency
                ? "RESET"
                : "STOP";


        if (
            command === "STOP"
        ) {

            const confirmed =
                confirm(
                    "Activate emergency shutdown? This will immediately stop the pump."
                );


            if (!confirmed) {

                return;

            }

        }


        const controlResponse =
            await fetch(
                "/api/emergency",
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
            await controlResponse.json();


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
// RESIZE
// ============================================================

window.addEventListener(
    "resize",
    function () {

        drawWaterGraph();

    }
);


// ============================================================
// INITIALIZE BUTTONS
// ============================================================

function initializeButtons() {

    const saveButton =
        document.getElementById(
            "saveSettingsButton"
        );


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveSettings
        );

    }


    const resetButton =
        document.getElementById(
            "resetSettingsButton"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetSettings
        );

    }


    const clearHistoryButton =
        document.getElementById(
            "clearHistoryButton"
        );


    if (clearHistoryButton) {

        clearHistoryButton.addEventListener(
            "click",
            function () {

                const confirmed =
                    confirm(
                        "Clear all recorded history?"
                    );


                if (confirmed) {

                    clearHistory();

                }

            }
        );

    }


    const emergencyButton =
        document.getElementById(
            "emergencyStopButton"
        );


    if (emergencyButton) {

        emergencyButton.addEventListener(
            "click",
            toggleEmergency
        );

    }

}


// ============================================================
// START
// ============================================================

initializeNavigation();

initializeButtons();

updateClock();

updateDashboard();


// ============================================================
// CLOCK UPDATE
// ============================================================

setInterval(
    updateClock,
    1000
);


// ============================================================
// DASHBOARD UPDATE
// ============================================================

setInterval(
    updateDashboard,
    1000
);
