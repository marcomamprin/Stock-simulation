document.getElementById("darkModeToggle").addEventListener("click", function () {
    let darkMode = document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", darkMode);
    updatePlotTheme();
});

function updatePlotTheme() {
    let template = document.body.classList.contains("dark-mode") ? "plotly_dark" : "plotly_white";
    let plotBgColor = document.body.classList.contains("dark-mode") ? "#222" : "#fff";
    let fontColor = document.body.classList.contains("dark-mode") ? "#f4f4f4" : "#333";

    Plotly.relayout("plot", { 
        template, 
        "paper_bgcolor": plotBgColor, 
        "plot_bgcolor": plotBgColor,
        "font.color": fontColor,
        "xaxis.color": fontColor,
        "yaxis.color": fontColor
    });
}

if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
    updatePlotTheme(); // Ensure the plot theme is updated on load
}

const indexData = {
    "S&P500": { mu: 10.0, sigma: 15.0 },
    "NASDAQ": { mu: 12.0, sigma: 20.0 },
    "DOWJONES": { mu: 8.0, sigma: 12.0 },
    "FTSE100": { mu: 7.0, sigma: 10.0 },
    "DAX": { mu: 9.0, sigma: 14.0 },
    "CAC40": { mu: 8.0, sigma: 13.0 },
    "NIKKEI225": { mu: 6.0, sigma: 18.0 },
    "SSE": { mu: 5.0, sigma: 20.0 },
    "US10Y": { mu: 2.0, sigma: 5.0 },
    "EU10Y": { mu: 1.5, sigma: 4.0 },
    "JP10Y": { mu: 0.5, sigma: 3.0 }
};

document.getElementById("indexSelect").addEventListener("change", function () {
    let selectedIndex = this.value;
    console.log("Selected index:", selectedIndex); // Debug line to check the selected value
    if (indexData[selectedIndex]) {
        document.getElementById("mu").value = indexData[selectedIndex].mu.toFixed(1);
        document.getElementById("sigma").value = indexData[selectedIndex].sigma.toFixed(1);
        document.getElementById("mu").disabled = true;
        document.getElementById("sigma").disabled = true;
    } else {
        document.getElementById("mu").disabled = false;
        document.getElementById("sigma").disabled = false;
    }
});

