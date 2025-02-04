document.getElementById("darkModeToggle").addEventListener("click", function () {
    let darkMode = document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", darkMode);
    updatePlotTheme();
});

function updatePlotTheme() {
    let template = document.body.classList.contains("dark-mode") ? "plotly_dark" : "plotly_white";
    Plotly.relayout("plot", { template });
}

if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
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
    return {
        numStocks: getValidNumber("numStocks", 10),
        T: parseFloat(document.getElementById("timePeriod").value),
        S0: parseFloat(document.getElementById("initialPrice").value),
        mu: parseFloat(document.getElementById("mu").value) / 100,
        sigma: parseFloat(document.getElementById("sigma").value) / 100,
        deposit: parseFloat(document.getElementById("depositAmount").value),
        depositFreq: document.getElementById("depositFrequency").value
    };
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
function simulate() {
    let { numStocks, T, S0, mu, sigma, deposit, depositFreq } = getUserInputs();
    let dt = 1 / 252;
    let N = Math.round(T / dt);
    let traces = [];
    let stockReturns = [];
    
    for (let i = 0; i < numStocks; i++) {
        let stockPath = simulateStockPrices(S0, mu, sigma, N, dt, deposit, depositFreq);
        stockReturns.push(stockPath);
        traces.push({ x: generateMarketDates(N), y: stockPath, type: "scatter", mode: "lines", line: { width: 1 }, opacity: numStocks > 20 ? 0.2 : 0.5 });
    }

    updateUI(stockReturns, traces, T);
}

// Update UI elements and plot results
function updateUI(stockReturns, traces, T) {
    let layout = {
        title: "Simulated Portfolio Price Over Time",
        xaxis: { title: "Date", type: "date" },
        yaxis: { title: "Portfolio Price" },
        showlegend: false,
        template: document.body.classList.contains("dark-mode") ? "plotly_dark" : "plotly_white"
    };
    
    let { lastAvgTop10, lastAvgBottom10 } = updatePerformanceTable(stockReturns, T);
    updateTotalReturns(lastAvgTop10, lastAvgBottom10);
    
    document.getElementById("performanceTableContainer").style.display = "block";
    document.getElementById("returnsContainer").style.display = "block";
    document.getElementById("plotContainer").style.display = "block";
    document.getElementById("plot").style.display = "block";

    Plotly.newPlot("plot", traces, layout);
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

// Update performance table
function updatePerformanceTable(stockReturns, years) {
    let tableBody = document.querySelector("#performanceTable tbody");
    tableBody.innerHTML = ""; // Clear table

    let yearlySteps = Math.floor(stockReturns[0].length / years);
    
    // Get the current year
    let currentYear = new Date().getFullYear();
    let lastAvgTop10, lastAvgBottom10;
    
    for (let year = currentYear; year < currentYear + years; year++) {
        let yearIndex = Math.min((year - currentYear + 1) * yearlySteps - 1, stockReturns[0].length - 1);
        
        let finalValues = stockReturns.map(path => path[yearIndex]);
        finalValues.sort((a, b) => a - b);

        let top10Index = Math.floor(finalValues.length * 0.9);
        let bottom10Index = Math.floor(finalValues.length * 0.1);

        let avgTop10 = finalValues.slice(top10Index).reduce((a, b) => a + b, 0) / (finalValues.length - top10Index);
        let avgBottom10 = finalValues.slice(0, bottom10Index).reduce((a, b) => a + b, 0) / bottom10Index;

        let row = `<tr><td>${year}</td><td>€${Math.round(avgTop10)}</td><td>€${Math.round(avgBottom10)}</td></tr>`;
        tableBody.innerHTML += row;

        if (year === currentYear + years - 1) {
            lastAvgTop10 = avgTop10;
            lastAvgBottom10 = avgBottom10;
        }
    }
    return { lastAvgTop10, lastAvgBottom10 };
}

function updateTotalReturns(lastAvgTop10, lastAvgBottom10) {
   
    let returnsContainer = document.getElementById("returnsContainer");
    returnsContainer.innerHTML = `
        <h2>📈 Total Returns</h2>
        <p>Optimistic Scenarios 10% Avg Return: €${Math.round(lastAvgTop10)}</p>
        <p>Pessimistic Scenarios 10% Avg Return: €${Math.round(lastAvgBottom10)}</p>
    `;
}

// Run on load
document.getElementById("plotContainer").style.display = "none"; // Hide the plot container initially
document.getElementById("performanceTableContainer").style.display = "none"; // Hide the plot container initially
document.getElementById("returnsContainer").style.display = "none"; // Hide the returns container initially