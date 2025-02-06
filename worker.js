self.onmessage = function (event) {
    const { simulations, S0, mu, sigma, N, dt, deposit, depositFreq, model } = event.data;

    function randomNormal() {
        let u = Math.random(), v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    function applyDeposit(i) {
        let depositInterval = depositFreq === "daily" ? 1 : depositFreq === "monthly" ? 21 : 252;
        return i % depositInterval === 0 ? deposit : 0;
    }

    function simulateGBM() {
        let S = new Float64Array(N);
        S[0] = S0;
        for (let i = 1; i < N; i++) {
            let dW = Math.sqrt(dt) * randomNormal();
            S[i] = S[i - 1] * Math.exp((mu - 0.5 * sigma ** 2) * dt + sigma * dW) + applyDeposit(i);
        }
        return S;
    }

    function simulateHeston() {
        let S = new Float64Array(N);
        S[0] = S0;
        let v = sigma * sigma, kappa = 2.0, theta = sigma * sigma, eta = 0.3;
        for (let i = 1; i < N; i++) {
            let dW1 = Math.sqrt(dt) * randomNormal();
            let dW2 = Math.sqrt(dt) * randomNormal();
            v = Math.max(0, v + kappa * (theta - v) * dt + eta * Math.sqrt(v) * dW2);
            S[i] = S[i - 1] * Math.exp((mu - 0.5 * v) * dt + Math.sqrt(v) * dW1) + applyDeposit(i);
        }
        return S;
    }

    function simulateJumpDiffusion() {
        let S = new Float64Array(N);
        S[0] = S0;
        let lambda = 0.1, jumpMean = 0.02, jumpStd = 0.05;
        for (let i = 1; i < N; i++) {
            let dW = Math.sqrt(dt) * randomNormal();
            let J = (Math.random() < lambda * dt) ? Math.exp(jumpMean + jumpStd * randomNormal()) : 1;
            S[i] = S[i - 1] * J * Math.exp((mu - 0.5 * sigma ** 2) * dt + sigma * dW) + applyDeposit(i);
        }
        return S;
    }

    function simulateMonteCarlo() {
        let S = new Float64Array(N);
        S[0] = S0;
        for (let i = 1; i < N; i++) {
            let dW = Math.sqrt(dt) * randomNormal();
            S[i] = S[i - 1] * Math.exp((mu - 0.5 * sigma ** 2) * dt + sigma * dW) + applyDeposit(i);
        }
        return S;
    }

    function simulateFamaFrench() {
        let S = new Float64Array(N);
        S[0] = S0;
        let SMB = 0.03 * dt, HML = 0.02 * dt, betaSMB = 0.5, betaHML = 0.3;
        for (let i = 1; i < N; i++) {
            let dW = Math.sqrt(dt) * randomNormal();
            let famaFrenchFactor = betaSMB * SMB + betaHML * HML;
            S[i] = S[i - 1] * Math.exp((mu - 0.5 * sigma ** 2 + famaFrenchFactor) * dt + sigma * dW) + applyDeposit(i);
        }
        return S;
    }

    function simulateModel() {
        switch (model) {
            case "GBM": return simulateGBM();
            case "Heston": return simulateHeston();
            case "JumpDiffusion": return simulateJumpDiffusion();
            case "MonteCarlo": return simulateMonteCarlo();
            case "FamaFrench": return simulateFamaFrench();
            default: throw new Error("Model not implemented.");
        }
    }

    // Run multiple simulations per worker
    let results = Array.from({ length: simulations }, () => simulateModel());

    self.postMessage({ success: true, results });
};
