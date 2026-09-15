const nodemailer = require('nodemailer');

// Mock transporter for development/testing
// In production, replace with actual SMTP credentials (e.g., SendGrid, AWS SES)
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: process.env.EMAIL_USER || 'mock_user@ethereal.email',
    pass: process.env.EMAIL_PASS || 'mock_password',
  },
});

const sendLowAttendanceWarning = async (studentEmail, studentName, courseName, attendancePercentage) => {
  const mailOptions = {
    from: '"SAS System Admin" <admin@sas.edu>',
    to: studentEmail,
    subject: `⚠️ Low Attendance Warning: ${courseName}`,
    html: `
      <h2>Attendance Warning</h2>
      <p>Dear ${studentName},</p>
      <p>This is an automated notice that your attendance in <strong>${courseName}</strong> has dropped to <strong>${attendancePercentage}%</strong>.</p>
      <p>Please ensure you attend future sessions to meet the minimum academic requirements.</p>
      <br>
      <p>Regards,<br>Secure Attendance System</p>
    `,
  };

  try {
    // We log it here so it doesn't actually crash if credentials aren't set
    console.log(`[Mock Email Triggered] To: ${studentEmail} | Subject: ${mailOptions.subject}`);
    // await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = {
  sendLowAttendanceWarning
};
