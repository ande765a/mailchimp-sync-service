const fetch = require("node-fetch");

class Mailchimp {
  constructor({ api_key, api_base = "https://us14.api.mailchimp.com/3.0" }) {
    this.username = "MailChimpAPI";
    this.api_key = api_key;
    this.api_base = api_base;
  }

  async fetch(url, { headers = {}, ...opts } = {}) {
    // @ts-ignore
    const res = await fetch(`${this.api_base}/${url}`, {
      ...opts,
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${this.username}:${this.api_key}`
        ).toString("base64")}`,
        headers
      }
    });

    return res.json();
  }
}

module.exports = {
  Mailchimp
};
