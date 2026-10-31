# Deploy CAS to the Hostinger KVM

GitHub builds the React app. The VPS only receives the finished `client/build` files and the Node server. A push restarts Node only when `server/` changed.

| Site | Branch | URL | VPS folder | Port | PM2 name | Redis DB | MongoDB database |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Test | `ucasaapptest_testCICD_testSite_deploy` | https://casai.testatozas.in | `/home/ucasaapp/htdocs/casai.testatozas.in` | `3005` | `cas-test` | `1` | `casai_test` |
| Production | `ucasaappmain_final_deploy` | https://www.ucasaapp.com | `/home/ucasaapp/htdocs/ucasaapp.com` | `3004` | `cas-live` | `0` | `casai` |

On each site the tree is:

```text
/home/ucasaapp/htdocs/<site>/server/          Node app (uploaded by GitHub)
/home/ucasaapp/htdocs/<site>/server/.env      created on the VPS, never uploaded
/home/ucasaapp/htdocs/<site>/server/build/    React build from GitHub
```

Nginx sends each domain to its own port. One process cannot serve both branches, because each deploy would overwrite the other site.

The workflow file is `.github/workflows/deploy.yml`. It must exist on both deploy branches or a push to that branch will not run it.

## 1. One-time VPS packages

SSH in as the user that should own the app (`ucasaapp`):

```bash
sudo apt-get update
sudo apt-get install -y curl ca-certificates nginx certbot python3-certbot-nginx
```

Install Node.js 20 for that same user. If `nvm` is already installed:

```bash
nvm install 20
nvm alias default 20
npm install -g pm2
```

If `node -v` is not v20 after a new login, install Node from NodeSource instead:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

Redis, if it is not already running:

```bash
sudo apt-get install -y redis-server
sudo systemctl enable --now redis-server
redis-cli ping
```

The reply should be `PONG`.

## 2. Folders

```bash
mkdir -p /home/ucasaapp/htdocs/ucasaapp.com/server
mkdir -p /home/ucasaapp/htdocs/casai.testatozas.in/server
```

If those directories were created as root, give them to the deploy user:

```bash
sudo chown -R ucasaapp:ucasaapp /home/ucasaapp/htdocs/ucasaapp.com
sudo chown -R ucasaapp:ucasaapp /home/ucasaapp/htdocs/casai.testatozas.in
```

Confirm DNS for `ucasaapp.com`, `www.ucasaapp.com`, `casai.testatozas.in`, and `www.casai.testatozas.in` points at this VPS before requesting certificates.

## 3. Environment files

Create two files on the server. Start from `server/.env.example` in the repo, then fill in real values. Do not commit the filled files and do not paste them into GitHub.

```bash
nano /home/ucasaapp/htdocs/ucasaapp.com/server/.env
nano /home/ucasaapp/htdocs/casai.testatozas.in/server/.env
```

Production and test must differ in at least these keys:

```text
PM2_APP_NAME
PORT
APP_ENV
CLIENT_URL
BUILD_PATH
MONGODB_URI
REDIS_DB
GOOGLE_CALLBACK_URL
ATOZAS_REDIRECT_URI
```

Production:

```text
PM2_APP_NAME=cas-live
PORT=3004
APP_ENV=live
NODE_ENV=production
CLIENT_URL=https://www.ucasaapp.com
BUILD_PATH=/home/ucasaapp/htdocs/ucasaapp.com/server/build
MONGODB_URI=mongodb://USER:PASSWORD@HOST:PORT/casai?authSource=casai
REDIS_DB=0
GOOGLE_CALLBACK_URL=https://www.ucasaapp.com/api/auth/google/callback
ATOZAS_REDIRECT_URI=https://www.ucasaapp.com/auth/atozas/callback
```

Test:

