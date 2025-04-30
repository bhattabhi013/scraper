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
      searchUrl: "https://www.capterra.com/search/?query=",
      selector: "div[data-testid='search-product-card']",
      titleSelector: "a[data-testid='product-name']",
      linkSelector: "a[data-testid='product-name']",
      reviewsLinkSelector: "a[href$='/reviews/']",
    },
  },
};
