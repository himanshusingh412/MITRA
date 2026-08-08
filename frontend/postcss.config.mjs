/**
 * Plugins are named as strings because Next's webpack CSS pipeline requires that form
 * (passing a required function fails with "Malformed PostCSS Configuration").
 *
 * The build runs with `--webpack` for the same reason Tailwind 3 is pinned: Turbopack's
 * PostCSS transform cannot resolve Tailwind 3's internal asset paths. Moving to Tailwind 4
 * removes both constraints and lets the build return to the default bundler.
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
