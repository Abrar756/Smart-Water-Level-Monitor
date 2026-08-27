// ============================================================
// SMART WATER MONITOR
// COMPLETE FRONTEND CONTROLLER
// ============================================================


// ============================================================
// GRAPH DATA
// ============================================================

const graphData = [];

const MAX_GRAPH_POINTS = 60;


// ============================================================
// HISTORY DATA
// ============================================================

const historyData = [];

const MAX_HISTORY_POINTS = 500;


// ============================================================
// ALERT STATE
// ============================================================

let lastAlertType = null;

let lastAlertActive = false;


// ============================================================
// PAGE INFORMATION
// ============================================================

const pageInformation = {

    homePage: {

        title: "Home",

        subtitle:
            "Water Management Overview"

    },

    monitorPage: {

        title: "Live Monitor",

        subtitle:
            "Real-Time Water System Information"

    },

    historyPage: {

        title: "History",

        subtitle:
            "Recent System Readings"

    },

    alertsPage: {

        title: "Alerts",

        subtitle:
            "System Conditions and Alert History"

    },

    emergencyPage: {

        title: "Emergency",

        subtitle:
            "Safety Control"

    },

    analyticsPage: {

        title: "Analytics",

        subtitle:
            "Water System Statistics"

    },

    settingsPage: {

        title: "Settings",

        subtitle:
            "System Configuration"

    }

};


// ============================================================
// DOM READY
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        setupNavigation();

        setupEmergencyButton();

        setupConsumptionButton();

        setupHistoryButton();

        setupSettingsControls();

        updateClock();

        updateDashboard();

    }
);


// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    const pages =
        document.querySelectorAll(
            ".app-page"
        );


    const sidebar =
        document.getElementById(
            "sidebar"
        );


    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );


    const menuButton =
        document.getElementById(
            "menuButton"
        );


    const closeSidebar =
        function() {

            if (sidebar) {

                sidebar.classList.remove(
                    "open"
                );

            }

            if (overlay) {

                overlay.classList.remove(
                    "active"
                );

            }

        };


    const openSidebar =
        function() {

            if (sidebar) {

                sidebar.classList.add(
                    "open"
                );

            }

            if (overlay) {

                overlay.classList.add(
                    "active"
                );

            }

        };


    if (menuButton) {

        menuButton.addEventListener(
            "click",
            function() {

                if (
                    sidebar &&
                    sidebar.classList.contains(
                        "open"
                    )
                ) {

                    closeSidebar();

                }

                else {

                    openSidebar();

                }

            }
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeSidebar
        );

    }


    navItems.forEach(
        function(item) {

            item.addEventListener(
                "click",
                function() {

                    const pageId =
                        item.dataset.page;


                    if (!pageId) {

                        return;

                    }


                    navItems.forEach(
                        function(nav) {

                            nav.classList.remove(
                                "active"
                            );

                        }
                    );


                    item.classList.add(
                        "active"
                    );


                    pages.forEach(
                        function(page) {

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


                    updatePageHeader(
                        pageId
                    );


                    closeSidebar();


                    setTimeout(
                        function() {

                            drawWaterGraph();

                        },
                        50
                    );

                }
            );

        }
    );

}


// ============================================================
// PAGE HEADER
// ============================================================

function updatePageHeader(
    pageId
) {

    const title =
        document.getElementById(
            "pageTitle"
        );


    const subtitle =
        document.getElementById(
            "pageSubtitle"
        );


    const info =
        pageInformation[
            pageId
        ];


    if (!info) {

        return;

    }


    if (title) {

        title.textContent =
            info.title;

    }


    if (subtitle) {

        subtitle.textContent =
            info.subtitle;

    }

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


        const waterLevel =
            Number(
                data.waterLevel
            );


        updateElementText(
            "waterLevel",
            waterLevel.toFixed(2) + "%"
        );


        updateElementText(
            "waterFillText",
            waterLevel.toFixed(2) + "%"
        );


        const waterFill =
            document.getElementById(
                "waterFill"
            );


        if (waterFill) {

            waterFill.style.height =
                waterLevel + "%";

        }


        const homeLevelBar =
            document.getElementById(
                "homeLevelBar"
            );


        if (homeLevelBar) {

            homeLevelBar.style.width =
                waterLevel + "%";

        }


        const monitorLevelBar =
            document.getElementById(
                "monitorLevelBar"
            );


        if (monitorLevelBar) {

            monitorLevelBar.style.width =
                waterLevel + "%";

        }


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


        updateTankBadge(
            data.tank
        );


        updatePumpDisplay(
            data.pump
        );


        updateModeDisplay(
            data.mode
        );


        const runtime =
            formatRuntime(
                data.runtime
            );


        updateElementText(
            "runtime",
            runtime
        );


        updateElementText(
            "homeRuntime",
            runtime
        );


        updateElementText(
            "monitorPumpRuntime",
            "Runtime: " + runtime
        );


        updateSourceWater(
            data.sourceWater,
            data.sourceWaterLevel
        );


        updateConsumption(
            data.consumption
        );


        updateHomeQuickStatus(
            data
        );


        updateMonitorPage(
            data
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


        updateHistory(
            data
        );


        updateAnalytics();


        updateEmergencyPage(
            data
        );


        // IMPORTANT:
        // Settings are updated from the backend response.

        updateSettingsDisplay(
            data.settings
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
// HELPER — UPDATE TEXT
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


    if (!area) {

        return;

    }


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


    const left = 40;

    const right = 15;

    const top = 15;

    const bottom = 25;


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
        function(level) {

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


    const points = [];


    graphData.forEach(
        function(value, index) {

            const divisor =
                Math.max(
                    1,
                    MAX_GRAPH_POINTS - 1
                );


            const x =
                left +
                (
                    index /
                    divisor
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
        function(point) {

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


    ctx.beginPath();


    points.forEach(
        function(point, index) {

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


    const monitorStatus =
        document.getElementById(
            "monitorPumpStatus"
        );


    if (pumpOn) {

        if (status) {

            status.textContent =
                "ON";

            status.className =
                "pump-state on";

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


        if (monitorStatus) {

            monitorStatus.textContent =
                "ON";

        }

    }

    else {

        if (status) {

            status.textContent =
                "OFF";

            status.className =
                "pump-state";

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


        if (monitorStatus) {

            monitorStatus.textContent =
                "OFF";

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


    if (modeElement) {

        modeElement.textContent =
            mode;

    }


    if (modeCard) {

        modeCard.textContent =
            mode;

    }


    if (topMode) {

        topMode.textContent =
            mode;

    }


    const monitorMode =
        document.getElementById(
            "monitorMode"
        );


    if (monitorMode) {

        monitorMode.textContent =
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


    const conditionElement =
        document.getElementById(
            "tankCondition"
        );


    const conditionDescription =
        document.querySelector(
            ".condition-description"
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


    if (conditionElement) {

        conditionElement.textContent =
            condition;

    }


    if (conditionDescription) {

        if (condition === "LOW") {

            conditionDescription.textContent =
                "Tank water level is low. Pump may need to refill the tank.";

        }

        else if (
            condition === "FULL"
        ) {

            conditionDescription.textContent =
                "Tank is full and the water level is at or above the pump OFF level.";

        }

        else {

            conditionDescription.textContent =
                "Tank level is currently within the normal operating range.";

        }

    }


    updateElementText(
        "monitorTankCondition",
        condition
    );


    updateElementText(
        "monitorTankStatus",
        condition
    );

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


    const monitorSourceWater =
        document.getElementById(
            "monitorSourceWater"
        );


    const monitorSourceBar =
        document.getElementById(
            "monitorSourceBar"
        );


    const monitorSourceLevel =
        document.getElementById(
            "monitorSourceLevel"
        );


    const homeSourceWater =
        document.getElementById(
            "homeSourceWater"
        );


    if (
        sourceLevel !== null &&
        sourceLevel !== undefined
    ) {

        const numericLevel =
            Number(
                sourceLevel
            );


        if (
            !Number.isNaN(
                numericLevel
            )
        ) {

            if (monitorSourceBar) {

                monitorSourceBar.style.width =
                    numericLevel + "%";

            }


            if (monitorSourceLevel) {

                monitorSourceLevel.textContent =
                    "Level: " +
                    numericLevel.toFixed(2) +
                    "%";

            }

        }

    }


    if (sourceAvailable) {

        if (
            sourceLevel !== null &&
            sourceLevel !== undefined &&
            !Number.isNaN(
                Number(sourceLevel)
            )
        ) {

            if (sourceWater) {

                sourceWater.textContent =
                    Number(
                        sourceLevel
                    ).toFixed(2) +
                    "%";

                sourceWater.className =
                    "info-value green-text";

                sourceWater.style.color =
                    "";

            }

        }

        else if (sourceWater) {

            sourceWater.textContent =
                "AVAILABLE";

            sourceWater.className =
                "info-value green-text";

            sourceWater.style.color =
                "";

        }


        if (sourceDescription) {

            sourceDescription.textContent =
                "Source tank water available";

        }


        if (sourceButton) {

            sourceButton.style.display =
                "none";

        }


        if (monitorSourceWater) {

            monitorSourceWater.textContent =
                "AVAILABLE";

        }


        if (homeSourceWater) {

            homeSourceWater.textContent =
                "AVAILABLE";

            homeSourceWater.className =
                "healthy-text";

        }

    }

    else {

        if (sourceWater) {

            sourceWater.textContent =
                "NOT AVAILABLE";

            sourceWater.className =
                "info-value";

            sourceWater.style.color =
                "#c62828";

        }


        if (sourceDescription) {

            sourceDescription.textContent =
                "Source tank is empty";

        }


        if (sourceButton) {

            sourceButton.style.display =
                "none";

        }


        if (monitorSourceWater) {

            monitorSourceWater.textContent =
                "UNAVAILABLE";

        }


        if (homeSourceWater) {

            homeSourceWater.textContent =
                "UNAVAILABLE";

            homeSourceWater.className =
                "";

        }

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


    const homeConsumption =
        document.getElementById(
            "homeConsumption"
        );


    const monitorConsumption =
        document.getElementById(
            "monitorConsumption"
        );


    if (consumptionOn) {

        if (status) {

            status.textContent =
                "ON";

            status.className =
                "status-badge on";

        }


        if (button) {

            button.textContent =
                "TURN OFF";

            button.dataset.state =
                "ON";

        }


        if (description) {

            description.textContent =
                "Water is being consumed automatically";

        }


        if (homeConsumption) {

            homeConsumption.textContent =
                "ON";

            homeConsumption.className =
                "healthy-text";

        }


        if (monitorConsumption) {

            monitorConsumption.textContent =
                "Consumption: ON";

        }

    }

    else {

        if (status) {

            status.textContent =
                "OFF";

            status.className =
                "status-badge off";

        }


        if (button) {

            button.textContent =
                "TURN ON";

            button.dataset.state =
                "OFF";

        }


        if (description) {

            description.textContent =
                "Water consumption is stopped";

        }


        if (homeConsumption) {

            homeConsumption.textContent =
                "OFF";

            homeConsumption.className =
                "";

        }


        if (monitorConsumption) {

            monitorConsumption.textContent =
                "Consumption: OFF";

        }

    }

}


// ============================================================
// SETUP CONSUMPTION BUTTON
// ============================================================

function setupConsumptionButton() {

    const button =
        document.getElementById(
            "consumptionButton"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        toggleConsumption
    );

}


// ============================================================
// TOGGLE CONSUMPTION
// ============================================================

async function toggleConsumption() {

    try {

        const statusResponse =
            await fetch(
                "/api/status",
                {
                    cache: "no-store"
                }
            );


        if (!statusResponse.ok) {

            throw new Error(
                "Could not get system status."
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

            showMessage(
                result.message,
                "error"
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


        showMessage(
            "Could not communicate with server.",
            "error"
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
            '<span class="connection-text">CONNECTED</span>';


        element.className =
            "connection connected";

    }

    else {

        element.innerHTML =
            '<span class="connection-dot"></span>' +
            '<span class="connection-text">DISCONNECTED</span>';


        element.className =
            "connection disconnected";

    }


    updateElementText(
        "monitorConnection",
        connected
            ? "CONNECTED"
            : "DISCONNECTED"
    );

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

    const alert =
        data.alert || {

            active: false,

            type: "NORMAL",

            severity: "normal",

            title: "No Active Alerts",

            message:
                "All monitored conditions are currently normal."

        };


    const homeAlert =
        document.getElementById(
            "alerts"
        );


    const alertCard =
        document.getElementById(
            "additionalAlertStatus"
        );


    const alertTitle =
        document.getElementById(
            "additionalAlertTitle"
        );


    const alertDescription =
        document.getElementById(
            "additionalAlertDescription"
        );


    const alertIcon =
        document.querySelector(
            ".alert-large-icon"
        );


    if (homeAlert) {

        homeAlert.className =
            "home-alert";


        if (
            alert.severity === "critical"
        ) {

            homeAlert.classList.add(
                "emergency-alert"
            );

        }

        else if (
            alert.severity === "warning"
        ) {

            homeAlert.classList.add(
                "warning-alert"
            );

        }

        else if (
            alert.severity === "info"
        ) {

            homeAlert.classList.add(
                "info-alert"
            );

        }

        else {

            homeAlert.classList.add(
                "normal-alert"
            );

        }


        const icon =
            getAlertIcon(
                alert.type
            );


        homeAlert.innerHTML =
            "<span>" +
            icon +
            "</span>" +
            "<strong>" +
            escapeHtml(
                alert.title
            ) +
            "</strong>";

    }


    if (alertTitle) {

        alertTitle.textContent =
            alert.title;

    }


    if (alertDescription) {

        alertDescription.textContent =
            alert.message;

    }


    if (alertIcon) {

        alertIcon.textContent =
            getAlertIcon(
                alert.type
            );

    }


    if (alertCard) {

        alertCard.className =
            "card current-alert-card";


        if (
            alert.severity === "critical"
        ) {

            alertCard.classList.add(
                "critical-alert"
            );

        }

        else if (
            alert.severity === "warning"
        ) {

            alertCard.classList.add(
                "warning-alert"
            );

        }

        else if (
            alert.severity === "info"
        ) {

            alertCard.classList.add(
                "info-alert"
            );

        }

        else {

            alertCard.classList.add(
                "normal-alert"
            );

        }

    }


    updateAlertBadge(
        data
    );


    updateAlertHistory(
        data.alertHistory || []
    );


    lastAlertType =
        alert.type;

    lastAlertActive =
        alert.active;

}


// ============================================================
// ALERT ICON
// ============================================================

function getAlertIcon(
    type
) {

    switch (type) {

        case "EMERGENCY":
            return "🚨";

        case "SOURCE_UNAVAILABLE":
            return "⚠";

        case "CRITICAL_LOW":
            return "⚠";

        case "LOW_WATER":
            return "⚠";

        case "TANK_FULL":
            return "✓";

        case "PUMP_RUNNING":
            return "●";

        default:
            return "✓";

    }

}


// ============================================================
// ALERT BADGE
// ============================================================

function updateAlertBadge(
    data
) {

    const badge =
        document.getElementById(
            "navAlertBadge"
        );


    if (!badge) {

        return;

    }


    const alert =
        data.alert;


    if (
        !alert ||
        alert.type === "NORMAL"
    ) {

        badge.style.display =
            "none";

        badge.textContent =
            "0";

        return;

    }


    if (
        alert.type === "PUMP_RUNNING"
    ) {

        badge.style.display =
            "none";

        badge.textContent =
            "0";

        return;

    }


    badge.textContent =
        "1";


    badge.style.display =
        "inline-flex";

}


// ============================================================
// ALERT HISTORY
// ============================================================

function updateAlertHistory(
    history
) {

    const container =
        document.getElementById(
            "alertHistoryList"
        );


    if (!container) {

        return;

    }


    if (
        !Array.isArray(history) ||
        history.length === 0
    ) {

        container.innerHTML =
            '<div class="empty-state">' +
            'No alert history recorded yet.' +
            '</div>';

        return;

    }


    container.innerHTML =
        history.map(
            function(item) {

                const severity =
                    item.severity ||
                    "normal";


                const event =
                    item.event ||
                    "ACTIVATED";


                const icon =
                    event === "RESOLVED"
                        ? "✓"
                        : getAlertIcon(
                            item.type
                        );


                return (

                    '<div class="alert-history-item ' +
                    escapeHtml(
                        severity
                    ) +
                    '">' +

                    '<div class="alert-history-icon">' +
                    icon +
                    '</div>' +

                    '<div class="alert-history-content">' +

                    '<strong>' +
                    escapeHtml(
                        item.title
                    ) +
                    '</strong>' +

                    '<p>' +
                    escapeHtml(
                        item.message
                    ) +

                    '</p>' +

                    '<small>' +
                    escapeHtml(
                        item.time || "--:--:--"
                    ) +
                    " • " +
                    escapeHtml(
                        event
                    ) +

                    '</small>' +

                    '</div>' +

                    '</div>'

                );

            }
        ).join("");

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


    const homeHealth =
        document.getElementById(
            "homeSystemHealth"
        );


    const monitorEmergency =
        document.getElementById(
            "monitorEmergency"
        );


    if (monitorEmergency) {

        monitorEmergency.textContent =
            data.emergency
                ? "ACTIVE"
                : "INACTIVE";

    }


    const warning =
        data.emergency ||
        !data.connected ||
        !data.sourceWater;


    if (health) {

        if (warning) {

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


    if (homeHealth) {

        if (warning) {

            homeHealth.textContent =
                "WARNING";

            homeHealth.className =
                "";

        }

        else {

            homeHealth.textContent =
                "HEALTHY";

            homeHealth.className =
                "healthy-text";

        }

    }

}


// ============================================================
// HOME QUICK STATUS
// ============================================================

function updateHomeQuickStatus(
    data
) {

    updateElementText(
        "homeSourceWater",
        data.sourceWater
            ? "AVAILABLE"
            : "UNAVAILABLE"
    );


    updateElementText(
        "homeConsumption",
        data.consumption
            ? "ON"
            : "OFF"
    );


    updateElementText(
        "homeRuntime",
        formatRuntime(
            data.runtime
        )
    );


    updateElementText(
        "homeSystemHealth",
        (
            data.emergency ||
            !data.connected ||
            !data.sourceWater
        )
            ? "WARNING"
            : "HEALTHY"
    );

}


// ============================================================
// LIVE MONITOR
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
        "monitorMode",
        data.mode
    );


    updateElementText(
        "monitorPumpStatus",
        data.pump
            ? "ON"
            : "OFF"
    );


    updateElementText(
        "monitorConsumption",
        "Consumption: " +
        (
            data.consumption
                ? "ON"
                : "OFF"
        )
    );


    updateElementText(
        "monitorLastUpdate",
        new Date().toLocaleTimeString()
    );

}


// ============================================================
// HISTORY
// ============================================================

function updateHistory(
    data
) {

    historyData.push({

        time:
            new Date().toLocaleTimeString(),

        water:
            Number(
                data.waterLevel
            ),

        pump:
            data.pump
                ? "ON"
                : "OFF",

        mode:
            data.mode,

        tank:
            data.tank

    });


    if (
        historyData.length >
        MAX_HISTORY_POINTS
    ) {

        historyData.shift();

    }


    updateElementText(
        "historyPointCount",
        historyData.length
    );


    if (
        historyData.length === 0
    ) {

        return;

    }


    const values =
        historyData.map(
            function(item) {

                return item.water;

            }
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


    const tbody =
        document.getElementById(
            "historyTableBody"
        );


    if (!tbody) {

        return;

    }


    const recent =
        historyData.slice(
            -50
        ).reverse();


    tbody.innerHTML =
        recent.map(
            function(item) {

                return (

                    "<tr>" +

                    "<td>" +
                    escapeHtml(
                        item.time
                    ) +
                    "</td>" +

                    "<td>" +
                    item.water.toFixed(2) +
                    "%</td>" +

                    "<td>" +
                    escapeHtml(
                        item.pump
                    ) +
                    "</td>" +

                    "<td>" +
                    escapeHtml(
                        item.mode
                    ) +
                    "</td>" +

                    "<td>" +
                    escapeHtml(
                        item.tank
                    ) +
                    "</td>" +

                    "</tr>"

                );

            }
        ).join("");

}


// ============================================================
// CLEAR HISTORY
// ============================================================

function setupHistoryButton() {

    const button =
        document.getElementById(
            "clearHistoryButton"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        function() {

            historyData.length =
                0;


            updateElementText(
                "historyPointCount",
                "0"
            );


            updateElementText(
                "historyHighestLevel",
                "--%"
            );


            updateElementText(
                "historyLowestLevel",
                "--%"
            );


            const tbody =
                document.getElementById(
                    "historyTableBody"
                );


            if (tbody) {

                tbody.innerHTML =
                    '<tr>' +
                    '<td colspan="5" class="empty-table">' +
                    'No history recorded yet.' +
                    '</td>' +
                    '</tr>';

            }

        }
    );

}


// ============================================================
// ANALYTICS
// ============================================================

function updateAnalytics() {

    if (
        historyData.length === 0
    ) {

        return;

    }


    const values =
        historyData.map(
            function(item) {

                return item.water;

            }
        );


    const sum =
        values.reduce(
            function(total, value) {

                return total + value;

            },
            0
        );


    const average =
        sum /
        values.length;


    const highest =
        Math.max(
            ...values
        );


    const lowest =
        Math.min(
            ...values
        );


    const pumpSamples =
        historyData.filter(
            function(item) {

                return item.pump === "ON";

            }
        ).length;


    updateElementText(
        "analyticsAverageLevel",
        average.toFixed(2) + "%"
    );


    updateElementText(
        "analyticsHighestLevel",
        highest.toFixed(2) + "%"
    );


    updateElementText(
        "analyticsLowestLevel",
        lowest.toFixed(2) + "%"
    );


    updateElementText(
        "analyticsPumpSamples",
        pumpSamples
    );


    updateElementText(
        "analyticsMinText",
        lowest.toFixed(2) + "%"
    );


    updateElementText(
        "analyticsAverageText",
        average.toFixed(2) + "%"
    );


    updateElementText(
        "analyticsMaxText",
        highest.toFixed(2) + "%"
    );


    setBarWidth(
        "analyticsMinBar",
        lowest
    );


    setBarWidth(
        "analyticsAverageBar",
        average
    );


    setBarWidth(
        "analyticsMaxBar",
        highest
    );

}


// ============================================================
// ANALYTICS BAR
// ============================================================

function setBarWidth(
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
// EMERGENCY BUTTON
// ============================================================

function setupEmergencyButton() {

    const button =
        document.getElementById(
            "emergencyStopButton"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        async function() {

            const confirmed =
                window.confirm(
                    "Activate emergency shutdown and stop the pump?"
                );


            if (!confirmed) {

                return;

            }


            try {

                const response =
                    await fetch(
                        "/api/emergency",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body: JSON.stringify({

                                command: "ON"

                            })

                        }
                    );


                const result =
                    await response.json();


                if (!result.success) {

                    showMessage(
                        result.message,
                        "error"
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


                showMessage(
                    "Could not communicate with server.",
                    "error"
                );

            }

        }
    );

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


    const stateMessage =
        document.getElementById(
            "emergencyStateMessage"
        );


    if (stateMessage) {

        stateMessage.textContent =
            data.emergency
                ? "Emergency state: ACTIVE"
                : "Emergency state: INACTIVE";

    }


    const button =
        document.getElementById(
            "emergencyStopButton"
        );


    if (button) {

        if (data.emergency) {

            button.textContent =
                "EMERGENCY ACTIVE";

            button.disabled =
                true;

        }

        else {

            button.textContent =
                "STOP PUMP";

            button.disabled =
                false;

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

            showMessage(
                result.message,
                "error"
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


        showMessage(
            "Could not communicate with server.",
            "error"
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

            showMessage(
                result.message,
                "error"
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


        showMessage(
            "Could not communicate with server.",
            "error"
        );

    }

}


// ============================================================
// SETTINGS
// ============================================================

function setupSettingsControls() {

    const saveButton =
        document.getElementById(
            "saveSettingsButton"
        );


    if (!saveButton) {

        return;

    }


    saveButton.addEventListener(
        "click",
        saveSettings
    );


    // --------------------------------------------------------
    // OPTIONAL RESET BUTTON
    // --------------------------------------------------------
    // If the HTML contains a reset button,
    // connect it automatically.

    const resetButton =
        document.getElementById(
            "resetSettingsButton"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetSettingsFromServer
        );

    }


    // --------------------------------------------------------
    // VALIDATION WHILE TYPING
    // --------------------------------------------------------

    const inputIds = [

        "autoPumpOnInput",

        "autoPumpOffInput",

        "consumptionRateInput",

        "pumpFillRateInput",

        "sourceRefillRateInput",

        "criticalLowInput"

    ];


    inputIds.forEach(
        function(id) {

            const input =
                document.getElementById(
                    id
                );


            if (!input) {

                return;

            }


            input.addEventListener(
                "input",
                function() {

                    validateSettingsInput(
                        input
                    );

                }
            );

        }
    );

}


// ============================================================
// UPDATE SETTINGS DISPLAY
// ============================================================

function updateSettingsDisplay(
    settings
) {

    if (!settings) {

        return;

    }


    updateSettingValue(
        "settingAutoOn",
        settings.autoPumpOnLevel,
        "%"
    );


    updateSettingValue(
        "settingAutoOff",
        settings.autoPumpOffLevel,
        "%"
    );


    updateSettingValue(
        "settingConsumptionRate",
        settings.consumptionRate,
        "% / sec"
    );


    updateSettingValue(
        "settingPumpFillRate",
        settings.pumpFillRate,
        "% / sec"
    );


    updateSettingValue(
        "settingSourceRefillRate",
        settings.sourceRefillRate,
        "% / sec"
    );


    updateSettingValue(
        "settingCriticalLow",
        settings.criticalLowLevel,
        "%"
    );


    // --------------------------------------------------------
    // INPUTS
    // --------------------------------------------------------

    setInputValue(
        "autoPumpOnInput",
        settings.autoPumpOnLevel
    );


    setInputValue(
        "autoPumpOffInput",
        settings.autoPumpOffLevel
    );


    setInputValue(
        "consumptionRateInput",
        settings.consumptionRate
    );


    setInputValue(
        "pumpFillRateInput",
        settings.pumpFillRate
    );


    setInputValue(
        "sourceRefillRateInput",
        settings.sourceRefillRate
    );


    setInputValue(
        "criticalLowInput",
        settings.criticalLowLevel
    );

}


// ============================================================
// SETTING DISPLAY VALUE
// ============================================================

function updateSettingValue(
    id,
    value,
    suffix
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return;

    }


    const numericValue =
        Number(value);


    if (
        Number.isNaN(
            numericValue
        )
    ) {

        element.textContent =
            "--" + suffix;

        return;

    }


    element.textContent =
        numericValue.toFixed(2) +
        suffix;

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


    if (!input) {

        return;

    }


    const numericValue =
        Number(value);


    if (
        Number.isNaN(
            numericValue
        )
    ) {

        return;

    }


    // Do not overwrite the field while
    // the user is currently typing in it.

    if (
        document.activeElement === input
    ) {

        return;

    }


    input.value =
        numericValue;

}


// ============================================================
// SETTINGS VALIDATION
// ============================================================

function validateSettingsInput(
    input
) {

    if (!input) {

        return false;

    }


    const value =
        Number(
            input.value
        );


    if (
        input.value === "" ||
        Number.isNaN(value)
    ) {

        input.classList.add(
            "invalid"
        );

        return false;

    }


    if (value < 0) {

        input.classList.add(
            "invalid"
        );

        return false;

    }


    // Percentage settings cannot exceed 100.

    const percentageInputs = [

        "autoPumpOnInput",

        "autoPumpOffInput",

        "criticalLowInput"

    ];


    if (
        percentageInputs.includes(
            input.id
        ) &&
        value > 100
    ) {

        input.classList.add(
            "invalid"
        );

        return false;

    }


    input.classList.remove(
        "invalid"
    );


    return true;

}


// ============================================================
// GET INPUT NUMBER
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


    const value =
        input.value.trim();


    if (value === "") {

        return NaN;

    }


    return Number(
        value
    );

}


// ============================================================
// VALIDATE COMPLETE SETTINGS
// ============================================================

function validateSettings(
    settings
) {

    const values =
        Object.values(
            settings
        );


    if (
        values.some(
            function(value) {

                return (
                    typeof value !== "number" ||
                    !Number.isFinite(value)
                );

            }
        )
    ) {

        return {
            valid: false,
            message:
                "Please enter valid numbers in all settings fields."
        };

    }


    // --------------------------------------------------------
    // RANGE CHECKS
    // --------------------------------------------------------

    if (
        settings.autoPumpOnLevel < 0 ||
        settings.autoPumpOnLevel > 100
    ) {

        return {
            valid: false,
            message:
                "Automatic pump ON level must be between 0% and 100%."
        };

    }


    if (
        settings.autoPumpOffLevel < 0 ||
        settings.autoPumpOffLevel > 100
    ) {

        return {
            valid: false,
            message:
                "Automatic pump OFF level must be between 0% and 100%."
        };

    }


    if (
        settings.criticalLowLevel < 0 ||
        settings.criticalLowLevel > 100
    ) {

        return {
            valid: false,
            message:
                "Critical low level must be between 0% and 100%."
        };

    }


    if (
        settings.consumptionRate < 0
    ) {

        return {
            valid: false,
            message:
                "Consumption rate cannot be negative."
        };

    }


    if (
        settings.pumpFillRate < 0
    ) {

        return {
            valid: false,
            message:
                "Pump fill rate cannot be negative."
        };

    }


    if (
        settings.sourceRefillRate < 0
    ) {

        return {
            valid: false,
            message:
                "Source refill rate cannot be negative."
        };

    }


    // --------------------------------------------------------
    // LOGICAL CHECK
    // --------------------------------------------------------

    if (
        settings.autoPumpOnLevel >=
        settings.autoPumpOffLevel
    ) {

        return {
            valid: false,
            message:
                "Pump ON level must be lower than pump OFF level."
        };

    }


    return {
        valid: true,
        message: ""
    };

}


// ============================================================
// SAVE SETTINGS
// ============================================================

async function saveSettings() {

    const saveButton =
        document.getElementById(
            "saveSettingsButton"
        );


    const payload = {

        autoPumpOnLevel:
            getInputNumber(
                "autoPumpOnInput"
            ),

        autoPumpOffLevel:
            getInputNumber(
                "autoPumpOffInput"
            ),

        consumptionRate:
            getInputNumber(
                "consumptionRateInput"
            ),

        pumpFillRate:
            getInputNumber(
                "pumpFillRateInput"
            ),

        sourceRefillRate:
            getInputNumber(
                "sourceRefillRateInput"
            ),

        criticalLowLevel:
            getInputNumber(
                "criticalLowInput"
            )

    };


    // --------------------------------------------------------
    // VALIDATE
    // --------------------------------------------------------

    const validation =
        validateSettings(
            payload
        );


    if (!validation.valid) {

        showMessage(
            validation.message,
            "error"
        );

        return;

    }


    // --------------------------------------------------------
    // DISABLE BUTTON WHILE SAVING
    // --------------------------------------------------------

    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.dataset.originalText =
            saveButton.textContent;

        saveButton.textContent =
            "SAVING...";

    }


    try {

        const response =
            await fetch(
                "/api/settings",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            payload
                        )

                }
            );


        if (!response.ok) {

            throw new Error(
                "Server returned HTTP " +
                response.status
            );

        }


        const result =
            await response.json();


        if (!result.success) {

            showMessage(
                result.message ||
                "Settings could not be saved.",
                "error"
            );

            return;

        }


        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        showMessage(
            "Settings saved successfully.",
            "success"
        );


        // If backend returns updated settings,
        // immediately display them.

        if (result.settings) {

            updateSettingsDisplay(
                result.settings
            );

        }


        // Refresh entire dashboard so the new
        // settings immediately affect the system.

        await updateDashboard();

    }

    catch (error) {

        console.error(
            "Settings error:",
            error
        );


        showMessage(
            "Could not save settings. Please check the server connection.",
            "error"
        );

    }

    finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                saveButton.dataset.originalText ||
                "SAVE SETTINGS";

        }

    }

}


// ============================================================
// RESET SETTINGS FROM SERVER
// ============================================================

async function resetSettingsFromServer() {

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
                "Could not load settings."
            );

        }


        const data =
            await response.json();


        if (!data.settings) {

            showMessage(
                "No settings were returned by the server.",
                "error"
            );

            return;

        }


        updateSettingsDisplay(
            data.settings
        );


        showMessage(
            "Settings reset to the current server values.",
            "success"
        );

    }

    catch (error) {

        console.error(
            "Reset settings error:",
            error
        );


        showMessage(
            "Could not load current settings.",
            "error"
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
// DASHBOARD UPDATE
// ============================================================

setInterval(
    updateDashboard,
    1000
);


// ============================================================
// SOURCE WATER SIMULATION
// ============================================================

async function toggleSourceWater() {

    try {

        const statusResponse =
            await fetch(
                "/api/status",
                {
                    cache: "no-store"
                }
            );


        const data =
            await statusResponse.json();


        const newState =
            !data.sourceWater;


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

            showMessage(
                result.message,
                "error"
            );

            return;

        }


        await updateDashboard();

    }

    catch (error) {

        console.error(
            "Source water error:",
            error
        );


        showMessage(
            "Could not communicate with server.",
            "error"
        );

    }

}


// ============================================================
// SHOW MESSAGE
// ============================================================

function showMessage(
    message,
    type = "info"
) {

    console.log(
        type.toUpperCase() +
        ": " +
        message
    );


    window.alert(
        message
    );

}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(
    value
) {

    return String(
        value
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}
