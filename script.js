document.getElementById("darkModeToggle").addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");
    
    // Toggle dark mode for the performance table
    document.getElementById("performanceTable").classList.toggle("dark-table");
});

// Generate normally distributed random numbers
function randomNormal() {
    let u = Math.random(), v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Simulate stock prices with deposits
function simulateStockPrices(S0, mu, sigma, r, premium, N, dt, deposit, depositFreq) {
    let muAdjusted = r + premium;
    let stockPrices = [S0];
    let depositInterval = depositFreq === "daily" ? 1 : depositFreq === "monthly" ? 21 : 252; // Convert to daily steps

    for (let i = 1; i < N; i++) {
        let dW = Math.sqrt(dt) * randomNormal();
        let logReturn = (muAdjusted - 0.5 * sigma ** 2) * dt + sigma * dW;
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
    let numStocks = parseInt(document.getElementById("numStocks").value);
    let T = parseFloat(document.getElementById("timePeriod").value);
    let S0 = parseFloat(document.getElementById("initialPrice").value);
    let mu = parseFloat(document.getElementById("mu").value);
    let sigma = parseFloat(document.getElementById("sigma").value);
    let r = parseFloat(document.getElementById("riskFreeRate").value);
    let premium = parseFloat(document.getElementById("premium").value);
    let deposit = parseFloat(document.getElementById("depositAmount").value);
    let depositFreq = document.getElementById("depositFrequency").value;

    let dt = 1 / 252;
    let N = Math.round(T / dt);
    let traces = [];
    let stockReturns = [];

    let today = new Date();

    for (let i = 0; i < numStocks; i++) {
        let stockPath = simulateStockPrices(S0, mu, sigma, r, premium, N, dt, deposit, depositFreq);
        stockReturns.push(stockPath);

        let dates = Array.from({ length: N }, (_, i) => {
            let d = new Date(today);
            d.setDate(d.getDate() + i);
            return d.toISOString().split('T')[0];
        });

        traces.push({ x: dates, y: stockPath, type: "scatter", mode: "lines", line: { width: 1 }, opacity: 0.5 });
    }

    let layout = {
        title: "Simulated Stock Prices Over Time",
        xaxis: { title: "Date", type: "date" },
        yaxis: { title: "Stock Price" },
        showlegend: false,
        template: document.body.classList.contains("dark-mode") ? "plotly_dark" : "plotly_white"
    };

    Plotly.newPlot("plot", traces, layout);

    updatePerformanceTable(stockReturns, T);
}

// Update performance table
function updatePerformanceTable(stockReturns, years) {
    let tableBody = document.querySelector("#performanceTable tbody");
    tableBody.innerHTML = ""; // Clear table

    let yearlySteps = Math.round(stockReturns[0].length / years);
    let startYear = new Date().getFullYear(); // Get current year

    for (let year = 1; year <= years; year++) {
        let yearIndex = year * yearlySteps - 1;
        
        let finalValues = stockReturns.map(path => path[yearIndex]).filter(v => !isNaN(v));
        finalValues.sort((a, b) => a - b);

        let top10Index = Math.floor(finalValues.length * 0.9);
        let bottom10Index = Math.floor(finalValues.length * 0.1);

        let avgTop10 = top10Index > 0 ? finalValues.slice(top10Index).reduce((a, b) => a + b, 0) / (finalValues.length - top10Index) : 0;
        let avgBottom10 = bottom10Index > 0 ? finalValues.slice(0, bottom10Index).reduce((a, b) => a + b, 0) / bottom10Index : 0;

        let actualYear = startYear + year - 1; // Calculate real year

        let row = `<tr>
            <td>${actualYear}</td>
            <td>€${Math.round(avgTop10)}</td>
            <td>€${Math.round(avgBottom10)}</td>
        </tr>`;
        tableBody.innerHTML += row;
    }
}

// Run on load
simulate();
