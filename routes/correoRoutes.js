const express = require("express");
const router = express.Router();
const {
  envioCorreo,
  scheduleEmailReminder,
} = require("../controllers/correoController");

router.post("/envio", envioCorreo);
router.post("/schedule-email", scheduleEmailReminder);

module.exports = router;
