const fs = require("fs");
const path = require("path");

const config = {
  outputDir: path.join(process.cwd(), "output"),
};

/**
 * Saves review data to a JSON file
 * @param {Object} data - The review data to save
 * @returns {Object} - Information about the saved file
 */
function saveToJsonFile(data) {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  let cleanProductName = data.productName.replace(/ Reviews$/i, "");
  const sanitizedProductName = cleanProductName
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${sanitizedProductName}_${timestamp}.json`;
  const filePath = path.join(config.outputDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  return { filePath, filename };
}

module.exports = {
  saveToJsonFile,
  config,
};
