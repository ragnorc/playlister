import cookie from "cookie";

export function getToken(req) {
  const cookies = cookie.parse(
    req ? req.headers.cookie || "" : document.cookie
  );
  return cookies.token;
}
