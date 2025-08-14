## Versioning, Tagging & Docker Publishing

This project uses a simple, explicit workflow to turn a version bump into published Docker images and a GitHub release. This document explains:

1. Where the version lives
2. How CI derives and uses it
3. Image tag strategy
4. How to cut a new release
5. Preview / pre-release images
6. Manual (fallback) commands
7. Required secrets & troubleshooting

---

### 1. Source of Truth

The canonical version string is in `ui/package.json` under the `version` field.

Example:
```json
"version": "0.0.2"
```

No other file should be manually edited for the version. CI reads this value with `jq` (`Docker meta (derive version)` step).

### 2. CI Workflow Overview

Workflow file: `.github/workflows/ci.yml`

Triggers:
- Pull Request (any branch → main): build + test only (no push to Docker Hub, no tags).
- Push to `main`: creates (or reuses) a git tag `v<version>`, (attempts) a GitHub Release, then builds & pushes Docker images with multiple tags.
- `workflow_dispatch`: can be invoked manually (same behavior as push to main if run on main).

Safeguards:
- Tag creation is idempotent: if `v<version>` exists, it is reused.
- Release creation is skipped if the `gh` CLI isn't present (tag still pushed).

### 3. Docker Image Tag Strategy

On a successful push to `main` for version `X.Y.Z`, CI pushes these tags to Docker Hub (`mmockus/mycasa`):

| Tag | Purpose |
|-----|---------|
| `latest` | Always the most recent successful build of `main` |
| `X.Y.Z` | Plain semantic version (e.g., `0.0.2`) |
| `vX.Y.Z` | Prefixed version matching the git tag (e.g., `v0.0.2`) |
| `<branch>` | The sanitized branch name (for `main` this is `main`; for previews, manual push) |

Pull Requests build an image tagged `pr-<sanitized-branch>` locally in CI (not pushed) for validation.

### 4. Cutting a New Release (Normal Flow)

1. Decide the new semantic version (follow MAJOR.MINOR.PATCH). Example: bump from `0.0.2` → `0.0.3`.
2. Edit `ui/package.json` and update `version`.
3. Commit on a feature/preview branch: `git commit -am "chore: bump version to 0.0.3"`.
4. Open a Pull Request → CI will run tests/build.
5. Merge PR into `main`.
6. CI on `main` will:
   - Create git tag `v0.0.3` (if absent)
   - (Optionally) create GitHub Release `v0.0.3`
   - Build and push Docker tags: `latest`, `0.0.3`, `v0.0.3`, `main`
7. Pull or deploy with `docker pull mmockus/mycasa:latest` (or pin `:0.0.3`).

### 5. Preview / Pre-Release Images

For experimental or staging versions, use a branch naming convention like `<version>-preview` (e.g., `0.0.3-preview`).

Workflow:
1. Set `ui/package.json` version to the base semantic version (e.g., `0.0.3`). Avoid appending `-preview` inside the version field unless you deliberately want a distinct semver pre-release (e.g., `0.0.3-alpha.1`).
2. Push branch `0.0.3-preview`.
3. (Optional) Manually build & push preview image (see section 6). This will produce a branch tag in addition to any manual tags you choose.
4. Once satisfied, merge into `main` (DO NOT change version again unless another bump is warranted). Main build will publish final release images.

If you DO want a semver pre-release tag (e.g., `0.0.3-beta.1`):
- Set version to `0.0.3-beta.1` in `package.json`.
- Merge to `main` when ready; release tags will include the pre-release string (`v0.0.3-beta.1`). Later, bump to `0.0.3` for the stable release.

### 6. Manual Build & Push (Fallback / Local)

Only needed if CI is unavailable or for preview branches.

Build (from repo root):
```bash
docker build \
  --build-arg REACT_APP_API_BASE=http://casaserver.local \
  --build-arg REACT_APP_API_PORT=8735 \
  -t mmockus/mycasa:0.0.3-preview .
```

Push:
```bash
docker push mmockus/mycasa:0.0.3-preview
```

Optional additional tags:
```bash
docker tag mmockus/mycasa:0.0.3-preview mmockus/mycasa:0.0.3-rc1
docker push mmockus/mycasa:0.0.3-rc1
```

Run locally:
```bash
docker run --rm -p 8080:80 \
  -e REACT_APP_API_BASE=http://casaserver.local \
  -e REACT_APP_API_PORT=8735 \
  mmockus/mycasa:0.0.3-preview
```

### 7. Required Secrets (CI)

In the GitHub repository settings → Secrets & Variables → Actions:

- `DOCKERHUB_USERNAME`: Docker Hub username or org
- `DOCKERHUB_TOKEN`: Docker Hub Personal Access Token (write/push enabled)

`GITHUB_TOKEN` is automatically provided for tagging and (attempted) release creation.

### 8. Bumping Strategy & Guidelines

Use Semantic Versioning:
- MAJOR: incompatible UI/API changes (rare here since UI is stateless)
- MINOR: new user-visible features, non-breaking
- PATCH: fixes, internal refactors, doc-only changes

Pre-release identifiers (`-alpha.N`, `-beta.N`, `-rc.N`) are allowed and will flow straight through tagging logic.

### 9. Verifying a Release

After merging to `main`:
1. Check Git tags: `git fetch --tags` then `git tag -l | grep vX.Y.Z`.
2. Check GitHub Releases page for `vX.Y.Z` (if `gh` was available).
3. Inspect Docker Hub repository for new tags (`latest`, `X.Y.Z`, `vX.Y.Z`).
4. Pull and run the image locally to smoke test.

### 10. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Git tag not created | Version unchanged or permissions issue | Bump version & re-run / ensure workflow has `contents: write` |
| Release missing | `gh` CLI not in runner | Ignore (optional) or add a setup step for gh |
| Image tags missing (only latest) | Build script altered | Compare with `ci.yml` original tagging block |
| Wrong version in image | Forgot to commit package.json bump before merge | Bump version in a new PR; previous incorrect tag remains (can deprecate in README) |
| Docker login fails | Secrets missing or token scope insufficient | Re-create `DOCKERHUB_TOKEN` with write permissions |

### 11. Advanced (Optional Enhancements)

Potential future improvements:
- Add a job to run container security scanning (e.g., Trivy) before push.
- Add conventional commits + automatic version bump (release-please, semantic-release).
- Add a `workflow_dispatch` input allowing forced re-publish of existing version (with cache bust arg).
- Introduce build cache layer with `docker/build-push-action` + `cache-from`.

### 12. Quick Reference

| Action | Command / Step |
|--------|----------------|
| Bump version | Edit `ui/package.json` `version` + commit |
| Test PR build | Open PR → CI runs tests & build |
| Release | Merge PR into `main` |
| Pull latest | `docker pull mmockus/mycasa:latest` |
| Pin exact | `docker pull mmockus/mycasa:X.Y.Z` |
| Manual preview push | `docker build -t mmockus/mycasa:X.Y.Z-preview . && docker push mmockus/mycasa:X.Y.Z-preview` |

---

Maintainer note: Keep this file updated whenever the tagging strategy or CI workflow changes.
