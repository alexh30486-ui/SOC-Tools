# First publication: SOC-Tools on GitHub (macOS)

## 1. Create the remote GitHub repository

1. Sign into GitHub and navigate to https://github.com/new.
2. Set **Owner:** `alexh30486-ui`, **Repository name:** `SOC-Tools`.
3. Recommended: choose **Private** while reviewing research files and evidence examples; change visibility deliberately later if you want a public demo.
4. **Do not** select “Add a README,” “Add .gitignore,” or “Choose a license.” The downloadable source already contains the needed files, and the Git history should start clean.
5. Click **Create repository**. Its remote URL is `https://github.com/alexh30486-ui/SOC-Tools.git`.

If you are deleting the old repository first, be aware that deleting a GitHub repo also removes its issues, settings, releases, and history. You do not need to delete it to publish source, but this package supports a newly recreated empty repository.

## 2. Download and unpack

Download the `SOC-Tools-github-ready.zip` supplied in ChatGPT. Double-click it. The extracted folder should be `~/Downloads/SOC-Tools` (or adjust the path if you moved it).

Open Terminal and run:

```bash
cd ~/Downloads/SOC-Tools
git --version
bash publish-to-github.sh
```

If `git` is missing, run `xcode-select --install`, finish Apple's installer, and retry. The publish script prompts with precise instructions if Git's commit author identity isn't configured; GitHub CLI (`gh`) is **not** required.

GitHub may ask you to authenticate to push. Git over HTTPS no longer accepts a GitHub account password as a Git password: use a supported credential manager / browser login or a personal-access token with repository permissions when prompted. Do not paste a token into chat or save it in source files.

## 3. Confirm

Open https://github.com/alexh30486-ui/SOC-Tools and verify the README and the `web/`, `api/`, `playbooks/`, `tests/`, `research/`, and `docs/` directories are present.

## 4. Optional: publish the demo webpage

On the repository page, open **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/docs**, and save. Once GitHub finishes deploying, the static preview should be at:

`https://alexh30486-ui.github.io/SOC-Tools/`

GitHub Pages only hosts the **synthetic static frontend** in `docs/index.html`; it does not run the Python backend, network probes, or live AI inference. Depending on your GitHub plan, Pages publishing from a private repository may not be available; review GitHub's current Pages eligibility and repository visibility settings.

## Common errors

- `fatal: not a git repository`: run the command **inside** the extracted `SOC-Tools` folder.
- `Author identity unknown`: configure a Git commit author using `git config --global user.name "Your GitHub name"` and `git config --global user.email "Your GitHub commit email"`, then rerun the script. For privacy, you can use your GitHub noreply email shown under GitHub email settings.
- `Repository not found`: confirm the `SOC-Tools` repo exists under the correct account and that your Git authentication has access.
- `remote contains commits`: the script deliberately refuses to rewrite that history. Create a genuinely empty repository or use the normal clone/merge workflow.
- `Permission denied` / authentication failed: sign into GitHub through the credential helper, or authorize Git using a personal-access token for the repository.
- `xcode-select` command-line tools prompt: install the tools before using Git.

## Future pushes

Inside your local `SOC-Tools` folder:

```bash
git status
git add .
git commit -m "Describe changes"
git push
```
