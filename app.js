"use strict";
require('dotenv').config();
console.log("\n BEM VINDO!")

const token = process.env.TOKEN;
const express = require("express")
const body_parser = require("body-parser")
const axios = require("axios").default
const app = express().use(body_parser.json())

const { Configuration, OpenAIApi } = require('openai')

const configuration = new Configuration({
  organization: process.env.ORGANIZATIONAPI,
  apiKey: process.env.GOBAL_APIKEY,
});

const openai = new OpenAIApi(configuration);

// gera resposta em texto
const getDavinciResponse = async (clientText) => {
      const options = {
          model: "text-davinci-003", // Modelo GPT a ser usado
          prompt: clientText, // Texto enviado pelo usuário
          temperature: 1, // Nível de variação das respostas geradas, 1 é o máximo
          max_tokens: 4000 // Quantidade de tokens (palavras) a serem retornadas pelo bot, 4000 é o máximo
      }
  
      try {
          const response = await openai.createCompletion(options)
          let botResponse = ""
          response.data.choices.forEach(({ text }) => {
              botResponse += text
          })
          return `Chat GPT 🤖\n\n ${botResponse.trim()}`
      } catch (e) {
          return `❌ OpenAI Response Error: ${e.response.data.error.message}`
      }
}
  
// gera a url da imagem
const getDalleResponse = async (clientText) => {
      const options = {
          prompt: clientText, // Descrição da imagem
          n: 1, // Número de imagens a serem geradas
          size: "1024x1024", // Tamanho da imagem
      }
  
      try {
          const response = await openai.createImage(options);
          return response.data.data[0].url
      } catch (e) {
          return `❌ OpenAI Response Error: ${e.response.data.error.message}`
      }
}

app.listen(process.env.PORT || 1337, () => console.log("© TecMash - Webhook online"));

app.post("/webhook", async (req, res) => {
  let h = req.body;
  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      let phone_number_id =
        req.body.entry[0].changes[0].value.metadata.phone_number_id;
      let from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
      let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; // extract the message text from the webhook payload

      if (msg_body.includes('/bot ')){
        const index = msg_body.indexOf(" ");
        const question = msg_body.substring(index + 1);
        getDavinciResponse(question).then((response) => {
          console.log('Pergunta: ' + question + '\n')
          console.log('Resposta: ' + response)
          axios({
            method: "POST", // Required, HTTP method, a string, e.g. POST, GET
            url:
              "https://graph.facebook.com/v14.0/" +
              phone_number_id +
              "/messages?access_token=" +
              token,
            data: {
              messaging_product: "whatsapp",
              to: from,
              text: { body: response },
            },
            headers: { "Content-Type": "application/json" },
          });
        })
      }

      if (msg_body.includes('/img ')){
        const index = msg_body.indexOf(" ");
        const imgDescription = msg_body.substring(index + 1);
        getDalleResponse(imgDescription, msg_body).then(async (imgUrl) => {
          console.log('Imagem: ' + imgDescription + '\n')
          console.log('URL: ' + imgUrl)
          axios({
            method: "POST", // Required, HTTP method, a string, e.g. POST, GET
            url:
              "https://graph.facebook.com/v14.0/" +
              phone_number_id +
              "/messages?access_token=" +
              token,
            data: {
              messaging_product: "whatsapp",
              to: from,
              type: "image",
              image: {
                link : imgUrl
              }
            },
            headers: { "Content-Type": "application/json" },
          });
        })
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.get("/webhook", (req, res) => {
  const verify_token = process.env.VERIFY_TOKEN;
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];
  if (mode && token) {
    if (mode === "subscribe" && token === verify_token) {
      console.log("© TecMash - Webhook verificado");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});