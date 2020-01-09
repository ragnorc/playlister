import cookies from "../../lib/cookies";
var faunadb = require("faunadb"),
  q = faunadb.query;
import axios from "axios";

async function handler(req, res) {
  const userID = req.query.id;
  const credentials = {
    client: {
      id: "3f149ab9e98b404681c23c5ac0557bba",
      secret: "731e1f5f35d145a88b88a5805ef599fb"
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

  const user = await faunaClient.query(
    q.Get(q.Match(q.Index("users_by_spotify_id"), userID))
  );
  let accessToken = await axios({
    method: "post",
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          credentials.client.id + ":" + credentials.client.secret
        ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    params: {
      grant_type: "refresh_token",
      refresh_token: user.data.spotifyRefreshToken
    }
  }).catch(error => console.log(error));
  accessToken = accessToken.data.access_token;
  console.log(accessToken);
  let songs = [];
  let response = {
    data: {
      next: "https://api.spotify.com/v1/me/tracks?limit=50&offset=0"
    }
  };
  while (response.data.next) {
    response = await axios({
      method: "get",
      url: response.data.next,
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json"
      }
    }).catch(error => console.log(error));
    for (let song of response.data.items) {
      songs.push(song.track.id);
    }
  }

  let deleted = await faunaClient
    .query(
      q.Difference(
        q.Select(
          ["data", "songs"],
          q.Get(q.Match(q.Index("users_by_spotify_id"), userID))
        ),
        songs
      )
    )
    .catch(error => console.log(error));
  let added = await faunaClient.query(
    q.Difference(
      songs,
      q.Select(
        ["data", "songs"],
        q.Get(q.Match(q.Index("users_by_spotify_id"), userID))
      )
    )
  );
  await faunaClient.query(
    q.Update(
      q.Select(["ref"], q.Get(q.Match(q.Index("users_by_spotify_id"), userID))),
      {
        data: {
          songs
        }
      }
    )
  );
  console.log("deleted");
  console.log(deleted);
  console.log("added");
  console.log(added);
  res.end(
    "Sync completed. User liked " +
      added.length +
      " songs and unliked " +
      deleted.length +
      " songs."
  );
}

export default cookies(handler);
