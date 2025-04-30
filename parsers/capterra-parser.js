const cheerio = require("cheerio");

/**
 * Parses Capterra HTML content and extracts review data
 * @param {string} html - HTML content from Capterra
 * @returns {Object} - Parsed product data
 */
function parseCapterraHtml(html) {
  try {
    const $ = cheerio.load(html);
    const productData = {
      productName: "",
      stars: "",
      totalReviews: "",
      allReviews: [],
    };

    productData.productName = $(
      "div#productHeader > div.container > div#productHeaderInfo > div.col > h1.mb-1"
    ).text();

    productData.stars = $(
      "div#productHeader > div.container > div#productHeaderInfo > div.col > div.align-items-center.d-flex > span.star-rating-component > span.d-flex > span.ms-1"
    ).text();

    $(
      "#reviews > div.review-card, div.i18n-translation_container.review-card"
    ).each((_, element) => {
      const reviewerName = $(element)
        .find("div.ps-0 > div.fw-bold, div.col > div.h5.fw-bold")
        .text()
        .trim();
      const profileTitle = $(element)
        .find("div.ps-0 > div.text-ash, div.col > div.text-ash")
        .first()
        .text()
        .trim();
      const starsText = $(element)
        .find("div.text-ash > span.ms-1, span.star-rating-component span.ms-1")
        .text()
        .trim();
      const reviewDate = $(element)
        .find("div.text-ash > span.ms-2, span.ms-2")
        .text()
        .trim();
      const commentSection = $(element)
        .find("p span:contains('Comments:')")
        .parent();
      const reviewText = commentSection
        .find("span:not(:contains('Comments:'))")
        .text()
        .trim();
      const prosSection = $(element).find("p:contains('Pros:')").next();
      const pros = prosSection.text().trim();
      const consSection = $(element).find("p:contains('Cons:')").next();
      const cons = consSection.text().trim();

      productData.allReviews.push({
        reviewerName,
        profileTitle,
        stars: starsText,
        reviewDate,
        reviewText,
        pros,
        cons,
      });
    });

    productData.totalReviews = productData.allReviews.length.toString();
    return { productData };
  } catch (error) {
    return { error };
  }
}

module.exports = {
  parseCapterraHtml,
};
