document.getElementById("darkModeToggle").addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");

    let newTemplate = document.body.classList.contains("dark-mode") ? "plotly_dark" : "plotly_white";
    let update = { template: newTemplate };

    Plotly.relayout("plot", update);
});

document.getElementById("showTableBtn").addEventListener("click", function () {
    document.getElementById("tableContainer").style.display = "block";
});

function randomNormal() {
    let u = Math.random(), v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function simulateStockPrices(S0, mu, sigma, N, dt) {
    let stockPrices = [S0];
    for (let i = 1; i < N; i++) {
        let dW = Math.sqrt(dt) * randomNormal();
        let logReturn = (mu - 0.5 * sigma ** 2) * dt + sigma * dW;
        stockPrices.push(stockPrices[i - 1] * Math.exp(logReturn));
    }
    return stockPrices;
}

function compoundInterest(S0, mu, N, dt) {
    let stockPrices = [S0];
    for (let i = 1; i < N; i++) {
        let newPrice = stockPrices[i - 1] * Math.pow(1 + mu, dt);
        stockPrices.push(newPrice);
    }
    return stockPrices;
}

function simulate() {
    let numStocks = parseInt(document.getElementById("numStocks").value) || 0;
    let T = parseFloat(document.getElementById("timePeriod").value) || 0;
    let S0 = parseFloat(document.getElementById("initialPrice").value) || 0;
    let mu = parseFloat(document.getElementById("expectedReturn").value) || 0;
    let sigma = parseFloat(document.getElementById("sigma").value) || 0;
    let model = document.getElementById("modelSelection").value;
    let dt = 1 / 252;
    let N = Math.round(T / dt);
    let traces = [];
    let stockReturns = [];

    let today = new Date();
    for (let i = 0; i < numStocks; i++) {
        let stockPath = model === "brownian" ? simulateStockPrices(S0, mu, sigma, N, dt) : compoundInterest(S0, mu, N, dt);
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
    updateReturnSummary(stockReturns);
    updatePerformanceTable(stockReturns, T);
}

function updateReturnSummary(stockReturns) {
    let summaryDiv = document.getElementById("returnSummary");
    if (stockReturns.length === 0) return;

    let finalValues = stockReturns.map(path => path[path.length - 1]).sort((a, b) => a - b);
    let top10Index = Math.floor(finalValues.length * 0.9);
    let bottom10Index = Math.floor(finalValues.length * 0.1) || 1;
    let avgTop10 = finalValues.slice(top10Index).reduce((a, b) => a + b, 0) / (finalValues.length - top10Index);
    let avgBottom10 = finalValues.slice(0, bottom10Index).reduce((a, b) => a + b, 0) / bottom10Index;
    let overallReturn = finalValues.reduce((a, b) => a + b, 0) / finalValues.length;
    summaryDiv.innerHTML = `<p>📈 Best 10%: €${Math.round(avgTop10)} | 📉 Worst 10%: €${Math.round(avgBottom10)} | 📊 Overall: €${Math.round(overallReturn)}</p>`;
}

function updatePerformanceTable(stockReturns, years) {
    let tableBody = document.querySelector("#performanceTable tbody");
    tableBody.innerHTML = "";
    if (stockReturns.length === 0 || years === 0) return;

    let yearlySteps = Math.round(stockReturns[0].length / years);
    let currentYear = new Date().getFullYear();

    for (let year = currentYear; year < currentYear + years; year++) {
        let yearIndex = (year - currentYear + 1) * yearlySteps - 1;
        let finalValues = stockReturns.map(path => path[yearIndex]).filter(v => !isNaN(v)).sort((a, b) => a - b);
        if (finalValues.length === 0) continue;
        let top10Index = Math.floor(finalValues.length * 0.9);
        let bottom10Index = Math.floor(finalValues.length * 0.1) || 1;
        let avgTop10 = finalValues.slice(top10Index).reduce((a, b) => a + b, 0) / (finalValues.length - top10Index);
        let avgBottom10 = finalValues.slice(0, bottom10Index).reduce((a, b) => a + b, 0) / bottom10Index;
        let row = `<tr><td>${year}</td><td>€${Math.round(avgTop10)}</td><td>€${Math.round(avgBottom10)}</td></tr>`;
        tableBody.innerHTML += row;
    }
}
