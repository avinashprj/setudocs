const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({ res: "Hello from Setu" });
});

router.get("/config", (req, res) => {
  res.status(200).json(req.app.config);
});

// search on the index
router.post("/search", (req, res) => {
  const config = req.app.config;
  const index = req.app.index;
  const indexArray = [];
  index.search(req.body.keyword).forEach((id) => {
    indexArray.push(id._id);
  });

  const matches = config.docs.filter((doc) => {
    return indexArray.includes(doc._id);
  });
  console.log(matches, req.body.keyword);
  matches.forEach((item) => {
    delete item["docBody"];
  });
  res.status(200).json(matches);
});

module.exports = router;
