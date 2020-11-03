const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const secrets = require('./secrets.json'); // contains the bot_key for discord
const config = require('./config.json');
const Discord = require('discord.js');
const botClient = new Discord.Client();
const voiceChanIds = {
  waiting: null,
  screening: []
}

app.use(express.static('public'));

server.listen(3000);

io.on('connection', (socket) => {

  if (voiceChanIds.waiting) {
    SendInitialData(socket);
  }
  else {
    setTimeout(() => {
      SendInitialData(socket);
    }, 500);
  }


  socket.on('select_caller', (callerId, ack) => {
    let readyRooms = [];
    voiceChanIds.screening.forEach(chan => {
      if (botClient.channels.cache.get(chan).members.size === 1 && !botClient.channels.cache.get(chan).members.first().voice.selfDeaf) {
        readyRooms.push(chan);
      }
    });
    if (readyRooms.length < 1) {
      ack('no_screeners');
      return;
    }

    let pickedRoom = readyRooms[Math.floor(Math.random() * readyRooms.length)];
    let selectedClient = botClient.channels.cache.get(voiceChanIds.waiting).members.get(callerId);
    if (!selectedClient) {
      ack('not_waiting');
      return;
    }

    selectedClient.voice.setChannel(pickedRoom, "Selected for Screening");
    ack('success');
  })
})

function SendInitialData(socket) {
  RunTheNumbers();
  socket.emit('initial_data', botClient.channels.cache.get(voiceChanIds.waiting).members.map(
    (member) => {
      return {
        name: member.displayName,
        id: member.id
      }
    }
  ));
}

function RunTheNumbers() {
  let screenTotal = 0, screenReady = 0;
  voiceChanIds.screening.forEach(chan => {
    switch (botClient.channels.cache.get(chan).members.size) {
      case 0:
        break
      case 1:
        if (!botClient.channels.cache.get(chan).members.first().voice.selfDeaf)
          screenReady++;
      default:
        screenTotal++;
    }
  });
  io.emit('numbers_data', {
    waiting: botClient.channels.cache.get(voiceChanIds.waiting).members.size,
    screen_total: screenTotal,
    screen_ready: screenReady
  });
}

botClient.login(secrets.bot_key);

botClient.on('ready', () => {
  console.log(`Discord Bot client connection ready!`);
  voiceChanIds.waiting = botClient.channels.cache.find((chan) => chan.name === config.waiting_room_name).id;
  voiceChanIds.screening = botClient.channels.cache.filter((chan) => chan.name.startsWith(config.screening_rooms_prefix)).map((val) => (val.id));
});

botClient.on('guildCreate', (guild) => {
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
});

botClient.on('guildDelete', (guild) => {
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
});

botClient.on('voiceStateUpdate', (oldState, newState) => {
  if (oldState.channelID === newState.channelID) //ignore changes not related to join, leave, or moving between channels
    return

  RunTheNumbers();

  if (newState.channelID === voiceChanIds.waiting) {
    io.emit('wait_join', {
      name: newState.member.displayName,
      id: newState.member.id
    });
  }

  if (oldState.channelID === voiceChanIds.waiting) {
    io.emit('wait_leave', newState.member.id);
  }
});