// Generate normally distributed random numbers
function randomNormal() {
    let u = Math.random(), v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Simulate stock prices with deposits
function simulateStockPrices(S0, mu, sigma, N, dt, deposit, depositFreq) {
    if (S0 <= 0 || sigma < 0 || N <= 0 || dt <= 0 || deposit < 0) {
        throw new Error("Invalid input parameters for stock simulation.");
    }

    let stockPrices = [S0];
    let depositInterval = depositFreq === "daily" ? 1 : depositFreq === "monthly" ? 21 : 252; // Convert to daily steps

    for (let i = 1; i < N; i++) {
        let dW = Math.sqrt(dt) * randomNormal();
        let logReturn = (mu - 0.5 * sigma ** 2) * dt + sigma * dW;
        let newPrice = stockPrices[i - 1] * Math.exp(logReturn);

        if (i % depositInterval === 0) {
            newPrice += deposit;
        }

        stockPrices.push(newPrice);
    }
    return stockPrices;
}

// Get user inputs from the form
function getUserInputs() {
    try {
        let numStocks = getValidNumber("numStocks", 10);
        let T = parseFloat(document.getElementById("timePeriod").value);
        let S0 = parseFloat(document.getElementById("initialPrice").value);
        let mu = parseFloat(document.getElementById("mu").value) / 100;
        let sigma = parseFloat(document.getElementById("sigma").value) / 100;
        let deposit = parseFloat(document.getElementById("depositAmount").value);
        let depositFreq = document.getElementById("depositFrequency").value;

        if (isNaN(T) || isNaN(S0) || isNaN(mu) || isNaN(sigma) || isNaN(deposit)) {
            throw new Error("Invalid input values. Please check your inputs.");
        }
        return { numStocks, T, S0, mu, sigma, deposit, depositFreq };
    } catch (error) {
        alert(error.message);
        throw error;
    }
}

// Generate dates for market simulation
function generateMarketDates(N) {
    let today = new Date();
    return Array.from({ length: N }, (_, i) => {
        let d = new Date(today);
        d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
    });
}

// Simulate stock prices and update UI
async function simulate() {
    let { numStocks, T, S0, mu, sigma, deposit, depositFreq } = getUserInputs();
    let dt = 1 / 252;
    let N = Math.round(T / dt);
    let traces = [];
    let stockReturns = [];

    await Promise.all(Array.from({ length: numStocks }, async () => {
        let stockPath = simulateStockPrices(S0, mu, sigma, N, dt, deposit, depositFreq);
        stockReturns.push(stockPath);
        traces.push({ x: generateMarketDates(N), y: stockPath, type: "scatter", mode: "lines", line: { width: 1 }, opacity: numStocks > 20 ? 0.2 : 0.5 });
    }));

    updateUI(stockReturns, traces, T);
    document.getElementById("savePdfButton").style.display = "block"; // Show the Save as PDF button
}

// Update UI elements and plot results
function updateUI(stockReturns, traces, T) {
    let layout = {
        title: "Simulated Portfolio Price Over Time",
        xaxis: { title: "Date", type: "date" },
        yaxis: { title: "Portfolio Price" },
        showlegend: false,
        template: document.body.classList.contains("dark-mode") ? "plotly_dark" : "plotly_white",
        paper_bgcolor: document.body.classList.contains("dark-mode") ? "#222" : "#fff",
        plot_bgcolor: document.body.classList.contains("dark-mode") ? "#222" : "#fff",
        font: { color: document.body.classList.contains("dark-mode") ? "#f4f4f4" : "#333" },
        xaxis: { color: document.body.classList.contains("dark-mode") ? "#f4f4f4" : "#333" },
        yaxis: { color: document.body.classList.contains("dark-mode") ? "#f4f4f4" : "#333" }
    };

    updatePerformanceAndUI(stockReturns, T);

    Plotly.newPlot("plot", traces, layout);
}

// Separate function for updating performance and UI elements
function updatePerformanceAndUI(stockReturns, T) {
    let { lastAvgTop10, lastAvgBottom10, lastMedian } = updatePerformanceTable(stockReturns, T);
    updateTotalReturns(lastAvgTop10, lastAvgBottom10, lastMedian);

    document.getElementById("performanceTableContainer").style.display = "block";
    document.getElementById("totalPortfolioValueContainer").style.display = "block";
    document.getElementById("plotContainer").style.display = "block";
    document.getElementById("plot").style.display = "block";
}




function getValidNumber(id, defaultValue) {
    let value = parseFloat(document.getElementById(id).value);
    return isNaN(value) || value < 0 ? defaultValue : value;
}

function showLoading(state) {
    let plotDiv = document.getElementById("plot");
    plotDiv.innerHTML = state ? "<p>🔄 Running simulation...</p>" : "";
}

function validateInteger(input, minValue, maxValue) {
    let value = parseInt(input.value);
    if (isNaN(value) || value < minValue) {
        input.value = minValue;
    } else if (value > maxValue) {
        input.value = maxValue;
    } else {
        input.value = Math.floor(value); // Ensure the value is an integer
    }
}

function validateDecimal(input, minValue, maxValue, n_decimals) {
    let value = parseFloat(input.value);
    if (isNaN(value) || value < minValue) {
        input.value = minValue.toFixed(1);
    } else if (value > maxValue) {
        input.value = maxValue.toFixed(1);
    } else {
        input.value = value.toFixed(n_decimals); // Ensure the value has one decimal place
    }
}

function formatNumberWithCommas(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Update performance table
function updatePerformanceTable(stockReturns, years) {
    let tableBody = document.querySelector("#performanceTable tbody");
    tableBody.innerHTML = ""; // Clear table

    let yearlySteps = Math.floor(stockReturns[0].length / years);
    
    // Get the current year
    let currentYear = new Date().getFullYear();
    let lastAvgTop10, lastAvgBottom10, lastMedian;
    
    for (let year = currentYear; year < currentYear + years; year++) {
        let yearIndex = Math.min((year - currentYear + 1) * yearlySteps - 1, stockReturns[0].length - 1);
        
        let finalValues = stockReturns.map(path => path[yearIndex]);
        finalValues.sort((a, b) => a - b);

        let top10Index = Math.floor(finalValues.length * 0.9);
        let bottom10Index = Math.floor(finalValues.length * 0.1);
        let medianIndex = Math.floor(finalValues.length / 2);

        let avgTop10 = finalValues.slice(top10Index).reduce((a, b) => a + b, 0) / (finalValues.length - top10Index);
        let avgBottom10 = finalValues.slice(0, bottom10Index).reduce((a, b) => a + b, 0) / bottom10Index;
        let median = finalValues.length % 2 === 0 ? (finalValues[medianIndex - 1] + finalValues[medianIndex]) / 2 : finalValues[medianIndex];

        let row = `<tr><td>${year}</td><td>€${formatNumberWithCommas(Math.round(avgTop10))}</td><td>€${formatNumberWithCommas(Math.round(median))}</td><td>€${formatNumberWithCommas(Math.round(avgBottom10))}</td></tr>`;
        tableBody.innerHTML += row;

        if (year === currentYear + years - 1) {
            lastAvgTop10 = avgTop10;
            lastAvgBottom10 = avgBottom10;
            lastMedian = median;
        }
    }
    return { lastAvgTop10, lastAvgBottom10, lastMedian };
}

function updateTotalReturns(lastAvgTop10, lastAvgBottom10, lastMedian) {
    let returnsContainer = document.getElementById("totalPortfolioValueContainer");
    returnsContainer.innerHTML = `
        <h2 style="text-align: center;">📈 Total Portfolio Value</h2>
        <table style="margin-left: auto; margin-right: auto;">
            <tr>
                <th style="text-align: right; padding-right: 20px;">Scenario</th>
                <th style="text-align: right;">Value</th>
            </tr>
            <tr>
                <td style="text-align: right; padding-right: 20px;" title="Best 10%">Optimistic Scenario</td>
                <td style="text-align: right;">€${formatNumberWithCommas(Math.round(lastAvgTop10))}</td>
            </tr>
            <tr>
                <td style="text-align: right; padding-right: 20px;" title="Computed as the median value">Average Scenario</td>
                <td style="text-align: right;">€${formatNumberWithCommas(Math.round(lastMedian))}</td>
            </tr>
            <tr>
                <td style="text-align: right; padding-right: 20px;" title="Worst 10%">Pessimistic Scenario</td>
                <td style="text-align: right;">€${formatNumberWithCommas(Math.round(lastAvgBottom10))}</td>
            </tr>
        </table>
    `;
}

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(8);
    doc.text("Portfolio Management Tool", 10, 10);
    doc.text(`Number of Simulations: ${document.getElementById("numStocks").value}`, 10, 15);
    doc.text(`Time Period (Years): ${document.getElementById("timePeriod").value}`, 10, 20);
    doc.text(`Initial Portfolio Price: ${document.getElementById("initialPrice").value}`, 10, 25);
    doc.text(`Additional Deposit: ${document.getElementById("depositAmount").value}`, 10, 30);
    doc.text(`Deposit Frequency: ${document.getElementById("depositFrequency").value}`, 10, 35);
    doc.text(`Expected Return: ${document.getElementById("mu").value}`, 10, 40);
    doc.text(`Volatility: ${document.getElementById("sigma").value}`, 10, 45);

    doc.text("Total Portfolio Value:", 10, 100);
    const plotElement = document.getElementById("plot").getElementsByTagName("canvas")[0];
    if (plotElement) {
        const plotImage = plotElement.toDataURL("image/png");
        doc.addImage(plotImage, 'PNG', 10, 110, 180, 80);
    }

    doc.addPage();
    doc.text("Performance Summary:", 10, 10);
    const table = document.getElementById("performanceTable");
    const rows = table.querySelectorAll("tr");
    let y = 20;
    rows.forEach(row => {
        const cells = row.querySelectorAll("th, td");
        let x = 10;
        cells.forEach(cell => {
            doc.text(cell.innerText, x, y);
            x += 50;
        });
        y += 10;
        if (y > 280) { // Add a new page if the content exceeds the page height
            doc.addPage();
            y = 20; // Reset y when a new page is added
        }
    });

    const now = new Date();
    const fileName = `portfolio_management_tool_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}.pdf`;
    doc.save(fileName);
}



// Run on load
document.getElementById("plotContainer").style.display = "none"; // Hide the plot container initially
document.getElementById("performanceTableContainer").style.display = "none"; // Hide the plot container initially
document.getElementById("returnsContainer").style.display = "none"; // Hide the returns container initially
document.getElementById("savePdfButton").style.display = "none"; // Hide the Save as PDF button initially