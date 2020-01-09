import { useEffect } from "react";
import Router from "next/router";
import { parseCookies, setCookie, destroyCookie } from "nookies";

export const login = ({ token }) => {
  setCookie({}, "token", token, {
    maxAge: 30 * 24 * 60 * 60,
    path: "/"
  });
  Router.push("/");
};

export const auth = ctx => {
  const { token } = parseCookies(ctx);

  /*
   * If `ctx.req` is available it means we are on the server.
   * Additionally if there's no token it means the user is not logged in.
   */
  if (ctx.req && !token) {
    ctx.res.writeHead(302, { Location: "/" });
    ctx.res.end();
  }

  // We already checked for server. This should only happen on client.
  if (!token) {
    Router.push("/");
  }

  return token;
};

export const logout = () => {
  destroyCookie({}, "token");

  // to support logging out from all windows
  window.localStorage.setItem("logout", Date.now());
  Router.push("/");
};

export const withAuthSync = WrappedComponent => {
  const Wrapper = props => {
    const syncLogout = event => {
      if (event.key === "logout") {
        console.log("logged out from storage!");
        Router.push("/");
      }
    };

    useEffect(() => {
      window.addEventListener("storage", syncLogout);

      return () => {
        window.removeEventListener("storage", syncLogout);
        window.localStorage.removeItem("logout");
      };
    }, [null]);

    return <WrappedComponent {...props} />;
  };

  Wrapper.getInitialProps = async ctx => {
    const token = auth(ctx);

    const componentProps =
      WrappedComponent.getInitialProps &&
      (await WrappedComponent.getInitialProps(ctx));

    return { ...componentProps, token };
  };

  return Wrapper;
};
