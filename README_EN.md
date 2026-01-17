# SyncFromGit (吉他库库)

A powerful Obsidian plugin for syncing your vault via Git, enabling seamless synchronization across multiple devices.

## Features

### 1. Git Repository Sync
- Configure remote Git repository URL
- One-click sync local changes to remote repository
- Pull latest content from remote repository

### 2. File-level Sync
- "Commit to Git" option in file browser context menu
- Commit individual files or entire folders
- Automatically executes `git add`, `git commit`, and `git push`

### 3. Repository Management
- Clone remote Git repository to local vault
- Branch switching (using Obsidian vault name as branch name)
- Sync operations from the sidebar

### 4. Multi-device Support
- Use Git repository as remote "cloud storage" for cross-device sync
- Multi-branch management (via dialog selection)

## Tech Stack

- **TypeScript**: Type-safe development language
- **Obsidian API**: Plugin API provided by Obsidian
- **Git**: Version control and synchronization
- **Node.js**: Build and dependency management

## Installation

1. Download plugin files to your Obsidian vault's `.obsidian/plugins/` directory
2. Restart Obsidian
3. Enable the plugin in settings

## Usage

### Configure Git Repository
1. Open plugin settings
2. Enter your Git repository URL
3. Save configuration

### Sync Files
1. Right-click on a file or folder in the file browser
2. Select "Commit to Git"
3. Plugin automatically pushes changes to remote repository

### Clone Remote Repository
1. Click "Pull Git Repository" button in the sidebar
2. Enter Git repository URL
3. Select branch to checkout
4. Plugin clones repository content to local

### Manual Sync
1. Use sync buttons in sidebar for manual pull/push operations

## Branch Strategy

- Plugin uses Obsidian vault name as Git branch name by default
- If repository has multiple branches, a dialog will appear for selection

## Security

- Plugin only works with Git repositories the user has access to
- User is responsible for ensuring Git repository security and access permissions
- Plugin does not modify or transmit any sensitive authentication information

## Notes

- Requires Git command-line tool installed on system
- Git repository needs appropriate access permissions (SSH keys or credentials)
- Regular backups of important data are recommended

## Contributing

Issues and Pull Requests are welcome to improve this plugin!

## License

MIT License
