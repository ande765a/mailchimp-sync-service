const fetch = require("node-fetch");

class Autopilot {
  constructor({ apiKey, apiBase = "https://api2.autopilothq.com/v1" }) {
    this.apiKey = apiKey;
    this.apiBase = apiBase;
  }

  async fetch(url, { headers = {}, ...opts } = {}) {
    // @ts-ignore
    const res = await fetch(`${this.apiBase}/${url}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        autopilotapikey: this.apiKey,
        headers
      }
    });

    return res.json();
  }
}

module.exports = {
  Autopilot
};