```text
PM2_APP_NAME=cas-test
PORT=3005
APP_ENV=test
NODE_ENV=production
CLIENT_URL=https://casai.testatozas.in
BUILD_PATH=/home/ucasaapp/htdocs/casai.testatozas.in/server/build
MONGODB_URI=mongodb://USER:PASSWORD@HOST:PORT/casai_test?authSource=casai
REDIS_DB=1
GOOGLE_CALLBACK_URL=https://casai.testatozas.in/api/auth/google/callback
ATOZAS_REDIRECT_URI=https://casai.testatozas.in/auth/atozas/callback
```

`APP_ENV` also separates Socket.IO Redis channels (`cas:live` and `cas:test`). `REDIS_DB` separates cached locations. Use `casai_test` on the test site so a staging deploy cannot write live trip data.

Create the test database once. From a machine that can reach MongoDB, connect with the app user and run `use casai_test`. The first write creates it. The app user needs read/write on that database.

`CORS_ORIGINS` on both files should include the live and test origins you already use, including the `www` variants.

Lock the files down:

```bash
chmod 600 /home/ucasaapp/htdocs/ucasaapp.com/server/.env
chmod 600 /home/ucasaapp/htdocs/casai.testatozas.in/server/.env
```

If production is already running under another PM2 name, either set `PM2_APP_NAME` to that existing name so the first deploy replaces it, or stop the old process during the cutover in step 8. Two processes cannot listen on port 3004.

## 4. Nginx and HTTPS

The `deploy/` folder is not uploaded by CI. From your computer, copy the example onto the VPS and install it:

```bash
scp -P 22 deploy/nginx/cas-sites.conf.example ucasaapp@YOUR_VPS_IP:/tmp/cas-sites.conf
ssh ucasaapp@YOUR_VPS_IP
sudo mv /tmp/cas-sites.conf /etc/nginx/sites-available/cas
sudo ln -sf /etc/nginx/sites-available/cas /etc/nginx/sites-enabled/cas
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx \
  -d ucasaapp.com -d www.ucasaapp.com \
  -d casai.testatozas.in -d www.casai.testatozas.in
```

Certbot adds the `listen 443 ssl` blocks. Leave the `proxy_pass` and WebSocket headers as they are. Socket.IO needs the `Upgrade` and `Connection` headers.

This app serves the React UI and the API from the same Node process. The domain should proxy `/` to Node, not serve `htdocs/.../build` as plain files. If a panel (OpenLiteSpeed, CyberPanel, aaPanel) already owns these domains, change that vhost to the proxy above instead of adding a second web server on port 80.

Node notices a new `server/build/index.html` within a couple of seconds, so a frontend-only deploy does not restart PM2. Until that file exists, the process keeps serving `BUILD_PATH` if that folder is already present.

Open only SSH and HTTP(S) in the firewall. Do not publish ports 3004 and 3005 once nginx is working:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 5. SSH key for GitHub

On your own computer, create a key that has no passphrase (Actions cannot type one):

```bash
ssh-keygen -t ed25519 -C "github-actions-cas" -f cas_deploy_key -N ""
```

