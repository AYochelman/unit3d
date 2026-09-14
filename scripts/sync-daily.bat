@echo off
REM ============================================================================
REM  Unit 3D - reads the MakerWorld collections and queues what is new.
REM
REM  Runs on ARIEL'S OWN MACHINE, once a day, from Task Scheduler.
REM
REM  Why here and not on GitHub: Cloudflare serves the collection PAGES a
REM  challenge to every datacenter address - GitHub's runners and hosted browser
REM  services alike, both tested - while a home connection is never challenged.
REM  The nightly job on GitHub reported "signedIn: true" and then "Cloudflare"
REM  for all eight collections, every night. This is the same script, run from
REM  an address the site trusts.
REM
REM  Nothing is approved here. What is new lands in /admin -> models awaiting
REM  approval, and a person still decides model by model.
REM ============================================================================
setlocal
cd /d "%~dp0.."

REM The signed-in browser profile. Created once by: npm run sync:collections -- --login
set MAKERWORLD_PROFILE_DIR=%~dp0..\data\mw-profile
set LOG=%~dp0sync-daily.log

echo [%date% %time%] sync starting >> "%LOG%"

call git pull --rebase origin main  >> "%LOG%" 2>&1
call npm run sync:collections       >> "%LOG%" 2>&1

REM A like is not a decision either: it goes to the same approval queue.
if exist data\liked-models.json (
  for /f "delims=" %%I in ('node -e "const j=require('./data/liked-models.json');process.stdout.write((j.fresh||[]).join(' '))"') do (
    if not "%%I"=="" call npm run add:candidates -- %%I >> "%LOG%" 2>&1
  )
)

call npm run fetch:images  >> "%LOG%" 2>&1

REM A row that does not compile must not reach the site.
call npx tsc --noEmit  >> "%LOG%" 2>&1
if errorlevel 1 (
  echo [%date% %time%] TYPE CHECK FAILED - nothing pushed >> "%LOG%"
  exit /b 1
)

git add lib/imported.generated.ts lib/candidates.generated.ts lib/localImages.generated.ts ^
        data/makerworld-raw.json data/pending-models.json data/liked-models.json ^
        data/collections-status.json public/img/catalog  >> "%LOG%" 2>&1

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "MakerWorld: queue what was saved and liked"  >> "%LOG%" 2>&1
  git push origin main                                        >> "%LOG%" 2>&1
  echo [%date% %time%] pushed >> "%LOG%"
) else (
  echo [%date% %time%] nothing new >> "%LOG%"
)

endlocal
