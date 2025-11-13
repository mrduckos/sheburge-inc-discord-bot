const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
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
    // Tarkista krediittidata
    if (!fs.existsSync(dataFile)) {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("❌ Virhe")
        .setDescription("Kredit-tietokantaa ei vielä ole luotu sinulle. Tee ensin `/addcredit` komento.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const data = JSON.parse(fs.readFileSync(dataFile));
    const name = interaction.user.username;
    const user = data.find(u => u.name === name);

    if (!user) {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("❌ Käyttäjää ei löytynyt")
        .setDescription(`Käyttäjää **${name}** ei löytynyt.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const betAmount = parseInt(interaction.options.getString("betti"));
    if (isNaN(betAmount) || betAmount <= 0) {
      const embed = new EmbedBuilder()
        .setColor("Orange")
        .setTitle("⚠️ Virheellinen panos")
        .setDescription("Betin tulee olla positiivinen kokonaisluku.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (user.credit < betAmount) {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("❌ Liian vähän krediittejä")
        .setDescription(`Sinulla ei ole tarpeeksi krediittejä. Sinulla on ${user.credit} krediittiä.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    user.credit -= betAmount;

    const suits = ["♠", "♥", "♦", "♣"];
    const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];

   function drawCard() {
      const rank = ranks[Math.floor(Math.random() * ranks.length)];
      const suit = suits[Math.floor(Math.random() * suits.length)];
      return { rank, suit };
    }

    function calculateHandValue(hand) {
      let value = 0;
      let aceCount = 0;
      for (const card of hand) {
        if (typeof card.rank === "string") {
          if (card.rank === "A") {
            value += 11;
            aceCount++;
          } else {
            // J, Q, K ovat 10
            value += 10;
          }
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

    // Alustavat kädet
    const playerHand = [drawCard(), drawCard()];
    const dealerHand = [drawCard(), drawCard()];

    const hitButton = new ButtonBuilder()
      .setCustomId("hit")
      .setLabel("🂡 Hit")
      .setStyle(ButtonStyle.Primary);

    const standButton = new ButtonBuilder()
      .setCustomId("stand")
      .setLabel("✋ Stand")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(hitButton, standButton);

    const playerValue = calculateHandValue(playerHand);

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("🃏 Blackjack")
      .setDescription(`Panoksesi: **${betAmount}** krediittiä`)
      .addFields(
        {
          name: "Sinun kätesi",
          value: `${playerHand.map(c => c.rank + c.suit).join(", ")} (arvo: ${playerValue})`,
        },
        { name: "Koneen näkyvä kortti", value: `${dealerHand[0].rank + dealerHand[0].suit}` }
      )
      .setFooter({ text: "Paina Hit lisätäksesi kortin tai Stand lopettaaksesi vuoron." });

      // Lähetä alkuperäinen viesti
    const message = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    // Luo komponenttien keräin
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000, // 1 minuutti aikaa pelaamiseen
      filter: i => i.user.id === interaction.user.id,
    });

    let finished = false;

    // Käsittele keräimen kokoelmat
    collector.on("collect", async i => {
      if (i.customId === "hit") {
        playerHand.push(drawCard());
        const value = calculateHandValue(playerHand);

        // Päivitä upotus
        const newEmbed = EmbedBuilder.from(embed)
          .setFields(
            {
              name: "Sinun kätesi",
              value: `${playerHand.map(c => c.rank + c.suit).join(", ")} (arvo: ${value})`,
            },
            { name: "Koneen näkyvä kortti", value: `${dealerHand[0].rank + dealerHand[0].suit}` }
          );

          // Tarkista ylitys
        if (value > 21) {
          finished = true;
          collector.stop();
          newEmbed
            .setColor("Red")
            .setDescription(`💥 Bust! Hävisit ja menetit ${betAmount} krediittiä.`)
            .setFooter({ text: "Peli päättyi. Sinulla on " + user.credit + " krediittiä." });
          fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
          await i.update({ embeds: [newEmbed], components: [] });
        } else {
          await i.update({ embeds: [newEmbed], components: [row] });
        }
      } else if (i.customId === "stand") {
        finished = true;
        collector.stop();

        // Dealerin vuoro
        let dealerValue = calculateHandValue(dealerHand);
        while (dealerValue < 17) {
          dealerHand.push(drawCard());
          dealerValue = calculateHandValue(dealerHand);
        }

        // Laske lopulliset arvot
        const playerValue = calculateHandValue(playerHand);
        let result = "";
        let color = "Yellow";

        // Määritä tulos
        if (dealerValue > 21 || playerValue > dealerValue) {
          const winnings = betAmount * 2;
          user.credit += winnings;
          result = `🎉 Voitit! Sait **${winnings}** krediittiä.\nSinulla on nyt **${user.credit}** krediittiä.`;
          color = "Green";
        } else if (playerValue < dealerValue) {
          result = `😞 Hävisit! Menetit **${betAmount}** krediittiä.\nSinulla on nyt **${user.credit}** krediittiä.`;
          color = "Red";
        } else {
          user.credit += betAmount;
          result = `🤝 Tasapeli! Panoksesi palautettiin.\nSinulla on nyt **${user.credit}** krediittiä.`;
        }

        // Tallenna päivitetyt krediitit
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

        // Luo lopullinen upotus
        const resultEmbed = new EmbedBuilder()
          .setColor(color)
          .setTitle("🃏 Blackjack - Tulokset")
          .addFields(
            {
              name: "Sinun kätesi",
              value: `${playerHand.map(c => c.rank + c.suit).join(", ")} (arvo: ${playerValue})`,
            },
            {
              name: "Koneen käsi",
              value: `${dealerHand.map(c => c.rank + c.suit).join(", ")} (arvo: ${dealerValue})`,
            },
            { name: "Tulos", value: result }
          )
          .setTimestamp();

        await i.update({ embeds: [resultEmbed], components: [] });
      }
    });

    // Käsittele keräimen lopetus
    collector.on("end", async () => {
      if (!finished) {
        const timeoutEmbed = new EmbedBuilder()
          .setColor("Grey")
          .setTitle("⌛ Aika loppui")
          .setDescription("Et vastannut ajoissa. Peli peruutettiin ja panosta ei palauteta.");

        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        await message.edit({ embeds: [timeoutEmbed], components: [] });
      }
    });
  },
};