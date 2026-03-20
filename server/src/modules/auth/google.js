const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function googleAuth(req, res) {
  const { token } = req.body;

  try {
    // 1. Verify the token Google sent
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // 2. Find or create the user in your DB
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, name, avatar: picture, googleId });
    }

    // 3. Sign your own JWT and return it
    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ user, jwtToken });

  } catch (err) {
    res.status(401).json({ error: 'Invalid Google token.' });
  }
}