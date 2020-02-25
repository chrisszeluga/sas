const cachios = require("cachios");
const axios = require("axios");
const cheerio = require("cheerio");
const jsonframe = require("jsonframe-cheerio");
const fs = require("fs").promises;
const logger = require("../logger.js");

// New caching instance
const cachiosInstance = cachios.create(
  axios.create({
    timeout: 55000
  })
);

const getChatsData = async () => {
  // Cache CHATS response after obtaining it,
  // as their app consistently has long responses or times out
  const response = await cachiosInstance.get(
    "https://www.miemssalert.com/Chats/Default.aspx?hdRegion=5",
    {
      ttl: 300
    }
  );
  const $ = cheerio.load(response.data);
  jsonframe($);

  const frame = {
    blue: {
      _s: "#tblCounties tr:not(:first-child)",
      _d: [
        {
          title: "td:nth-of-type(1)",
          blue: "td:nth-of-type(2)"
        }
      ]
    },
    hospitals: {
      _s: "#tblHospitals tr:not(:first-child)",
      _d: [
        {
          title: "td:nth-of-type(1)",
          alert: {
            yellow: "td:nth-of-type(2)",
            red: "td:nth-of-type(3)",
            green: "td:nth-of-type(4)",
            orange: "td:nth-of-type(5)",
            purple: "td:nth-of-type(6)"
          }
        }
      ]
    }
  };

  let scrape = $("body").scrape(frame);
  scrape.updatedAt = Date.now();

  return scrape;
};

const getHospitalMeta = async () => {
  const data = await fs.readFile("./data/hospitals.json");
  const hospitalList = Buffer.from(data);
  return JSON.parse(hospitalList);
};

const buildHospitals = async () => {
  const chatsData = await getChatsData();
  const hospitalData = await getHospitalMeta();

  // Wait for both data streams to be loaded
  const [loadedChats, loadedHospitals] = await Promise.all([
    chatsData,
    hospitalData
  ]);

  let returnData = {};
  returnData.blue = [];

  loadedChats.blue.forEach(function(item) {
    returnData.blue.push({
      title: item.title,
      blue: typeof item.blue != "undefined" ? true : false
    });
  });

  returnData.hospitals = [];

  // Merge two data streams together
  loadedHospitals.data[0].hospitals.forEach(function(item) {
    const chatsHospital = loadedChats.hospitals.find(function(hospital) {
      return hospital.title === item.title;
    });

    let buildHospital = item;
    buildHospital.statuses = {};

    // If chats has our hospital, add the statuses
    if (chatsHospital) {
      buildHospital.statuses.yellow =
        typeof chatsHospital.alert.yellow != "undefined" ? true : false;
      buildHospital.statuses.red =
        typeof chatsHospital.alert.red != "undefined" ? true : false;
      buildHospital.statuses.green =
        typeof chatsHospital.alert.green != "undefined" ? true : false;
      buildHospital.statuses.orange =
        typeof chatsHospital.alert.orange != "undefined" ? true : false;
      buildHospital.statuses.purple =
        typeof chatsHospital.alert.purple != "undefined" ? true : false;
    } else {
      // if not, chats hospital named changed, warn us
      console.warn(`Warning: Cannot find ${hospital.title} in CHATS`);
    }

    returnData.hospitals.push(buildHospital);
  });

  returnData.updatedAt = chatsData.updatedAt;

  return returnData;
};

exports.getHospitalsJson = async (req, res) => {
  const hospitals = await buildHospitals();
  // logger.info("server.hospitals.update", hospitals);
  res.json(hospitals);
};

exports.getHospitals = async (req, res) => {
  const hospitals = await buildHospitals();
  res.render("hospitals", { title: "Hospital Status", hospitals });
};
