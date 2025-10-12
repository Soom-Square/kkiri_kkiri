const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendMail(to, subject, text) {
  await transporter.sendMail({
    from: `"${process.env.APP_NAME || 'App'}" <${process.env.APP_FROM}>`,
    to,
    subject,
    text,
  });
}

module.exports = { sendMail };