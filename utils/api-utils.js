const { CrawlingAPI } = require("crawlbase");
require("dotenv").config();

const config = {
  retryAttempts: 5,
  retryDelay: 5000,
  pageDelay: 25000,
};

const api = new CrawlingAPI({ token: process.env.TOKEN });

/**
 * Makes an API request with standardized retry logic
 * @param {string} url - The URL to fetch
 * @param {string} operation - Description of the operation for logging
 * @returns {Promise<Object>} - The API response
 */
async function fetchWithRetry(url, operation = "API call") {
  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      console.log(
        `${operation}: ${url} (Attempt ${attempt}/${config.retryAttempts})`
      );
      const response = await api.get(url);

      if (!response || !response.body) {
        throw new Error("Empty response received");
      }

      return response;
    } catch (error) {
      console.error(`Attempt ${attempt} failed: ${error.message}`);

      if (attempt < config.retryAttempts) {
        console.log(
          `Waiting ${config.retryDelay / 1000} seconds before retrying...`
        );
        await new Promise((resolve) => setTimeout(resolve, config.retryDelay));
      } else {
        throw new Error(
          `${operation} failed after ${config.retryAttempts} attempts: ${error.message}`
        );
      }
    }
  }
}

module.exports = {
  api,
  fetchWithRetry,
  config,
};
