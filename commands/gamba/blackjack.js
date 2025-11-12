const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const dataFile = path.join("./kredit.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("Blackjackiä krediteillä. Anna betti ja peliä!")
    .addStringOption(option =>
    option
         .setName("betti")
         .setDescription("Krediittien määrä, jonka haluat panostaa.")
         .setRequired(true)
    ),

  async execute(interaction) {
    // Lue data
    if (!fs.existsSync(dataFile)) {
      return interaction.reply("❌ Kredit-tietokantaa ei vielä ole luotu sinulle. Tee ensin /addcredit komento.");
    }

    const data = JSON.parse(fs.readFileSync(dataFile));

    // Jos käyttäjä ei syötä nimeä, haetaan hänen oma käyttäjänimensä
    const name = interaction.user.username;

    // Etsi käyttäjä datasta
    const user = data.find(u => u.name === name);

    if (!user) {
      return interaction.reply(`❌ Käyttäjää **${name}** ei löytynyt.`);
    }

    const betAmount = parseInt(interaction.options.getString("Betti"));
    //if (isNaN(betAmount) || betAmount <= 0) {
    //    return interaction.reply("❌ Betin tulee olla positiivinen kokonaisluku.");
    //}

    if (user.credit < betAmount) {
        return interaction.reply(`❌ Sinulla ei ole tarpeeksi krediittejä. Sinulla on ${user.credit} krediittiä.`);
    }

    // Vähennä betti käyttäjän krediiteistä
    user.credit -= betAmount;

    maat = ['♠', '♥', '♦', '♣'];
    function drawCard() {
        const rank = Math.floor(Math.random() * 13) + 1;
        const suit = maat[Math.floor(Math.random() * maat.length)];
        return { rank, suit };
    }

    function calculateHandValue(hand) {
        let value = 0;
        let aceCount = 0;
        for (const card of hand) {
            if (card.rank > 10) {
                value += 10;
            } else if (card.rank === 1) {
                value += 11;
                aceCount++;
            } else {
                value += card.rank;
            }
        }
        while (value > 21 && aceCount > 0) {
            value -= 10;
            aceCount--;
        }
        return value;
    }

    // Pelaajan käsi
    const playerHand = [drawCard(), drawCard()];
    let playerValue = calculateHandValue(playerHand);
    await interaction.reply(`🃏 Sinun kätesi: ${playerHand.map(c => c.rank + c.suit).join(', ')} (arvo: ${playerValue})`);

    // Koneen käsi
    const dealerHand = [drawCard(), drawCard()];
    let dealerValue = calculateHandValue(dealerHand);
    await interaction.followUp(`🤖 Koneen käsi: ${dealerHand.map(c => c.rank + c.suit).join(', ')} (arvo: ${dealerValue})`);

    let resultMessage = '';
    if (playerValue > dealerValue || dealerValue > 21) {
        const winnings = betAmount * 2;
        user.credit += winnings;
        resultMessage = `🎉 Voitit! Sait ${winnings} krediittiä. Sinulla on nyt ${user.credit} krediittiä.`;
    } else if (playerValue < dealerValue) {
        resultMessage = `😞 Hävisit! Menetit ${betAmount} krediittiä. Sinulla on nyt ${user.credit} krediittiä.`;
    } else {
        user.credit += betAmount;
        resultMessage = `🤝 Tasapeli! Panoksesi palautettiin. Sinulla on nyt ${user.credit} krediittiä.`;
    }
    
    // Tallenna päivitetty data
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    await interaction.followUp(resultMessage);

    
}
};