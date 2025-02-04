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

// Generate stock paths and plot
function simulate() {
    let numStocks = getValidNumber("numStocks", 10);
    let T = parseFloat(document.getElementById("timePeriod").value);
    let S0 = parseFloat(document.getElementById("initialPrice").value);
    let mu = parseFloat(document.getElementById("mu").value/100);
    let sigma = parseFloat(document.getElementById("sigma").value/100);
    let deposit = parseFloat(document.getElementById("depositAmount").value);
    let depositFreq = document.getElementById("depositFrequency").value;

    let dt = 1 / 252;
    let N = Math.round(T / dt);
    let traces = [];
    let stockReturns = [];

    let today = new Date();

    for (let i = 0; i < numStocks; i++) {
        let stockPath = simulateStockPrices(S0, mu, sigma, N, dt, deposit, depositFreq);
        stockReturns.push(stockPath);

        let dates = Array.from({ length: N }, (_, i) => {
            let d = new Date(today);
            d.setDate(d.getDate() + i);
            return d.toISOString().split('T')[0];
        });

        traces.push({ x: dates, y: stockPath, type: "scatter", mode: "lines", line: { width: 1 }, opacity: numStocks > 20 ? 0.2 : 0.5 });
    }

    let layout = {
        title: "Simulated Portfolio Price Over Time",
        xaxis: { title: "Date", type: "date" },
        yaxis: { title: "Portfolio Price" },
        showlegend: false,
        template: document.body.classList.contains("dark-mode") ? "plotly_dark" : "plotly_white"
    };

    let { lastAvgTop10, lastAvgBottom10 } = updatePerformanceTable(stockReturns, T);
    updateTotalReturns(lastAvgTop10, lastAvgBottom10);

    let performanceTableContainer = document.getElementById("performanceTableContainer");
    performanceTableContainer.style.display = "block";
    
    let returnsContainer = document.getElementById("returnsContainer");
    returnsContainer.style.display = "block";

    let plotContainer = document.getElementById("plotContainer");
    plotContainer.style.display = "block"; // Show the plot container
    
    // Ensure the plot element is also displayed
    let plotElement = document.getElementById("plot");
    plotElement.style.display = "block"; // Show the plot element


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