const inquirer = require("inquirer");
const path = require("path");
require("dotenv").config();

const config = require("./config");
const { fetchWithRetry } = require("./utils/api-utils");
const { parseG2Html } = require("./parsers/g2-parser");
const { parseCapterraHtml } = require("./parsers/capterra-parser");
const { saveToJsonFile } = require("./utils/file-utils");
const {
  isValidUrl,
  isValidDateFormat,
  isValidDateRange,
  isFromSupportedSource,
} = require("./utils/validation-utils");
const { saveReviewsWithStreaming } = require("./utils/stream-utils");

/**
 * Searches for a product on the specified source
 * @param {string} productName - Name of the product to search for
 * @param {string} source - Source to search on (G2 or Capterra)
 * @returns {Array} - Search results
 */
async function searchProduct(productName, source) {
  try {
    const sourceConfig =
      source === "G2" ? config.sources.g2 : config.sources.capterra;
    const searchUrl = `${sourceConfig.searchUrl}${encodeURIComponent(
      productName
    )}`;

    console.log(`Searching for product on ${source}: ${searchUrl}`);

    const response = await fetchWithRetry(searchUrl, `${source} search`);
    const $ = require("cheerio").load(response.body);

    const searchResults = [];

    $(sourceConfig.selector).each((index, element) => {
      const title = $(element).find(sourceConfig.titleSelector).text().trim();
      const link = $(element).find(sourceConfig.linkSelector).attr("href");

      if (title && link) {
        let reviewsLink;

        if (source === "Capterra") {
          // For Capterra, find the specific reviews link
          const reviewsAnchor = $(element).find("a[href*='/reviews/']").first();
          reviewsLink = reviewsAnchor.length
            ? reviewsAnchor.attr("href")
            : null;

          // If no specific reviews link found, construct it from the product link
          if (!reviewsLink && link) {
            reviewsLink = link.replace(/\/$/, "") + "/reviews/";
          }
        } else {
          // For G2, use the existing logic
          const fullLink = link.startsWith("http")
            ? link
            : `${sourceConfig.baseUrl}${link}`;
          reviewsLink = fullLink.replace(/\/$/, "") + "/reviews";
        }

        if (reviewsLink) {
          searchResults.push({
            title,
            reviewsLink,
          });
        }
      }
    });

    return searchResults;
  } catch (error) {
    console.error(`Error searching ${source}:`, error);
    return [];
  }
}

/**
 * Prompts the user to select a product from search results
 * @param {Array} searchResults - Search results to choose from
 * @returns {string|null} - Selected product URL or null
 */
async function promptUserToSelectProduct(searchResults) {
  if (searchResults.length === 0) {
    return null;
  }

  const choices = searchResults.map((result, index) => ({
    name: result.title,
    value: index,
  }));

  choices.push({
    name: "None of these - I want to enter URL manually",
    value: -1,
  });

  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "selectedIndex",
      message: "Select the correct product:",
      choices: choices,
    },
  ]);

  if (answer.selectedIndex === -1) {
    return null;
  }

  return searchResults[answer.selectedIndex].reviewsLink;
}

/**
 * Gets a manual URL from the user
 * @returns {string} - User-provided URL
 */
async function getManualUrl() {
  const answer = await inquirer.prompt([
    {
      type: "input",
      name: "url",
      message: "Enter the review URL (G2 or Capterra):",
      validate: function (url) {
        if (!url || !isValidUrl(url)) {
          return "Please enter a valid URL format";
        }
        if (!isFromSupportedSource(url)) {
          return "URL must be from G2 or Capterra";
        }
        return true;
      },
    },
  ]);

  return answer.url;
}

/**
 * Generates a URL from a product name
 * @param {string} productName - Name of the product
 * @param {string} source - Source (G2 or Capterra)
 * @returns {string} - Generated URL
 */
function generateUrlFromProductName(productName, source) {
  const formattedName = productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (source === "G2") {
    return `${config.sources.g2.baseUrl}/products/${formattedName}/reviews`;
  } else if (source === "Capterra") {
    return `${config.sources.capterra.baseUrl}/${formattedName}/reviews`;
  }

  throw new Error(`Unsupported source: ${source}`);
}

/**
 * Generates a URL for a specific page
 * @param {string} baseUrl - Base URL
 * @param {number} pageNum - Page number
 * @returns {string} - URL with page parameter
 */
