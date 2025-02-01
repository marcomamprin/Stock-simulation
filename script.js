// Dark mode toggle
document.getElementById("darkModeToggle").addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");
});

// Function to generate normally distributed random numbers
function randomNormal() {
    let u = Math.random();
    let v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Function to simulate stock prices
function simulateStockPrices(S0, mu, sigma, r, premium, N, dt) {
    let muAdjusted = r + premium;
    let stockPrices = [S0];

    for (let i = 1; i < N; i++) {
        let dW = Math.sqrt(dt) * randomNormal();
        let logReturn = (muAdjusted - 0.5 * sigma ** 2) * dt + sigma * dW;
        stockPrices.push(stockPrices[i - 1] * Math.exp(logReturn));
    }

    return stockPrices;
}

// Function to generate and plot stock price simulations
function simulate() {
    let numStocks = parseInt(document.getElementById("numStocks").value);
    let T = parseFloat(document.getElementById("timePeriod").value);
    let S0 = parseFloat(document.getElementById("initialPrice").value);
    let mu = parseFloat(document.getElementById("mu").value);
    let sigma = parseFloat(document.getElementById("sigma").value);
    let r = parseFloat(document.getElementById("riskFreeRate").value);
    let premium = parseFloat(document.getElementById("premium").value);
    
    let dt = 1 / 252; // Daily time step
    let N = Math.round(T / dt); // Number of steps
    let traces = [];
    let today = new Date();

    for (let i = 0; i < numStocks; i++) {
        let stockPath = simulateStockPrices(S0, mu, sigma, r, premium, N, dt);
        
        let dates = Array.from({length: N}, (_, i) => {
            let d = new Date(today);
            d.setDate(d.getDate() + i);
            return d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
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
}

// Auto-run simulation on page load
simulate();