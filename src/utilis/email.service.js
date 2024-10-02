import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL, // Replace with your email
    pass: process.env.PASSWORD, // Replace with your email password or app-specific password if 2FA is enabled
  },
});

const emailOtp = async (user, otp) => {
  const mailOptions = {
    from: process.env.EMAIL, // Sender's email
    to: user.email, // Send to the user's email
    subject: "Your OTP Code",
    text: `Your OTP code is ${otp}. It will expire in 10 minutes.`, // Plain text body
    html: `<p>Your OTP code is <strong>${otp}</strong>. It will expire in 10 minutes.</p>`, // HTML body
  };

  await transporter.sendMail(mailOptions);
};

export { emailOtp };
