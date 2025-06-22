import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Special handling for Railway
if (process.env.RAILWAY === '1') {
  console.log('Running in Railway environment');
  app.use((req, res, next) => {
    req.setTimeout(90000, () => {
      res.status(504).json({ error: 'Request timed out' });
    });
    next();
  });
}

// Only ONE transcript route
app.post("/transcript", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      timeout: 30000,
      defaultViewport: { width: 1280, height: 720 },
      slowMo: 250
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));
    page.on('response', response => {
      if (response.status() >= 400) {
        console.error('HTTP ERROR:', response.status(), response.url());
      }
    });

    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: ["networkidle0", "domcontentloaded"], timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));


    // Try clicking the Transcript button
    try {
      const clicked = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('div.label'))
          .find(el => el.textContent.trim() === 'Transcript');
        if (el) {
          const button = el.closest('a');
          if (button) {
            button.scrollIntoView({ behavior: 'auto', block: 'center' });
            button.click();
            return true;
          }
        }
        return false;
      });
      if (clicked) console.log('Clicked transcript button.');
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (err) {
      console.log("Transcript click failed:", err.message);
    }

    // Extract transcript text
    const transcriptContent = await page.evaluate(() => {
      const selectors = [
        "article", ".transcript", "#transcript", "main",
        "div.episode-transcript", "div.episode-notes", "div.content",
        "div.post-content", "div.entry-content", "div.article-content"
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const text = Array.from(elements)
            .map((el) => el.textContent.trim())
            .filter(Boolean)
            .join("\n\n");
          if (text.length > 100) return text;
        }
      }
      return "Transcript not found or insufficient content";
    });

    await browser.close();
    res.json({ 
      success: true,
      transcript: transcriptContent,
      url,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ FULL ERROR:", error);
    res.status(500).json({ 
      error: "Failed to extract transcript",
      details: error.message,
      stack: error.stack,
      url,
      timestamp: new Date().toISOString()
    });
  }
});
