// regualr express server
const express = require("express")
const app = express()
const PORT = process.env.PORT || 7000;

app.use(express.static("public"));

//check for 500
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke! Error:', err);
});

//lisissteen
app.listen(PORT, function () {
  console.log(`Server is running on port ${PORT}`);
});
