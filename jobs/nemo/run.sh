#!/bin/sh
# Entry point inside the Nebius job: sh /opt/wallspace/run.sh (mode from WALLSPACE_JOB_MODE, app url from APP_URL).
set -eu
cd /opt/wallspace
MODE="${WALLSPACE_JOB_MODE:?WALLSPACE_JOB_MODE must be sign-off or red-team}"
pip install --no-cache-dir --disable-pip-version-check -q -r requirements.txt
exec python job.py --mode "$MODE"
