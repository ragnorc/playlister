import cookies from "../../../lib/cookies";
var faunadb = require("faunadb"),
  q = faunadb.query;
import axios from "axios";

const handler = (req, res) => {
  const credentials = {
    client: {
      id: "3f149ab9e98b404681c23c5ac0557bba",
      secret: process.env.SPOTIFY_CLIENT_SECRET
    },
    auth: {
      tokenHost: "https://accounts.spotify.com",
      tokenPath: "/api/token",
      authorizePath: "https://accounts.spotify.com/authorize"
    }
  };
  const oauth2 = require("simple-oauth2").create(credentials);
  const faunaClient = new faunadb.Client({
    secret: process.env.FAUNA_KEY
  });

  // Check that we received a State Cookie.
  if (!req.cookies.state) {
    res.statusCode = 400;
    res.end(
      "State cookie not set or expired. Maybe you took too long to authorize. Please try again."
    );
    // Check the State Cookie is equal to the state parameter.
  } else if (req.cookies.state !== req.query.state) {
    res.statusCode = 400;
    res.end("State validation failed");
  }
  let protocol = "https";
  if (req.headers.host.indexOf("localhost:") == 0) {
    protocol = "http";
  }
  // Exchange the auth code for an access token.
  console.log(req.cookies);
  oauth2.authorizationCode
    .getToken({
      code: req.query.code,
      redirect_uri: `${protocol}://${req.headers.host}/api/oauth/callback`
    })
    .then(results => {
      // We have an Instagram access token and the user identity now.
      console.log(results);
      const accessToken = results.access_token;
      const refreshToken = results.refresh_token;
      //const instagramUserID = results.user.id;
      axios({
        method: "get",
        url: `https://api.spotify.com/v1/me`,
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json"
        }
      }).then(result => {
        console.log(result.data);
        faunaClient
          .query(
            findOrCreateUserRef("users_by_spotify_id", {
              ...result.data,
              refreshToken
            })
          )
          .then(function(response) {
            console.log(response); // Would log the ref to console.
            res.statusCode = 200;
            res.cookie("token", response.secret, {
              maxAge: 3600000,
              sameSite: true,
              path: "/"
            });
            res.writeHead(302, { Location: "/dashboard" });

            res.end();
          });
      });
    })
    .catch(error => {
      console.log(error);
      res.statusCode = 200;
      res.end("end");
    });
};

function findOrCreateUserRef(index, user) {
  console.log(user);
  return q.Create(q.Tokens(), {
    instance: q.Select(
      ["ref"],
      q.Let(
        { userMatch: q.Match(q.Index(index), user.id) },
        q.If(
          q.Exists(q.Var("userMatch")),
          q.Update(q.Select(["ref"], q.Get(q.Var("userMatch"))), {
            data: {
              spotifyID: user.id,
              name: user.display_name || "",
              spotifyRefreshToken: user.refreshToken
            }
          }),

          q.Create(q.Collection("users"), {
            data: {
              spotifyID: user.id,
              name: user.display_name || "",
              spotifyRefreshToken: user.refreshToken
            }
          })
        )
      )
    )
  });
}

export default cookies(handler);
