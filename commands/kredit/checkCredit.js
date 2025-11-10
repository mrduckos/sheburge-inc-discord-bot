const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const dataFile = path.join("./kredit.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("checkcredit")
    .setDescription("Näyttää käyttäjän kreditit.")
    .addStringOption(option =>
      option
        .setName("nimi")
        .setDescription("Käyttäjän nimi (valinnainen). Jos jätetään tyhjäksi, näytetään sinun kreditit.")
        .setRequired(false)
    ),

  async execute(interaction) {
    // Lue data
    if (!fs.existsSync(dataFile)) {
      return interaction.reply("❌ Kredit-tietokantaa ei vielä ole luotu.");
    }

    const data = JSON.parse(fs.readFileSync(dataFile));
    const inputName = interaction.options.getString("nimi");

    // Jos käyttäjä ei syötä nimeä, haetaan hänen oma käyttäjänimensä
    const name = inputName || interaction.user.username;

    // Etsi käyttäjä datasta
    const user = data.find(u => u.name === name);

    if (!user) {
      return interaction.reply(`❌ Käyttäjää **${name}** ei löytynyt.`);
    }

    await interaction.reply(`💰 **${name}**: ${user.credit} krediittiä`);
  }
};