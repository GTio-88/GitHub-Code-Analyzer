import { GITHUB_API_BASE_URL, GITHUB_RAW_CONTENT_BASE_URL } from '../constants';
import { RepoFile } from '../types';

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

interface GitHubRepoResponse {
  default_branch: string;
}

/**
 * Fetches the default branch of a GitHub repository.
 * @param owner The repository owner.
 * @param repo The repository name.
 * @returns The default branch name (e.g., 'main' or 'master').
 * @throws Error if the repository is not found or API call fails.
 */
export async function fetchDefaultBranch(owner: string, repo: string): Promise<string> {
  const url = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository '${owner}/${repo}' not found. Please check the URL.`);
    }
    const errorData = await response.json();
    throw new Error(`Failed to fetch repository details: ${errorData.message || response.statusText}`);
  }

  const data: GitHubRepoResponse = await response.json();
  return data.default_branch;
}

/**
 * Fetches the complete file tree of a GitHub repository, including all files and directories recursively.
 * @param owner The repository owner.
 * @param repo The repository name.
 * @param branch The branch name (e.g., 'main').
 * @returns An array of RepoFile objects representing the repository's file structure.
 * @throws Error if the API call fails.
 */
export async function fetchRepoTree(owner: string, repo: string, branch: string): Promise<RepoFile[]> {
  const url = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to fetch repository tree: ${errorData.message || response.statusText}`);
  }

  const data: GitHubTreeResponse = await response.json();

  const files: RepoFile[] = [];
  const dirMap = new Map<string, RepoFile>();

  // Create a root entry for the repository itself
  const rootDir: RepoFile = {
    name: repo,
    path: '',
    type: 'dir',
    sha: data.sha, // Use the tree SHA for the root
    children: [],
  };
  dirMap.set('', rootDir);
  files.push(rootDir);

  // Process items to build a hierarchical structure
  for (const item of data.tree) {
    const pathParts = item.path.split('/');
    const name = pathParts[pathParts.length - 1];
    const parentPath = pathParts.slice(0, -1).join('/');

    let parentDir = dirMap.get(parentPath);
    if (!parentDir) {
      // This should ideally not happen if data.tree is ordered correctly,
      // but as a fallback, create parent directories if missing.
      // For simplicity in this implementation, we assume a correctly ordered tree.
      continue;
    }

    if (item.type === 'tree') { // It's a directory
      const newDir: RepoFile = {
        name: name,
        path: item.path,
        type: 'dir',
        sha: item.sha,
        children: [],
      };
      dirMap.set(item.path, newDir);
      parentDir.children?.push(newDir);
    } else { // It's a file
      const newFile: RepoFile = {
        name: name,
        path: item.path,
        type: 'file',
        url: `${GITHUB_RAW_CONTENT_BASE_URL}/${owner}/${repo}/${branch}/${item.path}`,
        sha: item.sha,
      };
      parentDir.children?.push(newFile);
    }
  }

  return rootDir.children || []; // Return top-level children of the root directory
}

/**
 * Fetches the raw content of a specific file from GitHub.
 * @param fileUrl The raw content URL of the file.
 * @returns The content of the file as a string.
 * @throws Error if the file cannot be fetched.
 */
export async function fetchFileContent(fileUrl: string): Promise<string> {
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch file content from ${fileUrl}: ${response.statusText}`);
  }

  return response.text();
}
