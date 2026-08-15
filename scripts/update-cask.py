#!/usr/bin/env python3
"""Genera el archivo Casks/cc-controller.rb para el homebrew-tap.
Uso: python3 scripts/update-cask.py <version> <sha256_arm64> <sha256_intel> <output_path>
"""
import sys

version, sha_arm64, sha_intel, output = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

content = f"""cask "cc-controller" do
  version "{version}"

  on_arm do
    url "https://github.com/kitifica-max/cc-controller/releases/download/v{version}/CC.Creator-{version}-arm64.dmg"
    sha256 "{sha_arm64}"
  end

  on_intel do
    url "https://github.com/kitifica-max/cc-controller/releases/download/v{version}/CC.Creator-{version}.dmg"
    sha256 "{sha_intel}"
  end

  name "CC Creator"
  desc "Control Claude Code desde tu iPhone via PWA"
  homepage "https://ccc.kitifica.com"

  app "CC Creator.app"
end
"""

with open(output, "w") as f:
    f.write(content)

print(f"Cask actualizado → v{version}")
