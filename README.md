# vanilkovýblesk.cz — demo e-shop

Krátké demo lokálního e-shopu postaveného na Node.js, Express, EJS a SQLite.

Rychlé spuštění (Windows PowerShell):

```powershell
cd c:/vanilkovyblesk-eshop
npm install
npm start
```

Poté otevřete http://localhost:3000

Co je v repo:
- `app.js` — hlavní server
- `db.js` — SQLite helper + seed
- `views/` — EJS šablony
- `public/` — CSS a statika

Další kroky / nápady pro rozšíření:
- přidat autentizaci pro admin
- přidat platební bránu nebo integraci (Stripe/GoPay)
- přidat spravování skladu a objednávek

Další nástroje v repo:
- env příklad: `.env.example` (zkopírujte do `.env` a nastavte `ADMIN_PASSWORD`)
- tests: `tests/` (jest + supertest)
- CI workflow: `.github/workflows/ci.yml` — spouští testy a buildne Docker image

Rychlé lokální nástroje
- Spuštění jednoduchého smoke testu (ověří GET /, přihlášení admin a zobrazení `/admin/orders`):
	```powershell
	npm run smoke
	```
- Uvolnění portu 3000 (pokud něco blokuje port):
	```powershell
	npm run kill3000
	```
- Čekání, až server začne naslouchat na portu 3000 (pomůže v CI nebo skriptech):
	```powershell
	npm run waitport
	```

Poznámky
- Smoke test používá `ADMIN_PASSWORD` z `.env` (pokud není nastavena, použije výchozí hodnotu z `.env.example`).
- Nástroje najdete v `tools/` (skripty: `smoke.js`, `kill3000.js`, `waitPort.js`).
- Pokud chcete automatičtější testy v CI, lze `npm run smoke` spustit po startu služby ve vhodném prostředí.

Health endpoint
- Aplikace poskytuje jednoduchý health endpoint `GET /health` který vrací 200 JSON {status: 'ok'}. Je určený pro readiness/liveness kontroly a rychlé smoke testy.

Krátké aliasy pro pohodlné lokální použití

PowerShell (dočasná funkce v aktuální relaci):
```powershell
function Kill-3000 { node tools/kill3000.js }
function Smoke { node tools/smoke.js }
function WaitPort { node tools/waitPort.js }
```

Bash (přidat do `~/.bashrc` nebo spustit v terminálu):
```bash
alias kill3000='node tools/kill3000.js'
alias smoke='node tools/smoke.js'
alias waitport='node tools/waitPort.js'
```
