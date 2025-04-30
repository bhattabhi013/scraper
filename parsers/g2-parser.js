const cheerio = require("cheerio");

/**
 * Parses G2 HTML content and extracts review data
 * @param {string} html - HTML content from G2
 * @returns {Object} - Parsed product data and pagination info
 */
function parseG2Html(html) {
  try {
    const $ = cheerio.load(html);
    const productData = {
      productName: "",
      stars: "",
      totalReviews: "",
      allReviews: [],
    };

    productData.productName = $(
      "div.product-head__title a.c-midnight-100"
    ).text();
    productData.stars = $("#products-dropdown .fw-semibold").first().text();
    productData.totalReviews = $(".filters-product h3").text();

    const paginationText = $(".pagination").text();
    const hasNextPage = paginationText.includes("Next");

    $(".nested-ajax-loading > div.paper").each((_, element) => {
      const reviewerName = $(element).find("[itemprop=author]").text();
      const stars = $(element).find("[itemprop='ratingValue']").attr("content");
      const reviewText = $(element)
        .find(".pjax")
        .text()
        .replace(/[^a-zA-Z ]/g, "");
      const reviewLink = $(element).find(".pjax").attr("href");
      const profileTitle = $(element)
        .find(".mt-4th")
        .map((_, label) => $(label).text())
        .get();
      const reviewDate = $(element).find("time").text();

      productData.allReviews.push({
        reviewerName,
        reviewText,
        stars,
        profileTitle: profileTitle.length ? profileTitle.join(" ") : "",
        reviewDate,
        reviewLink,
      });
    });

    return { productData, hasNextPage };
  } catch (error) {
    return { error };
  }
}

module.exports = {
  parseG2Html,
};