On the VPS, as `ucasaapp`:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat >> ~/.ssh/authorized_keys   # paste the .pub file, then Ctrl-D
chmod 600 ~/.ssh/authorized_keys
```

Test from your computer:

```bash
ssh -i cas_deploy_key -p 22 ucasaapp@YOUR_VPS_IP
```

Keep the private key. You will paste it into GitHub in the next step. Do not commit it.

## 6. GitHub Environments and secrets

In the GitHub repo: **Settings → Environments → New environment**.

Create `test` and `production`. On `production`, add a required reviewer if you want a manual approval before live deploys.

**Repository secrets** (same VPS for both sites). Settings → Secrets and variables → Actions → Repository secrets:

| Secret | Value |
| --- | --- |
| `VPS_HOST` | VPS IP address |
| `VPS_PORT` | `22` |
| `VPS_USER` | `ucasaapp` |
| `VPS_SSH_KEY` | full private key, including the `BEGIN` and `END` lines |

**Environment secrets** (different folder per site). Open each environment and add:

| Environment | Secret | Value |
| --- | --- | --- |
| `production` | `VPS_APP_DIR` | `/home/ucasaapp/htdocs/ucasaapp.com` |
| `test` | `VPS_APP_DIR` | `/home/ucasaapp/htdocs/casai.testatozas.in` |

Change `VPS_APP_DIR` if the real site folder on the VPS is different. The workflow uploads the `server` directory into that folder and extracts the React build into `server/build`.

App secrets (MongoDB, JWT, SMTP, Google, SSO) stay in the two `.env` files. They are not GitHub secrets and they are not in the workflow.

## 7. Put the workflow on both branches

The file `.github/workflows/deploy.yml` has to be committed on each deploy branch. A workflow only runs from the branch that was pushed.

Commit the workflow and the server changes, then push the test branch first:

```bash
git push origin HEAD:ucasaapptest_testCICD_testSite_deploy
git push origin HEAD:ucasaappmain_final_deploy
```

Pushing a branch runs the workflow only if that branch contains `.github/workflows/deploy.yml`. Push test first and confirm it before pushing production.

## 8. First deploy

1. Confirm both `.env` files exist and `pm2 list` shows whether port 3004 is already taken.
2. Push to `ucasaapptest_testCICD_testSite_deploy`, or run **Actions → Deploy → Run workflow** on that branch with both inputs enabled.
3. The frontend job builds `client/` on GitHub and extracts it to `server/build`. It does not restart Node.
4. The backend job uploads `server/`, runs `npm ci --omit=dev`, and runs `pm2 startOrReload`.
5. On the VPS:

```bash
curl -fsS http://127.0.0.1:3005/api/v1/health
curl -fsS https://casai.testatozas.in/api/v1/health
```

6. Repeat for `ucasaappmain_final_deploy` and port 3004 / https://www.ucasaapp.com/api/v1/health.
7. Open each site in a browser, sign in, and confirm the map socket connects.

If the new PM2 name cannot bind because an older process still holds the port, the health check fails and the old site keeps serving. Then:

```bash
pm2 list
pm2 stop OLD_APP_NAME
pm2 restart cas-live
curl -fsS http://127.0.0.1:3004/api/v1/health
```

After the first successful backend start, later frontend-only pushes do not need a restart. Node reads `server/build` from disk on each request.

Start PM2 on boot once, as `ucasaapp`:

```bash
pm2 startup
# run the command it prints (it uses sudo)
pm2 save
```

## 9. What a later push does

| Change | Result |
| --- | --- |
| Files under `client/` | GitHub runs `npm ci` and `npm run build`, then replaces `server/build`. PM2 is not restarted. |
| Files under `server/` | The server folder is uploaded, excluding `.env`, `node_modules`, and `build`. `npm ci --omit=dev` runs, then PM2 reloads. |
| Both | Frontend upload finishes first, then the backend reloads so the new process sees the new build. |
| Any other path | No deploy. |
| **Run workflow** button | Deploys the selected branch. Uncheck frontend or backend to limit the run. |

Test pushes never write the production folder, and production pushes never write the test folder. Each job uses the GitHub Environment that matches the branch.

## 10. Rollback

GitHub → Actions → a previous successful run is not a redeploy button. Redeploy an older commit instead:

```bash
git push origin <good-commit-sha>:ucasaapptest_testCICD_testSite_deploy
```

Or check out the good commit on that branch and push. The next run uploads that revision.

PM2 keeps the previous process only until the reload. To return to the last saved process list:

```bash
pm2 resurrect
```

That restores the process list from `pm2 save`. It does not restore old source files. Prefer redeploying a known commit.

## 11. Logs

```bash
pm2 status
pm2 logs cas-test --lines 100
pm2 logs cas-live --lines 100
sudo tail -n 100 /var/log/nginx/error.log
```

A failed Actions job leaves the previous build in place if the extract step failed before the folder swap. A failed backend health check means the new process did not answer `/api/v1/health`. Read `pm2 logs` before starting another deploy.
