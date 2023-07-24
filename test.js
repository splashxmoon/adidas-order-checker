const puppeteer = require('puppeteer');

async function start() {
  console.log('Script is running');
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--verbose'],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1020,
    height: 850,
    isMobile: false,
  });

  await page.goto('https://www.adidas.com/us/order-tracker', { timeout: 0 });
  await page.reload();

  try {
    const emailInput = await page.$('input[name="email"]');
    await emailInput.type('arunjdass@gmail.com');
    const orderNumberInput = await page.$('input[name="orderNo"]');
    await orderNumberInput.type('AD041474382');

    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.waitForSelector('h3[data-auto-id="product-name"]');
    await page.waitForSelector('dd[data-auto-id="product-size"]');
    const productName = await page.evaluate(() => {
      const productNameElement = document.querySelector('h3[data-auto-id="product-name"]');
      return productNameElement ? productNameElement.textContent : null;
    });
    const size = await page.evaluate(() => {
      const sizeElement = document.querySelector('dd[data-auto-id="product-size"]');
      return sizeElement ? sizeElement.textContent : null;
    });
    const productCode = await page.evaluate(() => {
      const productCodeElement = document.querySelector('dd[data-auto-id="product-code"]');
      return productCodeElement.textContent;
    });

    const trackingNumber = await page.evaluate(() => {
      const trackingNumberElement = document.querySelector('p.tracking-description___3iTmt');
      const trackingNumberText = trackingNumberElement.textContent;
      const numberPart = trackingNumberText.split(':')[1].trim();
      return numberPart;
    });

    // Take a screenshot of the image
    await page.waitForSelector('img[data-auto-id="image"]');
    const imageElementHandle = await page.$('img[data-auto-id="image"]');
    const boundingBox = await imageElementHandle.boundingBox();

    if (boundingBox && boundingBox.height > 0) {
      const screenshotName = `screenshot${Date.now()}.png`;

      await page.screenshot({
        path: screenshotName,
        clip: boundingBox,
      });

      console.log(`Screenshot saved as ${screenshotName}`);

      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'Kripsy Kreme AIO',
        })
        .setTitle('Krispy Kreme Account Info')
        .setDescription('New account has been created.')
        .setColor(5763719)
        .addFields(
          { name: 'Email', value: `||${email}||`, inline: true },
          { name: 'Password', value: `||${password}||`, inline: true },
          { name: 'Date', value: `Month: ${currentMonth}, Day: ${currentDay}`, inline: true }
        )
        .setImage(`attachment://${screenshotName}`);

      await interaction.reply({ embeds: [embed], files: [screenshotName] });
    }

    console.log('Product Name:', productName);
    console.log('Size:', size);
    console.log('Product Code:', productCode);
    console.log('Tracking Number:', trackingNumber);
  } catch (error) {
    console.error('Error:', error);
  }

  await browser.close();
}

start();
