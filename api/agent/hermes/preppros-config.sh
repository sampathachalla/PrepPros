#!/command/with-contenv sh
# s6 cont-init hook, run as root after the image's own setup (01-hermes-setup). Installs the PrepPros
# config.yaml and SOUL.md into the Hermes data volume on every boot, so the versions in this repo
# always win over what an earlier boot seeded.
set -eu

HERMES_HOME="${HERMES_HOME:-/opt/data}"

for file in config.yaml SOUL.md; do
    s6-setuidgid hermes cp "/opt/preppros/hermes/$file" "$HERMES_HOME/$file"
done
s6-setuidgid hermes mkdir -p "$HERMES_HOME/workspace"
chmod 640 "$HERMES_HOME/config.yaml"
echo "[preppros] Installed PrepPros Hermes config"
