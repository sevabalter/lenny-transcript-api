import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

app.post("/transcript", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: "new"
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });

    // Click Transcript button
    const transcriptButton = await page.$x("//button[contains(., 'Transcript')]"));
    if (transcriptButton.length > 0) {
      await transcriptButton[0].click();
      await page.waitForSelector("p");
    }

    const result = await page.evaluate(() => {
      const lines = Array.from(document.querySelectorAll("p"));
      return lines.map(p => p.innerText.trim()).filter(t => t);
    });

    await browser.close();
    res.json({ transcript: result.join("\n\n") });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load transcript." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Running on port " + port));
