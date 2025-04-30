const fs = require("fs");
const path = require("path");
const { Transform } = require("stream");

const config = require("../config");

/**
 * Creates a transform stream for processing reviews in chunks
 * @param {Function} filterFn - Function to filter reviews
 * @returns {Transform} - Transform stream
 */
function createReviewProcessingStream(filterFn) {
  return new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      try {
        const reviews = filterFn ? chunk.filter(filterFn) : chunk;
        this.push(reviews);
        callback();
      } catch (error) {
        callback(error);
      }
    },
  });
}

/**
 * Saves reviews to a file using streaming approach
 * @param {Object} productInfo - Basic product information
 * @param {Array} reviewChunks - Array of review chunks
 * @param {Function} filterFn - Optional function to filter reviews
 * @returns {Promise<Object>} - Information about the saved file
 */
async function saveReviewsWithStreaming(
  productInfo,
  reviewChunks,
  filterFn = null
) {
  return new Promise((resolve, reject) => {
    try {
      const outputDir = path.join(
        process.cwd(),
        config?.output?.directory || "output"
      );
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      let cleanProductName = productInfo.productName.replace(/ Reviews$/i, "");
      const sanitizedProductName = cleanProductName
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${sanitizedProductName}_${timestamp}.json`;
      const filePath = path.join(outputDir, filename);

      fs.writeFileSync(
        filePath,
        JSON.stringify(
          {
            ...productInfo,
            allReviews: [],
            totalScrapedReviews: 0,
          },
          null,
          2
        ).slice(0, -2) + ',\n  "allReviews": [\n',
        "utf8"
      );

      const processingStream = createReviewProcessingStream(filterFn);

      let totalReviews = 0;
      let isFirstChunk = true;

      processingStream.on("data", (reviews) => {
        if (reviews.length > 0) {
          const reviewsJson = reviews
            .map((r) => JSON.stringify(r))
            .join(",\n    ");
          const content = isFirstChunk ? reviewsJson : ",\n    " + reviewsJson;
          fs.appendFileSync(filePath, content, "utf8");
          totalReviews += reviews.length;
          isFirstChunk = false;
        }
      });

      processingStream.on("end", () => {
        fs.appendFileSync(
          filePath,
          '\n  ],\n  "totalScrapedReviews": ' + totalReviews + "\n}",
          "utf8"
        );
        resolve({ filePath, filename, totalReviews });
      });

      processingStream.on("error", (error) => {
        reject(error);
      });

      reviewChunks.forEach((chunk) => processingStream.write(chunk));
      processingStream.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  createReviewProcessingStream,
  saveReviewsWithStreaming,
};
