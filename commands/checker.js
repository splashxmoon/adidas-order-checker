const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');

const botToken = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;

const commands = [
  new SlashCommandBuilder()
    .setName('adidas')
    .setDescription('Checks Adidas order')
    .addStringOption(option =>
      option.setName('orders')
        .setDescription('Email and order number pairs')
        .setRequired(true))
    .toJSON()
];

const rest = new REST({ version: '9' }).setToken(botToken);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(clientId), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adidas')
    .setDescription('Checks Adidas order')
    .addStringOption(option =>
      option.setName('orders')
        .setDescription('Email and order number pairs')
        .setRequired(true))
    .toJSON(),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const orders = interaction.options.getString('orders');
      const orderEntries = orders.split(' ');

      const savedEmbeds = [];

      for (const orderEntry of orderEntries) {
        const [email, orderNumber] = orderEntry.split(':');

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
          await emailInput.type(email);
          const orderNumberInput = await page.$('input[name="orderNo"]');
          await orderNumberInput.type(orderNumber);

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

          const addressHtml = '<address class="address___3gN3A" data-auto-id="order-details-address-shipping"><ul><li>Arun Dass</li><li>30 Kenzbrit ct</li><li>Poughkeepsie, NY, 12603, USA</li></ul><ul class="gl-vspace-bpall-small"><li>+18455460513</li><li>arunjdass@gmail.com</li></ul></address>';

          // Extract the address details using regular expressions
          const addressRegex = /<li>(.*?)<\/li>/g;
          const addressMatches = addressHtml.match(addressRegex);
          const addressDetails = addressMatches.map(match => match.replace(/<\/?li>/g, ''));

          // Extract individual address components
          const name = addressDetails[0];
          const street = addressDetails[1];
          const cityStateZip = addressDetails[2];

          // Split city, state, and ZIP code
          const cityStateZipRegex = /([^,]+),\s+([^,]+),\s+([\d-]+)/;
          const cityStateZipMatches = cityStateZip.match(cityStateZipRegex);
          const city = cityStateZipMatches[1];
          const state = cityStateZipMatches[2];
          const zipCode = cityStateZipMatches[3];

          // Print the extracted address details
          console.log('Name:', name);
          console.log('Street:', street);
          console.log('City:', city);
          console.log('State:', state);
          console.log('ZIP Code:', zipCode);

          const fedexTrackingLink = `https://www.fedex.com/fedextrack?trknbr=${trackingNumber}`;

          await page.waitForSelector('img[data-auto-id="image"]');
          const elementHandle = await page.$('img[data-auto-id="image"]');
          await new Promise((resolve) => setTimeout(resolve, 5000));

          const boundingBox = await elementHandle.boundingBox();

          if (boundingBox && boundingBox.height > 0) {
            const screenshotName = `screenshot${Date.now()}.png`;
            const screenshotPath = path.join(__dirname, screenshotName);

            await page.screenshot({
              path: screenshotPath,
              clip: boundingBox,
            });

            console.log(`Screenshot saved as ${screenshotName}`);

            await browser.close();

            const embed = new EmbedBuilder()
              .setTitle('Adidas Order')
              .setColor(5763719)
              .addFields(
                { name: 'Product Name:', value: `${productName}`, inline: true },
                { name: 'Size:', value: `${size}`, inline: false },
                { name: 'SKU:', value: `${productCode}`, inline: false },
                { name: 'Tracking Number:', value: `||${trackingNumber}||`, inline: false },
                { name: 'Email', value: `||${email}||`, inline: true },
                { name: 'Order Number', value: `||${orderNumber}||`, inline: true },
                { name: 'FedEx Tracking:', value: `[Click here](${fedexTrackingLink})`, inline: false },
                { name: 'Shipping Info:', value: `||Name: ${name}\nAddress:\n${street}\n${city}, ${state}, ${zipCode}||`, inline: false },
              )
              .setImage(`attachment://${path.basename(screenshotPath)}`);

            savedEmbeds.push({ embed, file: screenshotPath });
          }
        } catch (error) {
          console.error(error);
          await interaction.editReply('There was an error while getting the order information.');
        } finally {
          await browser.close();
        }
      }

      if (savedEmbeds.length > 0) {
        // Send all saved embeds in a single reply
        await interaction.editReply({ embeds: savedEmbeds.map(obj => obj.embed), files: savedEmbeds.map(obj => obj.file) });
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply('There was an error while executing this command!');
    }
  },
};
