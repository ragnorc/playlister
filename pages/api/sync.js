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
  const accessToken = (
    await oauth2.accessToken
      .create({ refresh_token: user.data.spotifyRefreshToken })
      .refresh()
  ).token.access_token;
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
    });
    for (let song of response.data.items) {
      songs.push(song.track.id);
    }
  }

  let deleted = await faunaClient.query(
    q.Difference(
      q.Select(
        ["data", "songs"],
        q.Get(q.Match(q.Index("users_by_spotify_id"), userID))
      ),
      songs
    )
  );
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
      added.length +
      " songs."
  );
}

export default cookies(handler);