function generatePageUrl(baseUrl, pageNum) {
  if (pageNum === 1) {
    return baseUrl;
  }
  if (baseUrl.includes("?")) {
    return `${baseUrl}&page=${pageNum}`;
  } else {
    return `${baseUrl}?page=${pageNum}`;
  }
}

/**
 * Parses a date string
 * @param {string} dateStr - Date string
 * @returns {Date} - Parsed date
 */
function parseDate(dateStr) {
  dateStr = dateStr.trim();
  let m = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m) {
    const [, year, month, day] = m;
    return new Date(+year, +month - 1, +day);
  }
  m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, month, day, year] = m;
    return new Date(+year, +month - 1, +day);
  }
  return new Date(dateStr);
}

/**
 * Calculates a date from a relative time string
 * @param {string} relativeTimeStr - Relative time string
 * @returns {Date} - Calculated date
 */
function calculateDateFromRelative(relativeTimeStr) {
  const currentDate = new Date();
  const lowerStr = relativeTimeStr.toLowerCase();

  if (lowerStr.includes("year")) {
    const years = parseInt(relativeTimeStr);
    return new Date(
      currentDate.getFullYear() - years,
      currentDate.getMonth(),
      currentDate.getDate()
    );
  } else if (lowerStr.includes("month")) {
    const months = parseInt(relativeTimeStr);
    let newMonth = currentDate.getMonth() - months;
    let newYear = currentDate.getFullYear();
    while (newMonth < 0) {
      newMonth += 12;
      newYear--;
    }
    return new Date(newYear, newMonth, currentDate.getDate());
  } else if (lowerStr.includes("day")) {
    const days = parseInt(relativeTimeStr);
    const resultDate = new Date(currentDate);
    resultDate.setDate(resultDate.getDate() - days);
    return resultDate;
  } else {
    return new Date(relativeTimeStr);
  }
}

/**
 * Checks if a review is within a date range
 * @param {string} reviewDateStr - Review date string
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {boolean} - Whether the review is in range
 */
function isReviewInDateRange(reviewDateStr, startDate, endDate) {
  const reviewDate = calculateDateFromRelative(reviewDateStr);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return reviewDate >= start && reviewDate <= end;
}

/**
 * Creates a filter function for reviews by date
 * @param {string} startDateStr - Start date string
 * @param {string} endDateStr - End date string
 * @returns {Function} - Filter function
 */
function createDateRangeFilter(startDateStr, endDateStr) {
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);

  return (review) => {
    try {
      const reviewDate = parseDate(review.reviewDate);
      return !isNaN(reviewDate) && reviewDate >= start && reviewDate <= end;
    } catch (error) {
      return false;
    }
  };
}

/**
 * Scrapes all pages from G2
 * @param {string} baseUrl - Base URL
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {Object} - Scraped data
 */
async function scrapeAllPages_G2(baseUrl, startDate, endDate) {
  let currentPage = 1;
  let hasNextPage = true;
  let reviewChunks = [];
  let productInfo = {};

  while (hasNextPage) {
    const currentUrl = generatePageUrl(baseUrl, currentPage);

    try {
      const response = await fetchWithRetry(
        currentUrl,
        `G2 page ${currentPage}`
      );
      const parsedResult = parseG2Html(response.body);

      if (parsedResult.error) {
        console.error(`Error parsing page ${currentPage}:`, parsedResult.error);
        break;
      }

      if (currentPage === 1) {
        productInfo = {
          productName: parsedResult.productData.productName,
          stars: parsedResult.productData.stars,
          totalReviews: parsedResult.productData.totalReviews,
        };
      }

      // Store reviews in chunks instead of one big array
      if (parsedResult.productData.allReviews.length > 0) {
        reviewChunks.push(parsedResult.productData.allReviews);
      } else {
        console.warn(`Page ${currentPage} returned 0 reviews.`);
      }

      hasNextPage = parsedResult.hasNextPage;
      currentPage++;

      // Wait between page requests
      await new Promise((resolve) => setTimeout(resolve, config.api.pageDelay));
    } catch (error) {
      console.error(`Failed to scrape page ${currentPage}:`, error);
      break;
    }
  }

  // Use streaming to filter and save reviews
  const dateFilter = createDateRangeFilter(startDate, endDate);
  const fileInfo = await saveReviewsWithStreaming(
    productInfo,
    reviewChunks,
    dateFilter
  );

  return {
    ...productInfo,
    totalScrapedReviews: fileInfo.totalReviews,
    filePath: fileInfo.filePath,
  };
}

