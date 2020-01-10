import cookies from "../../../lib/cookies";

const handler = (req, res) => {
  const credentials = {
    client: {
      id: "3f149ab9e98b404681c23c5ac0557bba",
      secret: process.env.SPOTIFY_CLIENT_SECRET
    },
    auth: {
      tokenHost: "https://accounts.spotify.com/api/",
      tokenPath: "/token",
      authorizePath: "https://accounts.spotify.com/authorize"
    }
  };
  console.log(process.env.SPOTIFY_CLIENT_SECRET);
  const oauth2 = require("simple-oauth2").create(credentials);
  const crypto = require("crypto");
  // Generate a random state verification cookie.
  const state = req.cookies.state || crypto.randomBytes(20).toString("hex");
  // Allow unsecure cookies on localhost.
  const secureCookie = req.headers.host.indexOf("localhost:") !== 0;
  res.cookie("state", state.toString(), {
    maxAge: 3600000,
    secure: secureCookie,
    httpOnly: true
  });
  let protocol = "https";
  if (!secureCookie) {
    protocol = "http";
  }
  // Authorization oauth2 URI
  const authorizationUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: `${protocol}://${req.headers.host}/api/oauth/callback`,
    scope: [
      "user-read-private",
      "user-read-email",
      "playlist-modify-private",
      "user-library-modify",
      "user-library-read"
    ],
    state
  });
  console.log(req.headers);
  res.statusCode = 200;
  res.writeHead(302, { Location: authorizationUri });
  res.end();
};

export default cookies(handler);
