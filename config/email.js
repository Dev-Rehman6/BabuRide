const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send email function
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Send verification code email
const sendVerificationCode = async (email, name, code) => {
  const message = `Hello ${name},\n\nYour verification code for password reset is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nRide Sharing Team`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Verification</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your verification code for password reset is:</p>
      <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${code}
      </div>
      <p style="color: #666;">This code will expire in <strong>10 minutes</strong>.</p>
      <p style="color: #666;">If you didn't request this, please ignore this email.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      <p style="color: #999; font-size: 12px;">Best regards,<br>Ride Sharing Team</p>
    </div>
  `;

  return sendEmail({
    email: email,
    subject: 'Password Reset Verification Code',
    message: message,
    html: html
  });
};
// Function to send "In Progress" email notification
const sendComplaintInProgressEmail = async (userEmail, userName, complaintTitle, adminNotes) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: `Complaint Update: In Progress - "${complaintTitle}"`,
    html: `
      <h2>Hello ${userName},</h2>
      <p>We have reviewed your complaint titled <strong>"${complaintTitle}"</strong> and we are actively working on resolving it.</p>
      ${adminNotes ? `<p><strong>Admin Note:</strong> ${adminNotes}</p>` : ''}
      <p>We will notify you as soon as your issue is completely resolved.</p>
      <br/>
      <p>Best regards,<br/>Support Team</p>
    `
  };

  return await transporter.sendMail(mailOptions);
};

// Function to send "Resolved" email notification
const sendComplaintResolvedEmail = async (userEmail, userName, complaintTitle, adminNotes) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: `Complaint Resolved: "${complaintTitle}"`,
    html: `
      <h2>Hello ${userName},</h2>
      <p>Great news! Your complaint titled <strong>"${complaintTitle}"</strong> has been successfully resolved.</p>
      ${adminNotes ? `<p><strong>Admin Note:</strong> ${adminNotes}</p>` : ''}
      <p>Thank you for your patience.</p>
      <br/>
      <p>Best regards,<br/>Support Team</p>
    `
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = {
  // export existing email functions here (e.g. sendVerificationCode),
  sendComplaintInProgressEmail,
  sendComplaintResolvedEmail,
  sendEmail,
  sendVerificationCode
};
