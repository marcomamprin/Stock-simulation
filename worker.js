self.onmessage = function (event) {
    const { S0, mu, sigma, N, dt, deposit, depositFreq, model } = event.data;

    function randomNormal() {
        let u = Math.random(), v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    function applyDeposit(i, deposit, depositFreq) {
        let depositInterval = depositFreq === "daily" ? 1 : depositFreq === "monthly" ? 21 : 252;
        return i % depositInterval === 0 ? deposit : 0;
    }

    function simulateGBM() {
        let stockPrices = [S0];
        for (let i = 1; i < N; i++) {
            let dW = Math.sqrt(dt) * randomNormal();
            let logReturn = (mu - 0.5 * sigma ** 2) * dt + sigma * dW;
            let newPrice = stockPrices[i - 1] * Math.exp(logReturn) + applyDeposit(i, deposit, depositFreq);
            stockPrices.push(newPrice);
        }
        return stockPrices;
    }

    function simulateHeston() {
        let S = new Array(N).fill(0);
        S[0] = S0;
        let v = sigma * sigma;
        let kappa = 2.0, theta = sigma * sigma, eta = 0.3;

        for (let i = 1; i < N; i++) {
            let dW1 = Math.sqrt(dt) * randomNormal();
            let dW2 = Math.sqrt(dt) * randomNormal();
            v = Math.max(0, v + kappa * (theta - v) * dt + eta * Math.sqrt(v) * dW2);
            S[i] = S[i - 1] * Math.exp((mu - 0.5 * v) * dt + Math.sqrt(v) * dW1);
            S[i] += applyDeposit(i, deposit, depositFreq);
        }
        return S;
    }

    function simulateJumpDiffusion() {
        let S = new Array(N).fill(0);
        S[0] = S0;
        let lambda = 0.1, jumpMean = 0.02, jumpStd = 0.05;

        for (let i = 1; i < N; i++) {
            let dW = Math.sqrt(dt) * randomNormal();
            let J = (Math.random() < lambda * dt) ? Math.exp(jumpMean + jumpStd * randomNormal()) : 1;
            S[i] = S[i - 1] * J * Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * dW);
            S[i] += applyDeposit(i, deposit, depositFreq);
        }
        return S;
    }

    function simulateMonteCarlo() {
        let S = new Array(N).fill(0);
        S[0] = S0;

        for (let i = 1; i < N; i++) {
            let dW = Math.sqrt(dt) * randomNormal();
            S[i] = S[i - 1] * Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * dW);
            S[i] += applyDeposit(i, deposit, depositFreq);
        }
        return S;
    }

    function simulateFamaFrench() {
        let S = new Array(N).fill(0);
        S[0] = S0;
        let SMB = 0.03 * dt;
        let HML = 0.02 * dt;
        let betaSMB = 0.5;
        let betaHML = 0.3;

        for (let i = 1; i < N; i++) {
            let dW = Math.sqrt(dt) * randomNormal();
            let famaFrenchFactor = betaSMB * SMB + betaHML * HML;
            S[i] = S[i - 1] * Math.exp((mu - 0.5 * sigma * sigma + famaFrenchFactor) * dt + sigma * dW);
            S[i] += applyDeposit(i, deposit, depositFreq);
        }
        return S;
    }

    let stockPath;
    try {
        if (model === "GBM") stockPath = simulateGBM();
        else if (model === "Heston") stockPath = simulateHeston();
        else if (model === "JumpDiffusion") stockPath = simulateJumpDiffusion();
        else if (model === "MonteCarlo") stockPath = simulateMonteCarlo();
        else if (model === "FamaFrench") stockPath = simulateFamaFrench();
        else throw new Error("Model not implemented.");
        self.postMessage({ success: true, stockPath });
    } catch (error) {
        self.postMessage({ success: false, error: error.message });
    }
};
