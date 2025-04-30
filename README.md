# Review Scraper for G2 & Capterra

A lightweight Node.js tool that collects reviews from G2 and Capterra based on user-defined input. It filters them by date and exports the cleaned data into structured JSON files.

---

## 🔧 Key Features

- Extract reviews from **G2** and **Capterra** product pages
- Apply custom date range filters
- Built-in validation for URL and date input
- Option to update URLs manually if needed
- Output is saved in timestamped `.json` files inside the `output/` folder
- Includes retry logic for handling temporary failures
- Uses Node.js streams for performance and low memory usage
- Simple CLI-based execution

---

## 📥 Getting Started

1. **Clone the Repository**
   ```bash
   git clone https://github.com/bhattabhi013/scraper.git
   cd review-scrapper
   ```

2. **Install Required Packages**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory:
   ```env
   TOKEN=your_crawlbase_api_token
   ```
   > Visit the [Crawlbase Dashboard](https://crawlbase.com) to get your API token.

---

## ▶️ How to Run

Once setup is complete, launch the scraper with:

```bash
node scrapper.js
```

You'll be prompted to:
- Enter the **product name**
- Provide a **start** and **end date** for filtering

The scraper will generate a JSON file containing the results and save it in the `output/` directory.

---

## 📝 Notes

- URLs must be valid and publicly accessible
- Implements delays and retries to prevent blocking
- Uses Node.js streams to handle large volumes of reviews
- Ensure dates follow the `YYYY/MM/DD` format
- Input is validated before scraping begins
