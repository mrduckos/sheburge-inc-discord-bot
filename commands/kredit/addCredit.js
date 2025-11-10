const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Polku data.json-tiedostoon (muokkaa tarvittaessa)
const dataFile = path.join("./kredit.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addcredit")
    .setDescription("Lisää tai päivittää käyttäjän kreditit.")
    .addStringOption(option =>
      option
        .setName("nimi")
        .setDescription("Käyttäjän nimi")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("kredit")
        .setDescription("Kreditin määrä")
        .setRequired(true)
    ),

  async execute(interaction) {
    const name = interaction.options.getString("nimi");
    const credit = interaction.options.getInteger("kredit");

    // Lue nykyinen data
    let data = [];
    if (fs.existsSync(dataFile)) {
      const rawData = fs.readFileSync(dataFile);
      data = JSON.parse(rawData);
    }

    // Etsi käyttäjä
    const existing = data.find(u => u.name === name);
    if (existing) {
      existing.credit = credit; // päivitä
    } else {
      data.push({ name, credit }); // lisää uusi
    }

    // Tallenna tiedostoon
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

    await interaction.reply(`✅ Käyttäjän **${name}** kreditit tallennettu (${credit})!`);
  }
};