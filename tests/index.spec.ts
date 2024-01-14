import { test, expect } from "@playwright/test";

test("request pending deletion videos", async ({ page }) => {
  await page.goto("https://streamable.com/login");

  // Credentials
  const user = {
    name: process.env.STREAMABLE_USERNAME as string,
    password: process.env.STREAMABLE_PASSWORD as string,
  };

  // Login
  await page.fill('input[autocomplete="username"]', user.name);
  await page.fill('input[autocomplete="current-password"]', user.password);
  await page.click('button[type="submit"]');

  // Check if logged in
  await page.waitForLoadState("networkidle");
  expect(page.url()).toBe("https://streamable.com/");

  console.log("===================================");

  // Scrape video urls that has "pending deletion" tag from every page
  const videoUrls: string[] = [];

  while (true) {
    console.log("Scraping page:", page.url());

    // Wait for page to load
    await page
      .locator('button[class="search-button"]')
      .waitFor({ state: "visible" });

    const videoCards = await page.$$("div.card");
    for (const videoCard of videoCards) {
      const videoCardNotification = await videoCard.$(
        "div.video-thumbnail-container div.video-notification"
      );
      if (
        videoCardNotification &&
        (await videoCardNotification.innerText()) === "Pending Deletion"
      ) {
        const videoUrl = await videoCard.$eval("a#video-url-input", (el) =>
          el.getAttribute("href")
        );
        videoUrls.push(videoUrl as string);
      }
    }

    const nextPageButton = await page.$(
      'a.page-link:not(.disabled)[aria-label="Next"]'
    );

    if (nextPageButton) {
      await nextPageButton.click();
    } else {
      break;
    }
  }

  console.log("-----------------------------------");
  console.log("Found", videoUrls.length, "videos pending deletion");
  console.log("-----------------------------------");
  console.log(videoUrls.join("\n"));
  console.log("-----------------------------------");

  // Open each video page in new tab
  for (const videoUrl of videoUrls) {
    await page.evaluate((url) => window.open(url), videoUrl);
  }

  console.log("Closing browser in 10 seconds...");
  await page.waitForTimeout(10000);
  console.log("===================================");
});
