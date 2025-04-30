/**
 * Validates a URL string
 * @param {string} string - The URL to validate
 * @returns {boolean} - Whether the URL is valid
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Validates a date string
 * @param {string} dateStr - Date string in YYYY/MM/DD format
 * @returns {boolean} - Whether the date is valid
 */
function isValidDateFormat(dateStr) {
  return /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr);
}

/**
 * Validates that end date is after start date
 * @param {string} startDateStr - Start date in YYYY/MM/DD format
 * @param {string} endDateStr - End date in YYYY/MM/DD format
 * @returns {boolean} - Whether the date range is valid
 */
function isValidDateRange(startDateStr, endDateStr) {
  if (!isValidDateFormat(startDateStr) || !isValidDateFormat(endDateStr)) {
    return false;
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  return startDate <= endDate;
}

/**
 * Validates that a URL is from a supported source
 * @param {string} url - The URL to validate
 * @returns {boolean} - Whether the URL is from a supported source
 */
function isFromSupportedSource(url) {
  return (
    url.toLowerCase().includes("g2") || url.toLowerCase().includes("capterra")
  );
}

module.exports = {
  isValidUrl,
  isValidDateFormat,
  isValidDateRange,
  isFromSupportedSource,
};
