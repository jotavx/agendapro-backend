const express = require("express");
const router = express.Router();
const {
  sendWhatsapp,
  scheduleReminder,
  confirmAppointment,
  cancelAppointment,
} = require("../controllers/whatsappController");

router.post("/send-whatsapp", sendWhatsapp);
router.post("/schedule-reminder", scheduleReminder);

router.get("/confirm-appointment/:appointmentId", confirmAppointment);
router.get("/cancel-appointment/:appointmentId", cancelAppointment);

module.exports = router;
