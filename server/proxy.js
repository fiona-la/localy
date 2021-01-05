// setup the package variables
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");
const fetch = require("node-fetch");
// import list of bigbox stores
const bigBoxStores = require("./config.json")["bigBoxStores"];

// initialize the app
const app = express();

// set the app's functions
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());

// checks if store is a bigBox store
const isBigBoxStore = (storeName) => {
  storeName = storeName.toLowerCase();

  for (const bigBoxStore of bigBoxStores) {
    if (storeName.includes(bigBoxStore)) return true;
  }

  return false;
};

// call the API this is your api
app.get("/", (req, res) => {
  const { query, radius, location } = req.query;
  const [latitude, longitude] = location.split(",");

  // removes spaces in query string
  const newQuery = query.replace(/ /g, "+");

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${newQuery}&location=${latitude},${longitude}&radius=${radius}&key=${apiKey}`;

  axios
    .get(url)
    .then((data) => {
      let resultsArr = [];
      let bigBoxResultsArr = [];
      let i = 0;

      // check if name is in bigboxstores
      while (resultsArr.length < 3 && i < data.data.results.length) {
        const result = data.data.results[i];
        const nameOfStore = result.name;

        if (!isBigBoxStore(nameOfStore)) {
          resultsArr.push(result);
        } else {
          bigBoxResultsArr.push(result);
        }

        // iterate through results list
        i++;
      }

      // if there are less than 3 items, include some big box items
      if (resultsArr.length < 3) {
        resultsArr = [
          ...resultsArr,
          ...bigBoxResultsArr.slice(0, 3 - resultsArr.length),
        ];
        console.log(resultsArr.length);
      }
      res.send(resultsArr);
    })

    // catching errors
    .catch((error) => console.log(error));
});

// Open for Business!

app.get("/distance", (req, res) => {
  const { userLat, userLng, busLat, busLng } = req.query;
  const distUrl = `https://dev.virtualearth.net/REST/v1/Routes/DistanceMatrix?origins=${userLat},${userLng}&destinations=${busLat},${busLng}&travelMode=driving&key=`;
  fetch(distUrl)
    .then((data) => data.json())
    .then((data) => {
      res.send(
        data.resourceSets[0].resources[0].results[0].travelDistance
          .toString()
          .slice(0, 4)
      );
    })
    .catch((error) => console.log(error));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("server started"));
