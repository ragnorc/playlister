import Layout from "../components/layout";
import { getToken } from "../lib/utils";
import redirect from "../lib/redirect";
import { withAuthSync } from "../lib/auth";

function Home() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center">
        <a href="/api/oauth/spotify">Login</a>
      </div>
    </Layout>
  );
}

Home.getInitialProps = async context => {
  const { store, isServer, query, req } = context;
  /*
  var faunadb = require("faunadb"),
    q = faunadb.query;
  var client = new faunadb.Client({ secret: getToken(req) });
  let res = await client
    .query(q.Get(q.Identity()))
    .then(() => console.log("logged in "))
    .catch(() => {
      redirect(context, "/api/oauth/spotify");
    });
*/
  return {};
};

export default Home;
