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
 * Helper to get authorization headers if a token is provided.
 * @param token GitHub Personal Access Token.
 * @returns Headers object or undefined.
 */
function getAuthHeaders(token: string | null) {
  return token ? { 'Authorization': `token ${token}` } : undefined;
}

/**
 * Fetches the default branch of a GitHub repository.
 * @param owner The repository owner.
 * @param repo The repository name.
 * @param githubPat Optional GitHub Personal Access Token for private repos.
 * @returns The default branch name (e.g., 'main' or 'master').
 * @throws Error if the repository is not found or API call fails.
 */
export async function fetchDefaultBranch(owner: string, repo: string, githubPat: string | null): Promise<string> {
  const url = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}`;
  const response = await fetch(url, {
    headers: getAuthHeaders(githubPat),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository '${owner}/${repo}' not found. Please check the URL.`);
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Unauthorized access to repository '${owner}/${repo}'. Please ensure the repository is public or provide a valid GitHub Personal Access Token with 'repo' scope.`);
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
 * @param githubPat Optional GitHub Personal Access Token for private repos.
 * @returns An array of RepoFile objects representing the repository's file structure.
 * @throws Error if the API call fails.
 */
export async function fetchRepoTree(owner: string, repo: string, branch: string, githubPat: string | null): Promise<RepoFile[]> {
  const url = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const response = await fetch(url, {
    headers: getAuthHeaders(githubPat),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Unauthorized access to repository '${owner}/${repo}'. Please ensure the repository is public or provide a valid GitHub Personal Access Token with 'repo' scope.`);
    }
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
        // Raw content URL needs the branch name, not just the SHA URL from the tree API
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
 * @param githubPat Optional GitHub Personal Access Token for private repos.
 * @returns The content of the file as a string.
 * @throws Error if the file cannot be fetched.
 */
export async function fetchFileContent(fileUrl: string, githubPat: string | null): Promise<string> {
  const response = await fetch(fileUrl, {
    headers: getAuthHeaders(githubPat),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
        throw new Error(`Unauthorized access to file. If this is a private repository, ensure your GitHub Personal Access Token has 'repo' scope and is correctly provided.`);
    }
    throw new Error(`Failed to fetch file content from ${fileUrl}: ${response.statusText}`);
  }

  return response.text();
}