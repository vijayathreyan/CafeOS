// ESLint 8 emits a "File ignored" WARNING (not error) when an explicitly-passed
// path matches ignorePatterns. lint-staged passes absolute file paths, so files
// in src/components/ui/, vite.config.ts, etc. trigger that warning and trip
// --max-warnings 0. Filter them out before handing the list to ESLint.
const ESLINT_IGNORE = [
  'src/components/ui',
  'src/hooks/use-toast.ts',
  'tailwind.config.js',
  'postcss.config.js',
  'vite.config.ts',
  'dist',
  'playwright-report',
  'test-results',
]

/** @type {import('lint-staged').Config} */
export default {
  '*.{js,ts,tsx}': (files) => {
    const eslintFiles = files.filter(
      (f) => !ESLINT_IGNORE.some((ig) => f.replace(/\\/g, '/').includes(ig))
    )
    const cmds = []
    if (eslintFiles.length > 0) {
      cmds.push(`eslint --fix --max-warnings 0 ${eslintFiles.join(' ')}`)
    }
    cmds.push(`prettier --write ${files.join(' ')}`)
    return cmds
  },
  '*.{json,css,md}': ['prettier --write'],
}
