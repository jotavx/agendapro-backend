const nodeMailer = require("nodemailer");
const cron = require("node-cron");
require("dotenv").config();

let scheduledEmailReminders = [];

const transporter = nodeMailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Enviar correo inmediatamente
const envioCorreo = (req, res) => {
  const { to, subject, text } = req.body;

  const opciones = {
    from: process.env.SMTP_USER,
    to: to,
    subject: subject,
    text: text,
  };

  transporter.sendMail(opciones, (error, result) => {
    if (error) return res.status(500).json({ ok: false, msg: error.message });

    return res.json({ ok: true, msg: "Correo enviado con éxito" });
  });
};

// Programar un recordatorio por email
const scheduleEmailReminder = (req, res) => {
  const { to, subject, text, datetime } = req.body;

  if (!to || !subject || !text || !datetime) {
    return res
      .status(400)
      .json({ error: "Email, asunto, mensaje y fecha requeridos" });
  }

  const date = new Date(datetime);
  if (isNaN(date.getTime())) {
    return res.status(400).json({ error: "Formato de fecha inválido" });
  }

  const cronTime = `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${
    date.getMonth() + 1
  } *`;

  try {
    const job = cron.schedule(
      cronTime,
      async () => {
        try {
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to,
            subject,
            text,
          });
          console.log(`Correo programado enviado a ${to}`);
        } catch (error) {
          console.error("Error enviando recordatorio por email:", error);
        }
      },
      { scheduled: true, timezone: "America/Argentina/Buenos_Aires" }
    );

    scheduledEmailReminders.push({ to, subject, job });

    res.json({
      success: true,
      message: "Recordatorio programado correctamente",
    });
  } catch (error) {
    res.status(500).json({ error: "Error al programar el correo" });
  }
};

module.exports = { envioCorreo, scheduleEmailReminder };
