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

    for (let i = 0; i < numStocks; i++) {
        let stockPath = simulateStockPrices(S0, mu, sigma, r, premium, N, dt);
        let xValues = Array.from({length: N}, (_, i) => i);
        traces.push({ x: xValues, y: stockPath, type: "scatter", mode: "lines", line: { width: 1 }, opacity: 0.5 });
    }

    let layout = {
        title: "Simulated Stock Prices Over Time",
        xaxis: { title: "Time Steps" },
        yaxis: { title: "Stock Price" },
        showlegend: false
    };

    Plotly.newPlot("plot", traces, layout);
}