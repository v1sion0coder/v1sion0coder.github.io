// Build and publish dist/ to the gh-pages branch (served by GitHub Pages).
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const run = (c, o = {}) => execSync(c, { stdio: 'inherit', ...o });
process.env.VITE_API_URL ||= 'https://v1sion-orders.onrender.com';
run('npx vite build');
writeFileSync('dist/.nojekyll', '');
const remote = execSync('git remote get-url origin').toString().trim();
const opts = { cwd: 'dist' };
run('git init -q -b gh-pages', opts);
run('git add -A', opts);
run('git -c user.name=v1sion0coder -c user.email=315087401+v1sion0coder@users.noreply.github.com commit -q -m "Deploy site"', opts);
run(`git push -f ${remote} gh-pages`, opts);