/**
 * Scrapes and filters reviews from Capterra
 * @param {string} baseUrl - Base URL
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {Object} - Scraped data
 */
async function scrapeAndFilterReviews_Capterra(baseUrl, startDate, endDate) {
  try {
    const response = await fetchWithRetry(baseUrl, "Capterra reviews");
    const parsedResult = parseCapterraHtml(response.body);

    if (parsedResult.error) {
      console.error("Error parsing Capterra page:", parsedResult.error);
      return null;
    }

    let cleanProductName = parsedResult.productData.productName.replace(
      / Reviews$/i,
      ""
    );
    const productInfo = {
      productName: cleanProductName,
      stars: parsedResult.productData.stars,
      totalReviews: parsedResult.productData.totalReviews,
    };

    // Use streaming to filter and save reviews
    const dateFilter = (review) =>
      isReviewInDateRange(review.reviewDate, startDate, endDate);
    const fileInfo = await saveReviewsWithStreaming(
      productInfo,
      [parsedResult.productData.allReviews],
      dateFilter
    );

    return {
      ...productInfo,
      totalScrapedReviews: fileInfo.totalReviews,
      filePath: fileInfo.filePath,
    };
  } catch (error) {
    console.error("Error scraping Capterra:", error);
    return null;
  }
}

/**
 * Gets user input for scraping
 * @returns {Object} - User input
 */
async function getUserInput() {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "productName",
      message: "Enter the product name:",
      validate: function (value) {
        return value.trim() !== "" ? true : "Please enter a product name";
      },
    },
    {
      type: "list",
      name: "source",
      message: "Select the review source:",
      choices: ["G2", "Capterra"],
    },
    {
      type: "input",
      name: "start_date",
      message: "Enter start date (YYYY/MM/DD):",
      validate: function (value) {
        return isValidDateFormat(value)
          ? true
          : "Please enter a valid date in YYYY/MM/DD format";
      },
    },
    {
      type: "input",
      name: "end_date",
      message: "Enter end date (YYYY/MM/DD):",
      validate: function (value) {
        if (!isValidDateFormat(value)) {
          return "Please enter a valid date in YYYY/MM/DD format";
        }

        // Get the start date from previous question
        const startDate = inquirer.answers?.start_date;
        if (startDate && !isValidDateRange(startDate, value)) {
          return "End date must be after start date";
        }

        return true;
      },
    },
  ]);

  return answers;
}

/**
 * Main function
 */
async function main() {
  try {
    // Get user input
    const inputData = await getUserInput();
    const { productName, source, start_date, end_date } = inputData;

    // Validate date range
    if (!isValidDateRange(start_date, end_date)) {
      console.error("Error: End date must be after start date");
      process.exit(1);
    }

    // Try to find the product through search
    let url = null;
    let searchResults = await searchProduct(productName, source);

    if (searchResults.length > 0) {
      url = await promptUserToSelectProduct(searchResults);
    }

    // If search didn't work or user chose manual entry
    // If search didn't work or user chose manual entry
    if (!url) {
      console.log("Falling back to generated URL or manual entry...");

      try {
        // First try with generated URL
        url = generateUrlFromProductName(productName, source);
        console.log(`Generated URL: ${url}`);

        // Test if the URL is valid by making a request
        const testResponse = await fetchWithRetry(url, "URL validation");
        const $ = require("cheerio").load(testResponse.body);

        // Check if we got a valid product page (basic check)
        const isValid =
          source === "G2"
            ? $("div.product-head__title a.c-midnight-100").length > 0
            : $("div#productHeader").length > 0;

        if (!isValid) {
          console.log("Generated URL did not lead to a valid product page.");
          url = await getManualUrl();
        }
      } catch (error) {
        console.log("Error with generated URL:", error.message);
        url = await getManualUrl();
      }
    }

    console.log(`Using URL: ${url}`);

    let result;
    if (url.toLowerCase().includes("capterra")) {
      result = await scrapeAndFilterReviews_Capterra(url, start_date, end_date);
    } else if (url.toLowerCase().includes("g2")) {
      result = await scrapeAllPages_G2(url, start_date, end_date);
    } else {
      console.error(
        "Unsupported URL. Please provide a URL from either G2 or Capterra."
      );
      process.exit(1);
    }

    if (!result) {
      console.error("Failed to scrape data. The URL might be incorrect.");
      process.exit(1);
    }

    console.log("Output file saved to:", result.filePath);
  } catch (error) {
    console.error("Error during scraping:", error);
    process.exit(1);
  }
}

main();
