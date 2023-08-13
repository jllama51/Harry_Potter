require('dotenv').config();
const { Voice } = require('@signalwire/realtime-api')

const projectId = process.env.SIGNALWIRE_PROJECT_ID;
const token = process.env.SIGNALWIRE_TOKEN;
const verifiedNumber = process.env.VERIFIED_NUMBER;

const client = new Voice.Client({
  project: projectId,
  token: token,
  contexts: ["ivr"],
});

console.log("started");

client.on("call.received", async (call) => {
  console.log("Got call", call.from, call.to);

  try {
    await call.answer();
    console.log("Inbound call answered");
  } catch (error) {
    console.error("Error answering inbound call", error);
  }

  const playlist = new Voice.Playlist({ volume: 1.0 })
    .add(
      Voice.Playlist.Audio({
        url: "https://www.wavsource.com/snds_2020-10-01_3728627494378403/sfx/toot2_x.wav",
      })
    )
    .add(
      Voice.Playlist.TTS({
        text: "Thank you for calling the Hogwarts school of Witchcraft and Wizardry.",
        voice: "en-US-Neural" // Use the premium neural voice
      })
    )
    .add(Voice.Playlist.Silence({ duration: 1 }))
    .add(
      Voice.Playlist.TTS({
        text: "For Ollivanders wand sales shop press 1. For Wichcraft and wizard spell support appointment line press 2. To speak with a representative about student housing press 3. To hear all options again press 0",
        voice: "en-US-Neural" // Use the premium neural voice
      })
    );

  await promptCallOptions(call, playlist);
});

const promptCallOptions = async (call, playlist) => {
  try {
    const initialPrompt = await call.prompt({
      playlist: playlist,
      digits: {
        max: 1,
        digitTimeout: 2,
      },
    });

    const { digits } = await initialPrompt.waitForResult();

    switch (digits) {
      case "1":
        const playback = await call.playTTS({
          text: "You have reached Ollivanders wand sales shop. Our hours of operations vary from day to day. We are currently closed to new wand selections due to inventory shortages. Please try calling us back on another day. God Speed!",
          voice: "en-US-Neural" // Use the premium neural voice
        });
        await playback.waitForEnded();
        call.hangup();
        break;
      case "2":
        call.on("prompt.ended", (p) => {
          console.log(p.id, p.text);
          call.hangup();
        });

        const spellSupportPrompt = await call.prompt({
          playlist: new Voice.Playlist().add(
            Voice.Playlist.TTS({
              text: "You have reached the Witchcraft and Wizard spell support appointment line. Please say your name and number, reason for calling, and requested time of appointment.",
              voice: "en-US-Neural" // Use the premium neural voice
            })
          ),
          speech: {
            endSilenceTimeout: 1,
            speechTimeout: 60,
            language: "en-US",
          },
        });
        break;
      case "3":
        await promptCallOptions(call, playlist);
        break;
      case "0":
        const peer = await call.connectPhone({
          from: verifiedNumber,
          to: call.from,
          timeout: 30,
        });
        break;
      default:
        // Handle other cases or leave it empty if not needed
    }
  } catch (error) {
    console.error("Error during promptCallOptions:", error);
  }
};
