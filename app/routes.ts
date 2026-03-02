import { type RouteConfig, index, route} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route('/auth', 'routes/auth.tsx'),
  route('/upload','routes/upload.tsx'),
  // catch-all so that unexpected requests (e.g. Chrome DevTools "/.well-known/..." fetches)
  // don't generate noisy "No route matches" errors during development
  route('*', 'routes/notfound.tsx'),
] satisfies RouteConfig;
