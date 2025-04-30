module.exports = {
  api: {
    retryAttempts: 5,
    retryDelay: 5000,
    pageDelay: 25000,
  },
  output: {
    directory: "output",
  },
  sources: {
    g2: {
      baseUrl: "https://www.g2.com",
      searchUrl: "https://www.g2.com/search?&query=",
      selector: "div.product-listing",
      titleSelector: "h3.product-listing__title",
      linkSelector: "a.product-listing__product-name",
    },
    capterra: {
      baseUrl: "https://www.capterra.com",
      searchUrl: "https://www.capterra.com/search/?q=",
      selector: "div.search-result-card",
      titleSelector: "h2.search-result-card__title",
      linkSelector: "a.search-result-card__product-link",
    },
  },
};
